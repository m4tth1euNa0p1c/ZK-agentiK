# Validation locale — 15 octobre 2026

Ce document conserve la campagne initiale du simulateur (12 tests Rust et
24 tests Node). La suite a depuis atteint 14 tests Rust et 25 tests Node, et
un backend réel séparé a produit quatre preuves : voir
[la campagne RISC Zero](08-RISC0-LAB-RESULTS.md). Les mesures ci-dessous restent
celles du premier run ; elles ne décrivent pas la nouvelle preuve réelle.

## Résultat et périmètre

Le POC MCP compile et ses tests locaux passent. **Ce chemin ne produit pas de preuve ZK** :
le worker Rust reconstruit un reçu de simulation contenant les données privées.
Les services Jira, SonarQube et GitLab sont des fixtures. Aucune mutation réelle,
aucun déploiement, aucun audit cryptographique et aucun essai client commercial
n'ont été effectués.

Les résultats ci-dessous ont été obtenus sur Windows x64, Intel Core Ultra 7
265F, environ 32 GiB de RAM, Node.js 24.11.1, npm 11.6.2 et Rust 1.93.0 MSVC.
Les dépendances sont verrouillées dans les deux lockfiles. La CI GitHub est
configurée mais n'a pas été exécutée à distance dans cette session.

## Commandes exécutées

| Vérification | Résultat |
|---|---|
| `node scripts/cargo.mjs test --workspace --locked` | 12 tests réussis : 5 cœur, 7 bridge ; zéro échec |
| `node scripts/cargo.mjs fmt --all -- --check` | Réussi |
| `node scripts/cargo.mjs clippy --workspace --all-targets --locked -- -D warnings` | Réussi, zéro avertissement |
| `npm test` | Build Rust/TS puis 24 tests réussis, zéro ignoré/échec |
| `npm run typecheck` | Réussi en mode strict |
| `npm run schema:check` | Schéma JSON identique aux schémas d'exécution |
| `npm run demo` | Client MCP stdio connecté ; merge simulé autorisé ; mauvais projet et reçu falsifié refusés |
| `npm run demo:critical` | Un dossier complet autorisé ; 23 scénarios adverses bloqués ; zéro merge supplémentaire |
| `npm run build:guest` | ELF32 RISC-V compilé, en-tête et entrée inspectés |
| `npm run benchmark -- --enforce-5ms` | Critère p95 de rejet <5 ms atteint sur ce run |
| `npm audit --omit=dev` | Zéro vulnérabilité signalée pour les dépendances de production à cette date |

Le shim Cargo sert uniquement à retrouver l'exécutable rustup sous Windows.
Lorsque Cargo est dans PATH, les mêmes commandes commencent directement par
`cargo`. Le scanner npm ne constitue pas un audit de sécurité du logiciel.
Les quatre skills locaux ont également passé le validateur de structure
`quick_validate.py` du skill-creator.

## Scénarios et invariants vérifiés

- Table exhaustive des quatre règles métier, bornes entières et statuts exacts.
- Contrôles critiques indépendants : rôles/MFA, fraîcheur, révision, fenêtre,
  artefact/SBOM/provenance, scans, récupération, canary, incident et arrêt.
- Vecteurs SHA-256/canoniques partagés Python → Rust/TypeScript ; rejet des
  encodages ambigus et statuts ASCII non imprimables.
- Altération des champs d'autorisation et du reçu : aucun effet de bord.
- Simulator interdit par défaut ; SP1/RISC Zero/Magnetar indisponibles refusés.
- Rejeu concurrent du même nonce ; 32 challenges distincts pour la même
  opération ; résultat API ambigu : aucune seconde mutation.
- Substitution du witness par un prover, changement des faits ou du HEAD,
  tentative d'affaiblissement de la politique : refus.
- Expiration pendant la preuve et pendant la réservation de l'opération,
  arrêt d'urgence activé pendant la preuve : aucun dispatch autorisé.
- Handshake, découverte et appels avec le client MCP officiel, sur transport
  mémoire et stdio. Claude Desktop, Cursor et LangChain n'ont pas été essayés.

Les tests critiques paramètrent plusieurs cas dans un même test : les 23
scénarios ne sont donc pas 23 tests Node supplémentaires. Les états de sécurité
du profil critique sont des attestations simulées ; aucune signature fournisseur
d'artefact, vérification de MFA réelle ou restauration effective n'est impliquée.

## Mesure du simulateur

Mesure du 15 octobre 2026 à 19:30:58 UTC, worker Rust release persistant,
30 itérations de chauffe et 300 échantillons par catégorie. Le coût inclut
IPC local, JSON et firewall TypeScript ; il exclut réseau et véritable preuve.
Le rejet métier mesure le refus immédiat d'un résultat non autorisant, pas
la vérification cryptographique d'une preuve de refus.

| Opération | p50 (ms) | p95 (ms) | maximum (ms) |
|---|---:|---:|---:|
| Génération du reçu natif | 0,0871 | 0,1864 | 0,4840 |
| Vérification autorisante | 0,0955 | 0,2134 | 0,6142 |
| Rejet métier | 0,0227 | 0,0389 | 0,3443 |
| Rejet d'un reçu altéré | 0,0757 | 0,1727 | 0,3535 |

Reçu : **282 octets** ; enveloppe JSON : **1 276 octets**. La RSS enregistrée
est celle du processus Node, pas le pic mémoire cumulé de tous les processus.
Le benchmark utilise la politique de base, pas le dossier critique complet.
Les mesures brutes avec identité de simulation sont conservées dans
[baseline-2026-10-15.json](../tests/benchmarks/baseline-2026-10-15.json).

Tous les rejets observés ici étaient inférieurs à 5 ms. Le script impose le
critère **p95**, pas une borne universelle : charge, machine, ordonnanceur et
backend changeront les résultats. Aucun objectif de latence ZK n'est validé.

## ELF RISC-V de faisabilité

Le binaire `target/riscv32im-unknown-none-elf/release/policy-guest-riscv`
fait 1 280 octets ; ELF32 little-endian, machine RISC-V, entrée 69 844.
Son SHA-256 est :

```text
18e1e40276eab4e61a22cec54e0f12c038aa1db227750d3319e8311cae76e5cc
```

C'est un probe de compilation freestanding. Il ne possède pas encore l'ABI
d'entrée, de journal et de terminaison d'une véritable zkVM. Cette compilation
n'établit ni une exécution RISC-V prouvée ni une portabilité binaire universelle.

## Limites restantes

Le store d'opérations et le store de nonces sont en mémoire : les tests ne
démontrent ni durabilité, ni reprise après crash, ni exclusion multi-instance.
La relecture des faits ne crée pas une transaction atomique entre trois services.
Le contrôleur cible doit imposer ses préconditions et ses droits de mutation.

La production exige un backend réel, un guest vérifiant les attestations
d'origine, un registre de confiance, l'isolation des tenants, une cible concrète,
des stores durables et des essais de panne. Le chemin de récupération d'urgence
est distinct du gel des changements ordinaires actuellement testé.
Ces travaux et leurs critères sont décrits dans [les dix issues](../issues/README.md).
