# Dependencies: Horizon fix and residual risks

Review of October 17, 2026, on a working copy based on
`8935cc9e42dee9b2ed32207483a6f7383e37ffc4`. **The repository does not have a
global audit without alerts.** The minimal Horizon fix removes its two
`unsound` alerts. Its maintenance warning and the RISC Zero laboratory alerts
remain visible. This review prepares a publication of experimental results;
it does not qualify any service for production.

## Reproducible result

`cargo-audit 0.22.2`, RustSec database frozen at commit
`64f92cdc64401fab47baa10e2e11fe382aa57155` (1,334 advisories), clean database tree.
The scans of October 17, 2026 at 15:00 UTC use `--no-fetch --no-yanked`,
with no ignore rule, no severity filter and no target filter. They therefore
do not check versions yanked from crates.io, unknown vulnerabilities,
npm dependencies, system images or precompiled executables.

| Lockfile | Vulnerabilities before → after | Informational alerts before → after | Exit code after |
| --- | ---: | --- | ---: |
| `Cargo.lock` | 0 → 0 | 0 → 0 | 0 |
| `labs/horizon/Cargo.lock` | 0 → 0 | 2 `unsound` + 1 `unmaintained` → 1 `unmaintained` | 0 |
| `labs/risc0/Cargo.lock` | 2 → 2 | 3 `unmaintained` → 3 `unmaintained` | 1 |
| `labs/risc0/methods/guest/Cargo.lock` | 1 → 1 | 2 `unmaintained` → 2 `unmaintained` | 1 |

The categories remain those of RustSec: `unsound` is here an informational
alert, which does not mean a benign defect. The Horizon scan with
`--deny unsound` also passes; `unmaintained` remains reported.

The [before/after reports](dependencies/), commands, dates, exit codes
and digests are recorded in [capture-provenance.json](dependencies/capture-provenance.json).
`cargo-*.json` designates the initial scans; `cargo-*-after.json` the new
scans. The `audit-*.stdout.txt` outputs preserve the cargo-audit JSON,
including its alerts. `allowed_exit_codes` describes the collection of diagnostics,
not a security acceptance. The embedded RustSec advisories state their
CC0-1.0 license. Only local paths were redacted from the test outputs.

## Minimal Horizon fix

- `anyhow = 1.0.100` → `=1.0.103`: fix for the undefined behavior related to
  `downcast_mut` on certain contextualized errors.
  [RUSTSEC-2026-0190](https://rustsec.org/advisories/RUSTSEC-2026-0190.html),
  [upstream report](https://github.com/dtolnay/anyhow/issues/451).
- `rand = 0.8.5` → `=0.8.6`: fix for the reentrancy of `ThreadRng` with
  a custom logger in the affected configurations.
  [RUSTSEC-2026-0097](https://rustsec.org/advisories/RUSTSEC-2026-0097.html),
  [upstream fix](https://github.com/rust-random/rand/pull/1763).

Only these two version numbers and their checksums change in the lockfile.
Bulletproofs, the curves, Ed25519, Merlin, the proof format and the proven
relation are unchanged. The Horizon code explicitly uses `OsRng`; the
resolved graph does not enable rand's `log` feature. No direct use
of `downcast_mut` was found in the Horizon code. These observations
limit certain exposure paths; they do not replace the update and do not
demonstrate the absence of any transitive call.

The earlier manifest and lockfile are kept together in
[horizon-proof-before.toml](dependencies/horizon-proof-before.toml) and
[horizon-before.lock](dependencies/horizon-before.lock). To reproduce the
historical measurements, use the commit and configuration of the historical
report in an isolated copy, with its **two** corresponding files.
Restoring only the old lockfile against the fixed manifest does not satisfy
`--locked`. The historical performance campaigns are neither modified
nor replayed, and their figures are not attributed to the fixed versions.

Checks executed after the fix:

| Command | Observation |
| --- | --- |
| `node scripts/cargo.mjs test --manifest-path labs/horizon/Cargo.toml --locked --all-targets` | 9 cryptographic tests pass; two binaries without tests pass |
| `node scripts/cargo.mjs fmt --manifest-path labs/horizon/Cargo.toml --all -- --check` | exit code 0 |
| `node scripts/cargo.mjs clippy --manifest-path labs/horizon/Cargo.toml --locked --all-targets -- -D warnings` | exit code 0 |
| `npm run horizon:build` | release binary and TypeScript compilation succeeded |
| `node scripts/horizon-fixture.mjs verify` | historical public proof verified, no live authorization claimed |
| `node scripts/horizon.mjs demo` | real Bulletproofs proof, independent verifier, 1 authorized effect and 0 unauthorized effects; tampering, replay and forced disclosure refused |

The outputs of the last two commands are preserved. The first four
were observed at the terminal; no complete retroactive output is
fabricated. These tests constitute neither an independent cryptographic audit,
nor a performance measurement, nor a production qualification.

## Analysis of the retained alerts

**Horizon — `clear_on_drop 0.2.5`.** Bulletproofs 5.0.0 depends on this
unmaintained crate; the range proof code actually uses it to clear
data, it is not merely a development tool. The advisory does not
provide a fixed version. Adding an unused `zeroize` dependency
would not remove this path. A migration requires a maintained upstream
version or a reviewed upstream change, with no home-made cryptographic
primitive. [RUSTSEC-2026-0283](https://rustsec.org/advisories/RUSTSEC-2026-0283.html),
[upstream change](https://github.com/cesarb/clear_on_drop/commit/5916d6260acbad8a34290dba137f39963f13f467).

**RISC Zero — `tracing-subscriber 0.2.25`.** The fix for the ANSI
sequence injection is in `>=0.3.20`, outside the `0.2` constraint of ark-relations
0.5.1. In the current Linux host and RISC Zero guest graphs, this dependency
is enabled by `risc0-zkvm/std` → `risc0-groth16` → arkworks →
`ark-relations/std`. The resolved features of `tracing-subscriber` are empty;
its `fmt` module, targeted by the fix, is under `cfg(feature = "fmt")`.
Exposure to **this formatting path** is therefore not established in these
configurations, although the reported package remains present. A different
feature unification may change this conclusion. This finding does not cover
the own dependencies of the precompiled `r0vm` used outside the workspace.
[RUSTSEC-2025-0055](https://rustsec.org/advisories/RUSTSEC-2025-0055.html),
[upstream fix](https://github.com/tokio-rs/tracing/pull/3368).

**RISC Zero host — `rsa 0.9.10`.** The Marvin attack concerns private RSA
operations observable through their duration; no fixed version is
indicated in the frozen database. The dependency arrives through `rzup 0.5.2`, itself
used by `risc0-build` and the RISC Zero client. In this graph, the features
of `rzup` are empty: its signing method is under `publish`, which is absent,
and the inspected installation path verifies signatures with an official
public key. No private RSA API exposed remotely was
identified in the laboratory. This is a limited analysis of the graph and
call sites, **not** a general proof of non-exploitability nor a
reason to hide the advisory. [RUSTSEC-2023-0071](https://rustsec.org/advisories/RUSTSEC-2023-0071.html),
[upstream tracking](https://github.com/RustCrypto/RSA/issues/626).

**RISC Zero maintenance.** `bincode 1.3.3` (host), `derivative 2.2.0` and
`paste 1.0.15` (host and guest) are reported as unmaintained. This does not
by itself demonstrate an exploitation, but leaves a tracking and
migration risk. [Bincode](https://rustsec.org/advisories/RUSTSEC-2025-0141.html),
[derivative](https://rustsec.org/advisories/RUSTSEC-2024-0388.html),
[paste](https://rustsec.org/advisories/RUSTSEC-2024-0436.html).

The captured graphs are accompanied by a
[record of the examined sources](dependencies/reachability-evidence.json)
(versions, relative crate paths, lines and SHA-256). This is not
a complete analysis of data flows or of the produced binaries.

## Decision and required work

The historical locks and RISC Zero guest remain unchanged in order to keep
their identities and proofs reproducible. This documentary freeze does not
authorize use with sensitive data or the opening of a proving service.
The retained scope remains a local laboratory with synthetic fixtures,
without production secrets or private RSA endpoint. Leaving this scope
requires a new explicit security decision.

| Tracking | Expected action | Closure criteria |
| --- | --- | --- |
| DEP-01 — Horizon memory clearing | Evaluate a maintained Bulletproofs version or a reviewed upstream migration removing `clear_on_drop` | Advisory removed from the real graph; same relations and adversarial tests; historical proof still verified; review of witness clearing |
| DEP-02 — RISC Zero logging | Build a separate candidate profile with arkworks/RISC Zero dependencies compatible with `tracing-subscriber >=0.3.20` | Host/guest scans without this advisory; controlled features; hostile log tests; new identified ELF and new independently verified receipt; earlier archives preserved |
| DEP-03 — RSA tooling | Track the upstream fix or a maintained installation chain avoiding this vulnerable implementation | Absence of the advisory or demonstrated upstream fix; distribution signatures still verified; no workaround or home-made RSA implementation |
| DEP-04 — maintenance and scope | Evaluate transitive replacements for bincode/derivative/paste and separately inventory the external prover and images | Reviewed graph and formats, compatibility evidence; scan of the actually distributed binary/profile, without extrapolating from the workspace alone |

Reproduction of the scan after local installation of cargo-audit and the database
at the indicated commit (adapt the executable path to the system):

```powershell
.tools/cargo-audit/bin/cargo-audit.exe audit --json --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/horizon/Cargo.lock
.tools/cargo-audit/bin/cargo-audit.exe audit --json --deny unsound --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/horizon/Cargo.lock
.tools/cargo-audit/bin/cargo-audit.exe audit --json --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/risc0/Cargo.lock
.tools/cargo-audit/bin/cargo-audit.exe audit --json --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/risc0/methods/guest/Cargo.lock
```

The last two commands must currently exit with code 1.
Changing the database date or the dependencies requires publishing a new result,
without replacing the reports preserved here.
