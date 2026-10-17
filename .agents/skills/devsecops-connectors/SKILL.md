---
name: devsecops-connectors
description: Construire les collecteurs Jira, SonarQube, GitLab et contrôles de plateforme critique de ZK-agentiK avec normalisation, provenance et préconditions de mutation.
---

# Collecteurs DevSecOps

Lire `docs/03-ARCHITECTURE.md` et `docs/05-CRITICAL-PLATFORM-POLICY.md`.
Les connecteurs livrés sont des fixtures. Leur HMAC est celui du collecteur
local ; il ne faut pas le présenter comme une signature fournie par les éditeurs.

## Acquisition et identité

Résoudre côté serveur la correspondance tenant → instance → projet → MR → ticket
→ analyse Sonar. Ne pas suivre une URL apportée par un commentaire de ticket.
Utiliser origines allowlistées, credentials par service à privilège minimal,
TLS, timeouts, bornes, pagination, contrôle des redirections et backoff borné
pour les lectures. Une erreur réseau, un champ absent ou une réponse inconnue
produisent un refus, jamais un état conforme par défaut.

- Jira : mapping de statuts/IDs versionné, ticket lié au changement exact.
- Sonar : statut du quality gate d'une analyse terminée, révision et scanner
  identifiés ; distinguer vulnérabilités et métriques d'autres catégories.
- GitLab : HEAD, règles d'approbation, identités dédupliquées, rôles et éligibilité ;
  `approvals_before_merge` ne remplace pas l'API d'approbations.
- Critique : annuaire/MFA autoritatif, preuves de signature/SBOM/provenance,
  résultats de restauration, rollback et canary rattachés à l'artefact.

## Attestation et effet

Lier au payload normalisé : identité/version du collecteur, origine, ressource,
révision, horodatage d'observation, période de validité et empreinte du brut
conservé selon la politique de données. Signer avec une clé approuvée, vérifier
avant engagement, prévoir rotation/révocation. Documenter si la signature vient
du fournisseur ou d'un collecteur de confiance. Ne pas inventer un mécanisme
de signature natif quand l'API ne le propose pas.

Après vérification de la preuve, relire les préconditions puis transmettre
le SHA attendu au merge GitLab. Ne pas retenter automatiquement un merge dont
le résultat est inconnu ; conserver réservation et état d'audit, puis réconcilier.
Les systèmes externes n'offrent pas ensemble de transaction atomique.

## Validation

Tests avec serveur HTTP factice : 401/403, timeout, rate limit, pagination,
redirection, analyse en cours, statut inconnu, approbateur dupliqué, changement
de SHA, payload altéré, source ancienne et signature d'une autre clé. Tester que
les arguments LLM ne peuvent ni désactiver un contrôle ni modifier son seuil.
Les tests n'appellent aucun environnement réel avec droit de mutation.
