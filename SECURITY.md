# Sécurité et signalement

ZK-agentiK est un laboratoire expérimental. Aucune version n'est actuellement
déclarée qualifiée pour autoriser des paiements, protéger une plateforme
critique ou satisfaire à elle seule un régime réglementaire. Les résultats
connus et hypothèses sont décrits dans
[le modèle de menace](docs/horizon/THREAT_MODEL.md),
[la revue interne](docs/horizon/SECURITY_REVIEW.md) et
[les assertions de publication](docs/publication/CLAIMS.md).

## Signalement privé

Si l'onglet Security du dépôt propose **Report a vulnerability**, utiliser le
signalement privé GitHub. Cette fonctionnalité doit être activée par le
mainteneur ; ce document ne prétend pas qu'elle l'est. Si elle est absente,
utiliser un canal privé déjà établi avec le mainteneur. À défaut, une issue
publique peut demander un canal privé **sans détail exploitable ni donnée
sensible**. Aucun délai contractuel, programme de prime ou adresse de contact
non vérifiée n'est promis.

Fournir version/commit, configuration, préconditions, impact, reproduction
minimale et comportement attendu. Utiliser des fixtures synthétiques ; ne pas
joindre de secrets, données client, witness réel ou token. Ne pas tester un
système tiers ou un service déployé sans son autorisation.

## Périmètre de revue prioritaire

- Vérification avant effet, liaison complète du contexte, politique imposée par
  le contrôleur, absence de sélection de clé/backend par l'appelant.
- Encodages, parsing, engagements, signatures, générateurs et transcript.
- Rejeu et concurrence sur nonce **et** opération métier ; révocation et
  échéances après attente ; reprise et état `UNKNOWN`.
- Autorités de source, vérité des faits, transfert des ouvertures et clés.
- Isolation des tenants, fuite de métadonnées/logs et dépendances verrouillées.

Le mode simulateur divulgue son witness et n'est pas une preuve ZK. Le profil
Horizon utilise des hypothèses classiques, sans garantie post-quantique.
La transaction SQLite locale ne démontre pas une mutation distante exactement
une fois. Une revue d'agents ne remplace pas un audit cryptographique externe.

Le mainteneur doit vérifier le canal privé et ses destinataires avant une
publication publique ; ne pas ajouter de détails sensibles dans les issues
pour compenser l'absence de canal.
