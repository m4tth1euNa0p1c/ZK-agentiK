# Validation log for this dossier

Date: October 17, 2026. Platform: Windows x64, PowerShell. Scope: the
three new skills and infrastructure foundations; this log does not replace
either the candidate's application tests or cloud verification.

## Checks actually run

| Check | Result | Scope |
| --- | --- | --- |
| `quick_validate.py .agents/skills/scientific-whitepaper` | PASS | Frontmatter and skill-creator validator constraints |
| `quick_validate.py .agents/skills/evidence-publication` | PASS | Same validator |
| `quick_validate.py .agents/skills/cloud-proof-infrastructure` | PASS | Same validator |
| `bicep build infra/azure/main.bicep --outfile <temp>/azure-template.json` | PASS | Local compilation, embedded types |
| `bicep lint infra/azure/main.bicep` | PASS | No diagnostics emitted |
| `terraform -chdir=infra/gcp fmt -check` | PASS | Source formatting |
| `terraform -chdir=infra/gcp validate -no-color` | PASS | Local schema with installed provider |
| `terraform -chdir=infra/gcp providers lock -platform=linux_amd64 -platform=windows_amd64` | PASS | Provider checksums recorded in the lockfile |
| Resolution of local Markdown links in the dossier and added root documents | PASS | Target existence, not content validity |
| `agents/openai.yaml` YAML for the three skills | PASS | Fields, 25–64-character description and skill reference |
| `CITATION.cff` against the official CFF 1.2.0 schema | PASS | `jsonschema` validation, schema from citation-file-format tag `1.2.0` |

Terraform initialization used `init -backend=false -input=false`, without
cloud credentials. It downloaded the public provider and created the lockfile.
Subsequent validations can reuse this provider offline. No
`plan`, `apply`, Azure deployment, API activation or resource creation
was performed.

## Versions and acquisition

- Bicep **0.48.1**, Windows x64 binary from the
  [official release](https://github.com/Azure/bicep/releases/tag/v0.48.1).
  SHA-256 checked against the GitHub asset digest:
  `398af294cf16ac4becdbd008a77d148d0e8e91492309a6b60ec911b7e1cab082`.
- Terraform **1.16.6**, Windows amd64 archive from
  [HashiCorp releases](https://releases.hashicorp.com/terraform/1.16.6/).
  SHA-256 checked against the `SHA256SUMS` file on the same server. The detached
  signature of that file was not independently verified: this acquisition
  therefore depends on the HTTPS channel and is not provenance verification
  independent of the download server.
- Provider `hashicorp/google` **8.7.0**, HashiCorp signature recognized by Terraform,
  locked in `infra/gcp/.terraform.lock.hcl` for Linux and Windows amd64.

The tools were placed in a temporary directory; they are not included
in the repository distribution. Compilation requires no cloud subscription or
project.

## Remaining limitations

Validation does not test available APIs, inherited permissions, network boundaries,
quotas, billing, regional availability, secrets, HSMs, restoration,
multi-instance operation or remote effects. The foundations deploy no runtime.
Skill validity does not measure effectiveness on all agents; the
roles are explicitly loaded Markdown contracts, not universally
autodiscovered configurations.

## GitHub Actions addendum

On October 17, 2026, the fourth skill added for this release,
`proof-workflow-automation`, passed `quick_validate` and the
`agents/openai.yaml` metadata check (25–64-character description and skill
reference in the prompt). The author agent ran these checks. Routing in
`AGENTS.md` points to this skill. Structural validation does not demonstrate
the effectiveness of its instructions across all clients.
