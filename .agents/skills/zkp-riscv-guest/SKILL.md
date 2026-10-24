---
name: zkp-riscv-guest
description: Develop and optimize the deterministic Rust core and the RISC-V guest adapters of ZK-agentiK, with separation of the witness and the public journal.
---

# RISC-V guest

Read `AGENTS.md`, the relation to prove in `docs/02-ZK-MCP-RFC-SPEC.md`, then
the relevant profile in `crates/policy-engine-core`. The current bare ELF is a
compilation test, not a program executable on all backends.

## Computation boundary

- Keep the core `#![no_std]`, with no heap, floats, clock, RNG, network,
  filesystem, hash-map ordering or dependency on the width of `usize`.
- Use explicit integers, checked operations and bounded sizes.
  A missing/indeterminate state blocks. Do not convert a missing scan into zero.
- `private_inputs` contains the facts and the salt. `public_inputs` contains
  policy, action, evaluation time, commitment and verifier challenge.
- The platform clock does not enter the guest. The instant is public
  and proven; the firewall still checks deadlines at the time of acting.
- In a real guest, recompute the commitments and publish the complete journal.
  A hash performed only by the host does not bind the witness to the proof.

## Porting and optimization

Add one adapter per toolchain/ABI, with pinned versions and an
ELF → native image/vkey manifest. Do not invent a Magnetar API. The business
source stays shared; syscalls, input serialization and journal differ per backend.
For SHA-256/SHA-3/Keccak, use a reviewed library; check the padding
and the exact variants (Keccak is not SHA3). Do not declare the chain
post-quantum because the guest uses SHA-256.

Measure cycles and memory before optimizing: number of hashes,
copies, input sizes, lookup tables, error handling. Keep the
equivalence evidence through shared vectors and boundary tests. Avoid
optimizations that remove a commitment or output check.

## Expected validation

`cargo test --workspace --locked`, `cargo clippy --workspace --all-targets -- -D warnings`,
`npm run build:guest`, then a real prove/verify test only for a backend
actually implemented. Test substitution of the witness, the journal and
the image. Distinguish compilation, native execution, VM execution and ZK proof
in the report. Never enable the simulator for real effects.
