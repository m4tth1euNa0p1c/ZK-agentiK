# M0 — Initial Horizon state

Audit started on October 17, 2026, from commit
`d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`, branch `feat/horizon-research`.
The initial working tree was clean. No historical benchmark was deleted.

## Checks performed

- `cargo test --workspace --locked` through the Node shim: 14 tests passed.
- `npm test`: 25 tests passed, real MCP client over in-memory/stdio transports.
- `npm run lab:risc0 -- verify`: authorizing receipt verified; cryptographically
  valid denial receipt rejected with `POLICY_DENIED`, in containers with no
  witness and no network.
- Historical JSON reports establish 153.681–163.232 s for three authorizing
  proofs, verification p95 of 13.697 ms, rejection p95 of 6.950 ms for a tampered
  seal, and a 222,668-byte seal. These are not new measurements.

## Gaps identified

MCP remains in simulation. The real lab verifies historical challenges with a
public fixture authority. No durable authorization, real provider provenance,
qualified protection of critical confidential data, evidence of commercial
demand or Vega reproduction before Horizon. The historical three-proof benchmark
does not support a p99 estimate.

## Reproduction constraints

Windows x64 / Intel Core Ultra 7 265F, approximately 32 GiB of physical memory.
Docker Linux WSL2, lab container limited to 8 CPUs and 12 GiB. Approximately
24 GB free on C: at startup: new experiments use separate directories, pinned
versions and existing caches. No paid service or real financial data. The first
build may use the network; retained proofs are reverified offline.

## Adversarial review organization

At most four active agents: Astral handles audit, reproduction and integration;
a cryptography/algebra agent examines Vega and alternatives; a business and
prior-art research agent proposes the shortlist; an independent agent challenges
the protocol, statistics, confidentiality and value. Engineering responsibilities
are reassigned after arbitration, with explicit file ownership. Decisions and
objections are recorded.

The mission targets finite experiments. No result or commercial criterion will
be declared met solely because code or a simulation exists.
