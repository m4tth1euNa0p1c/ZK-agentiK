# Packages and versions

The public repository is [m4tth1euNa0p1c/ZP3ntiProof](https://github.com/m4tth1euNa0p1c/ZP3ntiProof).
The repository and standalone SDK prerelease is **0.1.0-alpha.1**. The Git tag
`v0.1.0-alpha.1` identifies the sources; `main` may subsequently change.

| Component | Manifest version | Distribution |
| --- | --- | --- |
| `zk-agentik` (root) | `0.1.0-alpha.1` | Repository sources; private npm package |
| `@m4tth1euna0p1c/proofkit-sdk` | `0.1.0-alpha.1` | Release archive and GitHub Packages, `alpha` channel |
| `@zk-mcp/sdk` | `0.1.0` | Source only, private workspace |
| `@zk-mcp/enterprise-gateway` | `0.1.0` | Source only, private workspace |
| `@zk-mcp/horizon-demo` | `0.1.0` | Source only, private workspace |
| Root, Horizon and RISC Zero Rust crates | `0.1.0` | Separate sources and lockfiles; no crates.io publication |

The former internal name `@zk-agentik/proofkit-sdk` becomes
`@m4tth1euna0p1c/proofkit-sdk` to match the GitHub owner.
No version under the former name had been published by this repository.

## Install the public archive

Node **24.11 or later** is required. Download the `.tgz` file and `SHA256SUMS`
from the [release](https://github.com/m4tth1euNa0p1c/ZP3ntiProof/releases/tag/v0.1.0-alpha.1),
then compare its SHA-256 before installation.
In PowerShell: `Get-FileHash <archive.tgz> -Algorithm SHA256`;
on Linux: `sha256sum <archive.tgz>`.

```sh
npm install ./m4tth1euna0p1c-proofkit-sdk-0.1.0-alpha.1.tgz
```

```ts
import { defineVerifiedTool } from '@m4tth1euna0p1c/proofkit-sdk';
```

The public archive does not require a GitHub account. npm retrieves its Zod
dependency from the configured registry. It contains the SDK, its types,
documentation and license; no Rust binary, prover, secret or SQLite database
is included. The [SDK guide](packages/proofkit-sdk/README.md) describes the
required adapters.

## Install from GitHub Packages

GitHub requires authentication to its npm registry, even to download a public
package. Use a classic personal access token with `read:packages`, entered
at the `npm login` prompt, never in a tracked file:

```sh
npm login --scope=@m4tth1euna0p1c --auth-type=legacy --registry=https://npm.pkg.github.com
npm install @m4tth1euna0p1c/proofkit-sdk@0.1.0-alpha.1 --registry=https://npm.pkg.github.com
```

GitHub Packages visibility is configured separately from repository visibility;
the package page is authoritative. The release archive remains the public path
without a token. Prereleases use the `alpha` dist-tag, not `latest`.
This workflow does not publish to npmjs.org.

Sources: [GitHub npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry),
[access and visibility](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

## Reproduce and publish a version

```sh
npm ci --ignore-scripts
npm run build
npm run release:check
```

The last check installs the tarball in a project outside the monorepo and
verifies JavaScript and TypeScript exports. It publishes nothing. Other
components require the repository's build commands and Rust workspaces.

The maintainer aligns the root version, SDK, lockfiles, release notes and
citation; runs the checks on `main`; creates a tag on that commit; then starts
the [release workflow](.github/workflows/release.yml).
Required checks must cover the tag's exact SHA. A circuit run can be triggered
manually if its path filters skipped it.

The workflow builds a selected archive, binds its bytes in `SHA256SUMS` and
`RELEASE.json`, publishes to the registry and attaches downloads to a GitHub
prerelease. The distributed PDF is the one already tracked at the tagged
commit, not a rebuild from that run. A hash certifies neither the truth of the
results, their date nor an external audit. Consult the
[security limitations](SECURITY.md) before choosing a use case.
