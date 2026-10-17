# HORIZON — nouveauté, substituts et antériorités

État de recherche : **17 octobre 2026**. Cette revue documentaire ne démontre
ni l'absence universelle d'un concurrent ni une liberté d'exploitation.
Les publications de brevets sont examinées comme descriptions techniques ;
leur validité, portée et statut juridique demanderaient une analyse distincte.
La sélection de recherche est décrite dans [MARKET_DISCOVERY.md](MARKET_DISCOVERY.md).

**Conclusion : aucune nouveauté générale de ZK appliqué aux décisions
d'assurance, aux attestations signées ou au contrôle avant action n'est
établie.** Le travail défendable à ce stade est un protocole reproductible et
un essai comparatif d'intégration. L'émission adaptée, la restriction de
divulgation et l'acceptation de la preuve par un acheteur restent à démontrer.

## 1. Méthode et limites

Les axes examinés sont : preuve de couverture, automatisation privée des
sinistres, paiement préalable conforme, fraude au financement, attestations
sélectives et contrôle d'agent. La recherche a ouvert documentation officielle,
dépôts, articles des auteurs et textes de publications de brevets. Les résultats
d'indexation non récupérés ne servent pas de preuve quantitative.

Les études précédentes restent accessibles : [recherche initiale](../01-RESEARCH-AND-GAP-ANALYSIS.md),
[concurrents du gateway et de l'admission fournisseur](../06-MARKET-NICHE-AND-CHALLENGE.md).
Les produits commerciaux n'ont pas été essayés. Aucune recherche exhaustive
par classes de brevets, langues, familles ou revendications n'a été menée.
L'absence d'un exemple exact dans cette sélection est une limite de recherche.

## 2. Antériorités qui réfutent les revendications larges

| Source primaire, date | Recouvrement établi | Ce que la source ne démontre pas pour HORIZON |
|---|---|---|
| [WO2021030246A1](https://patents.google.com/patent/WO2021030246A1/en), publication 18 février 2021, priorité déclarée 9 août 2019 | §0119 : preuve d'une couverture supérieure à un seuil sans révéler sa limite entière | Produit ZK déployé, validité juridique du brevet ou identité avec notre jonction de deux émetteurs |
| [CN113706323A](https://patents.google.com/patent/CN113706323A/en), publication 26 novembre 2021 | Description de règlement automatique privé, pièces médicales signées et preuve zkSNARK ; étapes 8.1–8.3 | Sécurité de la construction, disponibilité de code et déploiement ; la traduction comporte des ambiguïtés cryptographiques |
| [Hao, Qian, Chau](https://arxiv.org/abs/2305.08384), soumission 15 mai 2023 | Assurance paramétrique, sources hétérogènes privées et authenticité ; prototype | Demande solvable ou équivalence à un paiement délégué hors chaîne |
| [BIS Mandala](https://www.bis.org/project/mandala), mise à jour 30 novembre 2025 | Conformité démontrée avant paiement, ZKP/MPC et coopération bancaire | Même relation numérique, mêmes autorités ou performances de notre cible |
| [ERC-8354](https://ercs.ethereum.org/ERCS/erc-8354), proposition consultée le 17 octobre 2026 | Verdict confidentiel, engagement d'action, exécuteur, expiration, nullifier et vérification bloquant l'exécution | Adoption universelle, audit de toutes les références ou usage assurance en production |
| [LIMOSS DDM](https://limoss.london/ddm) et [FCP](https://limoss.london/fcp), pages courantes | Normalisation, contrôle d'accès et processus opérationnels des sinistres délégués | Preuve ZK de notre relation ; leur absence de mention ZK ne prouve pas un manque acheteur |

La famille WO comporte notamment une publication américaine
[US20220405852A1](https://patents.google.com/patent/US20220405852A1/en).
Elle ne constitue pas une deuxième invention indépendante. Les étiquettes de
statut de Google Patents ne sont pas utilisées pour conclure à l'absence de
droits : elles ne remplacent pas les registres et l'analyse des revendications.

Le site [TrustLayer](https://www.trustlayer.io/) présente un produit de gestion
de conformité assurantielle. Le texte d'une publication de brevet attribuée
à cette société ne démontre pas que son produit commercial utilise ZK.
Inversement, l'absence d'une mention détaillée sur sa page publique ne démontre
pas que cette fonctionnalité n'existe pas.

## 3. Alternatives à battre, avec leurs frontières de confiance

| Alternative | Ce qu'elle peut déjà résoudre | Objection à une vente de ZK |
|---|---|---|
| Valeurs ouvertes, signatures et règle native | Authenticité des valeurs acceptées et calcul reproductible par le destinataire | Si leur divulgation est autorisée, la preuve privée ajoute un coût sans bénéfice établi |
| Verdict signé DSSE | Un émetteur accepte la responsabilité d'un verdict lié à une action | Si cet émetteur est jugé digne de confiance pour le calcul, pas besoin de prouver l'évaluation |
| Credential BBS standard | Révéler seulement certains attributs signés, avec présentations dérivées | Un booléen de conformité signé par l'émetteur peut suffire ; le standard BBS seul n'est pas un moteur de ranges arbitraires |
| AnonCreds | Prédicats entiers et présentations combinées | Les seuils et identités de détenteur peuvent déjà satisfaire le cas simple |
| Dock composite proofs | Relations et prédicats sur plusieurs credentials, dont ranges selon les primitives choisies | La combinaison de sources privées et de comparaisons n'est pas une primitive nouvelle |
| TEE avec attestation | Exécuter le calcul sur données privées sous une identité de logiciel attestée | Si les parties acceptent le matériel, l'opérateur et cette confiance, le coût d'intégration peut dominer le choix |
| MPC | Calcul réparti quand les parties ne veulent pas réunir leurs valeurs chez un prover | Un prover ZK central ne résout pas cette contrainte ; MPC ou preuve distribuée change le protocole |

Le format [DSSE](https://github.com/secure-systems-lab/dsse) protège le type et
le payload signé. Il ne prouve pas l'exécution d'une règle. Il peut néanmoins
lier nonce, audience, version et échéance : attribuer l'anti-rejeu à ZK seul
serait une comparaison biaisée.

[W3C BBS, Candidate Recommendation Draft du 10 septembre 2026](https://www.w3.org/TR/vc-di-bbs/)
spécifie divulgation sélective et preuves dérivées ; ce statut ne vaut pas
recommandation finale. [AnonCreds](https://anoncreds.github.io/anoncreds-spec/)
documente des prédicats `<`, `<=`, `>` et `>=` contre des seuils entiers, ainsi
que des présentations de credentials liées au détenteur. Un link secret
commun ne démontre pas automatiquement que deux pièces concernent le même
sinistre, ni une comparaison arbitraire entre deux attributs secrets.

[Dock crypto-wasm-ts](https://docknetwork.github.io/crypto-wasm-ts/) documente
des preuves composites, des égalités d'attributs cachés, des ranges et des
circuits. Les ranges relèvent des mécanismes documentés par cette bibliothèque,
pas d'une propriété à attribuer au seul standard W3C BBS. Cette alternative
est techniquement proche ; elle n'a pas été exécutée ni auditée dans cette
recherche.

[AWS Nitro Enclaves](https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html)
documente des attestations signées contenant les mesures de l'enclave,
vérifiables par un service externe. C'est une frontière de confiance différente
de ZK, pas une absence de protection. La validité des sources et la politique
d'accès doivent être traitées dans les deux cas. Mandala fournit aussi une
référence primaire d'utilisation de MPC ; aucun classement universel de
latence ou de sécurité entre ces familles n'est justifié ici.

## 4. Ce que le profil spécialisé change réellement

Le comité choisit pour le laboratoire une relation de ranges sur engagements
signés. Les signatures sont vérifiées **hors de la preuve**, sur des
engagements et métadonnées publics. La preuve démontre les contraintes sur
leurs ouvertures. Cela exige que l'émetteur atteste correctement ce nouvel
objet ; une signature d'un PDF ou d'un JSON existant ne se transforme pas
gratuitement en signature de son engagement Pedersen.

Cette distinction interdit trois raccourcis :

- « Plus rapide que le guest » ne signifie pas « même calcul plus rapide ».
  Le guest précédent vérifiait une signature et des engagements à l'intérieur
  du calcul prouvé ; le profil spécialisé déplace ces vérifications.
- « Deux autorités » ne signifie pas « aucune confiance ». Chaque autorité
  reste responsable du sens et de la justesse de sa valeur, de la devise,
  du dossier, de la période et de la garde de sa clé.
- « Preuve réutilisable » ne signifie pas « autorisation réutilisable ».
  Les faits peuvent être immuables, mais la confiance, le droit d'action,
  l'expiration et la réservation doivent être contrôlés à nouveau.

Bulletproofs et Pedersen sur courbes reposent sur des hypothèses différentes
du profil hash-based initial. Ce choix ne doit pas être présenté comme
post-quantique. Les [ranges agrégés de Dalek](https://github.com/dalek-cryptography/bulletproofs)
sont une implémentation publique existante ; l'API expérimentale R1CS décrite
par le dépôt n'est pas nécessairement le profil utilisé. Les dépendances et
features exactes doivent être épinglées dans le laboratoire.

Le détenteur connaît les deux valeurs. Les engagements et signatures publics
permettent de relier les présentations ; le profil ne revendique pas
l'unlinkability de certaines credentials. Le résultat révèle la relation
d'ordre et les bornes du profil, même si aucun montant n'est public. Des
requêtes adaptatives avec des faits choisis peuvent apprendre plus qu'un seul
verdict ; une preuve ZK ne supprime pas cette fuite fonctionnelle.

## 5. Revendications autorisées et réfutables

| Formulation | Décision |
|---|---|
| Premier contrôle privé de sinistre, premier zk-MCP, marché vierge | Écartée : antériorités explicites |
| Nouvelle primitive de ranges ou de jonction de credentials | Écartée : primitives et bibliothèques disponibles |
| Nouvelle supériorité de Vega sur la relation assurance | Non démontrée : relations différentes |
| Émission compatible sans changement avec les assureurs existants | Non démontrée : format d'engagement à faire adopter |
| Comparaison reproductible de profils de confiance sur une action sandbox | Objectif légitime, à confirmer par rapports et tests |
| Réduction mesurée de données divulguées pour un contrôle métier accepté | Hypothèse ; exige restrictions validées et analyse de fuite |
| Produit achetable pour une niche précise | NO-GO actuel : besoin, budget et coûts inconnus |

Le gain potentiellement défendable serait une intégration acceptée à un
contrôle précis, accompagnée d'un format d'émission, de tests adversariaux et
de coûts vérifiés. Aucun de ces éléments ne crée à lui seul une exclusivité.
La niche serait réfutée si DSSE, partage contractuel, credentials existantes
ou service déjà installé satisfont les mêmes exigences à coût acceptable.

## 6. Registre de confiance documentaire

Les textes de brevets et spécifications établissent avec confiance élevée
qu'une idée est décrite. Ils n'établissent ni sa sécurité ni sa mise en marché.
Les documentations de produits établissent leurs fonctions annoncées avec
confiance moyenne sur le comportement réel, faute d'essai. Les restrictions
contractuelles, intentions d'achat et économies de HORIZON restent inconnues.
Une vérification ciblée complémentaire serait nécessaire avant publication
d'une revendication de nouveauté, dépôt de brevet ou négociation commerciale.
