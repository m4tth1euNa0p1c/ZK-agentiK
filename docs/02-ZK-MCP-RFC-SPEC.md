# zk-MCP RFC 1.0 — DevSecOps profile, experimental proposal

Status: **Draft 01**, October 15, 2026. Proposed wire value: `spec_version="1.0"`.
This document is not an MCP-ratified standard. Package version: 0.1.0.
The terms MUST, MUST NOT, SHOULD and MAY express the profile's requirements.
The POC implements the `simulation` profile; no production ZK profile is
implemented yet. Production requirements describe the target to build.

The `labs/risc0` experimental testbed now implements a real proof of the common
relation and a fixture collector signature. It is neither a production profile
nor an attestation of confidentiality for critical data.
Its API verifies historical challenges without authorizing real effects.

## 1. Purpose and scope

Prove that the approved policy program evaluated the committed facts for a
specific action, then verify this assertion **before** the side effect.
The proved result does not assert that the API actually performed the merge.
User authorization, IAM and GitLab restrictions continue to apply.

MCP responses remain `CallToolResult` objects with `content`, optionally
`structuredContent`, `isError` and `_meta`. The receipt is in `_meta.zkp`.
Other `_meta` keys MUST be preserved. A legacy client may display the result
without verifying it. A profile-aware client MUST refuse to consider a result
without a receipt verified. References:
[MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools),
[MCP metadata](https://modelcontextprotocol.io/specification/2025-11-25/basic).

## 2. Schemas, types and limits

Machine-readable structural schema: [`schemas/zkp-envelope.schema.json`](schemas/zkp-envelope.schema.json).
Source: `packages/zk-mcp-sdk/src/schema.ts`. The relational constraints below
complement the JSON Schema. Business objects and the envelope are strict:
unknown fields, incorrect types or out-of-range values MUST be rejected.

| Required field | Type / convention | Meaning |
|---|---|---|
| `spec_version` | Exact string `1.0` | Version of this candidate profile |
| `zkvm_backend` | `native-simulator`, `sp1`, `risc0`, `magnetar` | Registered identifier, never a URL or executable path |
| `security_profile` | `simulation` or `zk` | Claimed guarantee; bound to the pinned backend |
| `elf_image_id` | `sim-sha256:` or `sha256:` + 64 lowercase hex characters | Simulated source identifier or registered compiled artifact digest |
| `public_inputs_hash` | 64 lowercase hex characters | Commitment to all public inputs |
| `public_inputs` | Object defined below | Complete statement, available to the verifier |
| `public_outputs` | `{allow:boolean, violations_mask:integer, critical_violations?:integer}` | Mask 0..63; critical details 1..16383 for a critical denial |
| `proof_bytes` | Canonical RFC 4648 base64, with padding | Engine-specific opaque proof; in the simulator, plaintext witness |
| `timestamp` | Nonnegative safe integer, Unix UTC milliseconds | Equal to `public_inputs.issued_at_ms`; not a certified clock |

`proof_bytes` is capped at 1,400,000 base64 characters in this profile; the
worker enforces 2 MiB per JSONL message. Any increase requires a new review
of memory and CPU limits. The ZK envelope does not allow fetching proofs
from an agent-supplied URL.

`sha256:<digest>` identifies the registered ELF and is not assumed to equal a
RISC Zero image ID or an SP1 vkey. The adapter MUST verify the receipt with
the native identity **pinned in its trust registry**, associated with this
digest. The simulated identifier is the domain-separated SHA-256 of the core,
guest adapter and bridge sources; it is not an attested ELF.

### Public inputs

```text
public_inputs = {
  audience: token,
  context: {
    tenant_id: token,
    tool: "verifiable_gitlab_merge",
    project_id: u32_nonzero,
    merge_request_iid: u32_nonzero,
    head_sha: hex_lower_40_or_64
  },
  policy: { min_reviewers: u32_nonzero, critical?: CriticalPolicy },
  policy_hash: hex_lower_64,
  input_commitment: hex_lower_64,
  nonce: hex_lower_64,
  issued_at_ms: safe_uint,
  expires_at_ms: safe_uint
}
```

`token`: 1..128 ASCII characters `[A-Za-z0-9._:/-]`. `u32`: 0..2^32−1.
`safe_uint`: 0..2^53−1. `head_sha` is a revision precondition, not a claim of
SHA-1 cryptographic security. A multi-instance gateway MUST add the canonical
GitLab instance and its routing to the audience registry; numeric identifiers
alone are not global.

The server chooses audience, tenant, policy, nonce and lifetime. The caller
chooses only project, MR and HEAD in the POC. The project MUST be authorized
by server configuration. `expires_at_ms > issued_at_ms` and duration <= 60,000 ms.
The demo chooses 30,000 ms. The verifier accepts issuance at most 1,000 ms
in the future and rejects `now >= expires_at_ms`.

### Private witness

```text
private_inputs = {
  facts: {
    sonar_quality_gate: ASCII_printable_string_max_64,
    jira_status: ASCII_printable_string_max_64,
    critical_vulnerabilities: u32,
    approvals: u32,
    critical?: CriticalFacts
  },
  salt: hex_lower_64
}
```

The salt MUST come from a host CSPRNG, with 32 independent bytes per commitment.
It hides the small fact space in a published commitment. Neither salt nor
facts may be published in a ZK profile. The simulator deliberately publishes
them in its receipt and MUST use fixtures only. The prover sees the witness;
ZK does not protect data from the party producing the proof.

## 3. Canonical encoding and relation to prove

`C(x)` is UTF-8 JSON without unnecessary whitespace, ASCII keys sorted
lexicographically, strict JSON values, well-formed Unicode strings and safe
integers only. No floating-point numbers, `-0`, `NaN`, `undefined` values,
sparse arrays or custom prototypes. The business schema restricts public and
private strings to ASCII. This profile is deliberately narrower than general
JSON; it does not claim full RFC 8785 support.

`H_d(x) = SHA-256(UTF8(d) || 0x00 || C(x))`, encoded as lowercase hex.

```text
input_commitment = H_"zk-mcp/witness/v1"(private_inputs)
policy_hash      = H_"zk-mcp/policy/v1"(public_inputs.policy)
public_inputs_hash = H_"zk-mcp/public-inputs/v1"(public_inputs)

allow = (sonar_quality_gate == "OK")
     && (jira_status == "APPROVED")
     && (critical_vulnerabilities == 0)
     && (approvals >= min_reviewers)
     && (min_reviewers > 0)
```

Status comparisons are exact and case-sensitive; no LLM normalizes a decision.
The mask accumulates bits `1` Sonar, `2` Jira, `4` vulnerabilities,
`8` approvals, `16` invalid policy, `32` critical profile denied.
An authorization MUST have `allow=true`, `violations_mask=0` and no
`critical_violations` field.

`CriticalPolicy` and `CriticalFacts` are defined exactly by the JSON schema
and the [critical profile](05-CRITICAL-PLATFORM-POLICY.md). They MUST appear
together. The fields are committed alongside the rest of the witness and
policy. The critical evaluator receives public time and
`SHA-256(UTF8(context.head_sha))`; it compares this revision with
`approved_revision`, a private 32-byte array. The four base conditions remain
necessary. The agent cannot select any critical field through tool arguments.

For an approved program `P`, a production proof MUST establish:

```text
∃ w : H_witness(w) = p.input_commitment
  ∧ H_policy(p.policy) = p.policy_hash
  ∧ public_journal = (spec_version, backend, security_profile,
                      elf_image_id, H_public(p), P(w.facts, p.policy), timestamp)
  ∧ timestamp = p.issued_at_ms
```

The guest program MUST verify commitments **within the proved execution** and
publish this journal. The verifier MUST compare the proved journal with the
envelope; verifying a proof detached from this journal is insufficient.
Fact authenticity is a separate requirement, satisfied by an attested source
and commitment comparison by the trusted firewall. Integrating the source
signature into the guest is a possible future extension.

The native POC and lab guest share the relation in `policy-statement`.
The RISC Zero guest verifies commitments and publishes the complete journal;
it also verifies an Ed25519 signature over the challenge, with a fixture
authority pinned in the image. The bare `policy-guest-riscv` binary remains
a separate compilation probe. Real sources and the production integration
in issues 01–02/07 remain necessary.

### Simulation receipt

The base64 field contains `C({private_inputs, statement_hash})`, where
`statement_hash = H_"zk-mcp/statement/v1"(public_journal)` uses a named object
corresponding to the seven journal fields above. The worker recomputes the
entire receipt and requires exact equality. **Anyone holding the witness can
recreate this receipt**; this hash is neither an authentication mechanism nor
a ZK proof. The firewall rejects this profile by default.

An exact shared vector, with hashes independently produced in Python, is in
[`../tests/fixtures/policy-v1.json`](../tests/fixtures/policy-v1.json).

## 4. State machine and order of operations

```mermaid
sequenceDiagram
  participant A as MCP Agent
  participant G as Gateway / Firewall
  participant C as Approved collectors
  participant P as Prover
  participant R as Replay store
  participant L as GitLab
  A->>G: tools/call(project, MR, HEAD)
  G->>C: Read states for this action
  C-->>G: Normalized snapshot and attestation
  G->>G: Check source, freshness, policy; create nonce and commitment
  G->>P: Public inputs + private witness
  P-->>G: Envelope + proof / simulation receipt
  G->>G: Verify image, journal, proof, decision and expiration
  G->>R: Consume nonce atomically
  R-->>G: Unique reservation
  G->>G: Reserve business operation independently of nonce
  G->>C: Reread preconditions
  G->>G: Check source, commitment and deadlines after waits
  G->>L: Merge with expected sha (simulated in POC)
  L-->>G: API result
  G-->>A: CallToolResult + _meta.zkp
```

States: `COLLECTED → PROVED → VERIFIED → RESERVED → EXECUTED`.
A failure leads to `DENIED` before reservation, or `FAILED/UNKNOWN` after
reservation. No path skips `VERIFIED`. A reservation remains consumed after
an API error or timeout; reconcile state before any new attempt.
There is no exactly-once execution guarantee between a datastore and a
nontransactional external API.

The verifier receives `expectedInputs` from a server-side stored challenge,
never solely from receipt content. It MUST compare all inputs, recompute their
hashes, verify the proof and then check expiration again. The anti-replay key
derives from `{audience, tenant_id, nonce}`. Insertion MUST be atomic and durable
in production; `MemoryReplayStore` is limited to a single-process demo.
A result without a proof or an unknown engine blocks execution.

The gateway additionally reserves a business identity
`H_"zk-mcp/operation/v1"({audience,context})`, independent of nonce and policy.
Two challenges therefore cannot execute the same operation again.
The demonstration store retains `RESERVED`, `COMPLETED`, `UNKNOWN` or
`REJECTED`. A time-based denial after reservation retains `REJECTED`;
no automatic retry is allowed. The demo bounds the store at 10,000 operations.
Time and critical deadlines MUST be rechecked **after** any reservation wait,
immediately before dispatch. This local check does not guarantee the commit
time of a remote API: an atomic deadline requirement needs target support.
Durability and cross-instance sharing of these two stores remain required
before production.

Adding a proof **after** the GitLab call is not a preventive control.
`guardedToolHandler` therefore separates read-only preparation from an effect
function. Tool failures return `isError=true` and readable content without
secrets. An MCP connection with a legacy client remains usable because the
gateway enforces verification.

## 5. Threat model

| Adversary / incident | Intended protection | Explicit limitation |
|---|---|---|
| LLM hallucination | The LLM supplies neither facts nor threshold; proof of a deterministic policy | An incomplete policy remains incomplete |
| Prompt injection in Jira / tool result | No textual instruction is executed; strict normalization | Does not protect actions outside the firewall |
| Compromised orchestrator | Bind action, committed source, image, audience and nonce; credentials held only by the firewall | Requires a separate, uncompromised firewall/verifier |
| Malicious prover | Verification of a real proof against a pinned image | The simulator does not offer this cryptographic guarantee |
| False upstream data | Provenance, approved collector signature, freshness, revision identity | The signature attests to the observation, not the truth of the source system |
| Proof/policy/ELF substitution | Trust registry and journal comparison | The registry and build chain remain roots of trust |
| Replay / concurrency | Nonce reserved atomically before the effect | In-memory store lost on restart; prohibited in production |
| Change between check and merge | Reread facts, GitLab `sha` precondition | Jira, Sonar and GitLab do not form an atomic transaction |
| Denial of service | Size bounds, worker timeout, maximum 64 requests in flight | Rate limiting and isolation of real provers remain to be built |

An input hash does not prove API provenance. The POC uses a local collector
HMAC to test snapshot tampering; it is neither a Jira/GitLab/Sonar signature
nor a publicly verifiable attestation. A production deployment MUST define
keys, rotation, revocation, service identities and normalization versions.

## 6. Confidentiality, versioning and compatibility

Public fields expose project, MR, HEAD and decision. The denial mask reveals
violation categories: this leakage is part of the profile. Logs MUST avoid
witnesses, tokens and sensitive raw responses. Audit retention periods and
access rights are defined outside the protocol.

The mere presence of SHA-256 does not justify a “100% post-quantum” label.
Such a property requires analysis of the backend, parameters, signatures,
composition and every cryptographic dependency.

An unknown profile or backend version MUST be rejected, without downgrade.
The `_meta.zkp` extension is private to this prototype; standardization will
require public review, governance, naming and cross-implementation tests.
MCP SDK V1 status and its V2 migration are tracked by issue 04.
