import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const commit = 'c0ee259053cd12eaf43ed71b5cde375452b3ee4d';
const image = 'rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922';
const name = 'zk-agentik-horizon-reference';
const destination = resolve(process.argv[2] ?? `.tools/horizon/reference-${Date.now()}`);
if (existsSync(destination)) throw new Error('Use a new output directory to preserve runs');
mkdirSync(destination, { recursive: true });
function run(command, args, capture = false) {
  const result = spawnSync(command, args, { stdio: capture ? 'pipe' : 'inherit', encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed: ${capture ? result.stderr : ''}`);
  return result.stdout;
}
const source = join(destination, 'source');
run('git', ['clone', 'https://github.com/microsoft/vega-prover.git', source]);
run('git', ['-C', source, 'checkout', '--detach', commit]);
cpSync('labs/horizon/reference/vega-Cargo.lock', join(source, 'Cargo.lock'));
run('docker', ['run', '-d', '--name', name, '--cpus', '8', '--memory', '12g', '--pids-limit', '512',
  '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', image, 'sleep', 'infinity']);
try {
  run('docker', ['cp', source, `${name}:/vega`]);
  const base = ['exec', '-e', 'RUSTFLAGS=-C target-cpu=native', '-e', 'BENCH_THREADS=8', '-e', 'RAYON_NUM_THREADS=8', name, 'bash', '-c'];
  run('docker', [...base, 'cd /vega && cargo bench --locked --no-run --bench sha256_vega_mc_zkp --bench sha256_vega_sc']);
  run('docker', ['network', 'disconnect', 'bridge', name]);
  for (const bench of ['sha256_vega_mc_zkp', 'sha256_vega_sc']) {
    run('docker', [...base, `set -o pipefail; cd /vega && cargo bench --offline --locked --bench ${bench} 2>&1 | tee /${bench}.txt`]);
    run('docker', ['cp', `${name}:/${bench}.txt`, join(destination, `${bench}.txt`)]);
  }
  run('docker', ['cp', `${name}:/vega/target/criterion`, join(destination, 'criterion')]);
  const groups = [];
  function visit(path) {
    if (existsSync(join(path, 'new', 'sample.json'))) {
      groups.push(Object.fromEntries(['benchmark', 'sample', 'estimates'].map(file => [file, JSON.parse(readFileSync(join(path, 'new', `${file}.json`), 'utf8'))])));
    }
    for (const entry of readdirSync(path, { withFileTypes: true })) if (entry.isDirectory()) visit(join(path, entry.name));
  }
  visit(join(destination, 'criterion'));
  writeFileSync(join(destination, 'criterion.json'), JSON.stringify({ source_commit: commit, image, cpus: 8, memory_limit_gib: 12,
    flags: '-C target-cpu=native', relation: 'upstream SHA256 only; not full mDL', groups }, null, 2));
} finally { run('docker', ['stop', '--time', '5', name]); }
console.log(`Results: ${destination}. Stopped container ${name} retained; remove it explicitly before another run.`);
