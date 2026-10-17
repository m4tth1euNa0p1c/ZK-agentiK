import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { EnvelopeSchema, MemoryReplayStore, NativeSimulatorBackend, VerifierFirewall } from '@zk-mcp/sdk';
import { mergeArgs } from '../fixtures/helpers.js';

const client = new Client({ name: 'zk-mcp-demo-agent', version: '0.1.0' });
const transport = new StdioClientTransport({ command: process.execPath,
  args: [fileURLToPath(new URL('../../packages/enterprise-gateway/dist/stdio.js', import.meta.url))], stderr: 'pipe' });
const verifier = new NativeSimulatorBackend();
try {
  await client.connect(transport);
  const tools = await client.listTools();
  console.log('MCP connecté :', tools.tools.map(t => t.name).join(', '));
  const allowed = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: mergeArgs });
  assert.equal(allowed.isError, undefined);
  const envelope = EnvelopeSchema.parse(allowed._meta?.zkp);
  await verifier.verify(envelope);
  console.log('AUTORISÉ : politique Rust valide, vérification locale réussie, merge SIMULÉ.');
  const denied = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: { ...mergeArgs, project_id: 2 } });
  assert.equal(denied.isError, true);
  console.log('BLOQUÉ : projet non autorisé.');
  const firewall = new VerifierFirewall({ backend: verifier, trustedImageId: await verifier.imageId(),
    replayStore: new MemoryReplayStore(), allowSimulation: true });
  const tampered = { ...envelope, proof_bytes: 'AAAA' };
  await assert.rejects(firewall.execute(tampered, envelope.public_inputs, async () => assert.fail('side effect forbidden')));
  console.log('BLOQUÉ : reçu falsifié, aucun effet de bord.');
  console.log('Backend : native-simulator. Aucune preuve ZK, aucun appel GitLab réel, witness visible dans le reçu.');
} finally { await client.close(); await transport.close(); verifier.close(); }
