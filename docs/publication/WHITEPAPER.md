# Dossier de publication du whitepaper

Le manuscrit canonique est [la source LaTeX](../whitepaper/whitepaper.tex), avec
[bibliographie](../whitepaper/references.bib) et [PDF](../whitepaper/whitepaper.pdf).
Ce fichier organise sa publication ; il ne constitue pas un second article.

Le manuscrit doit rester aligné sur [l'énoncé formel Horizon](../horizon/FORMAL_STATEMENT.md),
[le registre d'assertions](CLAIMS.md) et le
[verdict expérimental gelé](../horizon/FINAL_VERDICT.md).
Le dossier Azure/GCP décrit des plans et des primitives documentées, sans
mesures cloud ni application multi-instance qualifiée.

## Exigences du candidat

La relation formelle, ses bornes et hypothèses précèdent les revendications.
Les mesures distinguent préparation, preuve fraîche, présentation réutilisée,
vérification et chemin durable. Chaque nombre renvoie à un artefact brut,
au périmètre, à la machine et au protocole d'échantillonnage.

La nouveauté n'est jamais « le premier standard mondial ». Les primitives,
schémas de credentials et produits proches sont crédités ; la recherche
d'antériorité demeure bornée. La valeur client, les émissions d'autorités
réelles, les effets distants et la revue cryptographique externe restent
respectivement H11, H13, H14 et H15.

Le statut demeure **laboratoire expérimental**. Une preuve cryptographique ne
garantit ni vérité de la source, absence de fuites applicatives, disponibilité,
exactement un effet dans une API distante ou conformité d'un organisme.

## Reproduction et revue

Utiliser le script de construction du manuscrit dans `docs/whitepaper/` et
conserver ses versions, sortie et empreinte PDF dans le candidat. Une compilation
LaTeX réussie ne remplace pas l'inspection visuelle des pages et tableaux.
La présence d'un PDF ne signifie pas qu'il a été contrôlé par ce dossier.

Appliquer [la checklist](RELEASE_CHECKLIST.md). Une relecture par agent doit
être identifiée comme telle ; aucun comité de lecture, revue juridique ou audit
indépendant n'est revendiqué. Les métadonnées [CITATION.cff](../../CITATION.cff)
citent le logiciel et ne créent ni DOI, ni publication académique acceptée.
