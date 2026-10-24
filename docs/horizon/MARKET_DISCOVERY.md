# HORIZON — business discovery and adversarial selection

Research frozen on **October 17, 2026**. This dossier explores at most five
domains. It complements the [prior art](NOVELTY_AND_PRIOR_ART.md) and the
[business case](BUSINESS_CASE.md). The sources below were opened; a vendor
announcement is distinguished from an independent measurement. No prospect
was contacted, no real financial data collected.

**Research committee decision: GO for a falsifiable laboratory of case 1;
NO-GO for a product or a commercial niche declared validated.**
The selected action is `record_claim_authorization` in a sandbox. It records
a synthetic authorization; it triggers no payment. The committee brings
together integration, cryptography, business research and independent
challenge. This decision does not constitute a validation by an insurer.

## 1. Conditions sought

A lead must combine three distinct elements:

- **A — control**: a decision-maker applies an explicit rule before an action.
- **B — data**: facts from different authorities must be joined; a real
  restriction prevents the verifier from receiving certain values.
- **C — weakness**: the existing process has a measured cost, delay or defect.
  An unknown weakness is noted as such, with no invented figure.

A rule on a confidential amount does not make ZK necessary. If the issuer can
compute the verdict and sign it under an accepted policy, that solution is a
reference competitor. If nobody is authorized to know the whole witness, an
ordinary central prover does not satisfy B.

The repository's earlier results demonstrate only the cost of another
relation: three authorizing RISC Zero proofs produced in 153.681 to
163.232 seconds on CPU, warm verification p95 of 13.697 ms. They justify
trying a specialized relation; they measure neither an insurance process
nor the new laboratory. [Measurements and limits of the earlier bench](../08-RISC0-LAB-RESULTS.md).

## 2. Shortlist of five domains

| Domain | A: documented control | B: multi-party private facts | C: observed weakness | Research verdict |
|---|---|---|---|---|
| 1. Bounded authorization of a delegated insurance claim | Documented delegation limit; precise numerical control to be contractualized | Eligible amount attested by an adjuster and limit attested by the delegating party; disclosure restriction **hypothetical** | Review cost, error rate, delay added by this control **unknown** | Limited laboratory retained; commercial demand not validated |
| 2. Insurance coverage above a threshold | Coverage verification | Insurer/broker, insured and recipient; often a single authority suffices | Marginal cost of a private proof **unknown** | Prior art too direct; dismissed as novelty |
| 3. Compliance of a cross-border payment | Checks before payment instruction | Banks and authorities of several jurisdictions | Incremental gain of our mechanism **unknown** | Mandala already occupies the general problem |
| 4. Double financing of an invoice | Detection of already-financed documents | Competing lenders, private documents and states | Risk acknowledged by vendors; locally avoidable loss **not measured** | Shared registry and adoption are decisive; not a simple threshold circuit |
| 5. Parametric insurance claim with multiple private sources | Trigger according to observation and contract | Sensors, remote sensing, insured, insurer | Operational cost and confidentiality need **unknown** | Close scientific prototype; persistent oracle problem |

### Case 1 — bounded authorization of a delegated insurance claim

Lloyd's guidance of May 2023 describes a documented delegation and authority
limits of delegated claims handlers; it distinguishes a per-claim limit from a
per-delegation-contract limit (§3.27–3.30, printed page 12).
It supports **A**, not an obligation to use ZK. The applicability and the
contract terms of a future pilot remain to be verified.
[Guidance on Lloyd's Claims Lead Arrangements](https://assets.lloyds.com/media/722c1caa-960f-43c9-a210-3635038f25d7/Guidance-on-the-Lloyds-Claims-Lead-Arrangements-0523.pdf).

The laboratory proposes two synthetic authorities: one attests an eligible
amount `a`, the other a limit `c`. Both amounts remain private; the recipient
verifies `1 <= a <= c`, with the same case, currency, version and period, as
well as the profile bounds described below. There is no public payment amount
in this relation. This model encodes neither an entire policy nor the legal
validity of an insurance claim. It does not verify a payment order and does
not handle a cumulative limit: that would also require a current accounting
state and an atomic reservation.

The adjuster and the delegating party are plausible roles, not acquired
partners. The holder who generates the proof knows the values and their
openings. The recipient learns the commitments, the issuers and the
satisfaction of the bounds. The right to hide `a` or `c` from the recipient is
not demonstrated; the complete documents may remain necessary for an audit or
a dispute.

The market already has DDM, which normalizes and validates bordereaux with
access controls, and FCP, which organizes the funding and settlement of
delegated claims. These services are potential integration points and
functional substitutes; they prevent presenting the control as an empty
market. [LIMOSS DDM](https://limoss.london/ddm),
[LIMOSS FCP](https://limoss.london/fcp).

**Hypothetical buyer:** head of claims controls at a managing agent, with
payment operations and security. The delegated claims handler and the adjuster
are parties to convince, not necessarily the payers.
**Commercial abandonment:** value sharing acceptable, signed verdict
sufficient, no measurable review cost, or refusal of the adapted issuance.

### Case 2 — proving minimum coverage without revealing the total limit

Patent publication **WO2021030246A1**, §0119, explicitly describes a proof
that coverage exceeds a requirement without disclosing its full amount. It was
published on February 18, 2021. The existence of this description refutes the
general novelty of the case; it does not establish that a deployed product
executes this mechanism. [Publication text](https://patents.google.com/patent/WO2021030246A1/en).

**Hypothetical buyer:** professional buyer or supplier risk manager.
**Synthetic protocol:** insurer signs coverage, scope and period; recipient
compares with its threshold. **Decisive alternative:** insurer directly signs
the required predicate, or selective-disclosure credential.
**Abandonment:** absence of a necessary second relation, or an existing
contract that already grants access to the policy. The secret limit alone
does not constitute a defensible advantage.

### Case 3 — prior compliance of a cross-border payment

The BIS describes in Mandala a proof of compliance before payment initiation,
with ZKP and multi-party computation. Phase 2 notably targets an empirical
evaluation of the benefits. This is direct prior art for the general concept,
not a measurement of our implementation's performance.
[Project Mandala, page updated November 30, 2025](https://www.bis.org/project/mandala).

**Hypothetical buyer:** bank, head of payments compliance.
**Synthetic protocol:** two control attestations and one canonical instruction
bound to a test policy. **Abandonment:** proposal identical to existing work
without a precise gap confirmed by a bank. An MCP variant does not by itself
create a distinct market.

### Case 4 — preventing the double financing of an invoice

MonetaGo presents Secure Financing as an operational solution for detecting
duplicate financing, using encryption and confidential computing, with
integration into the Swift ecosystem. These are vendor statements; neither its
avoided losses nor its effectiveness have been audited here.
[MonetaGo, offering and history](https://www.monetago.com/).

**Hypothetical buyer:** head of trade finance or lender network.
**Synthetic protocol:** local registry of two lenders, invoice commitment and
concurrent reservation attempt. **Abandonment:** real need centered on network
coverage or identifier quality. A correct proof over an incomplete registry
does not prove the absence of debt elsewhere. Access rights and coordination
remain harder than the inequality.

### Case 5 — parametric insurance with private observations

Hao, Qian and Chau published in May 2023 a parametric insurance construction
verifying claim validity and authenticity of private sources, with an Ethereum
prototype on wildfires. The study is technical prior art; it proves neither
commercial adoption nor data certification.
[Privacy-preserving Blockchain-enabled Parametric Insurance](https://arxiv.org/abs/2305.08384).

**Hypothetical buyer:** parametric insurer and observation provider.
**Synthetic protocol:** two sensors sign bounded observations; proof of a
threshold and of their attachment to a period. **Abandonment:** unreliable
sensors, already-public observation, or sufficient signed decision.
Proving the computation does not make the insured event authentic.

## 3. Experiment retained by the committee

The committee retains case 1 for its finite and refutable relation, not for
an established commercial superiority. Three variants must share the same
synthetic data, authorities and sandbox action:

1. **A: specialized proof.** Two amount commitments, attested by distinct
   authorities; publicly verified signatures and Bulletproofs range proofs.
   Issuance must know the openings and attest their meaning. The relation is
   `A = aG + rA H`, `C = cG + rC H`, with `Range32(A - G, C - A)`. It covers
   `x = a - 1` and `d = c - a` in `[0, 2^32 - 1]`, hence `a` in `[1, 2^32]`
   and `c` in `[a, a + 2^32 - 1]`. Amounts are `u64` integers; issuers must
   build their commitments from the authoritative facts within these bounds.
   The Dalek Ristretto generators `G/H` are fixed by the profile.
   This is not a comparison of two arbitrary `u64` values: a value outside
   the profile bounds must be refused, even if it would be lawful under
   another contract.
2. **B: controlled reuse.** Reuse a proof covering immutable facts, then
   verify a fresh holder signature over the complete action, the proof
   identifiers, the policy and the trust epoch. Revocation and uniqueness are
   verified at admission. A reused proof does not turn an old fact into a
   current fact.
3. **C: choice by disclosure policy.** Compare with signed open values and a
   DSSE signed verdict. The mode is imposed by the recipient; a proof error
   must never trigger a less protective disclosure or authorization.

Range primitives are already available in
[the Dalek Bulletproofs library](https://github.com/dalek-cryptography/bulletproofs).
Their existence does not constitute a HORIZON result. This specialized profile
is neither Vega's mDL relation nor the earlier RISC Zero guest. A gain between
them would be a gain of **relation and profile**, not a demonstrated speed-up
of the same computation.

The scenarios must include overrun of each bound, substitution of
case/currency/authority, invalid signature, replaced commitment, altered
proof, expiration, revoked epoch and concurrent replay. Zero target writes are
expected for every refusal. A failure between reservation and write must lead
to an explicit reconciliation, not to a new authorization.
The actual results and the measurement limits belong to the
[experiment log](EXPERIMENT_LOG.md), not to this market study.

## 4. Confidence level and conditions for reexamination

| Element | Level and reason |
|---|---|
| Existence of the delegation control | High on the 2023 Lloyd's text; fit with the pilot contract unknown |
| Existence of the cited prior art | High on their texts; maturity and adoption variable |
| Existence of the DDM/FCP services | High on operator documentation; local effectiveness not audited |
| Real restriction of access to both amounts | Unknown; no contract or business contact validating B |
| Cost of the existing control and buyer budget | Unknown; no observation of case files or purchase intent |
| Advantage of the specialized circuit | Hypothesis to be measured on the selected hardware and relation |

Reexamine the decision only with a concrete dossier: exact control, rights of
each party, attestable data, acceptable baseline, current cost and economic
threshold. No microbenchmark result closes these questions.
