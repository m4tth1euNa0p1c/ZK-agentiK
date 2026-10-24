# Engineering roadmap — local tickets

These ten files are issues ready to be picked up or published. No ticket
has been sent to GitHub; the requested local variant is used.
The bootstrap provides interfaces and a simulation, not the
cryptographic/production deliverables described in these issues.

**Prerequisite product gate**: read `docs/06-MARKET-NICHE-AND-CHALLENGE.md`.
Compare the niche to existing offerings and to the signed baseline. The pilot
must not rebuild Colofon or an existing controller without a measured advantage.

| Milestone | Issues | Expected output |
|---|---|---|
| M1 — Core Protocol & Multi-zkVM Bridge | [01](01-multi-zkvm-backend.md), [02](02-deterministic-guest.md), [03](03-reproducible-benchmarks.md) | A real, reproducible proof of the complete journal |
| M2 — SDK & open profile | [04](04-mcp-middleware.md), [05](05-rust-wasm-verifier.md), [06](06-autonomous-agent-example.md) | Interoperability and independent verifier |
| M3 — Enterprise DevSecOps Gateway | [07](07-authenticated-connectors.md), [08](08-verifier-firewall.md), [09](09-audit-vault.md), [10](10-on-prem-deployment.md) | Sandbox pilot with demonstrable sources and effects |

Recommended order after qualifying the need: **07 (source contracts),
02 → 01 → 03 → 08 → 04 → 05 → 06 → 09 → 10**. The 07/02 contracts can be
defined together; no backend compensates for facts that cannot be authenticated.
Dependency tracking indicates a build order, not promised dates.

The artifact promotion action of the proposed niche is future work:
the current POC exposes a simulated GitLab merge. The emergency recovery mode
is distinct, not delivered, and must not be added as a bypass of the controls.
