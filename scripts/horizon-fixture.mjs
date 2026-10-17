import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ProofWorker } from '../packages/horizon-demo/dist/worker.js';

const file = 'tests/fixtures/horizon/public-presentation.json';
const worker = new ProofWorker();
try {
  if (process.argv[2] === 'generate') {
    const now_ms = 1800000000000; // Historical verification input, never a live authorization.
    const f = await worker.request({ op: 'init', now_ms });
    const prepared = await worker.request({ op: 'prepare', evidence: f.evidence, witness: f.witness });
    const expected = { ...f.challenge, method: 'reusable' };
    const presentation = await worker.request({ op: 'present', evidence: f.evidence, prepared,
      holder_secret_hex: f.holder_secret_hex, challenge: expected });
    const publicOnly = { op: 'verify', presentation, expected, trust: f.trust, policy: f.policy, now_ms };
    const bytes = JSON.stringify(publicOnly, null, 2) + '\n';
    mkdirSync('tests/fixtures/horizon', { recursive: true });
    writeFileSync(file, bytes, { flag: 'wx' });
    writeFileSync('tests/fixtures/horizon/manifest.json', JSON.stringify({ source_commit: '80b2202',
      role: 'Public synthetic pre-optimization interoperability vector; not a current authorization',
      file, sha256: createHash('sha256').update(bytes).digest('hex'), contains_private_keys: false,
      contains_witness: false }, null, 2) + '\n', { flag: 'wx' });
  }
  const manifest = JSON.parse(readFileSync('tests/fixtures/horizon/manifest.json', 'utf8'));
  const bytes = readFileSync(file);
  if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw new Error('Fixture integrity error');
  const verified = await worker.request(JSON.parse(bytes));
  console.log(JSON.stringify({ public_fixture_verified: true, method: verified.method, live_authorization: false }));
} finally { worker.close(); }
