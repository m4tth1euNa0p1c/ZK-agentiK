# Proofkit CLI — preuves et expériences explicites

Cette CLI locale regroupe les profils de laboratoire et un registre d'artefacts.
Elle ne constitue ni une primitive cryptographique ni un service d'horodatage.
Node 24.11+ et `npm ci --ignore-scripts` ; lancer depuis le dépôt :

```sh
npm run proofkit -- doctor
npm run proofkit -- list
npm run proofkit -- check
npm run proofkit -- run horizon
npm run proofkit -- seal evidence/manifests/review-001.json
npm run proofkit -- verify evidence/manifests/review-001.json
```

`doctor` vérifie la disponibilité des outils, sans exécuter de preuve. `check`
valide le schéma du catalogue et lit les artefacts explicitement déclarés.
`seal` refuse d'écraser un fichier ; `verify` refuse toute différence de catalogue,
d'ensemble de fichiers, taille ou empreinte. Cela établit une cohérence des octets
avec le manifeste donné, pas l'authenticité du manifeste.

## Profils livrés

| Profil | Travail réellement exécuté | Prérequis / coût |
| --- | --- | --- |
| `horizon` | Build, fixture Bulletproofs historique, puis preuve et action locale synthétique fraîches | Rust et Node ; minutes au premier build |
| `risc0-public` | Vérification de receipts historiques acceptant/refusant la politique | Docker, laboratoire RISC Zero préparé ; voir son runner |
| `vega-sha256` | Benchmarks amont SHA-256 SC/MC épinglés | Docker, téléchargements et compilation longs ; pas relation mDL complète |
| `math` | Vérifications entières et modèle fini sous Octave | Docker ; première construction avec réseau, exécution sans réseau |

Les profils sont du code revu dans `profiles.mjs`. Le catalogue n'autorise aucune
commande, URL de backend, image ou clé de vérification. Chaque profil respecte
son propre protocole ; le succès d'un processus ne valide pas toutes les
assertions du catalogue. Aucun statut d'assertion n'est promu automatiquement.

```sh
npm run proofkit -- run horizon --require-post-quantum
# Échec explicite POST_QUANTUM_PROFILE_UNAVAILABLE avant exécution.
```

Les résultats d'exécution sont `passed`, `failed`, `unavailable` ou `unknown`.
Une interruption ou un résultat indéterminé ne devient pas un succès. Les logs
bruts restent dans `.tools/proofkit/runs/<UTC>-<UUID>/`, exclus de Git. Sous POSIX
les permissions sont restreintes ; elles ne remplacent pas une ACL Windows.
Relire ces logs avant toute publication : les profils peuvent manipuler des
chemins locaux et des fixtures privées. La durée d'une commande inclut ses
builds/IPC ; ce n'est pas un benchmark cryptographique.

## Garanties et limites du manifeste

- Schémas stricts, doublons et omissions refusés, ensemble exact d'artefacts.
- Chemins relatifs seulement ; traversal, liens symboliques/jonctions, hardlinks
  et noms sensibles usuels refusés ; lectures bornées.
- Dates UTC et commit Git sont **auto-déclarés**. Les changer dans un manifeste
  ne permet pas d'authentifier le temps ou un auteur. Aucun TSA, signature de
  mainteneur ou transparence externe n'est fourni.
- Le manifeste ne suit pas récursivement les liens inclus dans les documents.
  Ajouter explicitement au catalogue toute donnée brute nécessaire à une assertion.
- Un écrivain local hostile capable de modifier les répertoires pendant la lecture
  reste hors modèle ; ces vérifications de chemins ne sont pas une sandbox système.
- Les chemins sensibles sont une précaution, pas un détecteur de secrets. La revue
  de publication et le scan d'historique restent nécessaires.

Les fixtures historiques sont vérifiables cryptographiquement pour leur date
d'origine. Elles ne sont pas des autorisations fraîches réutilisables. Les preuves
de nouvelles opérations viennent du profil et passent par le contrôleur durable.

Tests : `npm run test:proofkit`. Pour intégrer un outil, suivre le
[SDK](../../packages/proofkit-sdk/README.md), puis enrichir
[`evidence/catalog.json`](../../evidence/catalog.json) avec relation, limites,
sources primaires datées et fichiers publics explicitement sélectionnés.
