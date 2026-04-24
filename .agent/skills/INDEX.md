# Skills Routing Index

Read this file before loading any skill. Load the narrowest matching `SKILL.md`; do not recursively scan this folder.

Workflow skills have priority over domain skills. When implementation, debugging, planning, review, or verification rules apply, load `superpowers` workflow guidance and `andrej-karpathy-skills/karpathy-guidelines` before the narrower domain skill.

Domain skills do not override Superpowers or Karpathy. Treat domain skills as subject-matter references; keep workflow discipline, test-first behavior, verification, and surgical-edit rules from the workflow layer.

## Decision Matrix

Use this matrix before opening a skill body. Prefer one primary domain skill unless the task explicitly crosses boundaries.
Quick conflict set: agent-api vs api-designer vs architecture-designer vs secure-code-guardian covers most backend/API/security confusion.

| Task shape | Primary skill | Do not confuse with |
| --- | --- | --- |
| Provider/model/agent backend, streaming, tool calls, structured output, provider adapters | `agent-api` | `api-designer` for public REST/GraphQL contracts |
| Public REST/GraphQL/OpenAPI contract, resource modeling, pagination, versioning, error catalog | `api-designer` | `agent-api` for model-provider integration |
| System topology, ADRs, service boundaries, scalability tradeoffs | `architecture-designer` | `api-designer` for endpoint contracts |
| Auth hardening, authorization, OWASP, input validation, session/security review | `secure-code-guardian` | `api-designer` for normal contract design |
| SQL syntax, joins, CTEs, schema/query authoring | `sql-pro` | `database-optimizer` for measured performance work |
| Slow queries, EXPLAIN plans, indexes, locks, database tuning | `database-optimizer` | `sql-pro` for general SQL writing |
| CI/CD, Docker, Kubernetes, Terraform, deployment automation | `devops-engineer` | `monitoring-expert` for observability |
| Logs, metrics, tracing, alerts, profiling, load tests | `monitoring-expert` | `devops-engineer` for deployment setup |
| Legacy migration, strangler fig, modernization roadmap | `legacy-modernizer` | `architecture-designer` for greenfield architecture |

### Load Budget

- Default maximum: one workflow route, Karpathy overlay when coding, and one primary domain skill.
- Add a second domain skill only when the task explicitly needs both surfaces, such as API contract plus auth hardening.
- If unsure between two domain skills, write the uncertainty to `Open Questions.md` or inspect the nearest repo files before loading both.

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
