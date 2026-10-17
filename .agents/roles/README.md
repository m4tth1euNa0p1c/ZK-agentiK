# Contrats de rôles portables

Ces fichiers sont des instructions Markdown à charger explicitement dans le
client utilisé. Leur présence ne crée pas de sous-agent et ne garantit aucune
autodécouverte par Claude Code, Cursor ou un autre client. Les skills adjacents
peuvent être chargés selon le mécanisme documenté du client.

| Rôle | Écriture autorisée | Produit attendu |
| --- | --- | --- |
| [Auteur scientifique](scientific-author.md) | Manuscrit et assertions assignés | Résultats sourcés, hypothèses, limitations |
| [Contradicteur](claim-challenger.md) | Lecture seule | Réfutation reproductible ou objection bornée |
| [Revue cloud](cloud-boundary-reviewer.md) | Lecture seule | Frontières absentes, plans de panne, prérequis |
| [Revue publication](release-reviewer.md) | Lecture seule | Verdict sur un commit candidat exact |

L'orchestrateur assigne les chemins possédés, transmet le commit de départ et
interdit de révoquer les changements des autres. Une revue se conclut par des
faits, des limites et un verdict conditionné ; le nombre d'agents favorables
n'est pas une preuve. Ne pas inventer un second avis quand aucun autre agent
n'a été exécuté. Aucun rôle n'autorise un contact externe ou un déploiement.
