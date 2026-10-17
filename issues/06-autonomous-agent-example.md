# 06 — Exemple d'agent et pilote d'admission interentreprises

Jalon : M2. Priorité : P2. Dépendances : 04, 05, 07–08.

## User story

Comme fournisseur et client distincts, nous validons un changement concret sans
partager les faits bruts ni donner à l'agent le droit de contourner l'admission.

## Architecture technique

Conserver les démos merge/critique comme simulation. Ajouter un exemple sandbox
de **promotion d'un artefact immuable**, avec prover fournisseur et vérifieur
client dans deux domaines distincts. L'action inclut cible, environnement,
configuration, version attendue et digest. Un agent scripté suffit pour tester
le contrôle ; aucun abonnement LLM nécessaire.

## Critères d'acceptation

- Un flux accepté et corpus adverse, preuve vérifiée avant dispatch réel sandbox.
- Le client ne reçoit pas le witness, même via erreurs/logs.
- Les credentials de mutation ne sont pas accessibles à l'agent/prover.
- Appropriations commerciales validées par un fournisseur et un client, sans
  prétendre que ce couple suffit à démontrer un marché mondial.

## Commandes de test

`npm run demo`, `npm run demo:critical`, `npm test`.
Ajouter un runner d'exemple ZK séparé ; la démo actuelle reste clairement marquée.
