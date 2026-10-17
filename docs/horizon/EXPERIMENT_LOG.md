# Journal d'expériences Horizon

## H00 — Baseline, 17 octobre 2026

Référence `d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`. 14 tests Rust,
25 tests Node, deux receipts RISC Zero historiques revérifiés. Aucun changement
de relation initiale. Détails : [audit](AUDIT.md).

## H01 — Reproduction Vega, en cours

Source officielle clonée à
`c0ee259053cd12eaf43ed71b5cde375452b3ee4d`. Les deux benches publiés sont
`sha256_vega_sc` et `sha256_vega_mc_zkp`. Ils mesurent des circuits SHA-256 ;
la présence des chiffres de présentation mDL dans le README ne signifie pas
que ces benches implémentent la relation complète mDL.

Environnement : même CPU physique et conteneur 8 CPU / 12 GiB que le laboratoire
RISC Zero, Rust 1.98.0, `RUSTFLAGS=-C target-cpu=native`. Une résolution Cargo
est figée avant les mesures, car le dépôt de référence ne livre pas de lockfile.
Les coûts setup / prep_prove / prove / verify restent distincts.
