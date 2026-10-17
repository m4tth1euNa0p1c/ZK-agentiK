# Tickets de décision après l'expérience initiale

## H11 — Validation du besoin, P0, bloquant produit

**Hypothèse** : deux organisations veulent contrôler une même règle sur des
montants qu'elles refusent de partager avec le contrôleur, et acceptent une
émission adaptée. Acheteur potentiel : assureur délégant, contrôle des sinistres.
Collecter avec autorisation des entretiens et mesures de dossiers anonymisés :
volume, temps de contrôle, coût des erreurs, coût d'intégration de deux sources.
**Acceptation** : sponsor identifié, contrainte de non-divulgation documentée,
alternative signée/divulgation sélective évaluée et budget expérimental explicite.
**Abandon** : partage permis, verdict signé accepté ou adaptation impossible.
Pas d'outreach automatique. Livrable : modèle chiffré sourcé, sans données client.

## H12 — Relation Vega identique, P1 recherche

Obtenir ou reconstruire avec spécification autorisée le circuit credential mDL,
signature, parsing et preuve de possession exacts du papier. Aujourd'hui les
benches amont SHA-256 ne suffisent pas. Reproduire mêmes entrées, sécurité, CPU,
prétraitement, mémoire et tailles avant ratio. `node scripts/horizon-vega.mjs`
reproduit uniquement la référence SHA-256 publiée. Aucun record en attendant.

## H13 — Émission et provenance qualifiées, P0 sécurité

Deux autorités calculent l'engagement depuis leur fait validé, signent le schéma
exact et publient révocation/version. Protocole de remise des ouvertures, KMS,
droits d'accès et minimisation. Évaluer MPC si aucun acteur ne peut connaître
les deux witnesses. Tests : source substituée, rôle erroné, dossier différent,
valeur hors domaine, révocation pendant dispatch. Toutes mutations refusées.

## H14 — Reprise sur cible distante, P0 intégration

Adaptateur sandbox distant avec idempotency key, ETag/version, endpoint de statut,
perte de réponse et crash à chaque transition. Base durable du contrôleur séparée
de la cible. Accepter au plus un effet malgré deux processus et reprise. Sans
contrat cible adéquat : conserver UNKNOWN et interdire le retry automatique.
Tests initiaux : `npm run test:horizon`, extension obligatoire avant production.

## H15 — Qualification cryptographique et confidentialité, P0 sécurité

Audit externe des domaines, génération d'engagements, relation, parsing, sources
de hasard et canaux auxiliaires. Valider fuite de métadonnées/corrélation avec
les intéressés. Prouver les limites d'Ed25519/Ristretto face au quantique sans
étiquette post-quantique. No-Go si besoin d'anonymat incompatible avec ce profil.
Tests : `cargo test --locked --manifest-path labs/horizon/Cargo.toml`.

## H16 — Coût complet et charge, P1 performance

Répéter campagnes indépendantes sur machines isolées, température/énergie,
RSS par processus, échecs et débit à concurrence variable. Mesurer froid/chaud,
réseau, stockage et source réelle. Évaluer pré-génération de paramètres publics
sans cache d'autorisation et mesurer avant/après avec mêmes relations. Aucun
gain annoncé avant validation. `npm run horizon:benchmark` produit les bruts.

## H17 — Exploitation et conformité, P0 avant production

IAM/mTLS et rôles opérateur séparés, KMS, journal ancré externe, sauvegarde/restauration,
monitoring, limites multi-tenant, rétention et revue DORA/RGPD applicables.
Docker Compose est une démonstration locale ; il ne satisfait pas ces critères.
Critère : dossier d'exploitation et revues indépendantes, aucune approbation
implicite sur la base de la seule preuve ZK.
