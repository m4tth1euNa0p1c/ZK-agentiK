# Internal review of the correlated campaign

Date: **October 17, 2026**. Observed baseline:
`5cf0ee2be456e299a7f7a830d1ac4d907cf85421`, branch
`feat/correlated-circuit-validation`, with uncommitted changes in progress.
Conclusions concern the sources actually read in this pass, not every later
change or an unidentified distributed version. An additional reading of the
code fixed at `e7fc348cc953566fc44b5cdf74e5ebf381cfd205` checked the final
alignment of Rust IDs and categories with `[a-z0-9-]{1,64}`.
The separate test-name validator retains `_`, needed by adversarial families,
and is still called only on these names. New parsing tests were read; the
reviewer did not rerun compilation during the campaign. The Rust hash below
was updated to identify this last reading.

The reviewer is distinct from the authors of the Rust modules, MATLAB/Octave
oracle and orchestrator. The reviewer authored the workflow and its documentation:
review of that subset is therefore a self-review. This separation of roles
remains an **internal agent review**, without an external cryptographic audit
or commercial validation of a critical platform.

## Scope read and checks executed

- [Rust generator and separate verifier](../../../labs/horizon/proof/src/bin/circuit_campaign.rs):
  public corpus, fixture signatures, A/B proofs, mutations and IO limits.
- [Vectors](../../../scripts/circuit-vectors.mjs),
  [orchestrator](../../../scripts/circuit-campaign.mjs),
  [correlation](../../../scripts/circuit-correlate.mjs),
  [HTML report](../../../scripts/circuit-report.mjs) and
  [plots](../../../math/circuit/plot_campaign.py).
- [Integer oracle](../../../math/circuit/circuit_oracle.m) and
  [oracle tests](../../../math/circuit/run_oracle.m).
- [Workflow](../../../.github/workflows/circuit-validation.yml), file contracts,
  primary MathWorks/GitHub documentation and
  [Node tests](../../../tests/circuit/correlation.test.mjs).

Commands executed by the reviewer:

```sh
node --test tests/circuit/*.test.mjs
.tools/actionlint/bin/actionlint.exe .github/workflows/circuit-validation.yml
```

Results: **8 Node tests PASS**, zero failures or skipped tests;
**actionlint 1.7.12 PASS**. Join tests use declared synthetic observations,
not cryptographic proofs. Five additional temporary negative tests ran the
workflow export scripts: public filter, missing artifacts after failure,
hardlink rejected, unavailable MATLAB state retained and rejection of success
with required materials missing. These tests launched neither MATLAB nor a
prover. Fixtures remain under `.tools/`, outside publication.

The reviewer also loaded and recomputed the correlation of the real bundle
`.tools/circuit-smoke-20261017/public` produced by the orchestrator's author:
**128 cases, 1,082 verifications, 118 valid A/B proofs and 138 out-of-domain
candidates, zero disagreements observed**. This reading checked vector and
decompressed corpus bytes against the reports. The reviewer did not rerun
the 1,082 cryptographic verifications; their execution comes from that campaign,
reported by its manifest between `17:02:35.119Z` and `17:02:43.139Z`, without
third-party timestamping. MATLAB was not executed in this bundle.
This first trial predates the separate `octave-selftests.json` file.
It contains **256 distinct cryptographic candidates**: the 1,082 requests
include proof reuse in several mutations, not 1,082 newly generated proofs.

Hashes of this first reviewed bundle, at that local path:

| Artifact | SHA-256 |
| --- | --- |
| `manifest.json` | `a6dc06906be22c6d080a496e208334ce5281a889b61a158953cdb216cdd54104` |
| `correlation.json` | `4aee9bca3b0a29b66f26adc98d285af31938278ef30b07553935d634b1c6eb76` |
| `verification-requests.ndjson.gz` | `985c31c68fdf761c06e7d1ce4c4d010478d929a4d4802832616cfe07ca3d3205` |

## Findings, corrections and status

| ID | Finding | Correction and validation | Status |
| --- | --- | --- | --- |
| C01 | The initial join accepted plausible rows without checking terminal statuses, global counters or corpus identity | Added checks for `complete`, profile, zero effects, non-decisional expectation flag, counters and native errors. Bound vectors to bytes read by the prover; required equal hashes/size for the generated, verified and archived corpus | Source reviewed; rejection tests and archive PASS |
| C02 | Early signature rejection could be confused with a proof-system test | Each family enforces its error code. Algebraic corruption modifies a canonical scalar, then re-signs with the holder. Challenge transplantation is re-signed. Out-of-domain candidates bypass native guards and reach the range verifier | Source and join tests reviewed; no new cryptographic campaign by the reviewer |
| C03 | Initial export omitted figure metadata; the contract later added oracle self-tests | `figures/plot-metadata.json` and `octave-selftests.json` explicitly exported; `matlab-selftests.json` selected in the second job | Corrected in workflow; GitHub execution still to observe |
| C04 | A process declared successful could leave required materials missing | Blocking step after selection; partial bundle retained with missing-file list and statuses | Negative test PASS |
| C05 | The first draft used an undocumented visibility context field | Eligibility based on `github.event.repository.visibility`, rejecting anything other than `public`; no license token added | Source/actionlint checked; actual licensing result still required |

For C01, the reviewer's negative test proposing `status=failed/unknown` was
rejected at `Rust completion/profile`: the author's fix was already present
when it ran. The weakness of the initial version was established by source
reading; it is not presented as an observed cryptographic exploit.

A second internal opinion from the mathematics agent on the Rust code found
no blocker: actual `verify` call, `expected_accept` annotation ignored,
canonical scalar corrupted then re-signed, transplantation and parity check
for the valid direct candidate. The artifact-review agent also reported no
private keys or openings in the public smoke corpus. These opinions are
attributed to their authors; they are not presented as additional tests
executed by this reviewer.

For `a=0` or `c<a`, the hostile candidate's `wrapping_sub` subtraction also
changes the relation to derived commitments: rejection validates the
**complete relation**, without isolating only the range comparator.
Cases with `a>2^32` or `c-a>=2^32` without underflow better isolate the range
constraint. The whole set is not an exhaustive exploration of malicious
prover strategies.

The latest oracle self-tests cover **36 invalid inputs, 11 boundaries and
4,096 reduced-grid pairs**, according to the execution reported by their author.
The corresponding MATLAB results remain to be obtained on GitHub; executing
the same source under Octave does not replace them.

## Coverage and retained limitations

The BigInt relation uses the interval formulation; the oracle guards `uint64`
subtractions before executing them and does not convert large integers to
`double`. Vectors are canonical decimal strings. The dataset includes 32-bit
boundaries, values beyond `2^53`, `u64` extremes, the valid domain and several
invalid families. Determinism applies to these values, never to `OsRng`
cryptographic randomness.

Expected ID and family sets are complete: the join rejects duplicates, missing
or extra rows, incompatible verdicts or the wrong rejection stage. Hashes
bind corpus bytes to both reports; decompression is bounded. They do not make
arbitrarily rewritten reports authentic: code, machine and executions remain
trusted. The MATLAB job compares numerical outputs with Rust results; it does
not reimplement Bulletproofs or itself reverify every proof.

The verifier is another process using the **same Rust library**.
It receives synthetic registries, policies and clocks from the testbed;
this offline mode is not an authorization service accepting client-chosen
trust keys. Signatures are verified outside the range proof. The truth of an
insurance source and the independence of its authorities are not established
by these fixtures.

The export scan and public types examined exclude blinding factors, the
holder's private key and the `disclosure` payload. This scan is an additional
check, not a noninterference proof or a defense against a hostile code author.
Amounts in this experiment are public and synthetic; no confidentiality of
real business data is tested.

Figures come from observed rows, with an explicit restricted view for extreme
values and durations reported without a benchmark protocol. They validate
neither IID, service p95 nor an equivalent-scope comparison with Vega/RISC Zero/GPU.
The campaign triggers no business effect; MCP controller, concurrency and
recovery tests are separate.

## GitHub Actions and MATLAB

Official actions and their commits were consulted; public licensing terms
are detailed in [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md).
Direct PRs use 128 cases and request actual MATLAB. Push to `main` retains
128 cases without MATLAB; dispatch and reusable calls retain their explicit
boolean. No count above 4096 is accepted in this workflow.

Artifact selection also runs after failure without turning the job green.
Failure before export, cancellation or timeout may prevent the bundle.
The token remains read-only; no cloud identity, automatic publication, branch
merge or arbitrary agent command is added. MATLAB execution on GitHub remains
**to be observed** in this pass: an `.m` script, Octave or a theoretically
available license does not constitute MATLAB execution.

## Hashes at the end of source reading

Local SHA-256 hashes, without signature or date attestation.
They identify this pass without automatically tracking later edits.

| File | SHA-256 |
| --- | --- |
| `scripts/circuit-correlate.mjs` | `5eb07243136f8867ef3e1a610d5ca1358f29886492be618b53266cb9c6df4837` |
| `scripts/circuit-campaign.mjs` | `07aa1b119bef2db3c87020b4fc09bc0ed305fed52a0914b4351e36adf25ad132` |
| `.github/workflows/circuit-validation.yml` | `524e50a4149eb7aca23729965b36397e8474ae821c5d69664087c76d3fa82f13` |
| `math/circuit/circuit_oracle.m` | `fa134dee0bb98484249abdb90dbb31cc25439e4f0874eb4aad716b490935be39` |
| `labs/horizon/proof/src/bin/circuit_campaign.rs` | `1b62c042f6195f9055a72af452aef69733925f4a899c4713ddf1856cb489a654` |

No new blocker in the local campaign was identified after the reviewed fixes.
This establishes neither universal absence of defects, an external audit nor
production qualification. Actual 4096-case and MATLAB executions must retain
their own artifacts and dated verdicts.

## Final MATLAB archive review — October 17, 2026

The read-only second review by agent `market_equivalents`, performed after
the extended run, confirms successful `campaign` and `matlab` jobs in
[run 39053041832](https://github.com/m4tth1euNa0p1c/ZK-agentic/actions/runs/39053041832)
on `581dbeb4bf84631bcf5abb9421f706d4d586bca6`. The 15 Linux checksum entries,
4 MATLAB entries, 13 manifest files and 12 source hashes match.
The 108 paths in the new catalog assertion exist.

Observed counts agree: 4,096 cases, 4,086 valid proofs, 4,106 invalid candidates,
36,794 verifications and no disagreement. MATLAB R2026b actually executed the
same vectors. This archive review did not rerun proof generation; the separate
check of the compressed corpus appears in the published inspections and
reverification. No blocker identified; the wording “presentation mutations”
was clarified to avoid implying business mutations. Caveats concerning the
finite sample, the same Rust library, local clock, synthetic sources and
absence of external audit remain applicable.
