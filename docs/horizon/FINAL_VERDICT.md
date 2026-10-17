# Verdict Horizon — 17 octobre 2026

**GO pour un laboratoire reproductible. NO-GO pour un produit bancaire ou
assurantiel qualifié. Aucun record face à Microsoft Vega n'est établi.**

Le programme livre une bibliothèque de preuves réelles, CLI, API, application
web, contrôleur durable, déploiement local et dossier de décision. Il montre
une optimisation de notre propre implémentation. Il ne démontre ni marché
inexistant, ni demande solvable, ni supériorité à la meilleure référence connue
sur une relation équivalente. Les recherches et essais négatifs sont conservés.

## 1. Ce qui n'était pas évident au départ

Le besoin de prouver une petite inégalité n'impose pas une zkVM généraliste.
Il peut se représenter par deux engagements signés et une preuve de plages,
**si les autorités acceptent un nouveau contrat d'émission**. Déplacer la
vérification des signatures hors du circuit est une modification des hypothèses
et divulgations ; ce n'est pas une accélération gratuite d'un credential Vega.

Le temps cryptographique n'est pas le temps d'autorisation durable. Après
optimisation, une vérification complète B a un p95 de 1,247 ms dans le banc
Linux ; le parcours Windows avec IPC, deux transactions synchrones et cible
SQLite atteint 13,014 ms au p95. Le stockage et la frontière opérationnelle
empêchent de convertir le premier chiffre en promesse de service.

## 2. Propriété mathématique et optimisation

Pour des engagements standard `A=aG+r_aH` et `C=cG+r_cH`, une RangeProof
2×32 sur `A−G` et `C−A` démontre `1≤a≤2^32` et `0≤c−a<2^32`, sous les
hypothèses et bornes de [FORMAL_STATEMENT](FORMAL_STATEMENT.md). Les signatures
publiques lient les points aux autorités, unités et dossier. Les montants ne
sont pas révélés au contrôleur, mais les présentations sont corrélables.

La préparation de générateurs publics fixes via `OnceLock` retire leur dérivation
répétée du chemin chaud. Les paramètres, relation, signatures et transcripts
restent identiques ; une preuve antérieure est toujours acceptée. B réutilise
la preuve immuable tout en signant chaque challenge : cela apporte une autorisation
fraîche par la clé du détenteur sur preuve historique, pas une connaissance fraîche du witness.
Ces techniques sont connues ; aucune primitive nouvelle n'est revendiquée.

## 3. Preuves expérimentales

| Mesure | Observation |
| --- | --- |
| Horizon A, génération p95, avant → après | 7,770 → 6,546 ms |
| Horizon B, vérification complète p95, avant → après | 2,266 → 1,247 ms |
| Présentation B (dont signature), p95 après préparation | 0,065 ms ; pas une nouvelle preuve ZK |
| Preuve de plage | 672 octets, hors enveloppe et signatures |
| Baseline non-ZK, vérification p95 | 0,245 ms ; montants et ouvertures divulgués |
| IPC + vérification + autorisation durable Windows | p95 13,014 ms ; p99 15,126 ms ; maximum 180,310 ms |
| Corruptions algébriques canoniques re-signées | 500 refus avant + 500 après ; aucune acceptation observée |
| Tests | 14 Rust historiques + 9 Rust Horizon ; 25 Node historiques + 18 Horizon |

Les deux campagnes crypto utilisent 500 mesures, 30 échauffements et cinq cas.
La campagne durable utilise 500 mesures, 30 échauffements, une preuve préparée
et 530 cibles SQLite indépendantes. Les IC p50/p95/p99 sont calculés sous
hypothèse IID **non établie** ; les résultats restent ceux d'une machine.
[Rapport structuré, bruts et empreintes](BENCHMARK_RESULTS.json),
[méthode](BENCHMARK_METHODOLOGY.md), [journal](EXPERIMENT_LOG.md).

Les attaques testées couvrent signatures/preuves, omission, substitution,
downgrade de confidentialité, contexte/tenant, deux nonces concurrents,
révocation, expiration, recul d'horloge, changement de politique, worker absent,
sortie de processus après réservation et résultat ambigu. Les refus testés
avant effet observent zéro mutation. La réconciliation d'un effet déjà produit
ne redispatche pas. Cela ne mesure pas la probabilité cryptographique de soundness.

Le déploiement Compose génère une preuve réelle via HTTP et enregistre une seule
autorisation synthétique. Après redémarrage, rejeu et nouveau challenge restent
refusés. Un conteneur neuf sans réseau, montage ni witness vérifie la fixture
publique. La cible est un registre de démonstration, jamais un paiement.

## 4. Référence réellement dépassée

**Notre implémentation précédente**, à relation et format inchangés : réduction
observée du p95 de 15,75 % pour A et de 44,97 % pour la vérification B.
Le gain porte sur la réutilisation de paramètres publics. Il n'établit aucun
record externe ni résultat général sur une autre machine.

Les benches publics Vega SHA-256 SC/MC ont été exécutés sur le même environnement
Linux. Le cas MC 2 Kio estime preuve 65,836 ms et vérification 19,885 ms, hors
préparation. La relation complète de présentation credential correspondant aux
92/23 ms publiés n'est pas fournie par ces benches. Elle n'a pas été reproduite.
Comparer ces nombres à nos plages comme un classement serait trompeur.
Voir [comparaison des références](COMPETITOR_COMPARISON.md).

## 5. Problème métier visé

Un assureur délégant pourrait vouloir contrôler qu'un montant admissible reste
sous un plafond par dossier, attestés par deux rôles distincts, sans partager ces
valeurs avec un contrôleur. Le démonstrateur enregistre une autorisation liée
au dossier, à la politique et au challenge. Il ne contrôle pas un budget cumulé,
des provisions ou la légitimité d'un paiement.

Les processus de délégation et contrôles multiacteurs sont documentés ; les
solutions DCA/FCP, attestations et preuves de prédicats sont des antériorités.
**Aucun entretien, acheteur engagé, prix, gain opérationnel ou ROI n'a été
vérifié**. La matrice de cinq domaines et les critères d'abandon sont dans
[MARKET_DISCOVERY](MARKET_DISCOVERY.md), les antériorités dans
[NOVELTY_AND_PRIOR_ART](NOVELTY_AND_PRIOR_ART.md).

## 6. Pourquoi ne pas choisir plus simple

Il faut souvent choisir plus simple. La baseline signée divulguée est moins
coûteuse. Un verdict signé suffit si un tiers accepté peut calculer la règle.
La divulgation sélective suffit si le besoin se réduit à révéler des attributs.

Le profil privé n'est justifié que si les deux valeurs doivent rester cachées
au contrôleur, qu'aucun tiers accepté ne peut signer le verdict et que les
autorités peuvent émettre les engagements adaptés. Si les sources refusent
même de partager leurs witnesses avec le prover, ce design ne répond pas au
besoin : une approche MPC ou un autre protocole doit être évalué.

## 7. Garanties impossibles à revendiquer maintenant

Pas de vérité garantie des faits signés, d'anonymat, de résistance post-quantique,
de preuve fraîche de connaissance dans B, d'isolation contre l'administrateur,
de confidentialité contre canaux auxiliaires, d'atomicité sur une API financière
distante, de disponibilité en crise ou de durabilité testée sous panne matérielle.
Pas de conformité automatique DORA/RGPD/AI Act ni d'audit cryptographique externe.
Pas de performance GPU, coût énergétique/monétaire complet ou pic RSS total.

La cible de 10 ms pour le parcours durable mesuré est **réfutée sur ce banc**.
Les seuils crypto seuls sont satisfaits empiriquement sur une relation plus
étroite. Ils ne satisfont pas le critère de victoire scientifique demandé.
Le backend RISC Zero historique reste distinct du chemin MCP de production.

## 8. Coût et chemin d'industrialisation

Le coût cryptographique local est petit par rapport aux travaux encore ouverts :
émission qualifiée, intégration de deux autorités, politique contractuelle,
gestion de clés/révocations, protocole de reprise avec la cible, IAM, audit,
sauvegardes et qualification de confidentialité. Aucun budget fiable ne peut
être déduit de ces microbenchmarks. [BUSINESS_CASE](BUSINESS_CASE.md) fournit
le modèle de coût et ses données manquantes, sans montant de marché inventé.

Priorité : **H11 validation client**, **H13 provenance** et **H15 audit**, puis
**H14 cible distante/reprise**, **H17 exploitation**, **H16 coût complet**.
H12 traite séparément la comparaison Vega équivalente. Ne pas développer de
connecteur financier ou nouvelle primitive avant ces validations.

## Décision sur les critères d'acceptation

| Critère | État |
| --- | --- |
| Références Microsoft reproduites ou limites documentées | SHA-256 reproduit ; limite credential explicite |
| Besoin précis avec sources et valeur économique | Processus sourcé, hypothèse précise ; valeur économique non validée |
| Faiblesse réelle de l'état de l'art traitée | Faisabilité privée montrée ; supériorité/nécessité commerciale non établies |
| Relation formalisée, preuve réelle, vérification indépendante | Établi dans le périmètre synthétique |
| Tests adverses et alternative non-ZK | Exécutés ; couverture et limites publiées |
| Performances reproductibles | Bruts, locks, commandes, source et IC conservés ; une machine |
| Sandbox utilisable, documentation et CI | Livrés et testés localement ; aucune production |
| Dossier technique/commercial | Livré, avec verdict négatif sur record et qualification produit |

Le programme n'est donc **pas déclaré terminé avec succès au sens d'un produit
validé ou d'une percée contre Vega**. Les expériences accessibles dans cette
exécution aboutissent à un POC vérifiable ; les étapes bloquées par le manque
de relation de référence complète, d'autorités réelles et de données économiques
sont consignées dans les [tickets H11–H17](../../issues/horizon/NEXT_EXPERIMENTS.md).
