# Registre d'éléments probants

`catalog.json` associe chaque assertion à une relation, un statut, ses limites,
ses sources primaires et des artefacts publics. Lire les limites avant les chiffres.

Les manifests SHA-256 créés par [Proofkit](../tools/proofkit/README.md) vérifient
ces octets seulement. Une empreinte n'est ni une preuve ZK, ni une preuve de date,
ni une revue scientifique. Les dates locales restent explicitement non attestées.

Les données privées, logs non relus, caches et configurations locales sont exclus.
Le catalogue conserve les résultats négatifs et les hypothèses non démontrées.
Les benchmarks historiques restent à leur place et ne sont pas recalculés sous
un nouveau nom pour masquer une régression.

La publication ajoute un manifeste daté, produit dans un checkout propre. Pour
vérifier une version ancienne après évolution du catalogue, prendre un checkout
du commit `source.commit` indiqué et y copier le manifeste à vérifier. Exécuter
le vérifieur depuis un environnement de confiance. Le commit déclaré est une
référence de reproduction, sans signature attestant l'identité du déclarant.
Conserver les anciens manifestes ; un nouveau catalogue demande un nouveau
manifeste, pas la réécriture d'un résultat antérieur.
