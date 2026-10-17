# HORIZON — design cryptographique provisoire M3

Version de recherche du 17 octobre 2026. Ce profil est distinct du wire zk-MCP
existant et des preuves RISC Zero. Son effet de démonstration est
`record_claim_authorization`, un enregistrement simulé de décision. Il ne
déclenche aucun paiement et ne démontre aucun droit légal à indemnisation.

## 1. Question vérifiée et frontières de confiance

Un expert atteste un montant privé `a`, une autorité de délégation un plafond
privé `c`. Le détenteur veut montrer que le montant respecte une borne et ne
dépasse pas le plafond. Le vérifieur voit la relation satisfaite et les
métadonnées publiques, sans voir les valeurs ni leurs ouvertures dans les modes
privés. La politique est publique. L'émetteur demeure responsable de la vérité
du fait : une preuve correcte sur une expertise erronée reste possible.

Les autorités construisent ou contrôlent chacune l'engagement de **leur propre
fait autoritatif**. Elles ne signent pas aveuglément un point apporté par le
demandeur. L'échange d'ouvertures avec le détenteur exige un canal sûr. Le
laboratoire utilise des fixtures et des clés générées avec l'aléa système ; il
ne démontre ni acquisition de faits externes ni protection matérielle des clés.

Les rôles montant/plafond ont des clés autorisées distinctes dans un registre
du vérifieur. Les deux attestations doivent viser les mêmes tenant, sujet,
devise, exposant, version, période et clé du détenteur. L'opération, le dossier,
l'audience et la politique attendus viennent du vérifieur, pas de la preuve.

## 2. Relation et bornes entières exactes

Utiliser les générateurs standard `PedersenGens::default()` de la bibliothèque :

```text
A = a·G + r_a·H               C = c·G + r_c·H
U = A − G                   D = C − A
u = a − 1                   d = c − a
u,d ∈ [0, 2^32 − 1]
U = u·G + r_a·H             D = d·G + (r_c − r_a)·H
```

L'argument agrégé `RangeProof` porte sur les deux engagements **recalculés**
`[A − G, C − A]`, dans cet ordre, avec 32 bits par valeur. Il en résulte :

```text
1 ≤ a ≤ 2^32
a ≤ c ≤ a + 2^32 − 1 ≤ 2^33 − 1
```

Ce n'est pas la relation `a,c < 2^32`. En particulier `a = 2^32` est permis.
L'API emploie des `u64` et des soustractions vérifiées avant conversion. Les
bornes d'émission doivent coïncider exactement avec cette interprétation.

L'[ordre du groupe Ristretto](https://doc.dalek.rs/curve25519_dalek/scalar/index.html)
est `q = 2^252 + 27742317777372353535851937790883648493`. Notre borne
`2^33 − 1 < q` exclut un retour modulo `q` dans la somme entière `a+d`, sous la
liaison des engagements et les bornes ci-dessus. Les ouvertures externes sont
des scalaires canoniques ; réduire silencieusement un encodage arbitraire
modulo `q` à la réception créerait des encodages multiples à proscrire.

Le vérifieur construit les engagements dérivés depuis les points signés. Il
refuse toute substitution d'engagements, inversion des rôles ou changement de
générateurs. La signature porte sur l'engagement original et ses métadonnées.
Cette composition utilise une preuve existante et l'homomorphisme standard des
engagements ; elle ne crée pas une primitive cryptographique maison.

## 3. Attestations, challenge et sérialisation

Le schéma typé porte, pour chaque attestation : domaine/version de profil,
rôle, identifiant d'émetteur, tenant, sujet de dossier, `currency = EUR`,
`exponent = 2`, version métier, clé publique du détenteur, début/fin de validité
et engagement Ristretto. Une signature Ed25519 vérifiée strictement protège
l'encodage canonique complet. Les clés sont choisies dans le registre local ;
une clé présente dans l'attestation n'élève pas les droits de l'émetteur.

Le challenge contient au minimum tenant, client, audience, action exacte,
opération, objet, sujet, identifiant/version de politique, époque de confiance,
nonce imprévisible et échéances. Le mode de présentation est également lié.
L'application compare l'ensemble au challenge qu'elle a émis. Les octets
domainés et non ambigus sont communs au prover et au vérifieur ; l'entrée est
bornée à 64 KiB, les champs inconnus rejetés, les tailles cryptographiques
exactes et les entiers interprétés sans flottants.

Les [transcripts Merlin](https://merlin.cool/use/passing.html) permettent de lier
le domaine applicatif et les messages publics au protocole. Employer des labels
distincts pour la relation statique, la relation de session et la signature du
détenteur. Ne jamais réutiliser l'aléa de preuve comme nonce ou comme clé.

## 4. Trois chemins comparables

| Mode | Relation privée | Autorisation fraîche | Réutilisation |
|---|---|---|---|
| A — `challenge_bound` | RangeProof avec attestations et challenge complet dans le transcript | Signature du détenteur sur la présentation et le challenge | Nouvelle preuve à chaque challenge |
| B — `reusable` | Même RangeProof, transcript lié aux attestations immuables et au profil | Signature du détenteur liant hash complet de preuve/attestations et challenge complet | Preuve statique réutilisable ; autorisation jamais réutilisable |
| Public — `disclosure` | Ouvertures `(a,r_a,c,r_c)` divulguées ; engagements et mêmes bornes vérifiés directement | Même contrôle de possession de clé et de contexte | Autorisé seulement si la politique accepte la divulgation |

Le mode B démontre une maîtrise fraîche de la **clé du détenteur**, pas une
connaissance fraîche des valeurs secrètes à chaque présentation. La preuve
statique a déjà établi la connaissance d'ouvertures satisfaisantes lors de sa
création. Cette distinction est assumée et testable.

Le sélecteur C n'est pas une quatrième primitive : c'est une politique locale
qui autorise ou interdit ces chemins. Si la confidentialité est requise, le
mode public est refusé. Si la réutilisation est interdite, B est refusé. Une
indisponibilité du moteur de preuve ne doit jamais entraîner automatiquement
une divulgation ou une simulation.

La signature fraîche couvre le hash de l'ensemble immuable, le mode, la preuve
ou les ouvertures selon le mode, ainsi que tout le challenge. Elle est exclue
de son propre hash pour éviter une définition circulaire. La signature des deux
autorités est toujours vérifiée sur les octets exacts utilisés.

## 5. Cache vérifié et état mutable

Le premier passage vérifie complètement signature, relation et contexte. Un
cache éventuel peut mémoriser seulement le succès de **la relation immuable**,
sous une clé couvrant les octets complets de preuve/attestations, profil,
paramètres, version de vérifieur, politique et registre de confiance. Une clé
de cache est calculée localement ; la déclaration `verified=true` du client
n'est jamais une entrée de confiance.

À chaque présentation, vérifier de nouveau signature fraîche du détenteur,
challenge attendu, politique, époque de confiance, révocations disponibles et
validité temporelle. Les échéances sont recontrôlées après toute attente avant
le dispatch, ainsi que la borne de début `not_before_ms` : un recul de l'horloge
sous la validité des faits doit bloquer. Le résultat vérifié porte le maximum
des dates de début et le minimum des dates de fin du challenge et des sources.
Un cache ne rend pas actuels des faits anciens. Le coût complet
initial, le taux de hit, les invalidations et la consommation mémoire doivent
être comptés ; un hit ne doit pas être présenté comme une nouvelle vérification
cryptographique complète.

Le vérifieur opérationnel conserve durablement nonces et opérations réservées,
avec consommation atomique et réconciliation des erreurs ambiguës. Ces
propriétés relèvent du stockage et de la cible, pas de Bulletproofs. Le plafond
est **par opération** ; il ne signifie ni budget restant ni absence de
double paiement. Un plafond consommable nécessiterait un registre autoritatif
et une mise à jour atomique supplémentaire.

## 6. Confidentialité et hypothèses

Les valeurs et ouvertures restent privées dans A/B, vis-à-vis du vérifieur
cryptographique. Le prover et les émetteurs qui traitent ces valeurs les
connaissent. Les engagements originaux, signatures, sujet, émetteurs, périodes,
clé du détenteur, politique et contexte publics sont visibles. Réutiliser les
mêmes attestations permet de corréler les présentations, même avec une preuve
fraîche : **aucune unlinkability n'est promise**.

Modifier les points signés pour les rerandomiser casserait leur authentification
sans argument supplémentaire de liaison. Le laboratoire ne fait pas cette
extension. Des questions de seuil répétées peuvent également révéler de
l'information sur une valeur ; la politique doit limiter ce qu'elle demande.

L'hypothèse de logarithme discret et les propriétés des transcripts/signatures
restent nécessaires. Ni ce profil elliptique ni Ed25519 ne sont
post-quantiques. Le laboratoire n'est pas audité. Il ne prouve pas la sécurité
du terminal du détenteur, la non-révocation mondiale en temps réel, la vérité
des données d'expertise ni la conformité réglementaire automatique.

## 7. Critères d'acceptation de l'expérience

Les tests doivent couvrir zéro, montant égal au plafond, `2^32`, `2^32+1`,
différence `2^32−1`, différence `2^32`, soustraction négative, encodage de
scalaire non canonique, point invalide, preuve tronquée et preuve altérée.
Tester séparément les signatures autorités et détenteur, rôles inversés,
registre inconnu, sujet/devise/période mélangés, audience ou action différente,
nonce remplacé, politique ou époque obsolète, challenge expiré et divulgation
interdite. Toute erreur avant autorisation doit produire zéro effet externe.

Les processus prover et vérifieur peuvent être séparés ; le vérifieur privé
reçoit uniquement objets publics, preuve et configuration. Les sorties de
vérification ne contiennent ni valeurs ni ouvertures. Le mode public est
explicitement identifiable pour éviter de l'inclure dans une mesure de
confidentialité.

Mesurer séparément génération des paramètres, émission, preuve, signature
fraîche, vérification complète, hit de cache, sérialisation et effet simulé.
Conserver échantillons bruts, CPU/threads, version/lockfile, RSS et taille totale
sur le fil. Une preuve de deux plages de 32 bits a une taille algébrique attendue
de 672 octets avec le format de cette bibliothèque ; ce nombre exclut les
engagements, signatures, métadonnées et encodage JSON/hex, à mesurer réellement.

Un circuit Vega/Spartan futur serait pertinent si les émetteurs ne peuvent pas
changer leurs documents, ou si signatures et identités doivent rester privées.
Il faudrait alors contraindre hachage, signatures, parsing, jointures, bornes
et liaison de session, puis comparer l'énoncé complet. Un test RangeProof réussi
ne valide pas ce circuit futur et ne démontre aucun gain général sur Vega.
