# Fondation GCP expérimentale

Ce module Terraform décrit un VPC IPv4 sans route par défaut, deux sous-réseaux,
deux refus de trafic explicites et deux service accounts **sans rôles ni clés**.
Il ne crée ni projet, API activée, application, base, clé KMS, stockage, GPU,
connecteur, NAT ou endpoint public. Projet et région sont des entrées obligatoires.

Le module est volontairement inutilisable pour une application complète : les
services Google privés, DNS, ingress authentifié et trafic contrôleur/cible sont
à concevoir. Les politiques hiérarchiques et exceptions du plan de plateforme
ne sont pas inspectées. Aucune isolation GCP n'a été mesurée.

## Validation sans ressources cloud

Terraform 1.16.6 et provider Google 8.7.0 sont les versions de la validation locale.
L'installation initiale télécharge un provider public ; elle n'appelle aucune
API de création de ressource et n'exige pas d'identité cloud :

```sh
terraform -chdir=infra/gcp fmt -check
terraform -chdir=infra/gcp init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/gcp validate
```

Après installation, `validate` fonctionne hors ligne avec le provider local.
Pour une première installation intégralement hors ligne, fournir un miroir de
providers et sa configuration Terraform ; le binaire seul ne suffit pas.
Conserver `.terraform.lock.hcl`. Ne pas committer état, plan, variables de tenant
ou credentials. Les résultats se trouvent dans [le journal](../../docs/publication/VALIDATION.md).

Un `validate` réussi ne teste ni IAM hérité, API activée, quotas, région, coût,
création effective, connectivité ou restrictions d'organisation. Aucun `plan`
authentifié ni `apply` n'a été exécuté pour cette contribution.

## Conditions avant une expérimentation

Définir l'identité fédérée de déploiement avec restrictions d'émetteur, audience
et subject ; n'accorder aucun accès à tous les forks d'un dépôt. Séparer ensuite
les permissions des deux identités runtime. Direct VPC egress et ingress Cloud
Run sont des réglages distincts, absents du module. Le runtime devra recevoir une
vraie base transactionnelle distante et un protocole H14 avant toute revendication
multi-instance. Voir [la comparaison](../../docs/publication/CLOUD_COMPARISON.md).
