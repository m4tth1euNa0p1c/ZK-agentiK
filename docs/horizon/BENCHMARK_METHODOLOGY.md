# Horizon — comparison method and decision criteria

Date: October 17, 2026. This protocol fixes the conditions of a comparison
before its results are read. The actual commands, versions and measurements
belong to the [experiment log](EXPERIMENT_LOG.md). It complements the
[security contract](SECURITY_REVIEW.md) and replaces no negative control.

## 1. Freezing what is compared

Each report identifies `relation_id`, disclosure profile, action, trust roots,
signature type, backend/version, proof parameters, integer bounds, encodings and
out-of-proof controls. Two timings are only comparable as a speedup if these
dimensions are equivalent.

| Experiment | Relation / scope | Permitted comparison |
| --- | --- | --- |
| Historical RISC Zero | Complete DevSecOps policy and fixture Ed25519 attestation inside the guest | Historical reference for this relation only |
| Upstream Vega | Exact circuit of the executed bench; SHA-256 if SHA-256 bench | Reproduction of the same circuit, size and phases |
| A: ranges + adapted attestations | Two public signatures, join and proof `1<=a<=2^32`, `0<=c-a<2^32`, fresh context | B/C with the same admission relation and declared disclosures |
| B: immutable proof + fresh signature | Same inequality, complete prior proof and holder authorization bound to the bundle and context | A with visible reuse assumptions and correlation limits |
| C: server-side selection | Path chosen by policy, always identified in the report | Cost per path and frequency; not an average masking the guarantees |
| Openings + native verification | Same rule but amounts disclosed to the verifier | Cost baseline with an explicit change in confidentiality |
| Third-party signed verdict | The verifier trusts the third party's computation | Business substitute, not an equivalent ZK proof |

Vega announces credential-presentation measurements; the published SHA-256
benches are not sufficient to reproduce that application. The
`setup / prep_prove / prove / verify` cycle must remain visible. Primary sources:
[Vega publication](https://www.microsoft.com/en-us/research/publication/vega-low-latency-zero-knowledge-proofs-over-existing-credentials/),
[proof lifecycle](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/overview/lifecycle.md).

**Publishing "X times faster than RISC Zero" is prohibited** on the basis of
the A/B bench and the historical DevSecOps report: primitives, formats,
relation, in-proof/out-of-proof signatures and disclosures differ. The same
prohibition applies to "Vega mDL reproduced" after a SHA or cubic test.

## 2. Separate measurements and timing boundaries

Duration clocks are monotonic. The wall clock is kept to identify runs and test
freshness, without being used for timing.

| Measurement | Included | Excluded or published separately |
| --- | --- | --- |
| Build / installation | Pinned resolution, compilation and required tools | Never presented as online proof |
| Setup | Generators, parameters and keys depending on the relation | Credential creation |
| Adapted issuance | Commitments, authority signatures, opening validations | Holder proving |
| Per-credential preparation | Reusable witness-dependent work | Setup and fresh signature |
| First presentation | Preparation unavailable, proof and bindings | State whether process launch is included |
| Reused presentation | Rerandomization/online proof, or fresh signature B | Initial cost kept in another column |
| Cold verification | Startup, loading/decoding, native controls and complete proof | Installation/compilation |
| Warm complete verification | Same acceptance path without process launch | Verdict cache prohibited in this category |
| B cache hit | Bounded lookup, fresh signature, current rechecks | Amortized initial proof identified; do not call this complete ZK verification |
| Authorization before effect | Parse, signatures, proof/cache, current trust, clock, durable reservation and preconditions | Collection/network and target measured separately if absent |
| Target result | Dispatch, target latency, observation/reconciliation | Does not prove the security of the target software |

The function benchmark and the process benchmark are two experiments. IPC,
JSON/Base64, storage and fsync do not disappear from a measurement announced as
"before effect". If a component is simulated, that property appears in the
run's name and exclusions. No real private credential in the reports.

## 3. Preparation, cache and total cost

For B, keep `initial_full_verify_ms`, `fresh_holder_sign_ms`,
`cache_hit_authorize_ms` and `cache_miss_authorize_ms` separately. Replaying
without a cache must succeed through complete verification; the gain must not
depend on a cache prefilled with unauthenticated data.

Publish the measured costs for a first use and, if the usage allows it, for 2,
5, 10 and 100 reuses. The total cost of the series is:

```text
setup + issuance + preparation + sum(presentations + verifications)
+ invalidation/regeneration costs that actually occurred.
```

Amortization assumes immutable attestations that are still valid. Series must
be run where the holder, source, commitment, version, policy, expiration and
revocation change. Note whether the change requires a new proof, a new
preparation or only a current check. Do not invent a reuse rate or a hit rate
to conclude that there are savings.

A fresh signature over a historical proof is not the generation time of a
fresh ZK proof. A proof generated after the effect never enters the category
of ZK authorization before effect.

## 4. Corpus and refusal trials

Fix a synthetic corpus before measuring: nominal case, equality `a=c`, lower
bound `a=1`, upper bound `a=2^32`, maximum difference `2^32-1`, then refused
cases. Include several cases and amounts of the same relation, not only 100
repetitions of a single already-loaded bundle. Samples of the same warm proof
are flagged as conditional repetitions.

Refusal classes timed separately:

1. Invalid structure or oversized input: measurement of the parser/limiter.
2. Wrong signature, role, join or context: native measurement.
3. Structurally valid but corrupted proof: the cryptographic verifier must
   actually be called; keep the reason and the stage of the refusal.
4. False inequality with valid attestations: relational refusal, without
   counting a harness failure as a success.
5. Valid proof and signatures but invalid current policy/revocation/date:
   authorization refusal, including on a cache hit.
6. Concurrency, replay, crash and `UNKNOWN` result: number of effects and
   durable state, not only the duration of an HTTP response.

Do not confuse the impossibility of generating a proof for a false witness
with the verification of a forged proof supplied by an adversary. Both trials
are useful but attest to different paths.

## 5. Sampling plan and statistics

Each command publishes its number of warm-ups and the planned number of
measurements before launch. Individual durations are kept in execution order,
with failures and timeouts. No slow sample is removed silently. If an incident
invalidates a run, keep the run and its reason, then execute a new identified
series.

For fast experiments, aim for 30 warm-ups and 500 measurements per category
over several fixtures, subject to the decided budget. A heavy proof may be
limited to a few executions: then publish all samples and qualify the result
as exploratory. A small N is not compensated by more decimal places or by a
p99 computed over three proofs.

Publish `N`, minimum, mean, median, empirical p95, p99, maximum and failures.
For this protocol, an upper-rank empirical quantile takes, after sorting, the
zero-based index `ceil(p * N) - 1`, bounded to `[0, N-1]`. If the runner uses
another convention, it must publish it and the quantiles must be recomputed
before being grouped. The historical RISC Zero convention is not modified
retroactively to improve a result.

The [`scripts/horizon-stats.mjs`](../../scripts/horizon-stats.mjs) module
keeps all samples and computes quantile confidence intervals through order
statistics, with coverage of at least 95% **under the IID assumption**. This
assumption is not established by the module; warm repetitions of one fixture
do not automatically become an IID sample representative of the service. The
intervals remain conditional and exploratory when the measurement plan does
not justify this assumption.

For `B ~ Binomial(N,p)`, choose the largest `L` such that `P(B<L)<=0.025` and
the smallest `U` such that `P(B>=U)<=0.025`. The interval is
`[X_(L), X_(U)]`, with `X_(0)=-infinity` and `X_(N+1)=+infinity`. The masses
at the quantiles make the coverage conservative. The JSON encodes an infinite
bound as `null` plus an explicit flag; it does not replace it with the observed
minimum or maximum. At `N=500`, the p99 uses ranks 490 and 500; with 300
samples its upper bound remains infinite under this two-tailed convention.
Probabilities are computed in double precision and do not constitute certified
numerical bounds. The independent small-corpus test compares the ranks against
a direct binomial sum; no bootstrap is used to invent a finite tail.

The observed quantiles describe this campaign. They are neither a universal SLA
nor a robust estimate of a service's tail from one fixture. An A/B comparison
uses the same environment and recorded alternating/randomized execution orders,
to limit thermal/cache bias. Concurrency is a separate campaign with throughput,
queues, errors, memory and latencies; speeding up one job with more threads does
not demonstrate better throughput under load.

If a time budget is tested, publish the number and fraction of overruns as well
as the maximum. "No violation observed" does not mean "always under the
threshold". The historical simulator's 5 ms threshold does not automatically
become Horizon's business threshold.

## 6. Resources and size

For each run keep: repository and dependency commits, lockfiles, toolchain,
CPU flags, release mode, OS, CPU, threads, accelerator, known frequency or
power mode, container/image and cgroup limits, available physical memory,
backend parameters and proof identities.

Measure peak memory in a process/cgroup reset to zero for the run. A 12 GiB
Docker limit is not a measured peak; the cumulative maximum of a container that
also compiled is not the prover's peak. Count subprocesses and distinguish RAM,
disk cache, prepared state and verification cache. OOM and allocation refusals
remain failure results.

Publish separately proof bytes, commitments, signatures, parameters,
journal/statement, binary bundle and JSON/Base64 message. A cache may reduce
transfer on a hit; its retained state and the initial transfer remain in the
total cost. No 108 kB/108 KiB comparison without units.

## 7. Independent verification and reproducibility

A separate process verifies the bundle with only the public elements, the trust
configuration and the expectations it issued. The test without network and
without witness is mandatory for the private profile; it demonstrates interface
independence, not ZK security on its own.

Synthetic fixtures allow reproduction without external credentials. The test
authorities and their public/private keys are described as such. Assertions of
real provenance or of acceptance by an insurer remain absent as long as they
are not established separately.

The report of each experiment contains: exact command, start and end times,
exit code, useful stdout/stderr without secrets, fingerprint of the inputs and
public artifacts, covered and uncovered steps, raw results, statistics and a
bounded conclusion. An upstream benchmark executed without change remains a
reproduction, not a new invention.

## 8. Stopping criteria

- **Security**: stop the variant if an expected refusal produces an effect, if
  a signed binding is missing, if the cache retains an expired authorization,
  or if a mode change discloses the data without an explicit policy.
- **Comparability**: withdraw the ratio if the relation, guarantees or issuance
  contract differ; publish the descriptive measurements separately.
- **Performance**: the latency hypothesis is rejected if the required complete
  path exceeds the fixed budget; no reduction of the relation to save the figure.
- **Confidentiality**: reject the profile if its outputs/artifacts expose the
  amounts despite the announced commitment. The admitted public correlation is
  never renamed unlinkability.
- **Product**: no positive commercial decision from latencies alone. Compare
  integration/issuance cost, operations, human review and signed alternatives
  on a common case shared by two organizations.

The final verdict may be "proof feasible but economically useless", "variant B
acceptable under explicit assumptions" or "all variants rejected". It is not
necessary to declare a winner if the collected evidence does not justify that
choice.
