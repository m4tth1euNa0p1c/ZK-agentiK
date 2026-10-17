# GitHub Actions pour les preuves et le sandbox

« GA » désigne ici GitHub Actions, conformément au choix utilisateur du
17 octobre 2026. Le dépôt fournit un workflow réutilisable et déclenchable
manuellement : [proof-sandbox.yml](../../.github/workflows/proof-sandbox.yml).

Les workflows automatiques l'utilisent déjà : `ci.yml` lance Horizon et le
sandbox après les tests ; `evidence.yml` contrôle le registre et l'historique,
puis lance Octave et reconstruit le manuscrit. Aucun compte cloud n'est utilisé.
Ils s'exécutent sur les PR et sur les pushes vers `main`, sans double campagne
pour un même push de branche de PR. Une nouvelle révision annule les checks
encore en cours de la même PR ; elle ne modifie pas les résultats déjà conservés.

## Réutilisation dans ce dépôt ou un fork

```yaml
name: My proof experiment
on: [workflow_dispatch]
permissions:
  contents: read
jobs:
  proof:
    uses: ./.github/workflows/proof-sandbox.yml
    with:
      profile: horizon
      deploy_sandbox: true
```

Le caller doit posséder le code et les lockfiles de ZK-agentiK dans son checkout.
Ce workflow n'est pas une action universelle exécutant automatiquement un projet
arbitraire : adapter le profil et le registre exige une revue. Pour un appel par
référence distante, épingler le commit du workflow et vérifier quel dépôt est
checkout ; le contexte d'un workflow réutilisable est celui de l'appelant.

Après intégration du fichier à la branche par défaut, utiliser Actions →
**Reusable proof and local sandbox** → **Run workflow**, ou :

```sh
gh workflow run proof-sandbox.yml --ref <reviewed-branch> -f profile=horizon -F deploy_sandbox=true
```

Seuls `horizon` et `math` sont admis ; un nom arbitraire ne devient pas une
commande. `deploy_sandbox=true` est réservé à Horizon. Il démarre Compose sur
le runner éphémère, vérifie une preuve réelle, falsification, rejeu, redémarrage
et vérification dans un conteneur indépendant. Il arrête ensuite les services.
Ce n'est pas une publication d'API Internet ni un déploiement Azure/GCP.

## Artefacts et confiance

Les actions sont épinglées par commit et le token est en lecture seule.
Aucun `pull_request_target`, secret cloud, clé longue durée ou permission
`id-token: write` n'est ajouté. Les fichiers uploadés sont sélectionnés
explicitement dans `public-artifacts/` : résumé de processus, résultats publics
du smoke, JSON numériques de la nouvelle exécution Octave si applicable,
fixture historique publique si applicable, PDF, registre, commit et
empreintes. Ni `.tools`, witness, clé privée, base SQLite ou log brut n'est uploadé.
La rétention des artefacts est de 14 jours ; le dépôt conserve les références
historiques nécessaires hors de cette rétention temporaire.
Une fois l'exécution commencée, le bundle est aussi conservé sur échec avec
`RUN_STATUS.txt` et les résultats présents seulement. Le job reste en échec ;
un PDF repris du checkout après un échec de reconstruction reste historique.
Un échec avant le démarrage du profil peut ne produire aucun bundle.

Le SHA GitHub et les checks facilitent la traçabilité ; les fichiers d'empreintes
ne sont ni une signature du mainteneur ni un horodatage TSA. Une mesure de temps
de workflow inclut téléchargement, build et contention ; ce n'est pas un
benchmark cryptographique. Le PDF reconstruit peut différer par sa date de build.
Le manifeste vérifié par `evidence.yml` concerne le checkout avant reconstruction ;
`SHA256SUMS` couvre les octets du bundle après reconstruction. Aucun des deux
n'authentifie la vérité des résultats ou la date par un tiers.

Les profils Vega longs et CUDA ne sont pas lancés automatiquement sur des
runners partagés. Le résultat CUDA local reste bloqué ; aucun runner GitHub
hébergé n'est supposé fournir un GPU.

## Extension Azure/GCP

Le choix confirmé est **comparaison sans déploiement pour l'instant**. Les
fondations IaC restent validées localement. Un futur workflow cloud devra être
séparé, avec environnement approuvé, identité fédérée limitée au dépôt/ref,
permissions minimales, région, budget et tests H14/H17. Le workflow présent ne
contient pas de faux stage `deploy` qui annoncerait un environnement inexistant.

Sources primaires consultées le 17 octobre 2026 :
[réutilisation de workflows GitHub](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows),
[upload-artifact](https://github.com/actions/upload-artifact/tree/cf430e030ddbb5b0abf93d22962f4752f3646cd9).
