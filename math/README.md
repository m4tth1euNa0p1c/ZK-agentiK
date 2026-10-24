# Horizon mathematical checks

The directory below preserves the first historical profile. The
[new correlated testbed](../docs/experiments/circuit/RESULTS_2026-10-17.md) adds
a distinct oracle, numerous Rust proofs and a **MATLAB R2026b execution
actually performed** in GitHub Actions, in addition to Octave.

This directory checks identities and assumptions of the existing relation. It
reimplements no cryptographic primitive. A numerical success proves
neither the security of Bulletproofs, nor the truth of the signed facts, nor the
TypeScript code, nor the durability of a disk. See the [whitepaper](../docs/whitepaper/whitepaper.pdf).

## Isolated execution

From the repository root, with Docker available:

```sh
node math/run.mjs --build
```

`--build` explicitly authorizes the local build of the fixed image if it
is absent. Without this flag, its absence is an error. No external catalog
chooses the image, command, volume or executable. The tools are installed
only in this image; no paid software or global package is required.
The Debian base is pinned by digest. The apt packages are not on a
snapshot: the report retains the versions and the identifier of the image actually
used, without promising bit-for-bit reconstruction.

Each run creates `results/octave-<UTC>-<UUID>/` with `run.json`, `octave.log`
and a dated result. The sources are mounted read-only and the output
goes into this new directory. The execution container has no network and is
limited to 2 CPU / 2 GiB. Reports are written with exclusive creation; they
are not system files immutable against an administrator. The date
is self-declared; the SHA-256 hashes are neither a signature, nor a TSA timestamp,
nor a proof of the meaning of the results. A failure retains a report and returns
a non-zero code.

The script explicitly distinguishes `GNU Octave` from `MATLAB`. For a MATLAB
environment with `jsonencode`, the intended syntax is:

```matlab
run('math/run_checks.m')
```

**MATLAB was not executed in this delivery.** Direct execution retains
dated JSON files in `math/results/`; `latest.json` is only an index. The Node
runner is preferable for automatically recording versions and hashes.

## Coverage and precision

- 24,510 pairs, bits 1 to 6, negative and out-of-range values included; 5,460
  pairs accepted. Equivalence between ranges of `a-1, c-a` and integer bounds.
- Ten boundaries of the 32-bit profile, including `2^32`, `2^33-1` and maximum `uint64`.
  JSON values are decimal strings to preserve their exactness.
- The Ristretto order is reconstructed by adding decimal digits; it
  is never converted to `double` or `uint64`. Business arithmetic uses
  `int64`/`uint64`, with a guard before unsigned subtraction.
- 20 reachable states and 160 transitions of a finite model, one business key and
  two nonces. Persistent reservation, expiration/revocation, shutdown, ambiguous effect
  and reconciliation are explored. This model is not the TypeScript code.
- Counterexamples: nonce alone, accumulation, deductible, exponent/currency, modulo alias
  and known generator relation. The scalar examples are not a test
  of the discrete logarithm.

## Traceability

The constants and input domains are in `horizon_checks.m`, whose hash the runner
records, along with those of `run_checks.m`, `run.mjs` and the
Dockerfile. The result and the log also have their hash. `record_environment.py`
is a complementary tool for direct execution and the PDF; the Node runner
is autonomous and does not call it.

The archives of the first build and the direct trials prior to the
runner are kept locally and excluded from publication by `.gitignore`:
some contain host paths. They are therefore not present in
a fresh checkout. The selected published result is
`results/octave-2026-10-17T14-48-23.751Z-0f44a541-9089-42a3-9676-47d943cfaed5/`;
the command paths there use `<MATH>` and `<OUTPUT>`. Any new
run is local by default; publishing requires a review, then an explicit
exception in `.gitignore` and the addition of the artifacts to the catalog.
Only a `run.json` report with `status=pass` establishes the success
of its isolated execution; neither this status nor a hash certifies the cryptography.
