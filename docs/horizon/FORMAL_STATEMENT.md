# M3/M4 — Énoncé du laboratoire sélectionné

Décision du comité : GO pour une expérience synthétique de contrôle d'une
autorisation de sinistre déléguée ; NO-GO pour revendiquer un produit validé,
une nouveauté cryptographique ou un record contre Vega. Le vote métier relève
des processus de délégation existants mais aucune demande solvable vérifiée.
Le contradicteur exige une alternative signée et refuse une comparaison à
relations différentes. Le cryptographe valide les bornes ci-dessous et exige
que les autorités calculent les engagements depuis leurs faits.

## Sujet, sources et divulgations

Deux organisations synthétiques : fournisseur assureur/mandataire et client
contrôleur. Deux rôles d'autorité distincts attestent montant admissible et
plafond applicable. Elles signent des engagements, pas un verdict de calcul.
Chaque signature lie version de schéma, rôle, autorité, tenant, dossier,
devise et unité, version de l'objet, clé du détenteur et intervalle de validité.
Le client épingle les clés, rôles, politique et mécanismes autorisés.

Action de démonstration : **enregistrer une autorisation de dossier synthétique**.
Ce n'est ni un paiement, ni un contrôle de provisionnement, ni un débit d'un
budget agrégé. Le plafond est par dossier, pas un solde consommable entre
plusieurs dossiers. Le contrôleur refuse une seconde opération pour la même
identité métier, même avec un nouveau nonce.

Sont publics : engagements, identifiants opaques du dossier et des autorités,
tenant, devise, version, politique, clé du détenteur, dates, action et verdict.
Les présentations sont corrélables. Le profil ne promet pas l'anonymat ni
l'unlinkability de Vega. Les valeurs et leurs ouvertures restent chez le
prover sauf si la politique autorise explicitement la baseline divulguée.

## Relation arithmétique

G et H sont les générateurs fixes `PedersenGens::default()` de Bulletproofs 5,
dans le groupe Ristretto d'ordre premier q. Pas de générateur fourni par le
prover ni de primitive inventée. Les autorités calculent et signent :

```text
A = a G + r_a H     C = c G + r_c H
x = a - 1          d = c - a
X = A - G          D = C - A
```

Witness : `(a, c, r_a, r_c)`. La preuve agrégée `RangeProof` 2 × 32 bits
démontre connaissance d'ouvertures de X et D avec :

```text
0 <= x < 2^32    et    0 <= d < 2^32
```

Donc `1 <= a <= 2^32` et `a <= c <= a + 2^32 - 1 <= 2^33 - 1`.
Le domaine est représenté en `u64`, pas en `u32`. Ces bornes et `2^33 - 1 < q`
excluent une interprétation par wrap modulo q dans cette relation. La liaison
aux valeurs attestées repose sur la binding des engagements et sur le fait
que les autorités attestent des ouvertures du même domaine entier.
Les signatures sont vérifiées **hors circuit**, sur les points exacts ;
ce contrat exige une émission adaptée. Il n'est pas équivalent à une preuve
sur des credentials existants arbitrairement signés comme l'application Vega.

## Trois stratégies et baseline

**A — preuve spécialisée fraîche.** Le transcript Merlin lie les attestations,
la relation et le challenge complet de l'action. Une nouvelle preuve est
produite par opération. Les signatures d'origine restent vérifiées.

**B — réutilisation d'une preuve immuable.** La preuve range lie les attestations
immuables et la relation. Une signature Ed25519 fraîche du détenteur couvre
le digest complet du bundle (preuve incluse), le client, tenant, objet,
opération, politique/époque, registre de confiance/époque, dates et nonce.
Cette composition prouve maîtrise de clé fraîche sur une preuve historique,
pas connaissance fraîche du witness et pas une preuve récursive. Vérifier
la preuve complète reste possible sans cache. Tout cache éventuel ne mémorise
que validité cryptographique immuable et jamais l'autorisation courante.

**C — sélection contrainte.** La politique du vérifieur choisit entre A, B et
divulgation signée. Une exigence de confidentialité interdit la divulgation.
Une interdiction de réutilisation impose A. Un backend absent ou une politique
inconnue fait échouer ; aucune baisse de garantie pour gagner du temps.

**Baseline non-ZK.** Même couple d'attestations et même action ; le prover
révèle les valeurs et ouvertures. Le client vérifie signatures, engagements,
bornes et comparaison. Cette baseline est pertinente si ces valeurs peuvent
être divulguées, ou si un tiers accepté peut signer directement le verdict.

## Fraîcheur et effets

La preuve ne donne pas l'heure présente ni l'état des révocations. Le contrôleur
charge ses propres attentes, vérifie la cryptographie, puis relit temps,
politique, clés, révocations et challenge dans sa frontière transactionnelle
avant consommation du nonce et réservation de l'opération. L'état `UNKNOWN`
reste consommé. Le sandbox peut réaliser cible et audit dans une même base ;
cette propriété ne s'étend pas automatiquement à une API financière distante.

Les détails wire sont fixés par les types sérialisés du prototype et sont
expérimentaux (`horizon/1`). Aucun changement du wire MCP historique n'est requis.
