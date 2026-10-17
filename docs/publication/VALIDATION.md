# Journal des validations de ce dossier

Date : 17 octobre 2026. Plateforme : Windows x64, PowerShell. Périmètre : les
trois nouveaux skills et les fondations d'infrastructure ; ce journal ne remplace
ni les tests applicatifs du candidat ni une vérification cloud.

## Contrôles effectivement exécutés

| Contrôle | Résultat | Portée |
| --- | --- | --- |
| `quick_validate.py .agents/skills/scientific-whitepaper` | PASS | Frontmatter et contraintes du validateur skill-creator |
| `quick_validate.py .agents/skills/evidence-publication` | PASS | Même validateur |
| `quick_validate.py .agents/skills/cloud-proof-infrastructure` | PASS | Même validateur |
| `bicep build infra/azure/main.bicep --outfile <temp>/azure-template.json` | PASS | Compilation locale, types embarqués |
| `bicep lint infra/azure/main.bicep` | PASS | Aucun diagnostic émis |
| `terraform -chdir=infra/gcp fmt -check` | PASS | Format des sources |
| `terraform -chdir=infra/gcp validate -no-color` | PASS | Schéma local avec provider installé |
| `terraform -chdir=infra/gcp providers lock -platform=linux_amd64 -platform=windows_amd64` | PASS | Checksums fournisseur consignés dans le lockfile |
| Résolution des liens Markdown locaux du dossier et des documents racine ajoutés | PASS | Existence des cibles, pas validité de leur contenu |
| YAML `agents/openai.yaml` des trois skills | PASS | Champs, description de 25–64 caractères et référence au skill |
| `CITATION.cff` avec le schéma officiel CFF 1.2.0 | PASS | Validation `jsonschema`, schéma du tag `1.2.0` de citation-file-format |

L'initialisation Terraform a utilisé `init -backend=false -input=false`, sans
credentials cloud. Elle a téléchargé le provider public et créé le lockfile.
Les validations suivantes peuvent réutiliser ce provider hors ligne. Aucun
`plan`, `apply`, déploiement Azure, activation d'API ou création de ressource
n'a été effectué.

## Versions et acquisition

- Bicep **0.48.1**, binaire Windows x64 de la
  [release officielle](https://github.com/Azure/bicep/releases/tag/v0.48.1).
  SHA-256 vérifié contre le digest de l'asset GitHub :
  `398af294cf16ac4becdbd008a77d148d0e8e91492309a6b60ec911b7e1cab082`.
- Terraform **1.16.6**, archive Windows amd64 depuis les
  [releases HashiCorp](https://releases.hashicorp.com/terraform/1.16.6/).
  SHA-256 vérifié contre le fichier `SHA256SUMS` du même serveur. La signature
  détachée de ce fichier n'a pas été vérifiée indépendamment : cette acquisition
  dépend donc du canal HTTPS et ne constitue pas une vérification de provenance
  indépendante du serveur de téléchargement.
- Provider `hashicorp/google` **8.7.0**, signature HashiCorp reconnue par Terraform,
  verrouillé dans `infra/gcp/.terraform.lock.hcl` pour Linux et Windows amd64.

Les outils ont été placés dans un répertoire temporaire ; ils ne sont pas inclus
dans la distribution du dépôt. Les compilations n'exigent aucun abonnement ou
projet cloud.

## Limites restantes

La validation ne teste pas API disponibles, droits hérités, frontières réseau,
quotas, facturation, disponibilité régionale, secrets, HSM, restauration,
multi-instance, ni effets distants. Les fondations ne déploient aucun runtime.
La validité des skills ne mesure pas leur efficacité sur tous les agents ; les
rôles sont des contrats Markdown chargés explicitement, pas des configurations
universellement autodécouvertes.

## Complément GitHub Actions

Le 17 octobre 2026, le quatrième skill ajouté pour cette livraison,
`proof-workflow-automation`, a passé `quick_validate` et le contrôle des
métadonnées `agents/openai.yaml` (description 25–64 caractères et référence au
skill dans le prompt). L'agent auteur a exécuté ces contrôles. Le routage dans
`AGENTS.md` pointe vers ce skill. Sa validation de structure ne démontre pas
l'efficacité de ses instructions sur tous les clients.
