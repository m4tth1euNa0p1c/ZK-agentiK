# Dossier de recherche ZK-agentiK

Travaux réunis pour le dépôt le **17 octobre 2026**. Les recherches et mesures
ci-dessous sont datées du **15 octobre 2026** ; cette mise en dépôt ne constitue
pas une nouvelle vérification de l'état du marché ou des publications.

## Parcours de lecture

**Finition publique et SDK : [dossier de publication](publication/README.md).**
[White paper](whitepaper/whitepaper.pdf), [mathématiques](../math/),
[registre d'artefacts](../evidence/), [outillage Proofkit](../tools/proofkit/README.md)
et [comparaison Azure/GCP](publication/CLOUD_COMPARISON.md). Ce dossier ajoute
ses observations datées sans remplacer les campagnes historiques ci-dessous.

**Nouvelle campagne du 17 octobre : [Horizon](horizon/FINAL_VERDICT.md).**
Recherche contradictoire banque/assurance, reproduction Vega SHA-256, preuve
spécialisée réelle, optimisation mesurée et sandbox durable. Son énoncé diffère
du guest RISC Zero historique. [Méthode et données](horizon/BENCHMARK_METHODOLOGY.md),
[relation](horizon/FORMAL_STATEMENT.md), [application](horizon/DEPLOYMENT.md).

[Inventaire vérifié au commit 684b567](horizon/INVENTORY_2026-10-17.md) et
[protocole de qualification H11](horizon/REVIEW_PROTOCOL.md) : bilan figé,
revue métier/sécurité, alternatives et critères de décision. Aucun entretien
client n'est déclaré réalisé par ces documents.

| Document | Contenu et portée |
| --- | --- |
| [01 — Recherche initiale et analyse d'écart](01-RESEARCH-AND-GAP-ANALYSIS.md) | Magnetar, BinarySpartan, Spartan, Lasso, SP1, RISC Zero, Jolt et MCP ; liens vers les sources primaires et limites des annonces |
| [06 — Équivalents, niche et contradictions](06-MARKET-NICHE-AND-CHALLENGE.md) | Concurrents et antériorités, revues technique/confidentialité/acheteur/crise, hypothèse fournisseur-client, critères de poursuite et d'arrêt |
| [02 — Proposition de protocole](02-ZK-MCP-RFC-SPEC.md) | Enveloppe expérimentale `_meta.zkp`, relation prouvée, liaisons, anti-rejeu et modèle de menace |
| [03 — Architecture](03-ARCHITECTURE.md) | Modules Rust/TypeScript, frontières de confiance, séquence de vérification et limites d'exploitation |
| [05 — Politique de plateforme critique](05-CRITICAL-PLATFORM-POLICY.md) | Règles déterministes, rôles, révisions, fraîcheur, scans, récupération et arrêt d'urgence |
| [04 — Validation du simulateur](04-VALIDATION.md) | Campagne initiale, tests MCP et mesures natives ; aucune preuve ZK dans ce chemin |
| [07 — Sécurité et performance de la pile réelle](07-STACK-SECURITY-AND-PERFORMANCE.md) | Choix RISC Zero, signature vérifiée dans le guest, hypothèses, avis de sécurité, confidentialité et méthode de mesure |
| [08 — Résultats du laboratoire RISC Zero](08-RISC0-LAB-RESULTS.md) | Quatre preuves réelles, tests adverses, mesures CPU, reproduction et conséquences pour la latence et la fraîcheur |

Les rapports sont des synthèses de recherche, avec leurs sources et leurs
limites. Les articles et codes tiers liés conservent leurs licences respectives.
La recherche initiale est conservée comme historique ; le rapport 08 décrit le
dernier état expérimental de ce backend RISC Zero. Le laboratoire Horizon
constitue une expérience supplémentaire sur une relation spécialisée différente.

## Conclusions conservées

- Une antériorité du nom zk-MCP et plusieurs offres proches ont été identifiées.
  Aucune revendication de premier standard mondial ou de marché vierge.
- La piste d'admission confidentielle d'artefacts entre fournisseur et client
  reste à qualifier auprès des deux parties et à comparer à un verdict signé.
- Le cœur métier partagé et le guest RISC Zero ont produit des preuves réelles
  sur des données synthétiques. L'autorité de signature est une fixture dont
  la graine privée est publique ; elle n'authentifie aucun fournisseur réel.
- La campagne CPU a mesuré 154–163 s de génération autorisante, 13,70 ms de
  vérification p95 et 6,95 ms de rejet cryptographique p95. Elle ne valide ni
  un objectif de 5 ms ni un challenge synchrone de 30 s.
- La confidentialité critique, les sources authentiques, la durabilité,
  l'intégration au firewall et le fonctionnement en crise restent à qualifier.
  Aucun benchmark GPU n'avait été réalisé dans cette campagne historique ;
  consulter les [tentatives GPU ultérieures](experiments/gpu/README.md).

## Code et éléments de reproduction

- [Cœur des règles](../crates/policy-engine-core/) et
  [relation canonique partagée](../crates/policy-statement/).
- [Bridge Rust](../crates/zkvm-bridge/), [SDK MCP](../packages/zk-mcp-sdk/) et
  [gateway de démonstration](../packages/enterprise-gateway/).
- [Laboratoire RISC Zero](../labs/risc0/) : guest, adaptateur, vérifieur,
  versions et dépendances verrouillées.
- [Receipts publics et manifeste d'empreintes](../tests/fixtures/risc0/README.md).
- Rapports CPU : [critique](../tests/benchmarks/risc0-cpu-2026-10-15-critical.json),
  [refus](../tests/benchmarks/risc0-cpu-2026-10-15-denied.json),
  [environnement du run de refus](../tests/benchmarks/risc0-cpu-2026-10-15-environment.json).
- Baselines natives : [initiale](../tests/benchmarks/baseline-2026-10-15.json) et
  [reçu JSON valide altéré](../tests/benchmarks/baseline-2026-10-15-bound-receipt.json).
- [Dix issues et trois jalons](../issues/README.md), [instructions agents](../AGENTS.md)
  et [quatre skills locaux](../.agents/skills/).

Avec Docker Linux, `npm run lab:risc0 -- verify` reconstruit le vérifieur et
contrôle les deux receipts conservés sans générer de nouvelle preuve.
Le [README principal](../README.md) documente les autres commandes.

Les installations, caches, binaires de build et fichiers d'environnement ne
font pas partie du dossier versionné. Les fixtures et mesures nécessaires à
la reproduction sont conservées explicitement dans `tests/`.
