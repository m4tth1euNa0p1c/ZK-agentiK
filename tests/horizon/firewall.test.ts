import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { ProofWorker } from '../../packages/horizon-demo/src/worker.js';
import { AuthorizationStore } from '../../packages/horizon-demo/src/store.js';
import { createHorizonServer } from '../../packages/horizon-demo/src/server.js';
import { PublicConfig, Verified, type Challenge } from '../../packages/horizon-demo/src/types.js';

const Fixture = PublicConfig.extend({ witness: z.record(z.string(), z.unknown()), holder_secret_hex: z.string() });
const now = 1800000000000;
async function fixture() {
  const worker = new ProofWorker();
  const data = Fixture.parse(await worker.request({ op: 'init', now_ms: now }));
  const config = PublicConfig.parse({ trust: data.trust, evidence: data.evidence, challenge: data.challenge, policy: data.policy });
  const directory = mkdtempSync(join(tmpdir(), 'horizon-test-'));
  const database = join(directory, 'db.sqlite');
  const publicPath = join(directory, 'public.json'); const privatePath = join(directory, 'private.json');
  writeFileSync(publicPath, JSON.stringify(config));
  writeFileSync(privatePath, JSON.stringify({ evidence: data.evidence, witness: data.witness,
    holder_secret_hex: data.holder_secret_hex, policy: data.policy,
    client_id: data.challenge.client_id, audience: data.challenge.audience, action: data.challenge.action }), { mode: 0o600 });
  const prepared = await worker.request({ op: 'prepare', evidence: data.evidence, witness: data.witness });
  async function presentation(challenge: Challenge) {
    return worker.request({ op: 'present', evidence: data.evidence, prepared, holder_secret_hex: data.holder_secret_hex, challenge });
  }
  async function verified(challenge: Challenge) {
    const proof = await presentation(challenge);
    return Verified.parse(await worker.request({ op: 'verify', presentation: proof, expected: challenge,
      trust: config.trust, policy: config.policy, now_ms: now }));
  }
  return { worker, config, directory, database, publicPath, privatePath, verified, presentation };
}
function effects(store: AuthorizationStore): number {
  return Number(store.db.prepare('SELECT count(*) AS n FROM effects').get()?.['n']);
}

test('real proof, independent public worker, durable replay and new-nonce exclusion', async () => {
  const f = await fixture(); let store = new AuthorizationStore(f.database, f.config, () => now);
  const publicWorker = new ProofWorker();
  try {
    const challenge = store.issue(); const other = store.issue();
    const presentation = await f.presentation(challenge); f.worker.close();
    const verified = await publicWorker.request({ op: 'verify', presentation, expected: challenge,
      trust: f.config.trust, policy: f.config.policy, now_ms: now });
    assert.equal(store.authorize(challenge, verified).status, 'COMPLETED');
    assert.throws(() => store.authorize(challenge, verified));
    store.close(); store = new AuthorizationStore(f.database, f.config, () => now);
    assert.throws(() => store.expected(challenge.nonce));
    // A new nonce cannot obtain another authorization for the same exact business action.
    assert.throws(() => store.authorize(other, { ...Verified.parse(verified), operation_id: other.operation_id }));
    assert.equal(effects(store), 1);
  } finally { f.worker.close(); publicWorker.close(); store.close(); }
});

test('revocation, policy change, expiry and clock rollback after crypto yield zero effects', async () => {
  for (const attack of ['revoke', 'policy', 'expiry', 'rollback'] as const) {
    const f = await fixture(); let clock = attack === 'rollback' ? now - 1000 : now;
    const store = new AuthorizationStore(f.database, f.config, () => clock);
    try {
      const challenge = store.issue(); const verified = await f.verified(challenge);
      if (attack === 'revoke') store.revoke();
      if (attack === 'policy') store.rotatePolicy();
      if (attack === 'expiry') clock = challenge.expires_at_ms;
      if (attack === 'rollback') clock = verified.not_before_ms - 1;
      assert.throws(() => store.authorize(challenge, verified)); assert.equal(effects(store), 0);
    } finally { f.worker.close(); store.close(); }
  }
});

test('deadline rechecked after reservation; no dispatch and operation remains consumed', async () => {
  const f = await fixture(); let reads = 0;
  const store = new AuthorizationStore(f.database, f.config, () => now);
  try {
    const challenge = store.issue(); const verified = await f.verified(challenge); store.close();
    const resumed = new AuthorizationStore(f.database, f.config, () => ++reads <= 2 ? now : challenge.expires_at_ms);
    try { assert.equal(resumed.authorize(challenge, verified).status, 'REJECTED'); assert.equal(effects(resumed), 0);
      assert.throws(() => resumed.expected(challenge.nonce)); } finally { resumed.close(); }
  } finally { f.worker.close(); }
});

test('process crash after durable reservation cannot repeat action on restart', async () => {
  const f = await fixture(); const store = new AuthorizationStore(f.database, f.config, () => now);
  try {
    const challenge = store.issue(); const verified = await f.verified(challenge); store.close();
    const path = join(f.directory, 'crash.json'); writeFileSync(path, JSON.stringify({ config: f.config, challenge, verified, database: f.database, now }));
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'tests/horizon/crash-child.ts', path], { windowsHide: true, encoding: 'utf8' });
    assert.equal(result.status, 73, result.stderr);
    const resumed = new AuthorizationStore(f.database, f.config, () => now);
    try { assert.equal(effects(resumed), 0); assert.throws(() => resumed.expected(challenge.nonce));
      assert.equal(resumed.reconcile(challenge.operation_id), 'UNKNOWN');
      assert.throws(() => resumed.authorize(challenge, verified)); } finally { resumed.close(); }
  } finally { f.worker.close(); }
});

test('ambiguous target result remains consumed; reconciliation never redispatches', async () => {
  const f = await fixture(); const store = new AuthorizationStore(f.database, f.config, () => now);
  try {
    const c = store.issue(); const v = await f.verified(c);
    assert.equal(store.authorize(c, v, 'ambiguous').status, 'UNKNOWN');
    assert.throws(() => store.authorize(c, v)); assert.equal(effects(store), 1);
    assert.equal(store.reconcile(c.operation_id), 'COMPLETED'); assert.equal(effects(store), 1);
  } finally { f.worker.close(); store.close(); }
});

test('cross-tenant configuration and unavailable crypto worker fail closed', async () => {
  const f = await fixture(); const store = new AuthorizationStore(f.database, f.config, () => now);
  const absent = new ProofWorker(join(f.directory, 'absent-binary'));
  try {
    assert.throws(() => new AuthorizationStore(f.database, { ...f.config, challenge: { ...f.config.challenge, tenant: 'other-tenant' } }));
    await assert.rejects(absent.request({ op: 'init', now_ms: now })); assert.equal(effects(store), 0);
  } finally { f.worker.close(); absent.close(); store.close(); }
});

test('HTTP rejects disclosure downgrade, omission, alteration, substitution and concurrent replay', async () => {
  const f = await fixture(); f.worker.close(); const origin = 'http://127.0.0.1:38080';
  const prover = createHorizonServer({ role: 'prover', configPath: f.privatePath, origin, clock: () => now });
  const verifier = createHorizonServer({ role: 'verifier', configPath: f.publicPath, databasePath: f.database, origin, clock: () => now });
  const listen = async (app: typeof prover) => {
    await new Promise<void>(done => app.server.listen(0, '127.0.0.1', done));
    const address = app.server.address(); assert.ok(address && typeof address !== 'string'); return `http://127.0.0.1:${address.port}`;
  };
  const post = async (url: string, value: unknown) => {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
    return { status: r.status, body: z.record(z.string(), z.unknown()).parse(await r.json()) };
  };
  try {
    const p = await listen(prover); const v = await listen(verifier);
    const issued = await post(`${v}/api/challenge`, {}); const challenge = z.record(z.string(), z.unknown()).parse(issued.body['challenge']);
    const downgrade = await post(`${p}/api/prove`, { challenge: { ...challenge, method: 'disclosure' } });
    assert.equal(downgrade.status, 400); assert.equal(JSON.stringify(downgrade.body).includes('blinding'), false);
    const proof = await post(`${p}/api/prove`, { challenge }); assert.equal(proof.status, 200);
    const presentation = z.record(z.string(), z.unknown()).parse(proof.body['presentation']);
    const second = await post(`${v}/api/challenge`, {});
    const challenge2 = z.record(z.string(), z.unknown()).parse(second.body['challenge']);
    const proof2 = await post(`${p}/api/prove`, { challenge: challenge2 }); assert.equal(proof2.status, 200);
    assert.equal(JSON.stringify(presentation).includes('blinding_hex'), false);
    for (const invalid of [{ ...presentation, holder_signature_hex: '00'.repeat(64) },
      { ...presentation, evidence: {} }, { ...presentation, challenge: { ...challenge, tenant: 'other-tenant' } }]) {
      assert.equal((await post(`${v}/api/execute`, { nonce: challenge['nonce'], presentation: invalid })).status, 400);
    }
    assert.ok(verifier.store); assert.equal(effects(verifier.store), 0);
    const requests = await Promise.all(Array.from({ length: 4 }, (_, i) => post(`${v}/api/execute`, i % 2 === 0
      ? { nonce: challenge['nonce'], presentation }
      : { nonce: challenge2['nonce'], presentation: proof2.body['presentation'] })));
    assert.equal(requests.filter(r => r.status === 200).length, 1); assert.equal(effects(verifier.store), 1);
    const revoked = await post(`${v}/api/revoke`, {}); assert.equal(revoked.status, 200);
    assert.equal((await post(`${v}/api/challenge`, {})).status, 400);
  } finally { await prover.close(); await verifier.close(); }
});
