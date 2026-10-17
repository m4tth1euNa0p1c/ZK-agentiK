# 07 — Acquérir des faits authentifiés et complets

Jalon : M3. Priorité : P0. Dépendances : contrat de pilote validé.

## User story

Comme client, j'accepte les autorités factuelles convenues mais ne dois pas
croire des booléens librement fabriqués par le fournisseur ou le LLM.

## Architecture technique

Connecteurs Jira/SonarQube/GitLab en lecture avec TLS, pagination, timeouts,
allowlist et normalisation versionnée. Pour le profil critique, inclure IAM,
scan complet, signature d'artefact, restauration et métriques canary. Réutiliser
Sigstore/in-toto ; vérifier les possibilités d'Automata avant réécriture.
Chaque attestation porte sujet, émetteur, date de mesure, date de collecte,
couverture, configuration, révision et statut. Plusieurs clés d'un même opérateur
ne sont pas automatiquement des autorités indépendantes.

## Critères d'acceptation

- Pas de fallback conforme sur absence/erreur ; pas de renouvellement artificiel
  de l'âge d'un vieux rapport lors d'une simple collecte.
- Signatures vérifiables par 02, mapping ressources approuvé côté serveur.
- Rapport omis, doublon, mauvais artefact, scan incomplet, source inconnue refusés.
- Aucune signature HMAC de fixture présentée comme signature éditeur.

## Commandes de test

`npm test`, `npm run typecheck` ; ajouter serveurs HTTP factices pour 401/429,
pagination, timeouts, redirections et signatures altérées. Intégration réelle
uniquement en environnement de test avec comptes dédiés.
