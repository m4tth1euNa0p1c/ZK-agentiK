# Correlated campaign on GitHub Actions

The [workflow](../../../.github/workflows/circuit-validation.yml) runs a bounded
synthetic campaign: vector generation, real Rust prover, verifier in a separate
process, Octave oracle, correlation and report. A second optional job runs
**actual MATLAB** on the same vectors and compares its results with Rust and
Octave outputs. This document describes the wiring; valid YAML does not prove
that these jobs have already succeeded on GitHub.

## Triggers and budget

| Trigger | Requested count | MATLAB |
| --- | --- | --- |
| PR touching the circuit, Horizon workspace or workflow | 128 | Enabled; mandatory public check |
| Push to `main` with the same paths | 128 | Disabled |
| `workflow_dispatch` | Closed choice: 128, 1024 or 4096 | Explicit boolean, default `false` |
| `workflow_call` | String validated against these three values, default `128` | Explicit boolean, default `false` |

Direct PR/push events have no inputs: the count falls back to `128`.
MATLAB is enabled for these PRs, as requested for a real experiment before
merging; it remains disabled on push. A reusable call supplies `cases`
(default `128`) and retains its explicit MATLAB boolean, even if its caller
was triggered by a PR. The requested count is a generation budget, not a
promise about the number of subtests or accepted proofs: result counters give
the values actually observed. Additional adversarial and denied cases must
remain distinct from successes.

The Rust/Octave job is bounded at **45 minutes**, the MATLAB job at **30 minutes**.
These limits include download and compilation. They are neither a cryptographic
measurement nor an SLA. Two identical requests for the same ref share a
concurrency group; an already-started job is not automatically canceled.
The GitHub scheduler may replace an older pending job: inspect its state
without assuming all requests were executed.

Once the workflow is present on the default branch, a maintainer can run:

```sh
gh workflow run circuit-validation.yml --ref <reviewed-revision> -f cases=1024 -F include_matlab=true
```

Example reusable call in the same repository or a fork containing its sources:

```yaml
jobs:
  circuit:
    uses: ./.github/workflows/circuit-validation.yml
    with:
      cases: '128'
      include_matlab: true
```

For a remote call, pin the workflow by commit and check which repository is
actually checked out in the caller's context. This integration does not accept
an arbitrary command, image, proof key or MATLAB program as input.
It merges no branch and deploys no cloud service.

## Process and file contract

Fixed commands in the first job:

```sh
node --test tests/circuit/*.test.mjs
node scripts/circuit-campaign.mjs --cases 128 --output .tools/circuit-ci --build
```

The orchestrator creates a new output directory. Its `public/` portion contains
the only exportable file families:

| File | Role |
| --- | --- |
| `vectors.json` | Synthetic vectors shared by the implementations |
| `prover-results.json`, `verifier-results.json` | Results of the two Rust processes |
| `octave.json` | Octave oracle verdicts |
| `octave-selftests.json` | Encoding, boundary and reduced-grid test results |
| `correlation.json` | Campaign comparison and counters |
| `verification-requests.ndjson.gz` | Compressed public verifier requests |
| `report.html`, `figures/*.png`, `figures/*.svg` | Generated report and visuals |
| `figures/plot-metadata.json` | Plotting engine version and public parameters |
| `manifest.json` | Provenance and hashes produced by the orchestrator |

CI selection adds `CI_STATUS.json` and `SHA256SUMS` without exporting the entire
`.tools/` tree. Selected files are regular files, without symlinks or hardlinks;
export caps: 64 source files, 64 MiB per file and 256 MiB total.
Figure names are restricted. These bounds protect export; they are not a
sandbox against hostile repository code.

Vectors may disclose their **synthetic amounts** to enable numerical comparison.
They are not real insurance data. Blinding factors, private keys and commitment
openings are not exported. Publishing this synthetic dataset is not a test
for absence of leakage on a private production dataset.

The MATLAB job downloads the bundle from the same run and verifies its SHA-256
hashes before using the data. It exclusively calls:

```matlab
addpath('math/circuit');
r = run_oracle(); % reduced grid, invalid encodings and boundaries
% The workflow writes the public result to matlab-selftests.json.
circuit_oracle('.tools/circuit-matlab/input/vectors.json', ...
               'public-matlab-artifacts/matlab.json');
```

It then correlates this new output without regenerating vectors or rerunning
a prover that could produce a different sample:

```sh
node scripts/circuit-correlate.mjs .tools/circuit-matlab/input --matlab public-matlab-artifacts/matlab.json --output public-matlab-artifacts/correlation-matlab.json
```

`matlab.json` must identify its actual runtime. The fixed call requests
**R2026b**; MathWorks installs the available update for that release.
This string alone therefore does not pin the precise update. Record the
version actually executed in the results, without replacing MATLAB with
Octave if installation fails.

## MATLAB license and action versions

Official actions support automatic licensing for public projects.
Private projects and certain transformation products, including Coder/Compiler,
require another mechanism. This workflow uses only MATLAB, requires a public
repository and configures no `MLM_LICENSE_TOKEN`. It neither purchases nor
installs a global license on the user's machine.
[Official Setup MATLAB licensing terms](https://github.com/matlab-actions/setup-matlab#licensing).

The profile uses JSON files and an `.m` function, not MATLAB Engine external
interfaces, which this public CI license does not support.
Network, installation or license unavailability fails the job; step states
are retained and no MATLAB success is fabricated.
[Restrictions and execution](https://github.com/matlab-actions/setup-matlab#notes),
[Run MATLAB Command](https://github.com/matlab-actions/run-command).

Pins consulted on **October 17, 2026**, through releases and then tag commits
from the official GitHub API:

| Action | Version | Commit used |
| --- | --- | --- |
| [setup-matlab](https://github.com/matlab-actions/setup-matlab/releases/tag/v3.1.0) | v3.1.0 | `f9e43010f1ae678f7cfa0542fe2a4f60f7d1ad8d` |
| [run-command](https://github.com/matlab-actions/run-command/releases/tag/v3.3.0) | v3.3.0 | `bfa857648f4895aa98a446fe41c85e0788421ed5` |
| [download-artifact](https://github.com/actions/download-artifact/releases/tag/v8.0.2) | v8.0.2 | `9000827ccba6bdab643e8b6fd33ac0654aef8333` |

Checkout, setup-node and upload-artifact reuse the repository's already-reviewed
pins. The token retains `contents: read`, with no cloud secret, OIDC permission
or `pull_request_target` event. Node is pinned to 24.11.1 and Rust to 1.93.0.
The orchestrator's scientific images and versions appear in its own results.

## Failures, artifacts and interpretation

The first bundle is named `circuit-public-<run_id>-<run_attempt>`, the second
`circuit-matlab-<run_id>-<run_attempt>`. Retention is **14 days**.
Exporting selected results to the repository registry remains a separate
decision: a temporary artifact's existence does not archive it durably.

After the campaign starts, selection and upload also run after failure.
Missing files are declared and step statuses remain visible; the job stays
red. A stop before export, timeout or forced cancellation may prevent any
bundle from being produced. The MATLAB job depends on the first job succeeding;
if skipped, it did not execute MATLAB. When it starts, its bundle retains
eligibility, installation, oracle and correlation states, including failures,
without raw logs.

A process `success` result, exact correlation of verdicts, a verified
cryptographic proof and a mathematical proof remain different things.
SHA-256 guarantees the identity of covered bytes, without proof of their
truth or date. A large synthetic test remains finite and establishes neither
universal safety, statistical independence nor general platform availability.

This CI runs fixed commands. The agentic flow
**proposal → policy → challenge → proof → verification → effect** belongs to
the Horizon MCP demonstration and its separate authorization tests.
The circuit campaign performs no merge, payment or unconstrained LLM decision.

Local validation of this version: **actionlint 1.7.12 PASS** and five export
negative tests: public filter, missing artifacts after failure, hardlink
rejected, unavailable MATLAB state retained, success without proofs rejected.
They use review fixtures without running MATLAB or the circuit.
A campaign declared successful with a missing required file is rejected,
while retaining its partial bundle. Actual GitHub and MATLAB executions
must be reported with URL, commit, run/attempt, versions, counters and results;
they are not declared successful here. Additional primary documentation:
[MATLAB CI on platforms](https://www.mathworks.com/help/matlab/matlab_prog/continuous-integration-with-matlab-on-ci-platforms.html),
[GitHub Actions concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
