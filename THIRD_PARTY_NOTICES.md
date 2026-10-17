# Dépendances et notices tierces

État de l'inventaire : 17 octobre 2026. Le code original de ce dépôt est sous
[licence MIT](LICENSE). Les composants tiers conservent leurs licences. Ce
document identifie des composants structurants ; **ce n'est pas l'inventaire
exhaustif des dépendances transitives ni un avis juridique**.

Les versions ci-dessous ont été relevées dans les manifests/lockfiles et les
métadonnées des paquets installés pour ce laboratoire. Avant redistribution d'un
binaire, conteneur ou bundle, établir l'inventaire de cette distribution exacte
et inclure les textes, copyrights et éventuels fichiers NOTICE exigés. Une URL
de licence ne remplace pas l'inclusion d'un texte quand la licence l'exige.

| Composant | Version observée | Licence déclarée | Origine |
| --- | --- | --- | --- |
| MCP TypeScript SDK | 1.32.1 | MIT | [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) |
| Zod | 4.6.7 | MIT | [colinhacks/zod](https://github.com/colinhacks/zod) |
| TypeScript | 5.9.3 | Apache-2.0 | [microsoft/TypeScript](https://github.com/microsoft/TypeScript) |
| Bulletproofs | 5.0.0 | MIT | [zkcrypto/bulletproofs](https://github.com/zkcrypto/bulletproofs) |
| curve25519-dalek | 4.1.3 | BSD-3-Clause | [dalek-cryptography](https://github.com/dalek-cryptography/curve25519-dalek) |
| ed25519-dalek | 2.2.0 | BSD-3-Clause | [dalek-cryptography](https://github.com/dalek-cryptography/curve25519-dalek) |
| Merlin | 3.0.0 | MIT | [zkcrypto/merlin](https://github.com/zkcrypto/merlin) |
| SHA-2 | 0.10.9 | MIT OR Apache-2.0 | [RustCrypto/hashes](https://github.com/RustCrypto/hashes) |
| Serde | 1.0.228 | MIT OR Apache-2.0 | [serde-rs/serde](https://github.com/serde-rs/serde) |
| serde_json | 1.0.149 | MIT OR Apache-2.0 | [serde-rs/json](https://github.com/serde-rs/json) |
| rand | 0.8.6 (Horizon courant ; 0.8.5 historique) | MIT OR Apache-2.0 | [rust-random/rand](https://github.com/rust-random/rand) |

« OR » signifie une alternative déclarée par le composant, pas un cumul de
licences. Les notices des dépendances transitives restent à inventorier pour
chaque artefact redistribué. Les images Node/Rust/Debian et outils de construction
contiennent également des composants avec leurs propres obligations.

## Sources de comparaison et laboratoire RISC Zero

Les campagnes Vega utilisent un checkout externe de
[microsoft/vega-prover](https://github.com/microsoft/vega-prover), révision
`c0ee259053cd12eaf43ed71b5cde375452b3ee4d`. Son fichier LICENSE consulté indique
MIT, copyright Microsoft Corporation. Le checkout local n'est pas inclus dans
le dépôt ; les sorties de benchmark ne confèrent aucun aval de Microsoft et ne
représentent pas une preuve complète de credential mDL.

Le laboratoire RISC Zero constitue un workspace distinct. Les licences de ses
crates, binaires et patches doivent être inventoriées à partir de son lockfile
avant redistribution ; la ligne SHA-2 ou Dalek ci-dessus ne couvre pas
automatiquement les forks RISC Zero. Les révisions de patches utilisées sont
consignées dans les manifests du laboratoire et
[le dossier de stack](docs/07-STACK-SECURITY-AND-PERFORMANCE.md).

Les téléchargements de Bicep, Terraform et de son provider utilisés pour valider
`infra/` restent dans des caches locaux ; ils ne sont pas embarqués par cette
contribution. Leurs licences et conditions s'appliquent lors d'une redistribution
éventuelle. Les sources de documentation citées demeurent celles de leurs
auteurs ; le dépôt contient une synthèse avec attribution, pas une copie complète.

## Limites de publication

L'inventaire complet, les notices des distributions finales et les éventuels
droits sur données doivent être vérifiés dans la
[checklist de publication](docs/publication/RELEASE_CHECKLIST.md).
Cette revue de licences ne démontre aucune absence de brevet ou liberté
d'exploitation. La recherche d'antériorité du projet est technique et bornée.
