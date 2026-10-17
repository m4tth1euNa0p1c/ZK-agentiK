# Receipts publics RISC Zero

Deux preuves réelles CPU `Succinct` 3.0.6, générées le 15 octobre 2026 à partir
de données synthétiques et d'une autorité de signature dont le secret de test
est public. Le format est `zk-agentik-risc0-lab/1`.

- `critical-proof.json` : décision autorisante historique.
- `denied-proof.json` : preuve valide d'un refus pour arrêt d'urgence.
- `*-expected.json` : challenges publics attendus correspondants.
- `manifest.json` : empreintes, version et identités pour la reproduction.

Les fichiers n'incluent ni faits privés ni sel d'engagement. Les fixtures
source restent publiques ailleurs dans le dépôt ; cet exemple ne démontre
donc pas qu'un adversaire ne pourrait connaître ces données.

```bash
npm run lab:risc0 -- verify
```

Le vérifieur est compilé avec l'image guest attendue, puis lancé sans réseau
avec uniquement ses fichiers publics. Une preuve refusée doit produire
`POLICY_DENIED`, après vérification cryptographique. Les empreintes du
manifeste sont descriptives ; elles ne remplacent ni le vérifieur ni un
registre de confiance administré indépendamment.

Changer l'image guest invalide ces receipts : conserver la provenance avant
de produire des fixtures sous une nouvelle image. Aucun de ces challenges
historiques n'autorise une mutation actuelle. Voir
[les résultats et limites](../../../docs/08-RISC0-LAB-RESULTS.md).
