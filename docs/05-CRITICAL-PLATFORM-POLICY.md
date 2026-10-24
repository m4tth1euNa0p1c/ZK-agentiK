# Sensitive scenario: authorizing a change to a critical platform

Selected scenario: a production change passing through a GitLab merge request.
It extends the POC's DevSecOps request. The executed action remains a
**simulated merge**; no production deployment or real API is called.

```bash
npm ci
npm run demo:critical
```

The demo runs through a real MCP client and server, the Rust worker, the
verifier and the simulated connector. It authorizes the complete evidence
package, then tries 23 isolated adversarial modifications. The merge counter
must not increase for these 23 cases. `npm test` adds emergency-stop cases
during proof generation, removal of the critical profile and expiration
during processing.

## Business policy

The executable core is `crates/policy-engine-core/src/critical.rs`. Fixtures
and example values are in `packages/enterprise-gateway/src/critical.ts`.
All controls are **conjunctive**: no average score compensates for a failure.
A bypass request blocks execution; there is no automatic break-glass procedure
in this POC.

| Control | Authorizing condition in this scenario |
|---|---|
| Base policy | Sonar `OK`, Jira `APPROVED`, no critical vulnerability, >= 3 approvals |
| Separation of roles | Requester, security, operations and service owner: four distinct nonzero identities |
| Authentication | Approvers' MFA verification attested by the collector |
| Approval scope | `approved_revision` = SHA-256 of the ASCII bytes of the exact public `head_sha` |
| Time | Unexpired approvals, open change window, observations less than 60 s old |
| Artifact | Signature, SBOM and provenance marked verified |
| Security | Scan complete, zero high vulnerabilities, zero secrets detected |
| Recovery | Backup restoration and rollback tested |
| Canary | >= 10 min, traffic > 0 and <= 5%, errors <= 500 ppm (0.05%), p99 latency > 0 and <= 250 ms |
| Operational state | No severity 1 incident, healthy dependencies, emergency stop disabled |
| Execution integrity | Same snapshot before/after proof generation, single-use nonce, expirations still valid immediately before the effect |

These thresholds are **test values**, to be replaced by approved rules for
a real platform. The engine also enforces conservative configuration bounds
to prevent an obviously weakened policy: age <= 300 s, canary >= 10 min and
<= 24 h, traffic <= 10%, errors <= 1,000 ppm, latency <= 1 s.
A policy outside these bounds returns a denial; it is not silently corrected.

## Proof, time and denials

The profile adds two optional objects to the wire draft: public `policy.critical`
and private `facts.critical`. They MUST be present together. A threshold of
`min_reviewers < 3` is prohibited when the critical profile is active.
Their full contents are committed by the same hashes as the base profile.

Rust time evaluation uses `public_inputs.issued_at_ms`; it never accesses a
clock. The gateway then rereads facts, checks their equality and rechecks
deadlines against the current time. This second check prevents an approval
that was valid at issuance but expired before mutation from being used.

On a critical violation, bit `32` of `violations_mask` is set and
`critical_violations` contains the accumulated bits below; it is absent when
authorization is granted. Missing critical facts with a critical policy
returns `INVALID_POLICY`, never a fallback to the basic profile.

| Bit | Reason |
|---|---|
| 1 | Emergency stop |
| 2 | Invalid policy or missing facts |
| 4 | Separation of roles / MFA |
| 8 | Expired approvals |
| 16 | Closed window |
| 32 | Old or future observations |
| 64 | Different revision |
| 128 | Unverified artifact, SBOM or provenance |
| 256 | Incomplete scan, high vulnerability or secret |
| 512 | Untested restoration / rollback |
| 1024 | Insufficient or degraded canary |
| 2048 | Major incident |
| 4096 | Bypass requested |
| 8192 | Degraded dependencies |

## What remains to be established for a real environment

An `artifact_signature_verified` boolean does not itself verify a signature.
Fixtures represent the results of future collectors: Sigstore or PKI, scanner,
IAM/MFA, observability, restoration tests. The identity, scope, revision, age
and version of each result will need to be attested. Identities and roles must
come from an authoritative directory and actual approvals for the same change;
a distinct numeric account alone does not prove an independent person.

The simulator is neither a ZK proof nor a product ready for a critical platform.
Issues 01, 02, 07, 08 and 09 cover the missing primitives.
The control provides necessary conditions for this scenario; it demonstrates
neither the complete safety of a system, nor the absence of flaws, nor certification.
