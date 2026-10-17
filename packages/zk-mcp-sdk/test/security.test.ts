import assert from 'node:assert/strict';
import { test } from 'node:test';
import { attachProof, canonical, EnvelopeSchema, FactsSchema, hash, MemoryReplayStore, NativeSimulatorBackend,
  UnavailableBackend, VerifierFirewall, verifyToolResult } from '../src/index.js';
import { request, vector } from '../../../tests/fixtures/helpers.js';

test('independent Python vectors agree with TS and real Rust worker', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  assert.equal(hash('zk-mcp/witness/v1', vector.request.private_inputs), vector.expected.input_commitment);
  assert.equal(hash('zk-mcp/policy/v1', vector.request.public_inputs.policy), vector.expected.policy_hash);
  assert.equal(hash('zk-mcp/public-inputs/v1', vector.request.public_inputs), vector.expected.public_inputs_hash);
  const proof = await backend.prove(vector.request);
  assert.deepEqual(proof.public_outputs, vector.expected.public_outputs);
  assert.equal(proof.public_inputs_hash, vector.expected.public_inputs_hash);
  await backend.verify(proof);
});

test('canonical encoding rejects ambiguous values', () => {
  assert.equal(canonical({ z: 2, a: 1 }), '{"a":1,"z":2}');
  for (const value of [NaN, Infinity, -0, 1.5, undefined, { a: undefined }, '\ud800', new Date(), new Array(3)])
    assert.throws(() => canonical(value));
  for (const status of ['OK\n', 'APPROVED\t', '\0', '\x7f', 'é'])
    assert.throws(() => FactsSchema.parse({ ...vector.request.private_inputs.facts, jira_status: status }));
});

test('all altered authorization fields and receipts block before side effect', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const req = request();
  const proof = await backend.prove(req);
  const firewall = new VerifierFirewall({ backend, trustedImageId: await backend.imageId(),
    allowSimulation: true, replayStore: new MemoryReplayStore() });
  const mutations: Array<(p: typeof proof) => void> = [
    p => { p.proof_bytes = 'AAAA'; },
    p => { p.zkvm_backend = 'magnetar'; },
    p => { p.security_profile = 'zk'; },
    p => { p.elf_image_id = `sim-sha256:${'0'.repeat(64)}`; },
    p => { p.public_inputs_hash = '0'.repeat(64); },
    p => { p.timestamp += 1; },
    p => { p.public_inputs.context.tenant_id = 'other'; },
    p => { p.public_inputs.context.project_id = 2; },
    p => { p.public_inputs.context.merge_request_iid = 8; },
    p => { p.public_inputs.context.head_sha = 'b'.repeat(40); },
    p => { p.public_inputs.audience = 'other'; },
    p => { p.public_inputs.nonce = 'f'.repeat(64); },
    p => { p.public_inputs.policy.min_reviewers = 1; },
    p => { p.public_inputs.input_commitment = 'f'.repeat(64); },
    p => { p.public_outputs.allow = false; },
    p => { p.public_outputs.violations_mask = 1; },
  ];
  let calls = 0;
  for (const mutate of mutations) {
    const altered = structuredClone(proof); mutate(altered);
    await assert.rejects(firewall.execute(altered, req.public_inputs, async () => ++calls));
  }
  await assert.rejects(firewall.execute({ ...proof, proof_bytes: '*'.repeat(1_400_001) }, req.public_inputs, async () => ++calls));
  await assert.rejects(firewall.execute(undefined, req.public_inputs, async () => ++calls));
  assert.equal(calls, 0);
});

test('simulation is forbidden by default and unsupported backends fail closed', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  assert.throws(() => new VerifierFirewall({ backend, trustedImageId: 'unused', replayStore: new MemoryReplayStore() }), /SIMULATION_FORBIDDEN/);
  for (const name of ['sp1', 'risc0', 'magnetar'] as const) {
    const planned = new UnavailableBackend(name);
    await assert.rejects(planned.prove(request()), /BACKEND_UNAVAILABLE/);
    await assert.rejects(planned.imageId(), /BACKEND_UNAVAILABLE/);
  }
});

test('concurrent replay invokes exactly one side effect; ambiguous failure consumes nonce', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const req = request(); const proof = await backend.prove(req);
  const firewall = new VerifierFirewall({ backend, trustedImageId: await backend.imageId(),
    allowSimulation: true, replayStore: new MemoryReplayStore() });
  let calls = 0;
  const outcomes = await Promise.allSettled(Array.from({ length: 12 }, () =>
    firewall.execute(proof, req.public_inputs, async () => { calls++; throw new Error('AMBIGUOUS_API_TIMEOUT'); })));
  assert.equal(calls, 1);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 0);
  await assert.rejects(firewall.execute(proof, req.public_inputs, async () => ++calls), /REPLAY/);
});

test('expiry and future timestamp block, including expiry during verification', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const start = Date.now(); const req = request(start); const proof = await backend.prove(req);
  let now = start;
  const firewall = new VerifierFirewall({ backend, trustedImageId: await backend.imageId(), allowSimulation: true,
    replayStore: new MemoryReplayStore(), now: () => now });
  now = start + 30_000;
  await assert.rejects(firewall.verify(proof, req.public_inputs), /EXPIRED/);
  now = start - 1_001;
  await assert.rejects(firewall.verify(proof, req.public_inputs), /FUTURE/);
  now = start;
  const verify = backend.verify.bind(backend);
  backend.verify = async p => { await verify(p); now = start + 30_001; };
  await assert.rejects(firewall.execute(proof, req.public_inputs, async () => assert.fail('must not execute')), /EXPIRED/);
});

test('MCP metadata preserves existing fields and aware clients reject missing proof', async t => {
  const backend = new NativeSimulatorBackend(); t.after(() => backend.close());
  const req = request(); const proof = await backend.prove(req);
  const firewall = new VerifierFirewall({ backend, trustedImageId: await backend.imageId(),
    allowSimulation: true, replayStore: new MemoryReplayStore() });
  const result = attachProof({ content: [{ type: 'text', text: 'ok' }], _meta: { trace: 'kept' } }, proof);
  assert.equal(result._meta?.trace, 'kept');
  assert.deepEqual(await verifyToolResult(result, req.public_inputs, firewall), proof);
  await assert.rejects(verifyToolResult({ content: [] }, req.public_inputs, firewall), /MISSING_SUCCESS_PROOF/);
  assert.throws(() => EnvelopeSchema.parse({ ...proof, spec_version: '99.0' }));
});

test('missing worker fails closed without hanging', async t => {
  const backend = new NativeSimulatorBackend({ binaryPath: 'nonexistent-zk-worker', timeoutMs: 100 });
  t.after(() => backend.close());
  await assert.rejects(backend.imageId(), /WORKER/);
});
