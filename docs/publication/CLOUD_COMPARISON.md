# Azure and GCP: experiment plans, not a production offering

Dossier status: **October 17, 2026**. The sources below were consulted
on that date. They describe provider capabilities, not tests run
on ZK-agentiK. No cloud resource was created for this dossier.

## Proposed decision

Keep the local laboratory for current measurements. Prepare two
network/identity foundations to compare; choose the cloud with the user
after clarifying regions, existing purchases, data residency and
key constraints. The `@zk-agentik/proofkit-sdk` SDK exposes trusted
adapters; it does not automatically generate a safe circuit or a durable
distributed protocol.

**H14 and H17 block multi-instance qualification.** The Horizon controller
and its local SQLite target currently share their transaction. Putting this
application in a cloud container does not preserve that property for a
remote target. PostgreSQL is a candidate for shared state; it does not make
an effect in another API atomic. An idempotency contract, a
version precondition, status queries and crash tests are required.

## Capabilities and undecided matters

| Boundary | Azure | GCP | Remaining work |
| --- | --- | --- | --- |
| Runtime identity | Separate managed identities for prover and controller [A1] | Separate service accounts attached to the runtime [G1] | Least privilege and evidence of real denials |
| Deployment identity | Entra federation [A2] | Workload Identity Federation [G2] | Restrict issuer, audience and subject to the authorized project/ref; no long-lived CI key |
| Private containers | Internal Container Apps environment, custom network [A3] | Cloud Run with authenticated ingress chosen separately from Direct VPC egress [G3] | Test DNS, ingress, egress, API access and platform dependencies |
| Current profile keys | The Key Vault table does not list Ed25519 [A4] | `EC_SIGN_ED25519` is listed under **software** protection, PureEdDSA over the raw message; absent from the consulted HSM table [G4] | No KMS adapter executed; do not present either as a ready compatible HSM |
| Shared state | PostgreSQL Flexible Server HA and private access available [A5,A6] | Cloud SQL PostgreSQL HA [G5] | Reservation schema, isolation, migration, recovery and H14 to implement |
| Archives | Immutable Blob with retention policies [A7] | Cloud Storage Bucket Lock [G6] | Contractual duration, data minimization, export and restoration; no lock activated |
| GPU | Documented serverless offering [A8] | Documented Cloud Run GPU [G7] | Regions, quota, model and benefit to verify on the executed relation; no GPU planned by default |

A managed identity reduces secret distribution; it does not validate
attested facts. Identity permissions may be cached: application
revocation and its `trust_epoch` must not be equated with instantaneous
IAM revocation [A1].

Key stores are not interchangeable. Choosing Azure requires either a
compatible signing service whose boundary will be examined, or a different,
versioned and reviewed signature profile. GCP software support allows
an Ed25519 adapter to be considered, subject to testing signed bytes,
public formats, limits, rotation, latency and unavailability. It does not satisfy
an HSM requirement on the basis of this documentation alone [A4,G4].

Cloud Run's writable filesystem is instance-bound and is not
a shared durable store [G8]. Likewise, mounting a volume on a
Container Apps instance does not demonstrate coordination between two controllers:
that latter conclusion is our protocol analysis, not a provider guarantee.

## Two falsifiable technical plans

### Azure plan

Provided foundation: [Bicep](../../infra/azure/main.bicep), VNet, two subnets,
NSG with explicit denials, two identities without RBAC. Compile and lint locally.
This is not a Container Apps environment ready to run: delegations,
platform rules and endpoints remain absent. Compilation incurs no
runtime cost.

Next experiment, after the cloud scope is chosen and authorized: private
runtime with image pinned by digest; only the controller authorized to call a
sandbox target; private PostgreSQL; secrets and signing chosen after H13. Demonstrate
cross-tenant denial, denial of prover egress to the target, then two concurrent
controllers and failures at H14 transitions. Restoration must retain
terminal operations and never release an `UNKNOWN` operation without evidence
of its target state.

### GCP plan

Provided foundation: [Terraform](../../infra/gcp/main.tf), VPC without a default
route, IPv4 subnets, traffic denial and two service accounts without roles.
Locked provider; no API activated. The accounts have no exportable keys
created by the module. Traffic to private APIs remains to be designed.

Next experiment: separate deployment and runtime identities; Cloud Run with
explicitly defined ingress, `all-traffic` egress routing and minimal rules;
remote transactional database; independent sandbox target. VPC egress
routing does not make ingress private, and `private-ranges-only` does not control all
outbound traffic [G3]. Run the same H14 scenarios as on Azure, then measure
cold latencies, recovery and behavior on loss of KMS.

In both plans, prioritize CPU measurement of the small Horizon circuit. A
GPU may apply to another profile, particularly a general-purpose zkVM; it is not
a demonstrated optimization of the current Bulletproofs relation.

## Parameterized cost, without invented amounts

Compare the **same workload** and the **same availability level**. No
invoice, currency, region or production volume has been validated. Prices must
be extracted at estimation time from official pages [A9,G9] and the selected
ancillary services. Full cost remains unknown, as stated in H16.

```text
C_month = active_CPU + active_RAM + possible_idle_minimum
        + primary_database + HA_replica + storage + backups
        + outbound_network + endpoints/connectivity + KMS_requests
        + ingested_logs + retained_logs/archives + image_registry
        + observability + support + measured_operating_cost
```

For each term retain unit, quantity, price, currency, region, date, source,
taxes and any discount. Separate proof preparation cost, reused B
presentation cost and complete authorization cost. Network delays,
cold starts, denials, recovery and KMS calls are absent from current
CPU cryptographic measurements. Do not extrapolate 1.247 ms into the price of a
cloud transaction. GPU is a separate line item, with zero resources planned
until a benefit has been established.

## Archiving and compliance

Retention locks have irreversible consequences: after locking,
the documented policies can no longer be deleted or shortened
[A7,G6]. Nothing of that kind is enabled in the skeletons. Duration must not be
inferred from the word “bank” alone; it depends on the actual retention scope.
Immutable storage preserves bytes. It does not prove the truth of their
contents, audit completeness, an event's time or DORA compliance.

## Primary sources and scope

All consulted on October 17, 2026. High confidence in the existence of the
described features; availability in a tenant/region, cost and suitability
for the project **not experimentally verified**. Pages may change.

- [A1 — Container Apps managed identities](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity)
- [A2 — Entra identity federation](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [A3 — Container Apps networking](https://learn.microsoft.com/en-us/azure/container-apps/networking)
- [A4 — Key Vault types and algorithms](https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys)
- [A5 — PostgreSQL Flexible Server HA](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-high-availability)
- [A6 — PostgreSQL Private Link](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-networking-private-link)
- [A7 — Immutable Blob](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [A8 — Container Apps GPU](https://learn.microsoft.com/en-us/azure/container-apps/gpu-serverless-overview)
- [A9 — Container Apps pricing](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [G1 — Cloud Run service identity](https://docs.cloud.google.com/run/docs/configuring/services/service-identity)
- [G2 — Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation)
- [G3 — Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [G4 — Cloud KMS algorithms by protection level](https://docs.cloud.google.com/kms/docs/algorithms)
- [G5 — Cloud SQL PostgreSQL HA](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- [G6 — Bucket Lock](https://docs.cloud.google.com/storage/docs/bucket-lock)
- [G7 — Cloud Run GPU](https://docs.cloud.google.com/run/docs/configuring/services/gpu)
- [G8 — Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract)
- [G9 — Cloud Run pricing](https://cloud.google.com/run/pricing)
