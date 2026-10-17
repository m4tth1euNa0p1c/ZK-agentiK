import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { CallToolResultSchema } from '@modelcontextprotocol/sdk/types.js';
import { NativeSimulatorBackend, EnvelopeSchema } from '@zk-mcp/sdk';
import { createMcpServer, EnterpriseGateway, FixtureConnectors } from '@zk-mcp/enterprise-gateway';
import { mergeArgs } from '../fixtures/helpers.js';

test('actual MCP handshake, discovery, allow and deny over linked transports', async t => {
  const backend = new NativeSimulatorBackend(); const connectors = new FixtureConnectors();
  const server = createMcpServer(await EnterpriseGateway.demo(backend, connectors));
  const client = new Client({ name: 'test-agent', version: '1.0.0' });
  t.after(async () => { await client.close(); await server.close(); backend.close(); });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport); await client.connect(clientTransport);
  const list = await client.listTools();
  assert.equal(list.tools[0]?.name, 'verifiable_gitlab_merge');
  const result = CallToolResultSchema.parse(await client.callTool({ name: 'verifiable_gitlab_merge', arguments: mergeArgs }));
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent?.merged, true);
  const envelope = EnvelopeSchema.parse(result._meta?.zkp);
  await backend.verify(envelope);
  assert.equal(connectors.mergeCalls, 1);
  connectors.facts.critical_vulnerabilities = 4;
  const denied = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: mergeArgs });
  assert.equal(denied.isError, true);
  assert.equal(connectors.mergeCalls, 1);
});

test('stdio CLI interoperates with the official MCP client', { timeout: 15_000 }, async t => {
  const client = new Client({ name: 'stdio-agent', version: '1.0.0' });
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../../packages/enterprise-gateway/dist/stdio.js', import.meta.url))], stderr: 'pipe' });
  t.after(async () => { await client.close(); await transport.close(); });
  await client.connect(transport);
  const result = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: mergeArgs });
  assert.equal(result.isError, undefined);
  assert.ok(result._meta?.zkp);
  const denied = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: { ...mergeArgs, project_id: 2 } });
  assert.equal(denied.isError, true);
});
