# Dépendances : correction Horizon et risques résiduels

Revue du 17 octobre 2026, sur une copie de travail basée sur
`8935cc9e42dee9b2ed32207483a6f7383e37ffc4`. **Le dépôt n'a pas un audit global
sans alerte.** La correction minimale d'Horizon supprime ses deux alertes
`unsound`. Son avertissement de maintenance et les alertes du laboratoire
RISC Zero restent visibles. Cette revue prépare une publication de résultats
expérimentaux ; elle ne qualifie aucun service en production.

## Résultat reproductible

`cargo-audit 0.22.2`, base RustSec figée au commit
`64f92cdc64401fab47baa10e2e11fe382aa57155` (1 334 avis), arbre de la base propre.
Les scans du 17 octobre 2026 à 15:00 UTC utilisent `--no-fetch --no-yanked`,
sans règle d'ignorance, sans filtre de gravité ni de cible. Ils ne contrôlent
donc pas les versions retirées de crates.io, les vulnérabilités inconnues,
les dépendances npm, les images système ou les exécutables précompilés.

| Lockfile | Vulnérabilités avant → après | Alertes informatives avant → après | Code de sortie après |
| --- | ---: | --- | ---: |
| `Cargo.lock` | 0 → 0 | 0 → 0 | 0 |
| `labs/horizon/Cargo.lock` | 0 → 0 | 2 `unsound` + 1 `unmaintained` → 1 `unmaintained` | 0 |
| `labs/risc0/Cargo.lock` | 2 → 2 | 3 `unmaintained` → 3 `unmaintained` | 1 |
| `labs/risc0/methods/guest/Cargo.lock` | 1 → 1 | 2 `unmaintained` → 2 `unmaintained` | 1 |

Les catégories restent celles de RustSec : `unsound` est ici une alerte
informative, ce qui ne signifie pas un défaut bénin. Le scan Horizon avec
`--deny unsound` passe également ; `unmaintained` reste signalé.

Les [rapports avant/après](dependencies/), commandes, dates, codes de sortie
et empreintes figurent dans [capture-provenance.json](dependencies/capture-provenance.json).
`cargo-*.json` désigne les scans initiaux ; `cargo-*-after.json` les nouveaux
scans. Les sorties `audit-*.stdout.txt` préservent le JSON de cargo-audit, y
compris ses alertes. `allowed_exit_codes` décrit la collecte des diagnostics,
pas une acceptation de sécurité. Les avis RustSec embarqués indiquent leur
licence CC0-1.0. Seuls les chemins locaux ont été expurgés des sorties de test.

## Correction minimale d'Horizon

- `anyhow = 1.0.100` → `=1.0.103` : correction du comportement indéfini lié à
  `downcast_mut` sur certaines erreurs contextualisées.
  [RUSTSEC-2026-0190](https://rustsec.org/advisories/RUSTSEC-2026-0190.html),
  [signalement amont](https://github.com/dtolnay/anyhow/issues/451).
- `rand = 0.8.5` → `=0.8.6` : correction de la réentrance de `ThreadRng` avec
  un logger personnalisé dans les configurations concernées.
  [RUSTSEC-2026-0097](https://rustsec.org/advisories/RUSTSEC-2026-0097.html),
  [correctif amont](https://github.com/rust-random/rand/pull/1763).

Seuls ces deux numéros et leurs checksums changent dans le lockfile.
Bulletproofs, les courbes, Ed25519, Merlin, le format des preuves et la relation
prouvée sont inchangés. Le code Horizon utilise explicitement `OsRng` ; le
graphe résolu n'active pas la feature `log` de rand. Aucune utilisation directe
de `downcast_mut` n'a été trouvée dans le code Horizon. Ces observations
limitent certains chemins d'exposition ; elles ne remplacent pas la mise à
jour et ne démontrent pas l'absence de tout appel transitif.

Le manifeste et le lockfile antérieurs sont conservés ensemble dans
[horizon-proof-before.toml](dependencies/horizon-proof-before.toml) et
[horizon-before.lock](dependencies/horizon-before.lock). Pour reproduire les
mesures historiques, utiliser le commit et la configuration du rapport
historique dans une copie isolée, avec ses **deux** fichiers correspondants.
Remettre uniquement l'ancien lockfile face au manifeste corrigé ne satisfait
pas `--locked`. Les campagnes de performance historiques ne sont ni modifiées
ni rejouées, et leurs chiffres ne sont pas attribués aux versions corrigées.

Contrôles exécutés après correction :

| Commande | Observation |
| --- | --- |
| `node scripts/cargo.mjs test --manifest-path labs/horizon/Cargo.toml --locked --all-targets` | 9 tests cryptographiques passent ; deux binaires sans tests passent |
| `node scripts/cargo.mjs fmt --manifest-path labs/horizon/Cargo.toml --all -- --check` | code de sortie 0 |
| `node scripts/cargo.mjs clippy --manifest-path labs/horizon/Cargo.toml --locked --all-targets -- -D warnings` | code de sortie 0 |
| `npm run horizon:build` | binaire release et compilation TypeScript réussis |
| `node scripts/horizon-fixture.mjs verify` | preuve publique historique vérifiée, aucune autorisation vivante prétendue |
| `node scripts/horizon.mjs demo` | preuve Bulletproofs réelle, vérifieur indépendant, 1 effet autorisé et 0 effet non autorisé ; altération, rejeu et divulgation forcée refusés |

Les sorties des deux dernières commandes sont conservées. Les quatre premières
ont été observées au terminal ; aucune sortie complète rétroactive n'est
fabriquée. Ces tests ne constituent ni un audit cryptographique indépendant,
ni une mesure de performance, ni une qualification de production.

## Analyse des alertes conservées

**Horizon — `clear_on_drop 0.2.5`.** Bulletproofs 5.0.0 dépend de cette crate
non maintenue ; le code de range proof l'utilise effectivement pour nettoyer
des données, ce n'est pas seulement un outil de développement. L'avis ne
fournit pas de version corrigée. Ajouter une dépendance `zeroize` inutilisée
ne supprimerait pas ce chemin. Une migration demande une version amont
maintenue ou un changement relu de l'amont, sans primitive cryptographique
maison. [RUSTSEC-2026-0283](https://rustsec.org/advisories/RUSTSEC-2026-0283.html),
[changement amont](https://github.com/cesarb/clear_on_drop/commit/5916d6260acbad8a34290dba137f39963f13f467).

**RISC Zero — `tracing-subscriber 0.2.25`.** Le correctif de l'injection de
séquences ANSI est en `>=0.3.20`, hors de la contrainte `0.2` d'ark-relations
0.5.1. Dans les graphes actuels host Linux et guest RISC Zero, cette dépendance
est activée par `risc0-zkvm/std` → `risc0-groth16` → arkworks →
`ark-relations/std`. Les features résolues de `tracing-subscriber` sont vides ;
son module `fmt`, visé par le correctif, est sous `cfg(feature = "fmt")`.
L'exposition à **ce chemin de formatage** n'est donc pas établie dans ces
configurations, bien que le package signalé reste présent. Une autre
unification de features peut changer cette conclusion. Ce constat ne couvre
pas les dépendances propres du `r0vm` précompilé utilisé hors workspace.
[RUSTSEC-2025-0055](https://rustsec.org/advisories/RUSTSEC-2025-0055.html),
[correctif amont](https://github.com/tokio-rs/tracing/pull/3368).

**RISC Zero host — `rsa 0.9.10`.** L'attaque Marvin concerne des opérations
RSA privées observables par leur durée ; aucune version corrigée n'est
indiquée dans la base figée. La dépendance arrive par `rzup 0.5.2`, lui-même
utilisé par `risc0-build` et le client RISC Zero. Dans ce graphe, les features
de `rzup` sont vides : sa méthode de signature est sous `publish`, absent,
et le chemin d'installation inspecté vérifie des signatures avec une clé
publique officielle. Aucune API RSA privée exposée à distance n'a été
identifiée dans le laboratoire. C'est une analyse limitée du graphe et des
points d'appel, **pas** une preuve générale de non-exploitabilité ni une
raison de masquer l'avis. [RUSTSEC-2023-0071](https://rustsec.org/advisories/RUSTSEC-2023-0071.html),
[suivi amont](https://github.com/RustCrypto/RSA/issues/626).

**Maintenance RISC Zero.** `bincode 1.3.3` (host), `derivative 2.2.0` et
`paste 1.0.15` (host et guest) sont signalés comme non maintenus. Cela ne
démontre pas à soi seul une exploitation, mais laisse un risque de suivi
et de migration. [Bincode](https://rustsec.org/advisories/RUSTSEC-2025-0141.html),
[derivative](https://rustsec.org/advisories/RUSTSEC-2024-0388.html),
[paste](https://rustsec.org/advisories/RUSTSEC-2024-0436.html).

Les graphes capturés sont accompagnés d'un
[relevé des sources examinées](dependencies/reachability-evidence.json)
(versions, chemins relatifs de crate, lignes et SHA-256). Il ne s'agit pas
d'une analyse complète des flux de données ou des binaires produits.

## Décision et travaux requis

Les locks et le guest RISC Zero historiques restent inchangés afin de garder
leurs identités et preuves reproductibles. Ce gel documentaire n'autorise
pas l'usage avec des données sensibles ou l'ouverture d'un service de preuve.
Le périmètre retenu demeure un laboratoire local avec fixtures synthétiques,
sans secrets de production ni endpoint RSA privé. Une sortie de ce périmètre
exige une nouvelle décision de sécurité explicite.

| Suivi | Action attendue | Critères de clôture |
| --- | --- | --- |
| DEP-01 — nettoyage mémoire Horizon | Évaluer une version maintenue de Bulletproofs ou une migration amont relue supprimant `clear_on_drop` | Avis supprimé du graphe réel ; mêmes relations et tests adverses ; preuve historique toujours vérifiée ; examen du nettoyage du witness |
| DEP-02 — logging RISC Zero | Construire un profil candidat séparé avec dépendances arkworks/RISC Zero compatibles avec `tracing-subscriber >=0.3.20` | Scans host/guest sans cet avis ; features contrôlées ; tests de logs hostiles ; nouvel ELF identifié et nouvelle receipt vérifiée indépendamment ; archives antérieures préservées |
| DEP-03 — RSA outillage | Suivre le correctif amont ou une chaîne d'installation maintenue évitant cette implémentation vulnérable | Absence de l'avis ou correctif amont démontré ; signatures de distribution toujours vérifiées ; aucun contournement ni implémentation RSA maison |
| DEP-04 — maintenance et périmètre | Évaluer les remplacements transitifs de bincode/derivative/paste et inventorier séparément le prover externe et les images | Graphe et formats revus, preuves de compatibilité ; scan du binaire/profil effectivement distribué, sans extrapoler depuis le seul workspace |

Reproduction du scan après installation locale de cargo-audit et de la base
au commit indiqué (adapter le chemin de l'exécutable selon le système) :

```powershell
.tools/cargo-audit/bin/cargo-audit.exe audit --json --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/horizon/Cargo.lock
.tools/cargo-audit/bin/cargo-audit.exe audit --json --deny unsound --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/horizon/Cargo.lock
.tools/cargo-audit/bin/cargo-audit.exe audit --json --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/risc0/Cargo.lock
.tools/cargo-audit/bin/cargo-audit.exe audit --json --no-fetch --no-yanked --db .tools/rustsec-advisory-db --file labs/risc0/methods/guest/Cargo.lock
```

Les deux dernières commandes doivent actuellement sortir avec le code 1.
Changer de date de base ou de dépendances exige de publier un nouveau résultat,
sans remplacer les rapports conservés ici.
