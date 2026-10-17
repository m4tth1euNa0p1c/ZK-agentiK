# Contradiction de la recommandation cloud et publication

17 octobre 2026. **Autorevue de l'auteur du dossier**, et non avis indépendant.
Les validations syntaxiques sont rapportées dans [VALIDATION.md](VALIDATION.md).
Le parent orchestrateur peut faire relire ce diff séparément ; ce document ne
prétend pas qu'une telle revue a déjà eu lieu.

| Objection | Réponse fondée sur le dossier | Condition qui changerait la décision |
| --- | --- | --- |
| Un réseau fermé sans service ne prouve rien sur le produit | Exact. Le livrable est une fondation syntaxiquement validée, sans revendication d'isolation observée | Déploiement autorisé puis tests de refus ingress/egress, permissions héritées et accès plateforme |
| La recommandation pourrait favoriser GCP sur un algorithme seulement logiciel | Aucune sélection fournisseur n'est faite. Le support Ed25519 logiciel ne satisfait pas une exigence HSM | Exigences acheteur explicites puis essai de signature/version/révocation avec niveau de protection adéquat |
| Une base HA ne résout pas la mutation distante | Exact. Le module ne crée aucune base et H14 reste ouvert | Deux contrôleurs et cible séparée ; crash/ACK perdu/reprise ; compteur d'effets et contrat cible vérifiés |
| Le réseau privé ne protège pas les données contre l'opérateur du prover | Exact. Horizon suppose un prover qui connaît les deux ouvertures | Si ce tiers est interdit, adopter et évaluer une autre architecture, éventuellement MPC/TEE, ou abandonner ce cas |
| Le coût cloud pourrait dépasser la valeur d'un verdict signé | Coût et bénéfice acheteur restent inconnus ; aucune économie annoncée | H11 avec contrainte réelle et budget ; H16 avec même charge et disponibilité pour les deux solutions |
| L'archive immuable peut pérenniser une fuite ou un fait faux | Exact. Aucun verrou n'est activé et la minimisation précède l'archivage | Politique de données réelle, tests d'export/restauration et validation de la durée par les responsables compétents |
| Les skills peuvent donner une illusion d'assurance | Leurs validateurs contrôlent une structure, pas la sûreté de leurs décisions | Évaluations adverses de workflows et relecture humaine ; H15 reste externe |
| Le manifeste d'empreintes pourrait être présenté comme un audit | Le registre P15 l'interdit : intégrité des octets, authenticité et vérité sont distinctes | Signatures et provenance attribuables plus revue des résultats, chacune avec son périmètre |
| Les notices ne couvrent pas tous les binaires | L'inventaire est explicitement partiel | SBOM et notices de la distribution exacte avant redistribution de bundles/images |

Décision : **GO pour un candidat documentaire et des fondations de laboratoire**,
pas de choix cloud irréversible. **NO-GO pour une qualification de plateforme
critique, une annonce de conformité ou une disponibilité générale de production**
sur la seule base de ce dossier. Cette décision ne présume pas le sens que
l'utilisateur donne au sigle « GA ».

Les prochains investissements doivent réduire H11/H13/H14/H15/H17, plutôt que
multiplier les services cloud. Un besoin acheteur réfuté ou une divulgation
acceptable peut rendre la solution signée plus pertinente que ZK.
