# Whitepaper publication dossier

The canonical manuscript is the [LaTeX source](../whitepaper/whitepaper.tex), with
[bibliography](../whitepaper/references.bib) and [PDF](../whitepaper/whitepaper.pdf).
This file organizes its publication; it is not a second paper.

The manuscript must stay aligned with the [Horizon formal statement](../horizon/FORMAL_STATEMENT.md),
the [claims register](CLAIMS.md) and the
[frozen experimental verdict](../horizon/FINAL_VERDICT.md).
The Azure/GCP dossier describes plans and documented primitives, without
cloud measurements or a qualified multi-instance application.

## Candidate requirements

The formal relation, its bounds and assumptions precede claims.
Measurements distinguish preparation, fresh proof, reused presentation,
verification and durable path. Each number points to a raw artifact,
the scope, machine and sampling protocol.

Novelty is never “the world's first standard.” Related primitives,
credential schemes and products are credited; the prior-art search
remains bounded. Customer value, issuance by real authorities,
remote effects and external cryptographic review remain
H11, H13, H14 and H15 respectively.

The status remains **experimental laboratory**. A cryptographic proof does not
guarantee source truth, absence of application leaks, availability,
exactly one effect in a remote API or an organization's compliance.

## Reproduction and review

Use the manuscript build script in `docs/whitepaper/` and
retain its versions, output and PDF hash in the candidate. Successful LaTeX
compilation does not replace visual inspection of pages and tables.
The presence of a PDF does not mean it was checked by this dossier.

Apply the [checklist](RELEASE_CHECKLIST.md). An agent review must
be identified as such; no peer review, legal review or independent
audit is claimed. [CITATION.cff](../../CITATION.cff) metadata
cites the software and creates neither a DOI nor an accepted academic publication.
