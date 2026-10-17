# Journal d'expériences Horizon

## H00 — Baseline, 17 octobre 2026

Référence `d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`. 14 tests Rust,
25 tests Node, deux receipts RISC Zero historiques revérifiés. Aucun changement
de relation initiale. Détails : [audit](AUDIT.md).

## H01 — Reproduction Vega SHA-256 terminée

Source officielle clonée à
`c0ee259053cd12eaf43ed71b5cde375452b3ee4d`. Les deux benches publiés sont
`sha256_vega_sc` et `sha256_vega_mc_zkp`. Ils mesurent des circuits SHA-256 ;
la présence des chiffres de présentation mDL dans le README ne signifie pas
que ces benches implémentent la relation complète mDL.

Environnement : même CPU physique et conteneur 8 CPU / 12 GiB que le laboratoire
RISC Zero, Rust 1.98.0, `RUSTFLAGS=-C target-cpu=native`. Une résolution Cargo
est figée avant les mesures, car le dépôt de référence ne livre pas de lockfile.
Les coûts setup / prep_prove / prove / verify restent distincts.

Les deux commandes amont non modifiées ont terminé avec code 0 :

```sh
cargo bench --offline --locked --bench sha256_vega_mc_zkp
cargo bench --offline --locked --bench sha256_vega_sc
```

`BENCH_THREADS=8`, `RAYON_NUM_THREADS=8`. Sources/lock conservés dans les
références et [bruts MC](raw/vega-mc.txt), [bruts SC](raw/vega-sc.txt),
[échantillons Criterion et IC](raw/vega-criterion.json). MC utilise l'estimation
de pente Criterion ; SC le mode flat et son estimation centrale. Les 10 groupes
Criterion ne sont pas des requêtes individuelles donnant un p99 de service.
Préparation MC 2 Kio : 75,765 ms ; preuve : 65,836 ms ; vérification : 19,885 ms.
`node scripts/horizon-vega.mjs` reconstruit la référence avec le lock conservé.

**Résultat négatif** : pas de reproduction des 92/23 ms du credential complet.
Les benches publics disponibles prouvent SHA-256, sans toute la relation mDL.
La comparaison applicative reste ouverte, aucune victoire contre Vega.

## H02–H04 — Recherche et arbitrage

Les trois responsabilités contradictoires ont produit état de l'art/design,
marché/antériorités/coût, et sécurité/métrologie. Cinq domaines ont été évalués.
Vote commun : laboratoire synthétique d'autorisation de sinistre déléguée,
sans paiement ; pas de validation commerciale ou d'invention revendiquée.
La transformation en deux plages est dans [l'énoncé](FORMAL_STATEMENT.md).
Les sources approuvées doivent émettre des engagements depuis leurs valeurs.
Si ce contrat d'émission est impossible ou la divulgation permise, le choix
doit être abandonné au profit d'une alternative plus simple.

## H05 — Prototypes réels et correction contradictoire

Commit `80b2202` : A preuve fraîche, B preuve historique et signature fraîche,
C sélection par politique, baseline non-ZK. Le worker Rust vérifie toutes les
signatures et la preuve complète. HTTP est séparé du chemin MCP historique.
Le contrôleur SQLite consomme nonce et opération et conserve UNKNOWN.

Défauts détectés puis corrigés avant qualification : demande de divulgation au
fournisseur malgré une politique privée ; recul de l'horloge avant la validité
des sources après vérification ; réponse d'erreur pouvant suggérer zéro effet
sans réconciliation. Le test statistique singleton p99 initial avait une
attente erronée, corrigée après calcul binomial indépendant. Aucun de ces
échecs n'est dissimulé dans le verdict.

## H06 — Optimisation contrôlée des paramètres publics

Avant : `80b2202`. Après : `353652d`. Même image, CPU, limites 8 CPU / 12 GiB,
Rust 1.98.0, `RUSTFLAGS=-C target-cpu=native`, CPU seul. Réseau du conteneur
déconnecté après compilation. Aucun autre benchmark/build lourd simultané.
Exécution séquentielle avant/après, et ordre A/B alterné à l'intérieur de chaque
run. L'activité générale Windows/WSL n'est pas intégralement contrôlée.

```sh
cargo build --offline --release --locked --manifest-path labs/horizon/Cargo.toml
horizon-benchmark --samples 500 --warmup 30 --output horizon-before.json
# reconstruire le commit 353652d dans le même environnement
horizon-benchmark --samples 500 --warmup 30 --output horizon-after.json
```

Le binaire et sources effectifs étaient sous `/lab/horizon/agentik` avec
`CARGO_TARGET_DIR=/lab/horizon/target` dans le conteneur du lab. Les bruts
[avant](raw/horizon-linux-before.json) et [après](raw/horizon-linux-after.json)
conservent 13 phases × 500 échantillons, cinq cas et 30 échauffements exclus.
Une première commande de chronométrage, mal transmise entre PowerShell et Bash,
n'a produit aucun fichier ; elle a été corrigée avant ces deux runs. Aucun
zéro issu de cette commande n'est compté comme mesure.

Les deux `OnceLock` partagent uniquement les générateurs publics constants.
Résultats p95 : A 7,770→6,546 ms ; vérification B 2,266→1,247 ms ; preuve 672
octets dans les deux versions. Chaque run rejette 500 corruptions algébriques
canoniques re-signées, au stade `INVALID_RANGE_PROOF`. La preuve publique
produite avant optimisation est vérifiée après optimisation. Les IC et tailles
d'enveloppe sont dans [le rapport](BENCHMARK_RESULTS.json).

Temps CPU utilisateur de toute la campagne : 11,725→8,930 s ; durées murales
11,764→9,054 s. Ces totaux incluent toutes les phases et les échauffements ;
ils ne sont pas des coûts par opération. Pas de pic RSS Rust/énergie/GPU mesuré.
Les simulations d'amortissement k=1/2/5/10/100 du rapport sont des calculs
arithmétiques sur les moyennes observées, pas des séries k exécutées.

## H07–H08 — Contrôleur durable et validation

`npm run test:horizon` : 18 tests, 0 échec/skip. Sept groupes d'intégration avec
de vraies preuves et 11 tests statistiques. Le contradicteur les a exécutés
indépendamment, y compris deux nonces et deux présentations concurrents :
quatre requêtes, une admission et un effet. Les autres suites historiques sont
préservées : 14 Rust et 25 Node ; Horizon ajoute 9 Rust. Typecheck, formatage et
Clippy strict passent. La CI a été étendue au laboratoire et au smoke Docker.

`node scripts/horizon-firewall-benchmark.mjs --samples 500 --warmup 30` :
Windows 10.0.26200, Node 24.11.1, worker Rust release identifié par SHA-256.
La campagne de 44,116 s crée 530 bases/actions synthétiques distinctes,
réutilise une seule preuve B et ne rencontre aucune erreur. Création de base,
émission du challenge, HTTP, réseau et clôture/checkpoint sont exclus.
Les quatre phases chronométrées restent séparées dans le rapport brut.

Résultat p95 continu vérification IPC + réservations/effet/audit SQLite :
**13,014 ms**, p99 **15,126 ms**, maximum **180,310 ms** conservé.
L'hypothèse ≤10 ms de ce parcours est rejetée sur ce banc. RSS Node observé
maximum 72 548 352 octets, excluant Rust et cache système ; ce n'est pas un
pic mémoire total. Les fichiers smoke n=2 sont conservés comme smoke, sans IC
de queue prétendument robuste et sans mélange avec n=500.

## H09 — Déploiement local exécuté

`docker compose -f deploy/horizon/compose.yaml up -d --build --wait` : images
épinglées compilées, services non-root sains. Premier essai négatif : Docker
Desktop ne publiait pas les ports de services attachés au seul réseau interne.
Correction : relais sans secret, à destinations fixes, seul point d'entrée
loopback ; prover/vérifieur conservent leur réseau interne.

`node scripts/horizon-http-smoke.mjs` : preuve réelle via HTTP, downgrade et
altération refusés avec zéro effet, admission unique puis rejeu refusé.
Après `docker compose ... restart`, `... smoke.mjs replay` refuse rejeu et
nouveau challenge avec toujours un seul effet. Routes non autorisées, corps
trop grand et origine étrangère refusés. Aucun système financier contacté.

`node scripts/horizon-container-verify.mjs` : la preuve publique antérieure est
vérifiée dans un conteneur neuf `--network none --read-only`, sans montage,
sans witness ni clé privée. Cette vérification historique n'autorise aucune action.
L'interface statique a été contrôlée aux largeurs desktop et mobile par l'agent
frontend ; le navigateur interactif CUA n'était pas disponible pour le contrôle
racine. Le parcours réel a été validé par l'API HTTP et le compteur de cible.

La première CI GitHub Linux a passé les suites mais échoué au démarrage Compose :
les fichiers bind en `0600`, appartenant au runner UID 1001, n'étaient pas
accessibles aux services UID 1000. Ce cas était masqué par les montages Windows.
Correction : fichier public seul en `0644` explicite, privé conservé en `0600`,
UID du seul prover aligné sur le propriétaire non-root. Le vérifieur conserve
son UID et volume propres. Référence de l'échec conservée :
[run 38995262984](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/38995262984).

## H10 — Décision

POC utile et optimisation locale démontrés. Aucun record externe, aucune
qualification client, aucune conformité ou sécurité de production établie.
[Verdict](FINAL_VERDICT.md) et [expériences suivantes](../../issues/horizon/NEXT_EXPERIMENTS.md).
