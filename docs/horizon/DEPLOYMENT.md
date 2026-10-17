# Démonstrateur local

Prérequis : Node 24.11.1+, Rust 1.93.0 avec Cargo, npm, Docker Linux pour Compose.
La racine épingle Rust 1.93.0 ; les expériences Linux utilisent l'image Rust
1.98.0 épinglée par digest. Cloner la branche de recherche puis, depuis la racine :

```sh
npm ci --ignore-scripts
npm run horizon:build
npm run test:horizon
npm run horizon:demo
```

`horizon:demo` crée un scénario synthétique indépendant, génère une vraie preuve,
teste refus et admission, puis arrête ses processus. Sa cible est une nouvelle
base locale, sans opération financière. Les artefacts locaux sont conservés ;
le script refuse un effet supplémentaire dans chaque scénario.

## Application web persistante

```sh
npm run horizon:init
docker compose -f deploy/horizon/compose.yaml up -d --build --wait
```

Sous Linux avec un utilisateur non-root, définir avant Compose
`export HORIZON_PROVER_UID=$(id -u)`. Le fournisseur lit ainsi le fichier privé
`0600` avec l'identité de son propriétaire. Le vérifieur reste UID 1000, avec
son propre volume ; seul `public.json`, sans witness ni clé privée, est `0644`.
Sous Windows/Docker Desktop, la valeur par défaut 1000 convient au montage.

Ouvrir **http://127.0.0.1:38080**. Le fournisseur répond sur le port 38081.
Le relais local fixe les deux destinations ; seuls ses ports loopback sont
publiés. Les processus fournisseur et vérifieur sont sur un réseau Docker interne.
Le relais ne possède ni configuration privée, ni clés, ni base.

L'interface permet challenge, présentation, vérification avant action synthétique,
altération, rejeu et lecture de l'état. Les contrôles opérateur sont désactivés
dans le navigateur. Révocation et consommation sont persistantes. Une opération
consommée reste refusée après redémarrage :

```sh
node scripts/horizon-http-smoke.mjs
docker compose -f deploy/horizon/compose.yaml restart
node scripts/horizon-http-smoke.mjs replay
```

Le premier smoke exige une base vide et consomme l'action ; le second vérifie
le refus sur cette même base. Ne pas relancer le premier sur un scénario déjà
consommé. Aucun endpoint reset/unrevoke n'est fourni. Arrêter sans effacer :

```sh
docker compose -f deploy/horizon/compose.yaml stop
```

Les configurations sont dans `.tools/horizon/demo`, ignoré par Git et exclu
du contexte de build. Le prover voit uniquement `private.json`. Le vérifieur
voit uniquement `public.json` et le volume SQLite. Les attestations de fixture
expirent après **une heure**, les challenges après au plus **30 secondes**.
Après expiration, une nouvelle expérience demande un nouveau répertoire de
configuration et une nouvelle cible sandbox explicitement distincte. Conserver
les anciennes bases ; ne jamais réinitialiser implicitement un état d'autorisation.

Une alternative sans Docker est `npm run horizon:serve`, après arrêt des services
qui occupent les mêmes ports. Elle utilise deux processus et une cible SQLite
hôte distincte. Ces bases indépendantes représentent des expériences distinctes,
pas une solution de coordination entre vérifieurs d'une même cible réelle.

## CLI et bibliothèque

Le worker Rust traite JSONL, un résultat par ligne. Exemple de vérification
publique, avec un temps historique explicite et aucune admission d'action :

```sh
node scripts/horizon-fixture.mjs verify
node scripts/horizon.mjs request tests/fixtures/horizon/public-presentation.json
```

Opérations : `init`, `prepare`, `prove`, `present`, `verify`, `select`.
`init` génère des secrets synthétiques : utiliser le script d'initialisation
qui les écrit dans les fichiers locaux, pas des journaux partagés. Les signatures
et encodages stricts sont documentés dans [la bibliothèque](../../labs/horizon/proof/README.md).
L'API Rust et les types TypeScript constituent les interfaces du laboratoire ;
aucun SDK bancaire/MCP de production supplémentaire n'est prétendu livré.

## Reproduire les mesures

```sh
npm run horizon:benchmark
node scripts/horizon-firewall-benchmark.mjs --samples 500 --warmup 30
node scripts/horizon-vega.mjs
```

Le runner natif produit un fichier brut horodaté et un résumé sans écraser les
anciens résultats. Vega crée un conteneur de référence dédié, compile en réseau
puis le déconnecte avant mesure ; il le conserve arrêté à la fin. Les détails
avant/après sont dans [EXPERIMENT_LOG](EXPERIMENT_LOG.md). L'exécution complète
des benches Criterion prend plusieurs minutes. Elle ne reproduit pas le circuit
credential absent du dépôt public.

## Frontière d'exploitation

Compose impose utilisateur non-root, rootfs en lecture seule, limites CPU/RAM/PID,
aucune capacité Linux et aucune élévation de privilège. HTTP est local, sans IAM
bancaire et sans TLS. Les trois routes opérateur (`/api/revoke`, `/api/rotate-policy`,
`/api/reconcile`) refusent par défaut toute requête avec HTTP 403. Un serveur
opérateur configuré séparément peut fournir `HORIZON_OPERATOR_TOKEN` (32 octets
aléatoires encodés en 64 caractères hexadécimaux minuscules) ; le client doit
fournir `x-horizon-operator-token`. La comparaison est à temps constant, après
validation de l'encodage. Les tests couvrent les refus sans mutation et les
opérations authentifiées. Ce secret partagé local n'est pas un IAM qualifié.

Compose ne configure aucun token et le relais ne transmet pas cet en-tête.
Le navigateur et les outils MCP ne reçoivent jamais ce secret. Ne pas le placer
dans une URL, le JavaScript public, un log ou un manifeste. Un futur canal
opérateur exige identité, rôles, TLS, gestion des secrets et audit adaptés ;
aucune activation cloud n'est incluse dans ce démonstrateur.

Ne pas ouvrir ces ports à un réseau d'entreprise. L'application n'a aucun
connecteur financier et n'utilise aucune donnée client. Les limites et travaux
de qualification sont dans [THREAT_MODEL](THREAT_MODEL.md) et les [tickets](../../issues/horizon/NEXT_EXPERIMENTS.md).
