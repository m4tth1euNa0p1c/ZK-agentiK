# Comparison with declared scopes

Date: October 17, 2026. The complete measurements and CIs are in
[BENCHMARK_RESULTS.json](BENCHMARK_RESULTS.json). The scientific references and
cryptographic limits are developed in [STATE_OF_THE_ART](STATE_OF_THE_ART.md).

## References actually executed

| Experiment | Proof / presentation | Verification | Size | What it covers |
| --- | ---: | ---: | ---: | --- |
| Vega MC SHA-256 1 KiB, 8 threads | 52.656 ms | 20.548 ms | 86,933 bytes | Criterion central estimates, upstream SHA proof |
| Vega MC SHA-256 2 KiB, 8 threads | 65.836 ms | 19.885 ms | 96,583 bytes | Preparation excluded from the proof column |
| Vega SC SHA-256 1 KiB, 8 threads | 93.260 ms | 28.214 ms | 85,948 bytes | Single-circuit SHA relation |
| Vega SC SHA-256 2 KiB, 8 threads | 231.090 ms | 74.444 ms | 94,572 bytes | Same upstream bench, different size |
| Horizon A after optimization, 1 thread | p95 6.546 ms | p95 1.228 ms | 672 bytes | Two-range relation, signatures outside the proof |
| Horizon B after preparation, 1 thread | p95 0.065 ms | p95 1.247 ms | 672 bytes | Fresh signature over a historical proof, complete verification |
| Signed-disclosure baseline | p95 0.160 ms | p95 0.245 ms | No ZK proof | Values and openings disclosed |
| Horizon B + IPC + durable controller, Windows | Presentation excluded | p95 13.014 ms | Complete JSON envelope | Verification and SQLite effect; without HTTP/network |

**These rows do not constitute an overall ranking.** The relations,
disclosures, phases and environments are not all equivalent. Proof sizes are
not message sizes: the envelopes and their quantiles are published separately.
Vega and the Horizon cryptographic functions ran in the same Linux 8 CPU /
12 GiB environment; the durable bench is Windows/Node.

The Vega paper announces 92 ms / 23 ms / 108 kB for its credential-presentation
application, with separate preparation and a particular Azure machine. The
pinned public repository provides SHA-256 benches, not that complete circuit.
Reproduction of **these application figures remains blocked by the relation
not being provided**, not by a demonstrated mathematical failure of Vega.
Sources: [paper, §8](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/05/Vega_Low-Latency-Zero-Knowledge-Proofs-over-Existing-Credentials.pdf),
[pinned code](https://github.com/microsoft/vega-prover/tree/c0ee259053cd12eaf43ed71b5cde375452b3ee4d).

The historical RISC Zero benchmark was preserved and its receipts re-verified.
Its DevSecOps relation and its in-guest signatures differ from this range
relation. No speedup factor relative to the 154–163 seconds is scientifically
justified without implementing a strictly common relation.

## Alternatives that can win

| Alternative | When to prefer it | What is missing for this exact profile |
| --- | --- | --- |
| Signed verdict / DSSE | An accepted third party can evaluate the data | Trust in that computation and its disclosure to the third party |
| Signed disclosure + native rule | The controller may know both values | No confidentiality of these values |
| BBS / selective disclosure | Revealing chosen signed attributes is sufficient | The inequality between hidden attributes requires a complementary mechanism |
| AnonCreds / predicate proofs | Compatible format and issuance model | Compare the same multi-authority predicate, the binding to the action and the integration costs |
| Vega / credential circuit | Existing credentials, hidden signatures and private presentation | Complete relation comparison still to be performed |
| RISC Zero / SP1 / zkVM | Complex policy, reuse of deterministic code | VM cost and in-relation signatures to measure on the same task |
| MPC | Sources cannot share their witnesses even with a prover | Coordination, availability and multiparty protocol to qualify |
| TEE | Accepted hardware trust assumption and low latency required | Attestation, patching, rollback and side channels |

The primary sources for each family are in the state-of-the-art and prior-art
files. The Lloyd's DCA/FCP and BIS Mandala solutions prevent presenting
delegated control, pre-validation or proof of compliance as territory without
competitors. The commercial problem remains to be qualified.

## Measured advantage and novelty limit

The only controlled improvement with unchanged relation and format is the
retention of public generators in our library: A proof p95 reduced by 15.75%,
B verification p95 reduced by 44.97% across these two campaigns. The earlier
public proof is still verified. The derivation of fixed public points is
removed from the hot path; no verdict, witness or source of randomness is
hidden. This is a known optimization applied here, **not a cryptographic
invention**.

The non-ZK baseline is less costly. It wins if disclosure is permitted. The
private profile becomes useful only if the controller must know neither amount
nor limit, and if the authorities accept the adapted signed commitments. This
constraint has not yet been validated with a buyer.
