# 03 — Comparer les preuves réelles et la baseline signée

Jalon : M1. Priorité : P1. Dépendances : 01–02.

## Avancement du 15 octobre 2026

Premier runner réel livré : `npm run lab:risc0 -- critical 3` et `denied 1`.
Quatre preuves CPU `Succinct`, mesures et fixtures publiques conservées dans
[le rapport](../docs/08-RISC0-LAB-RESULTS.md). Vérification reproductible sans
génération : `npm run lab:risc0 -- verify`.
Rejet cryptographique p95 6,95 ms et génération 154–163 s : objectifs initiaux
de 5 ms et de challenge 30 s non atteints. Comparaisons CUDA/autre backend,
verdict signé DSSE, pics mémoire isolés, charge et qualification client restent
à effectuer. Cette issue n'est pas terminée.

## User story

Comme acheteur technique, je peux décider si ZK apporte une propriété utile au
coût et au délai acceptables de mon processus de promotion.

## Architecture technique

Même corpus pour politique native + verdict DSSE, divulgation sélective BBS
si adaptée, et vrai backend ZK. Conserver paramètres cryptographiques, matériels,
versions, warm/cold, preprocessing, cycles, RAM, confidentialité et réseau.
Séparer preuve, vérification, rejets et mutation. Comparer une intégration
Colofon/PreFlight si accessible, sans assimiler annonces et mesures.

## Critères d'acceptation

- Résultats JSON/CSV reproductibles, p50/p95/max, tailles et coût d'exploitation.
- Aucun nombre de simulation présenté comme benchmark ZK.
- Au moins une exigence du client satisfaite par ZK et pas la baseline retenue.
- Budget de latence convenu avec le pilote ; pas de 5 ms universel inventé.

## Commandes de test

`npm run benchmark`, `npm run benchmark -- --enforce-5ms` pour le simulateur.
Ajouter un runner séparé pour backends réels, une reproduction documentée et
un rapport excluant explicitement les backends non exécutés.
