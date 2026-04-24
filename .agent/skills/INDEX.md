# Skills Routing Index

Read this file before loading any skill. Load the narrowest matching `SKILL.md`; do not recursively scan this folder.

Workflow skills have priority over domain skills. When implementation, debugging, planning, review, or verification rules apply, load `superpowers` workflow guidance and `andrej-karpathy-skills/karpathy-guidelines` before the narrower domain skill.

| Skill | Use when | Avoid when | Load |
| --- | --- | --- | --- |
| `agent-api` | Model-provider adapters, request normalization, streaming, tool calls, structured outputs, retries, usage tracking, provider switching. | General API design, security-only, database-only, infra-only, or workflow-only tasks. | `.agent/skills/agent-api/SKILL.md` |
| `andrej-karpathy-skills/karpathy-guidelines` | Writing, reviewing, or refactoring code where simplicity, surgical edits, and verification matter. | Pure docs inventory or no-code questions. | `.agent/skills/andrej-karpathy-skills/karpathy-guidelines/SKILL.md` |
| `superpowers` | Workflow discipline: planning, debugging, TDD, verification, code review, branch finishing. | Domain implementation details already covered by a narrower skill. | `.agent/skills/superpowers/README.md` |
| `architecture-designer` | System design, architecture review, ADRs, scalability tradeoffs, component boundaries. | Code-level bugfixes or database-only design. | `.agent/skills/architecture-designer/SKILL.md` |
| `api-designer` | REST or GraphQL API design, OpenAPI specs, resource modeling, pagination, versioning, error contracts. | Internal provider integration or non-public app logic. | `.agent/skills/api-designer/SKILL.md` |
| `devops-engineer` | CI/CD, Docker, Kubernetes, Terraform, GitHub Actions, deployment automation, incident runbooks. | App logic, UI behavior, or database query tuning. | `.agent/skills/devops-engineer/SKILL.md` |
| `monitoring-expert` | Observability, logs, metrics, tracing, dashboards, alerts, profiling, load tests, capacity planning. | General deployment or feature implementation. | `.agent/skills/monitoring-expert/SKILL.md` |
| `secure-code-guardian` | Auth, authorization, input validation, encryption, OWASP prevention, security headers, session hardening. | General code review without security-sensitive behavior. | `.agent/skills/secure-code-guardian/SKILL.md` |
| `database-optimizer` | Slow queries, execution plans, indexes, lock contention, PostgreSQL/MySQL performance. | General schema design without performance evidence. | `.agent/skills/database-optimizer/SKILL.md` |
| `sql-pro` | SQL writing, complex joins, CTEs, window functions, schema/query migration, dialect differences. | Non-SQL persistence or infra tuning. | `.agent/skills/sql-pro/SKILL.md` |
| `legacy-modernizer` | Incremental modernization, strangler fig, branch by abstraction, monolith decomposition, technical debt roadmaps. | Small isolated refactors. | `.agent/skills/legacy-modernizer/SKILL.md` |

Upstream attribution readmes are source attribution only. Do not load them during normal task execution.
