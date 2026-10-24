# ZK-agentiK research dossier

Work assembled for the repository on **October 17, 2026**. The research and
measurements below are dated **October 15, 2026**; adding them to the repository
does not constitute a new verification of the market or publication landscape.

## Reading guide

**DevSecOps customer presentation: [verified dossier and Teams message](publication/devsecops-client/README.md).**
October 17 review at `1ff00fc`: Jira/Sonar/GitLab fixtures, MCP tested,
RISC Zero receipts independently reverified, Playwright and an AI client
proposed for a pilot.

**Public release preparation and SDK: [publication dossier](publication/README.md).**
[White paper](whitepaper/whitepaper.pdf), [mathematics](../math/),
[artifact registry](../evidence/), [Proofkit tooling](../tools/proofkit/README.md)
and [Azure/GCP comparison](publication/CLOUD_COMPARISON.md). This dossier adds
its dated observations without replacing the historical campaigns below.

**New October 17 campaign: [Horizon](horizon/FINAL_VERDICT.md).**
Adversarial banking/insurance research, Vega SHA-256 reproduction, real
specialized proof, measured optimization and durable sandbox. Its statement
differs from the historical RISC Zero guest.
[Method and data](horizon/BENCHMARK_METHODOLOGY.md),
[relation](horizon/FORMAL_STATEMENT.md), [application](horizon/DEPLOYMENT.md).

[Verified inventory at commit 684b567](horizon/INVENTORY_2026-10-17.md) and
[H11 qualification protocol](horizon/REVIEW_PROTOCOL.md): frozen assessment,
business/security review, alternatives and decision criteria. These documents
do not claim that any customer interview has been conducted.

| Document | Content and scope |
| --- | --- |
| [01 — Initial research and gap analysis](01-RESEARCH-AND-GAP-ANALYSIS.md) | Magnetar, BinarySpartan, Spartan, Lasso, SP1, RISC Zero, Jolt and MCP; links to primary sources and limitations of announcements |
| [06 — Alternatives, niche and adversarial reviews](06-MARKET-NICHE-AND-CHALLENGE.md) | Competitors and prior art, technical/confidentiality/buyer/crisis reviews, supplier–customer hypothesis, go and stop criteria |
| [02 — Protocol proposal](02-ZK-MCP-RFC-SPEC.md) | Experimental `_meta.zkp` envelope, proved relation, bindings, anti-replay and threat model |
| [03 — Architecture](03-ARCHITECTURE.md) | Rust/TypeScript modules, trust boundaries, verification sequence and operational limitations |
| [05 — Critical-platform policy](05-CRITICAL-PLATFORM-POLICY.md) | Deterministic rules, roles, revisions, freshness, scans, recovery and emergency stop |
| [04 — Simulator validation](04-VALIDATION.md) | Initial campaign, MCP tests and native measurements; no ZK proof in this path |
| [07 — Security and performance of the real stack](07-STACK-SECURITY-AND-PERFORMANCE.md) | RISC Zero choice, signature verified in the guest, assumptions, security advisories, confidentiality and measurement method |
| [08 — RISC Zero laboratory results](08-RISC0-LAB-RESULTS.md) | Four real proofs, adversarial tests, CPU measurements, reproduction and consequences for latency and freshness |

The reports are research summaries with their sources and limitations.
Linked third-party papers and code retain their respective licenses.
The initial research is retained as history; report 08 describes the latest
experimental state of this RISC Zero backend. The Horizon laboratory is an
additional experiment on a different specialized relation.

## Retained conclusions

- Prior use of the zk-MCP name and several related offerings were identified.
  No claim of a world's first standard or an untapped market.
- Confidential artifact admission between supplier and customer remains to
  be qualified with both parties and compared with a signed verdict.
- The shared business core and RISC Zero guest produced real proofs on synthetic
  data. The signing authority is a fixture whose private seed is public;
  it authenticates no real supplier.
- The CPU campaign measured 154–163 s for authorizing proof generation,
  13.70 ms verification p95 and 6.95 ms cryptographic rejection p95.
  It validates neither a 5 ms target nor a synchronous 30 s challenge.
- Critical confidentiality, authentic sources, durability, firewall integration
  and crisis operation remain to be qualified. No GPU benchmark had been run
  in that historical campaign; consult the
  [later GPU attempts](experiments/gpu/README.md).

## Code and reproduction materials

- [Rules core](../crates/policy-engine-core/) and
  [shared canonical relation](../crates/policy-statement/).
- [Rust bridge](../crates/zkvm-bridge/), [MCP SDK](../packages/zk-mcp-sdk/) and
  [demonstration gateway](../packages/enterprise-gateway/).
- [RISC Zero laboratory](../labs/risc0/): guest, adapter, verifier,
  pinned versions and locked dependencies.
- [Public receipts and hash manifest](../tests/fixtures/risc0/README.md).
- CPU reports: [critical](../tests/benchmarks/risc0-cpu-2026-10-15-critical.json),
  [denied](../tests/benchmarks/risc0-cpu-2026-10-15-denied.json),
  [denied-run environment](../tests/benchmarks/risc0-cpu-2026-10-15-environment.json).
- Native baselines: [initial](../tests/benchmarks/baseline-2026-10-15.json) and
  [tampered valid JSON receipt](../tests/benchmarks/baseline-2026-10-15-bound-receipt.json).
- [Ten issues and three milestones](../issues/README.md), [agent instructions](../AGENTS.md)
  and [four local skills](../.agents/skills/).

With Linux Docker, `npm run lab:risc0 -- verify` rebuilds the verifier and
checks the two retained receipts without generating a new proof.
The [main README](../README.md) documents the other commands.

Installations, caches, build binaries and environment files are not part
of the versioned dossier. Fixtures and measurements needed for reproduction
are explicitly retained in `tests/`.
