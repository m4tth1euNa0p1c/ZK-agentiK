# HORIZON — dossier économique conditionnel

État : **17 octobre 2026**. **Aucun prospect, financement client, engagement
d'achat ou gain économique n'est acquis.** La décision actuelle finance
uniquement du temps de laboratoire dans le dépôt ; elle ne démontre pas
l'existence d'un marché. Le scénario retenu et les alternatives sont documentés
dans [la découverte métier](MARKET_DISCOVERY.md) et
[les antériorités](NOVELTY_AND_PRIOR_ART.md).

## 1. Travail proposé au client hypothétique

Un destinataire d'autorisation de sinistre pourrait vérifier qu'un montant
admissible attesté ne dépasse pas un plafond de délégation attesté, sans
recevoir ces deux montants. Il lui faudrait accepter les autorités,
le format d'émission, la relation calculée et les contrôles d'actualité.
L'essai actuel enregistre uniquement `record_claim_authorization` sur une
cible synthétique. Il ne se connecte pas à un rail de paiement.

Le problème commercial n'est pas « avoir besoin de ZK ». Il serait un dossier
réel où la décision est bloquée ou coûteuse parce que le destinataire exige
un calcul vérifiable et ne peut recevoir les valeurs, tandis qu'une autre
partie autorisée peut produire la preuve. Ce dossier n'a pas été observé.
Si toutes les parties peuvent recevoir les pièces, ou acceptent le verdict
d'un signataire de confiance, la baseline simple peut gagner.

## 2. Éléments économiques réellement consultés

Le communiqué conjoint LMA/LIMOSS/Vitesse du **24 novembre 2025** annonce un
renouvellement d'au moins trois ans du service FCP. Il indique que tous les
managing agents disposent d'un accès et que plus de 700 binders sont alors
actifs. Il évoque 2,3 milliards de dollars immobilisés en loss funds et un
potentiel de réduction allant jusqu'à 80 %. Ce sont des chiffres et objectifs
des opérateurs, pas une évaluation indépendante ni des gains attribuables
à HORIZON. [Communiqué, pages 1–2](https://limoss.london/content/uploads/2025/11/FCP-Contract-Renewal-Press-Release-24-Nov-2025.pdf).

La conséquence utile est l'existence d'une infrastructure et d'acteurs déjà
organisés : l'entrée commerciale devrait montrer une valeur marginale sur un
contrôle manquant. Le stock de loss funds n'est ni notre marché adressable,
ni une économie récupérable par une preuve de bornes. Un volume de sinistres
ou de paiements ne devient pas automatiquement un revenu logiciel.

Les [reporting standards Lloyd's](https://www.lloyds.com/market-resources/delegated-authorities/market-knowledge/reporting-standards)
définissent des données de reporting pour coverholders et gestionnaires
délégués. Ils montrent un effort de standardisation existant, pas l'existence
de signatures cryptographiques exploitables ni un droit de soustraire les
pièces au contrôle. La documentation [DDM](https://limoss.london/ddm) présente
normalisation, validation et contrôle d'accès : leur réutilisation doit être
évaluée avant de proposer une infrastructure concurrente.

Le coût de revue par dossier, le taux d'erreur, la fréquence des conflits de
confidentialité, la valeur du délai et le budget disponible sont **inconnus**.
Aucun chiffre de retour sur investissement, de taille de marché ou de tarif
n'est extrapolé. Les assertions d'économie non récupérées dans leur document
primaire ne sont pas retenues.

## 3. Qui déciderait, qui paierait, qui supporterait le coût

| Partie hypothétique | Rôle à confirmer | Coût ou objection à instruire |
|---|---|---|
| Managing agent / assureur délégant | Propriétaire du contrôle et possible sponsor | Acceptation des autorités, audit des règles, budget et responsabilité |
| Gestionnaire délégué de sinistres | Prépare la demande et peut détenir le witness | Changement de workflow, détention des secrets, coût de génération |
| Expert ou source du montant admissible | Émet une attestation métier | Format signé supplémentaire, correction et révocation, responsabilité |
| Opérateur d'admission / paiement | Vérifie et réserve l'opération | Disponibilité, reprise, intégration à la cible, support des refus |
| Audit, sécurité et juridique | Évaluent les pièces et les droits | Preuves à conserver, accès en litige, fuite par requêtes et gestion des clés |

Ces rôles ne sont pas des personnes contactées. Le payeur logiciel n'est pas
forcément celui qui produit les attestations. Une offre qui économise une
minute chez le destinataire mais impose un coût supérieur aux émetteurs peut
échouer même si la preuve est rapide.

## 4. Modèle de valeur sans chiffres inventés

Calculer d'abord le coût incrémental face à la meilleure alternative admise,
sur le même périmètre, puis mesurer :

```text
gain_annuel_observable =
    dossiers_eligibles * minutes_de_revue_evitees / 60 * cout_horaire_complet
  + pertes_evitees_documentees
  - cout_annuel_integration_amortie
  - cout_annuel_emission_et_normalisation
  - cout_annuel_generation_verification_stockage
  - cout_annuel_exploitation_audit_et_reconciliation
```

Toutes ces entrées sont actuellement inconnues. Le terme de pertes évitées
reste nul dans une projection prudente tant qu'un lien causal documenté ne
permet pas de l'estimer. Les frais de contrôle existants qui demeurent après
intégration ne sont pas comptés comme économies. Une preuve mathématiquement
valide ne supprime ni les contestations du sinistre ni les travaux d'audit.

Les coûts de génération doivent inclure préparation, collecte, émission,
réseau et tentatives rejetées pour une comparaison de service. Les
microbenchmarks peuvent isoler ces étapes, à condition d'en publier les
frontières. Un percentile à chaud sur une seule preuve ne mesure pas un SLA
de bout en bout ; trois générations ne qualifient pas la capacité de crise.
[Limites effectivement constatées sur le banc antérieur](../08-RISC0-LAB-RESULTS.md).

## 5. Expérience permettant de réfuter la proposition

Le laboratoire doit comparer des solutions qui rendent réellement le service
accepté, sans dégrader silencieusement la confidentialité :

| Variante | Mesure utile | Question commerciale qui reste ouverte |
|---|---|---|
| Ouvertures publiques et attestations signées | Temps de contrôle, taille, données effectivement reçues | Le destinataire peut-il légalement et contractuellement recevoir ces valeurs ? |
| Verdict signé de type DSSE | Temps et coût d'une attestation liée à l'action | Une autorité est-elle acceptée pour calculer le verdict ? |
| Ranges spécialisés sur engagements signés | Coût de preuve/vérification, émission adaptée, tests négatifs | Le bénéfice de non-divulgation justifie-t-il le changement d'émission ? |
| Preuve de faits immuables réutilisée + autorisation fraîche | Amortissement et comportement lors des révocations | Les faits restent-ils valides assez longtemps pour être réutilisés ? |

Les credentials BBS/AnonCreds/Dock, MPC et TEE sont des solutions de comparaison
documentaires à qualifier si le besoin le justifie. Leur lecture n'est pas
une expérience exécutée ; leur performance n'est pas inventée dans ce dossier.
La sélection d'une variante relève d'une politique du destinataire fixée
avant la demande, jamais d'un choix opportuniste de l'agent en cas d'échec.

Les essais synthétiques peuvent réfuter une liaison, une borne, une mesure
de coût ou la résistance à une panne. Ils ne mesurent ni volonté d'achat,
ni réduction des revues humaines, ni disponibilité juridique des données.
Le [journal du laboratoire](EXPERIMENT_LOG.md) doit conserver les résultats,
y compris les échecs, sans transformer une accélération locale en gain client.

## 6. Crise et confidentialité : conditions concrètes

En charge inhabituelle ou lors d'une révocation d'autorité, une demande doit
rester bloquée si la preuve complète, l'actualité de la confiance ou l'état
de l'opération ne peuvent être vérifiés. L'absence de réponse après dispatch
ne permet pas un second dispatch. Ces exigences portent sur l'admission et
la persistance, pas sur une propriété exclusive à ZK.

La disponibilité des fonds, la solvabilité, la reprise d'un rail de paiement
et la continuité de l'expertise ne sont pas couvertes par la preuve proposée.
Une voie d'exception humaine éventuelle serait une politique séparée avec
sa propre autorité, jamais un fallback silencieux après preuve invalide.
Le laboratoire ne constitue aucune homologation d'un tel processus.

Les valeurs privées ne doivent pas apparaître dans logs, rapports d'erreur ou
artefacts remis au vérifieur. Les engagements publics, identités d'autorités,
relation d'ordre, bornes du profil et réponses successives divulguent encore
de l'information.
Il faut définir qui peut interroger, combien de fois et pour quel usage.
L'accès du prover aux valeurs reste explicite ; une interdiction de réunion
du witness impose une autre architecture.

## 7. Portes de décision et abandon

| Porte | Preuve requise | État actuel |
|---|---|---|
| Contrôle métier | Propriétaire identifié, règle et portée écrites | Règle synthétique ; aucun propriétaire client |
| Confidentialité nécessaire | Champs interdits au destinataire et fondement concret | Hypothèse non confirmée |
| Sources utilisables | Deux autorités acceptant de signer les engagements et leurs métadonnées | Fixtures seulement |
| Baseline insuffisante | DSSE, ouverture, credentials ou service existant évalués par le décideur | Comparaisons à réaliser/qualifier |
| Sécurité et coût technique | Tests négatifs, reprise et mesures représentatives | Essais de laboratoire exécutés ; pas de qualification production |
| Valeur économique | Coût actuel observé, coût complet cible, sponsor et budget | Inconnus ; aucun financement prospect |

Abandonner ou réorienter le produit si une des trois premières portes est
refusée, si une alternative acceptée satisfait le contrôle à moindre coût,
ou si la valeur mesurée ne couvre pas l'intégration et l'exploitation.
Conserver éventuellement les résultats comme contribution technique ouverte.

**Conclusion du comité : GO recherche bornée, NO-GO lancement commercial.**
Le prochain fait décisif pour le marché serait un contrôle client documenté
et un besoin de non-divulgation démontré. Une preuve plus rapide, à elle seule,
ne fournit ni ce besoin ni un acheteur.
