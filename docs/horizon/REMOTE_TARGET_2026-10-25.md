# H14 — Remote sandbox target and two-controller reconciliation

Date: 25 October 2026. Status: **local laboratory delivered; not a remote
banking API contract, not an operations qualification (H17), not an audit
(H15)**. Backlog entry `H14` in `docs/development/TASKS.json`. Acceptance:
separated controllers and target; lost ACK, concurrent operations, crash,
stale version and UNKNOWN tested; at most one target effect and no blind retry.

## 1. What changed

Until now the controller's SQLite file was also the simulated target. The
target is now a **separate durable HTTP process** with its own database, and
the controller talks to it through a client that makes exactly one attempt per
call. The historical local path (`AuthorizationStore.authorize`,
`reconcile`) is unchanged and remains the default; the remote path is opt-in.

| Component | File | Role |
| --- | --- | --- |
| Sandbox target | `packages/horizon-demo/src/target.ts` `createSandboxTarget` | SQLite tables `records` (idempotency key = business operation id), `objects` (one version per object), `fences`, `requests` (every received mutation attempt). Routes: `GET /health`, `GET /objects/:id` (version), `GET /records/:op` (status), `PUT /records/:op` (JSON body `{object_id, tenant, bundle_hash, expires_at_ms}`, mandatory `If-Match: <decimal version>`, `Content-Type: application/json`), `POST /records/:op/fence`. Identifiers never contain a slash. |
| Client | same file, `RemoteTarget` | `version`, `record`, `fence`, `url`. Any transport failure, timeout, unexpected status or unparseable body is `unknown`. Never retries. |
| Controller | `packages/horizon-demo/src/store.ts` `dispatch`, `reconcileWith`, private `reserve`/`settle`; table `dispatches` (object, tenant, **target URL**, version) | Durable reservation with the target identity and the object version read before it; one mutation attempt carrying the authorization deadline; `UNKNOWN` kept until reconciliation at the recorded target. |
| Tool / server | `tool.ts` (optional `target`), `server.ts` (`targetUrl` option, `HORIZON_TARGET_URL`), `target.ts` CLI (`PORT`, `HORIZON_TARGET_DB`) | The verifier process dispatches remotely when configured; `/api/reconcile` fences through the target. |

Target semantics for `PUT /records/:op`:

| Condition at the target (one transaction) | Status | Outcome |
| --- | --- | --- |
| Operation fenced | 409 | `fenced` |
| Record exists with the same `bundle_hash` | 200 | `replayed` (no new effect) |
| Record exists with another `bundle_hash` | 409 | `conflict` |
| Target clock at or past `expires_at_ms` | 410 | `expired` |
| Object version differs from `If-Match` | 412 | `stale` |
| Otherwise: insert record, object version + 1 | 201 | `recorded` |

Malformed requests (missing or non-decimal `If-Match`, wrong content type,
unknown or missing field, body over 4 KiB, identifier with a slash) are
refused with 400/404 and recorded in no table.

`POST /records/:op/fence` returns `recorded` with the stored `bundle_hash` if
the record exists, otherwise inserts a fence and returns `fenced`. A fenced
operation can never be recorded afterwards.

## 2. Controller state machine

```text
absent -> (version read; nothing consumed if the target is unreadable)
       -> RESERVED  (nonce + operation consumed, target URL + version stored, one transaction)
       -> deadline/epoch recheck with no await -> REJECTED (no attempt) or
       -> single PUT carrying expires_at_ms
                     ->  recorded | replayed  -> COMPLETED
                         conflict | stale | expired | fenced -> REJECTED
                         unknown (transport, timeout, odd status) -> UNKNOWN
UNKNOWN or RESERVED after restart -> reconcileWith(target) = fence at the RECORDED target
       -> recorded with our bundle_hash -> COMPLETED
       -> recorded with another bundle_hash -> REJECTED (another writer holds the operation)
       -> fenced -> REJECTED (no effect happened, none can happen)
       -> unknown -> UNKNOWN (stays; no redispatch)
```

Guards: `reconcileWith` refuses an operation that was never dispatched
remotely (`LOCAL_OPERATION`) or that was dispatched to another target
(`TARGET_MISMATCH`); the local `reconcile` refuses remotely dispatched
operations (`REMOTE_OPERATION`); neither rewrites `COMPLETED` or `REJECTED`.
If a reconciliation resolves the operation while the single attempt is in
flight, the attempt's second transaction keeps the stored state and audits
its own answer (`settled_after_reconciliation`); symmetrically, a
reconciliation that lands after the attempt settled is audited as
`reconciliation_superseded`. Reconciliation never redispatches. A consumed
business operation is never reissued by the same controller (`issue`
refuses it), with any nonce.

## 3. Scenarios executed (`tests/horizon/remote-target.test.ts`, 13 tests)

| Scenario | Observed | Target `records` / `PUT` attempts |
| --- | --- | --- |
| Two controllers, separate databases, same business operation, concurrent dispatch | one `COMPLETED`, one `REJECTED` (conflict); neither can issue or dispatch again; state view exposes `id`/`status` only | 1 / 2 |
| Lost acknowledgement (target commits, then destroys the connection) | `UNKNOWN`; redispatch refused; `reconcileWith` → `COMPLETED`, idempotent | 1 / 1 |
| Controller crash after reservation, restart on the same database | `RESERVED` found; `reconcileWith` → `REJECTED`; the late in-flight write is answered `fenced` | 0 / 1 |
| Controller crash after the target acknowledged, before the second transaction | `RESERVED` found with a record at the target; `reconcileWith` → `COMPLETED`; local `reconcile` refuses (`REMOTE_OPERATION`) | 1 / 1 |
| Stale version: another writer bumps the object between the version read and the attempt | `REJECTED` (412 `stale`), no retry | 2 (the two other writers) / 3 |
| Deadline reached between reservation and dispatch (controller clock) | `REJECTED` before any attempt, audited `rejected` | 0 / 0 |
| Deadline enforced by the target clock (target believes the deadline passed) | 410 `expired` → `REJECTED` | 0 / 1 |
| Target unreachable before reservation | `TARGET_UNAVAILABLE`, nonce still issued, no operation row | 0 / 0 |
| Target unreachable for the mutation only; reconciliation addressed to another target | `UNKNOWN`; `TARGET_MISMATCH` refused; reconcile at the recorded target → `REJECTED` (fenced) | 0 / 0 |
| Target crashes before commit (connection destroyed, nothing written) | `UNKNOWN`; reconcile → `REJECTED` | 0 / 1 |
| Reconciliation racing the in-flight attempt: fence first / record first | both `REJECTED` with `settled_after_reconciliation` audited / both `COMPLETED` | 0 / 1 and 1 / 1 |
| Two distinct operations on one object (second audience), concurrent | one `COMPLETED`, one `REJECTED` (stale); a later sequential writer records | 2 / 3 |
| HTTP verifier with `targetUrl`: lost acknowledgement on execute, replay, new challenge, reconcile without and with operator token, restart without target | 409 `UNKNOWN`; 400; 400 (operation consumed); 403; 200 `COMPLETED` twice; local reconcile 400 | 1 / 1 |
| Target input validation: missing or non-decimal `If-Match` (7 forms), wrong content type, bad hash, omitted `expires_at_ms`, extra field, 5 kB body, bad id, fence path as id, unknown record; then replay, conflict, stale, expired | 400 … 404 … then 201 / 200 / 409 / 412 / 410 | 1 / … |

The controller's own `effects` table stays empty in every remote scenario:
the only effects are the target's records.

## 4. Regression detection (mutation check)

| Mutation | Tests failing |
| --- | --- |
| Transport ambiguity settled as `COMPLETED` | lost acknowledgement, unreachable target, target crash |
| Fence endpoint observes without inserting a fence | controller crash after reservation |
| Target ignores the `If-Match` precondition | stale version, distinct operations, input validation |
| Controller retries the mutation once on `unknown` | lost acknowledgement, target crash |

Each mutation was applied to the working copy, the nine tests run, and the
original files restored.

## 5. Commands executed on 2026-10-25

| Command | Result |
| --- | --- |
| `node --import tsx --test tests/horizon/remote-target.test.ts` | 13 passed (9 before the review, 13 after) |
| `npm run test:horizon` | 47 passed (34 before, + 13) |
| `npm run typecheck`, `npm run build` | exit 0 |
| `npm run agent:check:full` | PASS twice, 11 fixed steps exit 0; final local report `.tools/agent-sessions/2026-10-24T23-37-19-731Z-42240.json` (UTC timestamp, ignored by Git) |

## 6. Limits and open points

- **Not a remote API contract.** The sandbox target implements the contract
  the controller needs (idempotency key, exact version precondition, status
  route, fence). A real target must provide an equivalent contract and accept
  the recovery protocol; without it the controller must keep `UNKNOWN` and
  forbid any automatic retry, as `dispatch` does today.
- **No authentication on the target, plaintext HTTP.** The controller trusts
  the transport: a forged `recorded` answer (man in the middle, or a target
  bound beyond loopback) would yield `COMPLETED` without a durable record;
  anyone who can reach the target can burn a controller's single business
  operation (write another hash, fence, or bump the object version) or, with
  a leaked `bundle_hash`, record a bundle the controller never sent. Business
  operation ids are deterministic from public configuration. The sandbox
  state view now exposes only `id` and `status` per operation, but the audit
  chain still carries `bundle_hash` in `reserved` events. All of this is an
  H17 item (mTLS/IAM, operator-only state route), not solved here.
- **Crash scenarios are in-process simulations** (`after_reservation` and
  `after_target` faults, connection destroyed by the target) plus a new
  `AuthorizationStore` on the same file. The historical two-process crash
  test (`crash-child.ts`) covers the local path only; cross-process SQLite
  contention on the target is not exercised.
- **Attempt counter.** The target logs each mutation attempt after its
  transaction commits; a failure between commit and log answers 400 (the
  controller keeps `UNKNOWN`, correctly) but under-counts `attempts()`.
- **Independent agent review (25 October 2026)** found no second-effect path
  and raised: target identity not persisted and reconciliation path selected
  by environment (fixed: `dispatches.target_url`, `TARGET_MISMATCH`,
  `REMOTE_OPERATION`, terminal states never rewritten); reconciliation racing
  the in-flight attempt (fixed: stored state wins, both sides audited);
  deadline not enforced at the target (fixed: `expires_at_ms` in the request,
  410 `expired`); `If-Match` coercion (fixed: decimal token only); fence path
  parsed as a record id (fixed: identifiers without slash); missing tests for
  `stale_before_dispatch`, crash after acknowledgement and the HTTP fence path
  (added). The unauthenticated surface above remains by design.
- **Business operation consumed on refusal.** A `stale` or `conflict` refusal
  leaves the operation consumed in that controller; a new controller database
  can authorize it again (tested). Whether a refused operation should be
  reissuable is a business decision outside this ticket.
- **Clock and version.** The object version is read before reservation and
  stored with it; a writer that bumps the object after that read makes the
  attempt `stale` by construction. The deadline and epoch recheck happens
  after reservation with no await before the single attempt; the network
  wait itself is not bounded by the challenge deadline at the target.
- Internal agent review only; no external audit (H15).
