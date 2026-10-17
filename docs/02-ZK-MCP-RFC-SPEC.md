# RFC zk-MCP 1.0 — profil DevSecOps, proposition expérimentale

Statut : **Draft 01**, 15 octobre 2026. Valeur wire proposée : `spec_version="1.0"`.
Ce document n'est pas un standard ratifié par MCP. Version des packages : 0.1.0.
Les termes MUST, MUST NOT, SHOULD et MAY expriment les obligations du profil.
Le POC implémente le profil `simulation` ; aucun profil ZK de production n'est
encore implémenté. Les obligations de production décrivent la cible à construire.

Le banc expérimental `labs/risc0` implémente maintenant une preuve réelle de
la relation commune et d'une signature de collecteur de fixture. Il ne constitue
pas un profil de production ni une attestation de confidentialité critique.
Son API vérifie des challenges historiques sans autoriser d'effet réel.

## 1. Objet et portée

Prouver que le programme de politique approuvé a évalué les faits engagés pour
une action déterminée, puis vérifier cette assertion **avant** l'effet de bord.
Le résultat prouvé n'affirme pas que l'API a effectivement réalisé le merge.
L'autorisation utilisateur, IAM et les restrictions GitLab continuent de s'appliquer.

Les réponses MCP restent des `CallToolResult` avec `content`, éventuellement
`structuredContent`, `isError` et `_meta`. Le reçu est dans `_meta.zkp`.
Les autres clés de `_meta` MUST être conservées. Un client historique peut
afficher le résultat sans le vérifier. Un client conscient du profil MUST
refuser de considérer un résultat sans reçu comme vérifié. Références :
[MCP tools](https://modelcontextprotocol.io/specification/2025-11-25/server/tools),
[MCP metadata](https://modelcontextprotocol.io/specification/2025-11-25/basic).

## 2. Schémas, types et limites

Schéma structurel machine : [`schemas/zkp-envelope.schema.json`](schemas/zkp-envelope.schema.json).
Source : `packages/zk-mcp-sdk/src/schema.ts`. Les contraintes relationnelles
ci-dessous complètent le JSON Schema. Les objets métier et l'enveloppe sont
stricts : champ inconnu, type erroné ou valeur hors borne MUST être refusés.

| Champ obligatoire | Type / convention | Sens |
|---|---|---|
| `spec_version` | chaîne exacte `1.0` | Version de ce profil candidat |
| `zkvm_backend` | `native-simulator`, `sp1`, `risc0`, `magnetar` | Identifiant enregistré, jamais URL ou chemin exécutable |
| `security_profile` | `simulation` ou `zk` | Garantie revendiquée ; couplage au backend épinglé |
| `elf_image_id` | `sim-sha256:` ou `sha256:` + 64 hex minuscules | Identifiant simulé de sources ou digest de l'artefact compilé enregistré |
| `public_inputs_hash` | 64 hex minuscules | Engagement de l'ensemble des entrées publiques |
| `public_inputs` | objet défini ci-dessous | Statement complet, disponible au vérifieur |
| `public_outputs` | `{allow:boolean, violations_mask:integer, critical_violations?:integer}` | Masque 0..63 ; détails critiques 1..16383 si refus critique |
| `proof_bytes` | base64 RFC 4648 canonique, avec padding | Preuve opaque propre au moteur ; dans le simulateur, witness en clair |
| `timestamp` | entier sûr non négatif, millisecondes Unix UTC | Égal à `public_inputs.issued_at_ms`, ce n'est pas une horloge certifiée |

`proof_bytes` est plafonné à 1 400 000 caractères base64 dans ce profil ; le
worker impose 2 MiB par message JSONL. Toute hausse exige une nouvelle revue
des limites mémoire et CPU. L'enveloppe ZK n'autorise aucune récupération de
preuve par URL fournie par l'agent.

`sha256:<digest>` identifie l'ELF enregistré, et n'est pas supposé égal à un
image ID RISC Zero ou à une vkey SP1. L'adaptateur MUST vérifier la receipt
avec l'identité native **épinglée dans son registre de confiance**, associée à
ce digest. L'identifiant simulé est le SHA-256 des sources du cœur, de l'adaptateur
guest et du bridge avec séparation de domaine ; ce n'est pas un ELF attesté.

### Entrées publiques

```text
public_inputs = {
  audience: token,
  context: {
    tenant_id: token,
    tool: "verifiable_gitlab_merge",
    project_id: u32_nonzero,
    merge_request_iid: u32_nonzero,
    head_sha: hex_lower_40_or_64
  },
  policy: { min_reviewers: u32_nonzero, critical?: CriticalPolicy },
  policy_hash: hex_lower_64,
  input_commitment: hex_lower_64,
  nonce: hex_lower_64,
  issued_at_ms: safe_uint,
  expires_at_ms: safe_uint
}
```

`token` : 1..128 caractères ASCII `[A-Za-z0-9._:/-]`. `u32` : 0..2^32−1.
`safe_uint` : 0..2^53−1. `head_sha` est une précondition de révision, pas une
affirmation de sécurité cryptographique SHA-1. Une gateway multi-instance
MUST ajouter au registre d'audience l'instance GitLab canonique et son routage ;
les identifiants numériques seuls ne sont pas globaux.

Le serveur choisit audience, tenant, politique, nonce et lifetime. Le caller ne
choisit que projet, MR et HEAD dans le POC. Le projet MUST être autorisé par
la configuration serveur. `expires_at_ms > issued_at_ms` et durée <= 60 000 ms.
La démo choisit 30 000 ms. Le vérifieur accepte au maximum 1 000 ms d'avance
de l'émission et refuse `now >= expires_at_ms`.

### Witness privé

```text
private_inputs = {
  facts: {
    sonar_quality_gate: ASCII_printable_string_max_64,
    jira_status: ASCII_printable_string_max_64,
    critical_vulnerabilities: u32,
    approvals: u32,
    critical?: CriticalFacts
  },
  salt: hex_lower_64
}
```

Le sel MUST provenir d'un CSPRNG de l'hôte, avec 32 octets indépendants par
engagement. Il masque le faible espace des faits dans un engagement publié.
Ni sel ni faits ne doivent être publiés dans un profil ZK. Le simulateur les
publie délibérément dans son reçu et MUST utiliser uniquement des fixtures.
Le prover voit le witness ; ZK ne protège pas les données de celui qui prouve.

## 3. Encodage canonique et relation à prouver

`C(x)` est le JSON UTF-8 sans espaces superflus, clés ASCII triées dans l'ordre
lexicographique, valeurs JSON strictes, chaînes Unicode bien formées et nombres
entiers sûrs seulement. Pas de flottants, `-0`, `NaN`, valeurs `undefined`,
tableaux creux ou prototypes personnalisés. Le schéma métier restreint les
chaînes publiques et privées à ASCII. Ce profil est volontairement plus étroit
que JSON général ; il ne revendique pas un support complet de RFC 8785.

`H_d(x) = SHA-256(UTF8(d) || 0x00 || C(x))`, encodé en hex minuscule.

```text
input_commitment = H_"zk-mcp/witness/v1"(private_inputs)
policy_hash      = H_"zk-mcp/policy/v1"(public_inputs.policy)
public_inputs_hash = H_"zk-mcp/public-inputs/v1"(public_inputs)

allow = (sonar_quality_gate == "OK")
     && (jira_status == "APPROVED")
     && (critical_vulnerabilities == 0)
     && (approvals >= min_reviewers)
     && (min_reviewers > 0)
```

Les comparaisons de statut sont exactes, sensibles à la casse ; aucun LLM
ne normalise une décision. Le masque cumule les bits `1` Sonar, `2` Jira,
`4` vulnérabilités, `8` approbations, `16` politique invalide, `32` profil
critique refusé. Une autorisation MUST avoir `allow=true`, `violations_mask=0`
et `critical_violations` absent.

`CriticalPolicy` et `CriticalFacts` sont définis exactement par le schéma JSON
et le [profil critique](05-CRITICAL-PLATFORM-POLICY.md). Ils MUST apparaître
ensemble. Les champs sont engagés avec tout le reste du witness et de la
politique. L'évaluateur critique reçoit le temps public et
`SHA-256(UTF8(context.head_sha))` ; il compare cette révision à
`approved_revision`, tableau de 32 octets privés. Les quatre conditions de
base restent nécessaires. Aucun champ critique n'est sélectionnable par
l'agent via les arguments de l'outil.

Pour un programme approuvé `P`, une preuve de production MUST établir :

```text
∃ w : H_witness(w) = p.input_commitment
  ∧ H_policy(p.policy) = p.policy_hash
  ∧ public_journal = (spec_version, backend, security_profile,
                      elf_image_id, H_public(p), P(w.facts, p.policy), timestamp)
  ∧ timestamp = p.issued_at_ms
```

Le programme invité MUST vérifier les engagements **dans l'exécution prouvée**
et publier ce journal. Le vérifieur MUST comparer le journal prouvé avec
l'enveloppe ; vérifier une preuve détachée de ce journal est insuffisant.
L'authenticité des faits est une obligation distincte, satisfaite par une source
attestée et une comparaison de l'engagement par le firewall de confiance.
Intégrer la signature d'origine dans le guest est une extension future possible.

Le POC natif et le guest du lab partagent la relation dans `policy-statement`.
Le guest RISC Zero vérifie les engagements et publie le journal complet ; il
vérifie aussi une signature Ed25519 sur le challenge, avec une autorité de
fixture épinglée dans l'image. Le binaire nu `policy-guest-riscv` reste un probe
de compilation distinct. Les sources réelles et l'intégration de production
des issues 01–02/07 restent nécessaires.

### Reçu de simulation

Le champ base64 contient `C({private_inputs, statement_hash})`, où
`statement_hash = H_"zk-mcp/statement/v1"(public_journal)` sous forme d'objet
nommé correspondant aux sept champs du journal ci-dessus. Le worker recalcule
le reçu entier et exige son égalité exacte. **Tout détenteur du witness peut
recréer ce reçu** ; ce hash n'est pas un mécanisme d'authentification ni une
preuve ZK. Le défaut du firewall est de refuser ce profil.

Un vecteur exact partagé, avec hashes produits indépendamment en Python, est
dans [`../tests/fixtures/policy-v1.json`](../tests/fixtures/policy-v1.json).

## 4. Machine d'états et ordre des opérations

```mermaid
sequenceDiagram
  participant A as Agent MCP
  participant G as Gateway / Firewall
  participant C as Collecteurs approuvés
  participant P as Prover
  participant R as Replay store
  participant L as GitLab
  A->>G: tools/call(project, MR, HEAD)
  G->>C: Lire états pour cette action
  C-->>G: Snapshot normalisé et attestation
  G->>G: Contrôler source, fraîcheur, politique ; créer nonce et commitment
  G->>P: Entrées publiques + witness privé
  P-->>G: Enveloppe + preuve / reçu simulé
  G->>G: Vérifier image, journal, preuve, décision et expiration
  G->>R: Consommer nonce atomiquement
  R-->>G: Réservation unique
  G->>G: Réserver l'opération métier indépendamment du nonce
  G->>C: Relire les préconditions
  G->>G: Vérifier source, engagement et échéances après les attentes
  G->>L: Merge avec sha attendu (simulé dans le POC)
  L-->>G: Résultat API
  G-->>A: CallToolResult + _meta.zkp
```

États : `COLLECTED → PROVED → VERIFIED → RESERVED → EXECUTED`.
Un échec mène à `DENIED` avant réservation, ou à `FAILED/UNKNOWN` après
réservation. Aucun chemin ne saute `VERIFIED`. Une réservation reste consommée
en cas d'erreur ou timeout API ; réconciliation de l'état avant toute nouvelle
tentative. Il n'existe pas de garantie d'exécution exactement une fois entre
un datastore et une API externe non transactionnelle.

Le vérifieur reçoit `expectedInputs` depuis un challenge conservé côté serveur,
jamais depuis le seul contenu du reçu. Il MUST comparer toutes les entrées,
recalculer leurs hashes, vérifier la preuve puis contrôler encore l'expiration.
La clé anti-rejeu dérive de `{audience, tenant_id, nonce}`. L'insertion MUST être
atomique et durable en production ; le `MemoryReplayStore` est limité à une
démo dans un processus. Un résultat sans preuve ou un moteur inconnu bloque.

La gateway réserve en plus une identité métier
`H_"zk-mcp/operation/v1"({audience,context})`, indépendante du nonce et de la
politique. Deux challenges ne peuvent ainsi réexécuter la même opération.
Le store de démonstration conserve `RESERVED`, `COMPLETED`, `UNKNOWN` ou
`REJECTED`. Un refus temporel après réservation conserve `REJECTED` ; aucun
retry automatique n'est autorisé. La démo borne le store à 10 000 opérations.
Le temps et les échéances critiques MUST être revérifiés **après** toute
attente de réservation, immédiatement avant le dispatch. Ce contrôle local
ne garantit pas l'heure de commit d'une API distante : une exigence de deadline
atomique nécessite le support de la cible. Durabilité et partage interinstances
de ces deux stores restent requis avant production.

L'ajout d'une preuve **après** l'appel GitLab ne constitue pas un contrôle
préventif. `guardedToolHandler` sépare donc une préparation en lecture d'une
fonction d'effet. Les échecs d'outil retournent `isError=true`, contenu lisible,
sans secrets. Une connexion MCP avec un client historique reste utilisable
car c'est la gateway qui impose la vérification.

## 5. Modèle de menace

| Adversaire / incident | Protection visée | Limite explicite |
|---|---|---|
| Hallucination du LLM | Le LLM ne fournit ni les faits ni le seuil ; preuve d'une politique déterministe | Une politique incomplète demeure incomplète |
| Injection de prompt dans Jira / résultat outil | Aucune instruction textuelle n'est exécutée ; normalisation stricte | Ne protège pas les actions hors du firewall |
| Orchestrateur compromis | Lier action, source engagée, image, audience et nonce ; credentials uniquement au firewall | Exige un firewall/verifier séparé et non compromis |
| Prover malveillant | Vérification d'une preuve réelle sur image épinglée | Le simulateur n'offre pas cette garantie cryptographique |
| Données amont mensongères | Provenance, signature d'un collecteur approuvé, fraîcheur, identité de révision | La signature atteste l'observation, pas la vérité du système source |
| Substitution de preuve/politique/ELF | Registre de confiance et comparaison du journal | Le registre et la chaîne de build restent des racines de confiance |
| Rejeu / concurrence | Nonce réservé atomiquement avant l'effet | Store mémoire perdu au redémarrage ; interdit en production |
| Changement entre check et merge | Relire les faits, précondition GitLab `sha` | Jira, Sonar et GitLab ne forment pas une transaction atomique |
| Déni de service | Bornes de taille, timeout worker, maximum 64 requêtes en vol | Le rate limiting et l'isolation des vrais provers restent à construire |

Un hash d'entrée ne prouve pas la provenance d'une API. Le POC utilise un HMAC
de collecteur local pour tester l'altération des snapshots ; ce n'est pas une
signature de Jira/GitLab/Sonar ni une attestation publiquement vérifiable.
Un déploiement de production MUST définir les clés, rotations, révocations,
identités des services et versions de normalisation.

## 6. Confidentialité, versionnement et compatibilité

Les champs publics exposent projet, MR, HEAD et décision. Le masque de refus
révèle des catégories de violations : cette fuite fait partie du profil.
Les logs MUST éviter witness, tokens et réponses brutes sensibles. Les durées
de conservation et droits d'accès de l'audit sont définis hors protocole.

La seule présence de SHA-256 ne justifie pas une étiquette « 100 % post-quantique ».
Une telle propriété exige l'analyse du backend, des paramètres, des signatures,
de la composition et de toute dépendance cryptographique.

Une version de profil ou backend inconnue MUST être rejetée, sans downgrade.
L'extension `_meta.zkp` est privée à ce prototype ; la standardisation demandera
revue publique, gouvernance, nommage et tests inter-implémentations. Le statut
de V1 du SDK MCP et sa migration V2 sont suivis par l'issue 04.
