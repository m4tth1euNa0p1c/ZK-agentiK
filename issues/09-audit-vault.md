# 09 — Private audit dossier and offline verification

Milestone: M3. Priority: P1. Dependencies: 05, 07, 08.

## User story

As a customer auditor, I can re-examine an admission when the supplier
is unavailable, with minimal disclosure and governed access to the evidence.

## Technical architecture

Append-only log with independent checkpoints, encryption and configurable
retention. Separate authorization proof, reservation, attempt, API response
and observation of the result. Keep originals and provenance under limited access.
Exported bundle: proof, program/vkey, policy, dated trust bundle and log.
Historical verification does not attest to a current absence of revocation.

## Acceptance criteria

- No private witness data in the routine export.
- Tampering, omission detectable through checkpoints and obsolete versions tested.
- DORA/AI Act matrix reviewed for the customer: no global certificate or promise
  to replace legal audit rights with a receipt.
- Normal change and future emergency recovery have distinct policies.

## Test commands

`cargo test --workspace --locked`, `npm test`; add offline export/import,
source loss, restoration, revocation and non-disclosure verification.
