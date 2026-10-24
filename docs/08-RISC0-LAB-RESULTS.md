# First real backend: results from October 15, 2026

**Four RISC Zero `Succinct` proofs were generated and verified locally:
three authorizing critical decisions and one denial caused by the emergency stop.**
The separate verifier accepts the former and refuses to authorize the latter
after cryptographic validation. The MCP server remains in simulation; this
historical testbed triggers no mutation.

The feasibility of proved computation is established on these fixtures.
**The cryptographic rejection target below 5 ms and the synchronous flow with
a 30 s challenge fail on this CPU configuration.** Confidentiality of critical
secrets remains unqualified, for the reasons documented in
[the security model](07-STACK-SECURITY-AND-PERFORMANCE.md).

## Actual measurements

| Measurement | Authorizing critical profile | Denied critical profile |
| --- | ---: | ---: |
| Number of proofs produced | 3 | 1 |
| Generations, in order (s) | 153.681; 163.232; 158.619 | 157.560 |
| Warm verification, p50 / p95 / max (ms) | 13.048 / 13.697 / 14.343 | 12.921 / 13.822 / 14.723 |
| Tampered-seal rejection, p50 / p95 / max (ms) | 6.394 / 6.950 / 8.640 | 6.355 / 6.718 / 7.485 |
| Signed native evaluation, p50 / p95 / max (ms) | 0.039 / 0.054 / 0.106 | 0.041 / 0.073 / 0.210 |
| Cryptographic seal (bytes) | 222,668 | 222,668 |
| Public journal (bytes) | 324 | 350 |
| Proof + journal JSON bundle (bytes) | 298,510 | 298,582 |
| Total cycles / segments | 1,310,720 / 2 | 1,310,720 / 2 |
| User cycles | 1,061,928 | 1,053,743 |

JSON reports retained unchanged:
[critical](../tests/benchmarks/risc0-cpu-2026-10-15-critical.json),
[denied](../tests/benchmarks/risc0-cpu-2026-10-15-denied.json).
The timestamped context of the denied run is retained in
[environment.json](../tests/benchmarks/risc0-cpu-2026-10-15-environment.json);
it does not provide start and end times for the earlier critical run.

Generation includes the `r0vm` subprocess call and backend checks on an
already-built installation. It excludes compilation, collection, network,
API and Docker startup. This is not a measurement of infrastructure cold
startup. Three samples cannot estimate a service p95; the generation report's
`p95_ms` is only an empirical quantile, here the maximum.

Verification and rejection are repeated 100 times, after 10 warmup verifications,
on the same receipt loaded into memory. Verification time includes the
cryptographic check and journal bindings. Rejection time is measured with one
bit changed in the middle of the complete seal, directly in the cryptographic
verifier: neither expiration nor a JSON error can explain the rejection.
File loading, Base64 decoding and process startup are not included in these
warm measurements. The quantile convention is described in the
[measurement protocol](07-STACK-SECURITY-AND-PERFORMANCE.md).

The first two authorizing proofs have different bytes. This does not
demonstrate a ZK property. The `independent_proofs_differ: false` field in the
denied scenario means that only one proof was produced, not that the prover
is deterministic. An initial exploratory attempt without precompiles was
interrupted without a result; no speedup factor is inferred from it.

## Machine and computation identity

- Windows x64 host, Intel Core Ultra 7 265F, approximately 32 GiB of RAM.
- Docker Engine 28.5.2, Linux WSL2 `6.6.87.2-microsoft-standard-WSL2`.
- Container limited to **8 CPU, 12 GiB**, `RAYON_NUM_THREADS=8`, without network
  during generation and verification; no remote proving service.
- Image `rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922`.
- Host Rust 1.98.0, RISC Zero guest toolchain 1.97.0, `rzup` 0.5.0,
  `r0vm` and SDK 3.0.6; host and guest lockfiles retained.
- `Succinct` proof, development mode prohibited, segment `po2=20`,
  session limit 16,000,000 cycles. SHA-256 and Ed25519 precompiles pinned
  in [the guest manifest](../labs/risc0/methods/guest/Cargo.toml).
- RTX 5060 Ti 16 GiB GPU present but **not used**. No GPU figures.

The cgroup reached its 12 GiB ceiling over its lifetime, with no OOM event
or process killed by the OOM killer. This counter accumulates installation,
builds, cache and tests; **it does not measure the isolated peak of a proof**.
A capacity campaign must reset counters for each execution and measure
concurrency. The 12 GiB is a tested limit, not guaranteed production sizing.

SHA-256 of the proved ELF:

```text
53cbbc340bc8ab586353893f22d64daf5ffa756a41c798a55db203ca3ee9d29e
```

Native RISC Zero image ID, eight `u32` words:

```text
[2022839068, 257765873, 776957775, 296799569,
 1367979543, 1424068181, 2094130782, 3225387710]
```

The rebuilt verifier pins both identities. It does not accept them merely
on the prover's declaration. The fixture manifest contains hashes of public
files and lockfiles; it supports reproduction without being a signed attestation
independent of this repository.

## Security tests executed

| Test | Observed result and scope |
| --- | --- |
| Native / VM journals, base and critical profiles | Identical; real VM execution. The base profile was not subjected to a complete proof in this campaign |
| Invalid signature and modified witness | Guest rejects with `INVALID_SIGNATURE` and `COMMITMENT_MISMATCH` on both profiles; infrastructure errors excluded from successes |
| Tampered seal, wrong image, changed journal, wrong expected project | Rejected by the real verifier |
| `Fake` receipt and `RISC0_DEV_MODE=1` | Rejected; import restricted to the concrete `SuccinctReceipt` type |
| Declared output different from the proved journal | Rejected by the Rust adapter |
| Emergency stop activated, commitment and signature updated | Valid proof of denial; historical authorization rejected with `POLICY_DENIED` |
| Verifier in another container, without witness | Authorizing proof accepted; denial proof cryptographically valid but not authorized |
| Stop / approval changed during operation reservation | Corrected gateway test: reread after reservation, zero mutations, operation consumed; separate simulation test |

These tests demonstrate properties on the tested inputs, not a formal proof
of the absence of bugs or an audit of the cryptographic system.
The guest uses an Ed25519 fixture key whose private seed is published.
The signature tests the mechanism without authenticating a real supplier.
The complete stack is not post-quantum with this signature.

Software checks passed: **14 Rust tests in the main workspace, 25 Node/MCP
tests, 6 laboratory tests** (2 unit tests and 4 regressions on real receipts),
strict TypeScript types, JSON schema, formatting and Clippy without warnings.
The shared core also compiles for the `riscv32im-unknown-none-elf` target
without `std`. The six dedicated VM executions (two valid, four adversarial)
and four proof generations are separate from unit tests.

For Clippy in the laboratory workspace, `RISC0_SKIP_BUILD=1` prevents the host
Clippy wrapper from propagating to the specialized guest compiler.
This check covers host crates; it does not replace the actual guest build.
The build and fixture checks were then executed without this option, using
the expected real image.

## Reproduce

Prerequisites: working Linux Docker and available memory for the 12 GiB limit.
The initial installation requires network access, disk space and compilation;
proof executions then run offline.

```bash
# Rebuild and verify the two retained public proofs without generating new ones.
npm run lab:risc0 -- verify

# Generate three new authorizing proofs, then one denial proof.
npm run lab:risc0 -- critical 3
npm run lab:risc0 -- denied 1
```

Quick verification succeeds only if the authorizing fixture is accepted and
the denied fixture terminates with `POLICY_DENIED`, not with a reading or
infrastructure error. Each verifier runs in a read-only container without
network access, with only its binary, proofs and public challenges. The prover
retains its container and caches for subsequent builds; it has only a read-only
repository mount. The production Dockerfile remains to be designed.

Historical fixture challenges are deliberately fixed. A `VERIFIED` result
authorizes **no current API call**: the historical verifier has neither a
decision clock, durable anti-replay registry nor credentials.

Laboratory checks after installation:

```bash
docker exec zk-agentik-risc0-lab bash -c 'cd /lab/source/labs/risc0 && RISC0_BUILD_LOCKED=1 cargo test --release --workspace --locked --offline'
docker exec zk-agentik-risc0-lab bash -c 'cd /lab/source/labs/risc0 && RISC0_SKIP_BUILD=1 cargo clippy --release --workspace --all-targets --locked --offline -- -D warnings'
docker exec -e RISC0_DEV_MODE=0 zk-agentik-risc0-lab /lab/target/release/lab-execution-checks
```

Setup installs Clippy in the host toolchain during its network phase.
Hashes of the `rzup` bootstrap and `r0vm` are checked by `setup.sh`.
If a mutable installation URL changes its contents, setup fails; revising
the pin must be explicit.

## New native baseline and decisions

The [new native report](../tests/benchmarks/baseline-2026-10-15-bound-receipt.json)
measures a valid JSON receipt with a modified digest, requiring the error
`INVALID_RECEIPT`. The p95 is 0.267 ms for this rejection and 0.053 ms for
immediate policy denial, over 300 measurements. The simulator threshold passes.
Policy denial does not verify a ZK proof here; the JSON remains a simulation.
Native and RISC Zero reports have different scopes and do not justify an
equivalent-scope performance ratio. The machine was not reserved for a
benchmark: development tasks and the system may affect timings.

Work order arising from the results:

1. **Issue 03: latency budget and measured comparison.** Test the same ELF with
   an `r0vm` built for CUDA, then compare another backend and a signed-verdict
   baseline. The current CPU binary does not become accelerated merely by
   adding `--gpus all`. No GPU gain has been established.
2. **Issues 02/01: freshness and integration.** The 154–163 s CPU path exceeds
   the 30 s TTL before transport or dispatch. Evaluate precomputation for an
   immutable artifact and a final challenge binding; retain complete verification
   before mutation. Do not remove expiration to make the demo pass.
3. **Issue 07: real authorities and confidentiality.** Establish the data actually
   signed, trust registry, revocation, permissions and acceptable leakage model
   with the supplier/customer. Critical confidentiality is a blocking criterion,
   not an established sales argument.
4. **Issue 08: durable firewall.** Connect the backend to the MCP path only with
   transactional storage, target enforcement of preconditions and tests of failure,
   concurrency, expiration and ambiguous outcomes.

The intercompany admission pilot remains a hypothesis to qualify.
This testbed provides proof of execution and an observable cost; it demonstrates
neither a previously unserved niche, economic superiority nor certification.
