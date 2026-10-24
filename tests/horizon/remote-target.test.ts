// H14: separated controllers and target. Every scenario counts the target's durable records
// and its received mutation attempts: at most one effect per business operation, no blind retry.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { ProofWorker } from '../../packages/horizon-demo/src/worker.js';
import { AuthorizationStore } from '../../packages/horizon-demo/src/store.js';
import { createHorizonServer } from '../../packages/horizon-demo/src/server.js';
import { createSandboxTarget, RemoteTarget } from '../../packages/horizon-demo/src/target.js';
import { PublicConfig, Verified, type Challenge } from '../../packages/horizon-demo/src/types.js';

const Record = z.record(z.string(), z.unknown());
const Fixture = PublicConfig.extend({ witness: Record, holder_secret_hex: z.string() });
const now = 1800000000000;
const far = now + 60000;

async function listen(server: import('node:http').Server): Promise<string> {
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}
async function fixture(targetClock: () => number = () => now) {
  const worker = new ProofWorker();
  const data = Fixture.parse(await worker.request({ op: 'init', now_ms: now }));
  const config = PublicConfig.parse({ trust: data.trust, evidence: data.evidence, challenge: data.challenge, policy: data.policy });
  const directory = mkdtempSync(join(tmpdir(), 'horizon-h14-'));
  const prepared = await worker.request({ op: 'prepare', evidence: data.evidence, witness: data.witness });
  const target = createSandboxTarget({ databasePath: join(directory, 'target.sqlite'), clock: targetClock });
  const url = await listen(target.server);
  const remote = new RemoteTarget(url, 1000);
  async function verified(challenge: Challenge, trust = config.trust): Promise<Verified> {
    const presentation = await worker.request({ op: 'present', evidence: data.evidence, prepared, holder_secret_hex: data.holder_secret_hex, challenge });
    return Verified.parse(await worker.request({ op: 'verify', presentation, expected: challenge, trust, policy: config.policy, now_ms: now }));
  }
  const controller = (name: string, clock: () => number = () => now) => new AuthorizationStore(join(directory, `${name}.sqlite`), config, clock);
  const operations = (store: AuthorizationStore) => store.db.prepare('SELECT id,status FROM operations').all().map(r => String(r['status']));
  const localEffects = (store: AuthorizationStore) => Number(store.db.prepare('SELECT count(*) AS n FROM effects').get()?.['n']);
  const auditTypes = (store: AuthorizationStore) => store.db.prepare('SELECT event FROM audit ORDER BY sequence').all()
    .map(r => String(Record.parse(JSON.parse(String(r['event'])))['type']));
  const manual = (operationId: string, objectId: string, hash: string, ifMatch: number) =>
    remote.record(operationId, { object_id: objectId, tenant: config.challenge.tenant, bundle_hash: hash, expires_at_ms: far }, ifMatch);
  return { worker, data, config, directory, target, url, remote, verified, controller, operations, localEffects, auditTypes, manual,
    close: async () => { worker.close(); await target.close(); } };
}

test('two controllers with separate databases: the shared idempotent target records exactly one effect', async () => {
  const f = await fixture(); const a = f.controller('a'); const b = f.controller('b');
  try {
    const ca = a.issue(); const cb = b.issue();
    assert.equal(ca.operation_id, cb.operation_id); assert.notEqual(ca.nonce, cb.nonce);
    const [va, vb] = await Promise.all([f.verified(ca), f.verified(cb)]);
    const results = await Promise.all([a.dispatch(ca, va, f.remote), b.dispatch(cb, vb, f.remote)]);
    assert.deepEqual(results.map(r => r.status).sort(), ['COMPLETED', 'REJECTED']);
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 2);
    assert.equal(f.localEffects(a) + f.localEffects(b), 0);
    // Neither controller can authorize the same operation again, with any nonce.
    assert.throws(() => a.issue(), /OPERATION_CONSUMED/);
    await assert.rejects(b.dispatch(cb, vb, f.remote), /UNKNOWN_OR_USED_CHALLENGE|OPERATION_CONSUMED/);
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 2);
    // The sandbox state view does not expose bundle hashes of operations.
    for (const store of [a, b]) for (const row of z.array(Record).parse(store.snapshot()['operations'])) assert.deepEqual(Object.keys(row).sort(), ['id', 'status']);
  } finally { a.close(); b.close(); await f.close(); }
});

test('lost acknowledgement after a committed target write stays UNKNOWN, then reconciles to COMPLETED without a second attempt', async () => {
  const f = await fixture(); const store = f.controller('ack');
  try {
    const c = store.issue(); const v = await f.verified(c);
    f.target.faults.set(c.operation_id, 'drop_ack');
    assert.deepEqual(await store.dispatch(c, v, f.remote), { status: 'UNKNOWN', operation_id: c.operation_id });
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 1);
    assert.deepEqual(f.operations(store), ['UNKNOWN']);
    await assert.rejects(store.dispatch(c, v, f.remote)); // consumed; no redispatch
    assert.equal(await store.reconcileWith(f.remote, c.operation_id), 'COMPLETED');
    assert.equal(await store.reconcileWith(f.remote, c.operation_id), 'COMPLETED');
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 1);
  } finally { store.close(); await f.close(); }
});

test('controller crash after reservation: restart fences the operation, a late write is refused, zero effects', async () => {
  const f = await fixture(); let store = f.controller('crash');
  try {
    const c = store.issue(); const v = await f.verified(c);
    await assert.rejects(store.dispatch(c, v, f.remote, 'after_reservation'), /CRASH_AFTER_RESERVATION/);
    store.close(); store = f.controller('crash'); // same durable database, new process
    assert.deepEqual(f.operations(store), ['RESERVED']); assert.equal(f.target.effects(), 0);
    assert.equal(await store.reconcileWith(f.remote, c.operation_id), 'REJECTED');
    // The request that was in flight when the controller died now reaches the target.
    assert.deepEqual(await f.manual(c.operation_id, c.object_id, v.bundle_hash, 0), { outcome: 'fenced' });
    assert.equal(f.target.effects(), 0); assert.equal(f.target.attempts(), 1);
    await assert.rejects(store.dispatch(c, v, f.remote));
    assert.throws(() => store.expected(c.nonce));
  } finally { store.close(); await f.close(); }
});

test('controller crash after the target acknowledged: restart reconciles the reservation to COMPLETED, one effect', async () => {
  const f = await fixture(); let store = f.controller('crash-after-ack');
  try {
    const c = store.issue(); const v = await f.verified(c);
    await assert.rejects(store.dispatch(c, v, f.remote, 'after_target'), /CRASH_AFTER_TARGET/);
    assert.equal(f.target.effects(), 1);
    store.close(); store = f.controller('crash-after-ack');
    assert.deepEqual(f.operations(store), ['RESERVED']);
    assert.equal(await store.reconcileWith(f.remote, c.operation_id), 'COMPLETED');
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 1);
    assert.throws(() => store.reconcile(c.operation_id), /REMOTE_OPERATION/); // local reconciliation cannot rewrite it
  } finally { store.close(); await f.close(); }
});

test('stale object version between reservation and dispatch is refused without retry', async () => {
  const f = await fixture(); const store = f.controller('stale');
  try {
    const c = store.issue(); const v = await f.verified(c);
    // Another writer records a different operation on the same object first.
    assert.deepEqual(await f.manual('manual-' + 'a'.repeat(58), c.object_id, 'b'.repeat(64), 0), { outcome: 'recorded', version: 1 });
    // Version read before reservation was 1; the writer bumps again before our single attempt.
    const slow = new RemoteTarget(f.url, 1000);
    const original = slow.record.bind(slow);
    slow.record = async (operationId, request, ifMatch) => {
      await f.manual('manual-' + 'c'.repeat(58), c.object_id, 'd'.repeat(64), 1);
      return original(operationId, request, ifMatch);
    };
    assert.deepEqual(await store.dispatch(c, v, slow), { status: 'REJECTED', operation_id: c.operation_id });
    assert.equal(f.target.effects(), 2); // the two manual writers only
    assert.equal(await f.remote.version(c.object_id), 2);
    assert.deepEqual(f.operations(store), ['REJECTED']);
    await assert.rejects(store.dispatch(c, v, f.remote));
  } finally { store.close(); await f.close(); }
});

test('deadline reached between reservation and dispatch: REJECTED before any attempt', async () => {
  const f = await fixture(); let reads = 0;
  // The clock is read at issue, at verification, in the reservation; the next read (pre-dispatch recheck) is past the deadline.
  const store = f.controller('late-clock', () => now);
  try {
    const c = store.issue(); const v = await f.verified(c);
    store.close();
    const resumed = new AuthorizationStore(join(f.directory, 'late-clock.sqlite'), f.config, () => ++reads <= 2 ? now : c.expires_at_ms);
    try {
      assert.deepEqual(await resumed.dispatch(c, v, f.remote), { status: 'REJECTED', operation_id: c.operation_id });
      assert.equal(f.target.attempts(), 0); assert.equal(f.target.effects(), 0);
      assert.ok(f.auditTypes(resumed).includes('rejected'));
    } finally { resumed.close(); }
  } finally { await f.close(); }
});

test('deadline enforced by the target clock: a late write is refused at the target, REJECTED, zero effects', async () => {
  const f = await fixture(() => far); // the target believes the deadline has passed
  const store = f.controller('target-clock');
  try {
    const c = store.issue(); const v = await f.verified(c);
    assert.deepEqual(await store.dispatch(c, v, f.remote), { status: 'REJECTED', operation_id: c.operation_id });
    assert.equal(f.target.attempts(), 1); assert.equal(f.target.effects(), 0);
  } finally { store.close(); await f.close(); }
});

test('unreachable target: nothing consumed before reservation, UNKNOWN after it, fenced to REJECTED once reachable', async () => {
  const f = await fixture(); const store = f.controller('down');
  try {
    const c = store.issue(); const v = await f.verified(c);
    const dead = new RemoteTarget('http://127.0.0.1:9', 500);
    await assert.rejects(store.dispatch(c, v, dead), /TARGET_UNAVAILABLE/);
    assert.deepEqual(store.expected(c.nonce), c); assert.deepEqual(f.operations(store), []);
    // Reachable for the version read, unreachable for the mutation.
    const flaky = new RemoteTarget(f.url, 500);
    flaky.record = () => dead.record(c.operation_id, { object_id: c.object_id, tenant: c.tenant, bundle_hash: v.bundle_hash, expires_at_ms: far }, 0);
    assert.deepEqual(await store.dispatch(c, v, flaky), { status: 'UNKNOWN', operation_id: c.operation_id });
    // Reconciliation must address the target the reservation was dispatched to.
    await assert.rejects(store.reconcileWith(dead, c.operation_id), /TARGET_MISMATCH/);
    assert.deepEqual(f.operations(store), ['UNKNOWN']);
    assert.equal(await store.reconcileWith(f.remote, c.operation_id), 'REJECTED');
    assert.equal(f.target.effects(), 0); assert.equal(f.target.attempts(), 0);
    assert.throws(() => store.issue(), /OPERATION_CONSUMED/);
  } finally { store.close(); await f.close(); }
});

test('target crash before commit: UNKNOWN, then fenced to REJECTED with zero effects', async () => {
  const f = await fixture(); const store = f.controller('crashing-target');
  try {
    const c = store.issue(); const v = await f.verified(c);
    f.target.faults.set(c.operation_id, 'crash_before_commit');
    assert.deepEqual(await store.dispatch(c, v, f.remote), { status: 'UNKNOWN', operation_id: c.operation_id });
    assert.equal(f.target.effects(), 0); assert.equal(f.target.attempts(), 1);
    assert.equal(await store.reconcileWith(f.remote, c.operation_id), 'REJECTED');
    assert.equal(f.target.effects(), 0); assert.equal(f.target.attempts(), 1);
  } finally { store.close(); await f.close(); }
});

test('reconciliation racing the in-flight attempt: one effect at most and one consistent terminal state', async () => {
  const f = await fixture();
  // Fence first: the attempt lands on a fenced operation.
  const a = f.controller('race-fence');
  try {
    const c = a.issue(); const v = await f.verified(c);
    const gated = new RemoteTarget(f.url, 1000); const original = gated.record.bind(gated);
    let reconciled: Promise<string> | undefined;
    gated.record = async (id, request, ifMatch) => { reconciled = a.reconcileWith(f.remote, id); await reconciled; return original(id, request, ifMatch); };
    assert.deepEqual(await a.dispatch(c, v, gated), { status: 'REJECTED', operation_id: c.operation_id });
    assert.equal(await reconciled, 'REJECTED'); assert.equal(f.target.effects(), 0); assert.equal(f.target.attempts(), 1);
    assert.deepEqual(f.operations(a), ['REJECTED']);
    assert.ok(f.auditTypes(a).includes('settled_after_reconciliation'));
  } finally { a.close(); }
  // Record first: the acknowledgement is overtaken by a reconciliation that already observed the record.
  const b = new AuthorizationStore(join(f.directory, 'race-record.sqlite'), PublicConfig.parse({ ...f.config, challenge: { ...f.config.challenge, audience: 'race-2' } }), () => now);
  try {
    const c = b.issue(); const v = await f.verified(c);
    const gated = new RemoteTarget(f.url, 1000); const original = gated.record.bind(gated);
    gated.record = async (id, request, ifMatch) => { const answer = await original(id, request, ifMatch); assert.equal(await b.reconcileWith(f.remote, id), 'COMPLETED'); return answer; };
    assert.deepEqual(await b.dispatch(c, v, gated), { status: 'COMPLETED', operation_id: c.operation_id });
    assert.equal(f.target.effects(), 1); assert.deepEqual(f.operations(b), ['COMPLETED']);
    assert.equal(await b.reconcileWith(f.remote, c.operation_id), 'COMPLETED');
  } finally { b.close(); await f.close(); }
});

test('distinct operations on one object: the version precondition serializes concurrent writers, sequential writers both record', async () => {
  // The laboratory attestations name one case; a second audience yields a distinct business operation on the same object.
  const f = await fixture();
  const otherConfig = PublicConfig.parse({ ...f.config, challenge: { ...f.config.challenge, audience: 'horizon-verifier-2' } });
  const a = f.controller('audience-1'); const b = new AuthorizationStore(join(f.directory, 'audience-2.sqlite'), otherConfig, () => now);
  try {
    const ca = a.issue(); const cb = b.issue(); assert.notEqual(ca.operation_id, cb.operation_id);
    const [va, vb] = await Promise.all([f.verified(ca), f.verified(cb)]);
    const concurrent = await Promise.all([a.dispatch(ca, va, f.remote), b.dispatch(cb, vb, f.remote)]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), ['COMPLETED', 'REJECTED']);
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 2);
    // The refused writer is consumed: no automatic retry re-reads the version and writes again.
    await assert.rejects(a.dispatch(ca, va, f.remote)); await assert.rejects(b.dispatch(cb, vb, f.remote));
    assert.equal(f.target.attempts(), 2);
    // A fresh controller database for the refused side records after the first, sequentially.
    const refused = concurrent[0]?.status === 'REJECTED' ? { store: f.controller('audience-1-retry') } : { store: new AuthorizationStore(join(f.directory, 'audience-2-retry.sqlite'), otherConfig, () => now) };
    try {
      const c2 = refused.store.issue(); const v2 = await f.verified(c2);
      assert.deepEqual(await refused.store.dispatch(c2, v2, f.remote), { status: 'COMPLETED', operation_id: c2.operation_id });
      assert.equal(f.target.effects(), 2); assert.equal(await f.remote.version(c2.object_id), 2);
    } finally { refused.store.close(); }
  } finally { a.close(); b.close(); await f.close(); }
});

test('HTTP verifier with a remote target: lost acknowledgement surfaces as UNKNOWN, operator reconciliation completes it, replay refused', async () => {
  const f = await fixture(); f.worker.close();
  const publicPath = join(f.directory, 'public.json'); const privatePath = join(f.directory, 'private.json');
  writeFileSync(publicPath, JSON.stringify(f.config));
  writeFileSync(privatePath, JSON.stringify({ evidence: f.data.evidence, witness: f.data.witness, holder_secret_hex: f.data.holder_secret_hex,
    policy: f.data.policy, client_id: f.data.challenge.client_id, audience: f.data.challenge.audience, action: f.data.challenge.action }));
  const origin = 'http://127.0.0.1:38080'; const token = 'c'.repeat(64);
  const prover = createHorizonServer({ role: 'prover', configPath: privatePath, origin, clock: () => now });
  const verifier = createHorizonServer({ role: 'verifier', configPath: publicPath, databasePath: join(f.directory, 'http.sqlite'),
    origin, clock: () => now, operatorToken: token, targetUrl: f.url });
  const post = async (url: string, value: unknown, operator?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (operator) headers['x-horizon-operator-token'] = operator;
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(value), signal: AbortSignal.timeout(5000) });
    return { status: response.status, body: Record.parse(await response.json()) };
  };
  try {
    const p = await listen(prover.server); const v = await listen(verifier.server);
    const challenge = Record.parse((await post(`${v}/api/challenge`, {})).body['challenge']);
    const operationId = z.string().parse(challenge['operation_id']);
    const presentation = (await post(`${p}/api/prove`, { challenge })).body['presentation'];
    f.target.faults.set(operationId, 'drop_ack');
    const first = await post(`${v}/api/execute`, { nonce: challenge['nonce'], presentation });
    assert.equal(first.status, 409); assert.equal(first.body['status'], 'UNKNOWN');
    assert.equal(f.target.effects(), 1); assert.ok(verifier.store); assert.equal(f.localEffects(verifier.store), 0);
    assert.equal((await post(`${v}/api/execute`, { nonce: challenge['nonce'], presentation })).status, 400);
    assert.equal((await post(`${v}/api/challenge`, {})).status, 400); // operation consumed
    assert.equal((await post(`${v}/api/reconcile`, { operation_id: operationId })).status, 403); // operator token required
    assert.deepEqual(await post(`${v}/api/reconcile`, { operation_id: operationId }, token), { status: 200, body: { status: 'COMPLETED' } });
    assert.deepEqual(await post(`${v}/api/reconcile`, { operation_id: operationId }, token), { status: 200, body: { status: 'COMPLETED' } });
    assert.equal(f.target.effects(), 1); assert.equal(f.target.attempts(), 1);
    // A verifier restarted on the same database without the target cannot rewrite the outcome locally.
    await verifier.close();
    const local = createHorizonServer({ role: 'verifier', configPath: publicPath, databasePath: join(f.directory, 'http.sqlite'), origin, clock: () => now, operatorToken: token });
    try { const l = await listen(local.server); assert.equal((await post(`${l}/api/reconcile`, { operation_id: operationId }, token)).status, 400); }
    finally { await local.close(); }
  } finally { await prover.close(); await f.close(); }
});

test('sandbox target refuses malformed, oversized and unknown requests without recording', async () => {
  const f = await fixture();
  try {
    const put = (path: string, body: string, ifMatch?: string, contentType = 'application/json') => fetch(f.url + path, { method: 'PUT', body,
      headers: { 'Content-Type': contentType, ...(ifMatch === undefined ? {} : { 'If-Match': ifMatch }) } }).then(r => r.status);
    const valid = (hash: string) => JSON.stringify({ object_id: 'claim-001', tenant: 't', bundle_hash: hash, expires_at_ms: far });
    assert.equal(await put('/records/op-1', valid('a'.repeat(64))), 400); // no precondition
    // Leading/trailing header whitespace is stripped by HTTP itself; the target sees the trimmed token.
    for (const precondition of ['', '1e0', '0x1', '-1', '01', '+0', '1'.repeat(13)]) assert.equal(await put('/records/op-1', valid('a'.repeat(64)), precondition), 400, precondition);
    assert.equal(await put('/records/op-1', valid('a'.repeat(64)), '0', 'text/plain'), 400);
    assert.equal(await put('/records/op-1', JSON.stringify({ object_id: 'claim-001', tenant: 't', bundle_hash: 'zz', expires_at_ms: far }), '0'), 400);
    assert.equal(await put('/records/op-1', JSON.stringify({ object_id: 'claim-001', tenant: 't', bundle_hash: 'a'.repeat(64) }), '0'), 400); // omission
    assert.equal(await put('/records/op-1', JSON.stringify({ object_id: 'claim-001', tenant: 't', bundle_hash: 'a'.repeat(64), expires_at_ms: far, extra: 1 }), '0'), 400);
    assert.equal(await put('/records/op-1', 'x'.repeat(5000), '0'), 400);
    assert.equal(await put('/records/bad id', '{}', '0'), 404);
    assert.equal(await put('/records/x/fence', valid('a'.repeat(64)), '0'), 404); // a fence route is never a record id
    assert.equal((await fetch(f.url + '/records/op-1')).status, 404);
    assert.equal(f.target.effects(), 0); assert.equal(f.target.attempts(), 0);
    assert.equal(await put('/records/op-1', valid('a'.repeat(64)), '0'), 201);
    assert.equal(await put('/records/op-1', valid('a'.repeat(64)), '0'), 200); // idempotent replay
    assert.equal(await put('/records/op-1', valid('b'.repeat(64)), '0'), 409);
    assert.equal(await put('/records/op-2', valid('b'.repeat(64)), '0'), 412);
    assert.equal(await put('/records/op-3', JSON.stringify({ object_id: 'claim-001', tenant: 't', bundle_hash: 'c'.repeat(64), expires_at_ms: now }), '1'), 410);
    assert.equal(f.target.effects(), 1);
  } finally { await f.close(); }
});
