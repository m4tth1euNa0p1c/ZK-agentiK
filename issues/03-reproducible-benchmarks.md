# 03 — Compare real proofs and the signed baseline

Milestone: M1. Priority: P1. Dependencies: 01–02.

## Progress as of 15 October 2026

First real runner delivered: `npm run lab:risc0 -- critical 3` and `denied 1`.
Four CPU `Succinct` proofs, measurements and public fixtures preserved in
[the report](../docs/08-RISC0-LAB-RESULTS.md). Reproducible verification without
generation: `npm run lab:risc0 -- verify`.
Cryptographic rejection p95 6.95 ms and generation 154–163 s: initial targets
of 5 ms and of a 30 s challenge not met. CUDA/other backend comparisons,
DSSE-signed verdict, isolated memory peaks, load and customer qualification remain
to be done. This issue is not finished.

## User story

As a technical buyer, I can decide whether ZK brings a useful property at an
acceptable cost and delay for my promotion process.

## Technical architecture

Same corpus for native policy + DSSE verdict, BBS selective disclosure
if suitable, and real ZK backend. Record cryptographic parameters, hardware,
versions, warm/cold, preprocessing, cycles, RAM, confidentiality and network.
Separate proof, verification, rejections and mutation. Compare a
Colofon/PreFlight integration if accessible, without conflating announcements
and measurements.

## Acceptance criteria

- Reproducible JSON/CSV results, p50/p95/max, sizes and operating cost.
- No simulation figure presented as a ZK benchmark.
- At least one customer requirement satisfied by ZK and not by the retained baseline.
- Latency budget agreed with the pilot; no invented universal 5 ms.

## Test commands

`npm run benchmark`, `npm run benchmark -- --enforce-5ms` for the simulator.
Add a separate runner for real backends, a documented reproduction and
a report explicitly excluding backends that were not executed.
