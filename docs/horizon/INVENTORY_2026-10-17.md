# Verified inventory at commit 684b567

Reference state: **October 17, 2026**, branch `feat/horizon-research`,
commit `684b567b5be52c4ddad6a74c401fc28db90b9ff2`.
This document consolidates the inventory supplied by the project lead. The
statistics below are frozen at this commit; later documentation additions
are not included. This is not an external audit.

## Git and CI traceability

Comparison with `d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`: **72 files
modified or added, 48,178 lines added, 3 deleted, 5 commits**.
The lines include raw data and reports; they measure neither the amount of
business code nor any scientific innovation.

| Commit | Paris time, October 17, 2026 | Deliverable |
| --- | --- | --- |
| `3e0f7b9` | 03:54:06 | Baseline and research criteria |
| `80b2202` | 04:14:03 | Specialized proofs and durable controller |
| `353652d` | 04:16:38 | Reuse of public generators |
| `65f7d1e` | 04:31:34 | Experiments, reports and deployment |
| `684b567` | 04:35:40 | Private mount permissions under Linux |

At the time of this inventory check, [PR #1](https://github.com/m4tth1euNa0p1c/ZK-agentiK/pull/1)
is open, in draft, not merged. The two final runs of the reference commit
succeeded: [push](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/38995538208)
and [pull request](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/38995541913).
These are two runs of the same pipeline, not two independent audits.

To redo the historical check without depending on a future HEAD:

```sh
git diff --shortstat d18fe65840d5f1cd9dc6155e404c942dabf2bcc7..684b567b5be52c4ddad6a74c401fc28db90b9ff2
git log --format="%h %ad %s" --date=iso-strict d18fe658..684b567
gh run view 38995538208
gh run view 38995541913
```

## Three paths to distinguish

| Path | What is executed | Decisive limit |
| --- | --- | --- |
| MCP DevSecOps | Deterministic Rust engine, TypeScript SDK/gateway, critical policy, synthetic connectors | Simulation receipt disclosing the witness; no real ZK backend integrated into this flow |
| RISC Zero laboratory | Guest with fixture signature, commitments and policy; Succinct receipts and separate verifier | Broader relation; synthetic sources; no real GitLab mutation |
| Horizon laboratory | Signed commitments, real Bulletproofs proof, fresh authorization and SQLite storage | Per-case limit; synthetic `record_claim_authorization` action; no payment |

Sources: [critical policy](../05-CRITICAL-PLATFORM-POLICY.md),
[RISC Zero](../08-RISC0-LAB-RESULTS.md), [Horizon statement](FORMAL_STATEMENT.md),
[architecture](ARCHITECTURE.md).

## Retained measurements, with their scopes

| Campaign | Observation | Permitted interpretation |
| --- | --- | --- |
| RISC Zero CPU | 3 authorizing proofs, 1 refusal proof; authorizing generation 154–163 s; verification p95 13.70 ms; seal 222,668 bytes | Feasibility of this policy under a zkVM, not an MCP SLA |
| Horizon A, Linux, after optimization | Generation p95 6.546 ms | Fresh proof of the range relation |
| Horizon B, Linux, after optimization | Full verification p95 1.247 ms; presentation p95 0.065 ms | Immutable proof always re-verified; fresh signed presentation, not a new proof of knowledge |
| Horizon, size | 672 bytes | Range proof alone, excluding signatures and envelope |
| Disclosed baseline, Linux | Verification p95 0.245 ms | Same comparison with disclosed values and openings |
| Horizon durable, Windows | IPC verification + SQLite authorization: p95 13.014 ms, p99 15.126 ms, maximum 180.310 ms | Full 10 ms target missed; HTTP and remote target excluded |
| Internal optimization | p95 reductions: generation A 15.75%, verification B 44.97% | Comparison with our initial version, relation unchanged; no external superiority |

The before/after crypto campaigns each have 500 observations per phase,
30 warm-ups and five value cases. The durable campaign has 500 observations,
30 warm-ups and one prepared proof over 530 independent targets. The
statistical intervals assume an independence that has not been established.
The two Linux/Windows environments do not form a single service benchmark.
[Raw data, configurations and fingerprints](BENCHMARK_RESULTS.json),
[method](BENCHMARK_METHODOLOGY.md).

Vega SHA-256 SC/MC was executed locally. Its Criterion estimates are not
request percentiles and its relation differs from Horizon's. The full
credential workload associated with the 92/23 ms figures is not reproduced.
[Comparison and limits](COMPETITOR_COMPARISON.md).

## Delivered validation

At the reference commit: **23 Rust tests** (14 historical, 9 Horizon) and
**43 Node tests** (25 historical, 18 Horizon), that is **66 tests**. The 18
Horizon Node tests comprise 7 integration/security groups and 11 statistics
tests; they are not 18 distinct attack families. The parameterized scenarios,
Docker smoke tests and benchmark corruptions are complementary.

CI checks compilation, formatting, Clippy, types, schemas, bare ELF,
demonstration with a real proof, restart/replay and verification of the public
fixture in a container with neither network nor witness. The 500 algebraic
corruptions before and after optimization are rejected; this number does not
measure the probability of cryptographic soundness. [Security review](SECURITY_REVIEW.md).

## Deliverables and scope

The fifteen deliverables requested in `docs/horizon/`, completed by `AUDIT.md`,
form **16 structured documents at the reference commit**, including one JSON.
They accompany a Rust library, CLI, API, web interface, Docker Compose, public
fixtures, locked dependencies and raw data. The local tickets cover H00–H10
and the still-open experiments H11–H17.

The prover knows both values and their openings. The values are hidden from
the verifier; metadata, commitments and presentations remain correlatable.
The signatures attest an issuer, not the truth of the insurance claim.
Ed25519 and this Bulletproofs/Ristretto profile are not post-quantum.
The local SQLite target does not demonstrate an exactly-once effect on a
remote API. No customer interview, external audit or banking qualification
is established. [Verdict and acceptance criteria](FINAL_VERDICT.md).

The demo creates an independent experiment and keeps its artifacts:

```sh
npm run horizon:build
npm run horizon:demo
```

For the persistent interface, follow [DEPLOYMENT](DEPLOYMENT.md). A loopback
address is not a publication; fixtures expire and a consumed action remains
consumed. Do not reset the old database to redo a demonstration.

## Next fact to establish

The [H11 review protocol](REVIEW_PROTOCOL.md) prepares a confrontation with
a business owner and a security evaluator. It seeks to learn why a verdict
signed by a party already authorized to know both values would not suffice.
The dossier is ready for this review; a customer validation remains to be
obtained. The status remains **GO laboratory, NO-GO qualified product**.
