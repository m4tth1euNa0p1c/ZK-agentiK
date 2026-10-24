// SEC-1: statement/transcript binding observed end to end with a target counter.
// Each adversarial presentation is checked twice: once against the raw Rust worker
// (exact refusal code) and once through the SDK tool + SQLite controller (zero effects).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, createPrivateKey, sign } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { z } from 'zod';
import { ProofWorker } from '../../packages/horizon-demo/src/worker.js';
import { AuthorizationStore } from '../../packages/horizon-demo/src/store.js';
import { createClaimTool } from '../../packages/horizon-demo/src/tool.js';
import { PublicConfig, Verified, type Challenge } from '../../packages/horizon-demo/src/types.js';

const Record = z.record(z.string(), z.unknown());
const Fixture = PublicConfig.extend({ witness: Record, holder_secret_hex: z.string().regex(/^[0-9a-f]{64}$/) });
const Presentation = z.strictObject({ profile: z.string(), evidence: Record, challenge: Record, payload: Record,
  holder_signature_hex: z.string() });
type Presentation = z.infer<typeof Presentation>;
const now = 1800000000000;
const binary = process.env['HORIZON_WORKER'] ?? resolve('labs/horizon/target/release',
  process.platform === 'win32' ? 'horizon-proof-worker.exe' : 'horizon-proof-worker');

/** One-shot worker call exposing the exact refusal; ProofWorker deliberately hides it as CRYPTO_REJECTED. */
function rawVerify(presentation: unknown, expected: Challenge, trust: unknown, policy: unknown): { ok: boolean; error: string } {
  const result = spawnSync(binary, [], { encoding: 'utf8', windowsHide: true,
    input: JSON.stringify({ op: 'verify', presentation, expected, trust, policy, now_ms: now }) + '\n' });
  assert.equal(result.status, 0, result.stderr);
  const parsed = z.object({ ok: z.boolean(), error: z.string().optional() }).parse(JSON.parse(result.stdout.trim()));
  return { ok: parsed.ok, error: parsed.error ?? '' };
}

/** Field order of the Rust structs in labs/horizon/proof/src/lib.rs: the signed bytes follow the
 * declaration order, while the worker's JSON output sorts keys alphabetically (serde_json::Value). */
const ORDER = {
  evidence: ['profile', 'role', 'issuer', 'tenant', 'subject', 'currency', 'exponent', 'version',
    'holder_public_key_hex', 'valid_from_ms', 'valid_until_ms', 'commitment_hex'],
  challenge: ['tenant', 'client_id', 'audience', 'action', 'operation_id', 'object_id', 'subject', 'policy_id',
    'policy_epoch', 'trust_epoch', 'nonce', 'issued_at_ms', 'expires_at_ms', 'method'],
  prepared: ['evidence_hash', 'proof_hex'],
  witness: ['amount', 'cap', 'amount_blinding_hex', 'cap_blinding_hex'],
} as const;
function pick(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  assert.deepEqual(Object.keys(record).sort(), [...keys].sort(), 'mirror covers exactly the Rust fields');
  return Object.fromEntries(keys.map(key => [key, record[key]]));
}
function declarationOrder(p: Presentation): unknown[] {
  const signedEvidence = (value: unknown) => { const s = Record.parse(value);
    return { body: pick(Record.parse(s['body']), ORDER.evidence), signature_hex: s['signature_hex'] }; };
  const method = z.enum(['challenge_bound', 'reusable', 'disclosure']).parse(p.payload['method']);
  const payload = method === 'challenge_bound' ? { method, proof_hex: p.payload['proof_hex'] }
    : method === 'reusable' ? { method, prepared: pick(Record.parse(p.payload['prepared']), ORDER.prepared) }
      : { method, witness: pick(Record.parse(p.payload['witness']), ORDER.witness) };
  return [p.profile, { amount: signedEvidence(p.evidence['amount']), cap: signedEvidence(p.evidence['cap']) },
    pick(p.challenge, ORDER.challenge), payload];
}

/** Test-only mirror of lib.rs holder_message/signed, so that corrupted bundles reach the range verifier.
 * Ed25519 is deterministic: the mirror is proven byte-exact against the worker's own signature below. */
function resign(presentation: Presentation, holderSecretHex: string): Presentation {
  const key = createPrivateKey({ format: 'der', type: 'pkcs8',
    key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(holderSecretHex, 'hex')]) });
  const digest = createHash('sha256').update('horizon/presentation/v1\0' + JSON.stringify(declarationOrder(presentation))).digest('hex');
  const signature = sign(null, Buffer.from('horizon/holder-authorization/v1\0' + JSON.stringify(digest)), key);
  return { ...presentation, holder_signature_hex: signature.toString('hex') };
}

function proofHex(presentation: Presentation): string {
  return z.string().parse(Record.parse(presentation.payload['prepared'])['proof_hex']);
}
function withProof(presentation: Presentation, proof: string): Presentation {
  return { ...presentation, payload: { ...presentation.payload, prepared: { ...Record.parse(presentation.payload['prepared']), proof_hex: proof } } };
}
function flipLastScalarBit(hex: string): string {
  const bytes = Buffer.from(hex, 'hex'); const index = bytes.length - 32;
  bytes[index] = (bytes[index] ?? 0) ^ 0x01; // canonical scalar b stays canonical with overwhelming probability
  return bytes.toString('hex');
}
function counters(store: AuthorizationStore) {
  const count = (sql: string) => Number(store.db.prepare(sql).get()?.['n']);
  return { effects: count('SELECT count(*) AS n FROM effects'), operations: count('SELECT count(*) AS n FROM operations'),
    used: count('SELECT count(*) AS n FROM challenges WHERE used=1') };
}
const rejected = (error: unknown) => error instanceof Error && error.name === 'ToolError' && error.message === 'REJECTED';

async function fixture() {
  const worker = new ProofWorker();
  const data = Fixture.parse(await worker.request({ op: 'init', now_ms: now }));
  const config = PublicConfig.parse({ trust: data.trust, evidence: data.evidence, challenge: data.challenge, policy: data.policy });
  const directory = mkdtempSync(join(tmpdir(), 'horizon-binding-'));
  const prepared = Record.parse(await worker.request({ op: 'prepare', evidence: data.evidence, witness: data.witness }));
  const present = async (challenge: Challenge) => Presentation.parse(await worker.request({ op: 'present',
    evidence: data.evidence, prepared, holder_secret_hex: data.holder_secret_hex, challenge }));
  return { worker, data, config, directory, prepared, present };
}

test('adversarial bundles: exact worker refusal, SDK rejection and zero target effects on one nonce', { timeout: 120000 }, async () => {
  const f = await fixture();
  const store = new AuthorizationStore(join(f.directory, 'db.sqlite'), f.config, () => now);
  const tool = createClaimTool(store, f.worker, f.config, () => now);
  const other = Fixture.parse(await f.worker.request({ op: 'init', now_ms: now }));
  try {
    const challenge = store.issue(); assert.equal(challenge.method, 'reusable');
    const genuine = await f.present(challenge);
    const signedBy = (p: Presentation) => resign(p, f.data.holder_secret_hex);
    // Positive control of the test mirror: byte-identical signature and accepted by the worker.
    assert.equal(signedBy(genuine).holder_signature_hex, genuine.holder_signature_hex);
    assert.deepEqual(rawVerify(genuine, challenge, f.config.trust, f.config.policy), { ok: true, error: '' });
    const idle = counters(store); assert.deepEqual(idle, { effects: 0, operations: 0, used: 0 });

    const proof = proofHex(genuine);
    const cases: { name: string; presentation: unknown; code: string }[] = [
      { name: 'foreign profile', code: 'PROFILE_MISMATCH', presentation: signedBy({ ...genuine, profile: 'horizon-range-v2' }) },
      { name: 'reusable bytes as challenge-bound payload', code: 'METHOD_MISMATCH',
        presentation: signedBy({ ...genuine, payload: { method: 'challenge_bound', proof_hex: proof } }) },
      { name: 'correct opening disclosed under private policy', code: 'METHOD_MISMATCH',
        presentation: signedBy({ ...genuine, payload: { method: 'disclosure', witness: f.data.witness } }) },
      { name: 'prepared hash names other attestations', code: 'PREPARED_EVIDENCE_MISMATCH',
        presentation: signedBy({ ...genuine, payload: { ...genuine.payload, prepared: { evidence_hash: '00'.repeat(32), proof_hex: proof } } }) },
      { name: 'canonical bit flip in the proof', code: 'INVALID_RANGE_PROOF', presentation: signedBy(withProof(genuine, flipLastScalarBit(proof))) },
      { name: 'uppercase proof hex', code: 'NONCANONICAL_HEX', presentation: signedBy(withProof(genuine, proof.toUpperCase())) },
      { name: 'truncated proof', code: 'PROOF_LENGTH', presentation: signedBy(withProof(genuine, proof.slice(0, -2))) },
      { name: 'all-zero proof', code: 'INVALID_RANGE_PROOF', presentation: signedBy(withProof(genuine, '00'.repeat(672))) },
      { name: 'payload replaced without fresh holder signature', code: 'INVALID_SIGNATURE',
        presentation: withProof(genuine, flipLastScalarBit(proof)) },
      { name: 'tenant changed in the carried challenge', code: 'CHALLENGE_MISMATCH',
        presentation: signedBy({ ...genuine, challenge: { ...genuine.challenge, tenant: 'other-tenant' } }) },
      { name: 'attestations from another issuer pair', code: 'INVALID_SIGNATURE', presentation: { ...genuine, evidence: other.evidence } },
      ...['trust', 'policy', 'verification_key', 'backend_url', 'image_id'].map(field => ({
        name: `agent-selected ${field}`, code: 'unknown field', presentation: { ...genuine, [field]: { selected_by: 'agent' } } })),
    ];
    for (const { name, presentation, code } of cases) {
      const raw = rawVerify(presentation, challenge, f.config.trust, f.config.policy);
      assert.equal(raw.ok, false, name);
      assert.ok(raw.error.length > 0 && raw.error.includes(code), `${name}: ${raw.error}`);
      assert.equal(raw.error.includes('blinding'), false, name);
      await assert.rejects(tool.execute({ nonce: challenge.nonce, presentation }), rejected, name);
      assert.deepEqual(counters(store), idle, name);
    }
    // The untouched bundle on the same nonce is admitted exactly once afterwards.
    assert.equal(Record.parse(await tool.execute({ nonce: challenge.nonce, presentation: genuine }))['status'], 'COMPLETED');
    assert.deepEqual(counters(store), { effects: 1, operations: 1, used: 1 });
    await assert.rejects(tool.execute({ nonce: challenge.nonce, presentation: genuine }), rejected);
    assert.deepEqual(counters(store), { effects: 1, operations: 1, used: 1 });
  } finally { f.worker.close(); store.close(); }
});

test('misconfigured verifier registry or policy never admits a genuine bundle', { timeout: 60000 }, async () => {
  const f = await fixture();
  try {
    const trust = Record.parse(f.config.trust);
    const amount = Record.parse(trust['amount_issuer']); const cap = Record.parse(trust['cap_issuer']);
    const registries: { name: string; trust: unknown; policy?: unknown; code: string }[] = [
      { name: 'swapped keys', code: 'INVALID_SIGNATURE', trust: { ...trust,
        amount_issuer: { ...amount, public_key_hex: cap['public_key_hex'] }, cap_issuer: { ...cap, public_key_hex: amount['public_key_hex'] } } },
      { name: 'swapped names', code: 'UNKNOWN_ISSUER', trust: { ...trust,
        amount_issuer: { ...amount, issuer: cap['issuer'] }, cap_issuer: { ...cap, issuer: amount['issuer'] } } },
      { name: 'single authority', code: 'DISTINCT_AUTHORITIES_REQUIRED', trust: { ...trust, cap_issuer: amount } },
      { name: 'holder as authority', code: 'INVALID_SIGNATURE', trust: { ...trust,
        amount_issuer: { ...amount, public_key_hex: Record.parse(Record.parse(Record.parse(f.config.evidence['amount'])['body']))['holder_public_key_hex'] } } },
      { name: 'other trust epoch', code: 'TRUST_EPOCH_MISMATCH', trust: { ...trust, epoch: Number(trust['epoch']) + 1 } },
      { name: 'other policy identifier', code: 'POLICY_MISMATCH', trust, policy: { ...f.config.policy, policy_id: 'claim-range-v2' } },
      { name: 'other policy epoch', code: 'POLICY_MISMATCH', trust, policy: { ...f.config.policy, policy_epoch: f.config.policy.policy_epoch + 1 } },
      { name: 'TTL budget below the challenge lifetime', code: 'CHALLENGE_TTL', trust, policy: { ...f.config.policy, max_challenge_ttl_ms: 1000 } },
    ];
    const reference = new AuthorizationStore(join(f.directory, 'reference.sqlite'), f.config, () => now);
    const challenge = reference.issue(); reference.close();
    const genuine = await f.present(challenge);
    assert.equal(rawVerify(genuine, challenge, f.config.trust, f.config.policy).ok, true);
    for (const { name, trust: registry, policy, code } of registries) {
      const raw = rawVerify(genuine, challenge, registry, policy ?? f.config.policy);
      assert.equal(raw.ok, false, name); assert.ok(raw.error.includes(code), `${name}: ${raw.error}`);
    }
    // Through the SDK: a controller configured with swapped authority keys rejects the real prover and records no effect.
    const swapped = PublicConfig.parse({ ...f.config, trust: registries[0]?.trust });
    const store = new AuthorizationStore(join(f.directory, 'swapped.sqlite'), swapped, () => now);
    try {
      const tool = createClaimTool(store, f.worker, swapped, () => now);
      const issued = await tool.issue({});
      await assert.rejects(tool.execute({ nonce: issued.nonce, presentation: await f.present(issued) }), rejected);
      assert.deepEqual(counters(store), { effects: 0, operations: 0, used: 0 });
    } finally { store.close(); }
  } finally { f.worker.close(); }
});

test('verifier output departing from the expected statement is refused by the controller without consuming the nonce', async () => {
  const f = await fixture();
  const store = new AuthorizationStore(join(f.directory, 'controller.sqlite'), f.config, () => now);
  try {
    const challenge = store.issue();
    const verified = Verified.parse(await f.worker.request({ op: 'verify', presentation: await f.present(challenge),
      expected: challenge, trust: f.config.trust, policy: f.config.policy, now_ms: now }));
    const mismatch = /^Error: VERIFIED_STATEMENT_MISMATCH$/; const expired = /^Error: EXPIRED$/;
    const alterations: [Partial<Verified>, RegExp][] = [[{ tenant: 'other-tenant' }, mismatch], [{ subject: 'claim-002' }, mismatch],
      [{ object_id: 'claim-002' }, mismatch], [{ operation_id: 'a'.repeat(64) }, mismatch], [{ method: 'challenge_bound' }, mismatch],
      [{ method: 'disclosure' }, mismatch], [{ expires_at_ms: now }, expired], [{ not_before_ms: now + 1 }, expired]];
    for (const [alteration, code] of alterations) {
      assert.throws(() => store.authorize(challenge, { ...verified, ...alteration }), code, JSON.stringify(alteration));
      assert.deepEqual(counters(store), { effects: 0, operations: 0, used: 0 }, JSON.stringify(alteration));
      assert.deepEqual(store.expected(challenge.nonce), challenge);
    }
    assert.equal(store.authorize(challenge, verified).status, 'COMPLETED');
    assert.deepEqual(counters(store), { effects: 1, operations: 1, used: 1 });
  } finally { f.worker.close(); store.close(); }
});
