# Vérifications mathématiques Horizon

Le dossier ci-dessous conserve le premier profil historique. Le
[nouveau banc corrélé](../docs/experiments/circuit/RESULTS_2026-10-17.md) ajoute
un oracle distinct, des preuves Rust nombreuses et une exécution **MATLAB
R2026b réellement effectuée** dans GitHub Actions, en plus d'Octave.

Ce dossier contrôle des identités et des hypothèses de la relation existante. Il
ne réimplémente aucune primitive cryptographique. Une réussite numérique ne
prouve ni la sécurité de Bulletproofs, ni la vérité des faits signés, ni le code
TypeScript, ni la durabilité d'un disque. Voir le [whitepaper](../docs/whitepaper/whitepaper.pdf).

## Exécution isolée

Depuis la racine du dépôt, Docker disponible :

```sh
node math/run.mjs --build
```

`--build` autorise explicitement la construction locale de l'image fixe si elle
est absente. Sans ce flag, son absence est une erreur. Aucun catalogue externe
ne choisit image, commande, volume ou exécutable. Les outils sont installés
uniquement dans cette image ; aucun logiciel payant ou paquet global n'est requis.
La base Debian est épinglée par digest. Les paquets apt ne sont pas sur un
snapshot : le rapport conserve les versions et l'identifiant de l'image réellement
utilisée, sans promettre de reconstruction bit à bit.

Chaque exécution crée `results/octave-<UTC>-<UUID>/` avec `run.json`, `octave.log`
et un résultat daté. Les sources sont montées en lecture seule et la sortie
dans ce nouveau répertoire. Le conteneur d'exécution n'a pas de réseau et est
limité à 2 CPU / 2 GiB. Les rapports sont écrits avec création exclusive ; ils
ne sont pas des fichiers système immuables contre un administrateur. La date
est auto-déclarée, les SHA-256 ne sont ni une signature, ni un horodatage TSA,
ni une preuve du sens des résultats. Un échec conserve un rapport et renvoie
un code non nul.

Le script distingue explicitement `GNU Octave` de `MATLAB`. Pour un environnement
MATLAB possédant `jsonencode`, la syntaxe prévue est :

```matlab
run('math/run_checks.m')
```

**MATLAB n'a pas été exécuté dans cette livraison.** L'exécution directe conserve
des JSON datés dans `math/results/` ; `latest.json` n'est qu'un index. Le runner
Node est préférable pour enregistrer automatiquement versions et empreintes.

## Couverture et précision

- 24 510 paires, bits 1 à 6, valeurs négatives et hors plage incluses ; 5 460
  paires acceptées. Équivalence entre plages de `a-1, c-a` et bornes entières.
- Dix frontières du profil 32 bits, dont `2^32`, `2^33-1` et `uint64` maximum.
  Les valeurs JSON sont des chaînes décimales pour préserver leur exactitude.
- L'ordre de Ristretto est reconstruit par addition de chiffres décimaux ; il
  n'est jamais converti en `double` ou `uint64`. L'arithmétique métier utilise
  `int64`/`uint64`, avec garde avant soustraction non signée.
- 20 états atteignables et 160 transitions d'un modèle fini, une clé métier et
  deux nonces. Réservation persistante, expiration/révocation, arrêt, effet ambigu
  et réconciliation sont explorés. Ce modèle n'est pas le code TypeScript.
- Contre-exemples : nonce seul, cumul, franchise, exposant/devise, alias modulo
  et relation de générateurs connue. Les exemples scalaires ne sont pas un test
  du logarithme discret.

## Traçabilité

Les constantes et domaines d'entrée sont dans `horizon_checks.m`, dont le runner
enregistre l'empreinte, ainsi que celles de `run_checks.m`, `run.mjs` et du
Dockerfile. Le résultat et le log ont aussi leur empreinte. `record_environment.py`
est un outil complémentaire pour l'exécution directe et le PDF ; le runner Node
est autonome et ne l'appelle pas.

Les archives de la première construction et les essais directs antérieurs au
runner sont conservés localement et exclus de la publication par `.gitignore` :
certains contiennent des chemins de l'hôte. Ils ne sont donc pas présents dans
un checkout neuf. Le résultat publié sélectionné est
`results/octave-2026-10-17T14-48-23.751Z-0f44a541-9089-42a3-9676-47d943cfaed5/` ;
les chemins de commande y utilisent `<MATH>` et `<OUTPUT>`. Toute nouvelle
exécution est locale par défaut ; publier exige une revue puis une exception
explicite dans `.gitignore` et l'ajout des artefacts au catalogue.
Seul un rapport `run.json` avec `status=pass` établit la réussite
de son exécution isolée ; ni ce statut ni un hash ne certifient la cryptographie.
