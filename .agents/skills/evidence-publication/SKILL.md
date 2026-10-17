---
name: evidence-publication
description: Préparer une publication auditable de ZK-agentiK, vérifier les assertions et artefacts publics, les licences et la reproductibilité sans confondre préparation, publication et qualification de production.
---

# Préparer une publication fondée sur des preuves

Lire `docs/publication/RELEASE_CHECKLIST.md`, `docs/publication/CLAIMS.md`,
`SECURITY.md` et `THIRD_PARTY_NOTICES.md`. Identifier le commit candidat exact.
Préserver les changements de l'utilisateur, notamment les fichiers non suivis.

## Vérifier le contenu candidat

1. Inventorier les fichiers suivis et le diff ; ne pas limiter la recherche de
   secrets au dernier diff. Distinguer fixtures publiques, clés privées générées,
   données de tiers, journaux et captures. Ne pas afficher les secrets trouvés.
2. Vérifier les commandes réellement disponibles dans `package.json` et les
   manifests Cargo. Consigner les commandes exécutées, versions, codes de sortie
   et limites. Ne pas réécrire un résultat historique comme un résultat courant.
3. Associer toute revendication de sécurité ou performance à son entrée dans
   `docs/publication/CLAIMS.md`. Une empreinte garantit l'identité des octets,
   pas leur vérité, leur date, ni une revue externe.
4. Vérifier les licences directes et transitives, les notices, les images et
   données incluses. Le résumé des notices n'est ni un SBOM complet ni un avis
   de liberté d'exploitation. Conserver les textes exigés dans la distribution.
5. Contrôler les liens locaux, métadonnées de citation et instructions de reprise.
   Signaler clairement le statut laboratoire, les adaptateurs non implémentés
   et les frontières de confiance ouvertes.

## Résultat attendu

Produire une liste de contrôles avec trois états : vérifié, non vérifié,
bloquant. Chaque état vérifié cite un artefact ou une commande et sa date.
Préparer un candidat reviewable avant toute demande liée à une publication.
Ne pas changer la visibilité du dépôt, publier de package ou créer une release
sans que cette action soit comprise dans l'autorisation de la session.
La simple préparation du candidat ne requiert pas une permission supplémentaire.

Une revue contradictoire peut utiliser `.agents/roles/release-reviewer.md`.
Ne pas transformer l'accord d'un agent en audit de sécurité ou avis juridique.
