# Azure et GCP : plans d'expérience, pas offre de production

État du dossier : **17 octobre 2026**. Les sources ci-dessous ont été consultées
à cette date. Elles décrivent des capacités fournisseur, pas des tests exécutés
sur ZK-agentiK. Aucune ressource cloud n'a été créée pour ce dossier.

## Décision proposée

Conserver le laboratoire local pour les mesures actuelles. Préparer deux
fondations réseau/identité à comparer ; choisir le cloud avec l'utilisateur
après clarification des régions, achats existants, résidence des données et
contraintes de clés. Le SDK `@zk-agentik/proofkit-sdk` expose des adaptateurs de
confiance ; il ne génère pas automatiquement un circuit sûr ni un protocole
distribué durable.

**H14 et H17 bloquent la qualification multi-instance.** Le contrôleur Horizon
et sa cible SQLite locale partagent actuellement leur transaction. Placer cette
application dans un conteneur cloud ne préserve pas cette propriété pour une
cible distante. PostgreSQL est un candidat pour l'état partagé ; il ne rend pas
atomique un effet dans une autre API. Il faut un contrat d'idempotence, une
précondition de version, une interrogation de statut et des essais de crash.

## Capacités et décisions non prises

| Frontière | Azure | GCP | Travail restant |
| --- | --- | --- | --- |
| Identité runtime | Identités managées distinctes pour prover et contrôleur [A1] | Service accounts distincts attachés au runtime [G1] | Permissions minimales et preuves de refus réels |
| Identité de déploiement | Fédération Entra [A2] | Workload Identity Federation [G2] | Restreindre émetteur, audience et subject au projet/ref autorisé ; aucune clé durable de CI |
| Conteneurs privés | Environnement Container Apps interne, réseau personnalisé [A3] | Cloud Run avec ingress authentifié choisi séparément du Direct VPC egress [G3] | Tester DNS, ingress, egress, accès APIs et dépendances de plateforme |
| Clés du profil actuel | La table Key Vault ne liste pas Ed25519 [A4] | `EC_SIGN_ED25519` est listé en protection **software**, PureEdDSA sur message brut ; absent de la table HSM consultée [G4] | Aucun adaptateur KMS exécuté ; ne pas présenter l'un ou l'autre comme un HSM compatible prêt |
| État partagé | PostgreSQL Flexible Server HA et accès privés possibles [A5,A6] | Cloud SQL PostgreSQL HA [G5] | Schéma de réservation, isolation, migration, reprise et H14 à implémenter |
| Archives | Blob immuable avec politiques de rétention [A7] | Cloud Storage Bucket Lock [G6] | Durée contractuelle, minimisation des données, export et restauration ; aucun verrou activé |
| GPU | Offre serverless documentée [A8] | GPU Cloud Run documenté [G7] | Régions, quota, modèle et gain à vérifier sur la relation exécutée ; aucun GPU prévu par défaut |

Une identité managée réduit la distribution de secrets ; elle ne valide pas les
faits attestés. Les permissions d'identité peuvent être mises en cache : la
révocation applicative et son `trust_epoch` ne doivent pas être assimilés à une
révocation IAM instantanée [A1].

Les key stores ne sont pas interchangeables. Un choix Azure impose soit un
service de signature compatible dont la frontière sera examinée, soit un profil
de signature différent, versionné et revu. Le support GCP logiciel permet
d'envisager un adaptateur Ed25519, sous réserve d'un test des octets signés,
formats publics, limites, rotation, latence et indisponibilité. Il ne répond pas
à une exigence HSM sur la seule base de cette documentation [A4,G4].

Le système de fichiers inscriptible de Cloud Run est lié à l'instance et ne
constitue pas un store durable partagé [G8]. De même, monter un volume sur une
instance Container Apps ne démontre pas la coordination de deux contrôleurs :
cette dernière conclusion est notre analyse du protocole, pas une garantie fournisseur.

## Deux plans techniques falsifiables

### Plan Azure

Fondation fournie : [Bicep](../../infra/azure/main.bicep), VNet, deux sous-réseaux,
NSG avec refus explicites, deux identités sans RBAC. Compiler et lint localement.
Ce n'est pas un environnement Container Apps prêt à exécuter : les délégations,
règles de plateforme et endpoints restent absents. Aucun coût de runtime n'est
engagé par la compilation.

Expérience suivante, après choix et autorisation du périmètre cloud : runtime
privé avec image par digest ; contrôleur seul habilité à appeler une cible
sandbox ; PostgreSQL privé ; secrets et signature choisis après H13. Démontrer
refus inter-tenant, refus de sortie du prover vers la cible, puis deux contrôleurs
concurrents et panne aux transitions H14. La restauration doit conserver les
opérations terminales et ne jamais libérer une opération `UNKNOWN` sans preuve
de son état cible.

### Plan GCP

Fondation fournie : [Terraform](../../infra/gcp/main.tf), VPC sans route par
défaut, sous-réseaux IPv4, refus de trafic et deux service accounts sans rôles.
Provider verrouillé ; aucune API activée. Les comptes ne possèdent aucune clé
exportable créée par le module. Le trafic aux APIs privées reste à concevoir.

Expérience suivante : séparer identité de déploiement et runtime ; Cloud Run avec
ingress défini explicitement, routage egress `all-traffic` et règles minimales ;
base distante transactionnelle ; cible sandbox indépendante. Un routage egress
VPC ne rend pas l'ingress privé et `private-ranges-only` ne contrôle pas tout le
trafic sortant [G3]. Exécuter les mêmes scénarios H14 que sur Azure, puis mesurer
les latences froides, les reprises et le comportement à la perte du KMS.

Dans les deux plans, privilégier la mesure CPU du petit circuit Horizon. Un
GPU peut concerner un autre profil, notamment une zkVM générale ; ce n'est pas
une optimisation démontrée de la relation Bulletproofs actuelle.

## Coût paramétré, sans montant inventé

Comparer une **même charge** et un **même niveau de disponibilité**. Aucune
facture, devise, région ni volume de production n'a été validé. Les tarifs sont
à extraire au moment du chiffrage des pages officielles [A9,G9] et des services
annexes retenus. Le coût complet reste inconnu, conformément à H16.

```text
C_mois = CPU_actif + RAM_active + éventuel_minimum_inactif
       + base_primaire + réplica_HA + stockage + sauvegardes
       + réseau_sortant + endpoints/connectivité + requêtes_KMS
       + logs_ingérés + logs/archives_conservés + registre_images
       + observabilité + support + coût_opérationnel_mesuré
```

Pour chaque terme conserver unité, quantité, prix, devise, région, date, source,
taxes et remise éventuelle. Séparer coût de préparation d'une preuve, coût d'une
présentation B réutilisée et coût d'une autorisation complète. Les délais réseau,
cold starts, refus, reprises et appels KMS ne figurent pas dans les mesures
cryptographiques CPU actuelles. Ne pas extrapoler 1,247 ms en prix d'une
transaction cloud. Le GPU est une ligne distincte, à zéro ressource prévue
tant qu'aucun bénéfice n'a été établi.

## Archivage et conformité

Les verrous de rétention ont des conséquences irréversibles : après verrouillage,
les politiques documentées ne peuvent plus être supprimées ou raccourcies
[A7,G6]. Rien de tel n'est activé dans les squelettes. La durée ne doit pas être
déduite du seul mot « banque » ; elle relève du périmètre réel de conservation.
Un stockage immuable préserve des octets. Il ne prouve pas la vérité de leur
contenu, l'exhaustivité d'un audit, l'heure d'un événement ou une conformité DORA.

## Sources primaires et portée

Toutes consultées le 17 octobre 2026. Confiance élevée pour l'existence des
fonctionnalités décrites ; disponibilité dans un tenant/région, coût et aptitude
au projet **non vérifiés expérimentalement**. Les pages peuvent changer.

- [A1 — Identités managées Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/managed-identity)
- [A2 — Fédération d'identité Entra](https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation)
- [A3 — Réseau Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/networking)
- [A4 — Types et algorithmes Key Vault](https://learn.microsoft.com/en-us/azure/key-vault/keys/about-keys)
- [A5 — PostgreSQL Flexible Server HA](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-high-availability)
- [A6 — PostgreSQL Private Link](https://learn.microsoft.com/en-us/azure/postgresql/flexible-server/concepts-networking-private-link)
- [A7 — Blob immuable](https://learn.microsoft.com/en-us/azure/storage/blobs/immutable-storage-overview)
- [A8 — GPU Container Apps](https://learn.microsoft.com/en-us/azure/container-apps/gpu-serverless-overview)
- [A9 — Tarification Container Apps](https://azure.microsoft.com/en-us/pricing/details/container-apps/)
- [G1 — Identité des services Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/service-identity)
- [G2 — Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation)
- [G3 — Direct VPC egress](https://docs.cloud.google.com/run/docs/configuring/vpc-direct-vpc)
- [G4 — Algorithmes Cloud KMS, par niveau de protection](https://docs.cloud.google.com/kms/docs/algorithms)
- [G5 — Cloud SQL PostgreSQL HA](https://docs.cloud.google.com/sql/docs/postgres/high-availability)
- [G6 — Bucket Lock](https://docs.cloud.google.com/storage/docs/bucket-lock)
- [G7 — GPU Cloud Run](https://docs.cloud.google.com/run/docs/configuring/services/gpu)
- [G8 — Contrat du conteneur Cloud Run](https://docs.cloud.google.com/run/docs/container-contract)
- [G9 — Tarification Cloud Run](https://cloud.google.com/run/pricing)
