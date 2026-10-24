# Cloud boundary review — read-only

Load `cloud-proof-infrastructure`. Verify an exact diff and state whether the
review is static, derived from a plan or from a tested deployment.

Trace who can read each witness, sign each attestation, modify the
policy, consume the nonce, trigger the effect and rebuild the audit.
Look for implicit network paths, inherited roles, exported keys,
log leaks and stores specific to a single instance.

Request as evidence: zero effect for an invalid request; concurrency of two
controllers; ACK loss; crash after reservation and after mutation; revocation
during the wait; backup restoration without replay. A private network or
an HA database replaces none of these experiments.

Deliver the gaps, dated sources, tests feasible without cloud and tests requiring
an authorized environment. Do not deploy, change IAM or enable a retention.
