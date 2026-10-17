# HORIZON — découverte métier et sélection contradictoire

Recherche arrêtée au **17 octobre 2026**. Ce dossier explore cinq domaines au
maximum. Il complète les [antériorités](NOVELTY_AND_PRIOR_ART.md) et le
[dossier économique](BUSINESS_CASE.md). Les sources ci-dessous ont été ouvertes ;
une annonce d'éditeur est distinguée d'une mesure indépendante. Aucun prospect
n'a été contacté, aucune donnée financière réelle collectée.

**Décision du comité de recherche : GO pour un laboratoire falsifiable du
cas 1 ; NO-GO pour un produit ou une niche commerciale déclarée validée.**
L'action retenue est `record_claim_authorization` dans une sandbox. Elle
enregistre une autorisation synthétique ; elle ne déclenche aucun paiement.
Le comité réunit intégration, cryptographie, recherche métier et contradiction
indépendante. Cette décision ne constitue pas une validation par un assureur.

## 1. Conditions recherchées

Une piste doit réunir trois éléments distincts :

- **A — contrôle** : un décideur applique une règle explicite avant une action.
- **B — données** : des faits d'autorités différentes doivent être joints ; une
  restriction réelle empêche le vérifieur de recevoir certaines valeurs.
- **C — faiblesse** : le processus existant a un coût, un délai ou un défaut
  mesuré. Une faiblesse inconnue est notée comme telle, sans chiffre inventé.

Une règle sur un montant confidentiel ne rend pas ZK nécessaire. Si l'émetteur
peut calculer le verdict et le signer sous une politique acceptée, cette
solution est un concurrent de référence. Si personne n'est autorisé à connaître
l'ensemble du witness, un prover central ordinaire ne satisfait pas B.

Les résultats antérieurs du dépôt démontrent seulement le coût d'une autre
relation : trois preuves RISC Zero autorisantes produites en 153,681 à
163,232 secondes sur CPU, vérification à chaud p95 de 13,697 ms. Ils justifient
l'essai d'une relation spécialisée ; ils ne mesurent aucun processus assurance
ni le nouveau laboratoire. [Mesures et limites du banc antérieur](../08-RISC0-LAB-RESULTS.md).

## 2. Shortlist de cinq domaines

| Domaine | A : contrôle documenté | B : faits privés multiacteurs | C : faiblesse constatée | Verdict recherche |
|---|---|---|---|---|
| 1. Autorisation bornée d'un sinistre délégué | Limite de délégation documentée ; contrôle numérique précis à contractualiser | Montant admissible attesté par expert et plafond attesté par délégant ; restriction de divulgation **hypothétique** | Coût de revue, taux d'erreur, délai ajouté par ce contrôle **inconnus** | Laboratoire limité retenu ; demande commerciale non validée |
| 2. Couverture d'assurance au-dessus d'un seuil | Vérification de couverture | Assureur/courtier, assuré et destinataire ; souvent une seule autorité suffit | Coût marginal d'une preuve privée **inconnu** | Antériorité trop directe ; écarté comme nouveauté |
| 3. Conformité d'un paiement transfrontalier | Contrôles avant instruction de paiement | Banques et autorités de plusieurs juridictions | Gain incrémental de notre dispositif **inconnu** | Mandala occupe déjà le problème général |
| 4. Double financement d'une facture | Détection de documents déjà financés | Prêteurs concurrents, documents et états privés | Risque reconnu par les fournisseurs ; perte évitable localement **non mesurée** | Registre partagé et adoption déterminants ; pas un simple circuit de seuil |
| 5. Sinistre paramétrique à sources privées multiples | Déclenchement selon observation et contrat | Capteurs, télédétection, assuré, assureur | Coût opérationnel et besoin de confidentialité **inconnus** | Prototype scientifique proche ; problème d'oracle persistant |

### Cas 1 — autorisation bornée d'un sinistre délégué

La guidance de Lloyd's de mai 2023 décrit une délégation documentée et des
limites d'autorité des gestionnaires délégués ; elle distingue limite par
sinistre et limite par contrat de délégation (§3.27–3.30, page imprimée 12).
Elle étaye **A**, pas une obligation d'utiliser ZK. L'applicabilité et les
termes du contrat du futur pilote restent à vérifier.
[Guidance on Lloyd's Claims Lead Arrangements](https://assets.lloyds.com/media/722c1caa-960f-43c9-a210-3635038f25d7/Guidance-on-the-Lloyds-Claims-Lead-Arrangements-0523.pdf).

Le laboratoire propose deux autorités synthétiques : l'une atteste un montant
admissible `a`, l'autre un plafond `c`. Les deux montants restent privés ;
le destinataire vérifie `1 <= a <= c`, avec même dossier, devise, version et
période, ainsi que les bornes du profil décrites plus bas. Il n'y a pas de
montant de paiement public dans cette relation. Ce modèle n'encode ni
l'intégralité d'une police ni la validité juridique d'un sinistre. Il ne
vérifie pas un ordre de paiement et ne traite pas un plafond cumulé : celui-ci
exigerait aussi un état comptable actuel et une réservation atomique.

L'expert et le délégant sont des rôles plausibles, pas des partenaires acquis.
Le détenteur qui génère la preuve connaît les valeurs et leurs ouvertures.
Le destinataire apprend les engagements, les émetteurs et la satisfaction
des bornes. Le droit de cacher `a` ou `c` au destinataire n'est pas démontré ;
les pièces complètes peuvent rester nécessaires à un audit ou à un litige.

Le marché dispose déjà de DDM, qui normalise et valide les bordereaux avec
contrôles d'accès, et de FCP, qui organise le financement et le règlement des
sinistres délégués. Ces services sont des points d'intégration potentiels et
des substituts fonctionnels ; ils empêchent de présenter le contrôle comme un
marché vide. [LIMOSS DDM](https://limoss.london/ddm),
[LIMOSS FCP](https://limoss.london/fcp).

**Acheteur hypothétique :** responsable des contrôles sinistres d'un managing
agent, avec exploitation des paiements et sécurité. Le gestionnaire délégué
et l'expert sont des parties à convaincre, pas nécessairement les payeurs.
**Abandon commercial :** partage des valeurs acceptable, verdict signé
suffisant, aucun coût de revue mesurable, ou refus de l'émission adaptée.

### Cas 2 — prouver une couverture minimale sans révéler sa limite totale

La publication de brevet **WO2021030246A1**, §0119, décrit explicitement une
preuve que la couverture dépasse une exigence sans divulguer son montant
complet. Elle a été publiée le 18 février 2021. L'existence de cette description
réfute la nouveauté générale du cas ; elle n'établit pas qu'un produit déployé
exécute ce mécanisme. [Texte de la publication](https://patents.google.com/patent/WO2021030246A1/en).

**Acheteur hypothétique :** acheteur professionnel ou gestionnaire du risque
fournisseur. **Protocole synthétique :** assureur signe couverture, périmètre et
période ; destinataire compare à son seuil. **Alternative décisive :** assureur
signe directement le prédicat requis, ou credential à divulgation sélective.
**Abandon :** absence de seconde relation nécessaire, ou contrat existant qui
donne déjà accès à la police. Le plafond secret seul ne constitue pas un
avantage défendable.

### Cas 3 — conformité préalable d'un paiement transfrontalier

Le BIS décrit dans Mandala une preuve de conformité avant initiation du
paiement, avec ZKP et calcul multipartite. La phase 2 vise notamment une
évaluation empirique des bénéfices. C'est une antériorité directe du concept
général, pas une mesure des performances de notre implémentation.
[Project Mandala, page mise à jour le 30 novembre 2025](https://www.bis.org/project/mandala).

**Acheteur hypothétique :** banque, responsable conformité paiements.
**Protocole synthétique :** deux attestations de contrôles et une instruction
canonique liées à une politique de test. **Abandon :** proposition identique
aux travaux existants sans lacune précise confirmée par une banque. Une
déclinaison MCP ne crée pas à elle seule un marché distinct.

### Cas 4 — empêcher le double financement d'une facture

MonetaGo présente Secure Financing comme une solution opérationnelle de
détection des financements dupliqués, utilisant chiffrement et confidential
computing, avec intégration à l'écosystème Swift. Ce sont des déclarations du
fournisseur ; ni ses pertes évitées ni son efficacité n'ont été auditées ici.
[MonetaGo, offre et historique](https://www.monetago.com/).

**Acheteur hypothétique :** responsable trade finance ou réseau de prêteurs.
**Protocole synthétique :** registre local de deux prêteurs, engagement de
facture et tentative concurrente de réservation. **Abandon :** besoin réel
centré sur la couverture du réseau ou la qualité des identifiants. Une preuve
correcte sur un registre incomplet ne prouve pas l'absence de dette ailleurs.
Les droits d'accès et la coordination restent plus difficiles que l'inégalité.

### Cas 5 — assurance paramétrique à observations privées

Hao, Qian et Chau ont publié en mai 2023 une construction d'assurance
paramétrique vérifiant validité de demande et authenticité de sources privées,
avec prototype Ethereum sur incendies. L'étude est une antériorité technique ;
elle ne prouve pas une adoption commerciale ni une certification des données.
[Privacy-preserving Blockchain-enabled Parametric Insurance](https://arxiv.org/abs/2305.08384).

**Acheteur hypothétique :** assureur paramétrique et fournisseur d'observation.
**Protocole synthétique :** deux capteurs signent des observations bornées ;
preuve d'un seuil et de leur rattachement à une période. **Abandon :** capteurs
non fiables, observation déjà publique, ou décision signée suffisante.
Prouver le calcul ne rend pas l'événement assuré authentique.

## 3. Expérience retenue par le comité

Le comité retient le cas 1 pour sa relation finie et réfutable, pas pour une
supériorité commerciale établie. Trois variantes doivent partager les mêmes
données synthétiques, autorités et action sandbox :

1. **A : preuve spécialisée.** Deux engagements de montants, attestés par des
   autorités distinctes ; signatures vérifiées publiquement et preuves de
   bornes Bulletproofs. L'émission doit connaître les ouvertures et attester
   leur signification. La relation est `A = aG + rA H`, `C = cG + rC H`, avec
   `Range32(A - G, C - A)`. Elle porte sur `x = a - 1` et `d = c - a` dans
   `[0, 2^32 - 1]`, donc `a` dans `[1, 2^32]` et `c` dans
   `[a, a + 2^32 - 1]`. Les montants sont des entiers `u64` ; les émetteurs
   doivent construire leurs engagements à partir des faits autoritatifs dans
   ces bornes. Les générateurs Ristretto Dalek `G/H` sont fixés par le profil.
   Ce n'est pas une comparaison de deux `u64` quelconques : une valeur hors
   des bornes du profil doit être refusée, même si elle serait licite dans
   un autre contrat.
2. **B : réutilisation contrôlée.** Réutiliser une preuve portant sur des faits
   immuables, puis vérifier une signature fraîche du détenteur sur l'action
   complète, les identifiants des preuves, la politique et l'époque de
   confiance. La révocation et l'unicité sont vérifiées à l'admission. Une
   preuve réutilisée ne transforme pas un fait ancien en fait actuel.
3. **C : choix par politique de divulgation.** Comparer avec valeurs ouvertes
   signées et verdict signé DSSE. Le mode est imposé par le destinataire ; une
   erreur de preuve ne doit jamais déclencher une divulgation ou une
   autorisation moins protectrice.

Les primitives de ranges sont déjà disponibles dans
[la bibliothèque Bulletproofs Dalek](https://github.com/dalek-cryptography/bulletproofs).
Leur existence ne constitue pas un résultat HORIZON. Ce profil spécialisé
n'est ni la relation mDL de Vega, ni le guest RISC Zero antérieur. Un gain entre
eux serait un gain de **relation et de profil**, pas une accélération du même
calcul démontrée.

Les scénarios doivent inclure dépassement de chaque borne, substitution de
dossier/devise/autorité, signature invalide, engagement remplacé, preuve
altérée, expiration, époque révoquée et rejeu concurrent. Zéro écriture cible
est attendu pour tout refus. Une panne entre réservation et écriture doit
aboutir à une réconciliation explicite, pas à une nouvelle autorisation.
Les résultats effectifs et les limites de mesure relèvent du
[journal d'expériences](EXPERIMENT_LOG.md), pas de cette étude de marché.

## 4. Niveau de confiance et conditions de réexamen

| Élément | Niveau et raison |
|---|---|
| Existence du contrôle de délégation | Élevé sur le texte Lloyd's de 2023 ; adéquation au contrat pilote inconnue |
| Existence des antériorités citées | Élevé sur leurs textes ; maturité et adoption variables |
| Existence des services DDM/FCP | Élevé sur documentation opérateur ; efficacité locale non auditée |
| Restriction réelle d'accès aux deux montants | Inconnue ; aucun contrat ni interlocuteur métier validant B |
| Coût du contrôle existant et budget acheteur | Inconnus ; aucune observation de dossiers ni intention d'achat |
| Avantage du circuit spécialisé | Hypothèse à mesurer sur le matériel et la relation retenus |

Réexaminer la décision uniquement avec un dossier concret : contrôle exact,
droits de chaque partie, données attestables, baseline acceptable, coût actuel
et seuil économique. Aucun résultat de microbenchmark ne clôt ces questions.
