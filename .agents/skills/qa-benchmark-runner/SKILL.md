---
name: qa-benchmark-runner
description: Vérifier les règles, l'intégration MCP et les performances de ZK-agentiK avec scénarios adverses, compteurs d'effets et séparation des mesures simulation/ZK.
---

# Tests et mesures

Lire `docs/04-VALIDATION.md`, les fixtures partagées et le profil critique.
Le simulateur doit exercer le vrai Rust, pas une imitation TypeScript.

## Invariants d'abord

Exécuter `cargo test --workspace --locked`, `npm test`, `npm run typecheck`,
`cargo fmt --all -- --check`, `cargo clippy --workspace --all-targets -- -D warnings`
et `npm run build:guest`. Vérifier le succès de chaque commande séparément.
Les tests négatifs inspectent l'absence de mutation et pas seulement un message.

Maintenir les cas : 16 combinaisons de politique de base, bornes entières,
witness/journal/image substitués, preuve absente, backend inconnu, reprise après
échec, rejeu concurrent, expiration pendant prove/verify, faits changés,
suppression des contrôles critiques et arrêt d'urgence pendant la preuve.
Faire passer les scénarios MCP sur le client officiel, dont stdio.

## Protocole performance

`npm run benchmark` construit le worker release, effectue 30 échauffements et
300 mesures par catégorie. Le rapport distingue génération, vérification
autorisante, rejet métier et reçu corrompu ; il conserve p50, p95, maximum,
tailles, machine, runtime et identifiant d'image. Le chemin IPC est inclus,
les APIs distantes sont exclues. Les buffers privés ne vont pas dans le rapport.

La commande `npm run benchmark -- --enforce-5ms` vérifie **p95 < 5 ms** pour
les deux catégories de refus. Conserver aussi le maximum observé et signaler
tout dépassement. Une campagne finie ne prouve pas « systématiquement moins
de 5 ms » ; un OS non temps réel ne donne pas cette garantie.

Ne pas comparer le reçu de quelques centaines d'octets du simulateur aux
preuves Magnetar/SP1/RISC Zero. Pour un backend réel : publier version, type
de preuve, paramètres de sécurité/ZK, cycles, prétraitement, RAM, threads,
accélération, coûts cold/warm, tailles et résultats de vérification falsifiée.
