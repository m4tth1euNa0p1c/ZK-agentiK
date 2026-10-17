# Registre des assertions de publication

État éditorial : 17 octobre 2026. « Démontré » signifie uniquement dans le
périmètre de l'artefact cité. Les résultats historiques ne sont pas une validation
automatique d'un SDK ou d'un déploiement ultérieur. Le journal de release doit
identifier le commit candidat et ses vérifications actuelles.

| ID | Assertion admissible | Statut et preuve | Limite / condition de réfutation |
| --- | --- | --- | --- |
| P01 | Le profil Horizon prouve une relation sur deux montants engagés | Implémentation et [énoncé](../horizon/FORMAL_STATEMENT.md) | Vérité des faits et honnêteté d'émission hors preuve ; H13 |
| P02 | Les montants a et c restent cachés au contrôleur dans la présentation prévue | Modèle et [analyse](../horizon/CRYPTOGRAPHIC_DESIGN.md) | Engagements A et C publics ; prover connaît les deux ouvertures ; métadonnées corrélables ; audit externe H15 absent |
| P03 | B réutilise une preuve immuable et signe un challenge complet frais | [Architecture](../horizon/ARCHITECTURE.md) | Pas une nouvelle preuve de connaissance ; pas de promesse d'absence de corrélation |
| P04 | Les demandes invalides des scénarios testés ne déclenchent pas l'effet local | Tests et [journal](../horizon/EXPERIMENT_LOG.md) | Énumérer les cas et le commit ; aucune universalité sur tous les inputs |
| P05 | Anti-rejeu et réservation de l'opération survivent au redémarrage local testé | [Déploiement local](../horizon/DEPLOYMENT.md), SQLite | Cible locale ; H14 ouvert pour API distante et concurrence distribuée |
| P06 | B vérifie au p95 1,247 ms dans le banc CPU après optimisation | [Rapport gelé](../horizon/BENCHMARK_RESULTS.json) et bruts associés | 500 échantillons/cas, machine et périmètre précis ; pas un SLA |
| P07 | Le chemin durable observé a un p95 de 13,014 ms | Même rapport, campagne Windows IPC et SQLite | Objectif de 10 ms non atteint ; maximum 180,310 ms |
| P08 | Une présentation B préparée peut être moins coûteuse qu'une preuve A fraîche | Mesures des phases séparées | Comparer les fonctions réellement fournies ; pas un record ZKP |
| P09 | Le projet contient des points d'extension pour outils vérifiés | `packages/proofkit-sdk`, contrôles actuels à consigner dans le journal de release | Les adaptateurs restent une frontière de confiance ; aucun générateur universel de circuits sûrs |
| P10 | Les fondations Azure/GCP sont validables localement | [Validation](VALIDATION.md), sources IaC | Aucun déploiement cloud ni test IAM/réseau effectué |
| P11 | Le besoin acheteur justifie la complexité ZK | **Non établi**, H11 | Abandon si verdict signé/divulgation acceptable ou absence de budget et sponsor |
| P12 | Une offre identique est absente du marché | **Non démontré** | [Recherche bornée](../horizon/NOVELTY_AND_PRIOR_ART.md) ; pas d'absence universelle ni de liberté d'exploitation juridique |
| P13 | Le profil est post-quantique | **Faux pour Horizon** | Bulletproofs/Ristretto et Ed25519 ne donnent pas cette garantie |
| P14 | Le système est qualifié DORA, AI Act ou bancaire | **Non établi** | Le code et un journal ne constituent pas une évaluation réglementaire |
| P15 | Le paquet scellé est authentique et ses résultats vrais | **Non établi par une empreinte seule** | Une empreinte lie des octets ; identité du signataire, temps et véracité exigent d'autres preuves |

Toute modification d'une ligne doit indiquer le nouveau support et les limites
retirées ou ajoutées. Une assertion rejetée reste visible pour empêcher sa
réintroduction commerciale accidentelle.
