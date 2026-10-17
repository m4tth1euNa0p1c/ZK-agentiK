# Programme Horizon — tickets locaux

Référence initiale : `d18fe65840d5f1cd9dc6155e404c942dabf2bcc7`.
Ces tickets sont des unités de travail et de validation, pas des déclarations
de maturité. Les résultats finaux et blocages sont dans `docs/horizon/`.

| Ticket | Responsabilité | Livrable / critère d'acceptation |
| --- | --- | --- |
| H00 / M0 | Audit et DevOps | Branche dédiée, références, tests existants et receipts indépendamment revérifiés ; aucun historique perdu |
| H01 / M1 | Cryptographie, algèbre, benchmark | Vega épinglé, papier/code examinés, bench publié exécuté ou erreur reproductible ; coûts offline/online séparés |
| H02 / M2 | Métier et antériorités | Cinq domaines maximum, sources primaires, concurrents/brevets, acheteurs hypothétiques et critères d'abandon |
| H03 / M3 | Comité contradictoire | Votes et objections documentés ; propriété requise qui exclut ou conserve la baseline signée |
| H04 / M4 | Protocole et confidentialité | Statement/witness/relation, signatures et sujets liés, fuite, révocation et action exactes définis |
| H05-A / M5 | Preuve spécialisée | Primitive existante, preuve réelle, tampering rejeté, coûts complets et comparaison signée |
| H05-B / M5 | Réutilisation | Pré-calcul immuable séparé du challenge frais ; révocation, changement de politique et rejeu refusés |
| H05-C / M5 | Sélection | Politique vérifieur impose les garanties ; aucune sélection par l'appelant ni fallback affaiblissant |
| H06 / M6 | Optimisation | Comparaison équivalente avant/après, échantillons bruts ; résultat négatif conservé si gain non démontré |
| H07 / M7 | Produit Rust/API | Bibliothèque, CLI, organisations synthétiques et interface web ; secrets hors réponse et aucun bypass de mutation |
| H08 / M8 | Red team et métrologie | Falsification, omission, concurrence, crash/reprise, révocation, ambiguïté ; zéro mutation non autorisée dans les essais |
| H09 / M9 | Sandbox et CI | Docker Compose local, test end-to-end, ressources bornées, aucun réseau bancaire ni déploiement production |
| H10 / M10 | Décision scientifique/commerciale | Dossier complet, preuves et incertitudes, références non comparables séparées, coûts et critères restant ouverts |

Commandes initiales : `cargo test --workspace --locked`, `npm test`,
`npm run lab:risc0 -- verify`. Les commandes Horizon sont ajoutées à mesure
que les expériences deviennent exécutables. Aucun record n'est reconnu sans
relation, coût complet, machine et hypothèses comparables.

## État du programme après les expériences

M0 : baseline préservée. M1 : benches Vega SHA-256 reproduits, application
credential non reproductible depuis ces seuls benches. M2/M3 : cinq pistes et
arbitrage contradictoire, GO laboratoire sans validation client. M4 : relation
formalisée. M5 : A/B/C et baseline réellement exécutées. M6 : optimisation des
paramètres publics mesurée avant/après. M7 : bibliothèque, CLI, API et application.
M8 : suites adverses et bruts conservés. M9 : Docker local, admission unique et
rejeu après redémarrage validés. M10 : verdict publié, sans record ni GO produit.

Les blocages de qualification et prochaines expériences sont détaillés dans
[H11–H17](NEXT_EXPERIMENTS.md). Priorité H11, H13/H15, H14/H17, puis H16 ; H12
est une piste scientifique indépendante. La cible complète de 10 ms est manquée
sur le banc durable Windows et reste un résultat négatif à conserver.
