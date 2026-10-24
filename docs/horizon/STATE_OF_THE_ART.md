# HORIZON — cryptographic state of the art

Review of primary sources dated October 17, 2026. The figures below are
published by their authors; local executions are recorded separately in
`EXPERIMENT_LOG.md`. HORIZON is an integration experiment, not a new
primitive nor a demonstration of general superiority over Vega.

## 1. What already exists

[Vega](https://github.com/microsoft/vega-prover) provides a Rust proof system
over signed data, with SC and MC circuits and reusable preparation. Its README
exposes SHA-256 benchmarks: `sha256_vega_sc` and `sha256_vega_mc_zkp`. These
benchmarks isolate the proof system; on their own they do not demonstrate the
complete mDL application. The old URL
[spartan2](https://github.com/microsoft/spartan2) currently redirects to
`vega-prover`: these are not two independent integrations to be added up.

The [Microsoft blog of May 21, 2026](https://www.microsoft.com/en-us/research/blog/vega-zero-knowledge-proofs-for-digital-identity-in-the-age-of-ai/)
presents an age proof over an existing credential, with no issuer change. The
SHA-256 hash is split into identical steps; a central circuit verifies the
signatures and the predicate. Lookups extract the authenticated bytes, verify
prefixes and continuity, and select the final digest without exposing the
exact length. The device signature binds a presentation to a nonce.
The sentence announcing at that time a future opening of the code must be read
as of its date, since a public repository now exists. None of these mechanisms
is a nonexistent niche that HORIZON could claim.

[Crescent](https://github.com/microsoft/crescent-credentials) already offers
proofs of possession of JWT/mDL, selective disclosure, bounds, device binding
and repeated presentations. Its README describes the phases `zksetup`,
`prove`, `show`, `verify`, and states that the code has not received a
thorough security audit and must not be used in production. A
preparation/presentation separation is therefore not enough to differentiate
HORIZON.

## 2. Exact relation and construction of Vega

The [MC contract](https://microsoft.github.io/vega-prover/mc/overview.html)
covers `n` instances of the same step circuit and one instance of a central
circuit, linked by a committed shared witness. `n >= 2` is fixed at setup. A
single instance falls under SC. The business circuit belongs to the
application; the engine does not spontaneously prove a business rule, a
signature or the provenance of data absent from its constraints.

The [R1CS form](https://microsoft.github.io/vega-prover/building-blocks/r1cs.html)
is `(Az) ∘ (Bz) = Cz`. The relaxed variant adds a scalar `u` and a committed
error vector: `(Az) ∘ (Bz) = u Cz + E`. The private segments `shared`,
`precommitted`, `rest` allow separating values known before the session from
those determined after its challenges. Linear additions are cheap in
constraints; bit decompositions and hash functions must actually be
constrained.

| Building block | Function useful to Vega | Limit to keep in mind |
|---|---|---|
| [Spartan](https://eprint.iacr.org/2019/550) | R1CS arguments via sum-check and polynomial commitments | Setup transparency does not mean absence of cryptographic assumptions |
| [Nova](https://eprint.iacr.org/2021/370) | Reduction of several instances to one accumulated instance | A folding operation alone is not a verified final proof |
| [NeutronNova](https://microsoft.github.io/vega-prover/building-blocks/neutronnova.html) | Random compression of constraint residuals and then of step instances | Same step form, exact transcript and challenges; not a simple checksum of results |
| [NovaBlindFold / HyperNova](https://eprint.iacr.org/2023/573) | Masking of a real instance by a satisfying random instance | Fresh randomness per proof; masking a hash does not replace this construction |

The two foldings have distinct functions: NeutronNova accumulates the steps,
Nova masks the small verification circuit. The blog's "NeutronNova" link
points to the [Nebula paper](https://eprint.iacr.org/2024/1605), which also
covers machine and memory proofs. To reproduce the MC implementation, use the
book's NeutronNova chapter and the commit actually compiled, without
extrapolating Nebula's EVM results to HORIZON.

The [canonical instantiation](https://microsoft.github.io/vega-prover/building-blocks/fields-and-groups.html)
uses T256, Hyrax and a Keccak256 Fiat–Shamir transcript. The T256 scalar
field coincides with the P256 base field, which eases P256 signature
arithmetic. This is not a full two-curve cycle. The commitments rely on
elliptic group operations: **Vega is neither an entirely hash-based system nor
a post-quantum profile**.

The [security model](https://microsoft.github.io/vega-prover/overview/design-goals.html)
combines soundness of the algebraic arguments, binding and hiding of the
commitments, and a random-oracle-type Fiat–Shamir transformation. The
verifier must pin the key corresponding to the intended circuits. The book
explicitly separates this engine from the credential parsing and signature
choices. This review is neither a proof of composition security nor an
independent audit of the implementation.

## 3. Preprocessing, online cost and acceptance

The [setup](https://microsoft.github.io/vega-prover/mc/setup.html) produces
circuit shapes, commitment parameters and a verification key. The generators
are publicly derived by hashing; no toxic-secret ceremony is needed. The key
digest notably binds circuits and number of steps to the transcript. "Without
trusted setup" therefore means neither "no setup", nor "no memory", nor "the
key supplied by the prover is acceptable".

The [preparation](https://microsoft.github.io/vega-prover/mc/prep.html)
produces a **prover-private** state, distinct from a proof and from a
verification cache. The code may retain matrix-vector products and verifies
the associated public values before reuse. `prove` rerandomizes the
commitments, keeps them consistent between steps and core, then returns the
state for reuse. An authorization result cached in a gateway acquires none of
these properties by analogy.

Blocking integration point: according to the [acceptance contract](https://microsoft.github.io/vega-prover/spec/scope.html),
`verify(vk, num_instances)` returns the public values; the application must
compare them with the expected values independently. Accepting only `Ok`
would allow accepting a valid proof of another statement. Bytes may differ
between two honest proofs; this difference test does not on its own
demonstrate the zero-knowledge property.

The [paper, §8 and figure 10, pages 14–15](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/05/Vega_Low-Latency-Zero-Knowledge-Proofs-over-Existing-Credentials.pdf)
measures a 1920-byte MSO on Azure Standard F16as v7, 16 vCPU, 64 GB; the
signing device is simulated. Published values, in milliseconds:

| Mode | Threads | Setup | Preparation | Online prove | Verify | Proof / pk / vk (kB) |
|---|---:|---:|---:|---:|---:|---|
| SC | 1 | 726 | 351 | 325 | 127 | 91 / 6588 / 6587 |
| SC | 16 | 606 | 158 | 155 | 40 | same |
| MC | 1 | 210 | 390 | 237 | 57 | 108 / 464 / 464 |
| MC | 16 | 51 | 65 | 92 | 23 | same |

The 92 ms exclude setup and preparation. This table is not a local
measurement, a phone result, nor a network service percentile. Microsoft's
May PDF may differ from the [ePrint revision of September 5, 2026](https://eprint.iacr.org/2025/2094);
results must keep their version. Our public SHA benchmarks must not be
renamed "complete age proof".

## 4. Libraries for a specialized experiment

[Bulletproofs](https://crypto.stanford.edu/bulletproofs/) notably targets
range proofs over committed values, without trusted setup. It is a classical
choice appropriate for a small arithmetic predicate; neither Bulletproofs nor
Pedersen commitments constitute a HORIZON novelty.

The [`bulletproofs` crate 5.0.0](https://docs.rs/crate/bulletproofs/5.0.0/source/Cargo.toml)
uses `curve25519-dalek` 4.1.x, Merlin 3, and offers a `RangeProof` API
independent of generic circuits. The published manifest references the
`zkcrypto/bulletproofs` repository. Pin the crate, dependencies and lockfile
actually compiled, instead of inferring compatibility from an old README.

The [RangeProof API](https://docs.rs/bulletproofs/5.0.0/bulletproofs/struct.RangeProof.html)
allows verifying an ordered set of expected commitments. The
[verifier source](https://docs.rs/bulletproofs/5.0.0/src/bulletproofs/range_proof/mod.rs.html)
accepts range sizes of 8, 16, 32 or 64 bits. Loading a proof is not verifying
it. The generators, the number of values, the sizes and the transcript must be
fixed by the application, with bounded input.

The [`yoloproofs` R1CS API](https://github.com/zkcrypto/bulletproofs)
is explicitly experimental and declared unfit for deployment by its authors.
The HORIZON prototype avoids it. No independent audit of our composition is
established here; the publication of a library, a paper or a passing test does
not replace that audit.

## 5. Research decision

The retained experiment is an **admission of an insurance claim case with
amount and limit committed by two authorities**, followed by a simulated
record. It compares a challenge-bound proof, a static proof accompanied by a
fresh holder signature, and disclosure of the same attested facts when the
policy allows it. The formal contract and its limits are in
[`CRYPTOGRAPHIC_DESIGN.md`](CRYPTOGRAPHIC_DESIGN.md).

The compromise changes the issuance contract: authorities must produce signed
commitments. It does not replace without adaptation the existing signed
documents handled by Vega. The niche to validate is therefore operational
integration and data minimization between organizations, not the invention
of private proofs, precomputation or challenge-based authorization.

An admissible comparison keeps the same facts, signatures, bounds, context,
freshness checks and cache conditions. Comparing a RangeProof alone with the
complete Vega mDL or the DevSecOps RISC Zero guest yields **no superiority
ratio**. A library preference remains provisional as long as local
measurements, adversarial tests and issuer needs are not established.
