# Horizon — méthode de comparaison et critères de décision

Date : 17 octobre 2026. Ce protocole fixe les conditions d'une comparaison
avant d'en lire les résultats. Les commandes, versions et mesures effectives
appartiennent au [journal d'expériences](EXPERIMENT_LOG.md). Il complète le
[contrat de sécurité](SECURITY_REVIEW.md) et ne remplace aucun contrôle négatif.

## 1. Figer ce qui est comparé

Chaque rapport identifie `relation_id`, profil de divulgation, action, racines
de confiance, type de signature, backend/version, paramètres de preuve,
bornes entières, encodages et contrôles hors preuve. Deux temps ne sont
comparables comme accélération que si ces dimensions sont équivalentes.

| Expérience | Relation / portée | Comparaison autorisée |
| --- | --- | --- |
| RISC Zero historique | Politique DevSecOps complète et attestation Ed25519 de fixture dans le guest | Référence historique de cette relation seulement |
| Vega amont | Circuit précis du bench exécuté ; SHA-256 si bench SHA-256 | Reproduction du même circuit, taille et phases |
| A : plages + attestations adaptées | Deux signatures publiques, jointure et preuve `1<=a<=2^32`, `0<=c-a<2^32`, contexte frais | B/C avec même relation d'admission et divulgations déclarées |
| B : preuve immuable + signature fraîche | Même inégalité, preuve préalable entière et autorisation du détenteur liée au bundle et au contexte | A avec hypothèses de réutilisation et limites de corrélation visibles |
| C : sélection serveur | Chemin choisi par la politique, toujours identifié dans le rapport | Coût par chemin et fréquence ; pas une moyenne masquant les garanties |
| Ouvertures + vérification native | Même règle mais montants divulgués au vérifieur | Baseline de coût avec changement de confidentialité explicite |
| Verdict signé par tiers | Le vérifieur fait confiance au calcul du tiers | Substitut métier, pas preuve ZK équivalente |

Vega annonce des mesures de présentation de credentials ; les benches SHA-256
publiés ne suffisent pas à reproduire cette application. Le cycle
`setup / prep_prove / prove / verify` doit rester visible. Sources primaires :
[publication Vega](https://www.microsoft.com/en-us/research/publication/vega-low-latency-zero-knowledge-proofs-over-existing-credentials/),
[cycle de preuve](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/overview/lifecycle.md).

**Interdiction de publier « X fois plus rapide que RISC Zero »** à partir
du bench A/B et du rapport DevSecOps historique : primitives, formats,
relation, signatures dans/hors preuve et divulgations diffèrent. Le même
interdit vaut pour « Vega mDL reproduit » après un test SHA ou cubique.

## 2. Mesures séparées et frontières de chronométrage

Les horloges de durée sont monotones. L'horloge civile est conservée pour
identifier les runs et tester la fraîcheur, sans servir au chronométrage.

| Mesure | Inclus | Exclu ou publié séparément |
| --- | --- | --- |
| Build / installation | Résolution figée, compilation et outils nécessaires | Jamais présenté comme preuve en ligne |
| Setup | Générateurs, paramètres et clés dépendant de la relation | Création des credentials |
| Émission adaptée | Engagements, signature des autorités, validations d'ouverture | Proving du détenteur |
| Préparation par credential | Travail dépendant du witness réutilisable | Setup et signature fraîche |
| Première présentation | Préparation non disponible, preuve et liaisons | Préciser l'inclusion du lancement processus |
| Présentation réutilisée | Rerandomisation/proof en ligne, ou signature fraîche B | Coût initial conservé dans une autre colonne |
| Vérification froide | Démarrage, chargement/décodage, contrôles natifs et preuve complète | Installation/compilation |
| Vérification chaude complète | Même chemin d'acceptation sans lancement processus | Cache de verdict interdit dans cette catégorie |
| Hit du cache B | Recherche bornée, signature fraîche, recontrôles courants | Preuve initiale amortie identifiée ; ne pas appeler cela vérification ZK complète |
| Autorisation avant effet | Parse, signatures, preuve/cache, confiance courante, horloge, réserve durable et préconditions | Collecte/réseau et cible mesurés distinctement si absents |
| Résultat cible | Dispatch, latence cible, observation/réconciliation | Ne prouve pas la sécurité du logiciel cible |

Le benchmark de fonction et le benchmark de processus sont deux expériences.
L'IPC, JSON/Base64, stockage et fsync ne disparaissent pas d'une mesure annoncée
« avant effet ». Si un composant est simulé, cette propriété figure dans le
nom et les exclusions du run. Aucun credential privé réel dans les rapports.

## 3. Préparation, cache et coût total

Pour B, conserver séparément `initial_full_verify_ms`, `fresh_holder_sign_ms`,
`cache_hit_authorize_ms` et `cache_miss_authorize_ms`. Rejouer sans cache doit
réussir par vérification complète ; le gain ne doit pas dépendre d'un
cache prérempli par des données non authentifiées.

Publier les coûts mesurés pour une première utilisation et, si l'usage le
permet, pour 2, 5, 10 et 100 réutilisations. Le coût total de la série est :

```text
setup + émission + préparation + somme(présentations + vérifications)
+ coûts d'invalidation/régénération effectivement survenus.
```

L'amortissement suppose des attestations immuables encore valides. Il faut
exécuter des séries où changent détenteur, source, engagement, version,
politique, expiration et révocation. Noter si le changement exige une nouvelle
preuve, une nouvelle préparation ou seulement un contrôle courant. Ne pas
inventer un taux de réutilisation ni un taux de hit pour conclure à l'économie.

Une signature fraîche sur preuve historique n'est pas un temps de génération
d'une preuve ZK fraîche. Une preuve générée après effet n'entre jamais dans
la catégorie autorisation ZK avant effet.

## 4. Corpus et essais de refus

Fixer un corpus synthétique avant mesure : cas nominal, égalité `a=c`, borne
basse `a=1`, borne haute `a=2^32`, différence maximale `2^32-1`, puis cas
refusés. Inclure plusieurs dossiers et montants de même relation, pas seulement
100 répétitions d'un unique bundle déjà chargé. Les échantillons d'une même
preuve chaude sont signalés comme répétitions conditionnelles.

Classes de refus chronométrées séparément :

1. Structure invalide ou entrée trop grande : mesure du parseur/limiteur.
2. Mauvaise signature, rôle, jointure ou contexte : mesure native.
3. Preuve structurellement valide mais corrompue : le vérifieur cryptographique
   doit être effectivement appelé ; garder la raison et l'étape du refus.
4. Inégalité fausse avec attestations valides : refus relationnel, sans compter
   une panne du harness comme réussite.
5. Preuve et signatures valides mais politique/révocation/date courantes
   invalides : refus de l'autorisation, y compris sur cache hit.
6. Concurrence, rejeu, crash et résultat `UNKNOWN` : nombre d'effets et état
   durable, pas seulement durée d'une réponse HTTP.

Ne pas confondre la génération impossible d'une preuve pour un faux witness
avec la vérification d'une preuve falsifiée fournie par un adversaire. Les
deux essais sont utiles mais attestent des chemins différents.

## 5. Plan d'échantillonnage et statistiques

Chaque commande publie son nombre d'échauffements et le nombre prévu de
mesures avant lancement. Les durées individuelles sont conservées dans
l'ordre d'exécution, avec les échecs et timeouts. Aucun échantillon lent
n'est retiré silencieusement. Si un incident invalide un run, garder le run
et sa raison puis exécuter une nouvelle série identifiée.

Pour les expériences rapides, viser 30 échauffements et 500 mesures par
catégorie sur plusieurs fixtures, sous réserve du budget décidé. Une preuve
lourde peut être limitée à quelques exécutions : publier alors tous les
échantillons et qualifier le résultat d'exploratoire. Un petit N n'est pas
compensé par davantage de décimales ou par un p99 calculé sur trois preuves.

Publier `N`, minimum, moyenne, médiane, p95, p99 empiriques, maximum et échecs. Pour ce
protocole, un quantile empirique de rang supérieur prend après tri l'indice
zéro-basé `ceil(p * N) - 1`, borné à `[0, N-1]`. Si le runner utilise une
autre convention, il doit la publier et les quantiles doivent être recalculés
avant regroupement. La convention historique RISC Zero n'est pas modifiée
rétroactivement pour améliorer un résultat.

Le module [`scripts/horizon-stats.mjs`](../../scripts/horizon-stats.mjs)
conserve tous les échantillons et calcule des intervalles de confiance de
quantiles par statistiques d'ordre, avec couverture d'au moins 95 %
**sous l'hypothèse IID**. Cette hypothèse n'est pas établie par le module ;
les répétitions chaudes d'une fixture ne deviennent pas automatiquement un
échantillon IID représentatif du service. Les intervalles restent conditionnels
et exploratoires lorsque le plan de mesure ne justifie pas cette hypothèse.

Pour `B ~ Binomial(N,p)`, on choisit le plus grand `L` tel que
`P(B<L)<=0,025` et le plus petit `U` tel que `P(B>=U)<=0,025`.
L'intervalle est `[X_(L), X_(U)]`, avec `X_(0)=-infini` et
`X_(N+1)=+infini`. Les masses aux quantiles rendent la couverture conservative.
Le JSON encode une borne infinie par `null` et un indicateur explicite ;
il ne la remplace pas par le minimum ou maximum observé. À `N=500`, le
p99 utilise les rangs 490 et 500 ; avec 300 échantillons sa borne supérieure
reste infinie selon cette convention à deux queues. Les probabilités sont
calculées en double précision et ne constituent pas des bornes numériques
certifiées. Le test indépendant des petits corpus compare les rangs à une
somme binomiale directe ; aucun bootstrap ne sert à inventer une queue finie.

Les quantiles observés décrivent cette campagne. Ils ne sont pas un SLA
universel ni une estimation robuste de la queue d'un service à partir d'une
fixture. Une comparaison A/B utilise le même environnement et des ordres de
passage alternés/randomisés enregistrés, pour limiter biais thermique/cache.
La concurrence constitue une campagne distincte avec débit, files, erreurs,
mémoire et latences ; accélérer un travail avec plus de threads ne démontre
pas un meilleur débit sous charge.

Si un budget de temps est testé, publier le nombre et la fraction de
dépassements ainsi que le maximum. « Aucune violation observée » ne signifie
pas « toujours sous le seuil ». Le seuil de 5 ms du simulateur historique
ne devient pas automatiquement le seuil métier d'Horizon.

## 6. Ressources et taille

Pour chaque run conserver : commit du dépôt et des dépendances, lockfiles,
toolchain, flags CPU, mode release, OS, CPU, threads, accélérateur, fréquence
ou mode d'alimentation connu, conteneur/image et limites cgroup, mémoire
physique disponible, paramètres backend et identités de preuve.

Mesurer le pic mémoire dans un processus/cgroup remis à zéro pour le run.
Une limite Docker de 12 GiB n'est pas un pic mesuré ; le maximum cumulé d'un
conteneur ayant aussi compilé n'est pas le pic du prover. Compter les
sous-processus et distinguer RAM, cache disque, état préparé et cache de
vérification. OOM et refus d'allocation restent des résultats d'échec.

Publier séparément octets de preuve, engagements, signatures, paramètres,
journal/statement, bundle binaire et message JSON/Base64. Un cache peut
réduire le transfert sur hit ; son état conservé et le transfert initial
restent dans le coût total. Aucune comparaison 108 kB/108 KiB sans unités.

## 7. Vérification indépendante et reproductibilité

Un processus séparé vérifie le bundle avec seulement les éléments publics,
la configuration de confiance et les attentes qu'il a émises. Le test sans
réseau et sans witness est obligatoire pour le profil privé ; il démontre
une indépendance d'interface, pas à lui seul la sécurité ZK.

Les fixtures synthétiques permettent une reproduction sans credentials
externes. Les autorités de test et leurs clés publiques/privées sont décrites
comme telles. Les assertions de provenance réelle ou d'acceptation d'un
assureur restent absentes tant qu'elles ne sont pas établies séparément.

Le rapport de chaque expérience contient : commande exacte, heures de début
et fin, code de sortie, stdout/stderr utiles sans secrets, empreinte des
entrées et artefacts publics, étapes couvertes et non couvertes, résultats
bruts, statistiques et conclusion bornée. Un benchmark upstream exécuté
sans changement demeure une reproduction, pas une nouvelle invention.

## 8. Critères d'arrêt

- **Sécurité** : arrêt de la variante si un refus attendu donne un effet,
  si une liaison signée manque, si le cache conserve une autorisation expirée,
  ou si un changement de mode divulgue les données sans politique explicite.
- **Comparabilité** : retirer le ratio si la relation, les garanties ou le
  contrat d'émission diffèrent ; publier les mesures descriptives séparément.
- **Performance** : hypothèse de délai rejetée si le chemin complet requis
  dépasse le budget fixé ; aucune réduction de la relation pour sauver le chiffre.
- **Confidentialité** : rejet du profil si ses sorties/artefacts exposent les
  montants malgré l'engagement annoncé. La corrélation publique admise n'est
  jamais rebaptisée unlinkability.
- **Produit** : aucune décision commerciale positive à partir de latences
  seules. Comparer coût d'intégration/émission, exploitation, revue humaine et
  alternatives signées sur un dossier commun à deux organisations.

Le verdict final peut être « preuve faisable mais inutile économiquement »,
« variante B acceptable sous hypothèses explicites » ou « toutes variantes
rejetées ». Il n'est pas nécessaire de déclarer un gagnant si les preuves
recueillies ne justifient pas ce choix.
