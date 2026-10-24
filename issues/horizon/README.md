# Horizon program — local tickets

Initial reference: `d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`.
These tickets are units of work and validation, not statements
of maturity. Final results and blockers are in `docs/horizon/`.

| Ticket | Responsibility | Deliverable / acceptance criterion |
| --- | --- | --- |
| H00 / M0 | Audit and DevOps | Dedicated branch, references, existing tests and receipts independently re-verified; no history lost |
| H01 / M1 | Cryptography, algebra, benchmark | Vega pinned, paper/code examined, published bench executed or reproducible error; offline/online costs separated |
| H02 / M2 | Business and prior art | Five domains at most, primary sources, competitors/patents, hypothetical buyers and abandonment criteria |
| H03 / M3 | Adversarial committee | Votes and objections documented; required property that excludes or keeps the signed baseline |
| H04 / M4 | Protocol and confidentiality | Statement/witness/relation, bound signatures and subjects, leakage, revocation and exact action defined |
| H05-A / M5 | Specialized proof | Existing primitive, real proof, tampering rejected, complete costs and signed-baseline comparison |
| H05-B / M5 | Reuse | Immutable precomputation separated from the fresh challenge; revocation, policy change and replay refused |
| H05-C / M5 | Selection | Verifier policy imposes the guarantees; no selection by the caller and no weakening fallback |
| H06 / M6 | Optimization | Equivalent before/after comparison, raw samples; negative result kept if no gain demonstrated |
| H07 / M7 | Rust/API product | Library, CLI, synthetic organizations and web interface; secrets kept out of responses and no mutation bypass |
| H08 / M8 | Red team and metrology | Forgery, omission, concurrency, crash/recovery, revocation, ambiguity; zero unauthorized mutation in the trials |
| H09 / M9 | Sandbox and CI | Local Docker Compose, end-to-end test, bounded resources, no banking network or production deployment |
| H10 / M10 | Scientific/commercial decision | Complete dossier, evidence and uncertainties, non-comparable references separated, costs and criteria still open |

Initial commands: `cargo test --workspace --locked`, `npm test`,
`npm run lab:risc0 -- verify`. Horizon commands are added as
experiments become executable. No record is recognized without a
relation, complete cost, machine and comparable assumptions.

## Program status after the experiments

M0: baseline preserved. M1: Vega SHA-256 benches reproduced, credential
application not reproducible from these benches alone. M2/M3: five leads and
adversarial arbitration, laboratory GO without customer validation. M4: relation
formalized. M5: A/B/C and baseline actually executed. M6: optimization of
public parameters measured before/after. M7: library, CLI, API and application.
M8: adversarial suites and raw data preserved. M9: local Docker, single admission
and replay after restart validated. M10: verdict published, with no record and no
product GO.

Qualification blockers and next experiments are detailed in
[H11–H17](NEXT_EXPERIMENTS.md). Priority H11, H13/H15, H14/H17, then H16; H12
is an independent scientific lead. The complete 10 ms target is missed
on the durable Windows bench and remains a negative result to preserve.
