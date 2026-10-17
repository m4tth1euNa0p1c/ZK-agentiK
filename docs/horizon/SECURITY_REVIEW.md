# Horizon — revue contradictoire de sécurité

Date : 17 octobre 2026. Statut : **contrat de revue et examen indépendant du code**.
Cette revue distingue une relation cryptographique, une décision actuelle et
un effet observé. Elle ne constitue pas un audit indépendant des primitives.
Les essais effectivement exécutés sont consignés dans
[EXPERIMENT_LOG.md](EXPERIMENT_LOG.md) ; une exigence ci-dessous n'est pas un
résultat acquis par sa présence dans ce document.

## Décision du comité contradicteur

**GO pour un laboratoire synthétique borné ; NO-GO pour une mise en production,
une prétention de nouveauté cryptographique ou une demande commerciale validée.**
Le scénario choisi est `record_claim_authorization` : enregistrer une décision
sur un dossier d'assurance synthétique. Il ne paie pas un sinistre, ne réserve
pas une provision et ne réduit pas un plafond annuel. Le passage à l'une de ces
actions exigerait une nouvelle relation métier et une revue de l'état cible.

La préparation réutilisable de Vega est une piste technique réelle. Son livre
distingue cependant le proof-system des circuits applicatifs de parsing et de
signature. Son API de vérification retourne les valeurs publiques ; c'est à
l'application de les comparer à l'énoncé attendu. Son moteur canonique emploie
T256/Hyrax : il ne justifie pas une revendication post-quantique.
Sources primaires : [périmètre Vega](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/overview/design-goals.md),
[contrat de vérification](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/spec/scope.md),
[moteur](https://raw.githubusercontent.com/microsoft/vega-prover/main/book/src/building-blocks/fields-and-groups.md).

## 1. Relation choisie et changement de contrat d'émission

Deux autorités distinctes attestent des engagements de Pedersen :

- l'expert atteste `A = a G + r_a H`, où `a` est le montant admissible ;
- l'assureur atteste `C = c G + r_c H`, où `c` est le plafond par opération.

Les signatures Ed25519 sont publiques et vérifiées nativement. Chaque message
signé lie au minimum le domaine de protocole, le rôle et l'identité de
l'autorité, l'engagement, le dossier, la devise et son échelle, la version,
la période de validité et la clé du détenteur autorisé. Le registre du
vérifieur impose les rôles et clés : l'appelant ne choisit pas une autorité
en fournissant une clé avec sa preuve.

Ce profil demande aux autorités de **signer des engagements adaptés**. Il
n'authentifie pas des credentials Jira, JWT, mDL ou documents d'assurance
existants sans changement d'émission. Une signature sur un engagement atteste
l'engagement ; l'autorité doit avoir contrôlé son ouverture et la signification
du montant avant de signer. Une clé synthétique publiée teste le mécanisme,
elle n'authentifie aucune organisation réelle.

La preuve agrégée de deux plages de 32 bits porte sur les engagements dérivés
`A-G` et `C-A`. Avec les générateurs et l'ordre de groupe de la bibliothèque
épinglés, la relation entière est exactement :

```text
0 <= a - 1 < 2^32
0 <= c - a < 2^32
donc 1 <= a <= 2^32 et a <= c <= a + 2^32 - 1 <= 2^33 - 1.
```

Elle ne donne pas `c < 2^32`. L'application doit annoncer ces bornes exactes
ou ajouter la contrainte manquante ; elle ne doit pas changer leur description
pour faire correspondre le circuit à un type `u32`. Les plages, bien plus
petites que l'ordre du groupe, doivent empêcher d'interpréter une différence
négative comme un montant positif après réduction modulaire.

Le vérifieur dérive lui-même `A-G` et `C-A` des engagements signés. Accepter des
engagements de plage indépendants fournis par le prover supprimerait la liaison
aux attestations. Les deux attestations doivent porter sur le même dossier,
devise, échelle, version, période et détenteur selon la règle de jointure fixée.
Des signatures valides sur des dossiers différents ne composent pas une autorité.

## 2. Profils de présentation et fraîcheur

### A — preuve liée à la demande

Le transcript de la preuve lie les attestations exactes et le contexte
d'autorisation attendu : action, cible/tenant, politique et epoch, version de
révocation, opération métier, nonce et expiration. Tous les champs affectant
l'effet appartiennent à ce contexte. Une signature du détenteur est requise
lorsque le profil impose sa participation : connaître les ouvertures ne doit
pas devenir implicitement un droit de représenter leur titulaire.

### B — preuve immuable et autorisation fraîche du détenteur

La preuve immuable lie les attestations et le profil mathématique. Une
signature fraîche du détenteur couvre **le digest exact du bundle immuable
vérifié** ainsi que tout le contexte courant de la demande. Le digest inclut
preuve, attestations, encodages et identifiant de relation ; aucun composant
substituable ne reste hors de cette liaison.

C'est une **autorisation composite fraîche sur une preuve historique**, pas
une nouvelle preuve ZK, une récursion ou une preuve de fraîcheur des faits.
La preuve immuable est entièrement vérifiée lors de son admission initiale.
Les clés de confiance, dates, révocations, politique et état de l'opération
sont recontrôlés pour chaque demande avant dispatch.

Un cache peut retenir la validité cryptographique du bundle immuable, avec
une clé couvrant ses octets exacts, le profil, les paramètres et la version du
vérifieur. Il ne mémorise jamais un verdict « autorisé maintenant ». Un hit
ne dispense pas de vérifier la signature fraîche ni l'état courant. Éviction,
redémarrage ou absence du cache provoquent une vérification complète, jamais
une acceptation par défaut. Un changement de racine de confiance ne réutilise
pas silencieusement un ancien verdict d'authenticité.

### C — sélection du chemin selon une politique serveur

Le sélecteur peut choisir A/B, ou une vérification native d'ouvertures si et
seulement si la politique autorise explicitement cette divulgation. Un mode
privé ne devient pas public à cause d'une panne, d'un coût ou d'une option du
caller. Aucun backend absent n'est remplacé par une simulation acceptée.
Un refus de politique ne sert pas de signal pour essayer un profil plus faible.

## 3. Confidentialité réellement recherchée

| Acteur / observation | Données visibles ou limite |
| --- | --- |
| Autorité émettrice | Le montant dont elle atteste l'engagement et son contexte |
| Prover/détenteur | Les deux montants et ouvertures dans ce prototype ; aucune confidentialité entre autorités et prover |
| Vérifieur privé | Engagements, signatures, autorités, contexte public, verdict et preuve |
| Profil divulgation autorisée | Les ouvertures et donc les valeurs transmises au vérifieur |
| Réutilisation de B | Le bundle fixe est corrélable entre présentations |
| Opérateur du prover | Accès potentiel au witness en mémoire/fichiers ; hors protection ZK |

Les engagements et signatures publics réutilisés permettent la corrélation,
même si une preuve de plage est randomisée. Le profil ne promet donc ni
unlinkability, ni confidentialité des émetteurs, du dossier, de la politique
ou des dates. Il ne cache pas les montants au système qui effectue ensuite
un paiement ; cette dernière action n'existe pas dans le laboratoire.

Il faut utiliser les RNG cryptographiques des bibliothèques, des ouvertures
aléatoires indépendantes et des générateurs fixés. Des preuves différentes
ou l'absence de mots sensibles dans un JSON ne démontrent pas la propriété
ZK. Temps, taille, codes de refus, logs et requêtes successives restent des
canaux à qualifier. Les variations de seuil ne sont pas librement offertes
à l'agent ; une série de réponses pourrait révéler un montant.

## 4. État, révocation et effets

Le nonce et l'identité métier ont des rôles différents. Le premier empêche
le rejeu d'une demande ; la seconde empêche qu'un nonce neuf réautorise le
même enregistrement. La réservation doit être durable et atomique en
concurrence. L'identité métier ne doit pas dépendre d'un nonce, d'un mode de
preuve ou d'une version de politique modifiables pour répéter l'effet.

La réservation SQLite et l'effet externe ne constituent pas automatiquement
une transaction unique. `UNKNOWN` reste consommé jusqu'à réconciliation de
la cible ; une réponse perdue ne justifie pas un retry avec une autre identité.
Une cible simulée transactionnelle permet de tester son contrat d'idempotence,
pas de l'attribuer à une API de paiement réelle.

Dates, politique active et état des autorités/détenteurs doivent être relus
après chaque attente précédant le dispatch. Une version de révocation dans
une signature lie un état déclaré ; elle ne prouve pas que cet état reste
le plus récent. Hors réseau, le vérifieur peut établir une validité historique
avec un bundle de confiance daté, sans attester une non-révocation actuelle.

Une panne du prover, du store ou d'une source requise bloque le profil normal.
La recovery reste un protocole séparé à mandat borné, non implémenté ici.
Ni LLM ni sélecteur de coût n'accordent une dérogation. Le plafond prouvé est
par opération : un plafond cumulé consommable exigerait un ledger autoritatif
avec réservation atomique, hors de la relation choisie.

## 5. Cas éliminatoires et preuves attendues

| Attaque / défaut | Résultat requis |
| --- | --- |
| Autre clé signataire, rôle inversé, signature changée | Refus d'authenticité, zéro effet |
| Attestations de dossiers/devise/échelle/version/période/holder différents | Refus de jointure, zéro effet |
| Plage prouvée sur engagements étrangers aux signatures | Refus cryptographique ou de liaison, zéro effet |
| `a=0`, `a>c`, différence hors borne, valeur au bord des plages | Respect de la relation exacte ; aucun wrap autorisant |
| Changement d'action, tenant, politique, nonce ou expiration | Refus de liaison à la demande indépendante |
| Bundle B changé après signature fraîche, y compris substitution de preuve | Refus ; cache ancien inutilisable |
| Clé/politique révoquée ou date expirée sur cache hit | Refus courant malgré preuve historique valide |
| Deux demandes concurrentes avec nonces distincts | Un seul enregistrement métier |
| Redémarrage après réserve ou résultat externe ambigu | Opération consommée ; réconciliation avant toute reprise |
| Ouvertures exposées alors que la politique exige le mode privé | Échec du test de confidentialité, aucun fallback |
| JSON/points/signatures/preuves malformés ou trop longs | Refus borné ; aucune allocation non bornée ni crash autorisant |

Les tests doivent identifier les refus attendus ; une panne de compilation,
un fichier absent ou un timeout du harness ne comptent pas comme une attaque
correctement rejetée. Les preuves corrompues structurellement valides doivent
atteindre le vérifieur cryptographique. Les contrôles d'état utilisent un
compteur observable de la cible, pas seulement le message retourné.

## 6. Vote marché et critères d'arrêt

Les antériorités incluent les prédicats et présentations multi-credentials
d'[AnonCreds](https://hyperledger.github.io/anoncreds-spec/), les plages et
compositions de [Dock](https://docknetwork.github.io/crypto-wasm-ts/), et les
credentials existants de [Crescent](https://github.com/microsoft/crescent-credentials)
et [Longfellow](https://github.com/google/longfellow-zk). Le standard BBS seul
ne fournit pas automatiquement une comparaison arbitraire de deux montants
privés ; les extensions de plage doivent être nommées et comparées séparément.

Le risque commercial principal est l'absence de besoin d'une garantie
supplémentaire : un assureur peut accepter un verdict signé de son mandataire
ou accéder déjà aux deux montants. Une comparaison native divulguant les
valeurs n'a pas la même confidentialité ; un verdict signé change l'autorité
de décision. Ce sont néanmoins des substituts économiques à tester.

Pour poursuivre au-delà du laboratoire, deux organisations doivent présenter
le même dossier : autorités factuelles acceptées, calcul agrégé non accepté
sur simple signature, information réellement non partageable, coût du blocage,
responsable du contrôle et budget. Il faut également accepter le changement
d'émission vers les engagements signés. Sans ces conditions, **arrêt du
produit ZK**, même si les mesures locales sont rapides.

Arrêt technique si la liaison fraîche de B ne peut être établie, si le gain
nécessite de supprimer une contrainte, si la cible reste contournable, si un
refus permet un effet ou si une fuite contredit le profil choisi. Les
paramètres, circuits et dépendances restent à auditer avant données réelles.

## 7. État de revue du code

La revue en lecture seule couvre `labs/horizon/proof/src/{lib,main,tests}.rs`,
`packages/horizon-demo/src/{types,worker,server,store}.ts` et les scénarios
`tests/horizon/{firewall.test,crash-child}.ts`. Elle a été
menée séparément des auteurs de ces fichiers. Ce partage de rôles n'est
pas une certification externe ni un audit des primitives amont.

Deux défauts concrets ont été signalés puis corrigés dans le code examiné :

- Le prover acceptait le mode `disclosure` fourni dans une demande, même si
  la politique du vérifieur exigeait la confidentialité. Le prover possède
  désormais sa propre politique approuvée et refuse tout mode, identité de
  client, audience, action ou version de politique qui s'en écarte. Il
  n'expose pas les ouvertures en réponse à une demande de downgrade.
- Le résultat du worker ne transportait que la borne d'expiration. Un recul
  d'horloge après vérification pouvait placer le dispatch avant la validité
  des sources sans dépasser la borne du challenge. `Verified.not_before_ms`
  transporte maintenant le maximum des bornes inférieures, recontrôlé dans
  les deux transactions avant effet.

La lecture confirme une comparaison complète avec le challenge attendu
indépendant ; les engagements de plage dérivent des engagements signés ;
les rôles et clés des autorités proviennent du registre approuvé. La
signature fraîche du détenteur couvre attestations, contexte et payload
exact. B vérifie encore la preuve complète à chaque admission : **aucun
cache de vérification n'est implémenté**. Le worker sérialise ses échanges
JSONL, limite sa file à huit requêtes et échoue fermé sur timeout.

SQLite réserve atomiquement le nonce et l'opération métier, puis recontrôle
horloge et epochs dans la transaction de la cible simulée. `UNKNOWN` et
`RESERVED` restent consommés, y compris après redémarrage. Cette lecture
n'attribue aucune transaction distribuée à une API distante.

Validation connue au moment de cette mise à jour :

- Le réviseur a exécuté `node --test tests/horizon/stats.test.mjs` : 11 tests
  réussis, dont le calcul indépendant des rangs binomiaux et l'encodage des
  bornes infinies. Le cas singleton p99 possède légitimement une borne
  inférieure finie ; le test initial erroné a été corrigé.
- L'auteur du module cryptographique a rapporté neuf tests Rust réussis,
  ainsi que formatage et Clippy strict. Les tests incluent une modification
  canonique de `t_x`, re-signée par le détenteur, qui passe le parseur mais
  échoue avec `INVALID_RANGE_PROOF`, et un candidat hors plage construit
  directement par la bibliothèque amont sans précontrôle de notre wrapper.
  Le journal d'expériences conserve les commandes et sorties définitives.
- Le réviseur a ensuite exécuté `npm run test:horizon` : **18 tests réussis,
  zéro échec, zéro skip**, code de sortie 0, dont les 11 tests statistiques
  et sept groupes d'intégration. La suite utilise le véritable worker Rust
  et ses preuves de plage. Elle observe une admission, puis l'exclusion du
  rejeu et d'un nouveau nonce pour la même opération ; un processus vérifieur
  séparé reçoit uniquement le bundle public. Elle teste aussi révocation,
  changement de politique, expiration, recul d'horloge avant la validité des
  sources, expiration entre réservation et dispatch, redémarrage après sortie
  du processus suivant une réservation durable, résultat `UNKNOWN`, refus
  inter-tenant et worker absent. Les refus de politique/date sont assortis
  d'un compteur de cible égal à zéro. La réconciliation après résultat ambigu
  constate un effet existant sans en créer un autre.
- Le scénario HTTP rejette le downgrade vers divulgation, une signature
  altérée, la substitution des attestations et un tenant changé. La version
  finale émet deux challenges avant consommation, obtient deux véritables
  présentations et soumet quatre requêtes concurrentes, deux par nonce.
  Elle constate exactement une admission et un effet. Le réviseur a relancé
  `npm run test:horizon` après ce renforcement : **18/18 réussis**, code 0.
  Cette concurrence de requêtes sur un serveur ne constitue pas un essai
  de crash matériel ou de contention entre plusieurs processus SQLite.

Le code examiné refuse maintenant de créer un challenge pour une opération
déjà consommée et traite les erreurs du flux stdin du worker. Une erreur HTTP
générique est décrite comme `rejected_or_unknown` avec réconciliation requise
avant retry : elle n'affirme plus « zéro effet » sans l'avoir constaté. Le
test du binaire absent est exécuté ; un EPIPE pendant une écriture en cours
n'a pas été injecté spécifiquement dans cette suite.

Limites conservées : les endpoints opérateur sont ceux d'une démonstration
locale sans authentification de production ; les deux processus ne sont pas
une isolation contre l'administrateur de la machine. Les clés et données
sont synthétiques. Les autorités signent des engagements adaptés ; aucun
fait réel ni statut de révocation externe n'est acquis. Le log chaîné local
n'est pas protégé contre la réécriture complète par l'opérateur du disque.
L'existence d'une autorisation ne démontre ni conformité réglementaire,
ni besoin économique, ni innocuité d'une future action de paiement.

Vote maintenu : **GO laboratoire sur cette relation bornée ; NO-GO
production et marché**. Les tests adversariaux réussis réduisent les défauts
connus du prototype ; ils ne démontrent pas l'absence de toute vulnérabilité.

## Revue finale du déploiement et des résultats

Le contradicteur a relu le relais sans secret : destinations et routes fixes,
corps/réponses/files bornés, refus de CONNECT et upgrade, absence de retry
automatique, résultat inconnu conservé après erreur d'un POST transmis.
Seul ce relais publie des ports loopback ; les processus portant witness et
état d'action restent sur le réseau interne. Aucun défaut bloquant identifié
dans ce périmètre. Les limites IAM et opérateur local restent présentes.

Le contrôleur principal a exécuté le smoke HTTP réel, les refus de routes,
origine et corps trop grand, puis le redémarrage et le refus de rejeu/nouveau
challenge avec un effet persistant. La fixture publique a également été
vérifiée en conteneur sans réseau ni volume. Ce sont des essais de sandbox,
pas une qualification d'un environnement financier.

La revue des données a recalculé les deux réductions de p95 depuis les bruts,
contrôlé les 13 phases × 500 observations et les 11 empreintes de référence.
Le gain après `OnceLock` concerne seulement des paramètres publics immuables.
Le parcours durable de 13,014 ms au p95 dépasse son hypothèse de 10 ms.
Le verdict final conserve ce résultat négatif et l'absence de record externe.
