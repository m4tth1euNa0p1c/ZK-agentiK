# Portable role contracts

These files are Markdown instructions to load explicitly in the client
in use. Their presence does not create a subagent and does not guarantee any
autodiscovery by Claude Code, Cursor or another client. The adjacent skills
can be loaded according to the client's documented mechanism.

| Role | Write access | Expected product |
| --- | --- | --- |
| [Scientific author](scientific-author.md) | Assigned manuscript and claims | Sourced results, assumptions, limitations |
| [Challenger](claim-challenger.md) | Read-only | Reproducible refutation or bounded objection |
| [Cloud review](cloud-boundary-reviewer.md) | Read-only | Missing boundaries, failure plans, prerequisites |
| [Publication review](release-reviewer.md) | Read-only | Verdict on an exact candidate commit |

The orchestrator assigns the owned paths, passes on the starting commit and
forbids reverting other agents' changes. A review concludes with
facts, limits and a conditional verdict; the number of favorable agents
is not a proof. Do not invent a second opinion when no other agent
was executed. No role authorizes external contact or a deployment.
