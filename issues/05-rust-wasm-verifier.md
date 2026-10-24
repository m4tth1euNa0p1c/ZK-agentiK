# 05 — Deliver an independent Rust/WASM verifier

Milestone: M2. Priority: P1. Dependencies: 01–02, 04.

## User story

As a recipient customer or auditor, I verify an exported bundle locally
without access to the supplier's prover or its private data.

## Technical architecture

Extract a minimal receipt verifier with a signed image/vkey registry.
Compile to WASM only if the real backend supports it; otherwise offer an
honestly documented Rust CLI. Enforce memory/CPU limits, strict encodings,
a dated trust bundle and an explicit revocation policy.

## Acceptance criteria

- Two independent implementations/packagings validate the same corpus.
- Forged bundle, unknown image and expired trust bundle refused.
- No witness, telemetry or implicit network request.
- Historical verification distinct from current authorization when offline.

## Test commands

`cargo test --workspace --locked`, `npm test`.
Add wasm32 and browser tests on real proofs, measure cold/warm and
test the quotas. Do not convert the simulator into a "WASM ZK verifier".
