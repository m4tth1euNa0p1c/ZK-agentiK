# ZK-agentiK

POC expérimental de contrôle DevSecOps avant effet de bord, transporté par MCP.
Le moteur métier est en Rust `no_std`, le SDK et la gateway en TypeScript strict.

**[Dossier complet des recherches, preuves et décisions](docs/README.md)** :
sources, concurrence, revues contradictoires, sécurité, benchmarks et roadmap.

**Le serveur MCP de démonstration utilise un simulateur natif.** Les connecteurs
sont des fixtures locales : aucun merge GitLab réel ni déploiement n'est effectué.
Ses hooks SP1, RISC Zero et Magnetar renvoient explicitement `BACKEND_UNAVAILABLE`.
Le banc séparé `labs/risc0` fournit désormais un **adaptateur Rust RISC Zero réel**,
un guest à source signée de test et un vérifieur indépendant. Il vérifie des
challenges historiques, sans accès aux APIs de production.

La recherche a identifié plusieurs équivalents. La piste retenue est une
**admission confidentielle d'artefacts entre entreprises**, à comparer aux
solutions existantes : [analyse et contradictions](docs/06-MARKET-NICHE-AND-CHALLENGE.md).
Ce dépôt ne revendique pas un premier standard mondial ou un marché vierge.

## Lancer

**Programme Horizon — 17 octobre 2026.** Un laboratoire distinct teste une
autorisation de sinistre synthétique avec de vraies preuves Bulletproofs,
attestations signées, vérifieur indépendant et contrôleur SQLite durable.
Les benchmarks Vega publiés sont reproduits sur leur relation SHA-256 ; aucune
supériorité globale ni validation commerciale n'est revendiquée.
[Dossier de décision](docs/horizon/FINAL_VERDICT.md) ·
[Déploiement et application web](docs/horizon/DEPLOYMENT.md) ·
[Résultats reproductibles](docs/horizon/BENCHMARK_RESULTS.json).

```sh
# Node 24.11.1+ et Rust 1.93.0
npm ci --ignore-scripts
npm run horizon:build
npm run horizon:demo
```

Les commandes suivantes restent celles du POC MCP historique.

Prérequis : Node.js 22.14+ (24 testé), Rust via rustup, toolchain 1.93.0 et linker
natif. Sous Windows, les outils C++ MSVC sont nécessaires. `scripts/cargo.mjs`
retrouve aussi Cargo dans `~/.cargo/bin` lorsqu'il n'est pas encore dans PATH.

```bash
npm ci --ignore-scripts
npm run demo
npm run demo:critical
```

La première démo connecte un client MCP officiel au serveur stdio et montre
autorisation, mauvais projet et reçu falsifié. La démo critique teste un dossier
complet puis **23 scénarios adverses**, avec zéro merge supplémentaire.

Le profil critique couvre séparation des rôles, MFA attestée, révision approuvée,
fraîcheur, fenêtre, scans, SBOM/provenance, récupération, canary, incident et
arrêt d'urgence. Les seuils sont des exemples de test : [logique métier](docs/05-CRITICAL-PLATFORM-POLICY.md).

## Preuve RISC Zero réelle, opt-in

Docker Linux doit fonctionner et disposer d'au moins 12 GiB de RAM pour le
conteneur. La première exécution installe les outils épinglés puis compile.
La génération CPU peut prendre plusieurs minutes par preuve.

```bash
npm run lab:risc0 -- verify
npm run lab:risc0 -- critical 3
npm run lab:risc0 -- denied 1
```

`verify` reconstruit le vérifieur et contrôle les deux preuves publiques livrées,
sans relancer leur génération. Le banc CPU a produit quatre preuves réelles :
154–163 s par preuve autorisante, vérification p95 13,70 ms, rejet d'un seal
altéré p95 6,95 ms. L'objectif de 5 ms et le TTL synchrone de 30 s échouent ici.

Les calculs de preuve s'effectuent sans réseau Docker attaché. Le runner
exporte preuve, enveloppe, challenge public et mesures dans
`tests/benchmarks/results/risc0/`. Un second conteneur vérifie le résultat
autorisé avec seulement le binaire vérifieur et les artefacts publics.
L'autorité de fixture possède une clé de test publique : aucune provenance
fournisseur réelle n'est revendiquée. La confidentialité critique de cette
pile reste non démontrée : [modèle et limites](docs/07-STACK-SECURITY-AND-PERFORMANCE.md),
[résultats du banc](docs/08-RISC0-LAB-RESULTS.md).

## Serveur MCP local

Après `npm run build:rust` et `npm run build` :

```bash
node packages/enterprise-gateway/dist/stdio.js
```

Utiliser une commande `node` et un chemin absolu vers ce fichier dans le client
MCP. L'outil est `verifiable_gitlab_merge`, avec arguments :

```json
{
  "project_id": 1,
  "merge_request_iid": 7,
  "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
}
```

Définir `ZK_MCP_SCENARIO=critical` dans l'environnement du serveur pour le profil
critique. `NODE_ENV=production` ou `ZK_MCP_MODE=production` refuse le démarrage.
Ne jamais placer de données confidentielles dans ce simulateur : son reçu expose
le witness. Le profil ZK futur doit fournir un véritable backend et des domaines
fournisseur/vérifieur distincts.

## Vérifier

```bash
cargo test --workspace --locked
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
npm test
npm run typecheck
npm run schema:check
npm run build:guest
npm run benchmark -- --enforce-5ms
```

Si Cargo n'est pas dans PATH, remplacer `cargo` par `node scripts/cargo.mjs`.
`build:guest` compile et inspecte un **ELF RISC-V nu de faisabilité**, sans
exécution sous SP1/RISC Zero. Le benchmark mesure le simulateur Rust release
avec IPC ; le seuil de 5 ms est un critère p95 de rejet, pas un SLA de preuve ZK.
Résultats et limites : [rapport de validation](docs/04-VALIDATION.md).

## Structure

```text
AGENTS.md
.agents/skills/{zkp-riscv-guest,mcp-protocol-security,devsecops-connectors,qa-benchmark-runner}/
.github/workflows/ci.yml
docs/
  01-RESEARCH-AND-GAP-ANALYSIS.md
  02-ZK-MCP-RFC-SPEC.md
  03-ARCHITECTURE.md
  04-VALIDATION.md
  05-CRITICAL-PLATFORM-POLICY.md
  06-MARKET-NICHE-AND-CHALLENGE.md
  07-STACK-SECURITY-AND-PERFORMANCE.md
  08-RISC0-LAB-RESULTS.md
  schemas/zkp-envelope.schema.json
crates/{policy-engine-core,policy-statement,policy-guest-riscv,zkvm-bridge}/
labs/risc0/                      # guest et adaptateur réels, vérifieur, lockfiles
packages/{zk-mcp-sdk,enterprise-gateway}/
tests/{fixtures,e2e-poc,benchmarks}/
scripts/{cargo,schema,check-guest,risc0-lab}.mjs
issues/                         # 10 tickets, 3 jalons
```

## Limites et suite

Les garanties actuelles : contrôle de politique, liaison du reçu à l'action,
rejeu et déduplication d'opération dans **une instance**, refus sur expiration,
altération et changement de facts. Les stores mémoire disparaissent au
redémarrage. Un scan/MFA/SBOM de fixture n'est pas une preuve d'origine.

L'intégration des preuves réelles dans le serveur MCP, les attestations d'autorités, contrôleurs de promotion,
vérifieur WASM, audit durable, recovery et Docker de production sont à construire.
Le mode critique livré gèle les changements ordinaires pendant un incident ;
il ne fournit pas de rollback d'urgence. Voir [les dix issues](issues/README.md).

Le guest **02** et le backend **01** disposent d'un premier chemin réel de
laboratoire. Priorités techniques : comparaison et latence **03**, fraîcheur
**02/01**, autorités et confidentialité **07**, firewall durable **08**, puis
intégration SDK/vérifieur **04–05**, pilote **06**, audit **09**, déploiement **10**.

Licence du code de ce dépôt : MIT. Les dépendances conservent leurs licences.
