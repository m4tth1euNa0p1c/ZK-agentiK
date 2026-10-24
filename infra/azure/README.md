# Experimental Azure foundation

`main.bicep` describes a VNet, two subnets, two NSGs with explicit inbound/outbound
denial and two managed identities **without RBAC assignment**. It creates
no application, key, secret, database, storage account, GPU, public endpoint, NAT
or subscription. The target resource group must already exist.

These subnets do not constitute a Container Apps environment: delegation,
sizing, DNS, control-plane rules and private access remain to be
designed according to the chosen runtime. Platform traffic exceptions and
inherited policies require verification in the tenant. No Azure network test
has been run; "explicit denial" describes the file, not an observed
isolation of a deployed service.

## Local validation

With Bicep 0.48.1 installed, without an Azure connection or resource creation:

```powershell
$compiled = Join-Path $env:TEMP 'proofkit-azure-template.json'
bicep build infra/azure/main.bicep --outfile $compiled
bicep lint infra/azure/main.bicep
```

The compiler uses its embedded types; no reference to a remote module
is present. The compiled result is not a deployment validated by
Azure. Compilation checks neither quota, region, CIDR conflict, rights, price nor
organizational constraints. See [the local log](../../docs/publication/VALIDATION.md).

## Steps before a cloud experiment

Choose region, tenant, runtime and spending limits. Prepare a federated
deployment identity with restrictive issuer/audience/subject; runtime
identities remain separate. Write the minimal rules and test denials from
the prover and the controller. Mutation control must never be assigned
to the prover. These steps are not implemented in this skeleton.

The Horizon Ed25519 profile is not interchangeable with the curves listed
by Azure Key Vault. No cloud signing adapter is provided. Read
[the comparison and sources](../../docs/publication/CLOUD_COMPARISON.md)
before choosing an algorithm or adding an application.
