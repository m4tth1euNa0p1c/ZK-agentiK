# 10 — Conditionner et qualifier le déploiement on-premise

Jalon : M3. Priorité : P2. Dépendances : 01–09 et décision de pilote.

## User story

Comme exploitant, je déploie un pilote isolé, reproductible et observable sans
sortie des données privées vers un service externe imposé.

## Architecture technique

Images multi-stage épinglées par digest, non-root, filesystem en lecture seule,
quota CPU/RAM, secrets montés, séparation prover/verifier/credentials, SBOM
et signatures d'images. Configurer datastore durable, rotation de clés, backup
et reprise avec anti-rollback. Désactiver toute simulation en mode production.
La procédure de récupération d'urgence reste une action séparée à mandat borné.

## Critères d'acceptation

- Déploiement reproductible avec artefacts vérifiés et politique d'egress explicite.
- Aucun credential dans image/logs ; agent sans voie alternative de mutation.
- Procédure de restauration ne réactive pas une opération consommée.
- Test source/prover/store indisponible, migration et réconciliation UNKNOWN.
- Revue humaine de la frontière de confiance avant une quelconque production.

## Commandes de test

Ajouter `docker compose ... config` et une suite smoke/chaos sandbox une fois
les images créées. Avant cela : `npm test`, `cargo test --workspace --locked`.
Ne pas afficher une commande Docker hypothétique comme déploiement existant.
