---
name: cloud-proof-infrastructure
description: Design and verify the Azure or GCP foundations of ZK-agentiK with separate identities, compatible keys, private network, persistence and explicit costs, without presenting the SQLite laboratory as a qualified distributed service.
---

# Cloud boundaries and proofs

Read `docs/03-ARCHITECTURE.md`, `docs/publication/CLOUD_COMPARISON.md`,
`issues/horizon/NEXT_EXPERIMENTS.md` and the provider README in `infra/`.
The current skeletons only create closed networks and identities without
permissions. A local validation demonstrates neither deployment nor real isolation.

## Procedure

1. Identify region, organization, residency requirements, load, RPO/RTO,
   budget and data owner. Mark missing answers as
   assumptions; do not invent a regulatory obligation.
2. Draw separately the identity of the deployment, of the prover, of the
   controller and of the target. The agent/prover never obtains the mutation
   credentials.
3. Check the current primary documentation for each KMS algorithm and protection
   level. Software Ed25519 being available does not mean an HSM is available.
   An algorithm change requires a versioned profile and a protocol review.
4. Describe ingress, egress, DNS, access to cloud APIs and the control plane. A
   private endpoint is not enough to forbid egress; an empty NSG is not
   necessarily closed. Check implicit rules and priorities.
5. Require H14 for a remote effect: durable reservation, business identifier,
   target precondition, idempotence and reconciliation after a lost ACK. PostgreSQL
   alone does not make a remote API call atomic. Refuse local SQLite as
   evidence of multi-instance recovery on Cloud Run or Container Apps.
6. Cost with dated prices and assumptions: active and idle CPU/RAM, minimums,
   storage, HA, backups, network, logs, KMS and support. No GPU by default
   without measuring a gain on the relation actually executed.

## Validation and delivery

Compile Bicep or run `terraform fmt -check` and `terraform validate` after
installing the locked providers. Do not confuse this validation with
an authenticated `plan` or a cloud test. Keep versions and fingerprints.
Present the missing dependencies and the required failure experiments.
Any application, enabled API or paid resource must stay within the session's
authorized scope; none is needed for local validation.
Do not lock an irreversible retention for a mere demonstration.

Have the boundaries re-read with `.agents/roles/cloud-boundary-reviewer.md` when
a separate review is requested; do not announce a banking certification.
