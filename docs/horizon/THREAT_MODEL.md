# Modèle de menace Horizon

Profil `horizon-range-v1`, laboratoire de contrôle d'une autorisation de sinistre.
La relation est définie dans [FORMAL_STATEMENT](FORMAL_STATEMENT.md). Aucun paiement.

## Actifs et frontières

Les montants et ouvertures Pedersen sont privés au fournisseur. Les clés privées
des autorités servent uniquement à l'émission synthétique ; la clé du détenteur
reste chez le prover. Le client vérifieur ne reçoit que les attestations publiques,
les clés publiques approuvées et les présentations. Son contrôleur possède seul
la base de l'action simulée. Une preuve ne donne pas accès à un credential de mutation.

L'agent, le transport et les présentations sont potentiellement hostiles :
substitution, omission, répétition, changement de méthode et prompts arbitraires.
Le vérifieur, sa configuration, son binaire, son stockage et son système
d'exploitation sont de confiance. Compromettre cette frontière permet de changer
les règles ou d'écrire dans la cible ; ZK ne protège pas contre cette compromission.

Les autorités sont de confiance pour la vérité des faits, les unités et l'émission
depuis les valeurs connues. Un signataire qui signe un mensonge peut produire une
attestation authentique mais fausse. La preuve vérifie la relation sur ce qui est
attesté, pas la réalité du sinistre. Le prover connaît ici les deux valeurs :
ce n'est pas un calcul multipartite où chaque source conserve son witness.

## Attaques et contrôles observables

| Attaque | Contrôle | Limite |
| --- | --- | --- |
| Hallucination/injection demandant une action différente | Attentes émises par le serveur, contexte complet signé et transcript A | L'agent ne reçoit aucune API financière |
| Fausse preuve ou signature | Vérification Dalek/Bulletproofs, scalaires canoniques, clés épinglées | Pas d'audit cryptographique externe réalisé |
| Substitution ou omission de source | Deux rôles obligatoires, signatures et jointures, evidence exacte configurée | Émission réelle non raccordée |
| Divulgation forcée | Politique locale du fournisseur et du client ; aucune sélection HTTP affaiblissante | Une politique explicitement publique autorise la baseline divulguée |
| Rejeu/concurrence/nouveau challenge | Nonce consommé et opération métier réservée sous `BEGIN IMMEDIATE` | Pas de consensus interrégions |
| Révocation/politique/expiration pendant la preuve | Relecture après attente et après réservation ; bornes début/fin vérifiées | Horloge et source de révocation de confiance ; pas d'horloge sécurisée |
| Arrêt après réservation | SQLite WAL/FULL, état réservé persistant, pas de retry automatique | Durabilité dépend du stockage et de ses garanties réelles |
| Réponse cible inconnue | `UNKNOWN` reste consommé, réconciliation en lecture avant décision | Pas de promesse exactly-once sur une cible distante |
| Saturation | Corps 64 Kio, queue/HTTP 8, timeout worker 30 s, 10 000 challenges, limites Docker | Contrôles locaux, pas de protection DDoS certifiée |
| Mauvais tenant | Attestations/contexte liés ; base épinglée à sa configuration | Une configuration/instance par tenant ; pas de SaaS multi-tenant qualifié |

Le test de recul d'horloge couvre un challenge antérieur au début de validité
des attestations, une vérification dans leur intervalle, puis un dispatch avant
ce début. Il exige zéro effet. Il ne constitue pas une protection générale contre
une horloge contrôlée par l'attaquant.

## Confidentialité et hypothèses cryptographiques

Bulletproofs/Ristretto repose sur des hypothèses de logarithme discret et le
modèle du transcript Fiat–Shamir ; Ed25519 est une signature classique. Aucun
profil de cette expérience n'est post-quantique. Les générateurs standards sont
fixés dans le code, sans trusted setup à secret toxique.

Le profil révèle identifiants, tenant, devise, unité, versions, clés, dates,
engagements, action et verdict. Les mêmes engagements et clé de détenteur rendent
les présentations corrélables. Une preuve réutilisée est elle-même un identifiant
stable. Pas d'anonymat ni d'unlinkability. Les secrets ne sont pas effacés de façon
qualifiée de la RAM ; les canaux auxiliaires et la résistance aux dumps ne sont
pas évalués. Le mode non-ZK divulgue intentionnellement les valeurs et ouvertures.

## Déploiement et conformité

HTTP sans authentification est limité au loopback et aux organisations fictives.
Les routes opérateur de révocation ne doivent pas être exposées comme des outils
d'agent. CORS/CSP ne remplacent pas une authentification. Une industrialisation
exige mTLS/IAM, séparation des rôles, HSM/KMS, origine contrôlée, rotation/révocation,
sauvegardes testées, audit externe et politique de migration.

DORA, RGPD, AI Act et les obligations du secteur ne découlent pas d'une preuve.
La corrélation et les métadonnées peuvent être des données personnelles. Aucun
avis juridique, certification ou conformité réglementaire n'est établi par ce POC.
Les textes et leur portée sont référencés dans [MARKET_DISCOVERY](MARKET_DISCOVERY.md).
