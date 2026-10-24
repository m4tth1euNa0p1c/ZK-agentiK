# ZK-agentiK / zk-MCP

This repository develops an experimental protocol proposal and a DevSecOps POC.
Read `docs/02-ZK-MCP-RFC-SPEC.md` before changing the wire format and
`docs/03-ARCHITECTURE.md` before changing a trust boundary.

## Conventions

- Rust 1.93.0, edition 2021; `cargo fmt --all -- --check` and
  `cargo clippy --workspace --all-targets -- -D warnings` must pass.
- Strict TypeScript, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`;
  no `any` or global disabling of checks.
- The core and guest remain `#![no_std]`: no network, clock, RNG, floating point,
  system dependency or hash-map iteration order in evaluation. Timestamps and
  salt come from the host; wire integers are bounded and errors are blocking.
- Do not reimplement cryptography. Use SHA-256 for this profile's commitments.
  A hash, a signature and a ZK proof provide different guarantees.
- Conventional Commits: `feat(sdk): ...`, `fix(gateway): ...`,
  `docs(rfc): ...`, `test(bridge): ...`. No automatic commit/push required.
- Dependencies locked in Cargo.lock and package-lock.json. Unimplemented
  backends return an explicit error, never simulated success.

## Invariants

The simulator discloses its witness and is NOT a ZK proof. It is prohibited
in production mode. Mutation credentials belong to the firewall, never to the
agent/prover. Verify before any side effect. Bind audience, tenant, action,
project, MR, SHA, rule, commitment, nonce and expiration.
Consume the nonce atomically before mutation, including under concurrency.
An ambiguous API failure does not release the nonce. Never accept a policy,
image, backend URL or verification key selected by the agent.
Also reserve the business operation independently of the nonce: a new challenge
must not reauthorize the same mutation. Recheck deadlines after every wait
before dispatch. An `UNKNOWN` state requires reconciliation; the POC's
in-memory stores do not guarantee recovery.

## Validation and evidence

Run `cargo test --workspace --locked`, `npm test`, `npm run typecheck` and
the Rust checks above. An authorization boundary change requires a negative
test observing zero external mutations. Add shared Rust/TS vectors for any
encoding change. Measure through `npm run benchmark`; do not turn a local
result or a figure from a paper into a universal SLA.
Compiling the bare guest is not evidence of execution under SP1/RISC Zero.

## Local skills

- `.agents/skills/zkp-riscv-guest/SKILL.md`: core/guest and ABI boundaries.
- `.agents/skills/mcp-protocol-security/SKILL.md`: MCP, metadata and firewall.
- `.agents/skills/devsecops-connectors/SKILL.md`: fact collection.
- `.agents/skills/qa-benchmark-runner/SKILL.md`: adversarial tests and measurements.

These files are portable Markdown instructions. Codex discovers `.agents/skills`;
other clients can read them explicitly or import them into their skills
directory. Do not promise automatic discovery everywhere.

## Horizon, Proofkit and publication

Read `docs/horizon/FORMAL_STATEMENT.md` and `docs/horizon/ARCHITECTURE.md`
before changing the Horizon profile or its controller. Deterministic `no_std`
applies to the historical core/guest; the Horizon prover uses a cryptographic
RNG. Do not remove its randomness to obtain a deterministic benchmark.

The `packages/proofkit-sdk` SDK centralizes the verified-tool contract;
proof and storage adapters are trusted. No durability, confidentiality or
post-quantum guarantee follows from a mere descriptor.
Horizon MCP uses a presentation distinct from the historical zk-MCP envelope.
Do not encode a Bulletproofs proof in the RISC-V schema without a new RFC.

For this scope, add to the root checks: `npm run horizon:build`,
`npm run test:horizon`, `npm run test:proofkit`, `npm run test:risc0:gpu` and
`npm run proofkit -- check`. Respect separate Cargo workspaces. Do not run a
performance campaign concurrently with compilation or another benchmark.

Additional skills:
- `.agents/skills/scientific-whitepaper/SKILL.md`: sources, mathematics, LaTeX.
- `.agents/skills/evidence-publication/SKILL.md`: claims and public candidate.
- `.agents/skills/cloud-proof-infrastructure/SKILL.md`: Azure/GCP boundaries.
- `.agents/skills/proof-workflow-automation/SKILL.md`: GitHub Actions, proofs and sandbox.

When multi-agent work is requested, assign paths and have a different agent
review the author's work; use the contracts in `.agents/roles/`. An agent
review is internal and never closes the need for an external cryptographic audit.
Unknown commercial facts remain unknown. Do not invent customer interviews.

The correlated harness `scripts/circuit-campaign.mjs` uses shared synthetic
BigInt / Octave / Rust vectors; MATLAB is an explicit separate execution.
For this scope, run `npm run test:circuit`, the `circuit_campaign` binary's
tests and a bounded campaign. Preserve all compressed public candidates,
hashes and rejection codes. Do not count an out-of-domain candidate as a valid
proof; the correlator must reject an incomplete campaign.
Correctness-run timings must not become benchmarks.

Preserve dated observations and errors. MATLAB, Octave, paper derivations,
finite models, application tests and cryptographic proofs are not interchangeable.
SHA-256 binds artifacts without certifying their date or truth.
Old measurements do not validate new transports.
