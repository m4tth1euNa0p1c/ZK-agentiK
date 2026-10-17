# Expérience CUDA RISC Zero 3.0.6 — 17 octobre 2026

Ce laboratoire vérifie si **le même guest DevSecOps critique** que le banc CPU
historique produit une receipt `Succinct` avec la RTX 5060 Ti locale. Il ne
déclenche aucune action métier. Les résultats et blocages sont conservés dans
des répertoires datés `runs/` ; `run.json` indique l'état réel. Un GPU visible,
une compilation réussie ou un arrêt avant vérification ne sont pas une preuve.

**Résultat du 17 octobre : bloqué pendant la compilation CUDA sous 12 GiB,
avec quatre puis un job Cargo. Aucune receipt GPU produite.**
Voir le [rapport des deux tentatives](RESULTS_2026-10-17.md), avec les logs,
compteurs OOM et contrôles réellement exécutés.

## Reproduction

```bash
node --test labs/risc0/gpu/runner.test.mjs
node scripts/risc0-gpu-lab.mjs probe
node scripts/risc0-gpu-lab.mjs critical 1
# Reprendre le conteneur conservé dans run.json après diagnostic d'un blocage :
node scripts/risc0-gpu-lab.mjs critical 1 zk-agentik-risc0-gpu-<identifiant>
```

Les scénarios sont `base`, `critical` et `denied`, avec 1 à 3 mesures de
génération. Le mode développement est refusé avant tout appel Docker et dans
les exécutables. Chaque invocation conserve ses propres fichiers ; elle
n'écrase ni les receipts CPU ni le conteneur CPU historique.

Le runner construit une image utilisateur CUDA, démarre un nouveau conteneur
limité à **8 CPU, 12 GiB de RAM, 512 processus, une tâche Cargo**, avec
capabilities supprimées et `no-new-privileges`. Le dépôt est monté en lecture
seule puis copié dans le conteneur pour compiler. Le GPU reste partagé avec le
bureau : aucune exclusivité ou limite de VRAM matérielle n'est garantie.
L'installation utilise le réseau ; celui-ci est retiré avant les essais et
la génération. Le conteneur est arrêté et conservé en fin de tentative.

Le contrôle indépendant est un nouveau conteneur sans GPU ni réseau, avec un
seul montage public en lecture seule : vérifieur, receipt et entrées attendues.
Son image contient CUDA/Rust pour assurer la compatibilité glibc, mais ne
contient ni le prover compilé, ni le witness, ni le dépôt. Les variables
`NVIDIA_VISIBLE_DEVICES=void` et `CUDA_VISIBLE_DEVICES=-1` masquent les GPU.

## Compatibilité et références primaires

- NVIDIA indique CUDA **12.8** comme première prise en charge de Blackwell,
  capacités 10.0 et 12.0. Le numéro CUDA affiché par `nvidia-smi` est la capacité
  maximale du pilote ; ce n'est pas la version d'un toolkit installé.
  [Matrice NVIDIA](https://docs.nvidia.com/datacenter/tesla/drivers/cuda-toolkit-driver-and-architecture-matrix.html).
- Les notes CUDA 12.8 documentent le runtime Linux/Windows/WSL et les prérequis
  de pilote. L'expérience utilise CUDA **12.8.1** avec compilation explicite
  `NVCC_APPEND_FLAGS=-arch=sm_120`, sur pilote Windows **595.95**, sans installer
  de pilote hôte ni modifier Docker global.
  [Notes CUDA 12.8](https://docs.nvidia.com/cuda/archive/12.8.0/cuda-toolkit-release-notes/).
- RISC Zero exige le runtime CUDA pour exécuter et le toolkit pour compiler
  les kernels ; le premier JIT peut prendre du temps. La génération locale
  garde le witness chez l'opérateur du prover, qui peut le lire.
  [Proving local, documentation 3.0](https://dev.risczero.com/api/generating-proofs/local-proving).
- La feature `cuda` de `risc0-r0vm` active celle de `risc0-zkvm`. La sélection
  des segments est une branche de compilation CUDA, sans repli CPU dans cette
  fonction ; le protocole comporte en plus un essai GPU masqué.
  [Manifeste v3.0.6](https://github.com/risc0/risc0/blob/v3.0.6/risc0/r0vm/Cargo.toml),
  [sélection du prover v3.0.6](https://github.com/risc0/risc0/blob/v3.0.6/risc0/circuit/rv32im/src/prove/mod.rs),
  [construction CUDA v3.0.6](https://github.com/risc0/risc0/blob/v3.0.6/risc0/circuit/rv32im-sys/build.rs).

Le ticket amont [#3785](https://github.com/risc0/risc0/issues/3785) rapporte un
problème CUDA de wrapping **Groth16** dans 3.0.5/3.0.6. C'est un signalement,
pas un audit ; cette expérience demande uniquement `Succinct` et ne teste
aucun wrapping Groth16. Il ne permet donc ni d'affirmer l'échec de ce banc ni
de garantir l'absence d'autres défauts.

## Épinglage et provenance

| Élément | Version ou identité |
| --- | --- |
| RISC Zero source | `1cc70cf05033a79ebc90f07c679cb4bd1cd301b9` (`v3.0.6`) |
| Features du prover externe | `cuda,disable-dev-mode` |
| CUDA base Linux amd64 | `nvidia/cuda@sha256:4b9ed5fa8361736996499f64ecebf25d4ec37ff56e4d11323ccde10aa36e0c43` |
| Rust source image | `rust@sha256:82150a52ec202c1b14d7817e14516c392bb7f5cfebd88f1ed531cb37ebd39922` |
| Rust hôte / guest | `1.98.0` / RISC Zero `1.97.0` |
| Type demandé | `Succinct`, `poseidon2`, segment `po2=20` |
| ELF attendu | `sha256:53cbbc340bc8ab586353893f22d64daf5ffa756a41c798a55db203ca3ee9d29e` |

Les dépendances Cargo restent verrouillées. Les paquets Ubuntu nécessaires
au build sont résolus lors de la construction, puis inventoriés par
`dpkg-query` ; ils ne sont pas individuellement épinglés à un snapshot APT.
L'identifiant de l'image finale, les empreintes des sources copiées, lockfiles
et exécutables, les versions, commandes, codes de retour et durées sont
conservés. Cela permet d'auditer cette exécution, sans promettre un build
bit-à-bit reproductible sur un autre hôte.

## Mesures et critères de réussite

La réussite exige une receipt réelle, un guest identique au CPU historique,
les refus du dev-mode et du GPU masqué, puis la vérification CPU indépendante.
Les mesures de génération sont celles du host inchangé : elles incluent
l'appel local `r0vm` et ses vérifications, excluent build et démarrage Docker.
Aucune chauffe n'est écartée. Les durées de commande sont distinctes.

Le rapport brut hérité du host contient un libellé `real CPU proof` et un
`p95_ms` de génération sur petit N. **Ces champs hérités ne qualifient pas
cette expérience CUDA.** Les métadonnées du nouveau `run.json` explicitent
l'accélérateur et les valeurs dans l'ordre, minimum, maximum et moyenne ;
ses `p95_ms` et `p99_ms` sont `null`. Le rapport brut est conservé tel quel.
La vérification répétée du même receipt à chaud ne mesure ni un service ni
la concurrence. Aucun SLA, record, ratio GPU/CPU contrôlé ou garantie de
confidentialité critique ne découle de ce banc exploratoire.

Le schéma `Succinct` utilise la pile STARK de RISC Zero, mais l'attestation du
guest utilise **Ed25519** et une clé de fixture publique. Le système complet
n'est donc **pas post-quantique** et n'authentifie aucun fournisseur réel.
La sélection de CUDA ne change ni cette limite ni le modèle de confiance.
Le [NIST décrit la migration des primitives à courbes elliptiques vulnérables](https://pages.nist.gov/nccoe-migration-post-quantum-cryptography/)
vers des signatures et établissements de clés post-quantiques ; le présent
profil n'effectue pas cette migration.
