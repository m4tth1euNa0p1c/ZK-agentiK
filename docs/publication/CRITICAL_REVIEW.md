# Challenge of the cloud and publication recommendation

October 17, 2026. **Self-review by the dossier's author**, not an independent opinion.
Syntax validations are reported in [VALIDATION.md](VALIDATION.md).
The parent orchestrator can arrange a separate review of this diff; this document
does not claim that such a review has already taken place.

| Objection | Response supported by the dossier | Condition that would change the decision |
| --- | --- | --- |
| A closed network without a service proves nothing about the product | Correct. The deliverable is a syntactically validated foundation, with no claim of observed isolation | Authorized deployment followed by ingress/egress denial tests, inherited permissions and platform access |
| The recommendation could favor GCP based on a software-only algorithm | No provider is selected. Software Ed25519 support does not satisfy an HSM requirement | Explicit buyer requirements followed by signing/version/revocation tests at the appropriate protection level |
| An HA database does not solve remote mutation | Correct. The module creates no database and H14 remains open | Two controllers and a separate target; crash/lost ACK/recovery; effect counter and target contract verified |
| A private network does not protect data from the prover operator | Correct. Horizon assumes a prover that knows both openings | If this third party is prohibited, adopt and evaluate another architecture, possibly MPC/TEE, or abandon this case |
| Cloud cost could exceed the value of a signed verdict | Buyer cost and benefit remain unknown; no savings announced | H11 with a real constraint and budget; H16 with the same workload and availability for both solutions |
| An immutable archive can perpetuate a leak or false fact | Correct. No lock is enabled and minimization precedes archiving | Actual data policy, export/restoration tests and duration validated by the responsible authorities |
| Skills can create an illusion of assurance | Their validators check structure, not the safety of their decisions | Adversarial workflow evaluations and human review; H15 remains external |
| The hash manifest could be presented as an audit | Register entry P15 prohibits this: byte integrity, authenticity and truth are distinct | Attributable signatures and provenance plus a review of results, each with its scope |
| Notices do not cover all binaries | The inventory is explicitly partial | SBOM and notices for the exact distribution before redistributing bundles/images |

Decision: **GO for a documentary candidate and laboratory foundations**,
no irreversible cloud choice. **NO-GO for qualification of a critical
platform, a compliance announcement or general production availability**
on the sole basis of this dossier. This decision does not presume what
the user means by the acronym “GA”.

The next investments must reduce H11/H13/H14/H15/H17, rather than
multiply cloud services. A refuted buyer need or acceptable disclosure
may make the signed solution more relevant than ZK.
