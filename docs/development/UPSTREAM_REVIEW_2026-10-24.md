# Upstream verifier and transcript risk watch

Date checked: 2026-10-24 (GitHub PR metadata). This document prioritizes local regression tests. It does not state that upstream issues reproduce in ZK-agentic; recheck merged state and head SHA before using upstream code.

| Source | Verified status | Local research action |
| --- | --- | --- |
| [a16z/jolt #2133](https://github.com/a16z/jolt/pull/2133), head `f35b236` | OPEN, unmerged: Dory matrix layout expected by verifier | Test a malicious proof's shape, relation ID and verifier-chosen parameters. Do not trust proof-supplied dimensions. |
| [a16z/jolt #2099](https://github.com/a16z/jolt/pull/2099), head `f5a2197` | MERGED: transcript proof-of-work step | Pin canonical transcript version and nonce encoding before considering adoption; reproduce actual vectors. |
| [LayerZero-Labs/akita #260](https://github.com/LayerZero-Labs/akita/pull/260), head `679538b` | OPEN, experimental positional transcript | Verify protocol epoch, domain separation, descriptor hash, cache provenance and generated schedule identities. |

## Non-negotiable local properties

The verifier selects the exact statement, trusted authority keys, image/vkey, program version, challenge, nonce, tenant, amount units, expiration and operation identity. Cached proofs cannot cache current authorization. Transcript encoding must bind all security-relevant context; unknown variants fail closed. Keep fixture-only proof, numeric oracle, verified ZK receipt and financial operation separate in reports.

There is **no new proven zero-knowledge backend** in this watch. A draft PR or a CI failure is only a signal for investigation; no automatic dependency updates. Signatures standardized by NIST do not turn the current Ristretto/Bulletproofs system into post-quantum ZK. Task SEC-1 covers the local regression suite.
