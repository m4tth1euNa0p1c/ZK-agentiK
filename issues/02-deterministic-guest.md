# 02 — Prouver le journal et les faits attestés dans le guest

Jalon : M1. Priorité : P0. Dépendance : contrat des sources 07.

Avancement : le guest `labs/risc0/methods/guest` utilise `policy-statement`,
recalcule les engagements, publie le journal complet et vérifie une signature
Ed25519 de fixture dans la VM. Le probe ELF nu est conservé séparément.
Les attestations de plusieurs sources réelles et leur complétude restent à réaliser.

## User story

Comme vérifieur, je sais que les règles ont porté sur les attestations autorisées
du même artefact, de la même cible et de la bonne période.

## Architecture technique

Remplacer le probe ELF par un adaptateur d'entrées/journal natif à la zkVM choisie.
Dans le guest : vérifier signatures, émetteurs, sujet, schéma et complétude ;
lier révision, artefact, environnement, configuration, politique et challenge.
Évaluer le cœur `no_std`, recalculer engagements et publier le journal.
Les collections et tailles de signatures sont bornées. Pas de crypto maison.

## Critères d'acceptation

- Une attestation omise, périmée, d'un autre sujet ou d'une clé inconnue refuse.
- Vecteurs identiques hôte/guest, cas limites temps/nombres et statut inconnu.
- Aucune donnée secrète dans journal/logs ; politique et divulgations déclarées.
- Le nombre de cycles et la mémoire du guest sont mesurés.

## Commandes de test

`cargo test --locked -p policy-engine-core`, `npm run build:guest`.
Ajouter au backend réel un test prove/verify du guest complet et son invocation
reproductible ; la compilation freestanding actuelle n'en tient pas lieu.
