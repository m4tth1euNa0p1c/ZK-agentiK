# H11 — Revue de nécessité et protocole de qualification

Version du dossier : **17 octobre 2026**. Baseline technique : `684b567`.
Statut : **PRÉPARÉ, AUCUN ENTRETIEN CLIENT EXÉCUTÉ**.
Ce protocole rend la décision H11 vérifiable. Il ne transforme pas une revue
d'agents, une démonstration synthétique ou l'intérêt d'un interlocuteur en
validation commerciale. [Inventaire vérifié](INVENTORY_2026-10-17.md),
[ticket H11](../../issues/horizon/NEXT_EXPERIMENTS.md),
[modèle économique](BUSINESS_CASE.md).

## Décision recherchée

Identifier un contrôle réel où le destinataire doit vérifier `0 < a <= c`,
ne peut pas recevoir les deux valeurs et n'accepte pas de déléguer ce calcul
à un signataire. Un acteur autorisé doit néanmoins pouvoir réunir les deux
valeurs et ouvertures pour produire la preuve Horizon actuelle.

Le profil implémenté est plus étroit que l'inégalité seule : **entiers en
centimes EUR**, `1 <= a <= 2^32` et `0 <= c - a < 2^32`, donc
`c <= 2^33 - 1`. Le responsable métier doit confirmer ces unités et bornes,
pas seulement le principe `a <= c`. [Relation exacte](FORMAL_STATEMENT.md).

L'expérience est réfutée pour ce cas d'usage si une alternative acceptée
rend le même service à moindre coût, si le prover ne peut pas réunir les
secrets, ou si le contrôle réellement demandé porte sur un budget cumulé.
Le plafond par dossier, le montant admissible et le droit de paiement sont
trois notions à distinguer. La preuve ne décide pas de la réalité du sinistre.

## Participants et pièces minimales

Rechercher, dans une revue organisée par le porteur du projet, les responsabilités
suivantes : propriétaire du contrôle métier, représentant des sources,
évaluateur sécurité/confidentialité et responsable du budget expérimental.
Plusieurs rôles peuvent appartenir à la même organisation ; un avis sécurité
distinct de celui de l'auteur du prototype doit être consigné. Ces personnes
ne sont ni identifiées ni contactées par ce dossier.

Utiliser un schéma de processus anonymisé, une règle écrite, les catégories de
données et des statistiques agrégées dont le partage est autorisé. Aucun
dossier client, identifiant personnel, clé privée ou ouverture réelle n'est
nécessaire pour cette revue. Conserver les entretiens et pièces commerciales
dans l'espace approuvé par leurs propriétaires ; seule une synthèse autorisée
et dépourvue de données sensibles peut être ajoutée au dépôt.

## Déroulé proposé, 60 minutes

| Durée indicative | Travail | Trace attendue |
| --- | --- | --- |
| 0–15 min | Décrire un contrôle qui pose effectivement problème avant de présenter le produit | Opération, acteurs, règle, fréquence, cas de blocage, preuve de provenance de ces observations |
| 15–25 min | Répartir les droits d'accès aux valeurs, au verdict et aux métadonnées | Matrice de confiance et motif précis de chaque interdiction |
| 25–35 min | Examiner les alternatives et le système existant | Alternative admissible la moins coûteuse ; justification de chaque rejet |
| 35–45 min | Exécuter la démonstration synthétique et un refus | Sorties de commandes, commit, compteur d'effets, limites observées |
| 45–55 min | Estimer émission, intégration, exploitation et traitement des exceptions | Entrées sourcées du modèle économique et inconnues |
| 55–60 min | Décider séparément métier et sécurité | CONTINUER, RÉORIENTER ou INCONCLUSIF ; objections conservées |

Une durée de réunion n'est pas une taille d'échantillon. Un entretien peut
réfuter une hypothèse ; il ne permet pas d'estimer un marché ni un ROI.

## Questions qui peuvent invalider le profil

1. Quelle décision est bloquée aujourd'hui ? Quel exemple de processus,
   expurgé et daté, le montre ? Faire décrire le même contrôle par les
   organisations émettrice et destinataire. Qui porte le risque du refus et de
   l'acceptation ? Un avis d'expert ne remplace pas ces deux confirmations.
2. Pourquoi le contrôleur ne peut-il pas connaître `a`, `c` ou l'un des deux ?
   Distinguer contrainte documentée, préférence et hypothèse non vérifiée.
3. Qui peut connaître **les deux** valeurs et leurs ouvertures, y compris
   opérateurs du prover et accès aux sauvegardes ? Puisque cet acteur existe
   dans Horizon, pourquoi son verdict signé ne serait-il pas
   accepté ? Distinguer confiance dans l'accès aux données et confiance dans
   la justesse du calcul. Une réponse absente laisse la nécessité ZK inconnue.
4. Qui établit le montant et le plafond ? Ces sources calculeront-elles leurs
   engagements depuis leurs données validées, avec unité, dossier, version,
   rôle, échéance et révocation ? Qui finance ce changement d'émission ?
5. Le contrôle est-il un plafond par dossier ou un budget consommable partagé ?
   Y a-t-il franchises, devises, arrondis, corrections et cumuls ? Un besoin
   absent de la relation actuelle impose un nouveau statement avant tout pilote.
   Exemple synthétique à soumettre : deux dossiers de 80 avec plafond 100
   satisfont chacun la relation ; un plafond cumulé de 100 serait dépassé.
   C'est une question de portée de la règle, pas une attaque de Bulletproofs.
6. Quelles métadonnées peuvent être vues et corrélées ? L'accès du prover aux
   secrets, la corrélation des preuves et l'absence de résistance post-quantique
   sont-ils compatibles avec les exigences écrites ?
7. Quelle est l'action exacte autorisée ? Qui détient les credentials, gère
   `UNKNOWN`, confirme l'état cible et décide d'une exception en crise ? La
   démo SQLite ne répond pas encore pour une API financière distante.
8. Le décideur peut-il nommer un sponsor et un budget de test, mesurer le coût
   actuel et impliquer les émetteurs ? Un intérêt oral n'est pas un engagement.

## Comparaison à service et confiance explicites

Fixer avant l'essai la même règle, les mêmes sources, l'action, les préconditions
de fraîcheur, le régime de révocation et les droits d'accès acceptables. Ne
retirer ni anti-rejeu ni persistance de la baseline pour favoriser Horizon.
Les mécanismes qui ne satisfont pas les exigences doivent être écartés avec
une raison documentée, et non classés sur leur seule vitesse.

| Variante | Question décisive | État dans le dépôt |
| --- | --- | --- |
| Système existant / contrôle déterministe avec données accessibles | Résout-il déjà le problème au coût admis ? | À observer chez le participant |
| Attestations signées + valeurs divulguées | Le contrôleur peut-il recevoir les valeurs et refaire le calcul ? | Baseline crypto exécutée ; pas un pilote métier |
| Verdict signé lié à l'action, par exemple enveloppé DSSE | Une partie qui connaît les valeurs est-elle acceptée pour signer le résultat ? | Alternative analysée ; chemin complet de verdict signé **non implémenté ni benchmarké** |
| Credentials / divulgation sélective / preuve de prédicat existante | L'émission existante couvre-t-elle la règle et les droits requis ? | Recherche documentaire ; qualification comparative non exécutée |
| Horizon A/B | Faut-il vérifier la relation sans valeurs ni tiers accepté pour le calcul ? | Preuves réelles et firewall sur données synthétiques |
| MPC ou autre architecture | Les sources interdisent-elles de réunir les secrets chez le prover ? | Hors prototype actuel ; nouveau chantier à arbitrer |

Un accord pour expérimenter Horizon exige une objection vérifiable à la
meilleure alternative admise. La baseline divulguée plus rapide ne suffit
pas à justifier le profil privé ; le verdict signé peut lui aussi cacher
les montants au contrôleur, avec une hypothèse de confiance différente.

## Démonstration reproductible à montrer

Prérequis et versions : [DEPLOYMENT](DEPLOYMENT.md). Depuis la racine, avec
dépendances installées, utiliser un scénario frais créé par la démo :

```sh
git rev-parse HEAD
npm run horizon:build
node scripts/horizon-fixture.mjs verify
npm run test:horizon
npm run horizon:demo
```

La fixture vérifie une présentation publique avec son temps historique ; elle
n'autorise aucune opération actuelle. La démo crée un nouveau répertoire
temporaire, utilise des ports loopback libres et conserve ses artefacts locaux.
Ne pas les publier : ils contiennent aussi la configuration privée synthétique.
Le résumé terminal ne contient ni witness ni clé privée.

| Observation à consigner | Valeur attendue et portée |
| --- | --- |
| Vérification de fixture | `public_fixture_verified: true`, `live_authorization: false` |
| Type de preuve de la démo | `real Bulletproofs + Ed25519`, sources synthétiques |
| Présentation altérée, divulgation forcée, rejeu | Refus ; dans cette démo l'altération vise la signature du détenteur |
| Effets non autorisés / autorisés | `unauthorized_effects: 0`, `authorized_effects: 1` sur la nouvelle cible locale |
| Reprise et concurrence | Les tests Horizon doivent réussir ; vérifier le compteur d'effets, pas seulement le message d'erreur |

Les altérations algébriques de la preuve de plage sont couvertes par les tests Rust et les
campagnes décrites dans [SECURITY_REVIEW](SECURITY_REVIEW.md) ; ne pas présenter
l'altération de signature de la démo comme une nouvelle attaque de la preuve.
L'application persistante et la vérification isolée en conteneur sont décrites
dans [DEPLOYMENT](DEPLOYMENT.md). Une base déjà consommée ou des attestations
expirées doivent rester refusées ; ne pas les effacer pour obtenir un succès.

La présentation des performances doit rappeler : 672 octets pour la preuve
seule ; vérification crypto Linux p95 1,247 ms ; parcours durable Windows
p95 13,014 ms et maximum 180,310 ms. Ces mesures ne sont pas une promesse sur
le système du participant. Aucun classement global face à Vega n'est établi.

## Mesures économiques à recueillir

Pour chaque variable, noter unité, période, population, source, propriétaire,
plage d'incertitude et méthode. Une valeur inconnue reste inconnue, jamais zéro.

- Dossiers réellement éligibles, fréquence des blocages et part exigeant la
  non-divulgation ; ne pas prendre tous les sinistres comme marché adressable.
- Minutes de travail et délais actuels, tâches qui disparaîtraient effectivement,
  coût horaire complet et traitement des refus/contestations.
- Coût initial de chaque source, de la cible et du contrôle ; répartition entre
  organisations et financement accepté de ces changements.
- Coûts récurrents d'émission, correction, révocation, calcul, stockage, IAM/KMS,
  audit, support, réconciliation et continuité d'activité.
- Coût de la meilleure alternative admissible sur le même périmètre. Les pertes
  évitées restent nulles dans une projection prudente sans causalité documentée.

Appliquer le modèle de [BUSINESS_CASE](BUSINESS_CASE.md) avec scénarios bas,
central et haut sourcés. Préenregistrer avec le sponsor les seuils économiques
et opérationnels avant de mesurer le pilote. Aucun seuil monétaire ni ROI
universel n'est déduit du microbenchmark.

## Portes de décision, sans moyenne compensatoire

| Porte | Éléments requis pour continuer | Si absent ou négatif |
| --- | --- | --- |
| G1 — Contrôle réel | Responsable, règle, périmètre, bornes/unités du profil et exemple de problème confirmés par les organisations émettrice et destinataire | INCONCLUSIF si inconnus ; RÉORIENTER si aucun problème |
| G2 — Confidentialité | Matrice d'accès motivée, accès du prover autorisé, fuites acceptables pour l'essai | INCONCLUSIF si inconnus ; RÉORIENTER si incompatibles |
| G3 — Alternatives | Examen du verdict signé et des solutions existantes, raison vérifiable de leur insuffisance | INCONCLUSIF si non évaluées ; RÉORIENTER si une solution simple suffit |
| G4 — Sources | Responsables d'émission identifiés, faisabilité et responsabilité acceptées pour un test | INCONCLUSIF sans preuve ; RÉORIENTER en cas de refus |
| G5 — Valeur | Coût actuel documenté, coût incrémental estimé, sponsor et budget de test explicites | INCONCLUSIF tant que non mesurés ; RÉORIENTER si valeur insuffisante |
| G6 — Sécurité du pilote | Avis distinct, périmètre synthétique, critères d'arrêt et travaux H13/H15 écrits | Bloquer le pilote en cas de défaut non traité |

**CONTINUER H11** exige toutes les portes justifiées. Cela autorise seulement
la proposition d'un pilote borné ; H13/H15 et les autorisations de ce pilote
restent nécessaires. H14/H17 sont requis avant tout effet distant réel.
Un résultat inconnu bloque une conclusion positive ; il ne réfute pas à lui
seul le besoin. Les objections non résolues restent visibles.
Une alternative signée admissible réfute une nécessité cryptographique de ZK ;
la décision économique exige encore une comparaison complète des coûts.
Même toutes les portes satisfaites étayent seulement ce cas pour un pilote,
sans établir un achat, un marché ou la nécessité universelle de ZK.

## Fiche de résultat à remplir après une revue réelle

```text
Identifiant de revue : NON ATTRIBUÉ
Date / commit démontré : NON RENSEIGNÉS
Statut : NON EXÉCUTÉ
Rôles présents et mandats (identifiants non nominatifs) : NON RENSEIGNÉS
Références des pièces autorisées / lieu de conservation : AUCUNE
Règle et action métier précises : NON CONFIRMÉES
Qui voit a / c / les deux / les métadonnées : NON CONFIRMÉ
Motif de rejet ou d'acceptation du verdict signé : NON ÉVALUÉ
Engagement des émetteurs / sponsor / budget : AUCUN ÉTABLI
G1 : INCONNU ; G2 : INCONNU ; G3 : INCONNU
G4 : INCONNU ; G5 : INCONNU ; G6 : INCONNU
Commandes, sorties publiques et compteur d'effets : NON EXÉCUTÉS EN REVUE
Hypothèses réfutées / défauts / objections : À CONSIGNER
Décision métier : INCONCLUSIF
Décision sécurité : INCONCLUSIF
Prochaine expérience, responsable, critères d'arrêt : NON DÉFINIS
Autorisation de partager une synthèse : NON ÉTABLIE
```

Le dossier actuel fournit les éléments techniques à examiner. Il ne remplit
aucun champ client par inférence et ne déclenche aucun contact externe.

## Vérification de la préparation, 17 octobre 2026

Les commandes du parcours technique ont été rejouées pendant la rédaction :
23 tests Rust et 43 tests Node réussis, formatage et Clippy des deux workspaces,
TypeScript strict, schéma et compilation du guest nu réussis. La fixture publique
est vérifiée sans autorisation actuelle. La démo produit une preuve réelle,
zéro effet non autorisé et une seule admission synthétique. Les données de
benchmark historiques sont conservées ; aucune nouvelle mesure de performance
n'est déduite des durées de ces tests.

Une relecture contradictoire par agent a imposé la comparaison au verdict signé,
la visibilité du prover et de ses opérateurs, les bornes/unités exactes et le
cas du plafond cumulé. Cette vérification prépare la séance ; elle ne constitue
ni un entretien métier, ni un avis humain indépendant, ni un audit externe.
