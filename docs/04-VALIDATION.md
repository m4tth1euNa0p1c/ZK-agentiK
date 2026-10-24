# Local validation — October 15, 2026

This document preserves the initial simulator campaign (12 Rust tests and
24 Node tests). The suite has since reached 14 Rust tests and 25 Node tests,
and a separate real backend has produced four proofs: see
[the RISC Zero campaign](08-RISC0-LAB-RESULTS.md). The measurements below remain
those of the first run; they do not describe the new real proof.

## Result and scope

The MCP POC compiles and its local tests pass. **This path does not produce a ZK proof**:
the Rust worker reconstructs a simulation receipt containing the private data.
Jira, SonarQube and GitLab services are fixtures. No real mutation, deployment,
cryptographic audit or commercial customer trial was performed.

The results below were obtained on Windows x64, Intel Core Ultra 7 265F,
approximately 32 GiB of RAM, Node.js 24.11.1, npm 11.6.2 and Rust 1.93.0 MSVC.
Dependencies are locked in both lockfiles. GitHub CI is configured but was
not run remotely in this session.

## Commands executed

| Check | Result |
|---|---|
| `node scripts/cargo.mjs test --workspace --locked` | 12 tests passed: 5 core, 7 bridge; zero failures |
| `node scripts/cargo.mjs fmt --all -- --check` | Passed |
| `node scripts/cargo.mjs clippy --workspace --all-targets --locked -- -D warnings` | Passed, zero warnings |
| `npm test` | Rust/TS build, then 24 tests passed, zero skipped/failed |
| `npm run typecheck` | Passed in strict mode |
| `npm run schema:check` | JSON schema identical to runtime schemas |
| `npm run demo` | MCP stdio client connected; simulated merge authorized; wrong project and tampered receipt rejected |
| `npm run demo:critical` | One complete evidence package authorized; 23 adversarial scenarios blocked; zero additional merges |
| `npm run build:guest` | RISC-V ELF32 compiled, header and entry point inspected |
| `npm run benchmark -- --enforce-5ms` | Rejection p95 criterion <5 ms met on this run |
| `npm audit --omit=dev` | Zero vulnerabilities reported for production dependencies as of that date |

The Cargo shim is used only to locate the rustup executable on Windows.
When Cargo is in PATH, the same commands start directly with `cargo`.
The npm scanner is not a software security audit.
The four local skills also passed the skill-creator's `quick_validate.py`
structure validator.

## Scenarios and invariants verified

- Exhaustive table of the four business rules, integer bounds and exact statuses.
- Independent critical controls: roles/MFA, freshness, revision, window,
  artifact/SBOM/provenance, scans, recovery, canary, incident and stop.
- Shared Python → Rust/TypeScript SHA-256/canonical vectors; rejection of
  ambiguous encodings and nonprintable ASCII statuses.
- Authorization field and receipt tampering: no side effect.
- Simulator prohibited by default; unavailable SP1/RISC Zero/Magnetar rejected.
- Concurrent replay of the same nonce; 32 distinct challenges for the same
  operation; ambiguous API result: no second mutation.
- Witness substitution by a prover, changed facts or HEAD, attempted policy
  weakening: rejected.
- Expiration during proof generation and operation reservation, emergency stop
  activated during proof generation: no dispatch authorized.
- Handshake, discovery and calls with the official MCP client over in-memory
  and stdio transports. Claude Desktop, Cursor and LangChain were not tried.

Critical tests parameterize several cases within one test: the 23 scenarios
are therefore not 23 additional Node tests. Critical-profile security states
are simulated attestations; no artifact vendor signature, real MFA check or
actual restoration is involved.

## Simulator measurement

Measured on October 15, 2026 at 19:30:58 UTC, with a persistent release Rust
worker, 30 warmup iterations and 300 samples per category. The cost includes
local IPC, JSON and the TypeScript firewall; it excludes network and real proof
costs. Policy denial measures the immediate rejection of a non-authorizing
result, not cryptographic verification of a denial proof.

| Operation | p50 (ms) | p95 (ms) | maximum (ms) |
|---|---:|---:|---:|
| Native receipt generation | 0.0871 | 0.1864 | 0.4840 |
| Verification granting authorization | 0.0955 | 0.2134 | 0.6142 |
| Policy denial | 0.0227 | 0.0389 | 0.3443 |
| Tampered receipt rejection | 0.0757 | 0.1727 | 0.3535 |

Receipt: **282 bytes**; JSON envelope: **1,276 bytes**. Recorded RSS is that
of the Node process, not the combined peak memory of all processes.
The benchmark uses the base policy, not the full critical evidence package.
Raw measurements with simulation identity are retained in
[baseline-2026-10-15.json](../tests/benchmarks/baseline-2026-10-15.json).

All rejections observed here were below 5 ms. The script enforces a **p95**
criterion, not a universal bound: load, machine, scheduler and backend will
change the results. No ZK latency target is validated.

## RISC-V feasibility ELF

The `target/riscv32im-unknown-none-elf/release/policy-guest-riscv` binary
is 1,280 bytes; little-endian ELF32, RISC-V machine, entry point 69,844.
Its SHA-256 is:

```text
18e1e40276eab4e61a22cec54e0f12c038aa1db227750d3319e8311cae76e5cc
```

This is a freestanding compilation probe. It does not yet have the input,
journal and termination ABI of a real zkVM. This compilation establishes
neither proved RISC-V execution nor universal binary portability.

## Remaining limitations

The operation and nonce stores are in memory: tests demonstrate neither
durability, crash recovery nor multi-instance exclusion.
Rereading facts does not create an atomic transaction across three services.
The target controller must enforce its preconditions and mutation permissions.

Production requires a real backend, a guest verifying source attestations,
a trust registry, tenant isolation, a concrete target, durable stores and
failure tests. The emergency recovery path is separate from the freeze on
ordinary changes currently tested.
This work and its criteria are described in [the ten issues](../issues/README.md).
