# 04 — Stabilize the SDK profile and migrate to MCP V2

Milestone: M2. Priority: P1. Dependencies: 01, 08.

## User story

As an integrator, I graft verifiable admission onto my existing control without
making security depend on the LLM's voluntary behavior.

## Technical architecture

Evaluate the official MCP V2 SDK and the migration from V1. Preserve transport,
content and metadata; negotiate the profile and its namespace. Provide an
adapter separating preparation from effect, and a client-side result verifier.
Compare the ACS/EVC/KedgeFlow interfaces; do not invent a ratified standard.

## Acceptance criteria

- Official client, negotiated version, absent/refused proof and unknown fields tested.
- Real Claude Desktop/Cursor/LangChain tests if their compatibility is claimed.
- No handler effect before verification, no implicit downgrade.
- Machine schema and RFC in sync; naming decision documented.

## Test commands

`npm test`, `npm run typecheck`, `npm run schema:check`, `npm run demo`.
Add an isolated version/transport matrix and publish the versions
actually tested, without extrapolating to all MCP clients.
