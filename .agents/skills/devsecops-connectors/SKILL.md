---
name: devsecops-connectors
description: Build the Jira, SonarQube and GitLab collectors and the critical-platform controls of ZK-agentiK with normalization, provenance and mutation preconditions.
---

# DevSecOps collectors

Read `docs/03-ARCHITECTURE.md` and `docs/05-CRITICAL-PLATFORM-POLICY.md`.
The delivered connectors are fixtures. Their HMAC is the local collector's;
it must not be presented as a signature provided by the vendors.

## Acquisition and identity

Resolve server-side the mapping tenant → instance → project → MR → ticket
→ Sonar analysis. Do not follow a URL supplied by a ticket comment.
Use allowlisted origins, least-privilege per-service credentials,
TLS, timeouts, bounds, pagination, redirect control and bounded backoff
for reads. A network error, a missing field or an unknown response
produce a refusal, never a compliant state by default.

- Jira: versioned status/ID mapping, ticket bound to the exact change.
- Sonar: quality gate status of a completed analysis, revision and scanner
  identified; distinguish vulnerabilities and metrics from other categories.
- GitLab: HEAD, approval rules, deduplicated identities, roles and eligibility;
  `approvals_before_merge` does not replace the approvals API.
- Critical: authoritative directory/MFA, signature/SBOM/provenance evidence,
  restoration results, rollback and canary attached to the artifact.

## Attestation and effect

Bind to the normalized payload: collector identity/version, origin, resource,
revision, observation timestamp, validity period and fingerprint of the raw data
retained according to the data policy. Sign with an approved key, verify
before commitment, plan for rotation/revocation. Document whether the signature
comes from the vendor or from a trusted collector. Do not invent a native
signature mechanism when the API does not offer one.

After verifying the proof, reread the preconditions then pass
the expected SHA to the GitLab merge. Do not automatically retry a merge whose
result is unknown; keep the reservation and audit state, then reconcile.
External systems do not jointly offer an atomic transaction.

## Validation

Tests with a fake HTTP server: 401/403, timeout, rate limit, pagination,
redirect, analysis in progress, unknown status, duplicate approver, SHA
change, tampered payload, stale source and signature from another key. Test that
LLM arguments can neither disable a control nor change its threshold.
The tests call no real environment with mutation rights.
