import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';

export const CUDA_IMAGE = 'nvidia/cuda@sha256:4b9ed5fa8361736996499f64ecebf25d4ec37ff56e4d11323ccde10aa36e0c43';
export const CPU_IMAGE = 'rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922';
const root = fileURLToPath(new URL('../', import.meta.url));
const imageTag = 'zk-agentik-risc0-cuda:3.0.6-sm120-lab';
const normalize = p => p.replace(/\\/g, '/').replace(/\/$/, '').toLowerCase();

export function redactPaths(text, repo) {
  const localRoot = repo.replace(/[\\/]$/, '');
  return text.replaceAll(JSON.stringify(localRoot).slice(1, -1), '<repository>')
    .replaceAll(localRoot, '<repository>').replaceAll(localRoot.replace(/\\/g, '/'), '<repository>');
}

export function parseArgs(args, env = process.env) {
  if (env.RISC0_DEV_MODE !== undefined && env.RISC0_DEV_MODE !== '0') throw new Error('DEV_MODE_FORBIDDEN');
  const [scenario = 'critical', count = '1', resume] = args;
  if (!['base', 'critical', 'denied', 'probe'].includes(scenario) || !/^[1-3]$/.test(count)
      || args.length > 3 || (resume !== undefined && !/^zk-agentik-risc0-gpu-[a-z0-9-]{8,80}$/.test(resume)))
    throw new Error('Usage: node scripts/risc0-gpu-lab.mjs [critical|base|denied|probe] [1..3] [retained-container-name]');
  return { scenario, samples: Number(count), resume };
}

export function validateContainer(config, repo, imageId) {
  const mount = config.Mounts?.find(m => m.Destination === '/workspace');
  if (config.Image !== imageId || config.Config?.Labels?.['org.zk-agentik.role'] !== 'risc0-gpu-lab'
      || !mount || mount.RW || mount.Type !== 'bind' || normalize(mount.Source) !== normalize(repo)
      || config.Mounts.length !== 1 || config.HostConfig?.Privileged
      || config.HostConfig?.Memory !== 12 * 1024 ** 3 || config.HostConfig?.NanoCpus !== 8e9
      || config.HostConfig?.PidsLimit !== 512 || !config.HostConfig?.CapDrop?.includes('ALL')
      || !config.HostConfig?.SecurityOpt?.includes('no-new-privileges')
      || config.Config?.Cmd?.join(' ') !== 'sleep infinity'
      || !config.HostConfig?.DeviceRequests?.some(r => r.Capabilities?.some(c => c.includes('gpu'))))
    throw new Error('UNTRUSTED_GPU_CONTAINER_CONFIGURATION');
}

export function smallSampleSummary(values) {
  if (!values.length || values.some(n => !Number.isFinite(n) || n < 0)) throw new Error('INVALID_TIMINGS');
  return { n: values.length, samples_in_order_ms: values, min_ms: Math.min(...values),
    max_ms: Math.max(...values), mean_ms: values.reduce((a, b) => a + b, 0) / values.length,
    p95_ms: null, p99_ms: null, reason: 'Feasibility sample, no tail-latency inference; no discarded warmup.' };
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`;
  const out = resolve(root, 'docs/experiments/gpu/runs', runId);
  mkdirSync(out, { recursive: true });
  const container = options.resume ?? `zk-agentik-risc0-gpu-${runId.toLowerCase()}`;
  const manifest = { schema: 'risc0-gpu-experiment-v1', run_id: runId, started: new Date().toISOString(),
    status: 'RUNNING', container, scenario: options.scenario, requested_samples: options.samples,
    runner_node: process.version, runner_platform: process.platform, runner_arch: process.arch,
    cuda_base_image: CUDA_IMAGE, gpu_probe_image: CPU_IMAGE,
    risc0_version: '3.0.6', upstream_commit: '1cc70cf05033a79ebc90f07c679cb4bd1cd301b9',
    rust_host: '1.98.0', rust_guest: '1.97.0', cuda_arch: 'sm_120',
    limits: { cpu: 8, memory_bytes: 12 * 1024 ** 3, pids: 512, cargo_jobs: 1,
      gpu_memory_limit: null, gpu_note: 'One shared desktop GPU; no hardware VRAM quota or exclusivity.' },
    commands: [], source_sha256: {}, receipt_generated: false, independently_verified: false,
    post_quantum_end_to_end_claim: false };
  const redact = s => redactPaths(s, root);
  const save = () => writeFileSync(resolve(out, 'run.json'), JSON.stringify(manifest, null, 2) + '\n');
  let counter = 0;
  async function command(exe, argv, { allowFailure = false, timeout = 120_000, label = exe } = {}) {
    const id = `${String(++counter).padStart(2, '0')}-${label.replace(/[^a-zA-Z0-9-]/g, '-')}`;
    const start = performance.now();
    const entry = { id, executable: exe, args: argv.map(redact), started: new Date().toISOString() };
    manifest.commands.push(entry); save();
    console.log(`[${id}] started`);
    const result = await new Promise(resolveResult => {
      const child = spawn(exe, argv, { cwd: root, shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '', stderr = '', timedOut = false;
      const timer = setTimeout(() => { timedOut = true; child.kill(); }, timeout);
      child.stdout.on('data', b => { stdout += b.toString(); });
      child.stderr.on('data', b => { stderr += b.toString(); });
      child.on('error', e => { stderr += String(e); });
      child.on('close', code => { clearTimeout(timer); resolveResult({ code, stdout, stderr, timedOut }); });
    });
    Object.assign(entry, { elapsed_ms: performance.now() - start, exit_code: result.code, timed_out: result.timedOut });
    writeFileSync(resolve(out, `${id}.stdout.txt`), redact(result.stdout));
    writeFileSync(resolve(out, `${id}.stderr.txt`), redact(result.stderr));
    save(); console.log(`[${id}] exit=${result.code} duration=${Math.round(entry.elapsed_ms)}ms`);
    if (!allowFailure && (result.code !== 0 || result.timedOut)) throw new Error(`${id} failed; see captured stdout/stderr`);
    return result;
  }
  const docker = (argv, opts) => command('docker', argv, opts);
  let running = false;
  try {
    for (const path of ['labs/risc0/Cargo.lock', 'labs/risc0/setup.sh', 'labs/risc0/host/src/lib.rs',
      'labs/risc0/host/src/main.rs', 'labs/risc0/methods/guest/src/main.rs', 'labs/risc0/gpu/Dockerfile',
      'labs/risc0/gpu/setup.sh', 'scripts/risc0-gpu-lab.mjs']) {
      manifest.source_sha256[path] = createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex');
    }
    manifest.git_commit = (await command('git', ['rev-parse', 'HEAD'])).stdout.trim();
    await docker(['version', '--format', '{{json .}}'], { label: 'docker-version' });
    const probe = await docker(['run', '--rm', '--gpus', 'all', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--memory', '512m', '--pids-limit', '64', CPU_IMAGE,
      'nvidia-smi', '--query-gpu=name,driver_version,memory.total,compute_cap', '--format=csv,noheader'], { label: 'gpu-probe' });
    manifest.gpu = probe.stdout.trim();
    if (options.scenario === 'probe') { manifest.status = 'GPU_VISIBLE_NOT_A_PROOF'; return; }
    if (!options.resume) await docker(['build', '--progress', 'plain', '-t', imageTag, '-f',
      'labs/risc0/gpu/Dockerfile', 'labs/risc0/gpu'], { label: 'build-image', timeout: 1_200_000 });
    const imageId = JSON.parse((await docker(['image', 'inspect', imageTag, '--format', '{{json .Id}}'], { label: 'image-id' })).stdout);
    manifest.built_image_id = imageId;
    if (!options.resume) await docker(['run', '-d', '--name', container, '--gpus', 'all',
      '--label', 'org.zk-agentik.role=risc0-gpu-lab', '--cpus', '8', '--memory', '12g', '--pids-limit', '512',
      '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges', '--mount',
      `type=bind,source=${root.replace(/[\\/]$/, '')},target=/workspace,readonly`, imageId, 'sleep', 'infinity'], { label: 'create' });
    let config = JSON.parse((await docker(['inspect', container], { label: 'inspect' })).stdout)[0];
    validateContainer(config, root, imageId);
    if (!config.State.Running) await docker(['start', container], { label: 'start' });
    running = true;
    if (!config.NetworkSettings.Networks.bridge) await docker(['network', 'connect', 'bridge', container], { label: 'build-network' });
    const ready = await docker(['exec', container, 'test', '-f', '/lab/provenance/setup-complete'], { allowFailure: true, label: 'setup-marker' });
    if (ready.code !== 0) {
      // Freeze the script before a long build while collaborators can edit the repo.
      await docker(['cp', resolve(root, 'labs/risc0/gpu/setup.sh'), `${container}:/lab/gpu-setup.sh`], { label: 'snapshot-setup' });
      await docker(['exec', container, 'sha256sum', '/lab/gpu-setup.sh'], { label: 'executed-setup-hash' });
      await docker(['exec', container, 'bash', '/lab/gpu-setup.sh'], { label: 'setup-cuda', timeout: 3_600_000 });
    }
    await docker(['cp', `${container}:/lab/provenance`, resolve(out, 'provenance')], { label: 'copy-provenance' });
    await docker(['network', 'disconnect', 'bridge', container], { label: 'isolate' });
    config = JSON.parse((await docker(['inspect', container], { label: 'inspect-isolation' })).stdout)[0];
    if (Object.keys(config.NetworkSettings.Networks).length) throw new Error('PROVER_NETWORK_NOT_ISOLATED');
    manifest.prover_network = 'none';
    const devCheck = await docker(['exec', '-e', 'RISC0_DEV_MODE=1', container,
      '/lab/target/release/lab-verifier', '/unused-proof', '/unused-challenge'], { allowFailure: true, label: 'reject-dev-mode' });
    if (devCheck.code === 0 || !devCheck.stderr.includes('DEV_MODE_FORBIDDEN')) throw new Error('DEV_MODE_REJECTION_NOT_OBSERVED');
    manifest.dev_mode_rejected = true;
    await docker(['exec', '-e', 'RISC0_DEV_MODE=0', container, '/lab/target/release/lab-execution-checks'], { label: 'execution-checks', timeout: 300_000 });
    const noGpu = await docker(['exec', '-e', 'RISC0_DEV_MODE=0', '-e', 'CUDA_VISIBLE_DEVICES=-1', container,
      '/lab/target/release/lab-host', options.scenario, '/lab/no-gpu-check', '1'], { allowFailure: true, label: 'reject-without-gpu', timeout: 180_000 });
    if (noGpu.code === 0 || noGpu.timedOut || !/CUDA|cuda|GPU|gpu|NoDevice/.test(noGpu.stderr + noGpu.stdout))
      throw new Error('NO_GPU_FAILURE_NOT_IDENTIFIED');
    manifest.no_gpu_rejected = true;
    await docker(['exec', '-e', 'RISC0_DEV_MODE=0', '-e', 'CUDA_VISIBLE_DEVICES=0', container,
      '/lab/target/release/lab-host', options.scenario, `/lab/results/${runId}`, String(options.samples)], { label: 'prove-succinct-cuda', timeout: 900_000 });
    for (const kind of ['proof', 'expected', 'report', 'envelope']) await docker(['cp',
      `${container}:/lab/results/${runId}/${options.scenario}-${kind}.json`, resolve(out, `${options.scenario}-${kind}.json`)], { label: `copy-${kind}` });
    manifest.receipt_generated = true;
    const report = JSON.parse(readFileSync(resolve(out, `${options.scenario}-report.json`), 'utf8'));
    manifest.host_report_notice = 'Unmodified host report has inherited CPU scope wording and small-N p95. Use this run metadata and raw samples; those labels do not describe this CUDA run.';
    manifest.proof_generation = smallSampleSummary(report.proof_samples_in_order_ms);
    const reference = JSON.parse(readFileSync(resolve(root, 'tests/fixtures/risc0/critical-proof.json'), 'utf8'));
    const actual = JSON.parse(readFileSync(resolve(out, `${options.scenario}-proof.json`), 'utf8'));
    const actualJournal = JSON.parse(Buffer.from(actual.journal, 'base64').toString('utf8'));
    const referenceJournal = JSON.parse(Buffer.from(reference.journal, 'base64').toString('utf8'));
    if (actualJournal.elf_image_id !== referenceJournal.elf_image_id || report.elf_sha256 !== referenceJournal.elf_image_id
        || report.proof_kind !== 'succinct' || report.dev_mode !== false)
      throw new Error('GUEST_OR_RECEIPT_PROFILE_CHANGED');
    manifest.same_guest_as_historical_cpu_fixture = true;
    manifest.elf_image_id = actualJournal.elf_image_id;
    const publicDirectory = resolve(root, '.tools/risc0-gpu-public', runId);
    mkdirSync(publicDirectory, { recursive: true });
    await docker(['cp', `${container}:/lab/target/release/lab-verifier`, resolve(publicDirectory, 'lab-verifier')], { label: 'copy-cpu-verifier' });
    for (const kind of ['proof', 'expected']) copyFileSync(resolve(out, `${options.scenario}-${kind}.json`), resolve(publicDirectory, `${kind}.json`));
    const verifierArgs = ['run', '--rm', '--network', 'none', '--read-only', '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges', '--memory', '512m', '--pids-limit', '64', '--mount',
      `type=bind,source=${publicDirectory},target=/public,readonly`, '-e', 'NVIDIA_VISIBLE_DEVICES=void',
      '-e', 'CUDA_VISIBLE_DEVICES=-1', imageId,
      '/public/lab-verifier', '/public/proof.json', '/public/expected.json'];
    // CUDA-base userspace is needed for glibc compatibility; no --gpus, no witness,
    // no r0vm/prover binary, no source tree, no network, no writable filesystem.
    const verify = await docker(verifierArgs, { allowFailure: options.scenario === 'denied', label: 'independent-cpu-verification' });
    if (options.scenario === 'denied' && (verify.code === 0 || !verify.stderr.includes('POLICY_DENIED')))
      throw new Error('VALID_DENIAL_NOT_OBSERVED');
    manifest.independently_verified = true;
    manifest.independent_verifier = { image: imageId, gpu_requested: false, network: 'none',
      read_only: true, mount_files: ['lab-verifier', 'proof.json', 'expected.json'], witness_available: false,
      result: options.scenario === 'denied' ? 'valid_receipt_policy_denied' : 'historical_authorization_valid' };
    for (const kind of ['proof', 'expected', 'report', 'envelope']) {
      const path = `${options.scenario}-${kind}.json`;
      (manifest.artifact_sha256 ??= {})[path] = createHash('sha256').update(readFileSync(resolve(out, path))).digest('hex');
    }
    manifest.status = 'CUDA_SUCCINCT_RECEIPT_CPU_VERIFIED';
  } catch (error) {
    manifest.status = 'BLOCKED'; manifest.error = redact(String(error)); process.exitCode = 1;
    console.error(manifest.error);
  } finally {
    if (running) {
      // Preserve a failed build's evidence as well; these counters cover the
      // container lifetime, not an isolated proof's peak-memory measurement.
      await docker(['exec', container, 'bash', '-c',
        'date -u +%FT%TZ; cat /sys/fs/cgroup/memory.events; cat /sys/fs/cgroup/memory.peak'],
      { allowFailure: true, label: 'lifetime-memory-counters' });
      if (!existsSync(resolve(out, 'provenance'))) await docker(['cp', `${container}:/lab/provenance`, resolve(out, 'provenance')],
        { allowFailure: true, label: 'copy-failure-provenance' });
      await docker(['stop', '--timeout', '10', container], { allowFailure: true, label: 'stop-retain-container' });
    }
    manifest.finished = new Date().toISOString(); save();
    console.log(`Result: ${manifest.status}\nArtifacts: ${out}\nRetained container: ${container}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(String(error)); process.exitCode = 1; });
}
