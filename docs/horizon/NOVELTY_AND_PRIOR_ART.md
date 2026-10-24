# HORIZON — novelty, substitutes and prior art

Research state: **October 17, 2026**. This documentary review demonstrates
neither the universal absence of a competitor nor freedom to operate.
Patent publications are examined as technical descriptions; their validity,
scope and legal status would require a separate analysis.
The research selection is described in [MARKET_DISCOVERY.md](MARKET_DISCOVERY.md).

**Conclusion: no general novelty of ZK applied to insurance decisions, signed
attestations or pre-action control is established.** The defensible work at
this stage is a reproducible protocol and a comparative integration trial.
Adapted issuance, disclosure restriction and acceptance of the proof by a
buyer remain to be demonstrated.

## 1. Method and limits

The axes examined are: proof of coverage, private claims automation, compliant
prior payment, financing fraud, selective attestations and agent control. The
research opened official documentation, repositories, authors' articles and
patent publication texts. Unretrieved indexing results do not serve as
quantitative evidence.

The earlier studies remain accessible: [initial research](../01-RESEARCH-AND-GAP-ANALYSIS.md),
[competitors of the gateway and of provider admission](../06-MARKET-NICHE-AND-CHALLENGE.md).
Commercial products were not tried. No exhaustive search by patent classes,
languages, families or claims was conducted. The absence of an exact example
in this selection is a research limit.

## 2. Prior art refuting broad claims

| Primary source, date | Established overlap | What the source does not demonstrate for HORIZON |
|---|---|---|
| [WO2021030246A1](https://patents.google.com/patent/WO2021030246A1/en), published February 18, 2021, declared priority August 9, 2019 | §0119: proof of coverage above a threshold without revealing its entire limit | Deployed ZK product, legal validity of the patent or identity with our join of two issuers |
| [CN113706323A](https://patents.google.com/patent/CN113706323A/en), published November 26, 2021 | Description of private automatic settlement, signed medical documents and zkSNARK proof; steps 8.1–8.3 | Security of the construction, code availability and deployment; the translation contains cryptographic ambiguities |
| [Hao, Qian, Chau](https://arxiv.org/abs/2305.08384), submitted May 15, 2023 | Parametric insurance, heterogeneous private sources and authenticity; prototype | Solvent demand or equivalence to an off-chain delegated payment |
| [BIS Mandala](https://www.bis.org/project/mandala), updated November 30, 2025 | Compliance demonstrated before payment, ZKP/MPC and banking cooperation | Same numerical relation, same authorities or performance of our target |
| [ERC-8354](https://ercs.ethereum.org/ERCS/erc-8354), proposal consulted on October 17, 2026 | Confidential verdict, action commitment, executor, expiration, nullifier and verification blocking execution | Universal adoption, audit of all references or production insurance use |
| [LIMOSS DDM](https://limoss.london/ddm) and [FCP](https://limoss.london/fcp), current pages | Normalization, access control and operational processes for delegated claims | ZK proof of our relation; their lack of any ZK mention does not prove a buyer gap |

The WO family notably includes a US publication
[US20220405852A1](https://patents.google.com/patent/US20220405852A1/en).
It does not constitute a second independent invention. Google Patents status
labels are not used to conclude an absence of rights: they do not replace the
registers and the analysis of the claims.

The [TrustLayer](https://www.trustlayer.io/) site presents an insurance
compliance management product. The text of a patent publication attributed to
this company does not demonstrate that its commercial product uses ZK.
Conversely, the absence of a detailed mention on its public page does not
demonstrate that this feature does not exist.

## 3. Alternatives to beat, with their trust boundaries

| Alternative | What it can already solve | Objection to selling ZK |
|---|---|---|
| Open values, signatures and native rule | Authenticity of the accepted values and computation reproducible by the recipient | If their disclosure is authorized, the private proof adds a cost without an established benefit |
| DSSE signed verdict | An issuer accepts responsibility for a verdict bound to an action | If this issuer is deemed trustworthy for the computation, no need to prove the evaluation |
| Standard BBS credential | Reveal only certain signed attributes, with derived presentations | A compliance boolean signed by the issuer may suffice; the BBS standard alone is not an arbitrary range engine |
| AnonCreds | Integer predicates and combined presentations | Thresholds and holder identities may already satisfy the simple case |
| Dock composite proofs | Relations and predicates over several credentials, including ranges depending on the chosen primitives | The combination of private sources and comparisons is not a new primitive |
| TEE with attestation | Execute the computation on private data under an attested software identity | If the parties accept the hardware, the operator and that trust, the integration cost may dominate the choice |
| MPC | Distributed computation when the parties do not want to gather their values at a prover | A central ZK prover does not solve this constraint; MPC or distributed proving changes the protocol |

The [DSSE](https://github.com/secure-systems-lab/dsse) format protects the
type and the signed payload. It does not prove the execution of a rule. It can
nevertheless bind nonce, audience, version and deadline: attributing
anti-replay to ZK alone would be a biased comparison.

[W3C BBS, Candidate Recommendation Draft of September 10, 2026](https://www.w3.org/TR/vc-di-bbs/)
specifies selective disclosure and derived proofs; this status is not a final
recommendation. [AnonCreds](https://anoncreds.github.io/anoncreds-spec/)
documents `<`, `<=`, `>` and `>=` predicates against integer thresholds, as
well as holder-bound credential presentations. A common link secret does not
automatically demonstrate that two documents concern the same insurance claim,
nor an arbitrary comparison between two secret attributes.

[Dock crypto-wasm-ts](https://docknetwork.github.io/crypto-wasm-ts/) documents
composite proofs, hidden attribute equalities, ranges and circuits. Ranges
belong to the mechanisms documented by this library, not to a property to be
attributed to the W3C BBS standard alone. This alternative is technically
close; it was neither executed nor audited in this research.

[AWS Nitro Enclaves](https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html)
documents signed attestations containing the enclave measurements, verifiable
by an external service. This is a trust boundary different from ZK, not an
absence of protection. Source validity and access policy must be handled in
both cases. Mandala also provides a primary reference for the use of MPC; no
universal ranking of latency or security between these families is justified
here.

## 4. What the specialized profile really changes

The committee chooses for the laboratory a range relation over signed
commitments. Signatures are verified **outside the proof**, over public
commitments and metadata. The proof demonstrates the constraints on their
openings. This requires the issuer to correctly attest this new object; a
signature over an existing PDF or JSON does not turn for free into a signature
over its Pedersen commitment.

This distinction forbids three shortcuts:

- "Faster than the guest" does not mean "same computation faster". The
  earlier guest verified a signature and commitments inside the proven
  computation; the specialized profile moves these verifications out.
- "Two authorities" does not mean "no trust". Each authority remains
  responsible for the meaning and correctness of its value, the currency, the
  case, the period and the custody of its key.
- "Reusable proof" does not mean "reusable authorization". The facts may be
  immutable, but trust, the right to act, expiration and reservation must be
  checked again.

Bulletproofs and Pedersen over curves rest on assumptions different from the
initial hash-based profile. This choice must not be presented as post-quantum.
The [Dalek aggregated ranges](https://github.com/dalek-cryptography/bulletproofs)
are an existing public implementation; the experimental R1CS API described by
the repository is not necessarily the profile used. The exact dependencies and
features must be pinned in the laboratory.

The holder knows both values. The public commitments and signatures allow
presentations to be linked; the profile does not claim the unlinkability of
certain credentials. The result reveals the order relation and the profile
bounds, even if no amount is public. Adaptive queries with chosen facts can
learn more than a single verdict; a ZK proof does not remove this functional
leak.

## 5. Permitted and refutable claims

| Formulation | Decision |
|---|---|
| First private claims control, first zk-MCP, virgin market | Dismissed: explicit prior art |
| New range or credential-join primitive | Dismissed: primitives and libraries available |
| New superiority of Vega on the insurance relation | Not demonstrated: different relations |
| Issuance compatible without change with existing insurers | Not demonstrated: commitment format to be adopted |
| Reproducible comparison of trust profiles on a sandbox action | Legitimate objective, to be confirmed by reports and tests |
| Measured reduction of disclosed data for an accepted business control | Hypothesis; requires validated restrictions and leak analysis |
| Purchasable product for a precise niche | Current NO-GO: need, budget and costs unknown |

The potentially defensible gain would be an accepted integration into a
precise control, accompanied by an issuance format, adversarial tests and
verified costs. None of these elements creates exclusivity on its own.
The niche would be refuted if DSSE, contractual sharing, existing credentials
or an already-installed service satisfy the same requirements at an acceptable
cost.

## 6. Documentary confidence register

Patent texts and specifications establish with high confidence that an idea is
described. They establish neither its security nor its market placement.
Product documentation establishes announced functions with medium confidence
on actual behavior, for lack of a trial. HORIZON's contractual restrictions,
purchase intents and savings remain unknown. A complementary targeted
verification would be necessary before publishing a novelty claim, filing a
patent or negotiating commercially.
