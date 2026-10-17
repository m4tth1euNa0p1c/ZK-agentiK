/** Fail-closed join of independently computed numerical and cryptographic observations. */
import { createHash } from 'node:crypto';
import { createReadStream, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import { parseU64, relation, validateVectors } from './circuit-vectors.mjs';

export const VALID_TESTS = Object.freeze({
  a_valid: null, b_valid: null, b_scalar_corruption: 'INVALID_RANGE_PROOF',
  a_challenge_transplant: 'INVALID_RANGE_PROOF', b_authority_key_substitution: 'INVALID_SIGNATURE',
  b_issuer_signature_corruption: 'INVALID_SIGNATURE', b_holder_signature_corruption: 'INVALID_SIGNATURE',
  b_policy_epoch: 'POLICY_MISMATCH', b_reuse_forbidden: 'REUSE_FORBIDDEN',
  b_expected_context: 'CHALLENGE_MISMATCH', b_subject_transplant: 'SUBJECT_MISMATCH',
  b_expired_challenge: 'CHALLENGE_EXPIRED', b_future_challenge: 'CHALLENGE_EXPIRED',
  b_expired_evidence: 'EVIDENCE_EXPIRED', b_trust_epoch: 'TRUST_EPOCH_MISMATCH',
  b_evidence_join: 'EVIDENCE_JOIN',
});
export const INVALID_TESTS = Object.freeze({ a_direct_bypass: 'INVALID_RANGE_PROOF', b_direct_bypass: 'INVALID_RANGE_PROOF' });
const assert = (value, message) => { if (!value) throw new Error(message); };
const index = (rows, key) => {
  assert(Array.isArray(rows), 'Missing rows'); const result = new Map();
  for (const row of rows) { const k = key(row); assert(!result.has(k), `Duplicate row: ${k}`); result.set(k, row); }
  return result;
};

export function correlate({ vectors, octave, prover, verifier, matlab }) {
  validateVectors(vectors);
  assert(octave.schema === 'horizon-circuit-oracle-v1' && octave.runtime === 'GNU Octave'
    && octave.executed_in_matlab === false && octave.status === 'pass', 'Octave provenance/status');
  assert(prover.schema === 'horizon-circuit-prover-v1' && verifier.schema === 'horizon-circuit-verifier-v1', 'Rust schema');
  assert(prover.status === 'complete' && verifier.status === 'complete'
    && prover.profile === 'horizon-range-v1' && verifier.profile === 'horizon-range-v1', 'Rust completion/profile');
  assert(prover.authorization_effects === 0 && verifier.authorization_effects === 0
    && verifier.expected_accept_used_for_decision === false, 'Unexpected authorization or trusted expected verdict');
  assert(/^[0-9a-f]{64}$/.test(prover.vectors_sha256) && /^[0-9a-f]{64}$/.test(prover.requests_sha256)
    && prover.requests_sha256 === verifier.requests_sha256 && prover.requests_bytes === verifier.requests_bytes
    && Number.isSafeInteger(prover.requests_bytes) && prover.requests_bytes > 0 && prover.requests_bytes <= 512 * 1024 * 1024, 'Rust corpus identity');
  const oracle = index(octave.cases, r => r.id); const rust = index(prover.cases, r => r.id);
  const verified = index(verifier.cases, r => `${r.id}/${r.test}`);
  let matlabIndex;
  if (matlab) {
    assert(matlab.schema === 'horizon-circuit-oracle-v1' && matlab.runtime === 'MATLAB'
      && matlab.executed_in_matlab === true && matlab.status === 'pass', 'MATLAB provenance/status');
    matlabIndex = index(matlab.cases, r => r.id);
    assert(matlab.case_count === vectors.length && matlabIndex.size === vectors.length, 'MATLAB count');
  }
  assert(oracle.size === vectors.length && rust.size === vectors.length && octave.case_count === vectors.length, 'Case count');
  const families = {}; const cases = []; let expectedRequests = 0; let validCount = 0;
  for (const vector of vectors) {
    const expected = relation(vector.amount, vector.cap); const r = rust.get(vector.id); const o = oracle.get(vector.id);
    const a = parseU64(vector.amount); const c = parseU64(vector.cap);
    const x = a === 0n ? '' : String(a - 1n); const d = c < a ? '' : String(c - a);
    for (const [label, row] of [['Octave', o], ...(matlabIndex ? [['MATLAB', matlabIndex.get(vector.id)]] : [])]) {
      assert(row && row.amount === vector.amount && row.cap === vector.cap, `${label} input mismatch: ${vector.id}`);
      assert(row.accept === expected && row.x_decimal === x && row.d_decimal === d, `${label} arithmetic mismatch: ${vector.id}`);
    }
    assert(r && r.amount === vector.amount && r.cap === vector.cap && r.category === vector.category, `Rust input mismatch: ${vector.id}`);
    assert(r.native_accept === expected && r.native_a_accept === expected && r.native_b_accept === expected, `Native mismatch: ${vector.id}`);
    const nativeError = expected ? undefined : a < 1n || a > (1n << 32n) ? 'AMOUNT_RANGE'
      : c < a ? 'CAP_BELOW_AMOUNT' : 'DIFFERENCE_RANGE';
    assert((r.native_a_error ?? undefined) === nativeError && (r.native_b_error ?? undefined) === nativeError,
      `Native rejection stage: ${vector.id}`);
    const required = expected ? VALID_TESTS : INVALID_TESTS;
    assert(r.request_count === Object.keys(required).length, `Prover request count: ${vector.id}`);
    for (const [test, error] of Object.entries(required)) {
      const observed = verified.get(`${vector.id}/${test}`); expectedRequests++;
      assert(observed && observed.accepted === (error === null), `Verification mismatch: ${vector.id}/${test}`);
      assert(Number.isSafeInteger(observed.duration_ns) && observed.duration_ns >= 0, 'Unsafe duration');
      assert(error === null ? observed.error === undefined || observed.error === null : observed.error === error,
        `Wrong rejection stage: ${vector.id}/${test}: ${observed.error}`);
      const family = families[test] ??= { checked: 0, accepted: 0, rejected: 0, expected_error: error };
      family.checked++; if (observed.accepted) family.accepted++; else family.rejected++;
    }
    if (expected) validCount++;
    cases.push({ ...vector, expected_accept: expected, bigint: expected, octave: o.accept,
      rust_native: r.native_accept, cryptographic_checks: Object.keys(required).length,
      ...(matlabIndex ? { matlab: matlabIndex.get(vector.id).accept } : {}) });
  }
  assert(verified.size === expectedRequests && prover.case_count === vectors.length
    && prover.request_count === expectedRequests && verifier.request_count === expectedRequests, 'Unexpected or missing cryptographic rows');
  assert(verifier.accepted_count === validCount * 2 && verifier.rejected_count === expectedRequests - validCount * 2, 'Rust outcome counters');
  return { schema: 'horizon-circuit-correlation-v1', status: 'pass', case_count: vectors.length,
    valid_cases: validCount, invalid_cases: vectors.length - validCount, valid_proofs_generated: validCount * 2,
    invalid_upstream_candidates: (vectors.length - validCount) * 2,
    cryptographic_checks: expectedRequests, observed_mismatches: 0, observed_false_acceptances: 0,
    matlab_executed: Boolean(matlab), families, cases,
    limitations: ['Finite synthetic campaign, not a proof of universal cryptographic soundness.',
      'Verifier is a separate process using the same pinned Rust library, not an independent implementation.',
      'Public synthetic values reveal this campaign input, never private keys or commitment openings.',
      'No external action, no network authorization, no CPU/GPU comparison, no post-quantum security.'] };
}

export async function loadCorrelation(directory, matlabPath) {
  const names = { vectors: 'vectors.json', octave: 'octave.json', prover: 'prover-results.json', verifier: 'verifier-results.json' };
  const data = {}; const hashes = {};
  for (const [key, name] of Object.entries(names)) {
    assert(statSync(join(directory, name)).size <= 64 * 1024 * 1024, 'Input JSON budget');
    const bytes = readFileSync(join(directory, name)); data[key] = JSON.parse(bytes); hashes[name] = createHash('sha256').update(bytes).digest('hex');
  }
  if (matlabPath) { assert(statSync(matlabPath).size <= 64 * 1024 * 1024, 'MATLAB JSON budget');
    const bytes = readFileSync(matlabPath); data.matlab = JSON.parse(bytes); hashes['matlab.json'] = createHash('sha256').update(bytes).digest('hex'); }
  assert(hashes['vectors.json'] === data.prover.vectors_sha256, 'Vector bytes differ from prover input');
  const corpusPath = join(directory, 'verification-requests.ndjson.gz');
  assert(statSync(corpusPath).size <= 64 * 1024 * 1024, 'Compressed corpus budget');
  const source = createReadStream(corpusPath); const unzip = createGunzip();
  source.on('error', error => unzip.destroy(error)); source.pipe(unzip);
  let bytes = 0; let lines = 0; let lastByte; const hash = createHash('sha256');
  try { for await (const chunk of unzip) { bytes += chunk.length; assert(bytes <= 512 * 1024 * 1024, 'Expanded corpus budget');
    hash.update(chunk); for (const byte of chunk) if (byte === 10) lines++; lastByte = chunk.at(-1); } }
  finally { source.destroy(); unzip.destroy(); }
  const digest = hash.digest('hex');
  assert(digest === data.prover.requests_sha256 && digest === data.verifier.requests_sha256
    && bytes === data.prover.requests_bytes && bytes === data.verifier.requests_bytes, 'Archived corpus differs from generated/verified bytes');
  assert(lines === data.verifier.request_count && lastByte === 10, 'Archived corpus line count');
  hashes['verification-requests.ndjson (uncompressed)'] = digest;
  return { ...correlate(data), input_sha256: hashes };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [directory, ...args] = process.argv.slice(2); let matlabPath; let output;
    if (!directory) throw new Error('Usage: circuit-correlate.mjs <public-dir> [--matlab <json>] --output <new-json>');
    while (args.length) { const flag = args.shift(); const value = args.shift();
      if (!value) throw new Error('Missing argument');
      if (flag === '--matlab' && !matlabPath) matlabPath = value;
      else if (flag === '--output' && !output) output = value; else throw new Error('Unknown/duplicate argument'); }
    if (!output) throw new Error('Output required');
    const result = await loadCorrelation(directory, matlabPath);
    writeFileSync(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ status: result.status, cases: result.case_count, checks: result.cryptographic_checks,
      matlab_executed: result.matlab_executed }));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
