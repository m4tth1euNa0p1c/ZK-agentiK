# Décision de publication du laboratoire

Revue du **17 octobre 2026**, par les agents d'ingénierie, de contradiction
technique et de revue des preuves. **GO pour publier les sources et résultats
expérimentaux ; NO-GO pour une plateforme bancaire qualifiée.** Le propriétaire
a explicitement autorisé le passage public après vérifications. Aucun package
npm, déploiement Azure/GCP, paiement ou contact commercial n'est autorisé par
cette livraison.

## Révisions et périmètre

Le point de départ est `8935cc9e42dee9b2ed32207483a6f7383e37ffc4`. Le code livré
est dans `b9afb43`, l'intégration de la branche distante de sécurité dans
`21b6dc2`, les correctifs opérateur dans `0a9d48d` et le premier catalogue étendu
dans `acc6e9832d41bfe3260cb578e4a975ff630b5100`. Les quatre commits de
`feat/publication-hardening` ont été préservés par fusion. Les ajouts ultérieurs
de cette clôture sont des documents, observations et empreintes.

La [PR #2](https://github.com/m4tth1euNa0p1c/ZK-agentiK/pull/2) réunit ces travaux
et l'historique Horizon. Le manifeste
[`publication-2026-10-17.json`](../../evidence/manifests/publication-2026-10-17.json)
identifie le checkout propre exact utilisé pour l'index final. Il lie les
artefacts sélectionnés, sans certifier leur vérité, leur auteur ni leur date.
L'état effectif de visibilité GitHub doit être lu sur le dépôt ; ce rapport
consigne la décision de publication, pas une activation anticipée.

## Contrôles observés

| Contrôle | État | Support et limite |
| --- | --- | --- |
| Qualité Rust/TypeScript, schémas, guest nu, tests | **Vérifié** | [Job GitHub](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/39044646338/job/117430845824), 105 tests : 23 Rust + 82 Node, zéro échec ; [compteurs extraits](checks/ci-candidate-acc6e98/test-counts.json) |
| Preuve réelle, falsification, rejeu, effet et redémarrage | **Vérifié** | [Workflow qualité + sandbox](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/39044646338), 1 effet autorisé, 0 non autorisé ; même cible locale après redémarrage |
| Vérifieur public séparé | **Vérifié** | [Résultat](checks/ci-candidate-acc6e98/horizon/independent-verification.json), conteneur sans réseau ni montage, fixture historique publique ; pas une autorisation vivante |
| Opérateur authentifié et refus sans changement | **Vérifié** | [Relevé](OPERATOR_VALIDATION_2026-10-17.json), 162 requêtes négatives sur trois routes, snapshot inchangé ; secret partagé local seulement |
| Octave et reconstruction PDF | **Vérifié** | [Workflow scientifique](https://github.com/m4tth1euNa0p1c/ZK-agentiK/actions/runs/39044646357), modèle fini et entiers exacts ; aucune exécution MATLAB |
| Manifeste et scan d'historique | **Vérifié** | Job `evidence` du même workflow : roundtrip et Gitleaks épinglé ; scan local de 13 commits sans finding au stade `0a9d48d`, [sortie](checks/gitleaks-2026-10-17.json). Un scan sans finding ne prouve pas l'absence de secret |
| Dépendances npm | **Vérifié dans le périmètre du scan** | [npm audit complet](checks/npm-audit-2026-10-17.json), aucune vulnérabilité signalée le 17 octobre ; ne couvre pas les vulnérabilités inconnues |
| Dépendances Rust | **Vérifié avec réserves** | [Rapports figés et analyse](DEPENDENCY_REVIEW.md) ; audits racine/Horizon passent après correction, alertes RISC Zero historique et maintenance conservées |
| Fondations Azure/GCP | **Vérifié localement** | [Versions et commandes](VALIDATION.md), Bicep/Terraform ; aucun plan cloud, ressource créée ou test IAM réel |
| Artefacts publics des workflows | **Vérifié** | [Observation API et empreintes](checks/ci-candidate-acc6e98/observation.json) ; bundles téléchargés, digests de tous leurs fichiers contrôlés, sous-ensemble public conservé |
| Sources, notices et données distribuées | **Relu, périmètre limité** | [Notices](../../THIRD_PARTY_NOTICES.md), [contre-revue](INDEPENDENT_AGENT_REVIEW.md) ; sources, PDF original, résultats synthétiques et avis RustSec CC0 ; aucun binaire tiers ni image système redistribué |
| Revue cryptographique externe, acheteur et production | **Non vérifié / bloquant pour production** | H11/H13/H14/H15/H17 restent ouverts ; ne bloque pas la publication explicite du laboratoire |

Les workflows ci-dessus ont testé la tête de PR `acc6e98` avec checkout de fusion
`576c9b9ea3b047e190120c15d2906e07f12b3ce7`. Les deux SHA sont conservés séparément.
Les checks de la révision finale se lisent sur la PR ; ils ne sont pas inventés
dans ce relevé antérieur. Les artefacts GitHub temporaires expirent après 14 jours.
Les JSON publics sélectionnés sont conservés ici, sans copier witness, clés,
base SQLite ou logs bruts. Les dates locales restent non attestées par TSA.

## Confidentialité et état local

La revue a porté sur les fichiers publiés, branches distantes intégrées, PR,
artefacts disponibles et historique scanné. Aucun secret réel ou dossier client
n'a été identifié dans ce périmètre. Les métadonnées ordinaires d'auteur Git,
dont nom et adresse de commit, restent dans l'historique conservé ; le scan de
secrets n'est pas une anonymisation des auteurs. Aucune réécriture d'historique
n'a été effectuée.

`CLAUDE.md`, les configurations privées, sorties locales non relues et caches
restent hors du commit. La sandbox locale initiale de l'utilisateur a été
préservée. La sandbox de publication distincte a été arrêtée en conservant ses
volumes ; les tentatives CUDA et benchmarks historiques n'ont pas été supprimés.
Le canal de signalement et ses limites sont décrits dans [SECURITY.md](../../SECURITY.md).

## Ce que cette publication ne démontre pas

- Le circuit montant/plafond n'établit ni vérité des sources, cumul, franchise,
  fraude, provisionnement ou conformité réglementaire.
- Aucun acheteur, budget ou nécessité économique de la ZK n'est validé. H11
  compare notamment un verdict signé plus simple et la divulgation acceptable.
- La preuve spécialisée et les receipts historiques sont réels, mais les essais
  CUDA ont produit **zéro receipt GPU** : compilation arrêtée par manque de
  mémoire. Ni accélération GPU ni incompatibilité générale n'en est déduite.
- Horizon est classique. Ni Ed25519, ni Ristretto/Bulletproofs, ni SHA-256 pris
  isolément ne justifient un label post-quantique de bout en bout.
- Vega SHA-256 est une référence reproduite sur une autre relation. Aucun
  record comparatif ni circuit de credential complet reproduit n'est revendiqué.
- Les anciennes latences CPU concernent leurs versions et configurations ;
  elles ne qualifient pas les nouveaux transports ou dépendances corrigées.
- Un manifeste SHA-256, des tests finis et une revue d'agents ne remplacent pas
  une preuve formelle machine, une analyse de canaux auxiliaires ou un audit externe.

Le [prompt de reprise](NEXT_PROMPT.md) donne les expériences et critères
d'abandon : besoin acheteur, sources authentiques, cible distante, audit externe,
coûts, puis nouveaux profils cryptographiques si leur nécessité est établie.
