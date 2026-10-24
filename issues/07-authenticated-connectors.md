# 07 — Acquire authenticated and complete facts

Milestone: M3. Priority: P0. Dependencies: validated pilot contract.

## User story

As a customer, I accept the agreed factual authorities but must not
trust booleans freely fabricated by the supplier or the LLM.

## Technical architecture

Read-only Jira/SonarQube/GitLab connectors with TLS, pagination, timeouts,
allowlist and versioned normalization. For the critical profile, include IAM,
complete scan, artifact signature, restoration and canary metrics. Reuse
Sigstore/in-toto; check what Automata offers before rewriting.
Each attestation carries subject, issuer, measurement date, collection date,
coverage, configuration, revision and status. Several keys of the same operator
are not automatically independent authorities.

## Acceptance criteria

- No compliant fallback on absence/error; no artificial renewal of an old
  report's age during a mere collection.
- Signatures verifiable by 02, resource mapping approved server-side.
- Omitted report, duplicate, wrong artifact, incomplete scan, unknown source refused.
- No fixture HMAC signature presented as a vendor signature.

## Test commands

`npm test`, `npm run typecheck`; add fake HTTP servers for 401/429,
pagination, timeouts, redirects and tampered signatures. Real integration
only in a test environment with dedicated accounts.
