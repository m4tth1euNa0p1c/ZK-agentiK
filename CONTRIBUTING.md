# Contribuer à ZK-agentiK

Le dépôt est un laboratoire de preuves et d'autorisation d'outils. Lire
[AGENTS.md](AGENTS.md), [l'architecture](docs/03-ARCHITECTURE.md) et le
[verdict Horizon](docs/horizon/FINAL_VERDICT.md) avant de modifier une frontière
de confiance. Consulter la RFC avant tout changement d'encodage.

## Contribution bornée

Décrire le problème, le périmètre et le test qui pourrait réfuter la solution.
Pour une modification de protocole, joindre relation, hypothèses, compatibilité
et vecteurs partagés. Les adaptateurs non implémentés échouent explicitement.
Les clés, ouvertures et données de test sont synthétiques ; aucune donnée client
ni clé privée générée ne doit entrer dans Git.

Préserver les modifications existantes et annoncer les fichiers possédés si
plusieurs agents travaillent ensemble. Les commits suivent Conventional Commits.
Aucun commit ou push n'est requis pour proposer un diff local reviewable.

## Contrôles

Utiliser les versions verrouillées et le toolchain propre à chaque workspace.
Le workspace racine et les laboratoires peuvent avoir des versions distinctes.

```sh
npm ci
cargo test --workspace --locked
cargo fmt --all -- --check
cargo clippy --workspace --all-targets -- -D warnings
npm test
npm run typecheck
```

Pour les changements Horizon/Proofkit, exécuter également les scripts
`horizon:build`, `test:horizon` et `test:proofkit` applicables depuis `package.json`.
Ne pas traiter les tests racine comme couvrant automatiquement un workspace
Cargo séparé. Les tests d'autorisation doivent constater les effets externes,
y compris zéro effet sur les refus. Un timeout ambigu exige une réconciliation.

Une modification documentaire n'exige pas une campagne cryptographique lourde
sans lien avec le diff. Vérifier ses liens, sources, commandes et assertions.
Pour une revendication de performance, conserver mesures brutes, phases,
environnement, versions, taille et limites ; consulter
[la méthode Horizon](docs/horizon/BENCHMARK_METHODOLOGY.md).

## Présenter le résultat

Une PR indique le comportement obtenu, les validations réellement exécutées et
les inconnues restantes. Ne pas annoncer audit indépendant, conformité, absence
universelle de concurrence ou record sur des relations non équivalentes.
Le [registre des assertions](docs/publication/CLAIMS.md) et la
[checklist de publication](docs/publication/RELEASE_CHECKLIST.md) guident la revue.
Signaler les vulnérabilités selon [SECURITY.md](SECURITY.md).

Le code original est distribué sous [MIT](LICENSE). Ne proposer que du contenu
dont les droits permettent cette distribution ; préserver les licences et
notices tierces applicables. Aucun CLA séparé n'est annoncé par ce document.
