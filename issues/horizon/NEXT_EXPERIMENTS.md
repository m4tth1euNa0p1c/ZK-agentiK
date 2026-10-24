# Decision tickets after the initial experiment

## H11 — Need validation, P0, product blocker

**Hypothesis**: two organizations want to control the same rule on
amounts they refuse to share with the controller, and accept an
adapted issuance. Potential buyer: delegating insurer, claims control.
Collect, with authorization, interviews and measurements from anonymized case
files: volume, control time, cost of errors, cost of integrating two sources.
**Acceptance**: sponsor identified, non-disclosure constraint documented,
signed/selective-disclosure alternative evaluated and explicit experimental budget.
**Abandonment of the private profile for this case**: adaptation impossible, or
an accepted alternative (sharing of the values / signed verdict) satisfying the
same control at a lower complete cost. A permitted sharing or an accepted signed
verdict refutes the alleged cryptographic necessity, without establishing the
economic balance on its own.
No automatic outreach. Deliverable: sourced quantified model, without customer data.

**Preparation delivered**: [review protocol and result sheet](../../docs/horizon/REVIEW_PROTOCOL.md).
The dossier explicitly confronts the profile with the signed verdict of an accepted
third party, with the joining of the witnesses at the prover and with the costs
imposed on issuers.
**H11 remains open**: no interview executed, sponsor committed or budget validated.
The availability of the dossier and the technical tests do not satisfy this ticket.

## H12 — Identical Vega relation, P1 research

Obtain or rebuild, with an authorized specification, the exact mDL credential
circuit, signature, parsing and proof of possession of the paper. Today the
upstream SHA-256 benches are not enough. Reproduce the same inputs, security, CPU,
preprocessing, memory and sizes before any ratio. `node scripts/horizon-vega.mjs`
reproduces only the published SHA-256 reference. No record in the meantime.

## H13 — Qualified issuance and provenance, P0 security

Two authorities compute the commitment from their validated fact, sign the exact
schema and publish revocation/version. Protocol for handing over the openings, KMS,
access rights and minimization. Evaluate MPC if no actor may know
both witnesses. Tests: substituted source, wrong role, different case file,
out-of-domain value, revocation during dispatch. All mutations refused.

## H14 — Recovery on a remote target, P0 integration

Remote sandbox adapter with idempotency key, ETag/version, status endpoint,
response loss and crash at every transition. Controller's durable database
separated from the target. Accept at most one effect despite two processes and
recovery. Without an adequate target contract: keep UNKNOWN and forbid automatic
retry. Initial tests: `npm run test:horizon`, mandatory extension before production.

## H15 — Cryptographic and confidentiality qualification, P0 security

External audit of domains, commitment generation, relation, parsing, randomness
sources and side channels. Validate metadata leakage/correlation with
the stakeholders. Prove the limits of Ed25519/Ristretto against quantum attacks,
without a post-quantum label. No-Go if an anonymity need is incompatible with this
profile. Tests: `cargo test --locked --manifest-path labs/horizon/Cargo.toml`.

## H16 — Complete cost and load, P1 performance

Repeat independent campaigns on isolated machines, temperature/energy,
RSS per process, failures and throughput at variable concurrency. Measure cold/warm,
network, storage and real source. Evaluate pre-generation of public parameters
without an authorization cache and measure before/after with the same relations.
No gain announced before validation. `npm run horizon:benchmark` produces the raw data.

## H17 — Operations and compliance, P0 before production

IAM/mTLS and separate operator roles, KMS, externally anchored log,
backup/restoration, monitoring, multi-tenant limits, retention and applicable
DORA/GDPR review.
Docker Compose is a local demonstration; it does not satisfy these criteria.
Criterion: operations dossier and independent reviews, no implicit
approval on the basis of the ZK proof alone.
