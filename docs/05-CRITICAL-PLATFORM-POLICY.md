# Scénario sensible : autorisation de changement d'une plateforme critique

Scénario retenu : une modification de production transitant par une merge request
GitLab. Il prolonge la demande DevSecOps du POC. L'action exécutée reste un
**merge simulé** ; aucun déploiement de production ni API réelle n'est appelé.

```bash
npm ci
npm run demo:critical
```

La démo passe par un vrai client et serveur MCP, le worker Rust, le vérifieur et
le connecteur simulé. Elle autorise le dossier complet puis essaie 23 modifications
adverses isolées. Le compteur de merges ne doit pas augmenter pour ces 23 cas.
`npm test` ajoute les cas d'arrêt d'urgence pendant la preuve, de suppression
du profil critique et d'expiration pendant le traitement.

## Politique métier

Le cœur exécutable est `crates/policy-engine-core/src/critical.rs`. Les fixtures
et valeurs d'exemple sont dans `packages/enterprise-gateway/src/critical.ts`.
Tous les contrôles sont **conjonctifs** : aucun score moyen ne compense un échec.
Une demande de contournement bloque ; il n'y a pas de procédure break-glass
automatique dans ce POC.

| Contrôle | Condition autorisante du scénario |
|---|---|
| Politique de base | Sonar `OK`, Jira `APPROVED`, aucune vulnérabilité critique, >= 3 approbations |
| Séparation des rôles | Demandeur, sécurité, opérations et responsable de service : quatre identités non nulles distinctes |
| Authentification | Vérification MFA des approbateurs attestée par le collecteur |
| Portée des approbations | `approved_revision` = SHA-256 des octets ASCII du `head_sha` public exact |
| Durée | Approbations non expirées, fenêtre de changement ouverte, observations de moins de 60 s |
| Artefact | Signature, SBOM et provenance marquées vérifiées |
| Sécurité | Scan terminé, zéro vulnérabilité élevée, zéro secret détecté |
| Retour arrière | Restauration de sauvegarde et rollback testés |
| Canary | >= 10 min, trafic > 0 et <= 5 %, erreurs <= 500 ppm (0,05 %), latence p99 > 0 et <= 250 ms |
| État opérationnel | Aucun incident de sévérité 1, dépendances saines, arrêt d'urgence désactivé |
| Intégrité de l'exécution | Même snapshot avant/après preuve, nonce à usage unique, expirations encore valides juste avant l'effet |

Ces seuils sont des **valeurs de test**, à remplacer par des règles approuvées
pour une plateforme réelle. Le moteur impose aussi des bornes de configuration
prudentes pour empêcher une politique manifestement relâchée : âge <= 300 s,
canary >= 10 min et <= 24 h, trafic <= 10 %, erreurs <= 1 000 ppm, latence <= 1 s.
Une politique hors de ces bornes renvoie un refus, elle n'est pas corrigée en silence.

## Preuve, temps et refus

Le profil ajoute deux objets optionnels au wire draft : `policy.critical` public
et `facts.critical` privé. Ils MUST être présents ensemble. Un seuil
`min_reviewers < 3` est interdit lorsque le profil critique est actif. Leur
contenu complet est engagé par les mêmes hashes que le profil de base.

L'évaluation temporelle Rust utilise `public_inputs.issued_at_ms` ; elle n'accède
jamais à une horloge. La gateway relit ensuite les faits, vérifie leur égalité
et recontrôle les échéances à l'heure courante. Cette seconde vérification
empêche une approbation valide à l'émission mais expirée avant mutation.

En cas de violation critique, le bit `32` de `violations_mask` est positionné et
`critical_violations` contient les bits cumulés ci-dessous ; il est absent en
cas d'autorisation. Une absence de faits critiques avec politique critique
renvoie `INVALID_POLICY`, jamais un retour au profil simple.

| Bit | Motif |
|---|---|
| 1 | Arrêt d'urgence |
| 2 | Politique invalide ou faits manquants |
| 4 | Séparation des rôles / MFA |
| 8 | Approbations expirées |
| 16 | Fenêtre fermée |
| 32 | Observations anciennes ou futures |
| 64 | Révision différente |
| 128 | Artefact, SBOM ou provenance non vérifiés |
| 256 | Scan incomplet, vulnérabilité élevée ou secret |
| 512 | Restauration / rollback non testés |
| 1024 | Canary insuffisant ou dégradé |
| 2048 | Incident majeur |
| 4096 | Contournement demandé |
| 8192 | Dépendances dégradées |

## Ce qui reste à établir pour un environnement réel

Un booléen `artifact_signature_verified` ne vérifie pas lui-même une signature.
Les fixtures représentent des résultats de collecteurs futurs : Sigstore ou PKI,
scanner, IAM/MFA, observabilité, tests de restauration. Il faudra attester
l'identité, le périmètre, la révision, l'âge et la version de chacun de ces résultats.
Les identités et rôles doivent provenir d'un annuaire autoritatif et d'approbations
effectives sur le même changement ; un compte numérique distinct ne prouve pas
à lui seul une personne indépendante.

Le simulateur n'est ni une preuve ZK ni un produit prêt pour une plateforme
critique. Les tickets 01, 02, 07, 08 et 09 couvrent les primitives manquantes.
Le contrôle apporte des conditions nécessaires pour ce scénario ; il ne démontre
pas la sûreté complète d'un système, ni l'absence de faille, ni une certification.
