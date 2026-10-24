# Horizon — adversarial security review

Date: October 17, 2026. Status: **review contract and independent code examination**.
This review distinguishes a cryptographic relation, a current decision and an
observed effect. It does not constitute an independent audit of the
primitives. The trials actually executed are recorded in
[EXPERIMENT_LOG.md](EXPERIMENT_LOG.md); a requirement below is not a result
acquired by its presence in this document.

## Decision of the challenger committee

**GO for a bounded synthetic laboratory; NO-GO for a production deployment, a
claim of cryptographic novelty or a validated commercial demand.**
The chosen scenario is `record_claim_authorization`: record a decision on a
synthetic insurance case. It does not pay an insurance claim, does not reserve
a provision and does not reduce an annual limit. Moving to any of these
actions would require a new business relation and a review of the target
state.

Vega's reusable preparation is a real technical lead. Its book nevertheless
distinguishes the proof system from the application circuits for parsing and
signature. Its verification API returns the public values; it is up to the
application to compare them with the expected statement. Its canonical engine
uses T256/Hyrax: it does not justify a post-quantum claim.
Primary sources: [Vega scope](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/overview/design-goals.md),
[verification contract](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/spec/scope.md),
[engine](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/building-blocks/fields-and-groups.md).

## 1. Chosen relation and change of issuance contract

Two distinct authorities attest Pedersen commitments:

- the adjuster attests `A = a G + r_a H`, where `a` is the eligible amount;
- the insurer attests `C = c G + r_c H`, where `c` is the per-operation limit.

The Ed25519 signatures are public and verified natively. Each signed message
binds at minimum the protocol domain, the role and identity of the authority,
the commitment, the case, the currency and its scale, the version, the
validity period and the key of the authorized holder. The verifier's registry
imposes roles and keys: the caller does not choose an authority by supplying a
key with its proof.

This profile asks authorities to **sign adapted commitments**. It does not
authenticate existing Jira, JWT, mDL credentials or insurance documents
without an issuance change. A signature over a commitment attests the
commitment; the authority must have checked its opening and the meaning of the
amount before signing. A published synthetic key tests the mechanism; it
authenticates no real organization.

The aggregated proof of two 32-bit ranges covers the derived commitments
`A-G` and `C-A`. With the library's generators and group order pinned, the
whole relation is exactly:

```text
0 <= a - 1 < 2^32
0 <= c - a < 2^32
hence 1 <= a <= 2^32 and a <= c <= a + 2^32 - 1 <= 2^33 - 1.
```

It does not give `c < 2^32`. The application must announce these exact bounds
or add the missing constraint; it must not change their description to make
the circuit match a `u32` type. The ranges, much smaller than the group order,
must prevent a negative difference from being interpreted as a positive amount
after modular reduction.

The verifier itself derives `A-G` and `C-A` from the signed commitments.
Accepting independent range commitments supplied by the prover would remove
the binding to the attestations. Both attestations must cover the same case,
currency, scale, version, period and holder according to the fixed join rule.
Valid signatures over different cases do not compose into an authority.

## 2. Presentation profiles and freshness

### A — proof bound to the request

The proof transcript binds the exact attestations and the expected
authorization context: action, target/tenant, policy and epoch, revocation
version, business operation, nonce and expiration. All fields affecting the
effect belong to this context. A holder signature is required when the profile
imposes its participation: knowing the openings must not implicitly become a
right to represent their owner.

### B — immutable proof and fresh holder authorization

The immutable proof binds the attestations and the mathematical profile. A
fresh holder signature covers **the exact digest of the verified immutable
bundle** as well as the whole current context of the request. The digest
includes proof, attestations, encodings and relation identifier; no
substitutable component remains outside this binding.

This is a **fresh composite authorization over a historical proof**, not a
new ZK proof, a recursion or a proof of freshness of the facts. The immutable
proof is fully verified at its initial admission. Trusted keys, dates,
revocations, policy and operation state are rechecked for each request before
dispatch.

A cache may retain the cryptographic validity of the immutable bundle, with a
key covering its exact bytes, the profile, the parameters and the verifier
version. It never memorizes an "authorized now" verdict. A hit does not exempt
from verifying the fresh signature or the current state. Eviction, restart or
absence of the cache triggers a full verification, never an acceptance by
default. A change of trust root does not silently reuse an old authenticity
verdict.

### C — path selection according to a server policy

The selector may choose A/B, or a native verification of openings if and only
if the policy explicitly authorizes this disclosure. A private mode does not
become public because of a failure, a cost or a caller option. No absent
backend is replaced by an accepted simulation. A policy refusal does not serve
as a signal to try a weaker profile.

## 3. Confidentiality actually sought

| Actor / observation | Visible data or limit |
| --- | --- |
| Issuing authority | The amount whose commitment it attests and its context |
| Prover/holder | Both amounts and openings in this prototype; no confidentiality between authorities and prover |
| Private verifier | Commitments, signatures, authorities, public context, verdict and proof |
| Authorized disclosure profile | The openings and therefore the values transmitted to the verifier |
| Reuse of B | The fixed bundle is correlatable across presentations |
| Prover operator | Potential access to the witness in memory/files; outside ZK protection |

The reused public commitments and signatures allow correlation, even if a
range proof is randomized. The profile therefore promises neither
unlinkability, nor confidentiality of the issuers, the case, the policy or the
dates. It does not hide the amounts from the system that subsequently makes a
payment; that last action does not exist in the laboratory.

The libraries' cryptographic RNGs, independent random openings and fixed
generators must be used. Different proofs or the absence of sensitive words in
a JSON do not demonstrate the ZK property. Time, size, refusal codes, logs and
successive requests remain channels to qualify. Threshold variations are not
freely offered to the agent; a series of answers could reveal an amount.

## 4. State, revocation and effects

The nonce and the business identity have different roles. The former prevents
the replay of a request; the latter prevents a new nonce from reauthorizing
the same record. The reservation must be durable and atomic under concurrency.
The business identity must not depend on a nonce, a proof mode or a policy
version that can be modified to repeat the effect.

The SQLite reservation and the external effect do not automatically
constitute a single transaction. `UNKNOWN` remains consumed until the target
is reconciled; a lost response does not justify a retry with another
identity. A transactional simulated target allows testing its idempotence
contract, not attributing it to a real payment API.

Dates, active policy and the state of authorities/holders must be reread after
every wait preceding dispatch. A revocation version in a signature binds a
declared state; it does not prove that this state remains the most recent.
Offline, the verifier can establish a historical validity with a dated trust
bundle, without attesting a current non-revocation.

A failure of the prover, the store or a required source blocks the normal
profile. Recovery remains a separate protocol with a bounded mandate, not
implemented here. Neither an LLM nor a cost selector grants an exemption. The
proven limit is per operation: a cumulative consumable limit would require an
authoritative ledger with atomic reservation, outside the chosen relation.

## 5. Eliminatory cases and expected evidence

| Attack / defect | Required result |
| --- | --- |
| Other signing key, reversed role, changed signature | Authenticity refusal, zero effect |
| Attestations with different cases/currency/scale/version/period/holder | Join refusal, zero effect |
| Range proven over commitments foreign to the signatures | Cryptographic or binding refusal, zero effect |
| `a=0`, `a>c`, difference out of bounds, value at the edge of the ranges | Compliance with the exact relation; no authorizing wrap |
| Change of action, tenant, policy, nonce or expiration | Binding refusal against the independent request |
| B bundle changed after fresh signature, including proof substitution | Refusal; old cache unusable |
| Revoked key/policy or expired date on cache hit | Current refusal despite a valid historical proof |
| Two concurrent requests with distinct nonces | A single business record |
| Restart after reservation or ambiguous external result | Operation consumed; reconciliation before any resumption |
| Openings exposed while the policy requires private mode | Confidentiality test failure, no fallback |
| Malformed or oversized JSON/points/signatures/proofs | Bounded refusal; no unbounded allocation or authorizing crash |

Tests must identify the expected refusals; a compilation failure, a missing
file or a harness timeout do not count as a correctly rejected attack.
Structurally valid corrupted proofs must reach the cryptographic verifier.
State checks use an observable counter of the target, not only the returned
message.

## 6. Market vote and stop criteria

Prior art includes the multi-credential predicates and presentations of
[AnonCreds](https://hyperledger.github.io/anoncreds-spec/), the ranges and
compositions of [Dock](https://docknetwork.github.io/crypto-wasm-ts/), and the
existing credentials of [Crescent](https://github.com/microsoft/crescent-credentials)
and [Longfellow](https://github.com/google/longfellow-zk). The BBS standard
alone does not automatically provide an arbitrary comparison of two private
amounts; range extensions must be named and compared separately.

The main commercial risk is the absence of a need for an additional
guarantee: an insurer may accept a signed verdict from its delegate or already
have access to both amounts. A native comparison disclosing the values does
not have the same confidentiality; a signed verdict changes the decision
authority. They are nevertheless economic substitutes to be tested.

To continue beyond the laboratory, two organizations must present the same
dossier: accepted factual authorities, aggregated computation not accepted on
a mere signature, information genuinely not shareable, cost of the blocking,
owner of the control and budget. The issuance change toward signed
commitments must also be accepted. Without these conditions, **stop the ZK
product**, even if local measurements are fast.

Technical stop if the fresh binding of B cannot be established, if the gain
requires removing a constraint, if the target remains bypassable, if a refusal
allows an effect or if a leak contradicts the chosen profile. Parameters,
circuits and dependencies remain to be audited before real data.

## 7. Code review state

The read-only review covers `labs/horizon/proof/src/{lib,main,tests}.rs`,
`packages/horizon-demo/src/{types,worker,server,store}.ts` and the scenarios
`tests/horizon/{firewall.test,crash-child}.ts`. It was conducted separately
from the authors of these files. This separation of roles is not an external
certification nor an audit of the upstream primitives.

Two concrete defects were reported and then fixed in the examined code:

- The prover accepted the `disclosure` mode supplied in a request, even if
  the verifier's policy required confidentiality. The prover now holds its
  own approved policy and refuses any mode, client identity, audience, action
  or policy version that departs from it. It does not expose the openings in
  response to a downgrade request.
- The worker result carried only the expiration bound. A clock rollback after
  verification could place the dispatch before the validity of the sources
  without exceeding the challenge bound. `Verified.not_before_ms` now carries
  the maximum of the lower bounds, rechecked in both transactions before the
  effect.

The reading confirms a complete comparison with the independent expected
challenge; the range commitments derive from the signed commitments; the
roles and keys of the authorities come from the approved registry. The fresh
holder signature covers attestations, context and exact payload. B still
verifies the complete proof at each admission: **no verification cache is
implemented**. The worker serializes its JSONL exchanges, limits its queue to
eight requests and fails closed on timeout.

SQLite atomically reserves the nonce and the business operation, then
rechecks clock and epochs in the simulated target's transaction. `UNKNOWN`
and `RESERVED` remain consumed, including after restart. This reading
attributes no distributed transaction to a remote API.

Known validation at the time of this update:

- The reviewer ran `node --test tests/horizon/stats.test.mjs`: 11 tests
  passed, including the independent computation of binomial ranks and the
  encoding of infinite bounds. The singleton p99 case legitimately has a
  finite lower bound; the initially erroneous test was fixed.
- The author of the cryptographic module reported nine Rust tests passed,
  along with formatting and strict Clippy. The tests include a canonical
  modification of `t_x`, re-signed by the holder, which passes the parser
  but fails with `INVALID_RANGE_PROOF`, and an out-of-range candidate built
  directly by the upstream library without our wrapper's precheck. The
  experiment log keeps the definitive commands and outputs.
- The reviewer then ran `npm run test:horizon`: **18 tests passed, zero
  failures, zero skips**, exit code 0, including the 11 statistics tests and
  seven integration groups. The suite uses the real Rust worker and its range
  proofs. It observes one admission, then the exclusion of replay and of a
  new nonce for the same operation; a separate verifier process receives only
  the public bundle. It also tests revocation, policy change, expiration,
  clock rollback before the validity of the sources, expiration between
  reservation and dispatch, restart after process exit following a durable
  reservation, `UNKNOWN` result, cross-tenant refusal and absent worker.
  Policy/date refusals come with a target counter equal to zero.
  Reconciliation after an ambiguous result observes an existing effect
  without creating another.
- The HTTP scenario rejects the downgrade to disclosure, a tampered
  signature, the substitution of attestations and a changed tenant. The
  final version issues two challenges before consumption, obtains two real
  presentations and submits four concurrent requests, two per nonce. It
  observes exactly one admission and one effect. The reviewer reran
  `npm run test:horizon` after this hardening: **18/18 passed**, exit code 0.
  This request concurrency on one server does not constitute a hardware
  crash trial or a contention trial between several SQLite processes.

The examined code now refuses to create a challenge for an already-consumed
operation and handles errors on the worker's stdin stream. A generic HTTP
error is described as `rejected_or_unknown` with reconciliation required
before retry: it no longer asserts "zero effect" without having observed it.
The absent-binary test is executed; an EPIPE during an in-progress write was
not specifically injected in this suite.

Retained limits: the operator endpoints are those of a local demonstration
without production authentication; the two processes are not an isolation
against the machine's administrator. Keys and data are synthetic. The
authorities sign adapted commitments; no real fact or external revocation
status is acquired. The local chained log is not protected against complete
rewriting by the disk operator. The existence of an authorization
demonstrates neither regulatory compliance, nor economic need, nor the
harmlessness of a future payment action.

Vote maintained: **GO laboratory on this bounded relation; NO-GO production
and market**. The passed adversarial tests reduce the known defects of the
prototype; they do not demonstrate the absence of any vulnerability.

Update of 25 October 2026 (SEC-1): the eliminatory cases of section 5
concerning foreign profiles, prover-chosen commitment layouts, transcript
modes and labels, misconfigured registries/policies and malformed proofs now
have a dedicated regression suite with a mutation check and target counters;
see [VERIFIER_BINDING_TESTS_2026-10-25.md](VERIFIER_BINDING_TESTS_2026-10-25.md).
The vote above is unchanged: these are agent-written tests, not an audit.

## Final review of deployment and results

The challenger re-read the secretless relay: fixed destinations and routes,
bounded bodies/responses/queues, refusal of CONNECT and upgrade, no automatic
retry, unknown result retained after an error on a forwarded POST. Only this
relay publishes loopback ports; the processes carrying the witness and action
state remain on the internal network. No blocking defect identified within
this scope. The IAM and local operator limits remain present.

The main controller ran the real HTTP smoke test, the refusals of routes,
origin and oversized body, then the restart and the refusal of replay/new
challenge with a persistent effect. The public fixture was also verified in a
container with neither network nor volume. These are sandbox trials, not a
qualification of a financial environment.

The data review recomputed both p95 reductions from the raw data, checked the
13 phases × 500 observations and the 11 reference fingerprints. The gain after
`OnceLock` concerns only immutable public parameters. The durable path of
13.014 ms at p95 exceeds its 10 ms hypothesis. The final verdict retains this
negative result and the absence of an external record.
