# Campagne corrélée sur GitHub Actions

Le [workflow](../../../.github/workflows/circuit-validation.yml) exécute une
campagne synthétique bornée : génération des vecteurs, prover Rust réel,
vérifieur dans un processus distinct, oracle Octave, corrélation et rapport.
Un second job optionnel exécute **MATLAB réel** sur les mêmes vecteurs et compare
ses résultats aux sorties Rust et Octave. Ce document décrit le câblage ; un
fichier YAML valide ne prouve pas que ces jobs ont déjà réussi sur GitHub.

## Déclenchement et budget

| Déclencheur | Nombre demandé | MATLAB |
| --- | --- | --- |
| PR touchant circuit, workspace Horizon ou workflow | 128 | Activé ; contrôle public obligatoire |
| Push sur `main` avec les mêmes chemins | 128 | Désactivé |
| `workflow_dispatch` | Choix fermé : 128, 1024 ou 4096 | Booléen explicite, défaut `false` |
| `workflow_call` | Chaîne validée contre ces trois valeurs, défaut `128` | Booléen explicite, défaut `false` |

Les événements PR/push directs n'ont pas d'inputs : le nombre retombe sur `128`.
MATLAB est activé pour ces PR, conformément à la demande d'expérience réelle
avant fusion ; il reste désactivé sur push. Un appel réutilisable fournit
`cases` (défaut `128`) et conserve son booléen MATLAB explicite, même si son
caller a été déclenché par une PR. Le nombre demandé est un budget de génération,
pas une promesse sur le nombre de sous-tests ou de preuves acceptées : les
compteurs du résultat donnent les valeurs réellement observées. Les cas
supplémentaires adverses et refusés doivent rester distingués des succès.

Le job Rust/Octave est borné à **45 minutes**, celui de MATLAB à **30 minutes**.
Ces limites incluent téléchargement et compilation. Elles ne sont ni une
mesure cryptographique ni un SLA. Deux demandes identiques de même ref partagent
un groupe de concurrence ; un job déjà lancé n'est pas annulé automatiquement.
Le planificateur GitHub peut remplacer un ancien job encore en attente :
consulter son état, sans supposer que toutes les demandes ont été exécutées.

Après présence du workflow sur la branche par défaut, un mainteneur peut lancer :

```sh
gh workflow run circuit-validation.yml --ref <revision-revue> -f cases=1024 -F include_matlab=true
```

Exemple d'appel réutilisable dans le même dépôt ou un fork contenant ses sources :

```yaml
jobs:
  circuit:
    uses: ./.github/workflows/circuit-validation.yml
    with:
      cases: '128'
      include_matlab: true
```

Pour un appel distant, épingler le workflow par commit et vérifier le dépôt
réellement checkout dans le contexte du caller. Cette intégration ne prend pas
une commande, une image, une clé de preuve ou un programme MATLAB arbitraire
en entrée. Elle ne fusionne pas de branche et ne déploie aucun service cloud.

## Contrat des processus et des fichiers

Commande fixe du premier job :

```sh
node --test tests/circuit/*.test.mjs
node scripts/circuit-campaign.mjs --cases 128 --output .tools/circuit-ci --build
```

L'orchestrateur crée un répertoire de sortie neuf. Sa partie `public/` contient
les seules familles exportables :

| Fichier | Rôle |
| --- | --- |
| `vectors.json` | Vecteurs synthétiques communs aux implémentations |
| `prover-results.json`, `verifier-results.json` | Résultats des deux processus Rust |
| `octave.json` | Verdicts de l'oracle Octave |
| `octave-selftests.json` | Résultats des tests d'encodage, frontières et grille réduite |
| `correlation.json` | Comparaison et compteurs de la campagne |
| `verification-requests.ndjson.gz` | Requêtes publiques du vérifieur, compressées |
| `report.html`, `figures/*.png`, `figures/*.svg` | Rapport et visuels générés |
| `figures/plot-metadata.json` | Version et paramètres publics du moteur de tracé |
| `manifest.json` | Provenance et empreintes produites par l'orchestrateur |

La sélection CI ajoute `CI_STATUS.json` et `SHA256SUMS`, sans exporter l'arbre
`.tools/` entier. Les fichiers sélectionnés sont réguliers, sans symlink ou
hardlink ; plafonds d'export : 64 fichiers sources, 64 Mio par fichier et
256 Mio au total. Les noms des figures sont restreints. Ces bornes protègent
l'export ; elles ne constituent pas une sandbox contre du code de dépôt hostile.

Les vecteurs peuvent divulguer leurs **montants synthétiques** pour permettre
la comparaison numérique. Ils ne sont pas des données d'assurance réelles.
Les facteurs d'aveuglement, clés privées et ouvertures de commitments ne sont
pas exportés. La publication de ce jeu synthétique n'est pas un test d'absence
de fuite sur un jeu privé de production.

Le job MATLAB télécharge le bundle de ce même run et vérifie ses SHA-256 avant
d'utiliser les données. Il appelle exclusivement :

```matlab
addpath('math/circuit');
r = run_oracle(); % grille réduite, encodages invalides et frontières
% Le workflow écrit le résultat public dans matlab-selftests.json.
circuit_oracle('.tools/circuit-matlab/input/vectors.json', ...
               'public-matlab-artifacts/matlab.json');
```

Puis il corrèle cette nouvelle sortie, sans régénérer les vecteurs ni relancer
un prover qui pourrait produire un autre échantillon :

```sh
node scripts/circuit-correlate.mjs .tools/circuit-matlab/input --matlab public-matlab-artifacts/matlab.json --output public-matlab-artifacts/correlation-matlab.json
```

`matlab.json` doit identifier son runtime effectif. L'appel fixe demande
**R2026b** ; MathWorks installe la mise à jour disponible de cette release.
L'update précise n'est donc pas figée par cette seule chaîne. Consigner la
version réellement exécutée dans les résultats, sans remplacer MATLAB par
Octave si son installation échoue.

## Licence MATLAB et versions des actions

Les actions officielles prennent en charge la licence automatique des projets
publics. Les projets privés et certains produits de transformation, notamment
Coder/Compiler, nécessitent un autre mécanisme. Ce workflow utilise uniquement
MATLAB, exige un dépôt public et ne configure aucun `MLM_LICENSE_TOKEN`.
Il n'achète ni n'installe de licence globale sur la machine utilisateur.
[Conditions officielles de Setup MATLAB](https://github.com/matlab-actions/setup-matlab#licensing).

Le profil utilise des fichiers JSON et une fonction `.m`, pas les interfaces
externes MATLAB Engine, non prises en charge par cette licence CI publique.
Une indisponibilité réseau, d'installation ou de licence fait échouer le job ;
les états des étapes sont conservés et aucun succès MATLAB n'est fabriqué.
[Restrictions et exécution](https://github.com/matlab-actions/setup-matlab#notes),
[Run MATLAB Command](https://github.com/matlab-actions/run-command).

Pins consultés le **17 octobre 2026**, par les releases puis les commits de tags
de l'API officielle GitHub :

| Action | Version | Commit utilisé |
| --- | --- | --- |
| [setup-matlab](https://github.com/matlab-actions/setup-matlab/releases/tag/v3.1.0) | v3.1.0 | `f9e43010f1ae678f7cfa0542fe2a4f60f7d1ad8d` |
| [run-command](https://github.com/matlab-actions/run-command/releases/tag/v3.3.0) | v3.3.0 | `bfa857648f4895aa98a446fe41c85e0788421ed5` |
| [download-artifact](https://github.com/actions/download-artifact/releases/tag/v8.0.2) | v8.0.2 | `9000827ccba6bdab643e8b6fd33ac0654aef8333` |

Checkout, setup-node et upload-artifact réutilisent les pins déjà revus du dépôt.
Le token garde `contents: read`, sans secret cloud, permission OIDC ni événement
`pull_request_target`. Node est fixé à 24.11.1 et Rust à 1.93.0. Les images et
versions scientifiques de l'orchestrateur figurent dans ses propres résultats.

## Échecs, artefacts et interprétation

Le premier bundle porte le nom `circuit-public-<run_id>-<run_attempt>`, le second
`circuit-matlab-<run_id>-<run_attempt>`. La rétention est de **14 jours**.
Exporter les résultats retenus dans le registre du dépôt reste une décision
distincte : l'existence d'un artefact temporaire ne les archive pas durablement.

Après le démarrage de la campagne, la sélection et l'upload s'exécutent aussi
après échec. Les fichiers absents sont déclarés et les statuts d'étapes restent
visibles ; le job demeure rouge. Un arrêt avant export, un timeout ou une
annulation forcée peut empêcher tout bundle. Le job MATLAB dépend du succès du
premier job ; s'il est sauté, il n'a pas exécuté MATLAB. Lorsqu'il démarre, son
bundle conserve les états d'éligibilité, installation, oracle et corrélation,
y compris les échecs, sans logs bruts.

Un résultat `success` du process, une corrélation exacte des verdicts, une preuve
cryptographique vérifiée et une démonstration mathématique restent des objets
différents. Les SHA-256 garantissent l'identité des octets couverts, sans preuve
de leur vérité ou de leur date. Un test synthétique massif reste fini et
n'établit ni sûreté universelle, ni indépendance statistique, ni disponibilité
générale de la plateforme.

Cette CI exécute des commandes fixes. Le flux agentique
**proposition → politique → challenge → preuve → vérification → effet** appartient
à la démonstration MCP Horizon et à ses tests d'autorisation distincts. La
campagne du circuit n'exécute pas de merge, paiement ou décision libre de LLM.

Validation locale de cette version : **actionlint 1.7.12 PASS** et cinq
contre-tests des exports : filtre public, artefacts absents après échec,
hardlink refusé, état MATLAB indisponible conservé, succès sans preuves refusé.
Ils utilisent des fixtures
de revue, sans exécuter MATLAB ou le circuit. Une campagne déclarée réussie
dont un fichier requis manque est refusée, en conservant son bundle partiel.
Les exécutions
GitHub et MATLAB réelles doivent être rapportées avec URL, commit, run/attempt,
versions, compteurs et résultats ; elles ne sont pas déclarées réussies ici.
Documentation primaire complémentaire :
[CI MATLAB sur les plateformes](https://www.mathworks.com/help/matlab/matlab_prog/continuous-integration-with-matlab-on-ci-platforms.html),
[concurrence GitHub Actions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
