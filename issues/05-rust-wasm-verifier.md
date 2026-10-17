# 05 — Livrer un vérifieur Rust/WASM indépendant

Jalon : M2. Priorité : P1. Dépendances : 01–02, 04.

## User story

Comme client destinataire ou auditeur, je vérifie un bundle exporté localement
sans accès au prover du fournisseur ni à ses données privées.

## Architecture technique

Extraire un vérifieur minimal de receipt avec registre d'images/vkeys signé.
Compiler WASM uniquement si le backend réel le supporte ; sinon proposer une
CLI Rust honnêtement documentée. Imposer limites mémoire/CPU, encodages stricts,
trust bundle daté et politique de révocation explicite.

## Critères d'acceptation

- Deux implémentations/emballages indépendants valident le même corpus.
- Bundle falsifié, image inconnue et trust bundle périmé refusés.
- Pas de witness, télémétrie ou requête réseau implicite.
- Vérification historique distincte de l'autorisation courante hors réseau.

## Commandes de test

`cargo test --workspace --locked`, `npm test`.
Ajouter tests wasm32 et navigateur sur preuves réelles, mesurer cold/warm et
tester les quotas. Ne pas convertir le simulateur en « vérifieur ZK WASM ».
