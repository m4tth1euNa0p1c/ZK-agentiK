---
name: research-cycle
description: Resume ZK-agentic after pulling locally; pick a bounded research/implementation task, validate it, then report.
---
Run npm run agent:plan. Read CLAUDE.md, AGENTS.md and docs/development/TASKS.json. Choose ONE ready P0 task and inspect real code, not just reports. Record HEAD, dirty state, files owned, acceptance and attack hypotheses. Implement minimally with negative tests; use security reviewer on safety-critical changes. Execute appropriate npm run agent:check:* profile. Document observations and unknowns, preserve negative results. End with work summary, test results, diff, next task and a proposed PR. Never silently push, merge, deploy, pay for cloud resources or claim a scientific record.
