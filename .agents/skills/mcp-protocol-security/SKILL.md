---
name: mcp-protocol-security
description: Modify the MCP SDK, the _meta.zkp envelope and the ZK-agentiK firewall while preserving the binding, anti-replay and verify-before-mutation guarantees.
---

# MCP and verifiable envelopes

Read the local RFC and the types of the **installed** version of the MCP SDK.
The repository uses V1 as a bootstrap choice; do not copy a V2 API into this
import. The strict Zod schema is the source of the generated JSON schema.

## Mandatory sequence

Prepare in read mode: collect the approved facts, establish the commitment and
the policy server-side, then request the proof. Before any effect:
validate structure/bounds, pinned backend and image, independent expectations,
proven journal, decision, expiration, atomic nonce reservation and
resource preconditions. Reread facts and deadlines just before mutation.

Never accept policy/min_reviewers, witness, verifier URL, key or
command from the agent's arguments. The agent may supply the authorized
identifiers of the resource; their routing and the credentials stay server-side.
An unavailable backend and the simulation profile in production fail closed.

## Metadata and clients

Attach `zkp` in a copy of `_meta`, preserve the other metadata and
the MCP `content`. A legacy client displays the content; only a
profile-aware client claims a verification. The gateway enforces the control
even if the client ignores `_meta`. Do not claim tested support for Claude
Desktop, Cursor or LangChain without running their compatibility tests.

Tool errors return `isError=true` and a message without witness or
secrets. Do not confuse the authorization proof with proof of the API result.
The `zkp` key is experimental and not registered with MCP.

## Trials

Run `npm test`, `npm run typecheck`, `npm run schema:check`. Test tampering
with each bound field, rejection of a missing proof, downgrade, concurrent
nonce, verifier failure, expiration during verification and the
**zero side effect** counter for all refusals. An ambiguous API error
keeps the nonce; no automatic merge retry.
