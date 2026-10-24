# Synthetic campaign separating prover and verifier

The `circuit_campaign` binary exercises the real Horizon library and
Bulletproofs 5.0.0. It creates no business authorization, no financial effect
and no store. The expectations, public keys, policy and time of each
request are inputs of the **synthetic testbed**, not parameters to be accepted
from a client in an authorization service.

```sh
cargo build --manifest-path labs/horizon/Cargo.toml --locked --release --bin circuit_campaign
labs/horizon/target/release/circuit_campaign generate --vectors vectors.json --output new-prover-directory
labs/horizon/target/release/circuit_campaign verify --requests new-prover-directory/verification-requests.ndjson --output new-verifier-results.json
```

On Windows, append `.exe` to the binary. `node scripts/cargo.mjs` can replace
`cargo` when rustup is not in the PATH. The two commands are separate
processes; `generate` does not call the verifier. The second process
needs only the public NDJSON. It is not, by itself, network isolation,
an independent container or an external audit.

## Inputs and outputs

`--vectors` receives a JSON array of 1 to 10,000 strict objects:

```json
[{"id":"boundary-1","category":"valid-boundary","amount":"4294967296","cap":"8589934591"}]
```

`id` is unique. `id` and `category` match `[a-z0-9-]{1,64}`, like the
JavaScript vectors and the oracle. The amounts are canonical `u64` decimal
strings: `0` is admitted as a negative campaign input; signs, spaces,
leading zeros, floats and overflows are refused. No expected verdict
is accepted in these vectors. File limit: 4 MiB.

The output directory must be new, with an existing parent. It contains:

- `prover-results.json`, schema `horizon-circuit-prover-v1`, `status:complete`,
  hashes of the vectors and requests, counters and `cases` array.
- `verification-requests.ndjson`, one public request per line, exactly
  `{id,test,expected_accept,request:{presentation,expected,trust,policy,now_ms}}`.

Each case in the report contains `id`, `category`, `amount`, `cap`,
`native_accept`, `native_a_accept`, `native_b_accept`, the optional
`native_a_error`/`native_b_error`, `request_count`, and
`generation:{a_ns,b_ns,direct_a_ns?,direct_b_ns?}`. `native_accept` is the
conjunction of the two observations; a correlator must also examine
**each** A/B observation. The expected native errors, in this order,
are `AMOUNT_RANGE`, `CAP_BELOW_AMOUNT`, `DIFFERENCE_RANGE`.

The source numbers are deliberately public and synthetic to allow the
BigInt/Octave/MATLAB/Rust comparison. This is not a confidentiality
experiment against a verifier unaware of these numbers. The random
openings, private keys and witness objects are never serialized in
these outputs. Each `Fixture::with_values` generates new keys and
openings with `OsRng`, and each new proof uses this secure randomness.
The fixed logical time `1800000000000` serves only for the interval tests.

`verify` produces the schema `horizon-circuit-verifier-v1`, `status:complete`,
hash of the NDJSON read, counters and `cases:[{id,test,accepted,error?,duration_ns}]`.
It **never** consults `expected_accept` to decide; only the real
`horizon_proof::verify` function determines acceptance and error, with explicit
refusal of `Disclosure` payloads. The external correlator must compare
the identifiers, families, codes, hashes and line counts, not only
the success counter. A normal cryptographic rejection yields `accepted:false`
and a process exit code of 0; malformed input or an execution fault
yields a non-zero code and does not constitute a completed campaign.

## Exact families

For each arithmetically valid pair, 16 requests are produced:

| `test` | Expected result / code |
| --- | --- |
| `a_valid` | accepted |
| `b_valid` | accepted |
| `b_scalar_corruption` | `INVALID_RANGE_PROOF` |
| `a_challenge_transplant` | `INVALID_RANGE_PROOF` |
| `b_authority_key_substitution` | `INVALID_SIGNATURE` |
| `b_issuer_signature_corruption` | `INVALID_SIGNATURE` |
| `b_holder_signature_corruption` | `INVALID_SIGNATURE` |
| `b_policy_epoch` | `POLICY_MISMATCH` |
| `b_reuse_forbidden` | `REUSE_FORBIDDEN` |
| `b_expected_context` | `CHALLENGE_MISMATCH` |
| `b_subject_transplant` | `SUBJECT_MISMATCH` |
| `b_expired_challenge` | `CHALLENGE_EXPIRED` |
| `b_future_challenge` | `CHALLENGE_EXPIRED` |
| `b_expired_evidence` | `EVIDENCE_EXPIRED` |
| `b_trust_epoch` | `TRUST_EPOCH_MISMATCH` |
| `b_evidence_join` | `EVIDENCE_JOIN` |

The B corruption increments the canonical scalar `t_x` of the Bulletproofs 5 format
and checks that `RangeProof::from_bytes` still decodes it. The holder then
signs the altered presentation. The A transplant keeps the proof,
changes the nonce in the presentation **and** in the expected challenge, then signs
with the real holder. These refusals must reach `INVALID_RANGE_PROOF`,
not merely fail at parsing or at the signature. The other mutations
exercise distinct boundaries; an unchanged input serves as a control.

For each invalid pair, two requests are produced:
`a_direct_bypass` and `b_direct_bypass`, both expected with
`INVALID_RANGE_PROOF`. After recording the native A/B refusals, the program
directly calls `RangeProof::prove_multiple_with_rng`, with the same
transcript domains and attestations, without calling the native check.
The candidate values are `a.wrapping_sub(1)` and `c.wrapping_sub(a)` as
`u64`, and the blindings are `r_a` and `r_c-r_a` as scalars.

This wrapping is a determined attack strategy, not a correct
transformation of signed integers nor an exhaustive search over all
malicious provers. The verifier always derives `A-G` and `C-A` from the
original signed commitments. When the subtraction overflows, the candidate
commitments may therefore differ from the expected ones; the rejection tests this binding too.
Each candidate carries a valid holder signature. The internal tests
include **valid** direct A/B candidates to check the parity of
encodings and domains with the library.

A campaign of 4,096 cases produces 8,192 initial proofs/candidates, that is, two
per case. The derived corrupted presentations are not counted as
new proof generations. The families are chosen by a local integer
relation independent of the native result; the correlator must compare
this classification against the computations of the other runtimes.

## Bounds, preservation and measurements

Files are created with `create_new`; no existing result is
replaced. Paths containing `..` or an observed symbolic link are refused.
This assumes a trusted local filesystem: these checks do not prove
resistance to races by an administrator modifying the directories.
An error leaves partial outputs in place. A report that is absent, empty,
incomplete or without `status:complete` must not be presented as successful.

The NDJSON is read as a stream: 64 KiB maximum per line (line ending included),
1 GiB per file and 200,000 requests. The `(id,test)` pair must be unique.
The synthetic reports are kept in memory under these bounds. Durations
are integer nanoseconds limited to `2^53-1` for exact JSON reading.
They provide neither warm-up, nor IID repetitions, nor reliable p95/p99,
nor SLA. Fixture emission, parsing, outputs and IPC are excluded.
`b_ns` includes preparation and presentation signing; the direct phases
include generator construction, unlike the fixed generators
cached by the native library. The first native call may initialize
these generators. These phases must not be compared as equivalent cost
profiles.

```sh
cargo test --manifest-path labs/horizon/Cargo.toml --locked --bin circuit_campaign
cargo clippy --manifest-path labs/horizon/Cargo.toml --locked --bin circuit_campaign -- -D warnings
```

The internal tests cover the real boundaries, the precise errors,
the re-signed attacks, the independence of the verdict from `expected_accept`,
malformed inputs, duplicates and the refusal to replace outputs.
They do not prove cryptographic soundness, the truth of an issuer,
non-correlation, post-quantum security or the atomicity of a remote API.
