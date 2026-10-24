# 10 — Package and qualify on-premise deployment

Milestone: M3. Priority: P2. Dependencies: 01–09 and pilot decision.

## User story

As a platform operator, I deploy an isolated, reproducible and observable pilot
without private data leaving to an imposed external service.

## Technical architecture

Multi-stage images pinned by digest, non-root, read-only filesystem,
CPU/RAM quota, mounted secrets, prover/verifier/credentials separation, SBOM
and image signatures. Configure durable datastore, key rotation, backup
and recovery with anti-rollback. Disable any simulation in production mode.
The emergency recovery procedure remains a separate action with a bounded mandate.

## Acceptance criteria

- Reproducible deployment with verified artifacts and explicit egress policy.
- No credential in image/logs; agent without an alternative mutation path.
- Restoration procedure does not reactivate a consumed operation.
- Test unavailable source/prover/store, migration and UNKNOWN reconciliation.
- Human review of the trust boundary before any production.

## Test commands

Add `docker compose ... config` and a sandbox smoke/chaos suite once
the images exist. Before that: `npm test`, `cargo test --workspace --locked`.
Do not display a hypothetical Docker command as an existing deployment.
