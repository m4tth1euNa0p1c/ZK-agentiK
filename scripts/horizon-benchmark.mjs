import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cpus, platform, release } from 'node:os';
import { summary } from './horizon-stats.mjs';

// A raw Rust report can also be supplied from the pinned Linux reference machine.
const input = process.argv[2];
const stamp = new Date().toISOString().replaceAll(':', '-');
mkdirSync('docs/horizon/raw', { recursive: true });
const rawPath = input ?? `docs/horizon/raw/horizon-${stamp}.json`;
if (!input) {
  const binary = resolve('labs/horizon/target/release', platform() === 'win32' ? 'horizon-benchmark.exe' : 'horizon-benchmark');
  const child = spawnSync(binary, ['--samples', '500', '--output', rawPath], { stdio: 'inherit', windowsHide: true });
  if (child.error || child.status !== 0) throw new Error('Benchmark failed; no success summary emitted');
}
const raw = JSON.parse(readFileSync(rawPath, 'utf8'));
const report = {
  generated_at: new Date().toISOString(), raw_file: rawPath, profile: raw.profile,
  relation: 'Signed Pedersen commitments: 1<=amount<=2^32 and 0<=cap-amount<2^32',
  classification: 'Synthetic adapted issuance; not Vega credentials or historical RISC Zero relation',
  summary_host: { cpu: cpus()[0]?.model, logical_cpus: cpus().length, os: platform(), release: release() },
  measurement_environment: raw.environment ?? { scope: input ? 'See accompanying experiment log; do not infer from summary host' : 'Native release binary on summary host' },
  timings_ms: Object.fromEntries(Object.entries(raw.durations).map(([name, times]) => [name, summary(times.map(ns => ns / 1e6))])),
  sizes_bytes: { range_proof_a: summary(raw.proof_bytes_a), range_proof_b: raw.proof_bytes_b,
    json_envelope: Object.fromEntries(Object.entries(raw.envelope_json_bytes).map(([name, sizes]) => [name, summary(sizes)])) },
  checks: { algebraic_tamper_rejections: raw.valid_encoding_tamper_rejections, verification_cache: raw.verification_cache },
  exclusions: ['HTTP/IPC', 'durable firewall', 'network', 'external target', 'actual issuer integration', 'monetary cost'],
  scientific_record: false,
};
const output = rawPath.replace(/\.json$/, '.summary.json');
if (existsSync(output)) throw new Error(`Preserve existing measurements: ${output} exists`);
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ output, p95_ms: Object.fromEntries(Object.entries(report.timings_ms).map(([key, value]) => [key, value.p95])), proof_bytes: report.sizes_bytes.range_proof_b }, null, 2));
