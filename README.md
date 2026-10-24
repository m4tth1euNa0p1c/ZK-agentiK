# ZK-agentiK · Horizon & Proofkit

[![Quality](https://github.com/m4tth1euNa0p1c/ZK-agentic/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/m4tth1euNa0p1c/ZK-agentic/actions/workflows/ci.yml)
[![Publication evidence](https://github.com/m4tth1euNa0p1c/ZK-agentic/actions/workflows/evidence.yml/badge.svg?branch=main)](https://github.com/m4tth1euNa0p1c/ZK-agentic/actions/workflows/evidence.yml)
[![Prerelease](https://img.shields.io/badge/version-0.1.0--alpha.1-orange)](https://github.com/m4tth1euNa0p1c/ZK-agentic/releases/tag/v0.1.0-alpha.1)
[![MIT License](https://img.shields.io/badge/licence-MIT-blue)](LICENSE)

A laboratory for building tools whose actions require independent verification,
with reproducible evidence and a durable controller.
Rust for proofs and policies; strict TypeScript for the SDK, HTTP and MCP.

**Status: experimental research, synthetic data, no financial transactions.**
The integrated profile demonstrates local insurance claim authorization. Banking
qualification, commercial demand and post-quantum security have not been established.

[Development routine with Claude Code](docs/development/WORK_ROUTINE.md) ·
[Claude instructions](CLAUDE.md) ·
[Developer quick start](packages/proofkit-sdk/README.md) ·
[White paper PDF](docs/whitepaper/whitepaper.pdf) ·
[Circuit: mathematics and correlated campaigns](docs/experiments/circuit/README.md) ·
[Publication dossier](docs/publication/README.md) ·
[Research and history](docs/README.md)

[Releases and downloads](https://github.com/m4tth1euNa0p1c/ZK-agentic/releases) ·
[Changelog](CHANGELOG.md) · [Packages and installation](PACKAGES.md) ·
[Contributing](CONTRIBUTING.md)

The [dated publication checks](docs/publication/PUBLICATION_REVIEW_2026-10-17.md)
link the tests performed, CI artifacts and remaining limitations.

## Version and distribution

**`0.1.0-alpha.1`** is the first prerelease of the repository and Proofkit SDK.
`main` contains ongoing development; use a tag to reproduce a specific version.
The Rust crates and internal components retain version `0.1.0`; their version
numbers do not indicate publication on crates.io or npm.

The [Proofkit SDK](packages/proofkit-sdk/README.md) is distributed as
`@m4tth1euna0p1c/proofkit-sdk`, with ESM JavaScript, TypeScript declarations and
the MIT license. The [release](https://github.com/m4tth1euNa0p1c/ZK-agentic/releases/tag/v0.1.0-alpha.1)
bundles its installable archive, SHA-256 hashes and the existing manuscript.
The GitHub Packages channel uses the npm tag `alpha`; access requirements and
components retained as source are detailed in [PACKAGES.md](PACKAGES.md).
This version promises neither API stability nor production qualification.

## The need to validate

A delegated claims handler and an insurer want to verify that an eligible amount
respects a limit without revealing either value to the controller. Horizon proves
a relation over signed commitments, then binds authorization to a case, a client,
a policy and a fresh challenge. The controller durably reserves the operation
before recording the synthetic effect.

This hypothesis requires an actor authorized to know both openings and trustworthy
issuers. If a signed verdict or acceptable disclosure suffices, ZK is unnecessary.
No buyer or budget has been validated:
[qualification protocol](docs/horizon/REVIEW_PROTOCOL.md),
[alternatives and prior art](docs/horizon/NOVELTY_AND_PRIOR_ART.md).

## Run a real proof

Node **24.11+**, Rust **1.93.0** through rustup and a native linker are required.
On Windows: MSVC C++ tools. Docker is needed for the math, Vega and RISC Zero
profiles and isolated deployment, but not for the native Horizon demo.

```sh
npm ci --ignore-scripts
npm run proofkit -- doctor
npm run proofkit -- run horizon
```

The profile builds Horizon, verifies a public fixture, then generates a real
Bulletproofs presentation for a new challenge: invalid proof rejected, one SQLite
write authorized, replay rejected. The prover and verifier run in separate
workers. Logs remain local in `.tools/`.

For the persistent web demonstration:

```sh
npm run horizon:init
npm run horizon:serve
# http://127.0.0.1:38080 — synthetic data only
```

`init` refuses to overwrite an existing configuration. For Docker and secret
isolation, follow the [sandbox guide](docs/horizon/DEPLOYMENT.md).

## Build a verified tool

The [Proofkit SDK](packages/proofkit-sdk/) provides `defineVerifiedTool`: strict
schemas, bounded inputs, server-defined expectations, checks after waits, limited
capabilities and no automatic retry of an ambiguous mutation.
The developer supplies the proof and durable controller adapters.
The SDK does not certify an arbitrary adapter or generate a safe circuit.

The [compiled example](packages/horizon-demo/src/tool.ts) is used by HTTP and
by two tools exposed through the official MCP SDK, `horizon_issue_challenge` and
`horizon_authorize_claim`. For an MCP client, after building:

```sh
node packages/horizon-demo/dist/mcp-stdio.js <public.json> <dedicated-sandbox.sqlite>
```

Only **public** configuration enters this server. The proof is produced on the
supplier side. This transport exposes neither a private prover nor administration
and does not turn the HTTP/MCP receipt into proof that a remote API executed.

## Audit the evidence

```sh
npm run proofkit -- list
npm run proofkit -- check
npm run proofkit -- seal evidence/manifests/my-review.json
npm run proofkit -- verify evidence/manifests/my-review.json
```

The [registry](evidence/catalog.json) distinguishes mathematical derivations,
numerical tests, cryptographic proofs, measurements and unestablished results.
A manifest binds explicitly listed bytes through SHA-256; it certifies neither
their truth, their author nor an independent date. Commands, limitations and
profiles are documented in [Proofkit CLI](tools/proofkit/README.md).

```sh
npm run proofkit -- run math          # Octave, not a MATLAB execution
npm run proofkit -- run risc0-public  # Historical receipts, prepared Docker environment
npm run proofkit -- run vega-sha256   # Long opt-in run: compilation and benchmarks
```

The [LaTeX source](docs/whitepaper/whitepaper.tex), bibliography,
[MATLAB/Octave scripts](math/) and dated reports are available.
The [GPU experiments](docs/experiments/gpu/README.md) have a separate scope.
`--require-post-quantum` rejects the supplied profiles; weaker protection is
never selected silently.

## Three distinct scopes

| Scope | Tested guarantee | Limitations |
| --- | --- | --- |
| Horizon + Proofkit | Real Bulletproofs, synthetic attestations, fresh and locally durable authorization | Classical Ristretto/Ed25519, linkable metadata, local SQLite target |
| RISC Zero laboratory | Real Succinct receipts over a signed DevSecOps policy | Fixture source; integration with DevSecOps MCP not delivered |
| Historical DevSecOps MCP | Rust `no_std` policy, context binding, rejection and local deduplication | Simulator disclosing its witness, prohibited in production |

`npm run demo:critical` remains the historical **simulator** demo. Unimplemented
backends explicitly reject the call. Earlier CPU measurements are retained with
their configuration; they do not automatically measure the new transports.
Vega SHA-256 and Horizon do not prove the same relation: no comparative record
is claimed.

## Contribute and customize infrastructure

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
npm test
npm run typecheck
npm run horizon:build
npm run test:horizon
npm run test:proofkit
npm run test:risc0:gpu
npm run release:check
```

See [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md),
[skills](.agents/skills/) and [review roles](.agents/roles/).
The [reusable GitHub Actions workflow](docs/publication/GITHUB_ACTIONS.md)
automates proof profiles and an ephemeral Docker deployment on the runner.
The [Azure/Bicep](infra/azure/) and [GCP/Terraform](infra/gcp/)
foundations expose configurable networks and identities. They have been validated
locally, without deployment: [comparison and outstanding decisions](docs/publication/CLOUD_COMPARISON.md).
IAM, real keys, a shared controller and recovery against a remote API still
require qualification before use in a sensitive cloud runtime.

The next decisions are H11 (customer need), H13 (authentic sources),
H14 (remote target), H15 (external audit) and H17 (operations). The
[resumption prompt](docs/publication/NEXT_PROMPT.md) makes them testable.

[Security](SECURITY.md) · [MIT License](LICENSE) ·
[Third-party notices](THIRD_PARTY_NOTICES.md) · [Citation](CITATION.cff)
