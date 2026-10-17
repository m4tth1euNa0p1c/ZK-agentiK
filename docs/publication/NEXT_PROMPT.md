# Prochaine mission : fermer des inconnues, pas proclamer une perfection

```text
Tu travailles dans ZK-agentiK. Commence par AGENTS.md, le statut Git, le registre
docs/publication/CLAIMS.md et issues/horizon/NEXT_EXPERIMENTS.md. Préserve les
changements des autres et CLAUDE.md. Consigne le commit de départ et assigne les
chemins avant tout travail parallèle explicitement autorisé.

Objectif : rendre la prochaine décision de pilote falsifiable. Le SDK Proofkit
et Horizon restent un laboratoire. N'annonce ni standard mondial, ni record
Vega, ni conformité bancaire, ni générateur automatique de circuits sûrs.
Décisions confirmées le 17 octobre 2026 : « GA » signifie GitHub Actions pour
automatiser les preuves et les déploiements de sandbox ; comparer Azure et GCP
sans déployer de cloud ; rendre le dépôt public après les vérifications.
La publication du dépôt est déjà autorisée : ne redemande pas cette permission.
Elle ne signifie ni disponibilité générale du produit ni publication npm.

1. H11 — Besoin acheteur et substitut
   Lire le protocole d'entretiens existant. Préparer une fiche problème avec
   décideur, donnée interdite de divulgation, raison, flux réel et budget connu
   ou inconnu. Comparer verdict signé, divulgation bornée et credential/prédicat.
   Ne contacte personne sans instruction explicite. Un entretien non effectué
   reste « non effectué ». Abandonner le besoin ZK si le substitut satisfait les
   contraintes avec moins de complexité. Aucun prospect ni budget à inventer.

2. H13 — Deux émissions authentiques
   Implémenter ou spécifier selon les accès réellement disponibles deux sources
   indépendantes qui lient fait autoritatif, unité, domaine, version, engagement,
   signature et transfert d'ouverture au prover. Tester faux fait, substitution,
   clé inconnue, révocation et changement de version. Une signature valide ne
   prouve pas la vérité de sa source. Si personne ne peut connaître les deux
   ouvertures, ce profil exige une autre architecture, pas une phrase marketing.
   Pour KMS, vérifier algorithme ET niveau de protection : Ed25519 logiciel ne
   signifie pas Ed25519 HSM. Aucun changement de signature sans profil versionné.

3. H14 — Contrôleur et cible durable réellement séparés
   Définir un contrat cible avec identifiant d'opération métier, clé d'idempotence,
   précondition de version et lecture du statut. Construire d'abord un laboratoire
   local à deux processus/cibles et store durable partagé ; PostgreSQL seul ne
   rend pas un appel distant atomique. Injecter perte d'ACK, crash avant/après
   réservation et effet, concurrence de deux contrôleurs, nouvelles demandes
   pour même opération et reprise après restauration. Compter les effets sur la
   cible. Un état UNKNOWN ne libère pas l'opération et ne déclenche pas de
   rediffusion automatique sans contrat suffisant. Aucun effet avant la preuve.

4. H15 — Paquet de revue indépendant
   Préparer relation, domaines, encodages, RNG, parsing, hypothèses d'émetteur,
   fuites, fixtures et tests adverses pour une revue cryptographique externe.
   Une revue par agents peut améliorer le paquet ; elle ne clôt pas H15.
   Consigner les objections non résolues et leurs expériences de réfutation.

5. Infrastructure et coût — comparer Azure et GCP sans déployer
   Lire docs/publication/CLOUD_COMPARISON.md. Revalider la documentation actuelle.
   Comparer les deux fournisseurs avec région, identité, clés compatibles,
   stockage durable, réseau et coûts paramétrés. Le choix actuel n'autorise
   aucun déploiement cloud ni création de ressource ou de clé. Les fondations
   existantes ne sont que réseau/identité, validables localement. H17 exige IAM,
   isolation, restauration, audit et limites multi-tenant testés. SQLite
   d'instance n'est pas une base distribuée. Établir H16 sans inventer de prix
   ou de charge ; aucun GPU sans bénéfice mesuré sur le profil concerné.

6. GitHub Actions — preuves et sandbox éphémère
   Lire docs/publication/GITHUB_ACTIONS.md et le workflow réutilisable
   .github/workflows/proof-sandbox.yml, déclenchable par workflow_call et
   workflow_dispatch. Les profils admis sont horizon et math ; deploy_sandbox
   est un booléen, false par défaut et admis seulement pour Horizon. Le sandbox
   Docker tourne sur le runner GitHub et ne constitue pas un déploiement cloud.
   Vérifier réellement les appels depuis ci.yml et evidence.yml. Maintenir une
   liste fermée de profils, les actions épinglées, les permissions minimales,
   et aucun secret cloud, commande libre ou clé privée dans les artefacts.
   Distinguer résultats de processus, fixture historique, nouvelle exécution
   numérique et preuve vérifiée. Conserver commit, versions, empreintes, état
   inconnu ou échec sans promotion automatique en succès. Les résumés uploadés
   et leurs SHA-256 ne remplacent pas les résultats bruts sélectionnés et relus.
   Tout déploiement cloud futur exige un périmètre explicitement autorisé ;
   ne pas ajouter un stage fictif annonçant un environnement inexistant.

7. Expériences CPU/GPU, Vega et migration post-quantique
   Lire docs/experiments/gpu/RESULTS_2026-10-17.md : deux compilations ont échoué
   par manque de mémoire et aucune receipt GPU n'a été produite. Ne pas relancer
   les mêmes paramètres. Justifier d'abord le profil, la RAM, la durée maximale
   et le critère d'arrêt ; aucune modification globale du pilote ou location de
   GPU n'est autorisée par ce prompt. Un essai nouveau doit séparer compilation,
   préparation, proving, vérification indépendante, sérialisation et mémoire,
   conserver le résultat négatif et vérifier le refus du mode de développement.
   Comparer CPU/GPU uniquement à relation, sécurité, entrées et paramètres égaux.
   Ne pas mélanger le circuit SHA-256 de Vega avec le prédicat Horizon ; un essai
   à relation différente reste dans un classement distinct. Ne pas extrapoler
   les chiffres des références au code du SDK ou à une nouvelle dépendance.

   Pour le post-quantique, inventorier toutes les hypothèses : engagement,
   signature de source, signature fraîche, preuve, transcript et paramètres.
   Changer seulement Ed25519 pour ML-DSA ou SLH-DSA ne rend pas Bulletproofs
   post-quantique. Proposer un profil séparé à partir de primitives publiées,
   établir ses hypothèses et ses coûts, puis réaliser un POC seulement si son
   besoin et sa faisabilité sont établis. Refuser toute demande PQ sur le profil
   classique actuel. Aucun protocole maison ou label PQ fondé sur SHA-256 seul.

Livrables : diff borné, matrice assertion/preuve/limite, tests négatifs avec
compteurs d'effets, artefacts de panne, coût avec hypothèses, décision GO/NO-GO
par expérience. Exécuter les contrôles appropriés de AGENTS.md et les profils
modifiés. Ne relance pas les campagnes lourdes sans changement qui le justifie.

Utiliser les contrats .agents/roles/ pour une contradiction explicite, sans
prétendre que tous les clients les autodécouvrent. Répondre à chaque objection
par preuve, correction ou limite conservée. Le passage public du dépôt, déjà
autorisé, intervient après les contrôles de publication sur la révision candidate
exacte ; consigner le résultat effectif, sans annoncer une visibilité non vérifiée.
Les contacts externes, une publication npm et les ressources cloud ne sont pas
inclus dans cette autorisation. Préserver les fichiers privés de l'utilisateur
et distinguer l'état des checks, de GitHub et de la qualification du produit.
```
