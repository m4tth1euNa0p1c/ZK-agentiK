# Oracle entier de la relation Horizon

`circuit_oracle.m` calcule exactement, pour deux valeurs `u64` synthétiques :

```text
1 <= amount <= 2^32 && cap >= amount && cap - amount < 2^32
```

Il ne vérifie aucune signature ni preuve ZK. Un `status: "pass"` signifie que
le corpus entier a été traité sans erreur ; chaque cas possède sa propre
décision `accept`, qui peut être fausse. La relation et sa démonstration
conditionnelle sont dans le [supplément LaTeX](../../docs/whitepaper/circuit-validation.tex).

## Interface et encodage

```matlab
addpath('math/circuit');
result = circuit_oracle('/chemin/vectors.json', '/nouveau/chemin/octave.json');
```

L'entrée est un **tableau JSON plat**, de 1 à 10 000 objets exactement :

```json
[
  {"id":"edge-1","category":"boundary","amount":"1","cap":"4294967296"},
  {"id":"edge-2","category":"underflow","amount":"1","cap":"0"}
]
```

- `amount` et `cap` : chaînes décimales canoniques entre `"0"` et
  `"18446744073709551615"`. Nombres JSON, signes, espaces dans la chaîne,
  zéros initiaux, exposants, fractions et débordements sont refusés.
- `id` et `category` : `[a-z0-9-]{1,64}` (tiret initial autorisé) ; les identifiants
  doivent être uniques. Les catégories n'influencent jamais le verdict.
- Quatre membres exactement, avec les noms littéraux ci-dessus : un membre
  `expected`, un membre dupliqué ou une normalisation ambiguë est refusé.
- Taille maximale 4 Mio, ASCII sans BOM ni échappement JSON. L'ordre des
  membres et les espaces JSON ordinaires sont libres. Le décodage utilise
  `jsondecode`, complété par des contrôles de forme et de schéma.
- Le parent du fichier de sortie doit exister. Un fichier de sortie existant
  n'est jamais volontairement écrasé. Cette garde suppose un dossier contrôlé
  sans écrivain hostile concurrent ; ce n'est pas une sandbox de fichiers.

Le résultat conserve l'ordre du corpus et contient :

```text
schema: horizon-circuit-oracle-v1
runtime: GNU Octave | MATLAB
runtime_version, executed_in_matlab, generated_at_utc
clock_attestation: local-clock-unattested
case_count
cases: [{id, amount, cap, accept, x_decimal, d_decimal}, ...]
status: pass
integer_arithmetic: uint64-guarded
negative_difference_encoding: empty-string
cryptographic_verification: false
machine_checked_proof: false
```

`x_decimal` est `amount−1`, ou `""` si `amount=0`. `d_decimal` est
`cap−amount`, ou `""` si `cap<amount`. Les différences non négatives sont
rendues même si le cas est refusé pour dépassement de plage. Une chaîne vide
ne doit pas être interprétée comme zéro. `cases` reste un tableau, même pour
un seul cas. Aucun résultat partiel n'est émis après une entrée invalide.

## Exactitude et incident détecté

Le parsing accumule des chiffres dans un `uint64`, après vérification de
`v < Q || (v == Q && digit <= 5)`, avec
`Q = 1844674407370955161 = floor(UINT64_MAX/10)`. Ce seuil est construit à
partir de petits blocs entiers ; aucune conversion d'un grand littéral
`double`, aucun `str2double` et aucune saturation ne servent à valider une
entrée. Toute soustraction est précédée de sa garde d'ordre.

Les premiers tests sous GNU Octave 7.3.0 ont trouvé un problème de formatage
utilisant `idivide(...,10,'floor')` aux maxima des types : le test `u64` a
observé `18446744073709551620` au lieu de `18446744073709551615`, puis le
test `u32` a observé `4294967300` au lieu de `4294967295`. Ces exécutions
ont échoué ; elles ne sont pas des résultats validés.

La source livrée n'utilise **aucun `idivide` dans l'oracle**. Une division
binaire garde le reste dans `0..9` pour les grandes valeurs. Le chemin court
`floor(double(v)/10)` ne reçoit que `v <= 2^32−1`, donc des entiers exactement
représentables avec une marge d'arrondi suffisante au plancher. Les conversions
des chiffres en `double` sont bornées à `0..9`.

L'autotest expose des diagnostics de la division native pour le runtime
exécuté, sans exiger que MATLAB ou une autre version reproduise ce problème.
Les garanties cryptographiques ne dépendent pas de ces diagnostics.

## Exécution réelle et tests

L'interface utilise une syntaxe MATLAB avec `jsondecode`/`jsonencode`
(disponibles depuis R2016b). La compatibilité source n'est pas une preuve
d'exécution. Lire `runtime`, `runtime_version` et `executed_in_matlab` dans
chaque résultat ; un job prévu, une licence disponible ou un résultat Octave
ne doivent pas être annoncés comme un succès MATLAB.

Autotests, dans l'un ou l'autre runtime :

```matlab
addpath('math/circuit');
report = run_oracle();
```

Essai local effectué le 17 octobre 2026 sous **GNU Octave 7.3.0** : 11
frontières, 36 entrées invalides rejetées, refus d'écrasement et exploration
exhaustive de `[0,63]^2` : 4 096 paires, 2 016 acceptées. Ces tests incluent
`UINT64_MAX`, des valeurs supérieures à `2^53`, une soustraction négative,
les membres/identifiants dupliqués et la limite de 10 000 entrées. Ils
n'exécutent pas Rust et ne prouvent pas la sécurité de Bulletproofs.

L'image de documentation déjà construite localement est
`horizon-math-paper:local`, ID observé :
`sha256:34f91a54d3dd4514f4e5737b503bf8476486ce92c9d688cba2182d5b6ac5d910`.
Ce tag local n'est pas une image publique ni une promesse de reconstruction
bit à bit. Son Dockerfile est [math/Dockerfile](../Dockerfile).

Depuis la racine du dépôt, PowerShell :

```powershell
$repoPath = (Get-Location).Path
docker run --rm --network none --cpus 2 --memory 2g `
  --mount "type=bind,source=$repoPath/math/circuit,target=/src,readonly" `
  horizon-math-paper:local octave --no-gui --quiet --eval "addpath('/src'); run_oracle();"
```

Pour une campagne, monter également un **nouveau** dossier d'artefacts en
`/out`, puis appeler
`circuit_oracle('/out/vectors.json','/out/octave.json')`. Le runner corrélé
enregistre commandes, versions, empreintes, compteurs et erreurs. Un job
MATLAB peut appeler la même fonction avec un nouveau nom `matlab.json`.

## Corrélation et PDF

Le comparateur doit joindre exactement les IDs et valeurs entre le corpus,
BigInt, le runtime numérique et Rust. Un refus du prover avant génération
ne compte pas comme rejet cryptographique d'une preuve. Une campagne doit
séparer ces étapes et conserver les erreurs ; ses nombres effectifs ne sont
pas déduits des paramètres 128, 1 024 ou 4 096.

Le supplément ne remplace pas le manuscrit initial. Reconstruction PDF :

```powershell
$repoPath = (Get-Location).Path
docker run --rm --network none --cpus 2 --memory 2g `
  --mount "type=bind,source=$repoPath,target=/work" `
  horizon-math-paper:local sh /work/docs/whitepaper/build-circuit.sh
```

Le script compile `circuit-validation.tex` et sa bibliographie, puis extrait
le texte et rend toutes les pages dans `docs/whitepaper/build/circuit/`.
Il ne modifie pas l'ancien PDF. Le supplément utilise un schéma conceptuel ;
les graphiques chiffrés du runner doivent être lus avec leurs artefacts de
campagne, sans importer silencieusement des mesures historiques.

Sources primaires consultées le 17 octobre 2026 :
[JSON MATLAB](https://www.mathworks.com/help/matlab/ref/jsondecode.html),
[entiers MATLAB](https://www.mathworks.com/help/matlab/matlab_prog/integers.html),
[arithmétique Octave 7.3](https://docs.octave.org/v7.3.0/Integer-Arithmetic.html),
[Bulletproofs corrigé](https://eprint.iacr.org/2017/1066),
[API RangeProof 5.0.0](https://docs.rs/bulletproofs/5.0.0/bulletproofs/struct.RangeProof.html),
[RFC 9496](https://www.rfc-editor.org/rfc/rfc9496.html).
