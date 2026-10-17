---
name: cloud-proof-infrastructure
description: Concevoir et vérifier les fondations Azure ou GCP de ZK-agentiK avec identités séparées, clés compatibles, réseau privé, persistance et coûts explicites, sans présenter le laboratoire SQLite comme un service distribué qualifié.
---

# Frontières cloud et preuves

Lire `docs/03-ARCHITECTURE.md`, `docs/publication/CLOUD_COMPARISON.md`,
`issues/horizon/NEXT_EXPERIMENTS.md` et le README du fournisseur dans `infra/`.
Les squelettes actuels créent seulement des réseaux fermés et des identités sans
permission. Une validation locale ne démontre ni déploiement ni isolation réelle.

## Procédure

1. Identifier région, organisation, exigences de résidence, charge, RPO/RTO,
   budget et propriétaire des données. Marquer les réponses absentes comme
   hypothèses ; ne pas inventer une obligation réglementaire.
2. Dessiner séparément identité du déploiement, du prover, du contrôleur et de la
   cible. L'agent/prover n'obtient jamais les credentials de mutation.
3. Vérifier la documentation primaire actuelle pour chaque algorithme et niveau
   de protection KMS. Ed25519 logiciel disponible ne signifie pas HSM disponible.
   Un changement d'algorithme exige un profil versionné et une revue du protocole.
4. Décrire ingress, egress, DNS, accès aux API cloud et plan de contrôle. Un
   endpoint privé ne suffit pas à interdire l'egress ; un NSG vide n'est pas
   nécessairement fermé. Vérifier les règles implicites et priorités.
5. Exiger H14 pour un effet distant : réservation durable, identifiant métier,
   précondition cible, idempotence et réconciliation après ACK perdu. PostgreSQL
   seul ne rend pas atomique un appel API distant. Refuser SQLite local comme
   preuve de reprise multi-instance Cloud Run ou Container Apps.
6. Chiffrer avec tarifs datés et hypothèses : CPU/RAM actifs et inactifs, minima,
   stockage, HA, sauvegardes, réseau, logs, KMS et support. Aucun GPU par défaut
   sans mesure d'un gain sur la relation effectivement exécutée.

## Validation et livraison

Compiler Bicep ou exécuter `terraform fmt -check` et `terraform validate` après
installation des providers verrouillés. Ne pas confondre cette validation avec
un `plan` authentifié ou un test cloud. Conserver les versions et empreintes.
Présenter les dépendances absentes et les expériences de panne nécessaires.
Toute application, API activée ou ressource payante doit rester dans le périmètre
autorisé de la session ; aucune n'est nécessaire pour la validation locale.
Ne pas verrouiller une rétention irréversible pour une simple démonstration.

Faire relire les frontières avec `.agents/roles/cloud-boundary-reviewer.md` quand
une revue distincte est demandée ; ne pas annoncer une certification bancaire.
