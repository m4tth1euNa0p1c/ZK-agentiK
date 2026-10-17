import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NativeSimulatorBackend } from '@zk-mcp/sdk';
import { EnterpriseGateway, FixtureConnectors, normalizeGitlabApprovals, normalizeJira, normalizeSonar } from '../src/index.js';
import { mergeArgs } from '../../../tests/fixtures/helpers.js';

test('normalizers reject missing facts and deduplicate approval identities', () => {
  assert.equal(normalizeJira({ fields: { status: { name: 'APPROVED' } } }), 'APPROVED');
  assert.equal(normalizeSonar({ projectStatus: { status: 'ERROR' } }), 'ERROR');
  assert.equal(normalizeGitlabApprovals({ approved_by: [{ user: { id: 1 } }, { user: { id: 1 } }] }), 1);
  for (const normalize of [normalizeJira, normalizeSonar, normalizeGitlabApprovals]) assert.throws(() => normalize({}));
});

test('fixture attestation binds source, context and freshness', async () => {
  let now = Date.now(); const connectors = new FixtureConnectors(() => now);
  const context = { ...mergeArgs, tenant_id: 'demo-tenant', tool: 'verifiable_gitlab_merge' as const };
  const snapshot = await connectors.collect(context);
  assert.equal(connectors.verifySnapshot(snapshot, context).approvals, 2);
  const tampered = structuredClone(snapshot); tampered.facts.approvals = 99;
  assert.throws(() => connectors.verifySnapshot(tampered, context), /ATTESTATION/);
  assert.throws(() => connectors.verifySnapshot(snapshot, { ...context, project_id: 2 }), /WRONG_SOURCE/);
  now += 30_001;
  assert.throws(() => connectors.verifySnapshot(snapshot, context), /STALE/);
});

test('good policy reaches simulated GitLab once and returns ordinary MCP content plus receipt', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = new FixtureConnectors(); const gateway = await EnterpriseGateway.demo(backend, connectors);
  const result = await gateway.call(mergeArgs);
  assert.equal(connectors.mergeCalls, 1);
  assert.equal(result.structuredContent?.simulated, true);
  assert.ok(result._meta?.zkp);
});

test('every rule violation blocks the side effect', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  for (const patch of [{ sonar_quality_gate: 'ERROR' }, { jira_status: 'OPEN' },
    { critical_vulnerabilities: 1 }, { approvals: 1 }]) {
    const connectors = new FixtureConnectors(); Object.assign(connectors.facts, patch);
    const gateway = await EnterpriseGateway.demo(backend, connectors);
    await assert.rejects(gateway.call(mergeArgs), /POLICY_DENIED/);
    assert.equal(connectors.mergeCalls, 0);
  }
});

test('caller cannot lower reviewer threshold, supply facts, or switch project', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = new FixtureConnectors(); const gateway = await EnterpriseGateway.demo(backend, connectors);
  for (const args of [{ ...mergeArgs, min_reviewers: 0 }, { ...mergeArgs, facts: connectors.facts },
    { ...mergeArgs, project_id: 2 }, { ...mergeArgs, head_sha: 'b'.repeat(40) }]) {
    await assert.rejects(gateway.call(args));
  }
  assert.equal(connectors.mergeCalls, 0);
});

test('facts or HEAD changed after proving block merge', async t => {
  for (const change of ['facts', 'head'] as const) {
    const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
    const connectors = new FixtureConnectors(); const gateway = await EnterpriseGateway.demo(backend, connectors);
    const original = backend.prove.bind(backend);
    backend.prove = async req => {
      const receipt = await original(req);
      if (change === 'head') connectors.headSha = 'b'.repeat(40);
      else connectors.facts.approvals = 0;
      return receipt;
    };
    await assert.rejects(gateway.call(mergeArgs), /CHANGED/);
    assert.equal(connectors.mergeCalls, 0);
  }
});

test('compromised prover cannot replace collected facts with compliant facts', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = new FixtureConnectors(); connectors.facts.approvals = 0;
  const gateway = await EnterpriseGateway.demo(backend, connectors);
  const original = backend.prove.bind(backend);
  backend.prove = async req => {
    const denied = await original(req);
    denied.public_outputs = { allow: true, violations_mask: 0 };
    return denied;
  };
  await assert.rejects(gateway.call(mergeArgs), /INVALID_RECEIPT/);
  assert.equal(connectors.mergeCalls, 0);
});

test('32 fresh challenges for the same business operation cause at most one mutation', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = new FixtureConnectors(); const gateway = await EnterpriseGateway.demo(backend, connectors);
  const results = await Promise.allSettled(Array.from({ length: 32 }, () => gateway.call(mergeArgs)));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(connectors.mergeCalls, 1);
  await assert.rejects(gateway.call(mergeArgs), /OPERATION_ALREADY_RESERVED/);
  assert.equal(connectors.mergeCalls, 1);
});

test('new challenge cannot repeat an operation after an ambiguous external failure', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = new FixtureConnectors(); const gateway = await EnterpriseGateway.demo(backend, connectors);
  connectors.merge = async () => { connectors.mergeCalls++; throw new Error('RESPONSE_LOST'); };
  await assert.rejects(gateway.call(mergeArgs), /RESPONSE_LOST/);
  await assert.rejects(gateway.call(mergeArgs), /OPERATION_ALREADY_RESERVED/);
  assert.equal(connectors.mergeCalls, 1);
});
