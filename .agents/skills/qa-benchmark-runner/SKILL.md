---
name: qa-benchmark-runner
description: Verify the rules, MCP integration and performance of ZK-agentiK with adversarial scenarios, effect counters and separation of simulation/ZK measurements.
---

# Tests and measurements

Read `docs/04-VALIDATION.md`, the shared fixtures and the critical profile.
The simulator must exercise the real Rust, not a TypeScript imitation.

## Invariants first

Run `cargo test --workspace --locked`, `npm test`, `npm run typecheck`,
`cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`
and `npm run build:guest`. Check the success of each command separately.
Negative tests inspect the absence of mutation and not just a message.

Maintain the cases: 16 base policy combinations, integer bounds,
substituted witness/journal/image, missing proof, unknown backend, recovery after
failure, concurrent replay, expiration during prove/verify, changed facts,
removal of critical controls and emergency stop during the proof.
Run the MCP scenarios on the official client, including stdio.

## Performance protocol

`npm run benchmark` builds the release worker, performs 30 warm-ups and
300 measurements per category. The report distinguishes generation, authorizing
verification, business rejection and corrupted receipt; it keeps p50, p95,
maximum, sizes, machine, runtime and image identifier. The IPC path is included,
remote APIs are excluded. Private buffers do not go into the report.

The command `npm run benchmark -- --enforce-5ms` checks **p95 < 5 ms** for
the two refusal categories. Also keep the observed maximum and report
any overrun. A finite campaign does not prove "systematically less
than 5 ms"; a non-real-time OS does not give this guarantee.

Do not compare the simulator's receipt of a few hundred bytes with the
Magnetar/SP1/RISC Zero proofs. For a real backend: publish version, proof
type, security/ZK parameters, cycles, preprocessing, RAM, threads,
acceleration, cold/warm costs, sizes and results of forged verification.

## Horizon correlated campaign

Read `docs/experiments/circuit/README.md`. `npm run test:circuit` checks the
bench guards. `npm run circuit:campaign -- --cases 128 --output <new-folder> --build`
runs the real prover, a separate verifier and Octave; 1024 and 4096 are the
other authorized budgets. Do not fill the report with mocks. Link
each ID to the exact integer differences, to both proof modes and to the
expected rejection steps. Negative controls include a prover bypassing
the native guards and re-signed algebraic corruptions.

Require matching SHA-256s of the vectors and of the decompressed public corpus,
the complete counters and a completed status. MATLAB requires its own result
and a separate join; Octave alone is not enough. The workflow
`.github/workflows/circuit-validation.yml` provides for this execution.
Correctness durations are descriptive, with no warm-up or SLA claim.
Keep the complete bundle and the negative results, then have the
mathematics, the oracle and the bench re-read by an agent other than their
author when the mission calls for a team. An agent review is not an external audit.
