# 01 — Implémenter le premier backend ZK réel

Jalon : M1. Priorité : P0. Dépendances : contrat 02 et attestations 07.

Avancement : `labs/risc0/host` implémente `Risc0LabBackend` et le trait
`ZkVmBackend`, avec guest et vérifieur indépendants. Le banc est historique et
utilise une autorité de fixture publique ; l'intégration MCP, les sources
réelles et la qualification du profil de confidentialité restent ouvertes.

## User story

Comme opérateur client, je vérifie une preuve de politique sans faire confiance
au calculateur ni recevoir ses faits privés.

## Architecture technique

Conserver `ZkVmBackend`, implémenter SP1 ou RISC Zero avec versions et toolchain
épinglées. Choisir le type de preuve et son mode ZK explicitement. Registre
ELF digest → image/vkey native approuvée. Comparer le journal complet de 02.
Le stub Magnetar reste indisponible jusqu'à un SDK officiel vérifié.

## Critères d'acceptation

- Preuve réelle locale sur une fixture signée ; witness absent de l'export.
- Mauvais journal/image/signature refusés ; aucune simulation en fallback.
- Même cœur et sorties canoniques entre natif et backend réel.
- Versions, licence, hypothèses, RAM et confidentialité documentées.

## Commandes de test

`cargo test --locked -p zkvm-bridge` et `npm test` restent obligatoires.
Créer une suite opt-in `backend_conformance` et son feature de backend ;
documenter sa commande exacte avec toolchain installée. Le test actuel du
stub ne doit jamais être compté comme réussite cryptographique.
