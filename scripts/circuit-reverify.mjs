/** Re-run the real verifier over an archived public corpus. Fixed executable, no catalogue commands. */
import { spawnSync } from 'node:child_process';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCorrelation } from './circuit-correlate.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const [sourceArg, outputArg, ...extra] = process.argv.slice(2);
  if (!sourceArg || !outputArg || extra.length) throw new Error('Usage: node scripts/circuit-reverify.mjs <public-bundle> <new-output>');
  const source = resolve(sourceArg); const output = resolve(outputArg);
  if (existsSync(output)) throw new Error('Output exists; use a new directory');
  // Validate all archived identities before executing the trusted verifier.
  await loadCorrelation(source);
  mkdirSync(output, { recursive: true });
  const requests = join(output, 'verification-requests.ndjson'); let bytes = 0;
  const bound = new Transform({ transform(chunk, _encoding, callback) {
    bytes += chunk.length; callback(bytes > 512 * 1024 * 1024 ? new Error('Corpus budget') : null, chunk);
  } });
  await pipeline(createReadStream(join(source, 'verification-requests.ndjson.gz')), createGunzip(), bound,
    createWriteStream(requests, { flags: 'wx' }));
  const binary = join(root, 'labs/horizon/target/release', `circuit_campaign${process.platform === 'win32' ? '.exe' : ''}`);
  if (!existsSync(binary)) throw new Error('Build the pinned binary first: npm run horizon:build');
  const child = spawnSync(binary, ['verify', '--requests', requests, '--output', join(output, 'verifier-results.json')],
    { cwd: root, shell: false, windowsHide: true, timeout: 1200000, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (child.error || child.status !== 0) throw new Error('Independent verifier process failed');
  for (const name of ['vectors.json', 'octave.json', 'prover-results.json', 'verification-requests.ndjson.gz'])
    writeFileSync(join(output, name), readFileSync(join(source, name)), { flag: 'wx' });
  const result = await loadCorrelation(output);
  writeFileSync(join(output, 'correlation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: result.status, actual_reverification: true, synthetic_trust_only: true,
    cases: result.case_count, cryptographic_checks: result.cryptographic_checks, false_acceptances: result.observed_false_acceptances }));
} catch (error) { console.error(error.message); process.exitCode = 1; }
