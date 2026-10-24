# H11 — Necessity review and qualification protocol

Dossier version: **October 17, 2026**. Technical baseline: `684b567`.
Status: **PREPARED, NO CUSTOMER INTERVIEW CONDUCTED**.
This protocol makes the H11 decision verifiable. It does not turn an agent
review, a synthetic demonstration or a contact's interest into commercial
validation. [Verified inventory](INVENTORY_2026-10-17.md),
[H11 ticket](../../issues/horizon/NEXT_EXPERIMENTS.md),
[business model](BUSINESS_CASE.md).

## Decision sought

Identify a real control where the recipient must verify `0 < a <= c`, cannot
receive both values and does not accept delegating this computation to a
signer. An authorized actor must nevertheless be able to gather both values
and openings to produce the current Horizon proof.

The implemented profile is narrower than the inequality alone: **integers in
EUR cents**, `1 <= a <= 2^32` and `0 <= c - a < 2^32`, hence
`c <= 2^33 - 1`. The business owner must confirm these units and bounds, not
only the principle `a <= c`. [Exact relation](FORMAL_STATEMENT.md).

The experiment is refuted for this use case if an accepted alternative
renders the same service at lower cost, if the prover cannot gather the
secrets, or if the control actually requested concerns a cumulative budget.
The per-case limit, the eligible amount and the right to pay are three
notions to distinguish. The proof does not decide the reality of the
insurance claim.

## Participants and minimum documents

Seek, in a review organized by the project lead, the following
responsibilities: owner of the business control, representative of the
sources, security/confidentiality evaluator and owner of the experimental
budget. Several roles may belong to the same organization; a security opinion
distinct from that of the prototype's author must be recorded. These people
are neither identified nor contacted by this dossier.

Use an anonymized process diagram, a written rule, the data categories and
aggregated statistics whose sharing is authorized. No customer file, personal
identifier, private key or real opening is necessary for this review. Keep
interviews and commercial documents in the space approved by their owners;
only an authorized synthesis free of sensitive data may be added to the
repository.

## Proposed agenda, 60 minutes

| Indicative duration | Work | Expected trace |
| --- | --- | --- |
| 0–15 min | Describe a control that actually causes a problem before presenting the product | Operation, actors, rule, frequency, blocking cases, evidence of provenance of these observations |
| 15–25 min | Allocate access rights to the values, the verdict and the metadata | Trust matrix and precise reason for each prohibition |
| 25–35 min | Examine the alternatives and the existing system | Least costly admissible alternative; justification of each rejection |
| 35–45 min | Run the synthetic demonstration and one refusal | Command outputs, commit, effect counter, observed limits |
| 45–55 min | Estimate issuance, integration, operations and exception handling | Sourced inputs of the business model and unknowns |
| 55–60 min | Decide business and security separately | CONTINUE, REORIENT or INCONCLUSIVE; objections kept |

A meeting duration is not a sample size. An interview can refute a
hypothesis; it does not allow estimating a market or an ROI.

## Questions that can invalidate the profile

1. Which decision is blocked today? Which redacted and dated process example
   shows it? Have the issuing and recipient organizations each describe the
   same control. Who bears the risk of refusal and of acceptance? An expert
   opinion does not replace these two confirmations.
2. Why can the controller not know `a`, `c` or either of them? Distinguish a
   documented constraint, a preference and an unverified hypothesis.
3. Who can know **both** values and their openings, including prover
   operators and backup access? Since this actor exists in Horizon, why would
   its signed verdict not be accepted? Distinguish trust in data access from
   trust in the correctness of the computation. A missing answer leaves the
   ZK necessity unknown.
4. Who establishes the amount and the limit? Will these sources compute their
   commitments from their validated data, with unit, case, version, role,
   deadline and revocation? Who funds this issuance change?
5. Is the control a per-case limit or a shared consumable budget? Are there
   deductibles, currencies, rounding, corrections and accumulations? A need
   absent from the current relation requires a new statement before any
   pilot. Synthetic example to submit: two cases of 80 with a limit of 100
   each satisfy the relation; a cumulative limit of 100 would be exceeded.
   This is a question of rule scope, not an attack on Bulletproofs.
6. Which metadata can be seen and correlated? Are the prover's access to the
   secrets, proof correlation and the absence of post-quantum resistance
   compatible with the written requirements?
7. What is the exact authorized action? Who holds the credentials, handles
   `UNKNOWN`, confirms the target state and decides an exception in a crisis?
   The SQLite demo does not yet answer for a remote financial API.
8. Can the decision-maker name a sponsor and a test budget, measure the
   current cost and involve the issuers? Oral interest is not a commitment.

## Comparison with explicit service and trust

Fix before the trial the same rule, the same sources, the action, the
freshness preconditions, the revocation regime and the acceptable access
rights. Remove neither anti-replay nor persistence from the baseline to favor
Horizon. Mechanisms that do not meet the requirements must be dismissed with
a documented reason, not ranked on their speed alone.

| Variant | Decisive question | State in the repository |
| --- | --- | --- |
| Existing system / deterministic control with accessible data | Does it already solve the problem at the accepted cost? | To be observed at the participant |
| Signed attestations + disclosed values | Can the controller receive the values and redo the computation? | Crypto baseline executed; not a business pilot |
| Signed verdict bound to the action, for example DSSE-enveloped | Is a party that knows the values accepted to sign the result? | Alternative analyzed; complete signed-verdict path **neither implemented nor benchmarked** |
| Credentials / selective disclosure / existing predicate proof | Does existing issuance cover the required rule and rights? | Documentary research; comparative qualification not executed |
| Horizon A/B | Must the relation be verified without values and without an accepted third party for the computation? | Real proofs and firewall on synthetic data |
| MPC or other architecture | Do the sources forbid gathering the secrets at the prover? | Outside the current prototype; new workstream to arbitrate |

An agreement to experiment with Horizon requires a verifiable objection to the
best accepted alternative. The faster disclosed baseline is not enough to
justify the private profile; the signed verdict can also hide the amounts from
the controller, with a different trust assumption.

## Reproducible demonstration to show

Prerequisites and versions: [DEPLOYMENT](DEPLOYMENT.md). From the root, with
dependencies installed, use a fresh scenario created by the demo:

```sh
git rev-parse HEAD
npm run horizon:build
node scripts/horizon-fixture.mjs verify
npm run test:horizon
npm run horizon:demo
```

The fixture verifies a public presentation with its historical time; it
authorizes no current operation. The demo creates a new temporary directory,
uses free loopback ports and keeps its local artifacts. Do not publish them:
they also contain the synthetic private configuration. The terminal summary
contains neither witness nor private key.

| Observation to record | Expected value and scope |
| --- | --- |
| Fixture verification | `public_fixture_verified: true`, `live_authorization: false` |
| Demo proof type | `real Bulletproofs + Ed25519`, synthetic sources |
| Tampered presentation, forced disclosure, replay | Refusal; in this demo the tampering targets the holder signature |
| Unauthorized / authorized effects | `unauthorized_effects: 0`, `authorized_effects: 1` on the new local target |
| Recovery and concurrency | The Horizon tests must pass; check the effect counter, not only the error message |

Algebraic tampering of the range proof is covered by the Rust tests and the
campaigns described in [SECURITY_REVIEW](SECURITY_REVIEW.md); do not present
the demo's signature tampering as a new attack on the proof.
The persistent application and the isolated verification in a container are
described in [DEPLOYMENT](DEPLOYMENT.md). An already-consumed database or
expired attestations must remain refused; do not erase them to obtain a
success.

The performance presentation must recall: 672 bytes for the proof alone;
Linux crypto verification p95 1.247 ms; Windows durable path p95 13.014 ms
and maximum 180.310 ms. These measurements are not a promise about the
participant's system. No global ranking against Vega is established.

## Economic measurements to collect

For each variable, note unit, period, population, source, owner, uncertainty
range and method. An unknown value remains unknown, never zero.

- Actually eligible cases, frequency of blockings and share requiring
  non-disclosure; do not take all insurance claims as the addressable market.
- Current work minutes and delays, tasks that would actually disappear, fully
  loaded hourly cost and handling of refusals/disputes.
- Initial cost of each source, of the target and of the control; split between
  organizations and accepted funding of these changes.
- Recurring costs of issuance, correction, revocation, computation, storage,
  IAM/KMS, audit, support, reconciliation and business continuity.
- Cost of the best admissible alternative on the same scope. Avoided losses
  remain zero in a prudent projection without documented causality.

Apply the [BUSINESS_CASE](BUSINESS_CASE.md) model with sourced low, central
and high scenarios. Preregister with the sponsor the economic and operational
thresholds before measuring the pilot. No universal monetary threshold or ROI
is derived from the microbenchmark.

## Decision gates, with no compensating average

| Gate | Elements required to continue | If absent or negative |
| --- | --- | --- |
| G1 — Real control | Owner, rule, scope, profile bounds/units and problem example confirmed by the issuing and recipient organizations | INCONCLUSIVE if unknown; REORIENT if no problem |
| G2 — Confidentiality | Reasoned access matrix, authorized prover access, acceptable leaks for the trial | INCONCLUSIVE if unknown; REORIENT if incompatible |
| G3 — Alternatives | Examination of the signed verdict and existing solutions, verifiable reason for their insufficiency | INCONCLUSIVE if not evaluated; REORIENT if a simple solution suffices |
| G4 — Sources | Issuance owners identified, feasibility and responsibility accepted for a test | INCONCLUSIVE without evidence; REORIENT in case of refusal |
| G5 — Value | Documented current cost, estimated incremental cost, explicit sponsor and test budget | INCONCLUSIVE until measured; REORIENT if value insufficient |
| G6 — Pilot security | Distinct opinion, synthetic scope, stop criteria and H13/H15 work written | Block the pilot in case of an unaddressed defect |

**CONTINUE H11** requires all gates to be justified. This only authorizes the
proposal of a bounded pilot; H13/H15 and the authorizations for that pilot
remain necessary. H14/H17 are required before any real remote effect.
An unknown result blocks a positive conclusion; it does not by itself refute
the need. Unresolved objections remain visible.
An admissible signed alternative refutes a cryptographic necessity of ZK; the
economic decision still requires a complete cost comparison.
Even with all gates satisfied, this only supports this case for a pilot,
without establishing a purchase, a market or the universal necessity of ZK.

## Result sheet to fill in after a real review

```text
Review identifier: NOT ASSIGNED
Date / demonstrated commit: NOT FILLED IN
Status: NOT EXECUTED
Roles present and mandates (non-nominative identifiers): NOT FILLED IN
References of authorized documents / storage location: NONE
Precise business rule and action: NOT CONFIRMED
Who sees a / c / both / the metadata: NOT CONFIRMED
Reason for rejecting or accepting the signed verdict: NOT EVALUATED
Commitment of issuers / sponsor / budget: NONE ESTABLISHED
G1: UNKNOWN; G2: UNKNOWN; G3: UNKNOWN
G4: UNKNOWN; G5: UNKNOWN; G6: UNKNOWN
Commands, public outputs and effect counter: NOT EXECUTED IN REVIEW
Refuted hypotheses / defects / objections: TO BE RECORDED
Business decision: INCONCLUSIVE
Security decision: INCONCLUSIVE
Next experiment, owner, stop criteria: NOT DEFINED
Authorization to share a synthesis: NOT ESTABLISHED
```

The current dossier provides the technical elements to examine. It fills in
no customer field by inference and triggers no external contact.

## Preparation check, October 17, 2026

The commands of the technical path were replayed during drafting:
23 Rust tests and 43 Node tests passed, formatting and Clippy of both
workspaces, strict TypeScript, schema and compilation of the bare guest
passed. The public fixture is verified without any current authorization. The
demo produces a real proof, zero unauthorized effects and a single synthetic
admission. The historical benchmark data is retained; no new performance
measurement is derived from the durations of these tests.

An adversarial re-read by an agent imposed the comparison with the signed
verdict, the visibility of the prover and its operators, the exact
bounds/units and the cumulative-limit case. This check prepares the session;
it constitutes neither a business interview, nor an independent human
opinion, nor an external audit.
