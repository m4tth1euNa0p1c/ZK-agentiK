# Comparaison à périmètres déclarés

Date : 17 octobre 2026. Les mesures complètes et IC sont dans
[BENCHMARK_RESULTS.json](BENCHMARK_RESULTS.json). Les liens scientifiques et
limites cryptographiques sont développés dans [STATE_OF_THE_ART](STATE_OF_THE_ART.md).

## Références réellement exécutées

| Expérience | Preuve / présentation | Vérification | Taille | Ce que cela couvre |
| --- | ---: | ---: | ---: | --- |
| Vega MC SHA-256 1 Kio, 8 threads | 52,656 ms | 20,548 ms | 86 933 octets | Estimations centrales Criterion, preuve SHA amont |
| Vega MC SHA-256 2 Kio, 8 threads | 65,836 ms | 19,885 ms | 96 583 octets | Préparation exclue de la colonne preuve |
| Vega SC SHA-256 1 Kio, 8 threads | 93,260 ms | 28,214 ms | 85 948 octets | Relation SHA simple circuit |
| Vega SC SHA-256 2 Kio, 8 threads | 231,090 ms | 74,444 ms | 94 572 octets | Même bench amont, taille différente |
| Horizon A après optimisation, 1 thread | p95 6,546 ms | p95 1,228 ms | 672 octets | Relation de deux plages, signatures hors preuve |
| Horizon B après préparation, 1 thread | p95 0,065 ms | p95 1,247 ms | 672 octets | Signature fraîche sur preuve historique, vérification complète |
| Baseline divulgation signée | p95 0,160 ms | p95 0,245 ms | Pas de preuve ZK | Valeurs et ouvertures divulguées |
| Horizon B + IPC + contrôleur durable Windows | Présentation exclue | p95 13,014 ms | Enveloppe JSON complète | Vérification et effet SQLite ; sans HTTP/réseau |

**Ces lignes ne constituent pas un classement global.** Les relations, divulgations,
phases et environnements ne sont pas tous équivalents. Les tailles de preuve ne
sont pas des tailles de message : les enveloppes et leurs quantiles sont publiés
séparément. Vega et les fonctions cryptographiques Horizon ont tourné dans le
même environnement Linux 8 CPU / 12 GiB ; le banc durable est Windows/Node.

Le papier Vega annonce 92 ms / 23 ms / 108 kB pour son application de présentation
de credentials, avec préparation séparée et une machine Azure particulière.
Le dépôt public épinglé fournit des benches SHA-256, pas ce circuit complet.
La reproduction de **ces chiffres applicatifs reste bloquée par la relation
non fournie**, et non par un échec mathématique démontré de Vega.
Sources : [papier, §8](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/05/Vega_Low-Latency-Zero-Knowledge-Proofs-over-Existing-Credentials.pdf),
[code épinglé](https://github.com/microsoft/vega-prover/tree/c0ee259053cd12eaf43ed71b5cde375452b3ee4d).

Le benchmark RISC Zero historique a été conservé et ses receipts revérifiés.
Sa relation DevSecOps et ses signatures dans le guest diffèrent de cette relation
de plages. Aucun facteur d'accélération par rapport aux 154–163 secondes n'est
scientifiquement justifié sans implémenter une relation strictement commune.

## Alternatives qui peuvent gagner

| Alternative | Quand la préférer | Ce qui manque pour ce profil exact |
| --- | --- | --- |
| Verdict signé / DSSE | Un tiers accepté peut évaluer les données | Confiance dans ce calcul et sa divulgation au tiers |
| Divulgation signée + règle native | Le contrôleur peut connaître les deux valeurs | Aucune confidentialité de ces valeurs |
| BBS / selective disclosure | Il suffit de révéler des attributs signés choisis | L'inégalité entre attributs cachés demande un mécanisme complémentaire |
| AnonCreds / preuves de prédicats | Format et modèle d'émission compatibles | Comparer le même prédicat multiautorité, la liaison à l'action et les coûts d'intégration |
| Vega / circuit credential | Credentials existants, signatures cachées et présentation privée | Comparaison de relation complète encore à effectuer |
| RISC Zero / SP1 / zkVM | Politique complexe, réutilisation de code déterministe | Coût de VM et signatures dans la relation à mesurer sur une même tâche |
| MPC | Les sources ne peuvent partager leurs witnesses même avec un prover | Coordination, disponibilité et protocole multipartite à qualifier |
| TEE | Hypothèse de confiance matérielle acceptée et faible latence requise | Attestation, patching, rollback et canaux auxiliaires |

Les sources primaires de chaque famille sont dans les dossiers d'état de l'art
et d'antériorité. Les solutions Lloyd's DCA/FCP et BIS Mandala empêchent de
présenter contrôle délégué, prévalidation ou preuve de conformité comme un
territoire sans concurrents. Le problème commercial reste à qualifier.

## Avantage mesuré et limite de nouveauté

La seule amélioration contrôlée à relation et format inchangés est la conservation
des générateurs publics dans notre bibliothèque : p95 preuve A réduit de 15,75 %,
p95 vérification B réduit de 44,97 % dans ces deux campagnes. La preuve publique
antérieure est toujours vérifiée. La dérivation de points publics fixes est
retirée du chemin chaud ; aucun verdict, witness ou source de hasard n'est caché.
C'est une optimisation connue appliquée ici, **pas une invention cryptographique**.

La baseline non-ZK est moins coûteuse. Elle gagne si la divulgation est permise.
Le profil privé devient utile seulement si le contrôleur ne doit connaître ni
montant ni plafond, et si les autorités acceptent les engagements signés adaptés.
Cette contrainte n'a pas encore été validée auprès d'un acheteur.
