# Inventaire vérifié au commit 684b567

État de référence : **17 octobre 2026**, branche `feat/horizon-research`,
commit `684b567b5be52c4ddad6a74c401fc28db90b9ff2`.
Ce document consolide l'inventaire transmis par le porteur du projet. Les
statistiques ci-dessous sont figées à ce commit ; les ajouts ultérieurs de
documentation ne sont pas inclus. Il ne s'agit pas d'un audit externe.

## Traçabilité Git et CI

Comparaison avec `d18fe65840d5f1cd9dc6155e404c942dabf2bcc7` : **72 fichiers
modifiés ou ajoutés, 48 178 lignes ajoutées, 3 supprimées, 5 commits**.
Les lignes comprennent les données brutes et les rapports ; elles ne mesurent
ni la quantité de code métier ni une innovation scientifique.

| Commit | Heure Paris, 17 octobre 2026 | Livrable |
| --- | --- | --- |
| `3e0f7b9` | 03:54:06 | Baseline et critères de recherche |
| `80b2202` | 04:14:03 | Preuves spécialisées et contrôleur durable |
| `353652d` | 04:16:38 | Réutilisation des générateurs publics |
| `65f7d1e` | 04:31:34 | Expériences, rapports et déploiement |
| `684b567` | 04:35:40 | Permissions du montage privé sous Linux |

Au contrôle de cet inventaire, la [PR #1](https://github.com/m4tth1euNa0p1c/ZK-agentiK/pull/1)
est ouverte, en brouillon, non fusionnée. Les deux exécutions finales du commit
de référence sont réussies : [push](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/38995538208)
et [pull request](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/38995541913).
Ce sont deux exécutions de la même chaîne, pas deux audits indépendants.

Pour refaire le contrôle historique sans dépendre du HEAD futur :

```sh
git diff --shortstat d18fe65840d5f1cd9dc6155e404c942dabf2bcc7..684b567b5be52c4ddad6a74c401fc28db90b9ff2
git log --format="%h %ad %s" --date=iso-strict d18fe658..684b567
gh run view 38995538208
gh run view 38995541913
```

## Trois chemins à distinguer

| Chemin | Ce qui est exécuté | Limite décisive |
| --- | --- | --- |
| MCP DevSecOps | Moteur Rust déterministe, SDK/gateway TypeScript, politique critique, connecteurs synthétiques | Reçu de simulation divulguant le witness ; aucun backend ZK réel intégré à ce flux |
| Laboratoire RISC Zero | Guest avec signature de fixture, engagements et politique ; reçus Succinct et vérifieur séparé | Relation plus large ; sources synthétiques ; aucune mutation GitLab réelle |
| Laboratoire Horizon | Engagements signés, preuve Bulletproofs réelle, autorisation fraîche et stockage SQLite | Plafond par dossier ; action `record_claim_authorization` synthétique ; aucun paiement |

Sources : [politique critique](../05-CRITICAL-PLATFORM-POLICY.md),
[RISC Zero](../08-RISC0-LAB-RESULTS.md), [énoncé Horizon](FORMAL_STATEMENT.md),
[architecture](ARCHITECTURE.md).

## Mesures conservées, avec leurs périmètres

| Campagne | Observation | Interprétation permise |
| --- | --- | --- |
| RISC Zero CPU | 3 preuves autorisantes, 1 preuve de refus ; génération autorisante 154–163 s ; vérification p95 13,70 ms ; seal 222 668 octets | Faisabilité de cette politique sous zkVM, pas SLA MCP |
| Horizon A, Linux, après optimisation | Génération p95 6,546 ms | Preuve fraîche de la relation de plages |
| Horizon B, Linux, après optimisation | Vérification complète p95 1,247 ms ; présentation p95 0,065 ms | Preuve immuable toujours revérifiée ; présentation fraîche signée, pas nouvelle preuve de connaissance |
| Horizon, taille | 672 octets | Preuve de plages seule, hors signatures et enveloppe |
| Baseline divulguée, Linux | Vérification p95 0,245 ms | Même comparaison avec valeurs et ouvertures divulguées |
| Horizon durable, Windows | Vérification IPC + autorisation SQLite : p95 13,014 ms, p99 15,126 ms, maximum 180,310 ms | Cible complète de 10 ms manquée ; HTTP et cible distante exclus |
| Optimisation interne | Réductions p95 : génération A 15,75 %, vérification B 44,97 % | Comparaison à notre version initiale, relation inchangée ; aucune supériorité externe |

Les campagnes crypto avant/après ont chacune 500 observations par phase,
30 échauffements et cinq cas de valeurs. La campagne durable a 500 observations,
30 échauffements et une preuve préparée sur 530 cibles indépendantes. Les
intervalles statistiques supposent une indépendance qui n'a pas été établie.
Les deux environnements Linux/Windows ne forment pas un seul benchmark de service.
[Bruts, configurations et empreintes](BENCHMARK_RESULTS.json),
[méthode](BENCHMARK_METHODOLOGY.md).

Vega SHA-256 SC/MC a été exécuté localement. Ses estimations Criterion ne sont
pas des percentiles de requêtes et sa relation diffère de celle d'Horizon.
Le workload credential complet associé aux chiffres 92/23 ms n'est pas
reproduit. [Comparaison et limites](COMPETITOR_COMPARISON.md).

## Validation livrée

Au commit de référence : **23 tests Rust** (14 historiques, 9 Horizon) et
**43 tests Node** (25 historiques, 18 Horizon), soit **66 tests**. Les 18 tests
Node Horizon comprennent 7 groupes d'intégration/sécurité et 11 tests de
statistiques ; ce ne sont pas 18 familles d'attaques distinctes. Les scénarios
paramétrés, smoke tests Docker et corruptions de benchmark sont complémentaires.

La CI contrôle compilation, formatage, Clippy, types, schémas, ELF nu,
démonstration avec preuve réelle, redémarrage/rejeu et vérification de la fixture
publique dans un conteneur sans réseau ni witness. Les 500 corruptions algébriques
avant et après optimisation sont rejetées ; ce nombre ne mesure pas la
probabilité de solidité cryptographique. [Revue de sécurité](SECURITY_REVIEW.md).

## Livrables et portée

Les quinze livrables demandés dans `docs/horizon/`, complétés par `AUDIT.md`,
forment **16 documents structurés au commit de référence**, dont un JSON.
Ils accompagnent bibliothèque Rust, CLI, API, interface web, Docker Compose,
fixtures publiques, dépendances verrouillées et données brutes. Les tickets
locaux couvrent H00–H10 et les expériences encore ouvertes H11–H17.

Le prover connaît les deux valeurs et leurs ouvertures. Les valeurs sont
masquées au vérifieur ; métadonnées, engagements et présentations restent
corrélables. Les signatures attestent un émetteur, pas la vérité du sinistre.
Ed25519 et ce profil Bulletproofs/Ristretto ne sont pas post-quantiques.
La cible SQLite locale ne démontre pas un effet exactement une fois sur une
API distante. Aucun entretien client, audit externe ou qualification bancaire
n'est établi. [Verdict et critères d'acceptation](FINAL_VERDICT.md).

La démo crée une expérience indépendante et conserve ses artefacts :

```sh
npm run horizon:build
npm run horizon:demo
```

Pour l'interface persistante, suivre [DEPLOYMENT](DEPLOYMENT.md). Une adresse
loopback n'est pas une publication ; les fixtures expirent et une action
consommée reste consommée. Ne pas réinitialiser l'ancienne base pour refaire
une démonstration.

## Prochain fait à établir

Le [protocole de revue H11](REVIEW_PROTOCOL.md) prépare une confrontation avec
un responsable métier et un évaluateur sécurité. Il cherche à savoir pourquoi
un verdict signé par une partie déjà autorisée à connaître les deux valeurs
ne suffirait pas. Le dossier est prêt pour cette revue ; une validation client
reste à obtenir. Le statut demeure **GO laboratoire, NO-GO produit qualifié**.
