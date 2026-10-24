# Proofkit CLI — explicit proofs and experiments

This local CLI groups the laboratory profiles and an artifact register.
It constitutes neither a cryptographic primitive nor a timestamping service.
Node 24.11+ and `npm ci --ignore-scripts`; run from the repository:

```sh
npm run proofkit -- doctor
npm run proofkit -- list
npm run proofkit -- check
npm run proofkit -- run horizon
npm run proofkit -- seal evidence/manifests/review-001.json
npm run proofkit -- verify evidence/manifests/review-001.json
```

`doctor` checks tool availability, without running any proof. `check`
validates the catalog schema and reads the explicitly declared artifacts.
`seal` refuses to overwrite a file; `verify` refuses any difference in catalog,
file set, size or hash. This establishes consistency of the bytes
with the given manifest, not the authenticity of the manifest.

## Shipped profiles

| Profile | Work actually executed | Prerequisites / cost |
| --- | --- | --- |
| `circuit` | 128 correlated BigInt/Octave/Rust cases, real proofs and separate verifier, figures and report | Rust, Docker; [campaign and budgets](../../docs/experiments/circuit/README.md), MATLAB in an explicit CI job |
| `horizon` | Build, historical Bulletproofs fixture, then fresh proof and synthetic local action | Rust and Node; minutes on first build |
| `risc0-public` | Verification of historical receipts accepting/rejecting the policy | Docker, prepared RISC Zero laboratory; see its runner |
| `vega-sha256` | Pinned upstream SHA-256 SC/MC benchmarks | Docker, long downloads and compilation; not the complete mDL relation |
| `math` | Integer checks and finite model under Octave | Docker; first build with network, execution without network |

The profiles are reviewed code in `profiles.mjs`. The catalog authorizes no
command, backend URL, image or verification key. Each profile follows
its own protocol; the success of a process does not validate all the
assertions in the catalog. No assertion status is promoted automatically.

```sh
npm run proofkit -- run horizon --require-post-quantum
# Explicit failure POST_QUANTUM_PROFILE_UNAVAILABLE before execution.
```

Run results are `passed`, `failed`, `unavailable` or `unknown`.
An interruption or an indeterminate result does not become a success. Raw
logs remain in `.tools/proofkit/runs/<UTC>-<UUID>/`, excluded from Git. Under POSIX
permissions are restricted; they do not replace a Windows ACL.
Reread these logs before any publication: profiles may handle
local paths and private fixtures. A command's duration includes its
builds/IPC; it is not a cryptographic benchmark.

## Manifest guarantees and limits

- Strict schemas, duplicates and omissions refused, exact set of artifacts.
- Relative paths only; traversal, symbolic links/junctions, hardlinks
  and usual sensitive names refused; bounded reads.
- UTC dates and Git commit are **self-declared**. Changing them in a manifest
  does not make it possible to authenticate time or an author. No TSA, maintainer
  signature or external transparency is provided.
- The manifest does not recursively follow links included in documents.
  Explicitly add to the catalog any raw data needed for an assertion.
- A hostile local writer able to modify directories during reading
  remains outside the model; these path checks are not a system sandbox.
- Sensitive paths are a precaution, not a secret detector. Publication
  review and history scanning remain necessary.

Historical fixtures are cryptographically verifiable for their date
of origin. They are not fresh reusable authorizations. Proofs
of new operations come from the profile and go through the durable controller.

Tests: `npm run test:proofkit`. To integrate a tool, follow the
[SDK](../../packages/proofkit-sdk/README.md), then enrich
[`evidence/catalog.json`](../../evidence/catalog.json) with relation, limits,
dated primary sources and explicitly selected public files.
