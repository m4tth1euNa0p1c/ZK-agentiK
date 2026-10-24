# SEC-1 — Verifier statement and transcript binding regression suite

Date: 25 October 2026. Status: **local regression suite delivered; not an
external audit (H15 remains open)**. This document records exactly which code
is exercised, which attacks are refused with which code, how the suite was
shown to detect regressions, and what it does not establish.

Backlog entry: `SEC-1` in `docs/development/TASKS.json`. Acceptance:
cross-profile, malformed proof, altered commitment layout and wrong
trusted-verifier parameters rejected; negative cases count zero target
effects; document the exact tested code.

## 1. Code under test

| Layer | File | Functions exercised |
| --- | --- | --- |
| Rust relation | `labs/horizon/proof/src/lib.rs` | `verify`, `range_verify`, `transcript`, `commitments`, `validate_pair`, `check_signature`, `key`, `holder_message`, `decode`, `evidence_hash`, `present_reusable`, `prepare`, `prove` |
| Rust worker | `labs/horizon/proof/src/main.rs` | `Request::Verify` (one JSONL line per call, `deny_unknown_fields`) |
| Controller | `packages/horizon-demo/src/store.ts` | `AuthorizationStore.issue`, `expected`, `current`, `authorize` |
| Tool adapter | `packages/horizon-demo/src/tool.ts` | `createClaimTool` (`verify` with `EVIDENCE_SUBSTITUTION`, `authorize`) |
| Worker client | `packages/horizon-demo/src/worker.ts` | `ProofWorker.request` (maps every refusal to `CRYPTO_REJECTED`) |
| SDK | `packages/proofkit-sdk/src/index.ts` | `defineVerifiedTool.execute`, `snapshot`, `describe` |

New tests:

- `labs/horizon/proof/src/binding_tests.rs` — six unit tests with access to
  the crate's private helpers (`transcript`, `present`, `signed`, `message`).
- `tests/horizon/binding.test.ts` — three integration tests over the release
  worker binary, the SQLite controller and the SDK tool.
- `packages/proofkit-sdk/test/tool.test.ts` — one added test (`SEC-1: …`).

The pre-existing tests are unchanged. `labs/horizon/proof/src/tests.rs`
still covers challenge-field mismatch, transplant across nonces, canonical
`t_x` alteration, forged signatures, swapped roles and join fields;
`tests/horizon/firewall.test.ts` still covers replay, revocation, policy
rotation, clock rollback, crash after reservation and HTTP downgrade.

## 2. Attacks and observed refusals

Codes are the `anyhow` context strings returned by `verify`; the worker
prints them as the first segment of `error`. "upstream" means the refusal
comes from `bulletproofs::RangeProof::from_bytes` or hex decoding without a
crate-specific code; the case is still refused and still counts zero effects.

### Cross-profile and agent-selected parameters

| Case | Rust test | Code |
| --- | --- | --- |
| `presentation.profile = horizon-range-v2`, holder re-signs | `foreign_profile_and_agent_selected_parameters_are_rejected` | `PROFILE_MISMATCH` |
| Evidence `profile`, `version`, `currency` or `exponent` altered | same | `EVIDENCE_PROFILE` |
| Presentation carries `trust`, `policy`, `verification_key`, `backend_url`, `image_id`, `expected` or `now_ms` | same | serde `unknown field` (parse refused) |
| Payload or challenge carries an extra selector | same | serde `unknown field` |

### Transcript mode, label and challenge

| Case | Rust test | Code |
| --- | --- | --- |
| Reusable proof bytes (transcript mode `reusable`) inside a `challenge_bound` payload | `transcript_mode_label_and_challenge_are_bound` | `INVALID_RANGE_PROOF` |
| `reusable` payload while the verifier expects `challenge_bound` | same | `METHOD_MISMATCH` |
| Correct opening disclosed while the policy requires a private proof | same | `METHOD_MISMATCH` |
| Challenge-bound bytes inside a `reusable` payload with the correct `evidence_hash` | same | `INVALID_RANGE_PROOF` |
| Same messages under transcript label `horizon-range-v2` | same | `INVALID_RANGE_PROOF` |
| Evidence message bound under domain `horizon/evidence-pair/v2` | same | `INVALID_RANGE_PROOF` |
| Positive control: upstream prover with this crate's transcript | same | accepted |

### Commitment layout, generators, width and arity

Each layout proof is first checked to be a sound Bulletproof over its own
commitments with the upstream verifier, so the refusal is a binding refusal
and not a malformed proof.

| Case | Rust test | Code |
| --- | --- | --- |
| Unshifted `[A, C]` | `commitment_layout_is_derived_by_the_verifier_not_chosen_by_the_prover` | `INVALID_RANGE_PROOF` |
| Swapped `[C - A, A - G]` | same | `INVALID_RANGE_PROOF` |
| Half-shifted `[A - G, C]` | same | `INVALID_RANGE_PROOF` |
| Pedersen bases `B`/`B_blinding` swapped | same | `INVALID_RANGE_PROOF` |
| 64-bit proof over the correct layout (736 bytes) | same | `PROOF_LENGTH` |
| Single commitment `[A - G]` (608 bytes) | same | `PROOF_LENGTH` |
| Four commitments (736 bytes) | same | `PROOF_LENGTH` |
| 64-bit proof of difference exactly `2^32` | same | `PROOF_LENGTH` |
| Same 672-byte length, other shape: `(n, m) = (64, 1)` over `[A - G]`, `(16, 4)` and `(8, 8)` with copies of the two derived commitments, this crate's transcript | same | `INVALID_RANGE_PROOF` |

The three last shapes pass the length gate: the proof length is
`32 · (9 + 2 · log2(n · m))`, so every `n · m = 64` shape is 672 bytes. They
are refused algebraically because the verifier fixes `n = 32`, `m = 2` (Merlin
domain separation `rangeproof_domain_sep(n, m)` and exactly two derived
commitments). The encoding alone does not pin the shape.

### Wrong trusted-verifier parameters

| Case | Rust test | Code |
| --- | --- | --- |
| Registry keys swapped between authorities | `wrong_trusted_verifier_parameters_are_rejected` | `INVALID_SIGNATURE` |
| Registry names swapped | same | `UNKNOWN_ISSUER` |
| Same authority or same key for both roles | same | `DISTINCT_AUTHORITIES_REQUIRED` |
| Holder key registered as the amount authority (true attestations) | same | `INVALID_SIGNATURE` |
| Both bodies self-signed by the holder, true registry | same | `INVALID_SIGNATURE` |
| Registry key `00…00` or `01 00…00` (small order) | same | `WEAK_KEY` |
| Registry key `ff…ff` (parses as a key, verifies nothing) | same | `INVALID_SIGNATURE` |
| Policy identifier or epoch differs from the challenge | same | `POLICY_MISMATCH` |
| Policy TTL budget `0` or below the challenge lifetime | same | `CHALLENGE_TTL` |
| Registry epoch differs | same | `TRUST_EPOCH_MISMATCH` |
| Verifier clock before `valid_from_ms` or at `valid_until_ms` of the evidence | same | `EVIDENCE_EXPIRED` |

### Malformed proofs and holder binding

| Case | Rust test | Code |
| --- | --- | --- |
| Empty, 16-byte, odd-length, one extra byte | `malformed_proofs_are_refused_without_authorizing` | `PROOF_LENGTH` |
| Uppercase hex of a valid proof | same | `NONCANONICAL_HEX` |
| Non-hex characters | same | `Invalid character 'z' at position 0` (hex 0.4.3) |
| Non-canonical `t_x` scalar (`ff…ff`) | same | `Proof data could not be parsed.` (bulletproofs 5.0.0 `from_bytes`) |
| All-zero bytes; `A` set to `ff…ff` (not a Ristretto encoding, detected at decompression) | same | `INVALID_RANGE_PROOF` |
| `prepared.evidence_hash` names other attestations | same | `PREPARED_EVIDENCE_MISMATCH` |
| Payload or signature taken from another valid bundle without re-signing | `holder_signature_binds_payload_and_verified_names_only_the_expected_statement` | `INVALID_SIGNATURE` |
| Holder signature computed under the issuer domain `horizon/issuer-attestation/v1` | same | `INVALID_SIGNATURE` |
| Cap commitment replaced by a valid point (the amount commitment, or the identity `00…00`), holder re-signs | same | `INVALID_SIGNATURE` (issuer signature) |
| Both bodies consistently renamed to `claim-002`, holder re-signs | same | `SUBJECT_MISMATCH` |
| `Verified` carries exactly the expected statement and `bundle_hash = holder_message` | same | asserted |

### End to end with the target counter (`tests/horizon/binding.test.ts`)

`adversarial bundles: exact worker refusal, SDK rejection and zero target
effects on one nonce` submits sixteen bundles against one issued challenge:
foreign profile, reusable bytes as challenge-bound payload, disclosed opening,
foreign `evidence_hash`, canonical bit flip in the last proof scalar,
uppercase hex, truncated proof, all-zero proof, payload replaced without a
fresh holder signature, changed tenant, attestations from another issuer
pair, and five agent-selected fields (`trust`, `policy`,
`verification_key`, `backend_url`, `image_id`). For each bundle the raw
worker returns `ok:false` with the expected code and no `blinding` string,
the SDK tool rejects with `ToolError REJECTED`, and the counters
`effects / operations / used challenges` stay at `0 / 0 / 0`. The untouched
bundle is then admitted exactly once (`1 / 1 / 1`) and its replay refused.
On the SDK path the "attestations from another issuer pair" bundle is
refused earlier by `createClaimTool` (`EVIDENCE_SUBSTITUTION`), before the
worker; only the raw path observes `INVALID_SIGNATURE`. The SDK's generic
`REJECTED` is deliberate and hides which layer refused.

`misconfigured verifier registry or policy never admits a genuine bundle`
checks eight registry/policy misconfigurations against the raw worker and
runs the real prover against a controller configured with swapped authority
keys through the SDK: rejected, `0 / 0 / 0`.

`verifier output departing from the expected statement is refused by the
controller without consuming the nonce` alters each field of a genuine
`Verified` (tenant, subject, object, operation, method, expiry, not-before):
`AuthorizationStore.authorize` throws `VERIFIED_STATEMENT_MISMATCH` or
`EXPIRED`, counters stay at zero, the nonce remains issued and unused, and
the genuine result is then admitted once.

The SDK test `SEC-1: adapters receive the server-side challenge and frozen
verifier output…` shows that a presentation embedding its own `challenge`,
`verified`, `profile` or `trust` reaches the verifier adapter as a detached
snapshot copy with those embedded claims intact (asserted on the forwarded
object; the copy is not frozen, the frozen values are the challenge and the
verdict), while
`authorize` receives the frozen challenge returned by `expected(nonce)` and
the configured verdict; verdicts with an extra field, another object or a
wrong type never reach `authorize`.

## 3. Regression detection (mutation check)

Each guard below was removed or weakened in `lib.rs`, the six new Rust tests
were run, and the original file was restored. A suite that still passed would
have been worthless; none did.

| Mutation | Tests failing |
| --- | --- |
| `transcript` ignores the challenge (always the reusable transcript) | `transcript_mode_label_and_challenge_are_bound` |
| `commitments` returns `[A, C]` instead of `[A - G, C - A]` | all six (positive controls included) |
| `PROFILE_MISMATCH` check removed | `foreign_profile_and_agent_selected_parameters_are_rejected` |
| `PROOF_LENGTH` relaxed to "even length" | `malformed_proofs_are_refused_without_authorizing`, `commitment_layout_…` |

## 4. Commands executed on 2026-10-25

| Command | Result |
| --- | --- |
| `node scripts/cargo.mjs test --manifest-path labs/horizon/Cargo.toml --locked` | 15 lib tests + 4 `circuit_campaign` tests passed, exit 0 |
| `node scripts/cargo.mjs fmt --manifest-path labs/horizon/Cargo.toml --all -- --check` | exit 0 |
| `node scripts/cargo.mjs clippy --manifest-path labs/horizon/Cargo.toml --all-targets --locked -- -D warnings` | exit 0 |
| `node --import tsx --test tests/horizon/binding.test.ts` | 3 passed, 0 failed |
| `node --import tsx --test packages/proofkit-sdk/test/tool.test.ts` | 10 passed (9 existing + 1 added) |
| `npm run typecheck` | exit 0 |
| `npm run agent:check:full` | PASS, 11 fixed steps exit 0 (root and Horizon `cargo test`, `horizon:build`, `npm test`, `typecheck`, `test:horizon`, `test:proofkit`, `test:circuit`, `test:risc0:gpu` unit tests, `proofkit check`); run twice, before and after the review fixes; final local report `.tools/agent-sessions/2026-10-24T23-10-56-335Z-39140.json` (UTC timestamp, ignored by Git) |
| `npm run test:horizon` | 34 passed (31 pre-existing + 3 added), exit 0 |
| `npm run test:proofkit` | 22 passed (21 pre-existing + 1 added), exit 0 |

## 5. Observations

- **Signed byte order.** The holder signature and the issuer signatures cover
  typed JSON in Rust declaration order, while the worker's JSON output
  (`serde_json::Value`) sorts keys alphabetically. The verifier deserializes
  into typed structs before re-serializing, so interoperability is unaffected,
  but any independent holder implementation must reproduce the declaration
  order. The test mirror in `binding.test.ts` encodes that order explicitly and
  is checked byte-exact against the worker's own deterministic Ed25519
  signature; a future field reordering fails that positive control first.
- **Refusal codes are hidden by `ProofWorker`.** The HTTP/SDK path reports
  `CRYPTO_REJECTED`/`REJECTED` only. The integration test reads exact codes by
  spawning the same release binary for one JSONL line.
- **Refused attempts do not consume the nonce.** The controller consumes nonce
  and operation only at authorization. A refused bundle leaves the challenge
  usable until its expiry; no lock-out or attempt counter exists. This is the
  documented design, recorded here as an open operational question (H17), not
  as a defect of the statement.
- **Width and arity are pinned by the verifier, not by the encoding alone.**
  Shapes whose length differs from 672 bytes (64-bit with two commitments,
  single, four commitments) are refused by length before any algebra. Shapes
  with `n · m = 64` but `n ≠ 32` are also 672 bytes and are refused only by
  the fixed `n = 32`, `m = 2` verification (Merlin domain separation and the
  two derived commitments). The length constant and the fixed `(n, m)` are
  both part of the public statement; changing the profile width requires a
  new profile string, not a constant edit.

## 6. What this suite does not establish

- No external audit: agent-written and agent-reviewed tests (H15 open).
- No statement about the soundness of Bulletproofs, Merlin's Fiat–Shamir, the
  Ristretto encoding or `ed25519-dalek` beyond the pinned versions behaving
  as their documentation states.
- No side-channel, RNG-quality, memory-safety or timing measurement.
- No remote target (H14) and no real issuer (H13): the counted target is the
  local SQLite `effects` table.
- Issuer-side cross-role and cross-domain signatures (the amount authority
  signing the cap body, an authority signing under the holder domain) are not
  exercised: `Fixture` discards the issuer secrets by design. The verifier
  checks each body against the registry key of its own role, so the case is
  covered by construction, not by a test.
- An independent agent review of this suite (25 October 2026) found no
  blocking defect; its findings (672-byte foreign shapes, any-error
  assertions, undocumented SDK-path masking, missing forwarding assertion)
  were applied before this version. The review is internal.
- No post-quantum property; Ristretto/Ed25519 remain pre-quantum primitives.
