# M3/M4 — Statement of the selected laboratory experiment

Committee decision: GO for a synthetic experiment controlling a delegated
claims authorization; NO-GO for claiming a validated product, cryptographic
novelty or a record against Vega. The business assessment identifies existing
delegation processes but no verified demand backed by an ability to pay.
The challenger requires a signed alternative and rejects comparisons between
different relations. The cryptographer validates the bounds below and requires
authorities to compute commitments from their facts.

## Subject, sources and disclosures

Two synthetic organizations: insurer/delegate provider and controlling client.
Two distinct authority roles attest to the eligible amount and applicable limit.
They sign commitments, not a computation verdict. Each signature binds the schema
version, role, authority, tenant, case, currency and unit, object version, holder
key and validity interval. The client pins keys, roles, policy and allowed mechanisms.

Demonstration action: **record an authorization for a synthetic case**.
This is neither a payment, a provisioning check nor a debit from an aggregate
budget. The limit is per case, not a balance consumed across multiple cases.
The controller rejects a second operation for the same business identity, even
with a new nonce.

Public information includes commitments, opaque case and authority identifiers,
tenant, currency, version, policy, holder key, dates, action and verdict.
Presentations are linkable. The profile does not promise Vega's anonymity or
unlinkability. Values and their openings remain with the prover unless policy
explicitly allows the disclosed baseline.

## Arithmetic relation

G and H are the fixed `PedersenGens::default()` generators from Bulletproofs 5,
in the prime-order q Ristretto group. No prover-supplied generator or invented
primitive. Authorities compute and sign:

```text
A = a G + r_a H     C = c G + r_c H
x = a - 1          d = c - a
X = A - G          D = C - A
```

Witness: `(a, c, r_a, r_c)`. The aggregated 2 × 32-bit `RangeProof` proves
knowledge of openings of X and D with:

```text
0 <= x < 2^32    and    0 <= d < 2^32
```

Thus `1 <= a <= 2^32` and `a <= c <= a + 2^32 - 1 <= 2^33 - 1`.
The domain is represented as `u64`, not `u32`. These bounds and `2^33 - 1 < q`
exclude a modular-wraparound interpretation modulo q in this relation. Binding
to the attested values relies on the commitments' binding property and on
those authorities attesting to openings in the same integer domain.
Signatures are verified **outside the circuit**, over the exact points;
this contract requires adapted issuance. It is not equivalent to a proof over
arbitrarily signed existing credentials as in the Vega application.

## Three strategies and baseline

**A — fresh specialized proof.** The Merlin transcript binds the attestations,
the relation and the complete action challenge. A new proof is produced for each
operation. Original signatures are still verified.

**B — reuse of an immutable proof.** The range proof binds the immutable
attestations and the relation. A fresh Ed25519 holder signature covers the
complete bundle digest (including the proof), client, tenant, object, operation,
policy/epoch, trust registry/epoch, dates and nonce. This composition provides
fresh authorization by the holder key over a historical proof, not fresh
knowledge of the witness and not a recursive proof. Full proof verification
remains possible without a cache. Any cache stores only immutable cryptographic
validity, never current authorization.

**C — constrained selection.** The verifier's policy chooses between A, B and
signed disclosure. A confidentiality requirement prohibits disclosure. A ban on
reuse requires A. A missing backend or unknown policy causes failure; no
guarantee is weakened to save time.

**Non-ZK baseline.** Same pair of attestations and same action; the prover
reveals values and openings. The client verifies signatures, commitments,
bounds and comparison. This baseline is relevant if these values may be
disclosed, or if an accepted third party can sign the verdict directly.

## Freshness and effects

The proof does not establish the current time or revocation state. The controller
loads its own expectations, verifies cryptography, then rereads time, policy,
keys, revocations and challenge within its transactional boundary before
consuming the nonce and reserving the operation. The `UNKNOWN` state remains
consumed. The sandbox can implement the target and audit in a single database;
this property does not automatically extend to a remote financial API.

Wire details are fixed by the prototype's serialized types and are experimental
(`horizon/1`). No change to the historical MCP wire format is required.
