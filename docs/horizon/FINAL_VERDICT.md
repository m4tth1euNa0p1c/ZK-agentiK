# Horizon verdict — October 17, 2026

**GO for a reproducible laboratory. NO-GO for a qualified banking or insurance
product. No record against Microsoft Vega is established.**

The program delivers a real proof library, CLI, API, web application, durable
controller, local deployment and decision file. It shows an optimization of our
own implementation. It demonstrates neither a nonexistent market, nor solvent
demand, nor superiority over the best known reference on an equivalent
relation. Research and negative trials are preserved.

## 1. What was not obvious at the start

The need to prove a small inequality does not require a general-purpose zkVM.
It can be represented by two signed commitments and a range proof, **if the
authorities accept a new issuance contract**. Moving signature verification
outside the circuit is a change of assumptions and disclosures; it is not a
free speedup of a Vega credential.

Cryptographic time is not durable authorization time. After optimization, a
complete B verification has a p95 of 1.247 ms on the Linux bench; the Windows
path with IPC, two synchronous transactions and a SQLite target reaches
13.014 ms at p95. Storage and the operational boundary prevent converting the
first figure into a service promise.

## 2. Mathematical property and optimization

For standard commitments `A=aG+r_aH` and `C=cG+r_cH`, a 2×32 RangeProof over
`A−G` and `C−A` demonstrates `1≤a≤2^32` and `0≤c−a<2^32`, under the
assumptions and bounds of [FORMAL_STATEMENT](FORMAL_STATEMENT.md). The public
signatures bind the points to the authorities, units and case. The amounts are
not revealed to the controller, but the presentations are correlatable.

Preparing fixed public generators through `OnceLock` removes their repeated
derivation from the hot path. Parameters, relation, signatures and transcripts
remain identical; an earlier proof is still accepted. B reuses the immutable
proof while signing each challenge: this provides fresh authorization by the
holder key over a historical proof, not fresh knowledge of the witness.
These techniques are known; no new primitive is claimed.

## 3. Experimental evidence

| Measurement | Observation |
| --- | --- |
| Horizon A, generation p95, before → after | 7.770 → 6.546 ms |
| Horizon B, complete verification p95, before → after | 2.266 → 1.247 ms |
| Presentation B (including signature), p95 after preparation | 0.065 ms; not a new ZK proof |
| Range proof | 672 bytes, excluding envelope and signatures |
| Non-ZK baseline, verification p95 | 0.245 ms; amounts and openings disclosed |
| IPC + verification + durable authorization, Windows | p95 13.014 ms; p99 15.126 ms; maximum 180.310 ms |
| Re-signed canonical algebraic corruptions | 500 refusals before + 500 after; no acceptance observed |
| Tests | 14 historical Rust + 9 Horizon Rust; 25 historical Node + 18 Horizon |

Both crypto campaigns use 500 measurements, 30 warm-ups and five cases. The
durable campaign uses 500 measurements, 30 warm-ups, one prepared proof and
530 independent SQLite targets. The p50/p95/p99 CIs are computed under an IID
assumption that is **not established**; the results remain those of one
machine.
[Structured report, raw data and fingerprints](BENCHMARK_RESULTS.json),
[method](BENCHMARK_METHODOLOGY.md), [log](EXPERIMENT_LOG.md).

The tested attacks cover signatures/proofs, omission, substitution,
confidentiality downgrade, context/tenant, two concurrent nonces, revocation,
expiration, clock rollback, policy change, missing worker, process exit after
reservation and ambiguous result. The refusals tested before effect observe
zero mutations. Reconciliation of an effect already produced does not
redispatch. This does not measure the cryptographic soundness probability.

The Compose deployment generates a real proof over HTTP and records a single
synthetic authorization. After a restart, replay and a new challenge remain
refused. A fresh container without network, mount or witness verifies the
public fixture. The target is a demonstration ledger, never a payment.

## 4. Reference actually surpassed

**Our previous implementation**, with unchanged relation and format: observed
p95 reduction of 15.75% for A and 44.97% for B verification. The gain concerns
the reuse of public parameters. It establishes no external record nor any
general result on another machine.

The Vega SHA-256 SC/MC public benches were executed in the same Linux
environment. The MC 2 KiB case estimates proof 65.836 ms and verification
19.885 ms, excluding preparation. The complete credential-presentation relation
corresponding to the published 92/23 ms is not provided by these benches. It
has not been reproduced. Comparing these numbers with our ranges as a ranking
would be misleading. See [reference comparison](COMPETITOR_COMPARISON.md).

## 5. Targeted business problem

A delegating insurer might want to check that an eligible amount stays under a
per-case limit, attested by two distinct roles, without sharing these values
with a controller. The demonstrator records an authorization bound to the case,
the policy and the challenge. It does not control an aggregate budget,
provisions or the legitimacy of a payment.

Delegation processes and multi-actor controls are documented; DCA/FCP
solutions, attestations and predicate proofs are prior art. **No interview,
committed buyer, price, operational gain or ROI has been verified**. The
five-domain matrix and the abandonment criteria are in
[MARKET_DISCOVERY](MARKET_DISCOVERY.md), the prior art in
[NOVELTY_AND_PRIOR_ART](NOVELTY_AND_PRIOR_ART.md).

## 6. Why not choose something simpler

Choosing something simpler is often the right call. The signed disclosed
baseline is less costly. A signed verdict suffices if an accepted third party
can compute the rule. Selective disclosure suffices if the need reduces to
revealing attributes.

The private profile is justified only if both values must remain hidden from
the controller, no accepted third party can sign the verdict and the
authorities can issue the adapted commitments. If the sources refuse even to
share their witnesses with the prover, this design does not meet the need: an
MPC approach or another protocol must be evaluated.

## 7. Guarantees impossible to claim now

No guaranteed truth of the signed facts, anonymity, post-quantum resistance,
fresh proof of knowledge in B, isolation against the administrator,
confidentiality against side channels, atomicity over a remote financial API,
availability in a crisis or durability tested under hardware failure. No
automatic DORA/GDPR/AI Act compliance nor external cryptographic audit. No GPU
performance, complete energy/monetary cost or total RSS peak.

The 10 ms target for the measured durable path is **refuted on this bench**.
The crypto thresholds alone are satisfied empirically on a narrower relation.
They do not satisfy the requested scientific victory criterion. The historical
RISC Zero backend remains distinct from the production MCP path.

## 8. Cost and industrialization path

The local cryptographic cost is small compared with the work still open:
qualified issuance, integration of two authorities, contractual policy,
key/revocation management, recovery protocol with the target, IAM, audit,
backups and confidentiality qualification. No reliable budget can be derived
from these microbenchmarks. [BUSINESS_CASE](BUSINESS_CASE.md) provides the
cost model and its missing data, without an invented market figure.

Priority: **H11 customer validation**, **H13 provenance** and **H15 audit**,
then **H14 remote target/recovery**, **H17 operations**, **H16 complete cost**.
H12 separately addresses the equivalent Vega comparison. Do not develop a
financial connector or a new primitive before these validations.

## Decision on the acceptance criteria

| Criterion | State |
| --- | --- |
| Microsoft references reproduced or limits documented | SHA-256 reproduced; credential limit explicit |
| Precise need with sources and economic value | Sourced process, precise hypothesis; economic value not validated |
| Real weakness of the state of the art addressed | Private feasibility shown; superiority/commercial necessity not established |
| Formalized relation, real proof, independent verification | Established within the synthetic scope |
| Adversarial tests and non-ZK alternative | Executed; coverage and limits published |
| Reproducible performance | Raw data, locks, commands, source and CIs retained; one machine |
| Usable sandbox, documentation and CI | Delivered and tested locally; no production |
| Technical/commercial file | Delivered, with negative verdict on record and product qualification |

The program is therefore **not declared successfully completed in the sense of
a validated product or a breakthrough against Vega**. The experiments
accessible in this execution lead to a verifiable POC; the steps blocked by the
lack of a complete reference relation, real authorities and economic data are
recorded in the [H11–H17 tickets](../../issues/horizon/NEXT_EXPERIMENTS.md).
