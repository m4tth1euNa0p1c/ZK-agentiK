# 06 — Agent example and inter-company admission pilot

Milestone: M2. Priority: P2. Dependencies: 04, 05, 07–08.

## User story

As a distinct supplier and customer, we validate a concrete change without
sharing raw facts or giving the agent the right to bypass admission.

## Technical architecture

Keep the merge/critical demos as a simulation. Add a sandbox example of
**promotion of an immutable artifact**, with the supplier's prover and the
customer's verifier in two distinct domains. The action includes target,
environment, configuration, expected version and digest. A scripted agent is
enough to test the control; no LLM subscription required.

## Acceptance criteria

- One accepted flow and an adversarial corpus, proof verified before real sandbox dispatch.
- The customer does not receive the witness, even through errors/logs.
- Mutation credentials are not accessible to the agent/prover.
- Commercial fit validated by one supplier and one customer, without
  pretending that this pair is enough to demonstrate a global market.

## Test commands

`npm run demo`, `npm run demo:critical`, `npm test`.
Add a separate ZK example runner; the current demo remains clearly marked.
