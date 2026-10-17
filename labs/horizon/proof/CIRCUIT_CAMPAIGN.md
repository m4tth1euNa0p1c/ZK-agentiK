# Campagne synthétique séparant prover et vérifieur

Le binaire `circuit_campaign` exerce la vraie bibliothèque Horizon et
Bulletproofs 5.0.0. Il ne crée aucune autorisation métier, aucun effet financier
et aucun store. Les attentes, clés publiques, politique et temps de chaque
requête sont des entrées du **banc synthétique**, pas des paramètres à accepter
d'un client dans un service d'autorisation.

```sh
cargo build --manifest-path labs/horizon/Cargo.toml --locked --release --bin circuit_campaign
labs/horizon/target/release/circuit_campaign generate --vectors vectors.json --output new-prover-directory
labs/horizon/target/release/circuit_campaign verify --requests new-prover-directory/verification-requests.ndjson --output new-verifier-results.json
```

Sous Windows, ajouter `.exe` au binaire. `node scripts/cargo.mjs` peut remplacer
`cargo` lorsque rustup n'est pas dans le PATH. Les deux commandes sont des
processus distincts ; `generate` n'appelle pas le vérifieur. Le second processus
n'a besoin que du NDJSON public. Il n'est pas, à lui seul, une isolation réseau,
un conteneur indépendant ou un audit externe.

## Entrées et sorties

`--vectors` reçoit un tableau JSON de 1 à 10 000 objets stricts :

```json
[{"id":"boundary-1","category":"valid-boundary","amount":"4294967296","cap":"8589934591"}]
```

`id` est unique. `id` et `category` respectent `[a-z0-9-]{1,64}`, comme les
vecteurs JavaScript et l'oracle. Les montants sont des chaînes décimales canoniques
`u64` : `0` est admis comme entrée négative de campagne ; signes, espaces,
zéros initiaux, flottants et dépassements sont refusés. Aucun verdict attendu
n'est accepté dans ces vecteurs. Limite du fichier : 4 Mio.

Le répertoire de sortie doit être neuf, avec parent existant. Il contient :

- `prover-results.json`, schéma `horizon-circuit-prover-v1`, `status:complete`,
  hashes des vecteurs et requêtes, compteurs et tableau `cases`.
- `verification-requests.ndjson`, une requête publique par ligne, exactement
  `{id,test,expected_accept,request:{presentation,expected,trust,policy,now_ms}}`.

Chaque cas du rapport contient `id`, `category`, `amount`, `cap`,
`native_accept`, `native_a_accept`, `native_b_accept`, les éventuels
`native_a_error`/`native_b_error`, `request_count`, et
`generation:{a_ns,b_ns,direct_a_ns?,direct_b_ns?}`. `native_accept` est la
conjonction des deux observations ; un corrélateur doit aussi examiner
**chaque** observation A/B. Les erreurs natives attendues, dans cet ordre,
sont `AMOUNT_RANGE`, `CAP_BELOW_AMOUNT`, `DIFFERENCE_RANGE`.

Les nombres source sont volontairement publics et synthétiques pour permettre
la comparaison BigInt/Octave/MATLAB/Rust. Cela n'est pas une expérience de
confidentialité contre un vérifieur ignorant ces nombres. Les ouvertures
aléatoires, clés privées et objets witness ne sont jamais sérialisés dans
ces sorties. Chaque `Fixture::with_values` génère de nouvelles clés et
ouvertures avec `OsRng`, et chaque nouvelle preuve utilise cet aléa sécurisé.
Le temps logique fixe `1800000000000` sert seulement aux tests d'intervalles.

`verify` produit le schéma `horizon-circuit-verifier-v1`, `status:complete`,
hash du NDJSON lu, compteurs et `cases:[{id,test,accepted,error?,duration_ns}]`.
Il ne consulte **jamais** `expected_accept` pour décider ; seule la vraie
fonction `horizon_proof::verify` détermine acceptation et erreur, avec refus
explicite des payloads `Disclosure`. Le corrélateur externe doit comparer
les identifiants, familles, codes, hashes et nombres de lignes, pas seulement
le compteur des succès. Un rejet cryptographique normal donne `accepted:false`
et un code de sortie processus 0 ; entrée malformée ou défaut d'exécution
donne un code non nul et ne constitue pas une campagne terminée.

## Familles exactes

Pour chaque couple arithmétiquement valide, 16 requêtes sont produites :

| `test` | Résultat attendu / code |
| --- | --- |
| `a_valid` | accepté |
| `b_valid` | accepté |
| `b_scalar_corruption` | `INVALID_RANGE_PROOF` |
| `a_challenge_transplant` | `INVALID_RANGE_PROOF` |
| `b_authority_key_substitution` | `INVALID_SIGNATURE` |
| `b_issuer_signature_corruption` | `INVALID_SIGNATURE` |
| `b_holder_signature_corruption` | `INVALID_SIGNATURE` |
| `b_policy_epoch` | `POLICY_MISMATCH` |
| `b_reuse_forbidden` | `REUSE_FORBIDDEN` |
| `b_expected_context` | `CHALLENGE_MISMATCH` |
| `b_subject_transplant` | `SUBJECT_MISMATCH` |
| `b_expired_challenge` | `CHALLENGE_EXPIRED` |
| `b_future_challenge` | `CHALLENGE_EXPIRED` |
| `b_expired_evidence` | `EVIDENCE_EXPIRED` |
| `b_trust_epoch` | `TRUST_EPOCH_MISMATCH` |
| `b_evidence_join` | `EVIDENCE_JOIN` |

La corruption B incrémente le scalaire canonique `t_x` du format Bulletproofs 5
et vérifie que `RangeProof::from_bytes` le décode encore. Le détenteur signe
ensuite la présentation altérée. La transplantation A conserve la preuve,
change le nonce dans la présentation **et** le challenge attendu, puis signe
avec le vrai détenteur. Ces refus doivent atteindre `INVALID_RANGE_PROOF`,
pas simplement échouer au parsing ou à la signature. Les autres mutations
exercent des frontières distinctes ; une entrée inchangée sert de contrôle.

Pour chaque couple invalide, deux requêtes sont produites :
`a_direct_bypass` et `b_direct_bypass`, toutes deux attendues avec
`INVALID_RANGE_PROOF`. Après avoir relevé les refus natifs A/B, le programme
appelle directement `RangeProof::prove_multiple_with_rng`, avec les mêmes
domaines de transcript et attestations, sans appeler le contrôle natif.
Les valeurs candidates sont `a.wrapping_sub(1)` et `c.wrapping_sub(a)` en
`u64`, et les masques sont `r_a` et `r_c-r_a` en scalaires.

Ce wrapping est une stratégie d'attaque déterminée, pas une transformation
correcte des entiers signés ni une recherche exhaustive de tous les provers
malveillants. Le vérifieur dérive toujours `A-G` et `C-A` des engagements
originaux signés. Lorsque la soustraction déborde, les engagements candidats
peuvent donc différer de ceux attendus ; le rejet teste cette liaison aussi.
Chaque candidat porte une signature du détenteur valide. Les tests internes
incluent des candidats directs **valides** A/B pour contrôler la parité des
encodages et des domaines avec la bibliothèque.

Une campagne de 4 096 cas produit 8 192 preuves/candidats initiaux, soit deux
par cas. Les présentations corrompues dérivées ne sont pas comptées comme de
nouvelles générations de preuve. Les familles sont choisies par une relation
entière locale indépendante du résultat natif ; le corrélateur doit comparer
cette classification aux calculs des autres runtimes.

## Bornes, conservation et mesures

Les fichiers sont créés avec `create_new` ; aucun résultat existant n'est
remplacé. Les chemins contenant `..` ou un lien symbolique observé sont refusés.
Cela suppose un filesystem local de confiance : ces vérifications ne prouvent
pas une résistance aux courses d'un administrateur modifiant les répertoires.
Une erreur laisse les sorties partielles sur place. Un rapport absent, vide,
incomplet ou sans `status:complete` ne doit pas être présenté comme réussi.

Le NDJSON est lu en flux : 64 Kio maximum par ligne (fin de ligne comprise),
1 Gio par fichier et 200 000 requêtes. Le couple `(id,test)` doit être unique.
Les rapports synthétiques sont gardés en mémoire sous ces bornes. Les durées
sont des nanosecondes entières limitées à `2^53-1` pour une lecture JSON exacte.
Elles ne fournissent ni échauffement, ni répétitions IID, ni p95/p99 fiable,
ni SLA. L'émission des fixtures, le parsing, les sorties et l'IPC sont exclus.
`b_ns` comprend préparation et signature de présentation ; les phases directes
incluent la construction des générateurs, contrairement aux générateurs fixes
mis en cache par la bibliothèque native. Le premier appel natif peut initialiser
ces générateurs. Ces phases ne doivent pas être comparées comme des profils
de coût équivalents.

```sh
cargo test --manifest-path labs/horizon/Cargo.toml --locked --bin circuit_campaign
cargo clippy --manifest-path labs/horizon/Cargo.toml --locked --bin circuit_campaign -- -D warnings
```

Les tests internes couvrent les frontières réelles, les erreurs précises,
les attaques résignées, l'indépendance du verdict face à `expected_accept`,
les entrées malformées, les doublons et le refus de remplacer les sorties.
Ils ne prouvent pas la soundness cryptographique, la vérité d'un émetteur,
la non-corrélation, la sécurité post-quantique ou l'atomicité d'une API distante.
