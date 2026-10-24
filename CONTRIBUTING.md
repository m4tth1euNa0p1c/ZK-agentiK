# Contributing to ZK-agentiK

This repository is a laboratory for proofs and tool authorization. Read
[AGENTS.md](AGENTS.md), the [architecture](docs/03-ARCHITECTURE.md) and the
[Horizon verdict](docs/horizon/FINAL_VERDICT.md) before changing a trust boundary.
Consult the RFC before any encoding change.

## Bounded contributions

Describe the problem, scope and test that could refute the solution.
For a protocol change, include the relation, assumptions, compatibility and
shared vectors. Unimplemented adapters fail explicitly.
Test keys, openings and data are synthetic; no customer data or generated
private key may enter Git.

Preserve existing changes and state file ownership when multiple agents work
together. Commits follow Conventional Commits. No commit or push is required
to propose a reviewable local diff.

## Checks

Use locked versions and the toolchain specific to each workspace.
The root workspace and laboratories may use different versions.

```sh
npm ci
cargo test --workspace --locked
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
npm test
npm run typecheck
```

For Horizon/Proofkit changes, also run the applicable `horizon:build`,
`test:horizon` and `test:proofkit` scripts from `package.json`.
Do not treat root tests as automatically covering a separate Cargo workspace.
Authorization tests must observe external effects, including zero effects
on rejection. An ambiguous timeout requires reconciliation.

A documentation change does not require a heavy cryptographic campaign
unrelated to the diff. Check its links, sources, commands and claims.
For a performance claim, retain raw measurements, phases, environment, versions,
size and limitations; consult the
[Horizon methodology](docs/horizon/BENCHMARK_METHODOLOGY.md).

## Presenting the result

A PR states the resulting behavior, checks actually performed and remaining
unknowns. Do not claim an independent audit, compliance, universal absence of
competition or a record over non-equivalent relations.
The [claims registry](docs/publication/CLAIMS.md) and
[publication checklist](docs/publication/RELEASE_CHECKLIST.md) guide the review.
Report vulnerabilities according to [SECURITY.md](SECURITY.md).

For SDK distribution, also run `npm run release:check`: this check covers the
archive installed outside the monorepo. Versioning and publication are described
in [PACKAGES.md](PACKAGES.md).

Original code is distributed under [MIT](LICENSE). Only contribute content
whose rights permit this distribution; preserve applicable third-party licenses
and notices. This document does not announce a separate CLA.
