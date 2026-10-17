# horizon-proof — laboratoire, sans effet de paiement

Cette crate compose Bulletproofs 5.0.0, des engagements Pedersen Ristretto,
Ed25519 et Merlin. Elle ne contient ni nouvelle primitive, ni mode simulant une
preuve réussie. Les deux autorités de fixture signent des engagements qu'elles
construisent à partir de leurs valeurs de test. `init` produit des secrets de
laboratoire : sa sortie appartient au processus prover, jamais au vérifieur.

La relation exacte est `1 <= amount <= 2^32` et
`0 <= cap - amount < 2^32`. Les métadonnées et engagements restent publics et
corrélables. Le vérifieur apprend les valeurs en mode `disclosure` uniquement.
Voir [le design](../../../docs/horizon/CRYPTOGRAPHIC_DESIGN.md).

Depuis la racine :

```sh
cargo test --manifest-path labs/horizon/Cargo.toml --locked -p horizon-proof
cargo build --manifest-path labs/horizon/Cargo.toml --locked --release -p horizon-proof
labs/horizon/target/release/horizon-proof-worker
```

Le worker lit une requête JSON par ligne, au plus 64 KiB. Il répond uniquement
`{"ok":true,"result":...}` ou `{"ok":false,"error":"..."}` sur stdout. Il
n'infère pas l'heure : le contrôleur de confiance fournit `now_ms`.

| `op` | Autres champs | Résultat |
|---|---|---|
| `init` | `now_ms` | `Fixture` avec registre, attestations, witness privé, clé privée détenteur, challenge et politique exemples |
| `select` | `policy` | `challenge_bound`, `reusable` ou `disclosure` |
| `prepare` | `evidence`, `witness` | `ReusableProof`, coût initial à mesurer séparément |
| `present` | `evidence`, `prepared`, `holder_secret_hex`, `challenge` | Présentation B, signature fraîche et preuve inchangée |
| `prove` | `evidence`, `witness`, `holder_secret_hex`, `challenge` | Présentation A ou publique ; B doit utiliser `prepare` puis `present` |
| `verify` | `presentation`, `expected`, `trust`, `policy`, `now_ms` | `Verified`, sans witness |

Les types Rust de `src/lib.rs` définissent les champs JSON exacts et rejettent
les champs inconnus. Les encodages cryptographiques sont hexadécimaux minuscules,
de taille exacte. Les signatures utilisent le JSON des structures typées dans
l'ordre déclaré, préfixé par un domaine et un octet nul ; ce codec n'est pas un
format JSON canonique générique et n'autorise pas les maps ou les flottants.

`verify` exige toutes les signatures et re-vérifie toute la preuve à chaque
appel, y compris B. Il compare le challenge complet à `expected` et le registre
à l'époque attendue. Son `expires_at_ms` est le minimum des échéances du
challenge et des deux attestations.
`not_before_ms` est le maximum de leurs trois dates de début ; le contrôleur
recontrôle aussi cette borne après une attente pour détecter un recul d'horloge.

Le contrôleur doit fournir une politique, un registre et un challenge attendus
indépendants de l'agent, tenir une horloge fiable, vérifier les révocations,
réserver durablement nonce/opération, recontrôler les échéances après les
attentes et imposer les préconditions avant mutation. Cette crate stateless ne
promet ni anti-rejeu, ni atomicité multiservice, ni plafond cumulé consommable.

Les tests attaquent la relation, les signatures et la liaison au contexte. Ils
ne remplacent pas un audit cryptographique indépendant. Aucun secret réel ne
doit être confié à cette expérience.

Le benchmark séparé produit des durées brutes en nanosecondes, les tailles de
preuve et d'enveloppe, avec cinq cas synthétiques, 30 passages d'échauffement
par défaut, et l'ordre A/B alterné :

```sh
cargo run --manifest-path labs/horizon/Cargo.toml --locked --release --bin horizon-benchmark -- --samples 500 --warmup 30 --output horizon-samples.json
```

B réutilise exactement la preuve préparée de son cas ; `verify_b_full` effectue
la vérification complète sans cache de preuve ou de verdict. Les générateurs
publics fixes sont préparés une fois par processus via `OnceLock`, sans witness,
RNG ni état d'autorisation partagé. `parameters_standalone` est une mesure
diagnostique de leur construction, à ne pas ajouter aux temps chauds. Les warmups ne figurent pas dans les
échantillons retenus. L'indépendance statistique des observations n'est pas
établie et aucun ratio de vitesse face à une autre relation Vega n'est produit.
