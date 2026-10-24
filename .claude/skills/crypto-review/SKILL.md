---
name: crypto-review
description: Challenge proof statement bindings and verifier security before merging protocol, signature or backend changes.
---
Inspect docs/development/UPSTREAM_REVIEW_2026-10-24.md, current upstream SHA/status and exact local source. For each new profile inspect verifier-supplied domain, version, statement, trust roots, public commitments, serialized proof, proof layout and freshness. Propose failing cross-profile, malicious-layout, substituted-source, expired and replayed test vectors; count effects. Separate mathematical soundness from source truth, privacy, current business authorization and exactly-once remote effects. Classify reproduced / hypothetical / inapplicable. Do not merge upstream PRs reflexively.
