# 02 — Prove the journal and the attested facts in the guest

Milestone: M1. Priority: P0. Dependency: source contract 07.

Progress: the `labs/risc0/methods/guest` guest uses `policy-statement`,
recomputes the commitments, publishes the complete journal and verifies a
fixture Ed25519 signature inside the VM. The bare ELF probe is kept separately.
Attestations from several real sources and their completeness remain to be done.

## User story

As a verifier, I know that the rules applied to the authorized attestations
of the same artifact, the same target and the right period.

## Technical architecture

Replace the ELF probe with an input/journal adapter native to the chosen zkVM.
In the guest: verify signatures, issuers, subject, schema and completeness;
bind revision, artifact, environment, configuration, policy and challenge.
Evaluate the `no_std` core, recompute commitments and publish the journal.
Collections and signature sizes are bounded. No home-made crypto.

## Acceptance criteria

- An attestation that is omitted, expired, for another subject or from an unknown key is refused.
- Identical host/guest vectors, time/number edge cases and unknown status.
- No secret data in journal/logs; policy and disclosures declared.
- Guest cycle count and memory are measured.

## Test commands

`cargo test --locked -p policy-engine-core`, `npm run build:guest`.
Add to the real backend a prove/verify test of the complete guest and its
reproducible invocation; the current freestanding compilation does not stand in for it.
