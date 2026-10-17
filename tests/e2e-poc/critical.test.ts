import assert from 'node:assert/strict';
import { test } from 'node:test';
import { NativeSimulatorBackend } from '@zk-mcp/sdk';
import { CRITICAL_ATTACKS, CRITICAL_POLICY, criticalFixture, EnterpriseGateway, MemoryOperationStore } from '@zk-mcp/enterprise-gateway';
import { mergeArgs } from '../fixtures/helpers.js';

test('critical platform: allow complete evidence, deny all 23 adverse scenarios', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = criticalFixture();
  const gateway = await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY });
  await gateway.call(mergeArgs); assert.equal(connectors.mergeCalls, 1);
  const baseline = structuredClone(connectors.facts);
  for (const attack of CRITICAL_ATTACKS) {
    connectors.facts = structuredClone(baseline); assert.ok(connectors.facts.critical);
    attack.change(connectors.facts.critical);
    await assert.rejects(gateway.call(mergeArgs), /POLICY_DENIED/, attack.name);
    assert.equal(connectors.mergeCalls, 1, attack.name);
  }
});

test('critical controls cannot disappear or be weakened to the baseline policy', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = criticalFixture();
  const gateway = await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY });
  delete connectors.facts.critical;
  await assert.rejects(gateway.call(mergeArgs), /POLICY_DENIED/);
  assert.equal(connectors.mergeCalls, 0);
  const other = criticalFixture();
  const weak = await EnterpriseGateway.demo(backend, other, { policy: { ...CRITICAL_POLICY, min_reviewers: 1 } });
  await assert.rejects(weak.call(mergeArgs), /POLICY_DENIED/);
  assert.equal(other.mergeCalls, 0);
});

test('emergency stop activated during proof generation blocks execution', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const connectors = criticalFixture();
  const gateway = await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY });
  const prove = backend.prove.bind(backend);
  backend.prove = async request => {
    const receipt = await prove(request);
    assert.ok(connectors.facts.critical); connectors.facts.critical.emergency_stop = true;
    return receipt;
  };
  await assert.rejects(gateway.call(mergeArgs), /SOURCE_CHANGED/);
  assert.equal(connectors.mergeCalls, 0);
});

test('approval expiration during proving blocks even without a snapshot mutation', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  let now = Date.now(); const connectors = criticalFixture(() => now);
  assert.ok(connectors.facts.critical); connectors.facts.critical.approvals_expires_at_ms = now + 10_000;
  const gateway = await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY, now: () => now });
  const prove = backend.prove.bind(backend);
  backend.prove = async request => { const receipt = await prove(request); now += 11_000; return receipt; };
  await assert.rejects(gateway.call(mergeArgs), /CRITICAL_DEADLINE_EXPIRED/);
  assert.equal(connectors.mergeCalls, 0);
});

test('slow operation reservation cannot dispatch expired authorization or critical approval', async t => {
  for (const delay of [11_000, 31_000]) {
    const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
    let now = Date.now(); const connectors = criticalFixture(() => now);
    assert.ok(connectors.facts.critical); connectors.facts.critical.approvals_expires_at_ms = now + 10_000;
    const store = new MemoryOperationStore(); let reservedKey = '';
    const gateway = await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY, now: () => now,
      operationStore: {
        reserve: async key => { reservedKey = key; const ok = await store.reserve(key); now += delay; return ok; },
        finish: (key, state) => store.finish(key, state),
      } });
    await assert.rejects(gateway.call(mergeArgs), /EXPIRED/);
    assert.equal(connectors.mergeCalls, 0);
    assert.equal(store.state(reservedKey), 'REJECTED');
  }
});

test('facts changed during operation reservation block dispatch and retain rejection', async t => {
  for (const change of ['emergency_stop', 'approvals'] as const) {
    const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
    const connectors = criticalFixture(); const baseline = structuredClone(connectors.facts);
    const store = new MemoryOperationStore(); let reservedKey = '';
    const gateway = await EnterpriseGateway.demo(backend, connectors, { policy: CRITICAL_POLICY,
      operationStore: {
        reserve: async key => {
          reservedKey = key; const ok = await store.reserve(key);
          if (change === 'emergency_stop') {
            assert.ok(connectors.facts.critical); connectors.facts.critical.emergency_stop = true;
          } else connectors.facts.approvals = 0;
          return ok;
        },
        finish: (key, state) => store.finish(key, state),
      } });
    await assert.rejects(gateway.call(mergeArgs), /SOURCE_CHANGED/, change);
    assert.equal(connectors.mergeCalls, 0, change);
    assert.equal(store.state(reservedKey), 'REJECTED', change);
    connectors.facts = baseline;
    await assert.rejects(gateway.call(mergeArgs), /OPERATION_ALREADY_RESERVED/, change);
    assert.equal(connectors.mergeCalls, 0, change);
    assert.equal(store.state(reservedKey), 'REJECTED', change);
  }
});
