# Dossier mathématique Horizon

[Whitepaper PDF](whitepaper.pdf), [source LaTeX](whitepaper.tex),
[bibliographie](references.bib), [vérifications exécutables](../../math/README.md).

Le texte distingue le hiding idéal de Pedersen, sa liaison calculatoire,
l'argument de connaissance hérité de Bulletproofs, les bornes entières, la
composition avec les signatures et le challenge, et l'invariant applicatif de
déduplication. L'argument d'ouverture exige des sources authentifiées dans un
domaine entier borné : une simple existence d'ouverture serait insuffisante.

Les hypothèses sont explicites. Les montants sont cachés au vérifieur dans A/B,
les métadonnées restent publiques et corrélables, B signe une preuve historique,
et le contrôleur ne prouve pas un budget cumulé, une franchise ou la vérité des
sources. Ce dossier ne revendique ni nouveauté, ni preuve formelle machine, ni
sécurité post-quantique, ni tâche équivalente battant Vega. Le dossier GPU
[séparé](../experiments/gpu/) doit être lu avec sa propre relation et ses limites.

## Reproduction du PDF

À la racine, PowerShell :

```powershell
docker build -t horizon-math-paper:local -f math/Dockerfile math
$repoPath = (Get-Location).Path
docker run --rm --network none --cpus 2 --memory 2g --mount "type=bind,source=$repoPath,target=/work" horizon-math-paper:local sh /work/docs/whitepaper/build.sh
```

Ou shell POSIX :

```sh
docker build -t horizon-math-paper:local -f math/Dockerfile math
docker run --rm --network none --cpus 2 --memory 2g \
  --mount "type=bind,source=$PWD,target=/work" \
  horizon-math-paper:local sh /work/docs/whitepaper/build.sh
```

La compilation utilise pdfLaTeX, BibTeX puis deux nouvelles passes. Elle produit
`whitepaper.pdf`, extrait le texte, rend toutes les pages avec Poppler et conserve
les logs dans `build/` (ignoré par Git). Le PDF est un artefact de lecture : il
n'est ni signé ni horodaté par un tiers. Sa date de fabrication peut changer
à chaque compilation. Le build doit être suivi d'une inspection des PNG ; une
sortie TeX sans erreur ne suffit pas à qualifier le rendu.

## Validation livrée

- PDF de huit pages compilé ; aucun avertissement ni dépassement `Overfull` dans
  la passe finale. Les huit PNG ont été inspectés : texte, tables, équations,
  liens bibliographiques et pagination lisibles, aucun débordement constaté.
- Octave 7.3.0 : contrôles arithmétiques et modèle fini réussis ; aucune exécution
  MATLAB revendiquée. Voir les rapports datés sous `math/results/`.
- Le helper du skill PDF a été trouvé et exécuté avant rédaction ; le rendu a
  réellement été produit avec Poppler. `validation.json` relie le constat à un
  PDF précis. Ce constat est une revue visuelle par agent ; aucune revue humaine
  indépendante n'a été confirmée et aucune attestation n'est revendiquée.

## Sources et périmètre de consultation

Les sources primaires ont été ouvertes le 17 octobre 2026 : ePrint Bulletproofs
(notice et correction 2022 de Fiat-Shamir), documentation Dalek 5.0.0 et notes
d'implémentation, RFC 9496 et 8032, papier et code Microsoft Vega, documentation
SQLite, article de Shor, FIPS 204 et 205. La page éditeur de Pedersen donne les
métadonnées bibliographiques du volume publié en 1992 (conférence 1991) ; l'accès
au chapitre complet n'est pas prétendu. Les démonstrations algébriques du texte
sont développées explicitement et restent conditionnelles aux primitives.

Les chiffres CPU viennent des bruts locaux déjà publiés dans
`docs/horizon/BENCHMARK_RESULTS.json`. Les quantiles Horizon et estimations
centrales Criterion Vega sont identifiés comme tels ; ils ne sont ni un SLA
ni une comparaison de relations équivalentes. FIPS 204/205 spécifient des
signatures : les substituer à Ed25519 ne rend pas Bulletproofs/Pedersen PQ.
