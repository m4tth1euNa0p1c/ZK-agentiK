# ZK-agentiK · Horizon & Proofkit

Un laboratoire pour créer des outils dont l'action est conditionnée par une
vérification indépendante, avec preuves reproductibles et contrôleur durable.
Rust pour les preuves et les politiques ; TypeScript strict pour le SDK, HTTP et MCP.

**Statut : recherche expérimentale, données synthétiques, aucune opération financière.**
Le profil intégré démontre une autorisation locale de sinistre. La qualification
bancaire, la demande commerciale et la sécurité post-quantique ne sont pas établies.

[Routine de développement avec Claude Code](docs/development/WORK_ROUTINE.md) ·
[Instructions Claude](CLAUDE.md) ·
[Démarrage développeur](packages/proofkit-sdk/README.md) ·
[White paper PDF](docs/whitepaper/whitepaper.pdf) ·
[Circuit : mathématiques et campagnes corrélées](docs/experiments/circuit/README.md) ·
[Dossier de publication](docs/publication/README.md) ·
[Recherche et historique](docs/README.md)

Les [contrôles de publication datés](docs/publication/PUBLICATION_REVIEW_2026-10-17.md)
relient les tests exécutés, les artefacts CI et les limites encore ouvertes.

## Le besoin à éprouver

Un délégataire et un assureur veulent vérifier qu'un montant admissible respecte
un plafond, sans révéler ces deux valeurs au contrôleur. Horizon prouve une
relation sur des engagements signés, puis lie l'autorisation à un dossier, un
client, une politique et un challenge frais. Le contrôleur réserve l'opération
durablement avant d'enregistrer l'effet synthétique.

Cette hypothèse exige un acteur autorisé à connaître les deux ouvertures et
des émetteurs fiables. Si un verdict signé ou une divulgation acceptable suffit,
la ZK n'est pas nécessaire. Aucun acheteur ni budget n'est validé :
[protocole de qualification](docs/horizon/REVIEW_PROTOCOL.md),
[alternatives et antériorités](docs/horizon/NOVELTY_AND_PRIOR_ART.md).

## Exécuter une preuve réelle

Node **24.11+**, Rust **1.93.0** via rustup et linker natif sont requis. Sous
Windows : outils C++ MSVC. Docker est nécessaire aux profils math, Vega, RISC Zero
et au déploiement isolé, pas à la démo Horizon native.

```sh
npm ci --ignore-scripts
npm run proofkit -- doctor
npm run proofkit -- run horizon
```

Le profil construit Horizon, vérifie une fixture publique puis génère une
présentation Bulletproofs réelle pour un nouveau challenge : preuve invalide
refusée, une écriture SQLite autorisée, rejeu refusé. Le prover et le vérifieur
utilisent des workers distincts. Les journaux restent localement dans `.tools/`.

Pour la démonstration web persistante :

```sh
npm run horizon:init
npm run horizon:serve
# http://127.0.0.1:38080 — données synthétiques uniquement
```

`init` refuse d'écraser une configuration existante. Pour Docker et l'isolation
des secrets, suivre [le guide sandbox](docs/horizon/DEPLOYMENT.md).

## Créer un outil vérifié

Le [SDK Proofkit](packages/proofkit-sdk/) fournit `defineVerifiedTool` : schémas
stricts, entrées bornées, attentes fixées côté serveur, contrôle après attente,
capacités limitées et absence de retry automatique d'une mutation ambiguë.
Le développeur fournit les adaptateurs de preuve et de contrôle durable.
Le SDK ne certifie pas un adaptateur arbitraire et ne génère pas un circuit sûr.

L'[exemple compilé](packages/horizon-demo/src/tool.ts) est utilisé par HTTP et
par deux outils exposés avec le SDK MCP officiel, `horizon_issue_challenge` et
`horizon_authorize_claim`. Pour un client MCP, après le build :

```sh
node packages/horizon-demo/dist/mcp-stdio.js <public.json> <dedicated-sandbox.sqlite>
```

Seule la configuration **publique** entre dans ce serveur. La preuve est produite
côté fournisseur. Ce transport n'expose ni prover privé ni administration et ne
transforme pas le reçu HTTP/MCP en preuve de l'exécution d'une API distante.

## Auditer les preuves

```sh
npm run proofkit -- list
npm run proofkit -- check
npm run proofkit -- seal evidence/manifests/my-review.json
npm run proofkit -- verify evidence/manifests/my-review.json
```

Le [registre](evidence/catalog.json) distingue démonstration mathématique,
tests numériques, preuves cryptographiques, mesures et résultats non établis.
Un manifeste lie les octets explicitement listés par SHA-256 ; il ne certifie
ni leur vérité, ni leur auteur, ni une date indépendante. Les commandes,
limites et profils sont documentés dans [Proofkit CLI](tools/proofkit/README.md).

```sh
npm run proofkit -- run math          # Octave, pas une exécution MATLAB
npm run proofkit -- run risc0-public  # Receipts historiques, Docker préparé
npm run proofkit -- run vega-sha256   # Opt-in long : compilation et benchmarks
```

La [source LaTeX](docs/whitepaper/whitepaper.tex), la bibliographie, les
[scripts MATLAB/Octave](math/) et les rapports datés sont disponibles.
Les [expériences GPU](docs/experiments/gpu/README.md) ont un périmètre distinct.
`--require-post-quantum` refuse les profils livrés ; aucune protection plus faible
n'est sélectionnée silencieusement.

## Trois périmètres distincts

| Périmètre | Garantie testée | Limites |
| --- | --- | --- |
| Horizon + Proofkit | Bulletproofs réelles, attestations synthétiques, autorisation fraîche et durable locale | Ristretto/Ed25519 classiques, métadonnées corrélables, cible SQLite locale |
| Laboratoire RISC Zero | Receipts Succinct réels sur une politique DevSecOps signée | Source de fixture ; intégration au MCP DevSecOps non livrée |
| MCP DevSecOps historique | Politique Rust `no_std`, liaison au contexte, refus et déduplication locale | Simulateur divulguant le witness, interdit en production |

`npm run demo:critical` reste la démo du **simulateur** historique. Les backends
non implémentés refusent explicitement l'appel. Les mesures CPU antérieures sont
conservées avec leur configuration ; elles ne mesurent pas automatiquement les
nouveaux transports. Vega SHA-256 et Horizon ne prouvent pas la même relation :
aucun record comparatif n'est revendiqué.

## Contribuer et personnaliser l'infrastructure

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
npm test
npm run typecheck
npm run horizon:build
npm run test:horizon
npm run test:proofkit
npm run test:risc0:gpu
```

Voir [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md),
[skills](.agents/skills/) et [rôles de revue](.agents/roles/).
Le [workflow GitHub Actions réutilisable](docs/publication/GITHUB_ACTIONS.md)
automatise les profils de preuve et un déploiement Docker éphémère sur le runner.
Les fondations [Azure/Bicep](infra/azure/) et [GCP/Terraform](infra/gcp/)
exposent réseau et identités configurables. Elles ont été validées localement,
sans déploiement : [comparaison et décisions restantes](docs/publication/CLOUD_COMPARISON.md).
IAM, clés réelles, contrôleur partagé et reprise face à une API distante restent
à qualifier avant un runtime cloud sensible.

Les prochaines décisions sont H11 (besoin client), H13 (sources authentiques),
H14 (cible distante), H15 (audit externe) et H17 (exploitation). Le
[prompt de reprise](docs/publication/NEXT_PROMPT.md) les rend testables.

[Sécurité](SECURITY.md) · [Licence MIT](LICENSE) ·
[Notices tierces](THIRD_PARTY_NOTICES.md) · [Citation](CITATION.cff)
