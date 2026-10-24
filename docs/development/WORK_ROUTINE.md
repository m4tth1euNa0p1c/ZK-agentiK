# Local agent-led research and engineering routine

Updated 2026-10-24. Designed for a developer running Claude Code after `git pull`. No background agent and no automatic deployment.

## First setup

```sh
git pull --ff-only
npm ci --ignore-scripts
npm run agent:doctor
npm run agent:plan
claude
```

Claude Code loads CLAUDE.md and the project agents/skills in .claude. Prompt it with: **Run /research-cycle: pick the first ready P0 task, make a bounded implementation with adversarial tests, validate all affected paths, document the real results and stop before any push/merge.**

## Cycle
1. Inspect local git status, commit and docs/publication/CLAIMS.md. Never overwrite dirty user files.
2. Select one task in TASKS.json. State exact expected public statement, trust boundary, threat, owned paths and failure oracle.
3. Write a failing regression where possible. Implement in Rust/TS using existing vetted primitives.
4. Run the narrow test while developing and the mandatory final scope: `npm run agent:check:docs` (docs), `npm run agent:check:quick` (scripts/TS), `npm run agent:check:full` (cryptography, SDK/MCP and authorization/storage). The crypto-only profile is also available.
5. Send changed code to the read-only security reviewer / benchmark auditor. Reviews by agents are not third-party cryptographic audits.
6. Update documentation with only measured results, including failures and absent experiments. Preserve raw outputs and lockfile versions.
7. End with a diff summary, tests actually executed and exit codes, commit SHA, known blockers and next PR proposal; push/merge only when authorized.

## Validation
```sh
npm run agent:check:docs
npm run agent:check:quick
npm run agent:check:crypto
npm run agent:check:full
```

The routine invokes **fixed commands only**, stops on first failure and writes a local timestamped JSON report to ignored `.tools/agent-sessions/`. It does not run costly proof generation, rent GPUs, access clouds, or claim MATLAB validation. The 'test:risc0:gpu' command exercises the GPU runner tests, NOT an actual CUDA proof.

## Scientific review hierarchy
- Mathematical statement and assumptions: docs/horizon/FORMAL_STATEMENT.md and docs/whitepaper.
- Executed evidence: docs/experiments/circuit/RESULTS_2026-10-17.md and dated raw artifacts.
- Upstream watch (not inherited guarantees): UPSTREAM_REVIEW_2026-10-24.md.
- Publication claims: docs/publication/CLAIMS.md.
- Open business / security gates: issues/horizon/NEXT_EXPERIMENTS.md.

A successful CI status is evidence about executed tests on a specific commit, not an external audit, an authenticated timestamp, or a certificate of production safety.
