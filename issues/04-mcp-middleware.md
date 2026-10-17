# 04 — Stabiliser le profil SDK et migrer MCP V2

Jalon : M2. Priorité : P1. Dépendances : 01, 08.

## User story

Comme intégrateur, je greffe l'admission vérifiable à mon contrôle existant sans
faire dépendre la sécurité du comportement volontaire du LLM.

## Architecture technique

Évaluer le SDK MCP V2 officiel et la migration de V1. Conserver transport,
contenu et métadonnées ; négocier le profil et son namespace. Fournir un
adaptateur séparant préparation et effet, et un vérifieur de résultat client.
Comparer les interfaces ACS/EVC/KedgeFlow ; ne pas inventer un standard ratifié.

## Critères d'acceptation

- Client officiel, version négociée, preuve absente/refusée et champs inconnus testés.
- Tests réels Claude Desktop/Cursor/LangChain si leur compatibilité est revendiquée.
- Aucun effet du handler avant vérification, aucun downgrade implicite.
- Schéma machine et RFC synchrones ; décision de nommage documentée.

## Commandes de test

`npm test`, `npm run typecheck`, `npm run schema:check`, `npm run demo`.
Ajouter une matrice de versions/transports isolée et en publier les versions
effectivement testées, sans extrapoler à tous les clients MCP.
