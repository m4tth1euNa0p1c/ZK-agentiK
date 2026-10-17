import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const container = 'zk-agentik-risc0-lab';
const image = 'rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922';
const scenario = process.argv[2] ?? 'critical';
const samples = process.argv[3] ?? '3';
if (!['base', 'critical', 'denied', 'verify'].includes(scenario) || !/^(?:[1-9]|1[0-9]|20)$/.test(samples))
  throw new Error('Usage: npm run lab:risc0 -- [base|critical|denied|verify] [1..20]');

function docker(args, capture = false) {
  const result = spawnSync('docker', args, { cwd: root, encoding: 'utf8', shell: false,
    stdio: capture ? 'pipe' : 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`docker ${args[0]} failed: ${result.stderr ?? result.error ?? result.status}`);
  return result.stdout;
}

const inventory = JSON.parse(docker(['container', 'ls', '-a', '--filter', `name=^/${container}$`, '--format', '{{json .}}'], true).trim() || 'null');
if (!inventory) {
  docker(['run', '-d', '--name', container, '--label', 'org.zk-agentik.role=risc0-lab', '--cpus', '8',
    '--memory', '12g', '--pids-limit', '512', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--mount', `type=bind,source=${root.replace(/[\\/]$/, '')},target=/workspace,readonly`,
    '-e', 'RUSTUP_TOOLCHAIN=1.98.0', '-e', 'CARGO_TARGET_DIR=/lab/target', image, 'sleep', 'infinity']);
}
const config = JSON.parse(docker(['inspect', container], true))[0];
const mount = config.Mounts.find(m => m.Destination === '/workspace');
const normalized = path => {
  const value = path.replace(/\\/g, '/').replace(/\/$/, '');
  return process.platform === 'win32' ? value.toLowerCase() : value;
};
if (config.Config.Image !== image || !mount || mount.RW || mount.Type !== 'bind'
    || normalized(mount.Source) !== normalized(root) || config.Mounts.length !== 1
    || !config.HostConfig.CapDrop?.includes('ALL')
    || !config.HostConfig.SecurityOpt?.includes('no-new-privileges') || config.HostConfig.Privileged
    || config.HostConfig.Memory !== 12 * 1024 ** 3 || config.HostConfig.NanoCpus !== 8e9
    || config.Config.Cmd.join(' ') !== 'sleep infinity') throw new Error('Unexpected lab container configuration');
if (!config.State.Running) docker(['start', container]);
if (!config.NetworkSettings.Networks.bridge) docker(['network', 'connect', 'bridge', container]);
// Installation/build may download pinned dependencies; the proof run itself is isolated.
docker(['exec', container, 'bash', '/workspace/labs/risc0/setup.sh']);
docker(['network', 'disconnect', 'bridge', container]);
if (Object.keys(JSON.parse(docker(['inspect', container], true))[0].NetworkSettings.Networks).length)
  throw new Error('Proof run requires no Docker network attachment');
if (scenario === 'verify') {
  const publicDirectory = resolve(root, '.tools/risc0-fixture-verifier');
  mkdirSync(publicDirectory, { recursive: true });
  docker(['cp', `${container}:/lab/target/release/lab-verifier`, resolve(publicDirectory, 'lab-verifier')]);
  for (const fixture of ['critical', 'denied']) {
    for (const kind of ['proof', 'expected']) copyFileSync(
      resolve(root, 'tests/fixtures/risc0', `${fixture}-${kind}.json`),
      resolve(publicDirectory, `${fixture}-${kind}.json`));
    const args = ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--memory', '512m', '--pids-limit', '64',
      '--mount', `type=bind,source=${publicDirectory},target=/public,readonly`, image,
      '/public/lab-verifier', `/public/${fixture}-proof.json`, `/public/${fixture}-expected.json`];
    if (fixture === 'critical') docker(args);
    else {
      const result = spawnSync('docker', args, { encoding: 'utf8', shell: false, windowsHide: true });
      if (result.status === 0 || !result.stderr?.includes('POLICY_DENIED'))
        throw new Error('Expected a cryptographically valid denial, not an infrastructure error');
      console.log('VERIFIED DENIAL: valid receipt, POLICY_DENIED, no dispatch');
    }
  }
  process.exit(0);
}
const output = resolve(root, 'tests/benchmarks/results/risc0');
mkdirSync(output, { recursive: true });
const started = new Date().toISOString();
docker(['exec', '-e', 'RISC0_DEV_MODE=0', container, '/lab/target/release/lab-execution-checks']);
const devCheck = spawnSync('docker', ['exec', '-e', 'RISC0_DEV_MODE=1', container,
  '/lab/target/release/lab-verifier', '/unused-proof', '/unused-challenge'],
  { cwd: root, encoding: 'utf8', shell: false, windowsHide: true });
if (devCheck.status === 0 || !devCheck.stderr?.includes('DEV_MODE_FORBIDDEN'))
  throw new Error('Development mode rejection failed or infrastructure unavailable');
docker(['exec', '-e', 'RISC0_DEV_MODE=0', '-e', 'RAYON_NUM_THREADS=8', container,
  '/lab/target/release/lab-host', scenario, '/lab/results', samples]);
for (const kind of ['proof', 'expected', 'report', 'envelope'])
  docker(['cp', `${container}:/lab/results/${scenario}-${kind}.json`, resolve(output, `${scenario}-${kind}.json`)]);
if (scenario !== 'denied') {
  const publicDirectory = resolve(root, '.tools/risc0-public-verifier');
  mkdirSync(publicDirectory, { recursive: true });
  docker(['cp', `${container}:/lab/target/release/lab-verifier`, resolve(publicDirectory, 'lab-verifier')]);
  for (const kind of ['proof', 'expected'])
    docker(['cp', `${container}:/lab/results/${scenario}-${kind}.json`, resolve(publicDirectory, `${scenario}-${kind}.json`)]);
  // A different process/container gets ONLY the verifier and public artifacts.
  docker(['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges',
    '--memory', '512m', '--pids-limit', '64', '--mount', `type=bind,source=${publicDirectory},target=/public,readonly`,
    image, '/public/lab-verifier', `/public/${scenario}-proof.json`, `/public/${scenario}-expected.json`]);
}
writeFileSync(resolve(output, `${scenario}-environment.json`), JSON.stringify({ started, finished: new Date().toISOString(),
  docker_image: image, cpus: 8, memory_bytes: 12 * 1024 ** 3, network_during_proof: 'none',
  rust_host: '1.98.0', rust_guest: '1.97.0', risc0: '3.0.6', sample_count: Number(samples) }, null, 2) + '\n');
console.log(`Artifacts: ${output}\nLab container retained for reuse, network disconnected.`);
