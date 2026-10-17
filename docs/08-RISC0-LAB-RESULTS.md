# Premier backend réel : résultats du 15 octobre 2026

**Quatre preuves RISC Zero `Succinct` ont été générées et vérifiées localement :
trois décisions critiques autorisantes et un refus dû à l'arrêt d'urgence.**
Le vérifieur séparé accepte les premières et refuse d'autoriser la seconde,
après validation cryptographique. Le serveur MCP reste en simulation ; ce banc
historique ne déclenche aucune mutation.

La faisabilité du calcul prouvé est établie sur ces fixtures. **L'objectif de
rejet cryptographique sous 5 ms et le flux synchrone avec challenge de 30 s
échouent sur cette configuration CPU.** La confidentialité de secrets critiques
reste non qualifiée, pour les raisons documentées dans
[le modèle de sécurité](07-STACK-SECURITY-AND-PERFORMANCE.md).

## Mesures réelles

| Mesure | Profil critique autorisant | Profil critique refusé |
| --- | ---: | ---: |
| Nombre de preuves produites | 3 | 1 |
| Générations, dans l'ordre (s) | 153,681 ; 163,232 ; 158,619 | 157,560 |
| Vérification à chaud, p50 / p95 / max (ms) | 13,048 / 13,697 / 14,343 | 12,921 / 13,822 / 14,723 |
| Rejet d'un seal altéré, p50 / p95 / max (ms) | 6,394 / 6,950 / 8,640 | 6,355 / 6,718 / 7,485 |
| Évaluation native signée, p50 / p95 / max (ms) | 0,039 / 0,054 / 0,106 | 0,041 / 0,073 / 0,210 |
| Seal cryptographique (octets) | 222 668 | 222 668 |
| Journal public (octets) | 324 | 350 |
| Bundle JSON preuve + journal (octets) | 298 510 | 298 582 |
| Cycles totaux / segments | 1 310 720 / 2 | 1 310 720 / 2 |
| Cycles utilisateur | 1 061 928 | 1 053 743 |

Rapports JSON conservés sans modification :
[critique](../tests/benchmarks/risc0-cpu-2026-10-15-critical.json),
[refus](../tests/benchmarks/risc0-cpu-2026-10-15-denied.json).
Le contexte horodaté du run de refus est conservé dans
[environment.json](../tests/benchmarks/risc0-cpu-2026-10-15-environment.json) ;
il ne fournit pas les heures de début et de fin du run critique antérieur.

La génération inclut l'appel au sous-processus `r0vm` et les contrôles du backend,
sur une installation déjà construite. Elle exclut compilation, collecte,
réseau, API et démarrage de Docker. Ce n'est pas une mesure de démarrage à froid
de l'infrastructure. Trois échantillons ne permettent pas d'estimer un p95 de
service ; le `p95_ms` du rapport de génération est seulement un quantile
empirique, ici le maximum.

Vérification et rejet sont répétés 100 fois, après 10 vérifications de chauffe,
sur le même receipt chargé en mémoire. Le temps de vérification inclut le
contrôle cryptographique et les liaisons du journal. Celui du rejet est mesuré
sur un bit changé au milieu du seal complet, directement dans le vérifieur
cryptographique : ni expiration ni erreur JSON ne peuvent expliquer le refus.
Le chargement du fichier, le décodage Base64 et le démarrage du processus ne
sont pas compris dans ces mesures à chaud. La convention des quantiles est
décrite dans le [protocole de mesure](07-STACK-SECURITY-AND-PERFORMANCE.md).

Les deux premières preuves autorisantes ont des octets différents. Cela ne
démontre pas une propriété ZK. Le champ `independent_proofs_differ: false` du
scénario refusé signifie qu'une seule preuve a été produite, pas que le prover
serait déterministe. Une première tentative exploratoire sans précompiles a
été interrompue sans résultat ; aucun facteur d'accélération n'en est déduit.

## Machine et identité du calcul

- Hôte Windows x64, Intel Core Ultra 7 265F, environ 32 GiB de RAM.
- Docker Engine 28.5.2, Linux WSL2 `6.6.87.2-microsoft-standard-WSL2`.
- Conteneur limité à **8 CPU, 12 GiB**, `RAYON_NUM_THREADS=8`, sans réseau
  pendant génération et vérification ; aucun service de preuve distant.
- Image `rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922`.
- Rust hôte 1.98.0, toolchain guest RISC Zero 1.97.0, `rzup` 0.5.0,
  `r0vm` et SDK 3.0.6 ; lockfiles hôte et guest conservés.
- Preuve `Succinct`, mode développement interdit, segment `po2=20`,
  limite de session 16 000 000 cycles. Précompiles SHA-256 et Ed25519 épinglés
  dans [le manifeste guest](../labs/risc0/methods/guest/Cargo.toml).
- GPU RTX 5060 Ti 16 GiB présent mais **non utilisé**. Aucun chiffre GPU.

Le cgroup a atteint son plafond de 12 GiB sur sa durée de vie, sans événement
OOM ni processus tué par l'OOM killer. Ce compteur cumule installation,
compilations, cache et essais ; **il ne mesure pas le pic isolé d'une preuve**.
Une campagne de capacité doit remettre les compteurs à zéro par exécution et
mesurer la concurrence. Les 12 GiB sont une limite testée, pas un dimensionnement
de production garanti.

SHA-256 de l'ELF prouvé :

```text
53cbbc340bc8ab586353893f22d64daf5ffa756a41c798a55db203ca3ee9d29e
```

Image ID native RISC Zero, huit mots `u32` :

```text
[2022839068, 257765873, 776957775, 296799569,
 1367979543, 1424068181, 2094130782, 3225387710]
```

Le vérifieur reconstruit épingle ces deux identités. Il ne les accepte pas
sur simple déclaration du prover. Le manifeste des fixtures contient les
empreintes des fichiers publics et des lockfiles ; il sert à la reproduction,
sans être une attestation signée indépendante de ce dépôt.

## Tests de sécurité exécutés

| Essai | Résultat observé et portée |
| --- | --- |
| Journaux natif / VM, profils de base et critique | Identiques ; exécution VM réelle. Le profil de base n'a pas fait l'objet d'une preuve complète dans cette campagne |
| Signature invalide et witness modifié | Le guest refuse avec `INVALID_SIGNATURE` et `COMMITMENT_MISMATCH`, sur les deux profils ; erreurs d'infrastructure exclues des succès |
| Seal altéré, mauvaise image, journal changé, mauvais projet attendu | Refus du vérifieur réel |
| Receipt `Fake` et `RISC0_DEV_MODE=1` | Refus ; import limité au type concret `SuccinctReceipt` |
| Sortie déclarée différente du journal prouvé | Refus par l'adaptateur Rust |
| Arrêt d'urgence activé, engagement et signature mis à jour | Preuve valide d'un refus ; autorisation historique rejetée avec `POLICY_DENIED` |
| Vérifieur dans un autre conteneur, sans witness | Preuve autorisante acceptée ; preuve de refus cryptographiquement valide mais non autorisée |
| Arrêt / approbation changé pendant la réservation de l'opération | Test de la gateway corrigée : relecture après réservation, zéro mutation, opération consommée ; test séparé en simulation |

Ces essais démontrent des propriétés sur les entrées testées, pas une preuve
formelle d'absence de bugs ni un audit du système cryptographique.
Le guest utilise une clé Ed25519 de fixture dont la graine privée est publiée.
La signature teste le mécanisme, sans authentifier un fournisseur réel.
La pile complète n'est pas post-quantique avec cette signature.

Contrôles logiciels réussis : **14 tests Rust du workspace principal, 25 tests
Node/MCP, 6 tests du laboratoire** (2 unitaires et 4 régressions sur receipts
réels), types TypeScript stricts,
schéma JSON, formatage et Clippy sans avertissement. Le cœur partagé compile
aussi pour la cible `riscv32im-unknown-none-elf` sans `std`.
Les six exécutions VM dédiées (deux valides, quatre adverses) et les quatre
générations de preuve sont distinctes des tests unitaires.

Pour Clippy du workspace de laboratoire, `RISC0_SKIP_BUILD=1` évite que le
wrapper Clippy de l'hôte soit propagé au compilateur guest spécialisé.
Ce contrôle couvre les crates hôtes ; il ne remplace pas la compilation réelle
du guest. Le build et les vérifications de fixtures ont été exécutés ensuite
sans cette option, avec l'image réelle attendue.

## Reproduire

Prérequis : Docker Linux fonctionnel et mémoire disponible pour la limite
de 12 GiB. La première installation nécessite le réseau, de l'espace disque
et une compilation ; les exécutions de preuve sont ensuite hors réseau.

```bash
# Reconstruire et vérifier les deux preuves publiques conservées, sans en générer.
npm run lab:risc0 -- verify

# Générer trois nouvelles preuves autorisantes puis une preuve de refus.
npm run lab:risc0 -- critical 3
npm run lab:risc0 -- denied 1
```

La vérification rapide réussit uniquement si la fixture autorisante est
acceptée et si la fixture refusée termine avec `POLICY_DENIED`, et non avec une
erreur de lecture ou d'infrastructure. Chaque vérifieur s'exécute dans un
conteneur sans réseau, en lecture seule, avec uniquement son binaire, les
preuves et les challenges publics. Le prover conserve son conteneur et ses
caches pour les prochaines compilations ; celui-ci n'a qu'un montage du dépôt
en lecture seule. Le Dockerfile de production reste à concevoir.

Les challenges historiques de fixture sont volontairement fixes. Un résultat
`VERIFIED` n'autorise **aucun appel API actuel** : le vérifieur historique ne
possède ni horloge de décision, ni registre durable anti-rejeu, ni credentials.

Contrôles du laboratoire après son installation :

```bash
docker exec zk-agentik-risc0-lab bash -c 'cd /lab/source/labs/risc0 && RISC0_BUILD_LOCKED=1 cargo test --release --workspace --locked --offline'
docker exec zk-agentik-risc0-lab bash -c 'cd /lab/source/labs/risc0 && RISC0_SKIP_BUILD=1 cargo clippy --release --workspace --all-targets --locked --offline -- -D warnings'
docker exec -e RISC0_DEV_MODE=0 zk-agentik-risc0-lab /lab/target/release/lab-execution-checks
```

Le setup installe Clippy dans la toolchain hôte pendant sa phase réseau.
Les empreintes du bootstrap `rzup` et de `r0vm` sont contrôlées par `setup.sh`.
Si une URL d'installation mutable change son contenu, le setup échoue ; la
révision du pin doit être explicite.

## Nouvelle baseline native et décisions

Le [nouveau rapport natif](../tests/benchmarks/baseline-2026-10-15-bound-receipt.json)
mesure un reçu JSON valide dont le digest est modifié, en exigeant l'erreur
`INVALID_RECEIPT`. Le p95 est de 0,267 ms pour ce rejet et de 0,053 ms pour
le refus métier immédiat, sur 300 mesures. Le seuil du simulateur passe.
Le rejet métier n'y vérifie pas une preuve ZK ; le JSON reste une simulation.
Les rapports natif et RISC Zero ont des périmètres différents et ne justifient
pas un ratio de performance équivalent. La machine n'était pas réservée à un
benchmark : les tâches de développement et le système peuvent affecter les temps.

Ordre de travail issu des résultats :

1. **Issue 03 : budget de latence et comparaison mesurée.** Tester le même ELF
   avec un `r0vm` construit pour CUDA, puis comparer un autre backend et une
   baseline de verdict signé. Le binaire CPU actuel ne devient pas accéléré
   par le seul ajout de `--gpus all`. Aucun gain GPU n'est acquis.
2. **Issues 02/01 : fraîcheur et intégration.** Le chemin CPU de 154–163 s
   dépasse le TTL de 30 s avant transport ou dispatch. Évaluer le pré-calcul
   sur artefact immuable et une liaison finale au challenge ; conserver une
   vérification complète avant mutation. Ne pas supprimer l'expiration pour
   faire passer la démo.
3. **Issue 07 : autorités réelles et confidentialité.** Fixer les données
   effectivement signées, le registre de confiance, révocation, droits et
   modèle de fuite acceptable avec le fournisseur/client. La confidentialité
   critique est un critère bloquant, pas un argument commercial acquis.
4. **Issue 08 : firewall durable.** Brancher le backend au chemin MCP seulement
   avec stockage transactionnel, contrôle cible des préconditions et essais
   de panne, de concurrence, d'expiration et de résultat ambigu.

Le pilote d'admission interentreprises reste une hypothèse à qualifier. Ce
banc fournit une preuve d'exécution et un coût observable ; il ne démontre ni
une niche inexistante, ni une supériorité économique, ni une certification.
