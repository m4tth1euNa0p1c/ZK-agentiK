import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { correlate, loadCorrelation, INVALID_TESTS, VALID_TESTS } from '../../scripts/circuit-correlate.mjs';
import { generateVectors, parseU64, relation, validateVectors } from '../../scripts/circuit-vectors.mjs';
import { parseOptions, runCampaign } from '../../scripts/circuit-campaign.mjs';
import { writeReport } from '../../scripts/circuit-report.mjs';

// Synthetic observations for the join's unit tests. These are NOT cryptographic proofs.
function observations() {
  const vectors = generateVectors(128);
  const octave = { schema: 'horizon-circuit-oracle-v1', runtime: 'GNU Octave', executed_in_matlab: false, status: 'pass',
    case_count: vectors.length, cases: vectors.map(row => ({ id: row.id, amount: row.amount, cap: row.cap,
      accept: relation(row.amount, row.cap), x_decimal: BigInt(row.amount) === 0n ? '' : String(BigInt(row.amount) - 1n),
      d_decimal: BigInt(row.cap) < BigInt(row.amount) ? '' : String(BigInt(row.cap) - BigInt(row.amount)) })) };
  const prover = { schema: 'horizon-circuit-prover-v1', cases: vectors.map(row => {
    const ok = relation(row.amount, row.cap);
    const error = ok ? undefined : BigInt(row.amount) < 1n || BigInt(row.amount) > (1n << 32n) ? 'AMOUNT_RANGE'
      : BigInt(row.cap) < BigInt(row.amount) ? 'CAP_BELOW_AMOUNT' : 'DIFFERENCE_RANGE';
    return { ...row, native_accept: ok, native_a_accept: ok, native_b_accept: ok,
      ...(error ? { native_a_error: error, native_b_error: error } : {}),
      request_count: Object.keys(ok ? VALID_TESTS : INVALID_TESTS).length };
  }) };
  const verifier = { schema: 'horizon-circuit-verifier-v1', cases: vectors.flatMap(row =>
    Object.entries(relation(row.amount, row.cap) ? VALID_TESTS : INVALID_TESTS).map(([name, error]) => ({
      id: row.id, test: name, accepted: error === null, ...(error ? { error } : {}), duration_ns: 1,
    }))) };
  const corpusMetadata = { status: 'complete', profile: 'horizon-range-v1', requests_sha256: 'a'.repeat(64),
    requests_bytes: 100, authorization_effects: 0, request_count: verifier.cases.length };
  Object.assign(prover, corpusMetadata, { case_count: vectors.length, vectors_sha256: 'b'.repeat(64) });
  Object.assign(verifier, corpusMetadata, { expected_accept_used_for_decision: false,
    accepted_count: verifier.cases.filter(row => row.accepted).length,
    rejected_count: verifier.cases.filter(row => !row.accepted).length });
  return { vectors, octave, prover, verifier };
}

test('u64 strings are exact beyond JavaScript double precision; no saturation/coercion', () => {
  assert.equal(parseU64('18446744073709551615'), (1n << 64n) - 1n);
  assert.equal(parseU64('9007199254740993'), 9007199254740993n);
  for (const value of ['18446744073709551616', '01', '-0', '1e3', '+1', ' 1', '', 1, null, '1.0'])
    assert.throws(() => parseU64(value));
  assert.equal(relation('4294967296', '8589934591'), true);
  assert.equal(relation('4294967296', '8589934592'), false);
  assert.equal(relation('1', '4294967296'), true);
  assert.equal(relation('1', '4294967297'), false);
  assert.equal(relation('0', '0'), false);
});

test('reviewed campaigns reproduce vectors only, not crypto randomness', () => {
  for (const count of [128, 1024, 4096]) {
    const vectors = generateVectors(count);
    assert.equal(vectors.length, count); assert.deepEqual(vectors, generateVectors(count));
    assert.equal(new Set(vectors.map(row => row.id)).size, count);
    assert(vectors.some(row => relation(row.amount, row.cap)));
    assert(vectors.some(row => !relation(row.amount, row.cap)));
  }
  assert.throws(() => generateVectors(4097));
  const rows = generateVectors(128);
  assert.throws(() => validateVectors([...rows, rows[0]]));
  assert.throws(() => validateVectors([{ ...rows[0], expected_accept: true }]));
});

test('join accounts for every case and attack; MATLAB is explicit separate runtime', () => {
  const data = observations(); const result = correlate(data);
  assert.equal(result.status, 'pass'); assert.equal(result.case_count, 128);
  assert.equal(result.cryptographic_checks, data.verifier.cases.length);
  assert.equal(result.matlab_executed, false);
  const matlab = { ...structuredClone(data.octave), runtime: 'MATLAB', executed_in_matlab: true };
  assert.equal(correlate({ ...data, matlab }).matlab_executed, true);
  assert.throws(() => correlate({ ...data, matlab: data.octave }), /MATLAB provenance/);
});

test('empty, missing, duplicated, invented or stale observations fail closed', () => {
  const changes = [
    d => { d.octave.cases = []; }, d => { d.verifier.cases.pop(); },
    d => { d.verifier.cases.push(d.verifier.cases[0]); }, d => { d.prover.cases.pop(); },
    d => { d.octave.cases[0].amount = '1'; }, d => { d.octave.cases[0].x_decimal = '0'; },
    d => { d.verifier.cases.push({ id: 'extra', test: 'extra', accepted: false, duration_ns: 1 }); },
    d => { d.prover.cases[0].request_count++; }, d => { d.octave.case_count = 0; },
    d => { d.octave.status = 'fail'; }, d => { d.octave.executed_in_matlab = true; },
    d => { d.prover.status = 'fail'; }, d => { d.verifier.status = 'running'; },
    d => { d.verifier.requests_sha256 = 'c'.repeat(64); }, d => { d.verifier.requests_bytes++; },
    d => { d.verifier.accepted_count++; }, d => { d.verifier.authorization_effects = 1; },
    d => { d.verifier.expected_accept_used_for_decision = true; },
  ];
  for (const change of changes) { const data = observations(); change(data); assert.throws(() => correlate(data)); }
});

test('wrong verdict and early signature refusal cannot masquerade as algebraic rejection', () => {
  const data = observations();
  const row = data.verifier.cases.find(r => r.test === 'b_scalar_corruption');
  row.error = 'INVALID_SIGNATURE'; assert.throws(() => correlate(data), /Wrong rejection stage/);
  row.error = 'INVALID_RANGE_PROOF'; row.accepted = true; assert.throws(() => correlate(data), /Verification mismatch/);
  row.accepted = false; row.duration_ns = Number.POSITIVE_INFINITY; assert.throws(() => correlate(data), /Unsafe duration/);
  const native = observations(); native.prover.cases[0].native_accept = true;
  assert.throws(() => correlate(native), /Native mismatch/);
});

test('archive hashes bind vectors and exact decompressed bytes; substitution fails', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'circuit-hash-'));
  try {
    const data = observations(); const vectorBytes = JSON.stringify(data.vectors);
    const corpus = Buffer.from('{"scope":"join unit test only; not a proof"}\n'.repeat(data.verifier.cases.length));
    const sha = bytes => createHash('sha256').update(bytes).digest('hex');
    data.prover.vectors_sha256 = sha(vectorBytes);
    for (const report of [data.prover, data.verifier]) { report.requests_sha256 = sha(corpus); report.requests_bytes = corpus.length; }
    writeFileSync(join(directory, 'vectors.json'), vectorBytes);
    for (const [key, name] of [['prover', 'prover-results'], ['verifier', 'verifier-results'], ['octave', 'octave']])
      writeFileSync(join(directory, `${name}.json`), JSON.stringify(data[key]));
    const compressed = gzipSync(corpus); writeFileSync(join(directory, 'verification-requests.ndjson.gz'), compressed);
    assert.equal((await loadCorrelation(directory)).status, 'pass');
    writeFileSync(join(directory, 'vectors.json'), `${vectorBytes}\n`);
    await assert.rejects(loadCorrelation(directory), /Vector bytes differ/);
    writeFileSync(join(directory, 'vectors.json'), vectorBytes);
    writeFileSync(join(directory, 'verification-requests.ndjson.gz'), gzipSync('different bytes\n'));
    await assert.rejects(loadCorrelation(directory), /Archived corpus differs/);
    writeFileSync(join(directory, 'verification-requests.ndjson.gz'), Buffer.from('invalid gzip'));
    await assert.rejects(loadCorrelation(directory));
  } finally { rmSync(directory, { recursive: true }); }
});

test('budgets and append-only run directories reject accidental reruns before work', async () => {
  for (const args of [[], ['--cases', '5000', '--output', 'x'], ['--output', 'x', '--cases', '128;echo bad'],
    ['--output', 'x', '--build', '--build'], ['--output', 'x', '--command', 'arbitrary']])
    assert.throws(() => parseOptions(args));
  assert.equal(parseOptions(['--cases', '4096', '--output', 'x']).count, 4096);
  const directory = mkdtempSync(join(tmpdir(), 'circuit-existing-'));
  try { await assert.rejects(runCampaign({ count: 128, output: directory, build: false }), /Output exists/); }
  finally { rmSync(directory, { recursive: true }); }
});

test('offline visualization renders observed counts, not success or MATLAB by default', () => {
  const directory = mkdtempSync(join(tmpdir(), 'circuit-report-'));
  try {
    const result = correlate(observations()); writeReport(directory, result);
    const html = readFileSync(join(directory, 'report.html'), 'utf8');
    assert(html.includes('non exécuté ici')); assert(html.includes('Content-Security-Policy'));
    assert(html.includes('report.cases.filter')); assert(!html.includes('cdn.'));
    assert.throws(() => writeReport(directory, result), /EEXIST/);
  } finally { rmSync(directory, { recursive: true }); }
});
