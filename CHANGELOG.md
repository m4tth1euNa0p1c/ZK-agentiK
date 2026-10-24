# Changelog

Repository versions identify a set of sources and artifacts.
Prereleases may change the API. Experimental results retain their original
date, commit and scope.

## 0.1.0-alpha.1 — 17 October 2026

First versioned public prerelease, following the source release and integration
of correlated campaigns into `main`.

### Distribution

- Standalone SDK `@m4tth1euna0p1c/proofkit-sdk`: ESM, TypeScript types,
  MIT license, `.tgz` archive and GitHub Packages publication on the `alpha` channel.
- Verification of the archive, its files and installation in a separate consumer
  project through `npm run release:check`.
- Manual release workflow: matching tag and versions, CI checks on the exact
  commit, selected artifacts and hashes; publication separate from tests.
- README, package guide, release notes and citation metadata.

### Included features

- `defineVerifiedTool` contract and explicit proof and authorization adapters.
- Horizon Bulletproofs/Ristretto and Ed25519 profile, HTTP/MCP transport,
  local SQLite controller, rejection, replay and restart tests.
- Deterministic Rust `no_std` policy and historical DevSecOps MCP demonstration
  using a simulator that discloses its witness.
- Separate RISC Zero laboratory, historical receipts and public verification.
- Proofkit registry, SHA-256 manifests, manuscripts and correlated
  BigInt/Rust/Octave/MATLAB campaigns, with dated observations preserved.

### Limitations

Historical SDKs, gateways, demonstrations and crates remain source components,
not published packages. Horizon uses classical primitives.
Business sources are synthetic; adapters are trusted and SQLite does not prove
remote API atomicity. No external cryptographic audit, qualified cloud deployment,
buyer or SLA has been established. The retained GPU attempts produced no GPU
receipt. See the [claims](docs/publication/CLAIMS.md) and
[release notes](docs/releases/v0.1.0-alpha.1.md).
