// Trusted executable configuration. Never loaded from the evidence catalogue.
import { join } from 'node:path';

export const profiles = Object.freeze({
  circuit: Object.freeze({
    description: '128 correlated synthetic cases: BigInt, Octave, real Bulletproofs and a separate verifier process.',
    postQuantum: false,
    relation: 'Horizon two 32-bit ranges, exact u64 input corpus and adversarial presentations; no external action.',
    required: ['scripts/circuit-campaign.mjs', 'scripts/circuit-correlate.mjs', 'scripts/circuit-vectors.mjs',
      'math/circuit/circuit_oracle.m', 'math/circuit/run_oracle.m', 'math/circuit/Dockerfile',
      'labs/horizon/proof/src/bin/circuit_campaign.rs'],
    steps: (_root, directory) => [{ id: 'correlated-circuit', args: ['scripts/circuit-campaign.mjs',
      '--cases', '128', '--output', join(directory, 'circuit'), '--build'] }],
  }),
  horizon: Object.freeze({
    description: 'Real Bulletproofs fixture verification and synthetic local authorization demo.',
    postQuantum: false,
    relation: 'Two signed Pedersen commitments, two 32-bit ranges; Ed25519 outside the proof.',
    required: ['scripts/horizon.mjs', 'scripts/horizon-fixture.mjs', 'tests/fixtures/horizon/public-presentation.json',
      'tests/fixtures/horizon/manifest.json'],
    steps: () => [
      { id: 'build', args: ['scripts/horizon.mjs', 'build'] },
      { id: 'public-fixture', args: ['scripts/horizon-fixture.mjs', 'verify'] },
      { id: 'synthetic-demo', args: ['scripts/horizon.mjs', 'demo'] },
    ],
  }),
  'risc0-public': Object.freeze({
    description: 'Verify historical public RISC Zero receipts; requires the prepared lab container.',
    postQuantum: false,
    relation: 'Historical signed DevSecOps policy; succinct receipt is not an end-to-end PQ profile.',
    required: ['scripts/risc0-lab.mjs', 'tests/fixtures/risc0/critical-proof.json',
      'tests/fixtures/risc0/critical-expected.json', 'tests/fixtures/risc0/denied-proof.json',
      'tests/fixtures/risc0/denied-expected.json', 'tests/fixtures/risc0/manifest.json'],
    steps: () => [{ id: 'public-receipts', args: ['scripts/risc0-lab.mjs', 'verify'] }],
  }),
  'vega-sha256': Object.freeze({
    description: 'Pinned upstream SHA-256 benches; downloads/builds software, may be lengthy, not the credential relation.',
    postQuantum: false,
    relation: 'Vega SC/MC SHA-256 at pinned commit, not Horizon and not the full mDL application.',
    required: ['scripts/horizon-vega.mjs', 'labs/horizon/reference/vega-Cargo.lock'],
    steps: (_root, directory) => [{ id: 'upstream-sha256', args: ['scripts/horizon-vega.mjs', join(directory, 'reference')] }],
  }),
  math: Object.freeze({
    description: 'Octave integer checks and finite abstract model; not a cryptographic proof.',
    postQuantum: false,
    relation: 'Exact integer range equivalence, boundary vectors, finite local replay model.',
    required: ['math/run.mjs', 'math/run_checks.m', 'math/horizon_checks.m', 'math/Dockerfile'],
    steps: () => [{ id: 'octave', args: ['math/run.mjs', '--build'] }],
  }),
});

export function profileList() {
  return Object.entries(profiles).map(([id, p]) => ({ id, description: p.description,
    post_quantum: p.postQuantum, relation: p.relation }));
}
