# Research and gap analysis — October 15, 2026

This analysis preserves the choices made during the initial bootstrap. Since then,
RISC Zero has been implemented and tested in a separate laboratory: see
[the selected stack](07-STACK-SECURITY-AND-PERFORMANCE.md) and
[the actual proofs and measurements](08-RISC0-LAB-RESULTS.md). References to
untested toolchains below describe that initial stage.

The additional research and two rounds of adversarial review are recorded in
[06-MARKET-NICHE-AND-CHALLENGE.md](06-MARKET-NICHE-AND-CHALLENGE.md).
They narrow the hypothesis below: the generic gateway space is already occupied;
confidential release admission between supplier and customer remains a
hypothesis to compare with existing products and test with buyers.

## Decision

Build an **experimental authorization-proof profile for MCP**, with a Rust core
independent of the proof engine and a DevSecOps firewall. The POC actually runs
Rust, but its native backend produces a simulation receipt that the verifier
can replay and that provides no confidentiality. SP1/RISC Zero are subsequent
integrations; Magnetar remains a research option.

“World's first standard” and “no competitors” cannot be substantiated.
The name zk-MCP already appears in a December 2025 publication. This repository
claims neither adoption by MCP maintainers nor regulatory certification.

## 1. What the sources establish

### Magnetar and its scientific lineage

The [Microsoft Research blog by Srinath Setty](https://www.microsoft.com/en-us/research/blog/proof-based-general-purpose-computing-with-magnetar/),
published on October 15, 2026, presents a zkVM based on standard hashes.
It reports average speedups of 10 to 39 times and approximately 12 ms for
verification. These are the author's results, not reproduced here; the speedups
do not apply to a complete MCP gateway.

The [Magnetar technical overview](https://www.microsoft.com/en-us/research/publication/magnetar-high-speed-post-quantumrv64-zkvm-from-standard-hashes/)
specifies RV64I, a MacBook Pro M4 Max with 12 performance cores, traces of
2^22 cycles and a claimed security level of 120 bits. Measurements are
7.2–8.7 million cycles/s, approximately 600 KiB per proof and 11–13 ms for
verification. Across 15 workloads, the reported geometric mean speedups are 39×
over SP1 Hypercube, 18× over Jolt-Dory and 9.6× over Jolt-Akita.
The reported optimized implementation reaches 9.5–12.8 million cycles/s.
These figures concern configurations different from ours.

The [full paper, 44 pages](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/10/magnetar-1.pdf)
describes a proof of RV64 execution and its recursive composition. The
architectural benefit is to verify proofs using operations that the machine
itself proves efficiently. Its lineage combines binary arithmetic, sum-check,
memory checking and polynomial commitments. The paper also notes that
zero-knowledge must be distinguished from a succinct execution argument.
An integration will require identifying the exact variant, parameters and
privacy options actually delivered.

| Component | Verified status | Implication |
|---|---|---|
| [Microsoft Spartan](https://github.com/microsoft/Spartan) | Public Rust code; R1CS; variant based on the discrete logarithm and Ristretto255 | This code is not BinarySpartan and does not inherit the post-quantum guarantees claimed for Magnetar |
| [BinarySpartan, ePrint 2026/1656](https://eprint.iacr.org/2026/1656) | Preprint received on August 11, 2026, revised September 3; Spartan over binary fields, Ligerito and ring switching | Publication usable for design; no public SDK verified by this research |
| [Lasso, authors' publication](https://www.microsoft.com/en-us/research/publication/unlocking-the-lookup-singularity-with-lasso/) | Lookup argument derived from Spark/Spartan; structured tables | Scientific building block in the lineage, not a gateway API |
| [a16z Jolt](https://github.com/a16z/jolt) | Public code, RV64IMAC at the time of consultation, MIT/Apache-2.0; alpha warning | Experimental candidate distinct from Magnetar |
| Magnetar | Public blog, overview and PDF; no corresponding official repository found | Explicit stub, no invented dependency |

Availability search: blog links, Setty's publications, web search
`Magnetar BinarySpartan github Srinath Setty`, then the GitHub API
`search/repositories?q=Magnetar+user:microsoft` and `q=BinarySpartan`.
Both API searches returned zero repositories during this session.
**“Official code not located as of October 15, 2026” is the finding**, not a
claim that Microsoft will permanently keep the code closed. No Magnetar code
license could therefore be verified. GitHub namesakes are not official
implementations.

### Backends usable independently of our POC

| Engine | Local execution and ISA | Security / maturity | Repository choice |
|---|---|---|---|
| SP1 V6 Hypercube | Public prover/verifier; dedicated toolchain; current documentation installs `riscv64im-succinct-zkvm-elf` | Check the proof type and assumptions of the selected version | First candidate for a real adapter |
| RISC Zero | `rzup`, `cargo risczero`, RISC-V guest and public journal | Distinguish STARK receipt, recursion and Groth16 wrapper | Second candidate, differential testing of the same core |
| Jolt | `jolt` CLI, guest/host, preprocessing; RV64IMAC | Dory with a ZK option; Akita currently without ZK according to the quickstart | Later experimentation, not an active POC hook |
| NativeSimulatorBackend | Native Rust process, Windows/Linux/macOS | No cryptographic soundness or confidentiality | Immediate demo, rejected by default by the firewall |

Sources: [SP1 introduction](https://docs.succinct.xyz/docs/sp1/introduction),
[SP1 installation](https://docs.succinct.xyz/docs/sp1/getting-started/install),
[RISC Zero repository](https://github.com/risc0/risc0),
[RISC Zero installation](https://dev.risczero.com/api/zkvm/install),
[Jolt quickstart](https://jolt.a16zcrypto.com/usage/quickstart.html).

SP1 documents Linux/macOS as native platforms. On this Windows machine,
real proofs will need to be established in a dedicated Linux/WSL or CI environment.
The old shorthand “SP1 is necessarily RV32” is obsolete for the V6 documentation
consulted. The ISA must be pinned alongside the backend.

The [RISC Zero security model](https://dev.risczero.com/api/security-model)
separates the assumptions at each layer and makes confidentiality limitations
explicit. Groth16 compression is not equivalent to a proof based only on hashes.
Similarly, a program using SHA-256 does not make its zkVM, TLS, source signatures
and entire software supply chain post-quantum.

The reference installation procedures are `sp1up` followed by `cargo prove --version`,
`rzup install` followed by `cargo risczero --version`, or the Jolt CLI and its
`cargo run --release` example. Consult the linked pages, inspect the installers,
then pin versions and hashes before running a reproducible benchmark.
These ZK toolchains are **not installed or tested** by this bootstrap.

## 2. MCP: an extension is possible, guarantees must be built

MCP describes JSON-RPC exchanges, initialization and tools; results may carry
content and metadata. `_meta` is the appropriate extension mechanism, but
the `zkp` key is not an MCP-approved extension. An unprefixed key is allowed;
a reverse-domain name will need to be agreed upon to reduce collisions. Sources:
[base specification](https://modelcontextprotocol.io/specification/2025-11-25/basic),
[tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

The [MCP specification](https://modelcontextprotocol.io/specification/2025-11-25)
addresses consent, access and security. It does not define a mandatory ZK proof
of tool execution. Saying that MCP requires “blind” trust or has no security
would therefore be incorrect. Our layer proves an additional policy relation
and retains access controls.

The requested `@modelcontextprotocol/sdk` package is pinned here to **1.32.1**,
the version returned by the npm registry during installation. The
[official TypeScript repository](https://github.com/modelcontextprotocol/typescript-sdk)
now indicates a V2 generation and a legacy V1 branch. This choice respects the
requested integration and enables the POC, but issue 04 must address migration
to V2 before any stable release. Tests were performed with the official client
over in-memory and stdio transports; Claude Desktop, Cursor and LangChain were
not launched in this session.

## 3. Competitive analysis: the gap is narrower than the initial prompt

| Primary source consulted | Observed overlap | What still needs to be distinguished |
|---|---|---|
| [Jing and Qi, arXiv:2512.14737](https://arxiv.org/abs/2512.14737), December 11, 2025 | Already uses zk-MCP; private communication auditing, reported Circom implementation | Our relation concerns authorization before a DevSecOps mutation |
| [ICME PreFlight](https://www.icme.io/product) | Announced product for pre-action control and ZK receipts, accessible through MCP | Compare open multi-zkVM interoperability, code and trust model; its claims are not audited here |
| [Bolyra](https://bolyra.ai/) and [public code](https://github.com/bolyra/bolyra) | MCP gateway, per-tool policies, signed receipts and announced ZK primitives | Verify the relation actually proved and its enforcement before mutation; reducing it to signatures alone would be incomplete |

These sources are sufficient to refute a general claim that no market exists.
They are neither an exhaustive inventory nor an audit of these products.
Web queries included `"zk-MCP" proof` and
`"verifiable MCP" zero knowledge`, followed by opening the primary sources.

**Differentiation hypothesis to validate with users**: an interoperable,
documented profile that binds policy code, collected facts, an exact project/MR/SHA,
bounded freshness and a nonce, then enforces this profile at the sole component
holding merge permissions. The value is not the zk-MCP name: it is the ability
to audit and replace the prover, connectors and verifier independently.

## 4. Realistic portability: business logic, not a universal ELF

The `ZkVmBackend` trait exposes `name`, `image_id`, `prove`, `verify`. Public
inputs, private inputs and outputs have an independent schema. The business
logic core is `no_std` and numbers are explicitly bounded. SP1/RISC Zero programs
will each need to read inputs, recompute commitments, run this core and publish
the same canonical journal.

Migration will require **recompilation and an ABI adapter**, conformance tests,
a new image and its verification keys. Different RV32, RV64IM or RV64I ISAs,
syscalls and journal conventions make the promise of the same binary across
all engines unjustified. BinarySpartan is the proof engine, not an RV64 ABI
by itself. No “effortless” Magnetar integration can be promised before its SDK
is published.

Migration may preserve the evaluator and MCP wire format, provided public
outputs and their guarantees remain identical. The trust registry must map
the ELF digest to the engine's native image/vkey; receipt verification must
never be replaced by a simple SHA of the file.

## 5. Banking/insurance positioning and regulatory limits

The profile targets technical proofs that software change rules were applied.
DORA covers, among other things, ICT risk management and controls; the AI Act
provides for logging mechanisms for certain high-risk systems. References:
[DORA, EUR-Lex text](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1699778718647&uri=CELEX%3A32022R2554),
[AI Act, Article 12, page 59 of the official text](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?qid=1730976229091&uri=OJ%3AL_202401689).
Some direct EUR-Lex accesses encountered a JavaScript challenge; the accessible
official search links are retained above.

A proof of these four conditions demonstrates neither a company's overall
compliance, nor the legality of an AI use, nor the absence of vulnerabilities.
The proposed audit vault must retain provenance, decisions, versions, approval
identities and API results, according to a requirements matrix validated for
the customer's context. No legal opinion or certificate is produced.

## 6. Benchmark and decision criteria

The local benchmark distinguishes receipt generation, verification that grants
authorization, policy denial and a tampered receipt. It measures the release
Rust worker, IPC and firewall; the network and real proofs are absent. See
`04-VALIDATION.md` and `tests/benchmarks/`.

The 5 ms target is evaluated at p95 and reported alongside the observed maximum;
it is not a real-time commitment. Magnetar's published 11–13 ms does not support
a promise of complete verification under 5 ms. Future comparisons must fix:
hardware, threads, RAM, versions, security level, preprocessing, proof type,
confidentiality, trace size, cold/warm startup and transport cost.

Decision to proceed: implement a real backend, prove the full
input/policy/action/journal binding, then validate the connectors and
pre-mutation control. An authenticated source and a valid proof are both
necessary; neither replaces the other.
