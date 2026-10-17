# Fondation Azure expérimentale

`main.bicep` décrit un VNet, deux sous-réseaux, deux NSG avec refus explicite
entrant/sortant et deux identités managées **sans attribution RBAC**. Il ne crée
ni application, clé, secret, base, compte de stockage, GPU, endpoint public, NAT
ou abonnement. Le groupe de ressources cible doit déjà exister.

Ces sous-réseaux ne constituent pas un environnement Container Apps : délégation,
dimensionnement, DNS, règles de plan de contrôle et accès privés restent à
concevoir selon le runtime retenu. Les exceptions de trafic de plateforme et les
politiques héritées demandent une vérification dans le tenant. Aucun test réseau
Azure n'a été exécuté ; « refus explicite » décrit le fichier, pas une isolation
observée d'un service déployé.

## Validation locale

Avec Bicep 0.48.1 installé, sans connexion Azure ni création de ressource :

```powershell
$compiled = Join-Path $env:TEMP 'proofkit-azure-template.json'
bicep build infra/azure/main.bicep --outfile $compiled
bicep lint infra/azure/main.bicep
```

Le compilateur utilise ses types embarqués ; aucune référence à un module
distant n'est présente. Le résultat compilé n'est pas un déploiement validé par
Azure. La compilation ne vérifie ni quota, région, conflit CIDR, droits, prix ou
contraintes d'organisation. Voir [le journal local](../../docs/publication/VALIDATION.md).

## Étapes avant une expérimentation cloud

Choisir région, tenant, runtime et limites de dépense. Préparer une identité de
déploiement fédérée avec émetteur/audience/subject restrictifs ; les identités
runtime restent séparées. Écrire les règles minimales et tester les refus depuis
le prover et le contrôleur. Le contrôle de mutation ne doit jamais être attribué
au prover. Ces étapes ne sont pas implémentées dans ce squelette.

Le profil Horizon Ed25519 n'est pas interchangeable avec les courbes listées
par Azure Key Vault. Aucun adaptateur de signature cloud n'est fourni. Lire
[la comparaison et les sources](../../docs/publication/CLOUD_COMPARISON.md)
avant de choisir un algorithme ou d'ajouter une application.
