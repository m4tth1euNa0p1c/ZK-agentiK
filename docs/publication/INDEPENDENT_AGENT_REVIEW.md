# Adversarial review of the SDK, transports and Proofkit

Date: October 17, 2026. Observed Git base:
`8935cc9e42dee9b2ed32207483a6f7383e37ffc4`, with working tree modifications
under review. This report does not exclusively describe the content of that commit.
Any later modification requires checking whether the conclusions remain valid.

The agent in charge of this review is distinct from the authors of the SDK/transport and of the
CLI. It previously wrote the publication dossier and the cloud foundations:
it is therefore not independent of the project as a whole. This is an **internal
agent source review**, without external cryptographic audit, certification,
academic committee or compliance conclusion.

## Scope actually examined

- [SDK helper](../../packages/proofkit-sdk/src/index.ts) and
  [contract tests](../../packages/proofkit-sdk/test/tool.test.ts).
- [Horizon](../../packages/horizon-demo/src/tool.ts) adapter,
  [MCP](../../packages/horizon-demo/src/mcp.ts),
  [stdio](../../packages/horizon-demo/src/mcp-stdio.ts),
  [HTTP](../../packages/horizon-demo/src/server.ts), as well as store, types and worker.
- stdio transport and protocol of the **installed** version of the MCP SDK 1.32.1,
  in order to check their effective bounds and close callbacks.
- [Bounded transport](../../packages/horizon-demo/src/bounded-stdio.ts) fix
  and [eight budget tests](../../tests/horizon/stdio-budget.test.ts).
- [CLI and artifact verification](../../tools/proofkit/lib.mjs), profiles,
  [catalog](../../evidence/catalog.json) and
  [integrity tests](../../tests/proofkit/integrity.test.mjs).

The search covered authorization before effect, the choice of policy/key/
backend, the expected context, deadlines after waiting, concurrency,
ambiguous results, memory bounds and the meaning of manifests.
The review did not redo the mathematical analysis of the cryptographic primitives,
a production load campaign or an exhaustive dependency audit.

## Findings and fix status

| ID | Finding | Observed fix / validation | Status |
| --- | --- | --- | --- |
| R01 | A sparse JS array could have a huge length with few properties, then inflate during `JSON.stringify` | Fix by the SDK author: length limit and refusal of sparse arrays. The targeted test includes an array of length 1 billion and a small sparse array; zero verification and zero effect | Fixed; test executed by the reviewer |
| R02 | The stdio transport used an MCP input bound of 10 MiB, greater than the helper's presentation bound | Explicit bound of 128 KiB before parsing, then 65,535 bytes at the helper level; child test with an oversized frame without line ending and an effect counter | Fixed; closure and zero effect tested by the reviewer |
| R03 | A client no longer reading stdout could accumulate responses without bound, notably via `tools/list`, outside the helper's `maxInFlight` | Bounded transport: at most 16 in-flight requests, 16 pending responses and 256 KiB of output, including the unread bytes of a Duplex; one active write, 5 s delay, closure and rejection of promises on saturation | Fixed; eight tests and two independent counter-tests executed |
| R04 | The CPU/durable measurements claim omitted the Windows raw data from its sealed list; a JSON's references are not traversed automatically | Addition of the Windows raw data and summary of the retained campaign in `horizon-cpu-observations` | Fixed; final `checkCatalog` passes with 8 claims and 36 artifacts |
| R05 | `readFileSync(fd)` could read beyond the initially verified size if another process extended the file | Explicit read limited to `fstat.size + 1`, at most 128 MiB + 1, then refusal of size/identity/mtime changes | Source fix observed; no exhaustive simulation of filesystem races |

R01 was fixed by the author before this counter-review; the reviewer does not
claim its discovery. R02 to R05 were raised during this review.
The detail of R03 before the fix was reproduced with the real MCP server and
`PassThrough` streams, without consuming its output: 500 `tools/list` requests
of about 59 bytes left **539,892 bytes** pending; 1,000 requests
left **1,079,893 bytes**. The 128 KiB input bound was already enabled.
This test called no authorization adapter and was closed cleanly.

After the fix, the same flood closes the transport. A second counter-test,
leaving an event loop turn between requests so that responses are
actually prepared, closes at the **17th request**: peak of **17,255 bytes**
accounted for, pending request/message/byte counters brought back to zero,
and 1,078 residual bytes in the destroyed stream, that is, a single bounded write.
Suspended promises are rejected; new input is no longer
forwarded. The saturation test of the real `McpServer` also verifies that a
mutation request placed after the flood is never admitted, with zero effect.
The closure does not claim to cancel a mutation already validated and committed.

## Checks performed

First pass executed:

```sh
node --import tsx --test packages/proofkit-sdk/test/tool.test.ts tests/horizon/mcp.test.ts
node --test tests/proofkit/integrity.test.mjs
```

At this pass, **11 SDK/MCP tests** and **12 CLI tests** passed. The SDK tests
use a declared simulation adapter; the two MCP integrations
used the real Horizon cryptographic worker and observed zero effect for a
tampered proof, one effect for the valid request and no additional effect
on replay. They do not prove the atomicity of a remote API.

Additional review fixtures, under `.tools/`, separately verified:
refusal of non-admitted catalog statuses, detection of artifact tampering, refusal of
sensitive paths and `unknown`/`unavailable`/`failed` process results not promoted
to success. No source file or suite was modified by the reviewer.

A deliberate modification of `created_at_utc` and `source.commit` of a
synthetic manifest kept `integrity-verified`. This behavior is
consistent with the `local-clock-unattested` and `semantic_validation:false` fields:
the metadata is self-declared. This is not a proof of authenticity of
the time, the revision or the scientific results. The modification of a
covered artifact, on the other hand, was refused.

Final pass after rebuilding `dist` and wiring the bounded transport:

```sh
node --import tsx --test packages/proofkit-sdk/test/tool.test.ts tests/horizon/mcp.test.ts tests/horizon/stdio-budget.test.ts tests/proofkit/integrity.test.mjs
node tools/proofkit/cli.mjs check
```

Result executed by the reviewer: **32 tests PASS**, zero failures, zero skipped
tests. The catalog check returns `integrity-readable`, eight claims,
36 artifacts and `semantic_validation:false`. The tests also cover
normal drain, oversized output before write, timeout, EOF, stream errors,
single closure, listener removal and a Duplex whose high-water mark exceeds
the transport budget. They do not measure the load of a production service.
No server or subprocess from this review
remained active.

### Digests of the reviewed fixes

SHA-256 of the files at the end of this first pass, without signature or
third-party timestamp. These digests describe that instant; they are not
rewritten to follow later modifications of the catalog:

| File | SHA-256 |
| --- | --- |
| `packages/proofkit-sdk/src/index.ts` | `19ee069bbe5f7d4c45a7a2b15ca7fc6a96629ab56d709ad7b536a145b1c0a17c` |
| `packages/horizon-demo/src/bounded-stdio.ts` | `48ae66aa023f3e60c2e7aadd0eb197b283ca6ff99b68e85cf6ae9e9a9ad6a48f` |
| `packages/horizon-demo/src/mcp-stdio.ts` | `5622f0403231d2b525dbe6b62073c14bf3c6efaf3afb525cfbb74bbd9270d432` |
| `tools/proofkit/lib.mjs` | `c24bb185235aa391bfe43d1ed206abd27ed01299dd1e324b11ae5521eb0b7f84` |
| `evidence/catalog.json` | `9a68294b772f8f021c810283e5b7130a83c6bf97059878ce32bf9a3b37c91aa5` |

## Retained reservations

1. The adapters, configuration, binaries, clock and store are
   within the trust boundary. The helper does not turn a boolean from an
   arbitrary adapter into a proof; `evidenceKind` remains descriptive.
2. The Horizon controller rechecks the epoch and dates in its
   SQLite transactions. The transaction with a remote target remains H14; the local
   operator HTTP routes have no production IAM, in accordance with H17.
3. The path checks refuse symlinks/junctions/hardlinks present
   at the time of the checks. They do not form a sandbox against a hostile local
   writer replacing a parent folder between `walk` and `open`. A publication
   must be prepared in a stable checkout under the maintainer's control.
4. `check`/`verify` cover the explicitly listed artifacts. They verify
   neither transitive references, nor the truth of an assertion, nor a complete old
   Git history. Untracked file names and machine paths
   in some reports must be reviewed before public publication.
5. Local bounds and finite tests do not constitute DDoS resistance,
   an SLA, a side-channel analysis or a multi-tenant assurance.

## Counter-review of the manuscript and automation

Second documentary pass of **October 17, 2026**, on the same Git base and
the evolving working tree. The reviewer read the
[LaTeX manuscript](../whitepaper/whitepaper.tex), its
[bibliography](../whitepaper/references.bib), the
[numerical model](../../math/horizon_checks.m), the READMEs, the catalog,
the [Azure](../../infra/azure/) and [GCP](../../infra/gcp/) foundations, as well as
the three workflows [quality](../../.github/workflows/ci.yml),
[publication](../../.github/workflows/evidence.yml) and
[proof/sandbox](../../.github/workflows/proof-sandbox.yml). No new
cryptographic or numerical campaign was executed during this pass.

### Mathematical assertions and measurements

- The deduction `1 <= a <= 2^32` and `0 <= c-a < 2^32` requires extractable
  knowledge, binding to the authoritative openings and bounded source domains.
  The manuscript keeps these assumptions; it does not confuse the existence of a
  Pedersen opening with knowledge. The `u64` source values remain
  strictly below the group order; the `c >= a` guard precedes the
  unsigned subtraction in the numerical model.
- The relation establishes neither the business truth of the sources, nor cumulative total, deductible or
  remaining budget. Mode B reuses an immutable proof with a fresh signature,
  without announcing a new proof of knowledge at each presentation.
- The size of 672 bytes concerns the aggregated 2 x 32-bit proof, excluding signatures
  and envelope. It agrees with the serialization formula documented by
  [RangeProof 5.0.0](https://docs.rs/bulletproofs/5.0.0/bulletproofs/struct.RangeProof.html),
  consulted independently during this pass. The
  [Bulletproofs](https://eprint.iacr.org/2017/1066) paper, its 2022 revision and
  [RFC 9496](https://www.rfc-editor.org/rfc/rfc9496.html) were also consulted.
- The 24,510 pairs, ten boundaries and 20 states/160 transitions are finite
  tests, not a refinement proof of the TypeScript code, the storage or
  Bulletproofs. The execution is attributed to Octave, without claiming to have executed
  MATLAB. The Vega SHA-256 measurements are distinguished from the credentials circuit
  and from the Horizon percentiles; no winning equivalent comparison is
  announced.

No blocking mathematical assertion was identified within this scope.
This reading does not verify the cryptographic implementation of the primitives,
its side channels or the physical validity of the signed facts. H15 remains open.

### Catalog, cloud and GitHub Actions

The CUDA entry initially showed `?` characters in place of accents:
the author fixed the encoding, verified by the reviewer. Its status remains
`blocked`, with **N=0 GPU receipts**; neither GPU performance nor Blackwell
incompatibility is inferred from it. The new `checkCatalog` reading returns
`integrity-readable`, **9 claims / 99 artifacts**, `semantic_validation:false`.
The catalog digest at this second pass is
`c126b1d7b783828115363d8b4721bcfe00929e5fb18482dfe8eb5a62c1ee0297`.
It replaces its content, without invalidating the historical description of the
first pass above.

The IaC foundations create only network and identities; no application,
distributed persistence or banking compliance is announced as deployed.
The re-reading finds no fallback route turning local SQLite into a
durable multi-instance service. `terraform fmt -check` passed locally;
no cloud call was executed by the reviewer.

The reusable workflow limits profiles to `horizon|math`, injects the choices
into quoted shell variables, reserves the Docker sandbox for Horizon, pins
the actions and gives the token `contents: read`. No `pull_request_target`,
cloud secret or OIDC permission is added. The summaries, historical public
fixture, PDF and catalog are selected explicitly; the examined scripts
copy neither witness, private key, SQLite database nor raw log into them.
The user choices are now explicit: **GA = GitHub Actions**,
Azure/GCP comparison without deployment and publication of the repository authorized after
checks. This authorization does not constitute general availability of the product.

Reservations about this automation:

1. The publication job's manifest verifies the historical artifacts before
   rebuilding the PDF. The workflow bundle computes its own SHA-256 over
   the selected bytes; these two scopes must not be confused.
2. `execution.json` describes process results. The initial selection
   omitted the new Octave numerical JSON files; the reviewed fix copies those
   created after the start marker. Raw logs remain excluded. A workflow
   success is not by itself a cryptographic proof, a semantic
   validation of the catalog or an attested timestamp.
3. The initial selection and upload were conditional on the success of the
   preceding steps: an `unknown`/`failed` result could remain only on the
   runner and in the CI logs. The reviewed fix uses `always()` after the
   profile start, exports the job/profile/PDF states to `RUN_STATUS.txt`
   and keeps the results present without hiding the failure. **Source fix
   verified**, execution on GitHub still to be recorded. A failure before the
   profile start or the export can still prevent production of the bundle.
4. `actionlint` was not available in the initial PATH of this review.
   The publication owner later reported a PASS with actionlint
   1.7.12 and a verified official archive; the reviewer does not claim that
   execution. The actual results of `workflow_call`/`workflow_dispatch`
   remain to be recorded in the publication log. This source reading
   does not mark them as successful.

The README also replaced "official MCP tools" with "tools exposed
with the official MCP SDK", so as not to suggest an endorsement of the protocol
for these application tools. Fix reviewed. The two documents modified by
this reviewer, this report and `NEXT_PROMPT.md`, pass the UTF-8 check and their
19 local links exist. A remote hardening branch reported after
this pass is not covered: any later integration requires its own
review and tests.

## Conclusion of this pass

No path authorizing a Horizon mutation without going through the verifier and
the controller was found within the scope read. This absence of findings is
not a proof of absence of defects. **No blocking finding from this pass
remains open for the local laboratory examined.** The reservations above,
H11/H13/H14/H15/H17 and the publication decisions remain distinct.
No conclusion of general availability or qualification of a
critical platform is authorized by this report.

## Supplement: integrated security branch

On October 17, 2026, the orchestrator preserved then merged the remote branch
`feat/publication-hardening` at commit `21b6dc2`. A new targeted review by
the `technical_challenger` agent, distinct from the author of the routes, covers the
server's operator guard and its interaction with the SDK. The protected URLs are
identical to those of the dispatch; the check takes place before reading the body
and before any wait. No bypass was found within this scope.

The reviewer added and executed nine firewall tests, including 162 negative
requests across the three routes and seven token configurations. Each refusal
returns 403 and leaves the full snapshot unchanged: state, operations, audit
and effects. An already reserved operation makes the reconciliation check
observable. The authenticated cases verify `UNKNOWN` to
`COMPLETED` reconciliation without a second effect, rotation and revocation. A valid operator token
does not allow a forged proof to be admitted. Strict TypeScript passes.
The orchestrator then executed the 31 Horizon tests: 31 pass.

The operator controls are disabled in the browser; Compose configures
no token and the relay does not forward its header. The shared secret constitutes
a local control, without banking IAM, named roles, TLS or hot rotation.
The other routes are not made authenticated by this guard. This internal
review does not change the production reservations and does not replace H15/H17.

The `buyer_crisis_challenger` agent also re-read the new dependency,
GPU, mathematics, white paper, skills and CI artifact selection
dossiers. No private data was found within this scope; 106 digests
of the GPU/dependency indexes and of the PDF/sources agree. The eight-page PDF
contains no attachment or detected user path. The maintainer addresses
in the NVIDIA metadata are public image metadata.
This pass is neither an exhaustive audit of the Git history nor an inventory of the
licenses of a future binary distribution. No additional blocker was
identified for the publication of the laboratory's sources and results.
