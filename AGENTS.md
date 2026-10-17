# ZK-agentiK / zk-MCP

Ce dépôt développe une proposition expérimentale de protocole et un POC DevSecOps.
Lire `docs/02-ZK-MCP-RFC-SPEC.md` avant de modifier le wire format et
`docs/03-ARCHITECTURE.md` avant de modifier une frontière de confiance.

## Conventions

- Rust 1.93.0, edition 2021 ; `cargo fmt --all -- --check` et
  `cargo clippy --workspace --all-targets -- -D warnings` doivent passer.
- TypeScript strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` ;
  pas de `any` ni de désactivation globale des vérifications.
- Le cœur et le guest restent `#![no_std]` : ni réseau, horloge, RNG, flottants,
  dépendance système ou ordre de hash-map dans l'évaluation. Horodatage et sel
  arrivent de l'hôte ; les entiers du wire sont bornés et les erreurs bloquantes.
- Ne pas réimplémenter la cryptographie. SHA-256 pour les engagements de ce profil.
  Un hachage, une signature et une preuve ZK ont des garanties différentes.
- Commits Conventional Commits : `feat(sdk): ...`, `fix(gateway): ...`,
  `docs(rfc): ...`, `test(bridge): ...`. Aucun commit/push automatique requis.
- Dépendances verrouillées dans Cargo.lock et package-lock.json. Les backends
  non implémentés renvoient une erreur explicite, jamais un succès simulé.

## Invariants

Le simulateur divulgue son witness et ne constitue PAS une preuve ZK. Il est
interdit en mode production. Les credentials de mutation appartiennent au
firewall, jamais à l'agent/prover. Vérifier avant tout effet de bord. Lier
audience, tenant, action, projet, MR, SHA, règle, engagement, nonce et expiration.
Consommer le nonce atomiquement avant la mutation, y compris en concurrence.
Un échec API ambigu ne libère pas le nonce. Ne jamais accepter une politique,
une image, une URL de backend ou une clé de vérification choisie par l'agent.
Réserver également l'opération métier indépendamment du nonce : un nouveau
challenge ne doit pas réautoriser la même mutation. Recontrôler les échéances
après chaque attente précédant le dispatch. Un état `UNKNOWN` exige une
réconciliation ; les stores mémoire du POC ne garantissent pas la reprise.

## Validation et preuves

Exécuter `cargo test --workspace --locked`, `npm test`, `npm run typecheck` et les
checks Rust ci-dessus. Une modification de la frontière d'autorisation exige
un test négatif constatant zéro mutation externe. Ajouter des vecteurs partagés
Rust/TS pour tout changement d'encodage. Mesurer via `npm run benchmark` ; ne
pas transformer un résultat local ou un chiffre d'un article en SLA universel.
La compilation du guest nu n'est pas une preuve d'exécution sous SP1/RISC Zero.

## Skills locaux

- `.agents/skills/zkp-riscv-guest/SKILL.md` : noyau/guest et frontières ABI.
- `.agents/skills/mcp-protocol-security/SKILL.md` : MCP, métadonnées et firewall.
- `.agents/skills/devsecops-connectors/SKILL.md` : acquisition des faits.
- `.agents/skills/qa-benchmark-runner/SKILL.md` : essais adversariaux et mesures.

Les fichiers sont des instructions Markdown portables. Codex découvre `.agents/skills` ;
les autres clients peuvent les lire explicitement ou les importer dans leur
répertoire de skills. Ne pas promettre leur découverte automatique partout.

## Horizon, Proofkit et publication

Lire `docs/horizon/FORMAL_STATEMENT.md` et `docs/horizon/ARCHITECTURE.md` avant
de changer le profil Horizon ou son contrôleur. Le `no_std` déterministe concerne
le cœur/guest historique ; le prover Horizon utilise un RNG cryptographique.
Ne pas enlever son aléa pour obtenir un benchmark déterministe.

Le SDK `packages/proofkit-sdk` centralise le contrat d'outil vérifié ; les
adaptateurs de preuve et de stockage sont de confiance. Aucune garantie de
durabilité, confidentialité ou post-quantique ne découle d'un simple descripteur.
Le MCP Horizon utilise une présentation distincte de l'enveloppe zk-MCP historique.
Ne pas encoder une preuve Bulletproofs dans le schéma RISC-V sans nouvelle RFC.

Pour ce périmètre, ajouter aux contrôles racine : `npm run horizon:build`,
`npm run test:horizon`, `npm run test:proofkit`, `npm run test:risc0:gpu` et
`npm run proofkit -- check`. Respecter les workspaces Cargo séparés. Ne pas lancer
de campagne de performance en concurrence avec compilation ou autre benchmark.

Skills complémentaires :
- `.agents/skills/scientific-whitepaper/SKILL.md` : sources, mathématiques, LaTeX.
- `.agents/skills/evidence-publication/SKILL.md` : assertions et candidat public.
- `.agents/skills/cloud-proof-infrastructure/SKILL.md` : frontières Azure/GCP.
- `.agents/skills/proof-workflow-automation/SKILL.md` : GitHub Actions, preuves et sandbox.

Lors d'un travail multi-agents demandé, assigner les chemins et faire relire par
un autre agent que l'auteur ; utiliser les contrats `.agents/roles/`. Une revue
d'agent est interne et ne clôt jamais le besoin d'audit cryptographique externe.
Les faits commerciaux inconnus restent inconnus. Aucun entretien client inventé.

Conserver les observations datées et les erreurs. MATLAB, Octave, démonstration
sur papier, modèle fini, test applicatif et preuve cryptographique ne sont pas
interchangeables. SHA-256 lie les artefacts, sans certifier leur date ou leur
vérité. Les anciennes mesures ne valident pas les nouveaux transports.
