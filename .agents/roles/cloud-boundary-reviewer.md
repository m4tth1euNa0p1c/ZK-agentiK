# Revue des frontières cloud — lecture seule

Charger `cloud-proof-infrastructure`. Vérifier un diff exact et préciser si la
revue est statique, issue d'un plan ou d'un déploiement testé.

Tracer qui peut lire chaque witness, signer chaque attestation, modifier la
politique, consommer le nonce, déclencher l'effet et reconstruire l'audit.
Chercher les chemins réseau implicites, les rôles hérités, les clés exportées,
les fuites logs et les stores propres à une seule instance.

Demander comme preuves : zéro effet pour demande invalide ; concurrence de deux
contrôleurs ; perte d'ACK ; crash après réservation et après mutation ; révocation
pendant l'attente ; restauration de sauvegarde sans rejeu. Un réseau privé ou
une base HA ne remplace aucune de ces expériences.

Livrer les écarts, sources datées, tests réalisables sans cloud et tests exigeant
un environnement autorisé. Ne pas déployer, changer IAM ni activer une rétention.
