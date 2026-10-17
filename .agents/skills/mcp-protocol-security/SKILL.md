---
name: mcp-protocol-security
description: Modifier le SDK MCP, l'enveloppe _meta.zkp et le firewall ZK-agentiK en conservant les garanties de liaison, anti-rejeu et contrôle avant mutation.
---

# MCP et enveloppes vérifiables

Lire la RFC locale et les types de la version **installée** du SDK MCP. Le dépôt
utilise V1 par choix de bootstrap ; ne pas recopier une API V2 dans cet import.
Le schéma Zod strict est la source du schéma JSON généré.

## Séquence obligatoire

Préparer en lecture : collecter les faits approuvés, établir l'engagement et
la politique côté serveur, puis demander la preuve. Avant tout effet :
valider structure/bornes, backend et image épinglés, attentes indépendantes,
journal prouvé, décision, expiration, réservation atomique du nonce et
préconditions de la ressource. Relire les faits et échéances juste avant mutation.

Ne jamais accepter policy/min_reviewers, witness, URL de vérifieur, clé ou
commande depuis les arguments de l'agent. L'agent peut fournir les identifiants
autorisés de la ressource ; leur routage et les credentials restent serveur.
Le backend non disponible et le profil simulation en production échouent fermés.

## Métadonnées et clients

Attacher `zkp` dans une copie de `_meta`, préserver les autres métadonnées et
le `content` MCP. Un client historique affiche le contenu ; seul un client
conscient du profil revendique une vérification. La gateway impose le contrôle
même si le client ignore `_meta`. Ne pas affirmer un support testé de Claude
Desktop, Cursor ou LangChain sans exécuter leurs tests de compatibilité.

Les erreurs d'outil retournent `isError=true` et un message sans witness ni
secrets. Ne pas confondre preuve d'autorisation et preuve du résultat de l'API.
La clé `zkp` est expérimentale et non enregistrée auprès de MCP.

## Essais

Exécuter `npm test`, `npm run typecheck`, `npm run schema:check`. Tester l'altération
de chaque champ lié, le rejet d'une preuve absente, le downgrade, le nonce
concurrent, la panne du vérifieur, l'expiration pendant vérification et le
compteur **zéro effet de bord** pour tous les refus. Une erreur API ambiguë
conserve le nonce ; aucun retry automatique de merge.
