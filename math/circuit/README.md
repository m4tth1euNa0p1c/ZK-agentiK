# Integer oracle of the Horizon relation

`circuit_oracle.m` computes exactly, for two synthetic `u64` values:

```text
1 <= amount <= 2^32 && cap >= amount && cap - amount < 2^32
```

It verifies no signature or ZK proof. A `status: "pass"` means that
the whole corpus was processed without error; each case has its own
`accept` decision, which may be false. The relation and its conditional
proof are in the [LaTeX supplement](../../docs/whitepaper/circuit-validation.tex).

## Interface and encoding

```matlab
addpath('math/circuit');
result = circuit_oracle('/chemin/vectors.json', '/nouveau/chemin/octave.json');
```

The input is a **flat JSON array** of exactly 1 to 10,000 objects:

```json
[
  {"id":"edge-1","category":"boundary","amount":"1","cap":"4294967296"},
  {"id":"edge-2","category":"underflow","amount":"1","cap":"0"}
]
```

- `amount` and `cap`: canonical decimal strings between `"0"` and
  `"18446744073709551615"`. JSON numbers, signs, spaces inside the string,
  leading zeros, exponents, fractions and overflows are rejected.
- `id` and `category`: `[a-z0-9-]{1,64}` (leading hyphen allowed); identifiers
  must be unique. Categories never influence the verdict.
- Exactly four members, with the literal names above: an `expected`
  member, a duplicated member or an ambiguous normalization is rejected.
- Maximum size 4 MiB, ASCII without BOM or JSON escaping. Member order
  and ordinary JSON whitespace are free. Decoding uses
  `jsondecode`, supplemented by shape and schema checks.
- The output file's parent must exist. An existing output file is
  never deliberately overwritten. This guard assumes a controlled directory
  without a concurrent hostile writer; it is not a file sandbox.

The result preserves the corpus order and contains:

```text
schema: horizon-circuit-oracle-v1
runtime: GNU Octave | MATLAB
runtime_version, executed_in_matlab, generated_at_utc
clock_attestation: local-clock-unattested
case_count
cases: [{id, amount, cap, accept, x_decimal, d_decimal}, ...]
status: pass
integer_arithmetic: uint64-guarded
negative_difference_encoding: empty-string
cryptographic_verification: false
machine_checked_proof: false
```

`x_decimal` is `amount−1`, or `""` if `amount=0`. `d_decimal` is
`cap−amount`, or `""` if `cap<amount`. Non-negative differences are
rendered even if the case is rejected for being out of range. An empty string
must not be interpreted as zero. `cases` remains an array, even for
a single case. No partial result is emitted after an invalid input.

## Exactness and detected incident

Parsing accumulates digits in a `uint64`, after checking
`v < Q || (v == Q && digit <= 5)`, with
`Q = 1844674407370955161 = floor(UINT64_MAX/10)`. This threshold is built
from small integer blocks; no conversion of a large `double` literal,
no `str2double` and no saturation is used to validate an
input. Every subtraction is preceded by its ordering guard.

The first tests under GNU Octave 7.3.0 found a formatting problem
using `idivide(...,10,'floor')` at the type maxima: the `u64` test
observed `18446744073709551620` instead of `18446744073709551615`, then the
`u32` test observed `4294967300` instead of `4294967295`. Those runs
failed; they are not validated results.

The shipped source uses **no `idivide` in the oracle**. A binary
division keeps the remainder in `0..9` for large values. The short path
`floor(double(v)/10)` only receives `v <= 2^32−1`, hence integers exactly
representable with a sufficient rounding margin at the floor. Conversions
of digits to `double` are bounded to `0..9`.

The self-test exposes diagnostics of the native division for the runtime
being executed, without requiring MATLAB or another version to reproduce this problem.
The cryptographic guarantees do not depend on these diagnostics.

## Actual execution and tests

The interface uses MATLAB syntax with `jsondecode`/`jsonencode`
(available since R2016b). Source compatibility is not proof of
execution. Read `runtime`, `runtime_version` and `executed_in_matlab` in
each result; a planned job, an available license or an Octave result
must not be announced as a MATLAB success.

Self-tests, in either runtime:

```matlab
addpath('math/circuit');
report = run_oracle();
```

Local trial performed on October 17, 2026 under **GNU Octave 7.3.0**: 11
boundaries, 36 invalid inputs rejected, overwrite refusal and exhaustive
exploration of `[0,63]^2`: 4,096 pairs, 2,016 accepted. These tests include
`UINT64_MAX`, values greater than `2^53`, a negative subtraction,
duplicated members/identifiers and the 10,000-entry limit. They
do not run Rust and do not prove the security of Bulletproofs.

The documentation image already built locally is
`horizon-math-paper:local`, observed ID:
`sha256:34f91a54d3dd4514f4e5737b503bf8476486ce92c9d688cba2182d5b6ac5d910`.
This local tag is neither a public image nor a promise of bit-for-bit
reconstruction. Its Dockerfile is [math/Dockerfile](../Dockerfile).

From the repository root, PowerShell:

```powershell
$repoPath = (Get-Location).Path
docker run --rm --network none --cpus 2 --memory 2g `
  --mount "type=bind,source=$repoPath/math/circuit,target=/src,readonly" `
  horizon-math-paper:local octave --no-gui --quiet --eval "addpath('/src'); run_oracle();"
```

For a campaign, also mount a **new** artifact directory at
`/out`, then call
`circuit_oracle('/out/vectors.json','/out/octave.json')`. The correlated runner
records commands, versions, hashes, counters and errors. A MATLAB
job can call the same function with a new `matlab.json` name.

## Correlation and PDF

The comparator must join exactly the IDs and values between the corpus,
BigInt, the numerical runtime and Rust. A prover refusal before generation
does not count as a cryptographic rejection of a proof. A campaign must
separate these stages and retain the errors; its effective numbers are
not deduced from the parameters 128, 1,024 or 4,096.

The supplement does not replace the initial manuscript. PDF reconstruction:

```powershell
$repoPath = (Get-Location).Path
docker run --rm --network none --cpus 2 --memory 2g `
  --mount "type=bind,source=$repoPath,target=/work" `
  horizon-math-paper:local sh /work/docs/whitepaper/build-circuit.sh
```

The script compiles `circuit-validation.tex` and its bibliography, then extracts
the text and renders all pages into `docs/whitepaper/build/circuit/`.
It does not modify the old PDF. The supplement uses a conceptual diagram;
the runner's numerical plots must be read with their campaign
artifacts, without silently importing historical measurements.

Primary sources consulted on October 17, 2026:
[MATLAB JSON](https://www.mathworks.com/help/matlab/ref/jsondecode.html),
[MATLAB integers](https://www.mathworks.com/help/matlab/matlab_prog/integers.html),
[Octave 7.3 arithmetic](https://docs.octave.org/v7.3.0/Integer-Arithmetic.html),
[corrected Bulletproofs](https://eprint.iacr.org/2017/1066),
[RangeProof API 5.0.0](https://docs.rs/bulletproofs/5.0.0/bulletproofs/struct.RangeProof.html),
[RFC 9496](https://www.rfc-editor.org/rfc/rfc9496.html).
