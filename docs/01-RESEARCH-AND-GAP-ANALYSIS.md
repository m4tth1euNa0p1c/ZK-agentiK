# Recherche et analyse d'écart — 15 octobre 2026

Cette analyse conserve les choix du bootstrap initial. Depuis, RISC Zero a
été implémenté et testé dans un laboratoire distinct : voir
[la pile retenue](07-STACK-SECURITY-AND-PERFORMANCE.md) et
[les preuves et mesures réelles](08-RISC0-LAB-RESULTS.md). Les mentions de
toolchains non testées ci-dessous décrivent cette étape initiale.

La recherche complémentaire et les deux tours de contradiction sont consignés
dans [06-MARKET-NICHE-AND-CHALLENGE.md](06-MARKET-NICHE-AND-CHALLENGE.md).
Ils resserrent l'hypothèse ci-dessous : la gateway générique est déjà occupée ;
l'admission confidentielle de releases entre fournisseur et client reste une
hypothèse à comparer aux produits existants et à tester auprès d'acheteurs.

## Conclusion de décision

Construire un **profil expérimental de preuves d'autorisation pour MCP**, avec
un noyau Rust indépendant du moteur de preuve et un firewall DevSecOps. Le POC
exécute réellement Rust, mais son backend natif produit un reçu de simulation,
rejouable par le vérifieur et sans confidentialité. SP1/RISC Zero sont des
intégrations suivantes ; Magnetar reste une option de recherche.

« Premier standard mondial » et « aucun concurrent » ne sont pas démontrables.
Le nom zk-MCP apparaît déjà dans une publication de décembre 2025. Ce dépôt ne
revendique ni adoption par les mainteneurs MCP ni certification réglementaire.

## 1. Ce que les sources établissent

### Magnetar et la filiation scientifique

Le [blog Microsoft Research de Srinath Setty](https://www.microsoft.com/en-us/research/blog/proof-based-general-purpose-computing-with-magnetar/),
publié le 15 octobre 2026, présente une zkVM fondée sur des hachages standards.
Il annonce des accélérations moyennes de 10 à 39 fois et environ 12 ms de
vérification. Ce sont des résultats de l'auteur, non reproduits ici ; les
accélérations ne concernent pas une gateway MCP complète.

La [notice technique Magnetar](https://www.microsoft.com/en-us/research/publication/magnetar-high-speed-post-quantumrv64-zkvm-from-standard-hashes/)
précise RV64I, un MacBook Pro M4 Max avec 12 cœurs de performance, des traces
de 2^22 cycles et une sécurité annoncée de 120 bits. Les mesures sont de
7,2–8,7 millions de cycles/s, environ 600 KiB par preuve et 11–13 ms pour la
vérification. Sur 15 charges, les moyennes géométriques annoncées sont 39×
contre SP1 Hypercube, 18× contre Jolt-Dory et 9,6× contre Jolt-Akita.
L'implémentation optimisée annoncée atteint 9,5–12,8 millions de cycles/s.
Ces nombres portent sur des configurations différentes des nôtres.

Le [papier complet, 44 pages](https://www.microsoft.com/en-us/research/wp-content/uploads/2026/10/magnetar-1.pdf)
décrit une preuve d'exécution RV64 et sa composition récursive. L'intérêt
architectural est de vérifier des preuves avec des opérations que la machine
prouve elle-même efficacement. La filiation associe arithmétique binaire,
sum-check, vérification mémoire et engagements polynomiaux. Le papier rappelle
également que la propriété zero-knowledge doit être distinguée d'un argument
succinct d'exécution. Pour une intégration, il faudra identifier la variante
exacte, les paramètres et les options de confidentialité effectivement livrés.

| Brique | État vérifié | Conséquence |
|---|---|---|
| [Spartan Microsoft](https://github.com/microsoft/Spartan) | Code Rust public ; R1CS ; variante basée sur le logarithme discret et Ristretto255 | Ce code n'est pas BinarySpartan et n'hérite pas des garanties post-quantiques annoncées pour Magnetar |
| [BinarySpartan, ePrint 2026/1656](https://eprint.iacr.org/2026/1656) | Prépublication reçue le 11 août 2026, révisée le 3 septembre ; Spartan sur corps binaires, Ligerito et ring switching | Publication exploitable pour la conception ; pas de SDK public vérifié par cette recherche |
| [Lasso, publication des auteurs](https://www.microsoft.com/en-us/research/publication/unlocking-the-lookup-singularity-with-lasso/) | Argument de lookup issu de Spark/Spartan ; tables structurées | Brique scientifique de la filiation, pas une API de gateway |
| [Jolt a16z](https://github.com/a16z/jolt) | Code public, RV64IMAC au moment de la consultation, MIT/Apache-2.0 ; avertissement alpha | Candidat expérimental distinct de Magnetar |
| Magnetar | Blog, notice et PDF publics ; aucun dépôt officiel correspondant trouvé | Stub explicite, aucune dépendance inventée |

Recherche de disponibilité : liens du blog, publications de Setty, recherche web
`Magnetar BinarySpartan github Srinath Setty`, puis API GitHub
`search/repositories?q=Magnetar+user:microsoft` et `q=BinarySpartan`.
Ces deux recherches API ont renvoyé zéro dépôt lors de cette session.
**« Code officiel non localisé au 15/10/2026 » est le verdict**, et non une
affirmation que Microsoft gardera définitivement le code fermé. Aucune licence
de code Magnetar n'a donc pu être vérifiée. Les homonymes GitHub ne constituent
pas des implémentations officielles.

### Backends utilisables indépendamment de notre POC

| Moteur | Exécution locale et ISA | Sécurité / maturité | Choix pour le dépôt |
|---|---|---|---|
| SP1 V6 Hypercube | Prover/verifier publics ; toolchain dédiée ; la documentation courante installe `riscv64im-succinct-zkvm-elf` | Vérifier le type de preuve et les hypothèses de la version choisie | Premier candidat pour un adaptateur réel |
| RISC Zero | `rzup`, `cargo risczero`, guest RISC-V et journal public | Distinguer receipt STARK, récursion et enveloppe Groth16 | Second candidat, test différentiel du même cœur |
| Jolt | CLI `jolt`, guest/host, preprocessing ; RV64IMAC | Dory avec option ZK ; Akita actuellement sans ZK selon le quickstart | Expérimentation ultérieure, pas un hook actif du POC |
| NativeSimulatorBackend | Processus Rust natif, Windows/Linux/macOS | Aucune soundness cryptographique ni confidentialité | Démo immédiate, refusé par défaut dans le firewall |

Sources : [SP1 introduction](https://docs.succinct.xyz/docs/sp1/introduction),
[installation SP1](https://docs.succinct.xyz/docs/sp1/getting-started/install),
[RISC Zero dépôt](https://github.com/risc0/risc0),
[installation RISC Zero](https://dev.risczero.com/api/zkvm/install),
[Jolt quickstart](https://jolt.a16zcrypto.com/usage/quickstart.html).

SP1 documente Linux/macOS comme plateformes natives. Sur cette machine Windows,
la preuve réelle sera à établir dans un environnement Linux/WSL ou CI dédié.
L'ancien raccourci « SP1 est nécessairement RV32 » est obsolète pour la
documentation V6 consultée. L'ISA doit être épinglée avec le backend.

Le [modèle de sécurité RISC Zero](https://dev.risczero.com/api/security-model)
sépare les hypothèses de chaque étage et explicite des limites de confidentialité.
Une compression Groth16 n'est pas équivalente à une preuve reposant seulement
sur des hachages. De même, un programme utilisant SHA-256 ne rend pas sa zkVM,
TLS, ses signatures d'origine et toute sa chaîne logicielle post-quantiques.

Les installations de référence sont `sp1up` puis `cargo prove --version`,
`rzup install` puis `cargo risczero --version`, ou la CLI Jolt et son exemple
`cargo run --release`. Consulter les pages liées, examiner les installateurs,
puis épingler versions et empreintes avant de lancer un benchmark reproductible.
Ces toolchains ZK ne sont **pas installées ni testées** par le présent bootstrap.

## 2. MCP : extension possible, garanties à construire

MCP décrit les échanges JSON-RPC, l'initialisation et les outils ; les résultats
peuvent transporter du contenu et des métadonnées. `_meta` est le mécanisme
d'extension approprié, mais la clé `zkp` n'est pas une extension approuvée par
MCP. Une clé sans préfixe est autorisée ; un nom de domaine inversé sera à
négocier pour réduire les collisions. Sources :
[spécification de base](https://modelcontextprotocol.io/specification/2025-11-25/basic),
[outils](https://modelcontextprotocol.io/specification/2025-11-25/server/tools).

La [spécification MCP](https://modelcontextprotocol.io/specification/2025-11-25)
aborde le consentement, les accès et la sécurité. Elle ne définit pas une preuve
ZK obligatoire d'exécution des outils. Dire que MCP impose une confiance
« aveugle » ou n'a aucune sécurité serait donc incorrect. Notre couche prouve
une relation de politique additionnelle et conserve les contrôles d'accès.

Le package demandé `@modelcontextprotocol/sdk` est épinglé ici à **1.32.1**,
version retournée par le registre npm lors de l'installation. Le
[dépôt officiel TypeScript](https://github.com/modelcontextprotocol/typescript-sdk)
indique désormais une génération V2 et une branche V1 historique. Ce choix
respecte l'intégration demandée et permet le POC, mais l'issue 04 doit traiter
la migration V2 avant toute publication stable. Tests effectués avec le client
officiel sur transports mémoire et stdio ; Claude Desktop, Cursor et LangChain
n'ont pas été lancés dans cette session.

## 3. Analyse concurrentielle : l'écart est plus étroit que le prompt initial

| Source primaire consultée | Recouvrement constaté | Ce qui reste à distinguer |
|---|---|---|
| [Jing et Qi, arXiv:2512.14737](https://arxiv.org/abs/2512.14737), 11 décembre 2025 | Emploie déjà zk-MCP ; audit privé des communications, implémentation annoncée en Circom | Notre relation porte sur une autorisation avant mutation DevSecOps |
| [ICME PreFlight](https://www.icme.io/product) | Produit annoncé de contrôle avant action et reçus ZK, accessible via MCP | Interopérabilité ouverte multi-zkVM, code et modèle de confiance à comparer ; ses annonces ne sont pas auditées ici |
| [Bolyra](https://bolyra.ai/) et [code public](https://github.com/bolyra/bolyra) | Gateway MCP, politiques par outil, reçus signés et primitives ZK annoncées | Vérifier la relation effectivement prouvée et son imposition avant mutation ; le réduire à de simples signatures serait incomplet |

Ces sources suffisent à réfuter une affirmation générale d'absence de marché.
Elles ne constituent pas un inventaire exhaustif ni un audit de ces produits.
Les requêtes web utilisées incluaient `"zk-MCP" proof` et
`"verifiable MCP" zero knowledge`, suivies de l'ouverture des sources primaires.

**Hypothèse de différenciation à valider auprès d'utilisateurs** : un profil
interopérable et documenté qui lie le code de politique, des faits collectés,
un projet/MR/SHA exact, une fraîcheur bornée et un nonce, puis impose ce profil
au seul composant détenteur du droit de merge. La valeur n'est pas le nom
zk-MCP : c'est la possibilité d'auditer et remplacer séparément le prover,
les connecteurs et le vérifieur.

## 4. Portabilité réaliste : le code métier, pas un ELF universel

Le trait `ZkVmBackend` expose `name`, `image_id`, `prove`, `verify`. Les entrées
publiques, privées et les sorties ont un schéma indépendant. Le cœur métier
est `no_std` et les nombres sont explicitement bornés. Les programmes
SP1/RISC Zero devront chacun lire les entrées, recalculer les engagements,
exécuter ce cœur et publier le même journal canonique.

La migration demandera **une recompilation et un adaptateur d'ABI**, des tests
de conformité, une nouvelle image et ses clés de vérification. Une ISA RV32,
RV64IM ou RV64I, des syscalls et des conventions de journal différents rendent
la promesse du même binaire sur tous les moteurs injustifiée. BinarySpartan
est le moteur de preuve, pas une ABI RV64 à lui seul. Aucun branchement
Magnetar « sans travail » ne peut être promis avant publication de son SDK.

La migration peut préserver l'évaluateur et le wire MCP, sous réserve que les
sorties publiques et leurs garanties restent identiques. Le registre de
confiance doit associer le digest de l'ELF à l'image/vkey native du moteur ;
il ne faut jamais remplacer une vérification de receipt par un simple SHA
du fichier.

## 5. Positionnement banque/assurance et limites réglementaires

Le profil cible des preuves techniques d'application des règles de changement
logiciel. DORA couvre notamment la gestion des risques TIC et des contrôles ;
l'AI Act prévoit des mécanismes de journalisation pour certains systèmes à
haut risque. Références : [DORA, texte EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?qid=1699778718647&uri=CELEX%3A32022R2554),
[AI Act, article 12, page 59 du texte officiel](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?qid=1730976229091&uri=OJ%3AL_202401689).
Certains accès directs EUR-Lex ont rencontré un challenge JavaScript ; les
liens de recherche officiels accessibles sont conservés ci-dessus.

Une preuve de ces quatre conditions ne démontre ni la conformité globale
d'une entreprise, ni la légalité d'un usage IA, ni l'absence de vulnérabilités.
Le coffre d'audit envisagé doit conserver provenance, décisions, versions,
identités d'approbation et résultat API, selon une matrice d'exigences validée
pour le contexte du client. Aucun avis juridique ou certificat n'est produit.

## 6. Benchmark et critères de décision

Le benchmark local distingue génération du reçu, vérification autorisante,
rejet métier et reçu falsifié. Il mesure le worker Rust release, l'IPC et le
firewall ; le réseau et les véritables preuves sont absents. Voir
`04-VALIDATION.md` et `tests/benchmarks/`.

La cible de 5 ms est évaluée au p95 et accompagnée du maximum observé ; elle
n'est pas un engagement temps réel. Les 11–13 ms publiées pour Magnetar ne
permettent pas de promettre une vérification complète sous 5 ms. Les comparaisons
futures doivent fixer : hardware, threads, RAM, versions, niveau de sécurité,
prétraitement, type de preuve, confidentialité, taille de trace, démarrage
froid/chaud et coût du transport.

Décision de poursuite : implémenter un backend réel, prouver toute la liaison
entrée/politique/action/journal, puis valider les connecteurs et le contrôle
pré-mutation. Une source authentifiée et une preuve valide sont toutes deux
nécessaires ; aucune ne remplace l'autre.
