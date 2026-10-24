# GitHub Actions for proofs and the sandbox

“GA” means GitHub Actions here, in accordance with the user's choice on
October 17, 2026. The repository provides a reusable and manually triggerable
workflow: [proof-sandbox.yml](../../.github/workflows/proof-sandbox.yml).

Automatic workflows already use it: `ci.yml` runs Horizon and the
sandbox after tests; `evidence.yml` checks the register and history,
then runs Octave and rebuilds the manuscript. No cloud account is used.
They run on PRs and pushes to `main`, without a duplicate campaign
for the same PR branch push. A new revision cancels checks
still running on the same PR; it does not change already retained results.

## Reuse in this repository or a fork

```yaml
name: My proof experiment
on: [workflow_dispatch]
permissions:
  contents: read
jobs:
  proof:
    uses: ./.github/workflows/proof-sandbox.yml
    with:
      profile: horizon
      deploy_sandbox: true
```

The caller must have ZK-agentiK code and lockfiles in its checkout.
This workflow is not a universal action that automatically runs an arbitrary
project: adapting the profile and register requires review. For a call through
a remote reference, pin the workflow commit and check which repository is
checked out; a reusable workflow has the caller's context.

After integrating the file into the default branch, use Actions →
**Reusable proof and local sandbox** → **Run workflow**, or:

```sh
gh workflow run proof-sandbox.yml --ref <reviewed-branch> -f profile=horizon -F deploy_sandbox=true
```

Only `horizon` and `math` are allowed; an arbitrary name does not become a
command. `deploy_sandbox=true` is reserved for Horizon. It starts Compose on
the ephemeral runner, checks a real proof, tampering, replay, restart
and verification in an independent container. It then stops the services.
This is neither publication of an Internet API nor an Azure/GCP deployment.

## Artifacts and trust

Actions are pinned by commit and the token is read-only.
No `pull_request_target`, cloud secret, long-lived key or
`id-token: write` permission is added. Uploaded files are explicitly
selected in `public-artifacts/`: process summary, public smoke
results, numerical JSON from the new Octave run if applicable,
public historical fixture if applicable, PDF, register, commit and
hashes. No `.tools`, witness, private key, SQLite database or raw log is uploaded.
Artifact retention is 14 days; the repository retains the necessary
historical references beyond this temporary retention period.
Once execution has started, the bundle is also retained on failure with
`RUN_STATUS.txt` and only the results that are present. The job remains failed;
a PDF taken from the checkout after a failed rebuild remains historical.
A failure before the profile starts may produce no bundle.

The GitHub SHA and checks help traceability; hash files
are neither a maintainer signature nor a TSA timestamp. Workflow timing
includes download, build and contention; it is not a
cryptographic benchmark. The rebuilt PDF may differ due to its build date.
The manifest verified by `evidence.yml` concerns the checkout before rebuilding;
`SHA256SUMS` covers bundle bytes after rebuilding. Neither
authenticates result truth or the date through a third party.

Long Vega profiles and CUDA are not automatically run on
shared runners. The local CUDA result remains blocked; no GitHub-hosted
runner is assumed to provide a GPU.

## Azure/GCP extension

The confirmed choice is **comparison without deployment for now**. IaC
foundations remain locally validated. A future cloud workflow must be
separate, with an approved environment, federated identity restricted to the repository/ref,
least privilege, region, budget and H14/H17 tests. The present workflow
contains no fake `deploy` stage claiming a nonexistent environment.

Primary sources consulted on October 17, 2026:
[GitHub workflow reuse](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows),
[upload-artifact](https://github.com/actions/upload-artifact/tree/cf430e030ddbb5b0abf93d22962f4752f3646cd9).
