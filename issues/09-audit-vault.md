# 09 — Dossier d'audit privé et vérification hors ligne

Jalon : M3. Priorité : P1. Dépendances : 05, 07, 08.

## User story

Comme auditeur client, je peux réexaminer une admission lorsque le fournisseur
est indisponible, avec un minimum de divulgation et un accès gouverné aux pièces.

## Architecture technique

Journal append-only avec checkpoints indépendants, chiffrement et rétention
configurable. Séparer preuve d'autorisation, réservation, tentative, réponse API
et observation du résultat. Conserver originaux et provenance sous accès limité.
Bundle exporté : preuve, programme/vkey, politique, trust bundle daté et journal.
La vérification historique n'atteste pas une absence actuelle de révocation.

## Critères d'acceptation

- Aucune donnée privée du witness dans l'export de routine.
- Altération, omission détectable par checkpoints et versions obsolètes testées.
- Matrice DORA/AI Act revue pour le client : aucun certificat global ni promesse
  de remplacer les droits légaux d'audit par un reçu.
- Changement normal et future récupération d'urgence ont des politiques distinctes.

## Commandes de test

`cargo test --workspace --locked`, `npm test` ; ajouter export/import hors réseau,
perte de source, restauration, révocation et vérification de non-divulgation.
