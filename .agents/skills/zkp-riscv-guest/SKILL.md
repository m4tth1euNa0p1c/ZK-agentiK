---
name: zkp-riscv-guest
description: Développer et optimiser le cœur Rust déterministe et les adaptateurs de guest RISC-V de ZK-agentiK, avec séparation du witness et du journal public.
---

# Guest RISC-V

Lire `AGENTS.md`, la relation à prouver dans `docs/02-ZK-MCP-RFC-SPEC.md`, puis
le profil concerné dans `crates/policy-engine-core`. L'ELF nu actuel est un test
de compilation, pas un programme exécutable sur tous les backends.

## Frontière de calcul

- Garder le cœur `#![no_std]`, sans heap, flottants, horloge, RNG, réseau,
  filesystem, ordre de hash-map ou dépendance à la largeur de `usize`.
- Utiliser des entiers explicites, opérations vérifiées et tailles bornées.
  Un état absent/indéterminé bloque. Ne pas convertir un scan absent en zéro.
- `private_inputs` contient les faits et le sel. `public_inputs` contient
  politique, action, temps d'évaluation, engagement et challenge du vérifieur.
- L'horloge de la plateforme n'entre pas dans le guest. L'instant est public
  et prouvé ; le firewall vérifie encore les échéances au moment d'agir.
- Dans un vrai guest, recalculer les engagements et publier le journal complet.
  Un hash effectué uniquement par l'hôte ne lie pas le witness à la preuve.

## Portage et optimisation

Ajouter un adaptateur par toolchain/ABI, avec versions épinglées et manifeste
ELF → image/vkey native. Ne pas inventer d'API Magnetar. La source métier reste
partagée ; syscalls, sérialisation d'entrée et journal diffèrent par backend.
Pour SHA-256/SHA-3/Keccak, utiliser une bibliothèque revue ; vérifier le padding
et les variantes exactes (Keccak n'est pas SHA3). Ne pas déclarer la chaîne
post-quantique parce que le guest emploie SHA-256.

Mesurer les cycles et la mémoire avant optimisation : nombre de hashes,
copies, tailles d'entrée, tables de lookup, gestion des erreurs. Garder la
preuve d'équivalence via vecteurs partagés et tests de limites. Éviter les
optimisations qui retirent un contrôle d'engagement ou de sortie.

## Validation attendue

`cargo test --workspace --locked`, `cargo clippy --workspace --all-targets -- -D warnings`,
`npm run build:guest`, puis un test prove/verify réel seulement pour un backend
effectivement implémenté. Tester la substitution du witness, du journal et de
l'image. Distinguer compilation, exécution native, exécution VM et preuve ZK
dans le compte rendu. Ne jamais habiliter le simulateur pour des effets réels.
