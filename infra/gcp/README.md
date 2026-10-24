# Experimental GCP foundation

This Terraform module describes an IPv4 VPC without a default route, two subnets,
two explicit traffic denials and two service accounts **without roles or keys**.
It creates no project, enabled API, application, database, KMS key, storage, GPU,
connector, NAT or public endpoint. Project and region are required inputs.

The module is deliberately unusable for a complete application: private
Google services, DNS, authenticated ingress and controller/target traffic are
to be designed. Hierarchical policies and platform-plane exceptions
are not inspected. No GCP isolation has been measured.

## Validation without cloud resources

Terraform 1.16.6 and Google provider 8.7.0 are the versions of the local validation.
The initial installation downloads a public provider; it calls no
resource-creation API and requires no cloud identity:

```sh
terraform -chdir=infra/gcp fmt -check
terraform -chdir=infra/gcp init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/gcp validate
```

After installation, `validate` works offline with the local provider.
For a first installation entirely offline, provide a provider mirror
and its Terraform configuration; the binary alone is not enough.
Keep `.terraform.lock.hcl`. Do not commit state, plan, tenant variables
or credentials. The results are in [the log](../../docs/publication/VALIDATION.md).

A successful `validate` tests neither inherited IAM, enabled API, quotas, region, cost,
actual creation, connectivity nor organizational restrictions. No authenticated
`plan` or `apply` has been run for this contribution.

## Conditions before an experiment

Define the federated deployment identity with issuer, audience and subject
restrictions; grant no access to all forks of a repository. Then separate
the permissions of the two runtime identities. Direct VPC egress and Cloud
Run ingress are distinct settings, absent from the module. The runtime will need
a real remote transactional database and an H14 protocol before any
multi-instance claim. See [the comparison](../../docs/publication/CLOUD_COMPARISON.md).
