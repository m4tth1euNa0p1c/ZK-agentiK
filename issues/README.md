# Roadmap d'ingénierie — tickets locaux

Ces dix fichiers sont des issues prêtes à reprendre ou publier. Aucun ticket
n'a été envoyé à GitHub ; la variante locale demandée est utilisée.
Le bootstrap apporte des interfaces et une simulation, pas les livrables
cryptographiques/production décrits dans ces issues.

**Porte produit préalable** : lire `docs/06-MARKET-NICHE-AND-CHALLENGE.md`.
Comparer la niche aux offres existantes et à la baseline signée. Le pilote ne
doit pas reconstruire Colofon ou un contrôleur existant sans avantage mesuré.

| Jalon | Issues | Sortie attendue |
|---|---|---|
| M1 — Core Protocol & Multi-zkVM Bridge | [01](01-multi-zkvm-backend.md), [02](02-deterministic-guest.md), [03](03-reproducible-benchmarks.md) | Une preuve réelle du journal complet, reproductible |
| M2 — SDK & profil ouvert | [04](04-mcp-middleware.md), [05](05-rust-wasm-verifier.md), [06](06-autonomous-agent-example.md) | Interopérabilité et vérifieur indépendant |
| M3 — Enterprise DevSecOps Gateway | [07](07-authenticated-connectors.md), [08](08-verifier-firewall.md), [09](09-audit-vault.md), [10](10-on-prem-deployment.md) | Pilote sandbox avec sources et effets démontrables |

Ordre recommandé après qualification du besoin : **07 (contrats de sources),
02 → 01 → 03 → 08 → 04 → 05 → 06 → 09 → 10**. Les contrats de 07/02 peuvent
être définis ensemble ; aucun backend ne compense des faits non authentifiables.
Le suivi des dépendances indique un ordre de construction, pas des dates promises.

L'action de promotion d'artefact de la niche proposée est un travail futur :
le POC actuel expose un merge GitLab simulé. Le mode de récupération d'urgence
est distinct, non livré et ne doit pas être ajouté comme bypass des contrôles.
