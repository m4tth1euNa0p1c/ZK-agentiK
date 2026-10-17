---
name: scientific-whitepaper
description: Rédiger ou réviser le whitepaper de ZK-agentiK à partir de relations formelles, preuves expérimentales et sources primaires, en distinguant protocole, implémentation et hypothèses.
---

# Article scientifique vérifiable

Lire `AGENTS.md`, `docs/horizon/FINAL_VERDICT.md`,
`docs/horizon/BENCHMARK_RESULTS.json` et `docs/publication/CLAIMS.md`.
Consulter le manuscrit dans `docs/whitepaper/` avant de créer un document concurrent.

## Procédure

1. Écrire la relation prouvée, les bornes entières, le transcript et les hypothèses
   de confiance avant le résumé. Vérifier ces éléments contre le code verrouillé.
2. Associer chaque affirmation à une source primaire datée ou à un artefact local
   avec commande, révision et périmètre. Marquer explicitement les inférences.
3. Distinguer preuve de connaissance, signature d'autorité, vérité des faits et
   autorisation d'un effet. Pour le profil B, décrire la preuve immuable réutilisée
   et la signature fraîche du détenteur ; ne pas annoncer une preuve fraîche.
4. Décrire les fuites : engagements et identifiants corrélables, résultat de
   prédicat, métadonnées, taille et timing. Le prover Horizon connaît les deux
   ouvertures ; il ne s'agit pas d'un calcul multipartite.
5. Comparer à un verdict signé et à une divulgation des valeurs avant de comparer
   des systèmes ZK. Comparer uniquement des relations et périmètres équivalents.
6. Conserver les échecs et les inconnues : H11, H13, H14, H15 et H17 ne sont pas
   clos par la rédaction. Une revue d'agents n'est pas un audit indépendant.

## Mesures

Publier séparément préparation, génération, vérification cryptographique,
présentation réutilisée et chemin durable. Donner machine, échantillons,
échauffements, versions, tailles complètes et erreurs. Un p95 local n'est pas un
SLA ; un intervalle conditionné à IID ne démontre pas cette hypothèse.
Ne pas convertir un microbenchmark Vega SHA-256 en résultat credential mDL.
Ne jamais annoncer une supériorité universelle, une nouveauté absolue ou une
sécurité post-quantique du profil Bulletproofs/Ed25519.

## Sortie et contradiction

Livrer le diff du manuscrit, la table d'assertions modifiée, les commandes de
reproduction et les limitations restantes. Utiliser le contrat
`.agents/roles/claim-challenger.md` pour une revue distincte quand une revue par
agent est demandée. Sinon effectuer une passe de contradiction explicite sans
prétendre avoir obtenu une seconde revue. Écarter ou qualifier toute assertion
sans support ; ne pas fabriquer une expérience pour combler une lacune.
