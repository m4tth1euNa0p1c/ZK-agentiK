import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { arch, cpus, platform, release, totalmem } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { summary } from './horizon-stats.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PHASES = ['present_b_ipc', 'verify_b_ipc', 'authorize_durable', 'verify_and_authorize_continuous'];
const HELP = 'Usage: node scripts/horizon-firewall-benchmark.mjs [--samples 500] [--warmup 30] [--worker path] [--max-wall-ms 300000]';
const local = path => relative(ROOT, path).replaceAll('\\', '/');
const hash = value => createHash('sha256').update(value).digest('hex');

function options(args) {
  const selected = { samples: 500, warmup: 30, maxWallMs: 300000,
    worker: resolve(ROOT, process.env.HORIZON_WORKER ?? join('labs/horizon/target/release',
      platform() === 'win32' ? 'horizon-proof-worker.exe' : 'horizon-proof-worker')) };
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const name = args[i];
    if (name === '--help' && args.length === 1) return undefined;
    if (!['--samples', '--warmup', '--worker', '--max-wall-ms'].includes(name) || seen.has(name)) throw new Error(HELP);
    seen.add(name);
    const value = args[++i];
    if (value === undefined) throw new Error(HELP);
    if (name === '--worker') selected.worker = resolve(ROOT, value);
    else {
      if (!/^\d+$/.test(value)) throw new Error(HELP);
      const number = Number(value);
      if (!Number.isSafeInteger(number)) throw new Error(HELP);
      if (name === '--samples') selected.samples = number;
      if (name === '--warmup') selected.warmup = number;
      if (name === '--max-wall-ms') selected.maxWallMs = number;
    }
  }
  if (selected.samples < 1 || selected.samples > 1000 || selected.warmup > 100
    || selected.maxWallMs < 1000 || selected.maxWallMs > 1800000) {
    throw new Error('Bounds: samples 1..1000; warmup 0..100; max-wall-ms 1000..1800000');
  }
  return selected;
}

function command(binary, args) {
  const result = spawnSync(binary, args, { cwd: ROOT, encoding: 'utf8', windowsHide: true, timeout: 5000 });
  return result.status === 0 ? result.stdout.trim() : null;
}

function memory() {
  return { at_ms: Date.now(), ...process.memoryUsage() };
}

async function run(selected) {
  const compiled = ['worker.js', 'store.js', 'types.js'].map(name => join(ROOT, 'packages/horizon-demo/dist', name));
  for (const path of [...compiled, selected.worker]) {
    if (!existsSync(path)) throw new Error(`Build required before measurement: ${local(path)}`);
  }
  const { ProofWorker } = await import(pathToFileURL(compiled[0]).href);
  const { AuthorizationStore } = await import(pathToFileURL(compiled[1]).href);
  const { PublicConfig, PrivateConfig, selectMethod } = await import(pathToFileURL(compiled[2]).href);

  const startedAt = new Date().toISOString();
  const id = `${startedAt.replaceAll(':', '-')}-${randomUUID()}`;
  const dbRoot = join(ROOT, '.tools/horizon', `bench-${id}`);
  mkdirSync(join(ROOT, '.tools/horizon'), { recursive: true });
  mkdirSync(dbRoot); // A unique namespace is never emptied or reused.
  const rawDirectory = join(ROOT, 'docs/horizon/raw');
  mkdirSync(rawDirectory, { recursive: true });
  const rawPath = join(rawDirectory, `horizon-firewall-${id}.json`);
  const summaryPath = join(rawDirectory, `horizon-firewall-${id}.summary.json`);
  const progressPath = join(dbRoot, 'observations.jsonl');
  writeFileSync(progressPath, '', { flag: 'wx' });
  const relevantFiles = [...compiled, selected.worker, fileURLToPath(import.meta.url),
    join(ROOT, 'scripts/horizon-stats.mjs'), join(ROOT, 'labs/horizon/Cargo.lock'), join(ROOT, 'package-lock.json')];
  const dirty = command('git', ['status', '--porcelain']);
  const report = {
    format: 'horizon-firewall-benchmark-v1', profile: 'horizon-range-v1', status: 'running',
    started_at: startedAt, finished_at: null, units: 'milliseconds',
    planned: { samples: selected.samples, warmup: selected.warmup, max_wall_ms: selected.maxWallMs },
    environment: { platform: platform(), release: release(), arch: arch(), cpu: cpus()[0]?.model ?? null,
      logical_cpus: cpus().length, total_memory_bytes: totalmem(), node: process.version,
      node_versions: { ...process.versions }, git_head: command('git', ['rev-parse', 'HEAD']),
      git_dirty: dirty === null ? null : dirty.length > 0,
      rustc_available_to_harness: command('rustc', ['--version']),
      rustc_note: 'Available compiler is not asserted to be the compiler that produced the worker; executed binary SHA-256 identifies it.',
      artifacts_sha256: Object.fromEntries(relevantFiles.map(path => [local(path), hash(readFileSync(path))])) },
    storage: { preserved_directory: local(dbRoot), progress_jsonl: local(progressPath),
      one_new_database_per_observation: true, sqlite: 'WAL; synchronous=FULL; busy_timeout=5000',
      durability_scope: 'Two SQLite commits include requested WAL syncs. Hardware power-loss durability is not measured.',
      close_checkpoint: 'Store close/checkpoint is outside the authorization timing.' },
    scope: {
      action: 'record_claim_authorization on a synthetic local SQLite target',
      corpus: 'One synthetic evidence pair and one prepared proof B reused with fresh signed challenges and unique synthetic operation objects.',
      worker_processes: 'Separate prover and verifier Rust subprocesses; the verifier receives public requests only. The Node harness itself holds the synthetic witness.',
      timing_clock: 'performance.now() monotonic durations; Date.now() live authorization clock',
      verification_cache: false, sample_concurrency: 1,
      exclusions: ['HTTP', 'network', 'real clients or authorities', 'external target',
        'process startup', 'fixture issuance and proof preparation (reported separately)',
        'database/configuration creation', 'challenge issuance and pre-verification store reads',
        'post-effect assertions', 'database close/checkpoint', 'observation logging'],
      continuous_interval: 'From starting verify IPC through authorize return, without await between verification completion and authorize. authorize rechecks current clock/epochs inside both durable transactions.',
      iid: 'Not established: sequential warm observations of one evidence pair, OS cache and storage effects. Quantile confidence intervals are conditional on IID, not service guarantees.',
      resource_scope: 'process.memoryUsage() samples of the Node coordinator, including its SQLite allocations; excludes both Rust subprocesses, filesystem cache and system memory. Observed sample maximum is not a measured process peak.' },
    setup_ms: {}, public_config_sha256: null, prepared_proof_sha256: null,
    warmup_observations: [], observations: [], errors: [], memory_observations: [memory()],
    successful_effects: 0,
  };
  let prover;
  let verifier;
  let current = { phase: 'setup', index: null, stage: 'worker_initialization' };
  let completed = false;
  const nonces = new Set();
  const operations = new Set();
  const start = performance.now();
  let stageStart = start;
  const stage = name => { current.stage = name; stageStart = performance.now(); };
  const bound = () => {
    if (performance.now() - start > selected.maxWallMs) throw new Error('MAX_WALL_TIME_EXCEEDED');
  };
  try {
    prover = new ProofWorker(selected.worker);
    verifier = new ProofWorker(selected.worker);
    const fixtureStart = performance.now();
    const fixture = await prover.request({ op: 'init', now_ms: Date.now() });
    report.setup_ms.fixture_issuance_ipc = performance.now() - fixtureStart;
    const publicConfig = PublicConfig.parse({ trust: fixture.trust, evidence: fixture.evidence,
      challenge: fixture.challenge, policy: fixture.policy });
    const privateConfig = PrivateConfig.parse({ evidence: fixture.evidence, witness: fixture.witness,
      holder_secret_hex: fixture.holder_secret_hex, policy: fixture.policy,
      client_id: fixture.challenge.client_id, audience: fixture.challenge.audience, action: fixture.challenge.action });
    if (selectMethod(publicConfig.policy) !== 'reusable') throw new Error('REUSABLE_PRIVATE_POLICY_REQUIRED');
    const publicBytes = JSON.stringify(publicConfig);
    report.public_config_sha256 = hash(publicBytes);
    writeFileSync(join(dbRoot, 'public-template.json'), publicBytes + '\n', { flag: 'wx' });
    stage('prepare_b');
    const prepareStart = performance.now();
    const prepared = await prover.request({ op: 'prepare', evidence: privateConfig.evidence, witness: privateConfig.witness });
    report.setup_ms.prepare_b_ipc = performance.now() - prepareStart;
    report.prepared_proof_sha256 = hash(JSON.stringify(prepared));

    for (const [phase, count] of [['warmup', selected.warmup], ['measurement', selected.samples]]) {
      for (let index = 0; index < count; index++) {
        current = { phase, index, stage: 'database_creation' };
        stageStart = performance.now();
        bound();
        // The object identifies a fresh synthetic record, not a second attempt at an earlier action.
        const objectId = `fw-${id}/${phase}-${index}`;
        const config = PublicConfig.parse({ ...publicConfig, challenge: { ...publicConfig.challenge, object_id: objectId } });
        const database = join(dbRoot, `${phase}-${String(index).padStart(4, '0')}.sqlite`);
        const store = new AuthorizationStore(database, config, Date.now);
        let observation;
        try {
          const journalMode = store.db.prepare('PRAGMA journal_mode').get()?.journal_mode;
          const synchronous = store.db.prepare('PRAGMA synchronous').get()?.synchronous;
          if (journalMode !== 'wal' || synchronous !== 2) throw new Error('DURABLE_SQLITE_SETTINGS_NOT_ACTIVE');
          report.storage.observed_journal_mode = journalMode;
          report.storage.observed_synchronous = synchronous;
          stage('challenge_issuance');
          const challenge = store.issue();
          if (nonces.has(challenge.nonce) || operations.has(challenge.operation_id)) throw new Error('AUTHORIZATION_IDENTIFIER_REUSED');
          nonces.add(challenge.nonce); operations.add(challenge.operation_id);
          stage('present_b_ipc');
          const presentStart = performance.now();
          const presentation = await prover.request({ op: 'present', evidence: privateConfig.evidence,
            prepared, holder_secret_hex: privateConfig.holder_secret_hex, challenge });
          const presentEnd = performance.now();
          bound();
          // These trusted preflight reads are explicit exclusions, as are DB creation and issuance.
          const expected = store.expected(challenge.nonce);
          const state = store.state();
          if (state.revoked) throw new Error('REVOKED');
          stage('verify_and_authorize_continuous');
          const verifyStart = performance.now();
          const verified = await verifier.request({ op: 'verify', presentation, expected,
            trust: { ...config.trust, epoch: state.trust_epoch },
            policy: { ...config.policy, policy_epoch: state.policy_epoch }, now_ms: Date.now() });
          const verifyEnd = performance.now();
          const outcome = store.authorize(expected, verified);
          const authorizeEnd = performance.now();
          stage('post_effect_assertions');
          const effects = Number(store.db.prepare('SELECT COUNT(*) AS n FROM effects').get()?.n);
          const used = Number(store.db.prepare('SELECT used FROM challenges WHERE nonce=?').get(challenge.nonce)?.used);
          const operation = store.db.prepare('SELECT status FROM operations WHERE id=?').get(challenge.operation_id);
          if (outcome.status !== 'COMPLETED' || effects !== 1 || used !== 1 || operation?.status !== 'COMPLETED') {
            throw new Error('EXPECTED_EXACTLY_ONE_DURABLE_EFFECT');
          }
          report.successful_effects++;
          observation = { phase, index, at_ms: Date.now(), database: local(database), object_id: objectId,
            nonce: challenge.nonce, operation_id: challenge.operation_id, config_sha256: hash(JSON.stringify(config)),
            effect_count: effects, nonce_consumed: true, operation_status: operation.status,
            timings_ms: { present_b_ipc: presentEnd - presentStart, verify_b_ipc: verifyEnd - verifyStart,
              authorize_durable: authorizeEnd - verifyEnd, verify_and_authorize_continuous: authorizeEnd - verifyStart } };
        } finally { store.close(); }
        const records = phase === 'warmup' ? report.warmup_observations : report.observations;
        records.push(observation);
        appendFileSync(progressPath, JSON.stringify(observation) + '\n');
        report.memory_observations.push(memory());
        bound();
      }
    }
    if (report.observations.length !== selected.samples || report.warmup_observations.length !== selected.warmup
      || report.successful_effects !== selected.samples + selected.warmup) throw new Error('INCOMPLETE_CAMPAIGN');
    completed = true;
  } catch (error) {
    report.errors.push({ ...current, at_ms: Date.now(), stage_elapsed_ms: performance.now() - stageStart,
      message: error instanceof Error ? error.message : 'UNKNOWN_FAILURE' });
  } finally {
    prover?.close(); verifier?.close();
    report.status = completed ? 'completed' : 'failed';
    report.finished_at = new Date().toISOString();
    report.elapsed_ms = performance.now() - start;
    report.memory_observations.push(memory());
    writeFileSync(rawPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  }
  if (!completed || report.errors.length !== 0) {
    throw new Error(`Campaign failed; no success summary. Preserve ${local(rawPath)} and ${local(dbRoot)}`);
  }
  const statistical = {
    format: 'horizon-firewall-summary-v1', raw_file: local(rawPath), raw_sha256: hash(readFileSync(rawPath)),
    samples: report.observations.length, warmup_excluded: report.warmup_observations.length,
    errors: 0, successful_effects: report.successful_effects,
    timings_ms: Object.fromEntries(PHASES.map(phase => [phase, summary(report.observations.map(row => row.timings_ms[phase]))])),
    node_memory_sampled_max_bytes: Object.fromEntries(['rss', 'heapTotal', 'heapUsed', 'external', 'arrayBuffers']
      .map(name => [name, Math.max(...report.memory_observations.map(row => row[name]))])),
    memory_scope: report.scope.resource_scope, setup_ms: report.setup_ms, exclusions: report.scope.exclusions,
    continuous_interval: report.scope.continuous_interval, iid: report.scope.iid,
    storage: report.storage, service_sla_established: false,
  };
  writeFileSync(summaryPath, JSON.stringify(statistical, null, 2) + '\n', { flag: 'wx' });
  process.stdout.write(JSON.stringify({ raw: local(rawPath), summary: local(summaryPath), preserved_databases: local(dbRoot),
    samples: selected.samples, warmup: selected.warmup, errors: 0,
    p95_ms: Object.fromEntries(Object.entries(statistical.timings_ms).map(([phase, data]) => [phase, data.p95])) }, null, 2) + '\n');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const selected = options(process.argv.slice(2));
    if (selected) await run(selected);
    else process.stdout.write(HELP + '\n');
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : 'Firewall benchmark failed'}\n`);
    process.exitCode = 1;
  }
}

/* Usage, after the release worker and TypeScript outputs have been built:
 *   npm run horizon:build
 *   node scripts/horizon-firewall-benchmark.mjs --samples 500 --warmup 30
 *   node scripts/horizon-firewall-benchmark.mjs --samples 2 --warmup 1   (explicit smoke run)
 * No benchmark runs on import or during --help. Default wall budget is five minutes,
 * checked between bounded worker calls; one pending worker call can add up to 30 s.
 * Every warmup/measurement keeps its own DB under .tools/horizon/bench-<unique-id>.
 * Raw JSON, including partial failures, goes to docs/horizon/raw with a unique name.
 * A success summary requires all observations, zero errors and one durable effect
 * per fresh operation. No credentials, witness, openings or holder secret are saved.
 * Preparation is separate; repeated B presentation is not fresh ZK generation.
 * This measures serial IPC + local SQLite commits, not HTTP or a production SLA.
 */
