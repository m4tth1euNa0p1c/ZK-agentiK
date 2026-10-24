---
name: evidence-publication
description: Prepare an auditable publication of ZK-agentiK, verify the public claims and artifacts, licenses and reproducibility without confusing preparation, publication and production qualification.
---

# Prepare an evidence-based publication

Read `docs/publication/RELEASE_CHECKLIST.md`, `docs/publication/CLAIMS.md`,
`SECURITY.md` and `THIRD_PARTY_NOTICES.md`. Identify the exact candidate commit.
Preserve the user's changes, in particular untracked files.

## Verify the candidate content

1. Inventory the tracked files and the diff; do not limit the search for
   secrets to the latest diff. Distinguish public fixtures, generated private keys,
   third-party data, logs and screenshots. Do not display the secrets found.
2. Check the commands actually available in `package.json` and the Cargo
   manifests. Record the executed commands, versions, exit codes
   and limits. Do not rewrite a historical result as a current result.
3. Associate every security or performance claim with its entry in
   `docs/publication/CLAIMS.md`. A fingerprint guarantees the identity of the
   bytes, not their truth, their date, nor an external review.
4. Check direct and transitive licenses, notices, and included images and
   data. The notices summary is neither a complete SBOM nor a freedom-to-operate
   opinion. Keep the texts required in the distribution.
5. Check local links, citation metadata and recovery instructions.
   Clearly flag the laboratory status, the unimplemented adapters
   and the open trust boundaries.

## Expected result

Produce a checklist with three states: verified, unverified,
blocking. Each verified state cites an artifact or a command and its date.
Prepare a reviewable candidate before any publication-related request.
Do not change the repository visibility, publish a package or create a release
unless this action is included in the session's authorization.
Merely preparing the candidate does not require an additional permission.

An adversarial review can use `.agents/roles/release-reviewer.md`.
Do not turn an agent's agreement into a security audit or a legal opinion.
