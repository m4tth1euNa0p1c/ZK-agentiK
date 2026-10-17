# Revue interne de la campagne corrélée

Date : **17 octobre 2026**. Base observée :
`5cf0ee2be456e299a7f7a830d1ac4d907cf85421`, branche
`feat/correlated-circuit-validation`, avec modifications non commitées en cours.
Les conclusions concernent les sources effectivement lues à cette passe, pas
toute modification ultérieure ou une version distribuée non identifiée.
Une lecture complémentaire du code fixé dans
`e7fc348cc953566fc44b5cdf74e5ebf381cfd205` a contrôlé l'alignement final des IDs et
catégories Rust sur `[a-z0-9-]{1,64}`. Le validateur distinct des noms de tests
conserve `_`, nécessaire aux familles adverses, et reste appelé uniquement sur
ces noms. Les nouveaux tests de parsing ont été lus ; le relecteur n'a pas
relancé de compilation pendant la campagne. L'empreinte Rust ci-dessous a été
actualisée pour identifier cette dernière lecture.

Le relecteur est distinct des auteurs des modules Rust, oracle MATLAB/Octave et
orchestrateur. Il est l'auteur du workflow et de sa documentation : la revue de
ce sous-ensemble est donc une auto-revue. Cette séparation de rôles reste une
**revue interne par agents**, sans audit cryptographique externe ou validation
commerciale d'une plateforme critique.

## Périmètre lu et contrôles exécutés

- [Générateur Rust et vérifieur séparé](../../../labs/horizon/proof/src/bin/circuit_campaign.rs) :
  corpus public, signatures de fixtures, preuves A/B, mutations et limites des IO.
- [Vecteurs](../../../scripts/circuit-vectors.mjs),
  [orchestrateur](../../../scripts/circuit-campaign.mjs),
  [corrélation](../../../scripts/circuit-correlate.mjs),
  [rapport HTML](../../../scripts/circuit-report.mjs) et
  [tracés](../../../math/circuit/plot_campaign.py).
- [Oracle entier](../../../math/circuit/circuit_oracle.m) et
  [tests de l'oracle](../../../math/circuit/run_oracle.m).
- [Workflow](../../../.github/workflows/circuit-validation.yml), contrats de
  fichiers, documentation primaire MathWorks/GitHub et
  [tests Node](../../../tests/circuit/correlation.test.mjs).

Commandes exécutées par le relecteur :

```sh
node --test tests/circuit/*.test.mjs
.tools/actionlint/bin/actionlint.exe .github/workflows/circuit-validation.yml
```

Résultats : **8 tests Node PASS**, zéro échec ou test ignoré ; **actionlint
1.7.12 PASS**. Les tests de jointure utilisent des observations synthétiques
déclarées, pas des preuves cryptographiques. Cinq contre-tests temporaires
supplémentaires ont exécuté les scripts d'export du workflow : filtre public,
artefacts absents après échec, hardlink refusé, état MATLAB indisponible conservé
et refus d'un succès avec pièces requises absentes. Ces essais n'ont pas lancé
MATLAB ou un prover. Les fixtures restent sous `.tools/`, hors publication.

Le relecteur a également chargé et recalculé la corrélation du bundle réel
`.tools/circuit-smoke-20261017/public` produit par l'auteur de l'orchestrateur :
**128 cas, 1 082 vérifications, 118 preuves valides A/B et 138 candidats hors
domaine, zéro désaccord observé**. Cette lecture a vérifié les octets des
vecteurs et du corpus décompressé contre les rapports. Le relecteur n'a pas
relancé les 1 082 vérifications cryptographiques ; leur exécution provient de
cette campagne, déclarée par son manifeste entre `17:02:35.119Z` et
`17:02:43.139Z`, sans horodatage tiers. MATLAB n'a pas été exécuté dans ce bundle.
Ce premier essai précède l'ajout du fichier séparé `octave-selftests.json`.
Il contient **256 candidats cryptographiques distincts** : les 1 082 requêtes
incluent la réutilisation des preuves dans plusieurs mutations, pas 1 082 preuves
fraîchement générées.

Empreintes de ce premier bundle relu, sous ce chemin local :

| Artefact | SHA-256 |
| --- | --- |
| `manifest.json` | `a6dc06906be22c6d080a496e208334ce5281a889b61a158953cdb216cdd54104` |
| `correlation.json` | `4aee9bca3b0a29b66f26adc98d285af31938278ef30b07553935d634b1c6eb76` |
| `verification-requests.ndjson.gz` | `985c31c68fdf761c06e7d1ce4c4d010478d929a4d4802832616cfe07ca3d3205` |

## Constats, corrections et état

| ID | Constat | Correction et validation | État |
| --- | --- | --- | --- |
| C01 | La jointure initiale acceptait des lignes plausibles sans contrôler statuts terminaux, compteurs globaux ou identité du corpus | Contrôles `complete`, profil, effets nuls, drapeau d'attente non décisionnel, compteurs et erreurs natives ajoutés. Liaison des vecteurs aux octets lus par le prover ; égalité des empreintes/taille du corpus généré, vérifié et archivé | Source relue ; tests de refus et archive PASS |
| C02 | Un refus anticipé de signature pouvait être confondu avec un test du système de preuve | Chaque famille impose son code d'erreur. La corruption algébrique modifie un scalaire canonique puis re-signe avec le détenteur. La transplantation de challenge est re-signée. Les candidats hors domaine contournent les gardes natives et arrivent au vérifieur de plages | Source et tests de jointure relus ; pas de nouvelle campagne crypto par le relecteur |
| C03 | L'export initial omettait les métadonnées des figures ; le contrat a ensuite ajouté les self-tests de l'oracle | `figures/plot-metadata.json` et `octave-selftests.json` explicitement exportés ; `matlab-selftests.json` sélectionné dans le second job | Corrigé dans le workflow ; exécution GitHub à constater |
| C04 | Un processus déclaré réussi pourrait laisser des pièces obligatoires absentes | Étape bloquante après sélection ; bundle partiel conservé avec liste des absences et statuts | Contre-test PASS |
| C05 | Le premier brouillon utilisait un champ de contexte de visibilité non documenté | Éligibilité fondée sur `github.event.repository.visibility`, avec refus si différent de `public` ; aucun jeton de licence ajouté | Source/actionlint vérifiés ; résultat réel de licence encore requis |

Pour C01, la contre-épreuve du relecteur proposant `status=failed/unknown` a
été rejetée à `Rust completion/profile` : le correctif de l'auteur était déjà
présent à son exécution. La faiblesse de la version initiale a été établie par
lecture source ; elle n'est pas présentée comme un exploit crypto observé.

Un second avis interne, transmis par l'agent mathématique sur le code Rust,
n'a pas identifié de blocage : appel réel à `verify`, annotation
`expected_accept` ignorée, scalaire canonique corrompu puis re-signé,
transplantation et contrôle de parité du candidat direct valide. L'agent de
revue des artefacts a également rapporté l'absence de clés privées et ouvertures
dans le corpus public du smoke. Ces avis sont attribués à leurs auteurs ; ils
ne sont pas présentés comme des tests supplémentaires exécutés par ce relecteur.

Pour `a=0` ou `c<a`, la soustraction `wrapping_sub` du candidat hostile modifie
aussi la relation aux engagements dérivés : le refus valide la **relation
complète**, sans isoler uniquement le comparateur de plages. Les cas `a>2^32`
ou `c-a>=2^32` sans sous-dépassement isolent mieux la contrainte de plage.
L'ensemble ne constitue pas une exploration exhaustive des stratégies d'un
prover malveillant.

La dernière version des self-tests de l'oracle couvre **36 entrées invalides,
11 frontières et 4 096 paires de grille réduite**, selon l'exécution rapportée
par son auteur. Les résultats MATLAB correspondants restent à obtenir sur
GitHub ; la même source exécutée sous Octave ne les remplace pas.

## Couverture et limites conservées

La relation BigInt utilise la formulation par intervalle ; l'oracle garde les
soustractions `uint64` avant leur exécution et ne convertit pas les grands
entiers en `double`. Les vecteurs sont des chaînes décimales canoniques. Le jeu
comprend frontières 32 bits, au-delà de `2^53`, extrêmes `u64`, domaine valide
et plusieurs familles invalides. La déterminisation porte sur ces valeurs,
jamais sur l'aléa cryptographique `OsRng`.

Les ensembles d'IDs et de familles attendues sont complets : la jointure refuse
doublon, absence, ligne supplémentaire, verdict incompatible ou mauvais étage
de rejet. Les hashes relient les octets du corpus aux deux rapports ; la
décompression est bornée. Ils ne rendent pas des rapports arbitrairement
réécrits authentiques : code, machine et exécutions restent dans la confiance.
Le job MATLAB compare des sorties numériques avec les résultats Rust ; il ne
réimplémente pas Bulletproofs et ne re-vérifie pas lui-même chaque preuve.

Le vérifieur est un autre processus utilisant la **même bibliothèque Rust**.
Il reçoit des registres, politiques et horloges synthétiques du banc de test ;
ce mode hors ligne n'est pas un service d'autorisation acceptant des clés de
confiance choisies par un client. Les signatures sont vérifiées hors preuve de
plages. La vérité d'une source d'assurance et l'indépendance de ses autorités
ne sont pas établies par ces fixtures.

Le scan des exports et les types publics examinés excluent facteurs
d'aveuglement, clé privée du détenteur et payload `disclosure`. Ce scan est un
contrôle supplémentaire, pas une preuve de non-interférence ou une défense
contre un auteur de code hostile. Les montants de cette expérience sont publics
et synthétiques ; aucune confidentialité de données métier réelles n'est testée.

Les figures proviennent des lignes observées, avec vue restreinte explicitée
pour les valeurs extrêmes et durées annoncées sans protocole de benchmark.
Elles ne valident ni IID, ni p95 de service, ni comparaison équivalente avec
Vega/RISC Zero/GPU. La campagne ne déclenche aucun effet métier ; les tests du
contrôleur MCP, de concurrence et de reprise sont distincts.

## GitHub Actions et MATLAB

Les actions officielles et leurs commits ont été consultés ; les conditions
de licence publique sont détaillées dans [GITHUB_ACTIONS.md](GITHUB_ACTIONS.md).
La PR directe utilise 128 cas et demande MATLAB réel. Push `main` conserve
128 cas sans MATLAB ; dispatch et appel réutilisable conservent leur booléen
explicite. Aucun cas supérieur à 4096 n'est accepté dans ce workflow.

La sélection des artefacts s'exécute aussi après échec, sans rendre le job vert.
Un échec avant export, une annulation ou un timeout peut empêcher le bundle.
Le token reste en lecture seule ; aucune identité cloud, publication automatique,
fusion de branche ou commande libre d'agent n'est ajoutée. L'exécution de MATLAB
sur GitHub reste **à observer** à cette passe : un script `.m`, Octave ou une
licence théoriquement disponible ne constituent pas une exécution MATLAB.

## Empreintes à la fin de la lecture source

Empreintes SHA-256 locales, sans signature ni attestation de date. Elles
identifient cette passe, sans suivre automatiquement les edits ultérieurs.

| Fichier | SHA-256 |
| --- | --- |
| `scripts/circuit-correlate.mjs` | `5eb07243136f8867ef3e1a610d5ca1358f29886492be618b53266cb9c6df4837` |
| `scripts/circuit-campaign.mjs` | `07aa1b119bef2db3c87020b4fc09bc0ed305fed52a0914b4351e36adf25ad132` |
| `.github/workflows/circuit-validation.yml` | `524e50a4149eb7aca23729965b36397e8474ae821c5d69664087c76d3fa82f13` |
| `math/circuit/circuit_oracle.m` | `fa134dee0bb98484249abdb90dbb31cc25439e4f0874eb4aad716b490935be39` |
| `labs/horizon/proof/src/bin/circuit_campaign.rs` | `1b62c042f6195f9055a72af452aef69733925f4a899c4713ddf1856cb489a654` |

Aucun nouveau blocage de la campagne locale n'a été identifié après les
corrections relues. Cela n'établit ni absence universelle de défaut, ni audit
externe, ni qualification de production. Les exécutions 4096 cas et MATLAB
réelles doivent conserver leurs propres artefacts et verdicts datés.
