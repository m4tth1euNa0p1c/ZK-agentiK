# Claude Code instructions — ZK-agentic

This repository is a public **experimental research laboratory**, not a certified banking product.

## Start every session
1. Read AGENTS.md, docs/publication/CLAIMS.md, docs/development/WORK_ROUTINE.md and docs/development/TASKS.json. Preserve unrelated dirty files.
2. Run `npm run agent:doctor` and `npm run agent:plan`. Record HEAD, git status and baseline checks.
3. Select exactly ONE ready task, list owned files, assumptions, attack hypotheses, acceptance criteria and tests before changing code.
4. Use the project subagents in .claude/agents for separate independent reviews. Do not let multiple agents edit the same file concurrently.
5. Create an adversarial failing test where possible, then implement the minimal patch, preserving canonical encodings and explicit versioning.
6. Verify before finishing: `npm run agent:check:docs` for documentation, `agent:check:quick` for tools/scripts, `agent:check:full` for proof, policy, SDK/MCP or storage. Reports go into ignored .tools/agent-sessions.
7. Report actual commands and exit codes, evidence, changed files, unresolved risks and next task; document failed tests too.

## Trust boundary
- The verifier, not the prover/agent, selects image ID, matrix layout, public statement, trusted keys, policy epoch, domain, revocation state and target operation.
- Reject unknown proof formats and downgrades, expired claims, replayed operations and ambiguous remote effects. Assertions of zero unauthorized effects need tests that COUNT target mutations.
- A proof of an integer inequality cannot prove the facts were true, authorized or fresh. Historic RISC Zero proof, MATLAB/Octave oracle, Bulletproofs and signatures are distinct.
- Horizon Bulletproofs/Ristretto/Ed25519 is **not post-quantum**; never call it PQ, anonymous, bank-certified or faster than Vega at equivalent workload without new evidence.
- Never silently push/merge, change visibility, update crypto dependencies, spend cloud resources, publish npm or run expensive CUDA/MATLAB/RISC proving.
- Existing tests and documented CPU/GPU negative results must remain intact. No fabricated formal proofs or benchmark records.

## Claude entrypoints
- `/research-cycle`: bounded implementation, tests and independent review.
- `/crypto-review`: adversarial verifier and transcript review.
- `npm run agent:plan`: readonly roadmap.
- `npm run agent:check:full`: fixed checks, **GPU runner unit tests only**, not GPU proving.

Follow AGENTS.md for Rust/no_std, TS, deterministic policy, data handling and commit conventions. Main stays untouched without explicit approval.
