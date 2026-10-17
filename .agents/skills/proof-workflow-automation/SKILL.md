---
name: proof-workflow-automation
description: Maintenir les workflows GitHub Actions de preuves et de sandbox ZK-agentiK, leurs appels réutilisables, leurs artefacts publics et leurs résultats négatifs. À utiliser pour cette automatisation CI, sans étendre son périmètre au déploiement cloud.
---

# Automatisation des preuves et du sandbox

« GA » désigne ici GitHub Actions. Lire `AGENTS.md`,
`docs/publication/GITHUB_ACTIONS.md`, `.github/workflows/proof-sandbox.yml` et
les callers `.github/workflows/ci.yml` et `.github/workflows/evidence.yml`.
Pour changer un profil, lire aussi `tools/proofkit/profiles.mjs` et les scripts
qu'il exécute : le catalogue de preuves ne doit jamais devenir une source de
commandes exécutables.

## Contrat d'exécution

- Conserver `workflow_call` et `workflow_dispatch`, avec leurs types d'entrées
  cohérents. Valider côté exécution la liste fermée `horizon|math`, y compris
  pour `workflow_call` dont l'entrée est une chaîne. Tout profil ajouté exige
  une définition revue et des limites explicites, pas une commande libre.
- `deploy_sandbox` est un booléen, désactivé par défaut et réservé à Horizon.
  Il lance Compose sur le runner éphémère. Il ne crée pas de service Internet,
  de ressource Azure/GCP ou d'environnement de production.
- Passer les entrées par des variables d'environnement citées dans le shell ;
  ne pas interpoler une expression utilisateur dans le texte d'une commande.
  Conserver délais, budgets et nettoyage même après échec. Ne pas boucler les
  campagnes ou relancer un effet ambigu pour obtenir un statut vert.
- Garder `permissions: contents: read`, sans secret cloud, identité OIDC ou
  `pull_request_target` exécutant du code de PR. Épingler les actions par SHA
  complet ; vérifier tout changement contre le dépôt officiel et sa version.
  Le commentaire de version ne remplace pas le SHA.
- Lors d'un appel depuis un autre dépôt, vérifier le contexte du caller et le
  dépôt réellement checkout. Épingler le workflow distant ne fixe pas à lui
  seul le code applicatif ou les lockfiles exécutés.

## Artefacts et échecs

Sélectionner explicitement les fichiers publics avant upload : résultats de
processus, états du job, JSON numériques relus, fixture publique historique,
PDF, catalogue, commit et empreintes. Exclure `.tools/`, witness, clés privées,
base SQLite et logs bruts. Une nouvelle famille d'artefacts exige une lecture
de son contenu, pas seulement un filtre d'extension.

Conserver les résultats `failed`, `unknown`, `unavailable` et les sorties
partielles après démarrage, même si une étape précédente échoue. Utiliser les
conditions `always()` de sélection/upload avec des gardes sur les étapes
réellement commencées. Garder le job en échec ; ne pas ajouter
`continue-on-error` pour annoncer une réussite. Un échec avant démarrage ou
export peut ne laisser aucun bundle : le signaler, sans inventer de résultat.

Séparer fixture historique, preuve nouvellement vérifiée, résultat numérique
et issue de processus. Si le PDF n'a pas été reconstruit, le fichier du checkout
reste historique. Le manifeste avant build et les SHA-256 du bundle après build
couvrent des octets différents ; aucun ne garantit vérité, date attestée ou
audit externe. Fixer la rétention et documenter ce qui survit à son expiration.

## Vérification et livraison

Valider la syntaxe avec `actionlint` si disponible, puis les scripts et tests
touchés. Une validation locale n'est pas une exécution GitHub réussie. Sur une
révision revue et dans le périmètre autorisé, contrôler les appels réutilisables
et le déclenchement manuel ; conserver URL/identifiant, commit, états, artefacts
et limites. En cas d'échec, diagnostiquer avant toute nouvelle tentative.

Pour Horizon, conserver les contrôles de falsification, rejeu, redémarrage et
compteur d'effets ; pour math, distinguer tests Octave et preuve cryptographique.
Ne pas lancer Vega/CUDA ou une campagne lourde pour une simple édition CI.

Le workflow séparé `circuit-validation.yml` orchestre les campagnes corrélées
128/1024/4096 ; ses corpus complets, autotests et images ont une liste d'export
propre. Le job MATLAB utilise les actions officielles épinglées et l'éligibilité
du dépôt public ; contrôler son exécution réelle et corréler les mêmes octets,
sans promouvoir un résultat Octave en résultat MATLAB. Les PR directes lancent
128 cas et MATLAB ; un appel réutilisable respecte ses paramètres explicites.
Le conteneur numérique prend UID:GID de l'hôte Linux pour écrire sur les mounts
sans rétablir de capacité ou rendre les dossiers accessibles en écriture à tous.
Conserver les échecs Linux initiaux et leurs fichiers manquants. Le profil `math`
reconstruit le manuscrit principal et le supplément `circuit-validation.pdf`.

Livrer le diff, les validations réellement exécutées, les résultats négatifs
et les inconnues restantes. Le maintien de ce workflow n'autorise pas à lui
seul une fusion sur la branche principale, un déploiement cloud, une publication
npm ou un changement de visibilité. Respecter les autorisations déjà explicites
de la session sans les redemander ; la comparaison Azure/GCP actuelle reste
sans déploiement. Réutiliser les contrats de revue existants dans `.agents/roles/`
si une revue distincte est demandée, sans promettre leur autodécouverte partout.
