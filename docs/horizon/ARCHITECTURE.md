# Architecture du laboratoire Horizon

```mermaid
flowchart TD
  I[Deux autorités synthétiques : montant et plafond] -->|engagements signés| P[Fournisseur : witness et clé du détenteur]
  I -->|clés publiques et attestations épinglées| V[Client : configuration locale]
  V --> C[Challenge exact et méthode imposée]
  C --> P
  P --> R[Worker Rust : A nouvelle range proof ou B preuve préparée et signature fraîche]
  R -->|présentation publique| W[Worker Rust indépendant : toutes signatures et preuve complète]
  W --> F[Contrôleur SQLite : fraîcheur, révocation, politique, nonce et opération]
  F --> T[Action synthétique : enregistrer une autorisation]
  F --> A[Audit chaîné et réconciliation]
```

## Implémentation

`labs/horizon/proof` est une bibliothèque Rust et deux binaires indépendants du
workspace historique. `horizon-proof-worker` reçoit une requête JSON par ligne ;
`horizon-benchmark` mesure les fonctions internes. Les primitives sont fournies
par Bulletproofs 5 et Dalek, versions figées. La logique de preuve n'est pas
réimplémentée en TypeScript. Le moteur Rust historique `no_std` et le lab RISC
Zero restent intacts et répondent à une autre relation.

`packages/horizon-demo` contient une API HTTP typée stricte et une interface
statique. Le fournisseur possède uniquement sa configuration privée et son
worker. Le client possède uniquement sa configuration publique, un autre worker
et sa base. La sélection C est imposée par la politique locale ; A, B et la
baseline non-ZK restent identifiables. Aucune stratégie ne prétend être nouvelle.

Le SDK MCP historique n'est pas modifié : ce produit expérimental sépare encore
API de démonstration et chemin MCP de production. Ajouter un wrapper MCP ne
résoudrait pas l'émission réelle, les règles contractuelles ou l'authentification.

## État durable et effets

La première transaction consomme le nonce et réserve l'opération, puis commit.
La seconde revérifie les bornes temporelles et l'état courant, écrit l'action
simulée et son audit. L'identité métier dépend de tenant, audience, action et
dossier ; un changement de nonce ou politique ne recrée pas une action.

```text
absent -> RESERVED -> COMPLETED
                  -> REJECTED
                  -> UNKNOWN -> réconciliation -> COMPLETED ou UNKNOWN
```

Un arrêt après réservation ne relâche jamais l'opération. La réconciliation
lit la cible locale, sans redispatch. Le test d'ambiguïté force `UNKNOWN` après
un effet connu de la cible synthétique. Aucune inférence vers une API bancaire
distante : il faudrait idempotency key, précondition exacte et API de statut
auprès de cette cible, avec protocole de reprise accepté par son opérateur.

Les événements sont chaînés par SHA-256. Cela détecte une altération lorsqu'une
tête antérieure fiable est disponible ; un administrateur peut réécrire toute
la chaîne. Aucun ancrage externe/WORM ni coffre-fort réglementaire n'est livré.

## Limites de confiance et migration

Une instance configure un tenant et un dossier. Les tests refusent une autre
configuration sur la même base. Ils ne qualifient pas une isolation SaaS à grande
échelle. Une migration de politique/registre doit être opérée côté client et
fournisseur ; le prototype révoque/augmente les époques pour démontrer le refus,
sans réémission automatique susceptible de réautoriser une opération consommée.

Le profil, domaines de signature, types stricts et dépendances figées identifient
la version. Une future suite cryptographique doit avoir un nouvel identifiant,
de nouvelles racines approuvées et des tests de refus croisé ; aucun fallback
automatique vers la divulgation ou vers le simulateur.
