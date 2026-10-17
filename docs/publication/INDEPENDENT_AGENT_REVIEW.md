# Revue contradictoire du SDK, des transports et de Proofkit

Date : 17 octobre 2026. Base Git observée :
`8935cc9e42dee9b2ed32207483a6f7383e37ffc4`, avec modifications de l'arbre de travail
en cours de revue. Ce rapport ne décrit pas exclusivement le contenu de ce commit.
Une modification ultérieure exige de vérifier si les conclusions restent valides.

L'agent chargé de cette revue est distinct des auteurs du SDK/transport et du
CLI. Il a précédemment écrit le dossier de publication et les fondations cloud :
il n'est donc pas indépendant de l'ensemble du projet. Il s'agit d'une **revue
source interne par agent**, sans audit cryptographique externe, certification,
comité académique ou conclusion de conformité.

## Périmètre réellement examiné

- [Helper SDK](../../packages/proofkit-sdk/src/index.ts) et
  [tests de contrat](../../packages/proofkit-sdk/test/tool.test.ts).
- Adaptateur [Horizon](../../packages/horizon-demo/src/tool.ts),
  [MCP](../../packages/horizon-demo/src/mcp.ts),
  [stdio](../../packages/horizon-demo/src/mcp-stdio.ts),
  [HTTP](../../packages/horizon-demo/src/server.ts), ainsi que store, types et worker.
- Transport stdio et protocole de la version **installée** du SDK MCP 1.32.1,
  afin de contrôler leurs bornes effectives et callbacks de fermeture.
- Correctif [de transport borné](../../packages/horizon-demo/src/bounded-stdio.ts)
  et [huit tests de budgets](../../tests/horizon/stdio-budget.test.ts).
- [CLI et vérification des artefacts](../../tools/proofkit/lib.mjs), profils,
  [catalogue](../../evidence/catalog.json) et
  [tests d'intégrité](../../tests/proofkit/integrity.test.mjs).

La recherche a porté sur l'autorisation avant effet, le choix de politique/clé/
backend, le contexte attendu, les échéances après attente, la concurrence,
les résultats ambigus, les bornes mémoire et la signification des manifestes.
La revue n'a pas refait l'analyse mathématique des primitives cryptographiques,
une campagne de charge de production ou un audit exhaustif des dépendances.

## Constats et état des corrections

| ID | Constat | Correction observée / validation | État |
| --- | --- | --- | --- |
| R01 | Un tableau JS creux pouvait avoir une longueur énorme avec peu de propriétés, puis gonfler pendant `JSON.stringify` | Correction de l'auteur du SDK : limite de longueur et refus des tableaux creux. Le test ciblé inclut un tableau de longueur 1 milliard et un petit tableau creux ; zéro vérification et zéro effet | Corrigé ; test exécuté par le relecteur |
| R02 | Le transport stdio utilisait une borne d'entrée MCP de 10 MiB, supérieure à la borne de présentation du helper | Borne explicite de 128 Kio avant parsing, puis 65 535 octets au niveau du helper ; test enfant avec frame sans fin de ligne trop grande et compteur d'effets | Corrigé ; fermeture et zéro effet testés par le relecteur |
| R03 | Un client ne lisant plus stdout pouvait accumuler des réponses sans borne, notamment via `tools/list`, hors `maxInFlight` du helper | Transport borné : au plus 16 requêtes en vol, 16 réponses en attente et 256 Kio de sortie, y compris les octets non lus d'un Duplex ; une écriture active, délai de 5 s, fermeture et rejet des promesses sur saturation | Corrigé ; huit tests et deux contre-tests indépendants exécutés |
| R04 | Le claim de mesures CPU/durables omettait les bruts Windows de sa liste scellée ; les références d'un JSON ne sont pas parcourues automatiquement | Ajout du brut et du résumé Windows de la campagne retenue dans `horizon-cpu-observations` | Corrigé ; `checkCatalog` final passe avec 8 claims et 36 artefacts |
| R05 | `readFileSync(fd)` pouvait lire au-delà de la taille initialement vérifiée si un autre processus allongeait le fichier | Lecture explicite limitée à `fstat.size + 1`, au plus 128 MiB + 1, puis refus des changements de taille/identité/mtime | Correction source observée ; pas de simulation exhaustive des courses filesystem |

R01 a été corrigé par l'auteur avant cette contre-revue ; le relecteur ne
revendique pas sa découverte. R02 à R05 ont été remontés pendant cette revue.
Le détail de R03 avant correction a été reproduit avec le vrai serveur MCP et
des flux `PassThrough`, sans consommer sa sortie : 500 requêtes `tools/list`
d'environ 59 octets ont laissé **539 892 octets** en attente ; 1 000 requêtes ont
laissé **1 079 893 octets**. La borne d'entrée de 128 Kio était déjà activée.
Ce test n'a appelé aucun adaptateur d'autorisation et a été fermé proprement.

Après correction, le même flood ferme le transport. Un second contre-test,
laissant une boucle d'événements entre les demandes pour que les réponses soient
effectivement préparées, ferme à la **17e demande** : pic de **17 255 octets**
comptabilisés, compteurs de requêtes/messages/octet en attente ramenés à zéro,
et 1 078 octets résiduels dans le flux détruit, soit une seule écriture bornée.
Les promesses suspendues sont rejetées ; une nouvelle entrée n'est plus
transmise. Le test de saturation du vrai `McpServer` vérifie aussi qu'une demande
de mutation placée après le flood n'est jamais admise, avec zéro effet.
La fermeture ne prétend pas annuler une mutation déjà validée et commise.

## Vérifications effectuées

Première passe exécutée :

```sh
node --import tsx --test packages/proofkit-sdk/test/tool.test.ts tests/horizon/mcp.test.ts
node --test tests/proofkit/integrity.test.mjs
```

À cette passe, **11 tests SDK/MCP** et **12 tests CLI** passaient. Les tests SDK
utilisent un adaptateur de simulation déclaré ; les deux intégrations MCP ont
utilisé le worker cryptographique Horizon réel et constaté zéro effet pour une
preuve altérée, un effet pour la demande valide et aucun effet supplémentaire
au rejeu. Ils ne prouvent pas l'atomicité d'une API distante.

Des fixtures supplémentaires de revue, sous `.tools/`, ont vérifié séparément :
refus des statuts de catalogue non admis, altération d'artefact détectée, chemins
sensibles refusés et résultats process `unknown`/`unavailable`/`failed` non promus
en succès. Aucun fichier source ou suite n'a été modifié par le relecteur.

Une modification volontaire de `created_at_utc` et du `source.commit` d'un
manifeste synthétique a conservé `integrity-verified`. Ce comportement est
cohérent avec les champs `local-clock-unattested` et `semantic_validation:false` :
les métadonnées sont auto-déclarées. Ce n'est pas une preuve d'authenticité de
l'heure, de la révision ou des résultats scientifiques. La modification d'un
artefact couvert a, elle, été refusée.

Passe finale après reconstruction de `dist` et câblage du transport borné :

```sh
node --import tsx --test packages/proofkit-sdk/test/tool.test.ts tests/horizon/mcp.test.ts tests/horizon/stdio-budget.test.ts tests/proofkit/integrity.test.mjs
node tools/proofkit/cli.mjs check
```

Résultat exécuté par le relecteur : **32 tests PASS**, zéro échec, zéro test
ignoré. La vérification du catalogue retourne `integrity-readable`, huit claims,
36 artefacts et `semantic_validation:false`. Les tests couvrent également
drain normal, sortie trop grande avant écriture, timeout, EOF, erreurs des flux,
fermeture unique, retrait des listeners et Duplex dont le high-water mark dépasse
le budget du transport. Ils ne mesurent pas la charge d'un service de production.
Aucun serveur ni sous-processus de cette revue n'est
resté actif.

### Empreintes des corrections relues

SHA-256 des fichiers au terme de cette première passe, sans signature ni
horodatage tiers. Ces empreintes décrivent cet instant ; elles ne sont pas
réécrites pour suivre les modifications ultérieures du catalogue :

| Fichier | SHA-256 |
| --- | --- |
| `packages/proofkit-sdk/src/index.ts` | `19ee069bbe5f7d4c45a7a2b15ca7fc6a96629ab56d709ad7b536a145b1c0a17c` |
| `packages/horizon-demo/src/bounded-stdio.ts` | `48ae66aa023f3e60c2e7aadd0eb197b283ca6ff99b68e85cf6ae9e9a9ad6a48f` |
| `packages/horizon-demo/src/mcp-stdio.ts` | `5622f0403231d2b525dbe6b62073c14bf3c6efaf3afb525cfbb74bbd9270d432` |
| `tools/proofkit/lib.mjs` | `c24bb185235aa391bfe43d1ed206abd27ed01299dd1e324b11ae5521eb0b7f84` |
| `evidence/catalog.json` | `9a68294b772f8f021c810283e5b7130a83c6bf97059878ce32bf9a3b37c91aa5` |

## Réserves conservées

1. Les adaptateurs, la configuration, les binaires, l'horloge et le store sont
   dans la frontière de confiance. Le helper ne transforme pas un booléen d'un
   adaptateur arbitraire en preuve ; `evidenceKind` reste descriptif.
2. Le contrôleur Horizon recontrôle l'époque et les dates dans ses transactions
   SQLite. La transaction avec une cible distante demeure H14 ; les routes HTTP
   opérateur locales n'ont pas d'IAM de production, conformément à H17.
3. Les contrôles de chemins refusent les symlinks/junctions/hardlinks présents
   lors des vérifications. Ils ne forment pas une sandbox contre un écrivain local
   hostile remplaçant un dossier parent entre `walk` et `open`. Une publication
   doit être préparée dans un checkout stable sous contrôle du mainteneur.
4. `check`/`verify` couvrent les artefacts explicitement listés. Ils ne vérifient
   ni les références transitives, ni la vérité d'une assertion, ni un ancien
   historique Git complet. Les noms de fichiers non suivis et chemins de machine
   dans certains rapports doivent être revus avant publication publique.
5. Les bornes locales et tests finis ne constituent pas une résistance DDoS,
   un SLA, une analyse de canaux auxiliaires ou une assurance multi-tenant.

## Contre-revue du manuscrit et de l'automatisation

Seconde passe documentaire du **17 octobre 2026**, sur la même base Git et
l'arbre de travail en évolution. Le relecteur a lu le
[manuscrit LaTeX](../whitepaper/whitepaper.tex), sa
[bibliographie](../whitepaper/references.bib), le
[modèle numérique](../../math/horizon_checks.m), les README, le catalogue,
les fondations [Azure](../../infra/azure/) et [GCP](../../infra/gcp/), ainsi que
les trois workflows [qualité](../../.github/workflows/ci.yml),
[publication](../../.github/workflows/evidence.yml) et
[preuve/sandbox](../../.github/workflows/proof-sandbox.yml). Aucune nouvelle
campagne cryptographique ou numérique n'a été exécutée pendant cette passe.

### Assertions mathématiques et mesures

- La déduction `1 <= a <= 2^32` et `0 <= c-a < 2^32` exige connaissance
  extractible, liaison aux ouvertures autoritatives et domaines source bornés.
  Le manuscrit conserve ces hypothèses ; il ne confond pas existence d'une
  ouverture Pedersen et connaissance. Les valeurs source `u64` restent
  strictement inférieures à l'ordre du groupe ; la garde `c >= a` précède la
  soustraction non signée dans le modèle numérique.
- La relation n'établit ni vérité métier des sources, ni cumul, franchise ou
  budget restant. Le mode B réutilise une preuve immuable avec signature fraîche,
  sans annoncer une nouvelle preuve de connaissance à chaque présentation.
- La taille de 672 octets concerne la preuve agrégée 2 x 32 bits, hors signatures
  et enveloppe. Elle concorde avec la formule de sérialisation documentée par
  [RangeProof 5.0.0](https://docs.rs/bulletproofs/5.0.0/bulletproofs/struct.RangeProof.html),
  consultée indépendamment lors de cette passe. L'article
  [Bulletproofs](https://eprint.iacr.org/2017/1066), sa révision de 2022 et le
  [RFC 9496](https://www.rfc-editor.org/rfc/rfc9496.html) ont également été consultés.
- Les 24 510 paires, dix frontières et 20 états/160 transitions sont des tests
  finis, pas une preuve de raffinement du code TypeScript, du stockage ou de
  Bulletproofs. L'exécution est attribuée à Octave, sans prétendre avoir exécuté
  MATLAB. Les mesures Vega SHA-256 sont distinguées du circuit de credentials
  et des percentiles Horizon ; aucune comparaison équivalente gagnante n'est
  annoncée.

Aucune assertion mathématique bloquante n'a été identifiée dans ce périmètre.
Cette lecture ne vérifie pas l'implémentation cryptographique des primitives,
ses canaux auxiliaires ou la validité physique des faits signés. H15 reste ouvert.

### Catalogue, cloud et GitHub Actions

L'entrée CUDA a d'abord présenté des caractères `?` à la place d'accents :
l'auteur a corrigé l'encodage, vérifié par le relecteur. Son état demeure
`blocked`, avec **N=0 receipt GPU** ; ni performance GPU ni incompatibilité
Blackwell n'en est déduite. La nouvelle lecture `checkCatalog` retourne
`integrity-readable`, **9 claims / 99 artefacts**, `semantic_validation:false`.
L'empreinte du catalogue à cette seconde passe est
`c126b1d7b783828115363d8b4721bcfe00929e5fb18482dfe8eb5a62c1ee0297`.
Elle remplace son contenu, sans invalider la description historique de la
première passe ci-dessus.

Les fondations IaC ne créent que réseau et identités ; aucune application,
persistance distribuée ou conformité bancaire n'est annoncée comme déployée.
La relecture ne constate pas de route de repli transformant SQLite local en
service durable multi-instance. `terraform fmt -check` a passé localement ;
aucun appel cloud n'a été exécuté par le relecteur.

Le workflow réutilisable limite les profils à `horizon|math`, injecte les choix
dans des variables shell citées, réserve le sandbox Docker à Horizon, épingle
les actions et donne au token `contents: read`. Aucun `pull_request_target`,
secret cloud ou permission OIDC n'est ajouté. Les résumés, fixture publique
historique, PDF et catalogue sont sélectionnés explicitement ; les scripts
examinés n'y copient ni witness, clé privée, base SQLite ou log brut.
Les choix utilisateur sont maintenant explicites : **GA = GitHub Actions**,
comparaison Azure/GCP sans déploiement et publication du dépôt autorisée après
checks. Cette autorisation ne constitue pas une disponibilité générale du produit.

Réserves de cette automatisation :

1. Le manifeste du job de publication vérifie les artefacts historiques avant
   reconstruction du PDF. Le bundle du workflow calcule ses propres SHA-256 sur
   les octets sélectionnés ; ces deux périmètres ne doivent pas être confondus.
2. `execution.json` décrit des résultats de processus. La sélection initiale
   omettait les nouveaux JSON numériques Octave ; le correctif relu copie ceux
   créés après le marqueur de démarrage. Les logs bruts restent exclus. Un succès
   de workflow n'est pas à lui seul une preuve cryptographique, une validation
   sémantique du catalogue ou un horodatage attesté.
3. La sélection et l'upload initiaux étaient soumis au succès des étapes
   précédentes : un résultat `unknown`/`failed` pouvait rester uniquement sur le
   runner et dans les logs CI. Le correctif relu utilise `always()` après le
   démarrage du profil, exporte les états du job/profil/PDF dans `RUN_STATUS.txt`
   et conserve les résultats présents sans masquer l'échec. **Correction source
   vérifiée**, exécution sur GitHub encore à consigner. Un échec avant démarrage
   du profil ou de l'export peut toujours empêcher la production du bundle.
4. `actionlint` n'était pas disponible dans le PATH initial de cette revue.
   Le responsable de publication a ensuite rapporté un PASS avec actionlint
   1.7.12 et archive officielle vérifiée ; le relecteur ne revendique pas cette
   exécution. Les résultats effectifs de `workflow_call`/`workflow_dispatch`
   restent à consigner dans le journal de publication. Cette lecture source
   ne les marque pas réussis.

Le README a également remplacé « outils MCP officiels » par « outils exposés
avec le SDK MCP officiel », afin de ne pas suggérer une approbation du protocole
pour ces outils applicatifs. Correction relue. Les deux documents modifiés par
ce relecteur, ce rapport et `NEXT_PROMPT.md`, passent le contrôle UTF-8 et leurs
19 liens locaux existent. Une branche distante de durcissement signalée après
cette passe n'est pas couverte : toute intégration ultérieure exige sa propre
revue et ses tests.

## Conclusion de cette passe

Aucun chemin autorisant une mutation Horizon sans passage par le vérifieur et
le contrôleur n'a été trouvé dans le périmètre lu. Cette absence de finding n'est
pas une preuve d'absence de défaut. **Aucun finding bloquant de cette passe ne
reste ouvert pour le laboratoire local examiné.** Les réserves ci-dessus,
H11/H13/H14/H15/H17 et les décisions de publication restent distinctes.
Aucune conclusion de disponibilité générale ou de qualification d'une
plateforme critique n'est autorisée par ce rapport.

## Complément : branche de sécurité intégrée

Le 17 octobre 2026, l'orchestrateur a conservé puis fusionné la branche distante
`feat/publication-hardening` au commit `21b6dc2`. Une nouvelle revue ciblée par
l'agent `technical_challenger`, distinct de l'auteur des routes, couvre la garde
opérateur du serveur et son interaction avec le SDK. Les URL protégées sont
identiques à celles du dispatch ; le contrôle intervient avant lecture du corps
et avant toute attente. Aucun contournement n'a été trouvé dans ce périmètre.

Le relecteur a ajouté et exécuté neuf tests de firewall, dont 162 requêtes
négatives sur les trois routes et sept configurations de token. Chaque refus
retourne 403 et laisse le snapshot intégral inchangé : état, opérations, audit
et effets. Une opération déjà réservée rend le contrôle de réconciliation
observable. Les cas authentifiés vérifient réconciliation `UNKNOWN` vers
`COMPLETED` sans second effet, rotation et révocation. Un token opérateur valide
ne permet pas d'admettre une preuve falsifiée. TypeScript strict passe.
L'orchestrateur a ensuite exécuté les 31 tests Horizon : 31 passent.

Les contrôles opérateur sont désactivés dans le navigateur ; Compose ne configure
aucun token et le relais ne transmet pas son en-tête. Le secret partagé constitue
un contrôle local, sans IAM bancaire, rôles nominatifs, TLS ou rotation à chaud.
Les autres routes ne sont pas rendues authentifiées par cette garde. Cette revue
interne ne change pas les réserves de production et ne remplace pas H15/H17.

L'agent `buyer_crisis_challenger` a également relu les nouveaux dossiers
dépendances, GPU, mathématiques, white paper, skills et sélection des artefacts
CI. Aucune donnée privée n'a été trouvée dans ce périmètre ; 106 empreintes
d'indexes GPU/dépendances et du PDF/sources concordent. Le PDF de huit pages ne
contient aucune pièce jointe ni chemin utilisateur détecté. Les adresses de
mainteneur dans les métadonnées NVIDIA sont des métadonnées publiques d'image.
Cette passe n'est ni un audit exhaustif de l'historique Git ni un inventaire des
licences d'une future distribution binaire. Aucun blocage supplémentaire n'a été
identifié pour la publication de sources et résultats du laboratoire.
