# Candidat public — 17 octobre 2026

Cette livraison prépare un **dépôt de recherche et un SDK expérimental**. Elle
ne qualifie pas une plateforme bancaire ni un produit en disponibilité générale.
Les résultats historiques restent consultables ; chaque nouvelle expérience
indique son propre périmètre et ses limites.

## Lire et reproduire

| Objectif | Artefacts |
| --- | --- |
| Comprendre le problème client et décider s'il faut ZK | [Protocole H11](../horizon/REVIEW_PROTOCOL.md), [business case](../horizon/BUSINESS_CASE.md) |
| Comprendre la relation prouvée et les hypothèses | [White paper PDF](../whitepaper/whitepaper.pdf), [LaTeX](../whitepaper/whitepaper.tex), [bibliographie](../whitepaper/references.bib) |
| Exécuter les vérifications arithmétiques | [MATLAB/Octave](../../math/README.md), exécution observée sous Octave |
| Créer un outil HTTP/MCP à contrôle indépendant | [SDK](../../packages/proofkit-sdk/README.md), [adaptateur compilé](../../packages/horizon-demo/src/tool.ts) |
| Exécuter un profil ou vérifier les artefacts | [CLI Proofkit](../../tools/proofkit/README.md), [catalogue](../../evidence/catalog.json) |
| Automatiser preuves et sandbox | [GitHub Actions réutilisable](GITHUB_ACTIONS.md) |
| Évaluer Azure/GCP et personnaliser les fondations | [Comparaison](CLOUD_COMPARISON.md), [validation locale](VALIDATION.md) |
| Examiner l'expérience CUDA | [Rapport GPU](../experiments/gpu/README.md), résultats négatifs conservés |
| Contrôler les affirmations publiques | [Registre éditorial](CLAIMS.md), [checklist](RELEASE_CHECKLIST.md) |
| Lire les corrections et limites de sécurité | [Contre-revue d'agents](INDEPENDENT_AGENT_REVIEW.md), [dépendances](DEPENDENCY_REVIEW.md), [validation locale](LOCAL_VALIDATION_2026-10-17.json) |
| Poursuivre le travail | [Prompt exact](NEXT_PROMPT.md), [issues H11–H17](../../issues/horizon/NEXT_EXPERIMENTS.md) |

Les [skills](../../.agents/skills/) et [contrats d'agents](../../.agents/roles/)
permettent d'assigner rédaction, contradiction, frontières cloud et revue de
publication. Une revue d'agent ne remplace pas un auditeur externe.

## Décision métier et sécurité

Le cas exploré est une **autorisation confidentielle de sinistre délégué**.
Le circuit actuel établit une relation bornée sur deux engagements attestés ; il
ne calcule pas franchise, agrégat de sinistres, provisionnement, fraude ou budget
restant. L'action est l'enregistrement d'une autorisation synthétique locale.

Le besoin commercial reste conditionnel : il faut deux sources autoritatives,
une raison documentée de cacher les valeurs au contrôleur, un détenteur autorisé
à connaître leurs ouvertures et une alternative signée insuffisante. Aucun
entretien, acheteur, budget ou gain économique absent des sources n'est ajouté.

Les fronts encore ouverts sont H11 (qualification client), H13 (émission réelle),
H14 (contrôleur et cible distants), H15 (audit externe), H16 (coût complet) et
H17 (exploitation). Azure/GCP fournissent ici des fondations réseau/identité,
sans runtime bancaire prêt à déployer. Aucun service cloud n'a été déployé.

## Lecture correcte des preuves

- Les calculs Octave sont des tests exacts d'entiers et d'un modèle fini ; MATLAB
  n'a pas été exécuté. La démonstration écrite est conditionnelle aux primitives.
- Les preuves Bulletproofs et receipts RISC Zero sont réels dans leurs profils.
  Le simulateur MCP DevSecOps historique reste explicitement une simulation.
- Les résultats Vega SHA-256 sont des références reproduites sur une autre
  relation ; aucun dépassement équivalent ni record global n'est établi.
- La pile Horizon utilise des groupes elliptiques et Ed25519. Elle n'est pas
  post-quantique. FIPS 204/205 ne suffisent pas à rendre son circuit PQ.
- Les empreintes du registre lient des octets sélectionnés. Dates et commits
  déclarés dans un manifeste ne sont pas authentifiés par ces empreintes.
- Les benchmarks CPU historiques ne mesurent pas automatiquement les nouveaux
  transports ; une tentative CUDA bloquée ne devient pas une mesure GPU.

La publication du code, celle d'un package npm, un déploiement et une qualification
de production sont des décisions distinctes. Les packages restent privés pour
npm. Consulter le journal de validation du candidat pour les checks exécutés,
la révision Git et l'état effectif de GitHub.
