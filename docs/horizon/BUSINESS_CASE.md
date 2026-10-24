# HORIZON — conditional business case

Status: **October 17, 2026**. **No prospect, customer funding, purchase
commitment or economic gain has been secured.** The current decision funds
only laboratory time in the repository; it does not demonstrate the existence
of a market. The selected scenario and the alternatives are documented in
[the market discovery](MARKET_DISCOVERY.md) and
[the prior art](NOVELTY_AND_PRIOR_ART.md).

## 1. Work proposed to the hypothetical customer

A recipient of a claim authorization could verify that an attested eligible
amount does not exceed an attested delegation limit, without receiving either
amount. It would have to accept the authorities, the issuance format, the
computed relation and the currency checks. The current trial records only
`record_claim_authorization` on a synthetic target. It does not connect to a
payment rail.

The commercial problem is not "needing ZK". It would be a real case where the
decision is blocked or costly because the recipient requires a verifiable
computation and cannot receive the values, while another authorized party can
produce the proof. This case has not been observed. If all parties can receive
the documents, or accept the verdict of a trusted signer, the simple baseline
may win.

## 2. Economic elements actually consulted

The joint LMA/LIMOSS/Vitesse press release of **November 24, 2025** announces
a renewal of at least three years of the FCP service. It states that all
managing agents have access and that more than 700 binders are then active.
It mentions 2.3 billion dollars tied up in loss funds and a reduction potential
of up to 80%. These are the operators' figures and objectives, not an
independent assessment nor gains attributable to HORIZON.
[Press release, pages 1–2](https://limoss.london/content/uploads/2025/11/FCP-Contract-Renewal-Press-Release-24-Nov-2025.pdf).

The useful consequence is the existence of an infrastructure and of actors who
are already organized: the commercial entry would have to show marginal value
on a missing control. The stock of loss funds is neither our addressable market
nor a saving recoverable through a bounds proof. A volume of claims or payments
does not automatically become software revenue.

The [Lloyd's reporting standards](https://www.lloyds.com/market-resources/delegated-authorities/market-knowledge/reporting-standards)
define reporting data for coverholders and delegated claims administrators.
They show an existing standardization effort, not the existence of usable
cryptographic signatures nor a right to withhold the documents from control.
The [DDM](https://limoss.london/ddm) documentation presents normalization,
validation and access control: their reuse must be evaluated before proposing
a competing infrastructure.

The review cost per case, the error rate, the frequency of confidentiality
conflicts, the value of delay and the available budget are **unknown**. No
figure for return on investment, market size or pricing is extrapolated.
Savings assertions not retrieved from their primary document are not retained.

## 3. Who would decide, who would pay, who would bear the cost

| Hypothetical party | Role to confirm | Cost or objection to investigate |
|---|---|---|
| Managing agent / delegating insurer | Owner of the control and possible sponsor | Acceptance of the authorities, audit of the rules, budget and liability |
| Delegated claims handler | Prepares the request and may hold the witness | Workflow change, custody of secrets, generation cost |
| Expert or source of the eligible amount | Issues a business attestation | Additional signed format, correction and revocation, liability |
| Admission / payment operator | Verifies and reserves the operation | Availability, recovery, integration with the target, support for refusals |
| Audit, security and legal | Evaluate the documents and the rights | Evidence to retain, access in litigation, leakage through queries and key management |

These roles are not people who were contacted. The software payer is not
necessarily the one who produces the attestations. An offer that saves one
minute at the recipient but imposes a higher cost on the issuers can fail even
if the proof is fast.

## 4. Value model without invented figures

First compute the incremental cost against the best admitted alternative, on
the same scope, then measure:

```text
gain_annuel_observable =
    dossiers_eligibles * minutes_de_revue_evitees / 60 * cout_horaire_complet
  + pertes_evitees_documentees
  - cout_annuel_integration_amortie
  - cout_annuel_emission_et_normalisation
  - cout_annuel_generation_verification_stockage
  - cout_annuel_exploitation_audit_et_reconciliation
```

All these inputs are currently unknown. The avoided-losses term remains zero in
a prudent projection as long as a documented causal link does not allow it to
be estimated. Existing control costs that remain after integration are not
counted as savings. A mathematically valid proof removes neither disputes over
the claim nor audit work.

Generation costs must include preparation, collection, issuance, network and
rejected attempts for a service comparison. Microbenchmarks can isolate these
steps, provided their boundaries are published. A warm percentile over a single
proof does not measure an end-to-end SLA; three generations do not qualify
crisis capacity.
[Limits actually observed on the earlier bench](../08-RISC0-LAB-RESULTS.md).

## 5. Experiment allowing the proposal to be refuted

The laboratory must compare solutions that actually deliver the accepted
service, without silently degrading confidentiality:

| Variant | Useful measurement | Commercial question that remains open |
|---|---|---|
| Public openings and signed attestations | Control time, size, data actually received | Can the recipient legally and contractually receive these values? |
| DSSE-style signed verdict | Time and cost of an attestation bound to the action | Is an authority accepted to compute the verdict? |
| Specialized ranges over signed commitments | Proof/verification cost, adapted issuance, negative tests | Does the non-disclosure benefit justify the issuance change? |
| Reused proof of immutable facts + fresh authorization | Amortization and behavior during revocations | Do the facts remain valid long enough to be reused? |

BBS/AnonCreds/Dock credentials, MPC and TEE are documentary comparison
solutions to qualify if the need justifies it. Reading about them is not an
executed experiment; their performance is not invented in this case file.
Selecting a variant is a matter of the recipient's policy fixed before the
request, never an opportunistic choice by the agent in case of failure.

Synthetic trials can refute a binding, a bound, a cost measurement or
resistance to a failure. They measure neither willingness to buy, nor
reduction of human reviews, nor legal availability of the data. The
[laboratory log](EXPERIMENT_LOG.md) must keep the results, including failures,
without turning a local speedup into a customer gain.

## 6. Crisis and confidentiality: concrete conditions

Under unusual load or during an authority revocation, a request must remain
blocked if the complete proof, the currency of trust or the state of the
operation cannot be verified. The absence of a response after dispatch does not
allow a second dispatch. These requirements concern admission and persistence,
not a property exclusive to ZK.

Availability of funds, solvency, recovery of a payment rail and continuity of
the expert assessment are not covered by the proposed proof. A possible human
exception path would be a separate policy with its own authority, never a
silent fallback after an invalid proof. The laboratory constitutes no
certification of such a process.

Private values must not appear in logs, error reports or artifacts handed to
the verifier. Public commitments, authority identities, order relation, profile
bounds and successive responses still disclose information.
Who may query, how many times and for what purpose must be defined. The
prover's access to the values remains explicit; a prohibition on assembling the
witness requires a different architecture.

## 7. Decision gates and abandonment

| Gate | Required evidence | Current state |
|---|---|---|
| Business control | Identified owner, written rule and scope | Synthetic rule; no customer owner |
| Confidentiality required | Fields forbidden to the recipient and concrete basis | Unconfirmed hypothesis |
| Usable sources | Two authorities agreeing to sign the commitments and their metadata | Fixtures only |
| Insufficient baseline | DSSE, opening, credentials or existing service evaluated by the decision-maker | Comparisons to perform/qualify |
| Security and technical cost | Negative tests, recovery and representative measurements | Laboratory trials executed; no production qualification |
| Economic value | Observed current cost, complete target cost, sponsor and budget | Unknown; no prospect funding |

Abandon or redirect the product if one of the first three gates is refused, if
an accepted alternative satisfies the control at lower cost, or if the measured
value does not cover integration and operations. Possibly keep the results as
an open technical contribution.

**Committee conclusion: GO for bounded research, NO-GO for commercial launch.**
The next decisive fact for the market would be a documented customer control
and a demonstrated non-disclosure need. A faster proof, on its own, provides
neither that need nor a buyer.
