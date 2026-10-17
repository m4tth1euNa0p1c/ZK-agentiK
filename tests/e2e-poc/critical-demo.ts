import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { NativeSimulatorBackend } from '@zk-mcp/sdk';
import { CRITICAL_POLICY, CRITICAL_ATTACKS, criticalFixture, createMcpServer, EnterpriseGateway } from '@zk-mcp/enterprise-gateway';
import { mergeArgs } from '../fixtures/helpers.js';

const backend = new NativeSimulatorBackend();
const connectors = criticalFixture();
const server = createMcpServer(await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY }));
const client = new Client({ name: 'critical-platform-test-agent', version: '0.1.0' });
try {
  const [ct, st] = InMemoryTransport.createLinkedPair();
  await server.connect(st); await client.connect(ct);
  const good = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: mergeArgs });
  assert.equal(good.isError, undefined); assert.equal(connectors.mergeCalls, 1);
  console.log('AUTORISÉ : tous les contrôles critiques présents — merge simulé.');
  const baseline = structuredClone(connectors.facts);
  for (const attack of CRITICAL_ATTACKS) {
    connectors.facts = structuredClone(baseline);
    assert.ok(connectors.facts.critical);
    attack.change(connectors.facts.critical);
    const result = await client.callTool({ name: 'verifiable_gitlab_merge', arguments: mergeArgs });
    assert.equal(result.isError, true, attack.name);
    assert.equal(connectors.mergeCalls, 1, attack.name);
    console.log(`BLOQUÉ : ${attack.name}`);
  }
  console.log(`${CRITICAL_ATTACKS.length} scénarios adverses bloqués, 0 merge supplémentaire. Simulation, sans preuve ZK réelle.`);
} finally { await client.close(); await server.close(); backend.close(); }
