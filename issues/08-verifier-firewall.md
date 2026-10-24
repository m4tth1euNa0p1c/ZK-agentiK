# 08 — Make admission durable and verify the target

Milestone: M3. Priority: P0. Dependencies: 01, 07.

## User story

As an operator, I want concurrency, a failure or a lost response to never
reactivate an already-consumed right or authorize any out-of-context mutation.

## Technical architecture

Replace the in-memory nonce/operation stores with shared durable transactions.
Operation identity independent of the challenge, RESERVED/REJECTED/UNKNOWN/
COMPLETED states, fencing/epoch for recovery. Recheck deadlines after every
wait before dispatch. Sandbox target with an atomic version and digest
precondition; explicitly classify resources without this capability.

## Acceptance criteria

- 32 calls, two processes, crash then restart: at most one authorized dispatch.
- A lost response yields UNKNOWN and requires reconciliation, not a blind retry.
- Store partition, stale snapshot, changed image/policy: refusal.
- Clock crossing the deadline during each wait: zero mutation.
- No exactly-once claim or automatic distributed rollback.

## Test commands

`npm test`, `npm run demo:critical`; add a chaos suite on the datastore and
sandbox target with independent traces. The current in-memory tests are a
baseline and do not demonstrate inter-instance durability.
