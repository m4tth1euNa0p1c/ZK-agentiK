# Laboratory publication decision

Review of **October 17, 2026**, by engineering, technical challenge
and evidence review agents. **GO to publish sources and experimental
results; NO-GO for a qualified banking platform.** The owner
explicitly authorized making the repository public after checks. No npm
package, Azure/GCP deployment, payment or commercial contact is authorized by
this release.

## Revisions and scope

The starting point is `8935cc9e42dee9b2ed32207483a6f7383e37ffc4`. Delivered code
is in `b9afb43`, remote security branch integration in
`21b6dc2`, operator fixes in `0a9d48d` and the first extended catalog
in `acc6e9832d41bfe3260cb578e4a975ff630b5100`. The four commits from
`feat/publication-hardening` were preserved by merging. Subsequent additions
for this closure are documents, observations and hashes.

[PR #2](https://github.com/m4tth1euNa0p1c/ZK-agentiK/pull/2) brings together this work
and the Horizon history. The manifest
[`publication-2026-10-17.json`](../../evidence/manifests/publication-2026-10-17.json)
identifies the exact clean checkout used for the final index. It binds
selected artifacts without certifying their truth, author or date.
The actual GitHub visibility state must be read on the repository; this report
records the publication decision, not an activation in advance.

## Observed checks

| Check | Status | Evidence and limitation |
| --- | --- | --- |
| Rust/TypeScript quality, schemas, bare guest, tests | **Verified** | [GitHub job](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/39044646338/job/117430845824), 105 tests: 23 Rust + 82 Node, zero failures; [extracted counts](checks/ci-candidate-acc6e98/test-counts.json) |
| Real proof, tampering, replay, effect and restart | **Verified** | [Quality + sandbox workflow](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/39044646338), 1 authorized effect, 0 unauthorized; same local target after restart |
| Separate public verifier | **Verified** | [Result](checks/ci-candidate-acc6e98/horizon/independent-verification.json), container without network or mount, public historical fixture; not a live authorization |
| Authenticated operator and denial without change | **Verified** | [Record](OPERATOR_VALIDATION_2026-10-17.json), 162 negative requests across three routes, unchanged snapshot; local shared secret only |
| Octave and PDF rebuild | **Verified** | [Scientific workflow](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/39044646357), finite model and exact integers; no MATLAB execution |
| Manifest and history scan | **Verified** | `evidence` job in the same workflow: roundtrip and pinned Gitleaks; local scan of 13 commits with no findings at `0a9d48d`, [output](checks/gitleaks-2026-10-17.json). A scan without findings does not prove the absence of secrets |
| npm dependencies | **Verified within scan scope** | [Full npm audit](checks/npm-audit-2026-10-17.json), no vulnerability reported on October 17; does not cover unknown vulnerabilities |
| Rust dependencies | **Verified with reservations** | [Frozen reports and analysis](DEPENDENCY_REVIEW.md); root/Horizon audits pass after fixes, historical RISC Zero and maintenance alerts retained |
| Azure/GCP foundations | **Verified locally** | [Versions and commands](VALIDATION.md), Bicep/Terraform; no cloud plan, resource created or actual IAM test |
| Public workflow artifacts | **Verified** | [API observation and hashes](checks/ci-candidate-acc6e98/observation.json); bundles downloaded, digests of all their files checked, public subset retained |
| Distributed sources, notices and data | **Reviewed, limited scope** | [Notices](../../THIRD_PARTY_NOTICES.md), [counter-review](INDEPENDENT_AGENT_REVIEW.md); sources, original PDF, synthetic results and CC0 RustSec advisories; no third-party binary or system image redistributed |
| External cryptographic review, buyer and production | **Not verified / blocking for production** | H11/H13/H14/H15/H17 remain open; does not block explicit publication of the laboratory |

The workflows above tested PR head `acc6e98` with merge checkout
`576c9b9ea3b047e190120c15d2906e07f12b3ce7`. Both SHAs are retained separately.
Checks for the final revision can be read on the PR; they are not invented
in this earlier record. Temporary GitHub artifacts expire after 14 days.
Selected public JSON files are retained here, without copying witness, keys,
SQLite database or raw logs. Local dates remain unattested by a TSA.

## Confidentiality and local state

The review covered published files, integrated remote branches, PR,
available artifacts and scanned history. No real secret or customer dossier
was identified within this scope. Ordinary Git author metadata,
including name and commit address, remains in the retained history; secret
scanning does not anonymize authors. No history rewriting
was performed.

`CLAUDE.md`, private configurations, unreviewed local outputs and caches
remain outside the commit. The user's initial local sandbox was
preserved. The separate publication sandbox was stopped while retaining its
volumes; CUDA attempts and historical benchmarks were not deleted.
The reporting channel and its limitations are described in [SECURITY.md](../../SECURITY.md).

## What this publication does not demonstrate

- The amount/limit circuit establishes neither source truth, aggregation, deductibles,
  fraud, reserves nor regulatory compliance.
- No buyer, budget or economic necessity for ZK is validated. H11
  notably compares a simpler signed verdict and acceptable disclosure.
- The specialized proof and historical receipts are real, but CUDA trials
  produced **zero GPU receipts**: compilation stopped for lack of
  memory. Neither GPU acceleration nor general incompatibility is inferred.
- Horizon is classical. Neither Ed25519, Ristretto/Bulletproofs nor SHA-256 taken
  in isolation justifies an end-to-end post-quantum label.
- Vega SHA-256 is a reference reproduced on a different relation. No
  comparative record or reproduced complete credential circuit is claimed.
- Old CPU latencies concern their versions and configurations;
  they do not qualify new transports or patched dependencies.
- A SHA-256 manifest, finite tests and an agent review do not replace
  a machine-checked formal proof, side-channel analysis or external audit.

The [resumption prompt](NEXT_PROMPT.md) gives the experiments and abandonment
criteria: buyer need, authentic sources, remote target, external audit,
costs, then new cryptographic profiles if their necessity is established.
