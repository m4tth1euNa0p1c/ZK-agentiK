# Auditable publication candidate

This checklist prepares a reviewable result. It does not authorize changing
the repository's visibility, publishing a package or deploying a service. The candidate
remains an **experimental laboratory**, even if all local checks pass.

For each row enter `verified`, `not verified` or `blocking`, with date,
commit, command/artifact and owner. Do not check off an intention.

## Candidate identity

- [ ] Exact candidate commit and tree state retained; the user's untracked
  changes excluded from any automatic deletion or inclusion.
- [ ] Diff and history intended to become public examined: files, branches,
  tags, logs, comments, CI artifacts and old versions may contain
  information absent from the current tree.
- [ ] Scope decided: private preparation, PR, public repository or published package.
  Authorization for one does not imply authorization for the others.

## Content and security

- [ ] No real credential, real witness, customer data, sensitive tenant
  identifier, private URL or non-fixture commitment opening in the candidate.
- [ ] Fixtures are explicitly synthetic; locally generated keys
  remain outside Git. Logs and screenshots do not disclose these keys.
- [ ] Simulators and unimplemented adapters are identified and rejected
  where a real proof is required; no simulated success presented as ZK.
- [ ] Authorization invariants tested: complete action bound, denial before effect,
  replay, concurrency, expiration/revocation during a wait, business operation
  reserved independently of the nonce, ambiguous network response and reconciliation.
- [ ] Local SQLite status and H14/H17 blockers are visible in cloud
  guides. No unproven remote “exactly once” claim.
- [ ] Reporting procedure verified in `SECURITY.md`; no invented contact or response
  time; no external audit announced without an attributable report.

## Reproducibility

- [ ] Root commands required by `AGENTS.md` run for the candidate; the
  Horizon/Proofkit profiles tested separately using their available scripts.
- [ ] Versions and lockfiles retained, negative tests measuring effects and not
  just exceptions; local results separated from remote CI results.
- [ ] Historical measurements retained with their scope; no long campaign
  rerun merely to display success. Any new performance
  claim requires a justified new measurement.
- [ ] Manuscript rebuilt and rendering inspected; links, tables, bibliography,
  proof sizes and limitations aligned with artifacts.
- [ ] IaC foundations compiled/validated locally; absence of cloud testing stated.
- [ ] Artifact manifest, hashes and exclusions verified. An optional
  `proofkit seal` binds bytes; it does not certify scientific truth.

## Rights and claims

- [ ] Project license, transitive licenses, notices, data and images reviewed
  for the exact distribution. `THIRD_PARTY_NOTICES.md` is a partial inventory,
  not a statement of legal compliance or a complete SBOM.
- [ ] No invented DOI, partner, customer, certification, savings or result.
- [ ] `CLAIMS.md` register aligned with public texts; explicit exclusions
  of absolute novelty, Vega record, post-quantum Horizon and DORA qualification.
- [ ] `CITATION.cff` matches the software; version/date metadata added
  only when justified by an actual release.
- [ ] Adversarial review of the candidate performed and identified as an agent
  or human review. H11/H13/H14/H15/H17 reservations remain visible.

## Separate final decision

The final report states separately: candidate publishable as an experiment;
effective publication authorization; qualification for a critical
platform. The latter two never follow mechanically from local tests.
If the user requests an external action, present the candidate and its
concrete reservations before the final step, according to the session's authorizations.
