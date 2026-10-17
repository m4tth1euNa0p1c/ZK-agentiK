/** Fixed local runner. No commands, mounts or image names are read from evidence. */
import { spawnSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const root = resolve(source, '..');
const image = 'horizon-math-paper:local';
if (process.argv.slice(2).some(arg => arg !== '--build')) {
  throw new Error('Usage: node math/run.mjs [--build]');
}
const started = new Date().toISOString();
const runDir = join(source, 'results', `octave-${started.replaceAll(':', '-')}-${randomUUID()}`);
mkdirSync(runDir, { recursive: true });
const report = { schema: 'horizon-math-run-v1', started_at_utc: started,
  date_is_self_reported: true, third_party_timestamp_or_signature: false,
  runtime: 'GNU Octave', matlab_executed: false, status: 'running', commands: [],
  source_mount_readonly: true, network: 'none', cpus: 2, memory: '2g',
  external_inputs: 'None; constants, domain and finite model are embedded in horizon_checks.m.',
  sha256: {} };
const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const local = path => relative(root, path).replaceAll('\\', '/');
const capture = args => spawnSync('docker', args, { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 30000 });
const logged = (args, name, timeout) => {
  report.commands.push(['docker', ...args.map(arg => arg.replaceAll(runDir, '<OUTPUT>').replaceAll(source, '<MATH>'))]);
  const path = join(runDir, name); const fd = openSync(path, 'wx');
  let child;
  try { child = spawnSync('docker', args, { stdio: ['ignore', fd, fd], timeout }); }
  finally { closeSync(fd); }
  report.sha256[local(path)] = sha(path);
  if (child.error || child.status !== 0) throw new Error(`${name}: ${child.error?.message ?? `exit ${child.status}`}`);
};
try {
  for (const name of ['Dockerfile', 'horizon_checks.m', 'run_checks.m', 'run.mjs']) {
    const path = join(source, name); report.sha256[local(path)] = sha(path);
  }
  let inspected = capture(['image', 'inspect', image, '--format', '{{.Id}}']);
  if (inspected.status !== 0) {
    if (!process.argv.includes('--build')) throw new Error('Image unavailable. Explicit local build: node math/run.mjs --build');
    logged(['build', '--progress', 'plain', '-t', image, '-f', join(source, 'Dockerfile'), source], 'build.log', 900000);
    inspected = capture(['image', 'inspect', image, '--format', '{{.Id}}']);
  }
  if (inspected.status !== 0 || !/^sha256:[0-9a-f]{64}$/.test(inspected.stdout.trim())) throw new Error('Cannot identify Docker image');
  report.image_id = inspected.stdout.trim();
  logged(['run', '--rm', '--network', 'none', '--cpus', '2', '--memory', '2g',
    '--mount', `type=bind,source=${source},target=/src,readonly`,
    '--mount', `type=bind,source=${runDir},target=/out`,
    '-e', 'HORIZON_MATH_OUTPUT_DIR=/out', image,
    'octave', '--no-gui', '--no-history', '--quiet', '/src/run_checks.m'], 'octave.log', 120000);
  const index = JSON.parse(readFileSync(join(runDir, 'latest.json'), 'utf8'));
  if (typeof index.result !== 'string' || !/^\d{8}T\d{6}Z(?:-\d+)?\.json$/.test(index.result)) throw new Error('Unexpected result name');
  const resultPath = join(runDir, index.result);
  const result = JSON.parse(readFileSync(resultPath, 'utf8'));
  if (result.status !== 'pass' || result.runtime !== 'GNU Octave' || result.executed_in_matlab !== false
      || result.reduced_domain.pairs !== 24510 || result.replay_model.reachable_states !== 20
      || result.replay_model.transitions !== 160) throw new Error('Unexpected numerical result');
  report.result = local(resultPath);
  report.runtime_version = result.runtime_version;
  report.sha256[local(resultPath)] = sha(resultPath);
  const packages = capture(['run', '--rm', '--network', 'none', image, 'dpkg-query', '-W',
    'octave', 'texlive-latex-base', 'texlive-latex-recommended', 'texlive-fonts-recommended',
    'texlive-binaries', 'poppler-utils', 'lmodern', 'python3']);
  if (packages.status !== 0) throw new Error('Cannot record package versions');
  report.container_packages = packages.stdout.trim();
  report.status = 'pass';
} catch (error) {
  report.status = 'fail'; report.error = error instanceof Error ? error.message : String(error);
  process.exitCode = 1;
} finally {
  report.finished_at_utc = new Date().toISOString();
  report.limitations = ['Numerical evidence and finite abstract model, not a cryptographic or machine-checked proof.',
    'No MATLAB execution, security audit, third-party timestamp or signature.',
    'Base digest pinned; apt versions are recorded, not snapshot-pinned.'];
  report.path_placeholders = { '<MATH>': 'Repository math directory', '<OUTPUT>': 'This new run directory' };
  const path = join(runDir, 'run.json');
  writeFileSync(path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: report.status, report: local(path), result: report.result, error: report.error }));
}
