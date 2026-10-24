# horizon-proof — laboratory, no payment effect

This crate composes Bulletproofs 5.0.0, Ristretto Pedersen commitments,
Ed25519 and Merlin. It contains neither a new primitive, nor a mode simulating a
successful proof. The two fixture authorities sign commitments that they
build from their test values. `init` produces laboratory
secrets: its output belongs to the prover process, never to the verifier.

The exact relation is `1 <= amount <= 2^32` and
`0 <= cap - amount < 2^32`. The metadata and commitments remain public and
correlatable. The verifier learns the values in `disclosure` mode only.
See [the design](../../../docs/horizon/CRYPTOGRAPHIC_DESIGN.md).

From the root:

```sh
cargo test --manifest-path labs/horizon/Cargo.toml --locked -p horizon-proof
cargo build --manifest-path labs/horizon/Cargo.toml --locked --release -p horizon-proof
labs/horizon/target/release/horizon-proof-worker
```

The worker reads one JSON request per line, at most 64 KiB. It replies only
`{"ok":true,"result":...}` or `{"ok":false,"error":"..."}` on stdout. It
does not infer the time: the trusted controller provides `now_ms`.

| `op` | Other fields | Result |
|---|---|---|
| `init` | `now_ms` | `Fixture` with registry, attestations, private witness, holder private key, example challenge and policy |
| `select` | `policy` | `challenge_bound`, `reusable` or `disclosure` |
| `prepare` | `evidence`, `witness` | `ReusableProof`, initial cost to be measured separately |
| `present` | `evidence`, `prepared`, `holder_secret_hex`, `challenge` | Presentation B, fresh signature and unchanged proof |
| `prove` | `evidence`, `witness`, `holder_secret_hex`, `challenge` | Presentation A or public; B must use `prepare` then `present` |
| `verify` | `presentation`, `expected`, `trust`, `policy`, `now_ms` | `Verified`, without witness |

The Rust types in `src/lib.rs` define the exact JSON fields and reject
unknown fields. Cryptographic encodings are lowercase hexadecimal,
of exact size. Signatures use the JSON of the typed structures in
declared order, prefixed by a domain and a null byte; this codec is not a
generic canonical JSON format and does not allow maps or floats.

`verify` requires all signatures and re-verifies the whole proof on each
call, including B. It compares the full challenge to `expected` and the registry
to the expected epoch. Its `expires_at_ms` is the minimum of the deadlines of the
challenge and of the two attestations.
`not_before_ms` is the maximum of their three start dates; the controller
also rechecks this bound after a wait to detect a clock rollback.

The controller must provide an expected policy, registry and challenge
independent of the agent, keep a reliable clock, check revocations,
durably reserve nonce/operation, recheck deadlines after
waits and enforce the preconditions before mutation. This stateless crate
promises neither anti-replay, nor multi-service atomicity, nor a consumable cumulative cap.

The tests attack the relation, the signatures and the binding to the context. They
do not replace an independent cryptographic audit. No real secret
must be entrusted to this experiment.

The separate benchmark produces raw durations in nanoseconds, the proof
and envelope sizes, with five synthetic cases, 30 warm-up passes
by default, and alternating A/B order:

```sh
cargo run --manifest-path labs/horizon/Cargo.toml --locked --release --bin horizon-benchmark -- --samples 500 --warmup 30 --output horizon-samples.json
```

B reuses exactly the prepared proof of its case; `verify_b_full` performs
the full verification without any proof or verdict cache. The fixed public
generators are prepared once per process via `OnceLock`, without witness,
RNG or shared authorization state. `parameters_standalone` is a diagnostic
measurement of their construction, not to be added to the warm times. Warm-ups do not appear in the
retained samples. The statistical independence of the observations is not
established and no speed ratio against another Vega relation is produced.
