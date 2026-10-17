# HORIZON — état de l'art cryptographique

Revue des sources primaires du 17 octobre 2026. Les chiffres ci-dessous sont
publiés par leurs auteurs ; les exécutions locales sont consignées séparément
dans `EXPERIMENT_LOG.md`. HORIZON est une expérience d'intégration, pas une
nouvelle primitive ni une démonstration de supériorité générale sur Vega.

## 1. Ce qui existe déjà

[Vega](https://github.com/microsoft/vega-prover) fournit un système Rust de preuves
sur données signées, avec circuits SC et MC et préparation réutilisable. Son
README expose des benchmarks SHA-256 : `sha256_vega_sc` et
`sha256_vega_mc_zkp`. Ces benchmarks isolent le système de preuves ; ils ne
démontrent pas à eux seuls l'application mDL complète. L'ancienne URL
[spartan2](https://github.com/microsoft/spartan2) redirige actuellement vers
`vega-prover` : ce ne sont pas deux intégrations indépendantes à additionner.

Le [blog Microsoft du 21 mai 2026](https://www.microsoft.com/en-us/research/blog/vega-zero-knowledge-proofs-for-digital-identity-in-the-age-of-ai/)
présente une preuve d'âge sur credential existant, sans changement d'émetteur.
Le hachage SHA-256 est divisé en étapes identiques ; un circuit central vérifie
les signatures et le prédicat. Des lookups extraient les octets authentifiés,
vérifient préfixes et continuité, et sélectionnent le digest final sans exposer
la longueur exacte. La signature du dispositif lie une présentation à un nonce.
La phrase annonçant alors une future ouverture du code doit être lue à sa date,
car un dépôt public existe désormais. Aucun de ces mécanismes n'est une niche
inexistante que HORIZON pourrait revendiquer.

[Crescent](https://github.com/microsoft/crescent-credentials) propose déjà des
preuves de possession de JWT/mDL, divulgation sélective, bornes, liaison au
dispositif et présentations répétées. Son README décrit les phases
`zksetup`, `prove`, `show`, `verify`, et indique que le code n'a pas reçu un audit
de sécurité approfondi et ne doit pas être utilisé en production. Une séparation
préparation/présentation ne suffit donc pas à différencier HORIZON.

## 2. Relation exacte et construction de Vega

Le [contrat MC](https://microsoft.github.io/vega-prover/mc/overview.html) porte
sur `n` instances d'un même circuit d'étape et une instance d'un circuit central,
reliées par un witness partagé engagé. `n >= 2` est fixé au setup. Une instance
unique relève de SC. Le circuit métier appartient à l'application ; le moteur
ne prouve pas spontanément une règle métier, une signature ou la provenance
d'une donnée absente de ses contraintes.

La [forme R1CS](https://microsoft.github.io/vega-prover/building-blocks/r1cs.html)
est `(Az) ∘ (Bz) = Cz`. La variante relaxée ajoute un scalaire `u` et un vecteur
d'erreur engagé : `(Az) ∘ (Bz) = u Cz + E`. Les segments privés `shared`,
`precommitted`, `rest` permettent de séparer les valeurs connues avant la
session de celles déterminées après ses challenges. Les additions linéaires
sont peu coûteuses en contraintes ; les décompositions en bits et les fonctions
de hachage doivent réellement être contraintes.

| Brique | Fonction utile à Vega | Limite à conserver |
|---|---|---|
| [Spartan](https://eprint.iacr.org/2019/550) | Arguments R1CS via sum-check et engagements polynomiaux | La transparence du setup ne signifie pas absence d'hypothèses cryptographiques |
| [Nova](https://eprint.iacr.org/2021/370) | Réduction de plusieurs instances à une instance accumulée | Une opération de folding seule n'est pas une preuve finale vérifiée |
| [NeutronNova](https://microsoft.github.io/vega-prover/building-blocks/neutronnova.html) | Compression aléatoire des résidus des contraintes puis des instances d'étapes | Même forme d'étape, transcript et challenges exacts ; pas un simple checksum des résultats |
| [NovaBlindFold / HyperNova](https://eprint.iacr.org/2023/573) | Masquage d'une instance réelle par une instance aléatoire satisfaisante | Aléa neuf par preuve ; masquer un hash ne remplace pas cette construction |

Les deux foldings ont des fonctions distinctes : NeutronNova accumule les étapes,
Nova masque le petit circuit de vérification. Le lien « NeutronNova » du blog
renvoie au [papier Nebula](https://eprint.iacr.org/2024/1605), qui traite aussi
des preuves de machines et de mémoire. Pour reproduire l'implémentation MC,
utiliser le chapitre NeutronNova du livre et le commit effectivement compilé,
sans extrapoler les résultats EVM de Nebula à HORIZON.

L'[instanciation canonique](https://microsoft.github.io/vega-prover/building-blocks/fields-and-groups.html)
emploie T256, Hyrax et un transcript Fiat–Shamir Keccak256. Le corps scalaire
T256 coïncide avec le corps de base P256, ce qui facilite l'arithmétique de
signature P256. Il ne s'agit pas d'un cycle complet de deux courbes. Les
engagements reposent sur des opérations de groupe elliptique : **Vega n'est pas
un système entièrement fondé sur des hachages, ni un profil post-quantique**.

Le [modèle de sécurité](https://microsoft.github.io/vega-prover/overview/design-goals.html)
combine correction des arguments algébriques, liaison et masquage des
engagements, et transformation Fiat–Shamir de type oracle aléatoire. Le
vérifieur doit épingler la clé correspondant aux circuits voulus. Le livre
sépare explicitement ce moteur des choix de parsing et de signatures des
credentials. Cette revue n'est ni une preuve de sécurité de composition, ni
un audit indépendant de l'implémentation.

## 3. Prétraitement, coût en ligne et acceptation

Le [setup](https://microsoft.github.io/vega-prover/mc/setup.html) produit formes
des circuits, paramètres d'engagement et clé de vérification. Les générateurs
sont dérivés publiquement par hachage ; aucune cérémonie à secret toxique n'est
nécessaire. Le digest de la clé lie notamment circuits et nombre d'étapes au
transcript. « Sans trusted setup » ne signifie donc ni « aucun setup », ni
« aucune mémoire », ni « la clé fournie par le prover est acceptable ».

La [préparation](https://microsoft.github.io/vega-prover/mc/prep.html) produit un
état **privé du prover**, distinct d'une preuve et d'un cache de vérification.
Le code peut conserver des produits matrice-vecteur et vérifie les valeurs
publiques associées avant réutilisation. `prove` rerandomise les engagements,
conserve leur cohérence entre étapes et cœur, puis rend l'état réutilisable.
Un résultat d'autorisation mis en cache dans une gateway n'acquiert aucune de
ces propriétés par analogie.

Point d'intégration bloquant : selon le [contrat d'acceptation](https://microsoft.github.io/vega-prover/spec/scope.html),
`verify(vk, num_instances)` retourne les valeurs publiques ; l'application doit
les comparer aux valeurs attendues indépendamment. Accepter seulement `Ok`
permettrait d'accepter une preuve valide d'un autre énoncé. Les octets peuvent
différer entre deux preuves honnêtes ; ce test de différence ne démontre pas
à lui seul la propriété zéro connaissance.

Le [papier, §8 et figure 10, pages 14–15](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/05/Vega_Low-Latency-Zero-Knowledge-Proofs-over-Existing-Credentials.pdf)
mesure un MSO de 1920 octets sur Azure Standard F16as v7, 16 vCPU, 64 Go ; le
dispositif signataire est simulé. Valeurs publiées, en millisecondes :

| Mode | Threads | Setup | Préparation | Prove en ligne | Verify | Preuve / pk / vk (kB) |
|---|---:|---:|---:|---:|---:|---|
| SC | 1 | 726 | 351 | 325 | 127 | 91 / 6588 / 6587 |
| SC | 16 | 606 | 158 | 155 | 40 | idem |
| MC | 1 | 210 | 390 | 237 | 57 | 108 / 464 / 464 |
| MC | 16 | 51 | 65 | 92 | 23 | idem |

Les 92 ms excluent setup et préparation. Ce tableau n'est pas une mesure locale,
un résultat téléphone, ni un percentile de service réseau. Le PDF Microsoft de
mai peut différer de la [révision ePrint du 5 septembre 2026](https://eprint.iacr.org/2025/2094) ;
les résultats doivent conserver leur version. Nos benchmarks SHA publics ne
doivent pas être renommés « preuve d'âge complète ».

## 4. Bibliothèques pour une expérience spécialisée

[Bulletproofs](https://crypto.stanford.edu/bulletproofs/) vise notamment les preuves
de bornes sur valeurs engagées, sans setup de confiance. Il s'agit d'un choix
classique approprié à un petit prédicat arithmétique ; ni Bulletproofs ni les
engagements de Pedersen ne constituent une nouveauté HORIZON.

La [crate `bulletproofs` 5.0.0](https://docs.rs/crate/bulletproofs/5.0.0/source/Cargo.toml)
utilise `curve25519-dalek` 4.1.x, Merlin 3, et propose une API `RangeProof`
indépendante des circuits génériques. Le manifeste publié référence le dépôt
`zkcrypto/bulletproofs`. Épingler crate, dépendances et lockfile réellement
compilés, au lieu de déduire la compatibilité d'un ancien README.

L'[API RangeProof](https://docs.rs/bulletproofs/5.0.0/bulletproofs/struct.RangeProof.html)
permet de vérifier un ensemble ordonné d'engagements attendus. La
[source du vérifieur](https://docs.rs/bulletproofs/5.0.0/src/bulletproofs/range_proof/mod.rs.html)
accepte des tailles de plage 8, 16, 32 ou 64 bits. Charger une preuve n'est pas
la vérifier. Les générateurs, le nombre de valeurs, les tailles et le transcript
doivent être fixés par l'application, avec entrée bornée.

L'[API R1CS `yoloproofs`](https://github.com/zkcrypto/bulletproofs)
est explicitement expérimentale et déclarée impropre au déploiement par ses
auteurs. Le prototype HORIZON l'évite. Aucun audit indépendant de notre
composition n'est établi ici ; la publication d'une bibliothèque, d'un papier
ou d'un test positif ne remplace pas cet audit.

## 5. Décision de recherche

L'expérience retenue est une **admission de dossier de sinistre avec montant et
plafond engagés par deux autorités**, suivie d'un enregistrement simulé. Elle
compare preuve liée au challenge, preuve statique accompagnée d'une signature
fraîche du détenteur, et divulgation des mêmes faits attestés quand la politique
l'autorise. Le contrat formel et ses limites sont dans
[`CRYPTOGRAPHIC_DESIGN.md`](CRYPTOGRAPHIC_DESIGN.md).

Le compromis change le contrat d'émission : les autorités doivent produire des
engagements signés. Il ne remplace pas sans adaptation les documents signés
existants traités par Vega. La niche à valider est donc l'intégration opérationnelle
et la minimisation de données entre organisations, pas l'invention de preuves
privées, de précomputation ou d'autorisation par challenge.

Une comparaison admissible garde les mêmes faits, signatures, bornes, contexte,
contrôles de fraîcheur et conditions de cache. Comparer une RangeProof seule à
Vega mDL complet ou au guest RISC Zero DevSecOps ne donne **aucun ratio de
supériorité**. Une préférence de bibliothèque reste provisoire tant que les
mesures locales, tests adverses et besoins d'émetteurs ne sont pas établis.
