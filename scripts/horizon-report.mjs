// Consolidate immutable measurements. This does not rerun or rewrite raw experiments.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const beforePath = 'docs/horizon/raw/horizon-linux-before.summary.json';
const afterPath = 'docs/horizon/raw/horizon-linux-after.summary.json';
const before = read(beforePath); const after = read(afterPath);
const firewallPath = readdirSync('docs/horizon/raw').filter(name => name.startsWith('horizon-firewall-') && name.endsWith('.summary.json'))
  .map(name => `docs/horizon/raw/${name}`).filter(path => read(path).samples === 500).sort().at(-1);
if (!firewallPath) throw new Error('No 500-sample durable firewall run');
const firewall = read(firewallPath); const firewallRaw = read(firewall.raw_file);
const rawAfter = read(after.raw_file);
const vegaPath = 'docs/horizon/raw/vega-criterion.json';
const vega = read(vegaPath);
const provenance = [beforePath, afterPath, before.raw_file, after.raw_file, firewallPath, firewall.raw_file, vegaPath,
  'labs/horizon/Cargo.lock', 'labs/horizon/reference/vega-Cargo.lock',
  'docs/horizon/raw/horizon-linux-before-time.txt', 'docs/horizon/raw/horizon-linux-after-time.txt'];
const compact = value => ({ n: value.n, p50: value.p50, p95: value.p95, p99: value.p99, max: value.max,
  confidence_intervals_if_iid: value.confidence_intervals });
const report = {
  format: 'horizon-decision-results-v1', date: '2026-10-17', scientific_record: false,
  baseline_repository_commit: 'd18fe65840d5f1cd9dc6155e404c942dabf2bcc7',
  security_scope: 'Real Bulletproofs/Ed25519, adapted synthetic issuance, linkable presentations, local simulated authorization',
  linux_crypto: {
    source_before: '80b2202', source_after: '353652d', rust: '1.98.0',
    image: 'rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922',
    cpu: 'Intel Core Ultra 7 265F', cpus_limit: 8, memory_limit_bytes: 12884901888,
    os: 'WSL2 Linux 6.6.87.2', rustflags: '-C target-cpu=native', proof_threads: 1,
    samples_per_phase: 500, warmup: 30, value_cases: 5, order: 'alternating A/B',
    cold_and_issuance: { initial_fixture_issuance_ns: rawAfter.initial_fixture_issuance_ns,
      initial_prepare_ns: rawAfter.initial_prepare_ns, inspect_raw: after.raw_file,
      note: 'Five sequential case initializations; only the first includes lazy parameter setup. Not five independent cold processes.' },
    before_ms: Object.fromEntries(Object.entries(before.timings_ms).map(([k, v]) => [k, compact(v)])),
    after_ms: Object.fromEntries(Object.entries(after.timings_ms).map(([k, v]) => [k, compact(v)])),
    public_parameter_reuse: {
      unchanged_relation_and_generators: true, preoptimization_proof_verifies: true,
      prove_a_observed_p95_reduction_fraction: 1 - after.timings_ms.prove_a.p95 / before.timings_ms.prove_a.p95,
      full_verify_b_observed_p95_reduction_fraction: 1 - after.timings_ms.verify_b_full.p95 / before.timings_ms.verify_b_full.p95,
      scope: 'One before/after campaign on one machine; not a universal speedup or external scientific record' },
    proof_bytes: 672, json_envelope_bytes: after.sizes_bytes.json_envelope,
    valid_encoding_algebraic_tamper_rejections: { before: 500, after: 500, accepted: 0 },
    cpu_cost: { before_total_user_seconds: 11.725, after_total_user_seconds: 8.930,
      includes: 'whole campaign, all phases, warmups and serialization; not per-operation CPU cost' },
    measured_peak_rss_bytes: null, gpu: 'not used', monetary_cost: null,
  },
  windows_durable_path: { raw_file: firewall.raw_file, environment: firewallRaw.environment,
    timings_ms: Object.fromEntries(Object.entries(firewall.timings_ms).map(([k, v]) => [k, compact(v)])),
    errors: firewall.errors, authorized_synthetic_effects_including_warmup: firewall.successful_effects,
    exclusions: firewallRaw.scope.exclusions,
    node_observed_max_rss_bytes: Math.max(...firewallRaw.memory_observations.map(item => item.rss)),
    resource_scope: firewallRaw.scope.resource_scope },
  vega: { source_commit: vega.source_commit, environment: { rust: vega.rust_host, threads: vega.threads, cpu: vega.cpu },
    full_mdl_relation_reproduced: false, reason: 'Public repository benchmarks only implement SHA256; not the complete credential application',
    criterion: vega.rows.map(row => ({ id: row.benchmark.full_id, estimates_ns: row.estimates, samples_file: vegaPath })),
    proof_bytes: { mc_1024: 86933, mc_2048: 96583, sc_1024: 85948, sc_2048: 94572 },
    global_speed_comparison_permitted: false },
  arithmetic_reuse_cost_estimates_ms: [1, 2, 5, 10, 100].map(k => ({ uses: k,
    a: k * (after.timings_ms.prove_a.mean + after.timings_ms.verify_a.mean),
    b: after.timings_ms.prepare.mean + k * (after.timings_ms.present_b.mean + after.timings_ms.verify_b_full.mean),
    disclosure: k * (after.timings_ms.present_disclosure.mean + after.timings_ms.verify_disclosure.mean),
    scope: 'Derived from measured warm means; NOT executed k-use series; excludes issuance/HTTP/storage. B proves historical witness and fresh holder key, disclosure reveals witness.' })),
  goals: {
    crypto_function_p95_50ms_prove_10ms_verify_64KiB: 'observed met on narrower relation, not comparable to Vega credentials',
    durable_continuous_p95_10ms: 'not met',
    no_observed_unauthorized_effects: 'adversarial tests only; not a cryptographic soundness probability estimate',
    validated_customer_need: false,
    superior_to_best_known_equivalent_reference: false,
  },
  uncertainties: ['IID not established; quantile confidence intervals conditional', 'Single machine; uncontrolled system background activity',
    'No full workload-equivalent Vega comparison', 'No qualified real issuer, customer economics, external audit, hardware failure or financial target',
    'No combined Rust+Node peak memory, GPU/energy or complete monetary cost measurement'],
  artifacts_sha256: Object.fromEntries(provenance.map(path => [path, createHash('sha256').update(readFileSync(path)).digest('hex')])),
};
writeFileSync('docs/horizon/BENCHMARK_RESULTS.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: 'docs/horizon/BENCHMARK_RESULTS.json', prove_p95_ms: after.timings_ms.prove_a.p95,
  verify_p95_ms: after.timings_ms.verify_b_full.p95, durable_p95_ms: firewall.timings_ms.verify_and_authorize_continuous.p95,
  improvement: report.linux_crypto.public_parameter_reuse }, null, 2));
