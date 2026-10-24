---
name: proof-workflow-automation
description: Maintain the ZK-agentiK proof and sandbox GitHub Actions workflows, their reusable calls, their public artifacts and their negative results. Use for this CI automation, without extending its scope to cloud deployment.
---

# Proof and sandbox automation

"GA" here means GitHub Actions. Read `AGENTS.md`,
`docs/publication/GITHUB_ACTIONS.md`, `.github/workflows/proof-sandbox.yml` and
the callers `.github/workflows/ci.yml` and `.github/workflows/evidence.yml`.
To change a profile, also read `tools/proofkit/profiles.mjs` and the scripts
it executes: the proof catalog must never become a source of
executable commands.

## Execution contract

- Keep `workflow_call` and `workflow_dispatch`, with consistent input
  types. Validate at execution time the closed list `horizon|math`, including
  for `workflow_call` whose input is a string. Any added profile requires
  a reviewed definition and explicit limits, not a free-form command.
- `deploy_sandbox` is a boolean, disabled by default and reserved for Horizon.
  It launches Compose on the ephemeral runner. It does not create an Internet
  service, an Azure/GCP resource or a production environment.
- Pass inputs through environment variables quoted in the shell;
  do not interpolate a user expression into the text of a command.
  Keep timeouts, budgets and cleanup even after failure. Do not loop
  campaigns or relaunch an ambiguous effect to obtain a green status.
- Keep `permissions: contents: read`, with no cloud secret, OIDC identity or
  `pull_request_target` executing PR code. Pin actions by full SHA;
  verify every change against the official repository and its version.
  The version comment does not replace the SHA.
- When called from another repository, check the caller's context and the
  repository actually checked out. Pinning the remote workflow does not by
  itself pin the application code or the lockfiles executed.

## Artifacts and failures

Explicitly select the public files before upload: process results,
job states, re-read numerical JSON, historical public fixture,
PDF, catalog, commit and fingerprints. Exclude `.tools/`, witness, private keys,
SQLite database and raw logs. A new artifact family requires reading
its content, not just an extension filter.

Keep the `failed`, `unknown`, `unavailable` results and the partial
outputs after start, even if a previous step fails. Use the
`always()` selection/upload conditions with guards on the steps
actually started. Keep the job failed; do not add
`continue-on-error` to announce a success. A failure before start or
export may leave no bundle: report it, without inventing a result.

Separate historical fixture, newly verified proof, numerical result
and process outcome. If the PDF was not rebuilt, the checkout's file
remains historical. The pre-build manifest and the post-build bundle SHA-256s
cover different bytes; neither guarantees truth, attested date or
external audit. Set the retention and document what survives its expiration.

## Verification and delivery

Validate the syntax with `actionlint` if available, then the touched scripts and
tests. A local validation is not a successful GitHub run. On a
reviewed revision and within the authorized scope, check the reusable calls
and the manual trigger; keep URL/identifier, commit, states, artifacts
and limits. On failure, diagnose before any new attempt.

For Horizon, keep the forgery, replay, restart and effect counter
controls; for math, distinguish Octave tests from cryptographic proof.
Do not launch Vega/CUDA or a heavy campaign for a mere CI edit.

The separate `circuit-validation.yml` workflow orchestrates the correlated
128/1024/4096 campaigns; its complete corpora, self-tests and images have their
own export list. The MATLAB job uses the pinned official actions and the public
repository's eligibility; check its actual execution and correlate the same bytes,
without promoting an Octave result to a MATLAB result. Direct PRs launch
128 cases and MATLAB; a reusable call respects its explicit parameters.
The numerical container takes the Linux host's UID:GID to write to the mounts
without restoring a capability or making the folders world-writable.
Keep the initial Linux failures and their missing files. The `math` profile
rebuilds the main manuscript and the `circuit-validation.pdf` supplement.

Deliver the diff, the validations actually executed, the negative results
and the remaining unknowns. Maintaining this workflow does not by itself
authorize a merge to the main branch, a cloud deployment, an npm
publication or a visibility change. Respect the session's already explicit
authorizations without asking for them again; the current Azure/GCP comparison
remains without deployment. Reuse the existing review contracts in `.agents/roles/`
if a separate review is requested, without promising their autodiscovery everywhere.
