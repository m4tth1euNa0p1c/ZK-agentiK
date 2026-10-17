# Proofkit SDK expérimental

`@zk-agentik/proofkit-sdk` fournit `defineVerifiedTool` pour exposer un outil
par HTTP, MCP ou un autre transport, avec le même chemin vérification puis
autorisation. Il est consommé par le [profil Horizon](../horizon-demo/src/tool.ts)
et sa démonstration à preuves réelles. Le package reste privé dans npm ; ouvrir
le dépôt n'est pas publier une version stable du SDK.

```ts
const tool = defineVerifiedTool({
  name: 'record_claim_authorization',
  profile: 'horizon-range-v1',
  evidenceKind: 'zk',
  environment: 'sandbox',
  input: inputSchema,
  challenge: challengeSchema,
  verified: verifiedSchema,
  authority: {
    issue: input => challengeStore.issue(input),
    expected: nonce => challengeStore.expected(nonce),
    verify: (presentation, expected) => trustedVerifier.verify(presentation, expected),
    authorize: (expected, verified) => durableController.authorize(expected, verified),
  },
});
const challenge = await tool.issue({});
// Le prover reçoit le challenge, produit une présentation ; ses secrets restent chez lui.
const result = await tool.execute({ nonce: challenge.nonce, presentation });
```

Cet extrait illustre le contrat, ses adaptateurs sont à fournir. L'exemple
compilé complet se trouve dans `packages/horizon-demo/src/tool.ts` :

```sh
npm ci --ignore-scripts
npm run horizon:build
npm run horizon:demo
npm run test:proofkit
```

## Garanties du SDK et obligations des adaptateurs

Le SDK borne et copie les entrées JSON, impose leurs schémas, conserve les
adaptateurs enregistrés au démarrage et récupère les attentes côté serveur.
Il recontrôle les dates après l'attente de vérification, interdit la simulation
en mode production et n'effectue aucun retry de mutation. L'appelant ne fournit
ni verdict vérifié, ni politique, ni URL de vérifieur, ni clé de confiance.

**La sécurité cryptographique vient du profil, l'atomicité vient du contrôleur.**
`verify` doit vérifier toute la relation et comparer son énoncé aux attentes.
`authorize` doit recontrôler révocations et dates au point d'effet, réserver
durablement nonce et opération indépendamment, imposer les préconditions cible
et conserver `UNKNOWN`. Un booléen renvoyé par un adapter arbitraire ne devient
pas une preuve parce qu'il a traversé le SDK. Les types ne prouvent pas la
correction d'un adapter ; les tests négatifs du profil sont obligatoires.

Le helper ne fournit ni authentification utilisateur, ni mTLS, ni circuit
universel, ni transaction distribuée. L'hôte et ses adaptateurs sont dans
la frontière de confiance. Le seul profil intégré ici enregistre une action
SQLite synthétique ; les credentials d'une cible réelle doivent rester dans
le contrôleur. Un descripteur `evidenceKind` n'est pas une certification.

## Ajouter un outil métier

1. Fixer propriétaire du contrôle, unités, bornes, sources acceptées, données
   publiques/privées et alternative signée. Utiliser le [protocole H11](../../docs/horizon/REVIEW_PROTOCOL.md).
2. Définir une relation explicite et un identifiant de profil distinct. Un
   changement de politique ne peut être une simple modification de texte autour
   de la preuve existante : le vérifieur doit contrôler la nouvelle relation.
3. Implémenter les quatre adaptateurs avec racines et politique fixées serveur.
4. Tester fausse preuve, mauvais contexte/tenant, expiration après attente,
   deux nonces pour une opération, concurrence, redémarrage, révocation et
   résultat ambigu en vérifiant le compteur d'effets externes.
5. Consigner code, versions, commandes, résultats datés et limites avec Proofkit.

Les neuf groupes de tests SDK utilisent un adaptateur de simulation explicitement
marqué pour tester le contrat. Les tests et la démo Horizon traversent le même
helper avec Bulletproofs réelles et SQLite. Aucune confusion entre ces preuves.

## Exemple MCP réel

Après `npm run horizon:build`, le serveur officiel MCP lit uniquement une
configuration publique et une base dédiée :

```sh
node packages/horizon-demo/dist/mcp-stdio.js <public.json> <dedicated-sandbox.sqlite>
```

Il expose `horizon_issue_challenge` et `horizon_authorize_claim`. Le client doit
obtenir la présentation auprès du fournisseur ; aucun witness ni secret de
signature n'est chargé par ce serveur. Les tests `tests/horizon/mcp.test.ts`
connectent un client MCP officiel, génèrent une preuve réelle dans un worker
distinct et comptent les effets pour falsification, acceptation et rejeu.
La présentation Horizon ne réutilise pas le schéma `_meta.zkp` du simulateur
historique. Voir [l'architecture](../../docs/horizon/ARCHITECTURE.md).

Pour consigner les résultats et exécuter les profils disponibles, utiliser
[Proofkit CLI](../../tools/proofkit/README.md). Pour les secrets, IAM et garanties
multi-instance, les [fondations cloud](../../docs/publication/CLOUD_COMPARISON.md)
décrivent les décisions encore à prendre ; elles ne modifient pas les garanties
de l'exemple local.
