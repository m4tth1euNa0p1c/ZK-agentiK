/** Bounded synthetic campaign; fixed commands, no cloud or business side effects. */
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, createReadStream, createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch, totalmem } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGzip } from 'node:zlib';
import { CAMPAIGN_SIZES, generateVectors } from './circuit-vectors.mjs';
import { loadCorrelation } from './circuit-correlate.mjs';
import { writeReport } from './circuit-report.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const image = 'horizon-circuit-math:local';
const sourceFiles = [
  'scripts/circuit-campaign.mjs', 'scripts/circuit-vectors.mjs', 'scripts/circuit-correlate.mjs', 'scripts/circuit-report.mjs',
  'scripts/circuit-reverify.mjs',
  'math/circuit/circuit_oracle.m', 'math/circuit/run_oracle.m', 'math/circuit/Dockerfile', 'math/circuit/plot_campaign.py',
  'labs/horizon/proof/src/bin/circuit_campaign.rs', 'labs/horizon/proof/src/lib.rs', 'labs/horizon/Cargo.lock',
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashFile = async path => { const h = createHash('sha256'); for await (const chunk of createReadStream(path)) h.update(chunk); return h.digest('hex'); };
const capture = (exe, args) => spawnSync(exe, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });

export function parseOptions(args) {
  let count = 128; let output; let build = false; const seen = new Set();
  while (args.length) {
    const flag = args.shift(); if (seen.has(flag)) throw new Error('Duplicate argument'); seen.add(flag);
    if (flag === '--build') build = true;
    else if (flag === '--cases') { const value = args.shift(); if (!['128', '1024', '4096'].includes(value)) throw new Error('Reviewed sizes: 128, 1024, 4096'); count = Number(value); }
    else if (flag === '--output') { output = args.shift(); if (!output || output.startsWith('--')) throw new Error('Output required'); }
    else throw new Error('Usage: circuit-campaign.mjs [--cases 128|1024|4096] --output <new-directory> [--build]');
  }
  if (!output || !CAMPAIGN_SIZES.includes(count)) throw new Error('Output and reviewed size required');
  return { count, output: resolve(root, output), build };
}

async function publicScan(path) {
  let tail = '';
  for await (const chunk of createReadStream(path, { encoding: 'utf8' })) {
    const text = tail + chunk;
    if (/"(?:holder_secret_hex|amount_blinding_hex|cap_blinding_hex|witness|private_key)"\s*:/.test(text)
      || /"method"\s*:\s*"disclosure"/.test(text)) throw new Error('Private material or disclosure payload in public export');
    tail = text.slice(-128);
  }
}

export async function runCampaign(options) {
  // Never remove/reuse an old directory; failed observations are retained too.
  if (existsSync(options.output)) throw new Error('Output exists. Choose a new directory.');
  mkdirSync(options.output, { recursive: true });
  const publicDir = join(options.output, 'public'); const logs = join(options.output, 'logs');
  mkdirSync(publicDir); mkdirSync(logs);
  const started = new Date().toISOString(); const container = `horizon-circuit-${randomUUID()}`;
  const commit = capture('git', ['rev-parse', 'HEAD']);
  const dirty = capture('git', ['status', '--porcelain', '--untracked-files=no']);
  const report = { schema: 'horizon-circuit-run-v1', started_at_utc: started, date_is_self_reported: true,
    trusted_timestamp: false, status: 'running', case_count: options.count, source_commit: commit.status === 0 ? commit.stdout.trim() : null,
    tracked_checkout_dirty: dirty.status === 0 ? dirty.stdout.trim().length > 0 : null,
    source_sha256: Object.fromEntries(sourceFiles.map(name => [name, existsSync(join(root, name)) ? hash(readFileSync(join(root, name))) : null])),
    environment: { node: process.version, os: platform(), architecture: arch(), cpu: cpus()[0]?.model ?? 'unknown', logical_cpus: cpus().length,
      host_memory_bytes: totalmem(), crypto: 'CPU; no GPU', numerical_container: { cpus: 2, memory: '2g', network: 'none' } },
    steps: [], matlab_executed: false, cryptographic_rng: 'OsRng; values only are deterministically generated',
    synthetic_inputs_public: true, external_effects_attempted: 0, performance_benchmark: false };
  const run = (id, exe, args, timeout = 120000) => {
    const start = Date.now(); const fd = openSync(join(logs, `${id}.log`), 'wx'); let child;
    console.log(`${id}: started`);
    try { child = spawnSync(exe, args, { cwd: root, windowsHide: true, timeout, stdio: ['ignore', fd, fd] }); }
    finally { closeSync(fd); }
    const status = !child.error && child.status === 0 ? 'pass' : 'fail';
    report.steps.push({ id, executable: exe === process.execPath ? 'node' : exe.replaceAll(root, '<REPO>'),
      args: args.map(arg => arg.replaceAll(options.output, '<RUN>').replaceAll(root, '<REPO>')),
      status, exit_code: child.status, signal: child.signal, elapsed_ms: Date.now() - start, timed_out: child.error?.code === 'ETIMEDOUT' });
    console.log(`${id}: ${status}`);
    if (status !== 'pass') throw new Error(`Stage ${id} failed; private local diagnostic log retained.`);
  };
  const docker = (id, args, timeout = 120000) => {
    try { run(id, 'docker', ['run', '--rm', '--name', container, '--network', 'none', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--cpus', '2', '--memory', '2g', '--pids-limit', '128',
      '--tmpfs', '/tmp:rw,nosuid,nodev,size=256m', ...args], timeout); }
    finally { capture('docker', ['rm', '-f', container]); }
  };
  try {
    if (options.build) {
      run('rust-build', process.execPath, ['scripts/cargo.mjs', 'build', '--release', '--locked', '--manifest-path', 'labs/horizon/Cargo.toml', '--bin', 'circuit_campaign'], 600000);
      if (capture('docker', ['image', 'inspect', image]).status !== 0)
        run('image-build', 'docker', ['build', '--progress', 'plain', '-t', image, '-f', 'math/circuit/Dockerfile', 'math/circuit'], 900000);
    }
    const binary = join(root, 'labs', 'horizon', 'target', 'release', `circuit_campaign${process.platform === 'win32' ? '.exe' : ''}`);
    if (!existsSync(binary)) throw new Error('Rust executable missing; use --build');
    report.executable_sha256 = await hashFile(binary);
    const rust = capture(process.execPath, ['scripts/cargo.mjs', '--version']);
    if (rust.status !== 0) throw new Error('Cannot record Rust version'); report.environment.cargo = rust.stdout.trim();
    const inspected = capture('docker', ['image', 'inspect', image, '--format', '{{.Id}}']);
    if (inspected.status !== 0 || !/^sha256:[0-9a-f]{64}$/.test(inspected.stdout.trim())) throw new Error('Numerical image missing; use --build');
    report.environment.numerical_container.image_id = inspected.stdout.trim();
    const packages = capture('docker', ['run', '--rm', '--network', 'none', image, 'dpkg-query', '-W', 'octave', 'python3', 'python3-matplotlib']);
    if (packages.status !== 0) throw new Error('Cannot record numerical versions'); report.environment.numerical_container.packages = packages.stdout.trim();
    const vectors = generateVectors(options.count);
    writeFileSync(join(publicDir, 'vectors.json'), JSON.stringify(vectors, null, 2) + '\n', { flag: 'wx' });
    const generatedDir = join(options.output, 'generated');
    run('generate-cryptographic-corpus', binary, ['generate', '--vectors', join(publicDir, 'vectors.json'), '--output', generatedDir], 1200000);
    const requests = join(generatedDir, 'verification-requests.ndjson');
    if (statSync(requests).size > 512 * 1024 * 1024) throw new Error('Public corpus budget exceeded');
    await publicScan(requests); await publicScan(join(generatedDir, 'prover-results.json'));
    writeFileSync(join(publicDir, 'prover-results.json'), readFileSync(join(generatedDir, 'prover-results.json')), { flag: 'wx' });
    // Separate process receives only presentations, public expectations and trust configuration.
    run('independent-process-verification', binary, ['verify', '--requests', requests, '--output', join(publicDir, 'verifier-results.json')], 1200000);
    report.requests_sha256 = await hashFile(requests);
    await pipeline(createReadStream(requests), createGzip({ level: 9 }), createWriteStream(join(publicDir, 'verification-requests.ndjson.gz'), { flags: 'wx' }));
    docker('octave-self-tests', ['--mount', `type=bind,source=${join(root, 'math', 'circuit')},target=/math/circuit,readonly`,
      '--mount', `type=bind,source=${publicDir},target=/output`, image, 'octave', '--no-gui', '--no-history', '--quiet', '--eval',
      "addpath('/math/circuit'); r=run_oracle(); f=fopen('/output/octave-selftests.json','w'); assert(f>=0); assert(fprintf(f,'%s\\n',jsonencode(r))>0); fclose(f);"]);
    docker('octave-oracle', ['--mount', `type=bind,source=${join(root, 'math', 'circuit')},target=/math/circuit,readonly`,
      '--mount', `type=bind,source=${publicDir},target=/output`, image, 'octave', '--no-gui', '--no-history', '--quiet', '--eval',
      "addpath('/math/circuit'); circuit_oracle('/output/vectors.json','/output/octave.json');"]);
    const result = await loadCorrelation(publicDir);
    writeFileSync(join(publicDir, 'correlation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    report.correlation = { status: result.status, cases: result.case_count, cryptographic_checks: result.cryptographic_checks,
      valid_proofs_generated: result.valid_proofs_generated, invalid_upstream_candidates: result.invalid_upstream_candidates,
      mismatches: result.observed_mismatches, false_acceptances: result.observed_false_acceptances };
    writeReport(publicDir, result);
    docker('scientific-figures', ['--mount', `type=bind,source=${join(root, 'math', 'circuit')},target=/src,readonly`,
      '--mount', `type=bind,source=${publicDir},target=/output`, image, 'python3', '/src/plot_campaign.py', '/output']);
    report.status = 'pass';
  } catch (error) {
    report.status = 'fail'; report.error = error.message; process.exitCode = 1;
  } finally {
    report.finished_at_utc = new Date().toISOString();
    report.limitations = ['Finite experiment; no universal mathematical or cryptographic security proof.',
      'Separate verifier process uses the same Rust implementation; not an external audit.',
      'Host clock and hashes provide no trusted timestamp.', 'MATLAB is a separate explicit CI job.',
      'No business action executed; application authorization is tested separately.',
      'New observations do not replace historical benchmarks or establish a Vega/PQ/GPU result.'];
    const files = [];
    async function walk(directory) {
      for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        const path = join(directory, entry.name);
        if (entry.isSymbolicLink()) throw new Error('Unexpected symlink in public output');
        if (entry.isDirectory()) await walk(path);
        else if (entry.isFile()) files.push({ path: relative(publicDir, path).replaceAll('\\', '/'), bytes: statSync(path).size, sha256: await hashFile(path) });
      }
    }
    await walk(publicDir); report.files = files;
    writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ status: report.status, report: relative(root, join(publicDir, 'report.html')).replaceAll('\\', '/'),
      manifest: relative(root, join(publicDir, 'manifest.json')).replaceAll('\\', '/'), correlation: report.correlation, error: report.error }));
  }
  return report;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runCampaign(parseOptions(process.argv.slice(2))); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
