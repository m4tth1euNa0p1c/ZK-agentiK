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
