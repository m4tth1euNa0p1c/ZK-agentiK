# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Conventions, security invariants and validation requirements are in
`AGENTS.md` (imported below); they are authoritative. Repository documentation
is in English.

@AGENTS.md

## Commands

Prerequisites: Node 24.11.1 (CI), Rust 1.93.0 through `rust-toolchain.toml`
(including the `riscv32im-unknown-none-elf` target). On Windows, if `cargo`
is not on PATH, use `node scripts/cargo.mjs <args>` instead.

```bash
npm ci --ignore-scripts

# Historical Rust workspace (crates/)
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
cargo test -p policy-statement --locked <test_name>   # one Rust test

# TypeScript (pretest builds zkvm-bridge in debug, then tsc → dist/)
npm test
npm run typecheck
npm run schema:check        # docs/schemas/zkp-envelope.schema.json is up to date
npm run build:guest         # bare RISC-V ELF + inspection (feasibility only)
npm run benchmark -- --enforce-5ms

# A single TS file / test (requires npm run build:rust && npm run build first)
node --import tsx --test packages/zk-mcp-sdk/test/security.test.ts
node --import tsx --test --test-name-pattern "<pattern>" tests/e2e-poc/mcp.test.ts

# Historical MCP demos
npm run demo
npm run demo:critical       # 23 adversarial scenarios, zero additional merges

# Horizon lab (separate Cargo workspace: labs/horizon)
cargo fmt --manifest-path labs/horizon/Cargo.toml --all -- --check
cargo clippy --manifest-path labs/horizon/Cargo.toml --all-targets --locked -- -D warnings
cargo test --manifest-path labs/horizon/Cargo.toml --locked
npm run horizon:build       # release Rust worker + tsc horizon-demo
npm run test:horizon
npm run horizon:demo        # init|serve|demo through scripts/horizon.mjs

# Real RISC Zero lab (opt-in, Linux Docker ≥ 12 GiB RAM, slow CPU proofs)
npm run lab:risc0 -- verify
```

`.github/workflows/ci.yml` is the authoritative list of required checks
(including the Docker Compose smoke test for `deploy/horizon`).

## Architecture

Three independent systems coexist; do not conflate them:

1. **Historical MCP POC** (root Cargo workspace + `packages/zk-mcp-sdk`,
   `packages/enterprise-gateway`).
   - `crates/policy-engine-core`: heap-free `no_std` business core (simple rule
     + critical profile, see `docs/05-CRITICAL-PLATFORM-POLICY.md`). The only place
     where business decisions are evaluated — TypeScript does not reimplement them.
   - `crates/policy-statement`: types, encoding, SHA-256 commitments and journal
     shared by all backends (`no_std + alloc`), reused by `labs/risc0`.
   - `crates/policy-guest-riscv`: guest adapter; the bare ELF is only evidence
     of compilation.
   - `crates/zkvm-bridge`: backend trait, `NativeSimulatorBackend` (discloses
     the witness, not a ZK proof) and bounded JSONL worker binary (`image_id`,
     `prove`, `verify`; 2 MiB, queue of 64, 10 s timeout).
   - `@zk-mcp/sdk` starts this binary from `target/<profile>/zkvm-bridge`,
     validates envelopes (zod), handles canonicalization and the firewall
     (nonce + in-memory operation reservation). SP1/RISC Zero/Magnetar return
     `BACKEND_UNAVAILABLE` there.
   - `enterprise-gateway`: stdio MCP server (`verifiable_gitlab_merge` tool),
     HMAC-signed fixture connectors, simulated GitLab. Chain:
     collection → normalization → Rust worker → firewall → nonce reservation →
     operation reservation → fact reread → deadline recheck → mutation.
     `ZK_MCP_SCENARIO=critical` enables the critical profile;
     `NODE_ENV=production`/`ZK_MCP_MODE=production` refuses startup.
   - MCP result: preserved content + `_meta.zkp` extension
     (specification in `docs/02-ZK-MCP-RFC-SPEC.md`).

2. **`labs/risc0`**: real RISC Zero guest + host and independent verifier,
   run in Docker through `scripts/risc0-lab.mjs`. Public fixtures in
   `tests/fixtures/risc0/`. Not connected to the MCP server.

3. **Horizon program** (`labs/horizon/proof` + `packages/horizon-demo` +
   `deploy/horizon`): a different relation (synthetic insurance claim authorization
   through Bulletproofs/Dalek range proofs). JSONL Rust worker
   (`horizon-proof-worker`, path overridable through `HORIZON_WORKER`), HTTP server
   with two separate roles: `prover` (reads `private.json`) and `verifier`
   (reads only `public.json`), durable SQLite controller (`HORIZON_DB`) with
   states `RESERVED → COMPLETED | REJECTED | UNKNOWN` and SHA-256 chained audit.
   `horizon:init` refuses to overwrite an existing configuration. Documentation
   in `docs/horizon/` (start with `ARCHITECTURE.md` and `FINAL_VERDICT.md`).

Documents to read according to the area changed: `docs/02-ZK-MCP-RFC-SPEC.md`
(wire format), `docs/03-ARCHITECTURE.md` (trust boundaries),
`docs/07-STACK-SECURITY-AND-PERFORMANCE.md` (security model).
Remaining work is tracked in `issues/` (01–10 and `issues/horizon/`).
