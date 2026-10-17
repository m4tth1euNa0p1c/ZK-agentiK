import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { MemoryReplayStore, NativeSimulatorBackend, VerifierFirewall } from '@zk-mcp/sdk';
import { request } from '../fixtures/helpers.js';

const backend = new NativeSimulatorBackend({ release: true });
const samples = 300;
function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return { samples: sorted.length, p50_ms: sorted[Math.floor(sorted.length * 0.5)],
    p95_ms: sorted[Math.floor(sorted.length * 0.95)], max_ms: sorted.at(-1) };
}
async function measure(fn: () => Promise<unknown>): Promise<number[]> {
  const timings: number[] = [];
  for (let i = 0; i < samples; i++) { const start = performance.now(); await fn(); timings.push(performance.now() - start); }
  return timings;
}
try {
  const input = request(); const proof = await backend.prove(input);
  const firewall = new VerifierFirewall({ backend, trustedImageId: await backend.imageId(),
    replayStore: new MemoryReplayStore(), allowSimulation: true });
  for (let i = 0; i < 30; i++) { await backend.prove(input); await firewall.verify(proof, input.public_inputs); }
  const denied = structuredClone(proof); denied.public_outputs = { allow: false, violations_mask: 8 };
  const invalidReceipt = JSON.parse(Buffer.from(proof.proof_bytes, 'base64').toString('utf8')) as { statement_hash: string };
  invalidReceipt.statement_hash = '0'.repeat(64);
  const tampered = { ...proof, proof_bytes: Buffer.from(JSON.stringify(invalidReceipt)).toString('base64') };
  let sideEffects = 0;
  const reject = (value: unknown, reason: RegExp) => assert.rejects(
    firewall.execute(value, input.public_inputs, async () => ++sideEffects), reason);
  const prove = summary(await measure(() => backend.prove(input)));
  const verify = summary(await measure(() => firewall.verify(proof, input.public_inputs)));
  const deny = summary(await measure(() => reject(denied, /POLICY_DENIED/)));
  const invalid = summary(await measure(() => reject(tampered, /INVALID_RECEIPT/)));
  assert.equal(sideEffects, 0);
  const report = {
    measured_at: new Date().toISOString(), backend: backend.name, security_profile: backend.securityProfile,
    includes: 'Rust release worker, persistent local IPC, JSON and TS firewall; warm; no network',
    node: process.version, os: platform(), arch: arch(), cpu: cpus()[0]?.model, total_memory_bytes: totalmem(),
    image_id: proof.elf_image_id, proof_bytes: Buffer.from(proof.proof_bytes, 'base64').length,
    envelope_bytes: Buffer.byteLength(JSON.stringify(proof)), process_rss_bytes: process.memoryUsage().rss,
    simulation_prove: prove, verify_allow: verify, reject_policy: deny, reject_tamper: invalid,
    target_reject_p95_under_5ms: (deny.p95_ms ?? Infinity) < 5 && (invalid.p95_ms ?? Infinity) < 5,
    all_observed_rejects_under_5ms: (deny.max_ms ?? Infinity) < 5 && (invalid.max_ms ?? Infinity) < 5,
    disclaimer: 'Simulation only. Not a ZK benchmark or a universal latency guarantee.',
    rejection_categories: { reject_policy: 'POLICY_DENIED', reject_tamper: 'valid JSON receipt with altered statement_hash; INVALID_RECEIPT' },
  };
  mkdirSync('tests/benchmarks/results', { recursive: true });
  writeFileSync('tests/benchmarks/results/latest.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes('--enforce-5ms')) assert.equal(report.target_reject_p95_under_5ms, true);
} finally { backend.close(); }
