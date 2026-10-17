# Candidat de publication auditable

Cette checklist prépare un résultat reviewable. Elle n'autorise pas à changer
la visibilité du dépôt, publier un package ou déployer un service. Le candidat
reste un **laboratoire expérimental**, même si tous les contrôles locaux passent.

Pour chaque ligne renseigner `vérifié`, `non vérifié` ou `bloquant`, avec date,
commit, commande/artefact et responsable. Ne pas cocher une intention.

## Identité du candidat

- [ ] Commit candidat exact et état de l'arbre conservés ; changements non suivis
  de l'utilisateur exclus de toute suppression ou inclusion automatique.
- [ ] Diff et historique destinés à devenir publics examinés : fichiers, branches,
  tags, logs, commentaires, artefacts CI et anciennes versions peuvent contenir
  des informations absentes de l'arbre courant.
- [ ] Périmètre décidé : préparation privée, PR, dépôt public ou package publié.
  Une autorisation pour l'un ne suppose pas l'autorisation pour les autres.

## Contenu et sécurité

- [ ] Aucun credential réel, witness réel, donnée client, identifiant de tenant
  sensible, URL privée ou ouverture d'engagement hors fixture dans le candidat.
- [ ] Les fixtures sont explicitement synthétiques ; les clés générées localement
  restent hors Git. Les logs et captures ne divulguent pas ces clés.
- [ ] Les simulateurs et adaptateurs non implémentés sont identifiés et refusés
  là où une preuve réelle est exigée ; aucune réussite simulée présentée comme ZK.
- [ ] Invariants autorisation testés : action complète liée, refus avant effet,
  rejeu, concurrence, expiration/révocation pendant une attente, opération métier
  réservée indépendamment du nonce, réponse réseau ambiguë et réconciliation.
- [ ] Le statut local SQLite et les blocages H14/H17 sont visibles dans les guides
  cloud. Aucun « exactement une fois » distant non démontré.
- [ ] Procédure de signalement vérifiée dans `SECURITY.md` ; aucun contact ou délai
  de réponse inventé ; aucun audit externe annoncé sans rapport attribuable.

## Reproductibilité

- [ ] Commandes racine exigées par `AGENTS.md` exécutées pour le candidat ; les
  profils Horizon/Proofkit testés séparément selon leurs scripts disponibles.
- [ ] Versions et lockfiles conservés, tests négatifs mesurant les effets et pas
  seulement les exceptions ; résultats locaux séparés des résultats CI distante.
- [ ] Mesures historiques conservées avec leur périmètre ; aucune campagne
  longue relancée seulement pour afficher un succès. Toute nouvelle assertion
  de performance exige une nouvelle mesure justifiée.
- [ ] Manuscrit reconstruit et rendu inspecté ; liens, tableaux, bibliographie,
  tailles de preuve et limitations alignés sur les artefacts.
- [ ] Fondations IaC compilées/validées localement ; absence de test cloud indiquée.
- [ ] Manifest des artefacts, empreintes et exclusions vérifiés. Un éventuel
  `proofkit seal` lie des octets ; il ne certifie pas la vérité scientifique.

## Droits et assertions

- [ ] Licence du projet, licences transitives, notices, données et images revues
  pour la distribution exacte. `THIRD_PARTY_NOTICES.md` est un inventaire partiel,
  pas une attestation de conformité juridique ni un SBOM complet.
- [ ] Aucun DOI, partenaire, client, certification, économie ou résultat inventé.
- [ ] Registre `CLAIMS.md` aligné sur les textes publics ; exclusions explicites
  de nouveauté absolue, record Vega, post-quantique Horizon et qualification DORA.
- [ ] `CITATION.cff` correspond au logiciel ; métadonnées de version/date ajoutées
  seulement si une release réelle les justifie.
- [ ] Revue contradictoire du candidat effectuée et identifiée comme revue d'agent
  ou revue humaine. Les réserves H11/H13/H14/H15/H17 restent visibles.

## Décision finale distincte

Le rapport final indique séparément : candidat publiable comme expérience ;
autorisation effective de publication ; qualification pour une plateforme
critique. Les deux dernières ne résultent jamais mécaniquement des tests locaux.
Si l'utilisateur demande une action externe, présenter le candidat et ses
réserves concrètes avant l'étape finale, selon les autorisations de la session.
