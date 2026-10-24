# 01 — Implement the first real ZK backend

Milestone: M1. Priority: P0. Dependencies: contract 02 and attestations 07.

Progress: `labs/risc0/host` implements `Risc0LabBackend` and the `ZkVmBackend`
trait, with independent guest and verifier. The bench is historical and
uses a public fixture authority; MCP integration, real sources and
qualification of the confidentiality profile remain open.

## User story

As a customer operator, I verify a policy proof without trusting the
computing party or receiving its private facts.

## Technical architecture

Keep `ZkVmBackend`, implement SP1 or RISC Zero with pinned versions and
toolchain. Choose the proof type and its ZK mode explicitly. Registry
ELF digest → approved native image/vkey. Compare the complete journal of 02.
The Magnetar stub remains unavailable until a verified official SDK exists.

## Acceptance criteria

- Real local proof on a signed fixture; witness absent from the export.
- Wrong journal/image/signature refused; no simulation as fallback.
- Same core and canonical outputs between native and real backend.
- Versions, license, assumptions, RAM and confidentiality documented.

## Test commands

`cargo test --locked -p zkvm-bridge` and `npm test` remain mandatory.
Create an opt-in `backend_conformance` suite and its backend feature;
document its exact command with the toolchain installed. The current stub
test must never be counted as a cryptographic success.
