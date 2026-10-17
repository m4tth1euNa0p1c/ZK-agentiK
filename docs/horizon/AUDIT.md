# M0 — État initial Horizon

Audit commencé le 17 octobre 2026, à partir du commit
`d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`, branche `feat/horizon-research`.
Arbre de travail initial propre. Aucun benchmark historique supprimé.

## Vérifications exécutées

- `cargo test --workspace --locked` via le shim Node : 14 tests réussis.
- `npm test` : 25 tests réussis, client MCP réel sur transports mémoire/stdio.
- `npm run lab:risc0 -- verify` : receipt autorisant vérifié ; receipt de
  refus cryptographiquement valide rejeté avec `POLICY_DENIED`, dans des
  conteneurs sans witness et sans réseau.
- Les rapports JSON historiques établissent 153,681–163,232 s pour trois
  preuves autorisantes, p95 13,697 ms de vérification, p95 6,950 ms de rejet
  d'un seal altéré, seal de 222 668 octets. Ce ne sont pas de nouvelles mesures.

## Lacunes constatées

Le MCP reste en simulation. Le laboratoire réel vérifie des challenges
historiques avec autorité de fixture publique. Pas d'autorisation durable,
de provenance fournisseur réelle, de confidentialité critique qualifiée,
de preuve de demande commerciale ni de reproduction Vega avant Horizon.
Le benchmark historique de trois preuves ne permet pas d'estimer un p99.

## Contraintes de reproduction

Windows x64 / Intel Core Ultra 7 265F, environ 32 GiB physiques. Docker Linux
WSL2, conteneur de laboratoire limité à 8 CPU et 12 GiB. Environ 24 Go libres
sur C: au démarrage : les nouvelles expériences utilisent des répertoires
séparés, des versions épinglées et les caches existants. Aucun service payant
ni donnée financière réelle. La première compilation peut utiliser le réseau ;
les preuves conservées sont revérifiées hors réseau.

## Organisation contradictoire

Quatre agents actifs au maximum : Astral assure audit, reproduction et
intégration ; un agent cryptographie/algèbre examine Vega et les alternatives ;
un agent recherche métier et antériorités propose la shortlist ; un agent
indépendant contredit protocole, statistiques, confidentialité et valeur.
Les responsabilités d'ingénierie sont réaffectées après arbitrage, avec
propriété explicite des fichiers. Les décisions et objections sont consignées.

La mission vise des expériences finies. Aucun résultat ni critère commercial
ne sera déclaré acquis sur la seule présence de code ou d'une simulation.
