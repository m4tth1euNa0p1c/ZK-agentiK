# 08 — Rendre l'admission durable et vérifier la cible

Jalon : M3. Priorité : P0. Dépendances : 01, 07.

## User story

Comme opérateur, je veux qu'une concurrence, panne ou réponse perdue ne réactive
jamais un droit déjà consommé et n'autorise aucune mutation hors contexte.

## Architecture technique

Remplacer les stores mémoire nonce/opération par transactions durables partagées.
Identité d'opération indépendante du challenge, états RESERVED/REJECTED/UNKNOWN/
COMPLETED, fencing/epoch pour récupération. Revérifier les échéances après chaque
attente avant dispatch. Cible sandbox avec précondition atomique de version et
digest ; classifier explicitement les ressources sans cette capacité.

## Critères d'acceptation

- 32 appels, deux processus, crash puis redémarrage : au plus un dispatch autorisé.
- Une réponse perdue donne UNKNOWN et impose réconciliation, pas un retry aveugle.
- Partition du store, snapshot ancien, image/politique changée : refus.
- Horloge franchissant deadline pendant chaque attente : zéro mutation.
- Pas de claim exactly-once ni de rollback distribué automatique.

## Commandes de test

`npm test`, `npm run demo:critical` ; ajouter une suite chaos sur datastore et
cible sandbox avec traces indépendantes. Les tests mémoire actuels sont une
base et ne démontrent pas la durabilité interinstances.
