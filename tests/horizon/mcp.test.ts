import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ProofWorker } from '../../packages/horizon-demo/src/worker.js';
import { AuthorizationStore } from '../../packages/horizon-demo/src/store.js';
import { PublicConfig, Challenge } from '../../packages/horizon-demo/src/types.js';
import { createClaimTool } from '../../packages/horizon-demo/src/tool.js';
import { createClaimMcpServer } from '../../packages/horizon-demo/src/mcp.js';

const Fixture = PublicConfig.extend({ witness: z.record(z.string(), z.unknown()), holder_secret_hex: z.string() });
for (const transportKind of ['memory', 'stdio'] as const) {
  test(`real Horizon proof through SDK and official MCP ${transportKind}: tamper/replay zero extra effects`, { timeout: 20000 }, async t => {
    const supplier = new ProofWorker();
    const fixture = Fixture.parse(await supplier.request({ op: 'init', now_ms: Date.now() }));
    const config = PublicConfig.parse({ trust: fixture.trust, evidence: fixture.evidence,
      challenge: fixture.challenge, policy: fixture.policy });
    const directory = mkdtempSync(join(tmpdir(), 'horizon-mcp-'));
    const publicPath = join(directory, 'public.json'); const databasePath = join(directory, 'state.sqlite');
    writeFileSync(publicPath, JSON.stringify(config));
    const controller = new AuthorizationStore(databasePath, config);
    const verifier = new ProofWorker();
    const server = createClaimMcpServer(createClaimTool(controller, verifier, config));
    const client = new Client({ name: 'horizon-test-agent', version: '0.1.0' });
    t.after(async () => { await client.close(); await server.close(); verifier.close(); supplier.close(); controller.close(); });
    if (transportKind === 'memory') {
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport); await client.connect(clientTransport);
    } else {
      await client.connect(new StdioClientTransport({ command: process.execPath, args: [
        resolve('packages/horizon-demo/dist/mcp-stdio.js'), publicPath, databasePath], stderr: 'pipe' }));
    }
    const list = await client.listTools();
    assert.deepEqual(list.tools.map(tool => tool.name).sort(), ['horizon_authorize_claim', 'horizon_issue_challenge']);
    const challengeResult = CallToolResultSchema.parse(await client.callTool({ name: 'horizon_issue_challenge', arguments: {} }));
    const challenge = Challenge.parse(challengeResult.structuredContent?.['challenge']);
    const prepared = await supplier.request({ op: 'prepare', evidence: fixture.evidence, witness: fixture.witness });
    const presentation = z.record(z.string(), z.unknown()).parse(await supplier.request({ op: 'present', evidence: fixture.evidence,
      prepared, holder_secret_hex: fixture.holder_secret_hex, challenge }));
    const denied = await client.callTool({ name: 'horizon_authorize_claim', arguments: { nonce: challenge.nonce,
      presentation: { ...presentation, holder_signature_hex: '00'.repeat(64) } } });
    assert.equal(denied.isError, true);
    const count = () => Number(controller.db.prepare('SELECT count(*) AS n FROM effects').get()?.['n']);
    assert.equal(count(), 0);
    const accepted = CallToolResultSchema.parse(await client.callTool({ name: 'horizon_authorize_claim',
      arguments: { nonce: challenge.nonce, presentation } }));
    assert.equal(accepted.isError, undefined);
    assert.equal(accepted.structuredContent?.['status'], 'COMPLETED');
    assert.equal(count(), 1);
    const replay = await client.callTool({ name: 'horizon_authorize_claim', arguments: { nonce: challenge.nonce, presentation } });
    assert.equal(replay.isError, true); assert.equal(count(), 1);
    assert.equal((await client.callTool({ name: 'horizon_issue_challenge', arguments: {} })).isError, true);
  });
}

test('MCP stdio closes oversized framing before any authorization effect', { timeout: 10000 }, async t => {
  const supplier = new ProofWorker();
  const fixture = Fixture.parse(await supplier.request({ op: 'init', now_ms: Date.now() }));
  supplier.close();
  const config = PublicConfig.parse({ trust: fixture.trust, evidence: fixture.evidence,
    challenge: fixture.challenge, policy: fixture.policy });
  const directory = mkdtempSync(join(tmpdir(), 'horizon-mcp-size-'));
  const publicPath = join(directory, 'public.json'); const databasePath = join(directory, 'state.sqlite');
  writeFileSync(publicPath, JSON.stringify(config));
  const controller = new AuthorizationStore(databasePath, config);
  const child = spawn(process.execPath, [resolve('packages/horizon-demo/dist/mcp-stdio.js'), publicPath, databasePath],
    { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  t.after(() => { child.kill(); controller.close(); });
  // Drain diagnostics without publishing data; an unterminated oversized frame must close too.
  child.stderr.resume(); child.stdout.resume(); child.stdin.on('error', () => {});
  const exit = new Promise<number | null>((resolveExit, reject) => {
    child.once('error', reject); child.once('exit', resolveExit);
  });
  child.stdin.end(' '.repeat(128 * 1024 + 1));
  assert.equal(await exit, 0);
  assert.equal(Number(controller.db.prepare('SELECT count(*) AS n FROM effects').get()?.['n']), 0);
});
