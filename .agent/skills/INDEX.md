# Skills Routing Index

Read this file before loading any skill. Load the narrowest matching `SKILL.md`; do not recursively scan this folder.

Workflow skills have priority over domain skills. When implementation, debugging, planning, review, or verification rules apply, load `superpowers` workflow guidance and `andrej-karpathy-skills/karpathy-guidelines` before the narrower domain skill.

Domain skills do not override Superpowers or Karpathy. Treat domain skills as subject-matter references; keep workflow discipline, test-first behavior, verification, and surgical-edit rules from the workflow layer.

Auto-trigger means "read the index, match the task shape, then load the one narrow skill body." It does not mean scanning every skill, reading upstream guides, or opening supporting rule files before there is evidence.

## Decision Matrix

Use this matrix before opening a skill body. Prefer one primary domain skill unless the task explicitly crosses boundaries.
Quick conflict set: agent-api vs api-designer vs architecture-designer vs secure-code-guardian covers most backend/API/security confusion.
Frontend conflict set: frontend-design vs vercel-react-best-practices covers most UI/design/performance confusion.

| Task shape | Primary skill | Do not confuse with |
| --- | --- | --- |
| Provider/model/agent backend, streaming, tool calls, structured output, provider adapters | `agent-api` | `api-designer` for public REST/GraphQL contracts |
| Public REST/GraphQL/OpenAPI contract, resource modeling, pagination, versioning, error catalog | `api-designer` | `agent-api` for model-provider integration |
| UI creation, redesign, visual polish, layout, landing pages, dashboards, component styling | `frontend-design` | `vercel-react-best-practices` for React/Next.js performance |
| React/Next.js performance, hydration, RSC, bundle, rerender, waterfall, client/server data path | `vercel-react-best-practices` | `frontend-design` for visual design and aesthetics |
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
- Do not auto-load both frontend domain skills. Load both only when the task explicitly needs visual design plus React/Next.js performance work, and apply them sequentially to the touched code.
- Load only the targeted Vercel rule file when evidence points to a specific React/Next.js performance category.
- If unsure between two domain skills, write the uncertainty to `Open Questions.md` or inspect the nearest repo files before loading both.

| Skill | Use when | Avoid when | Load |
| --- | --- | --- | --- |
| `agent-api` | Model-provider adapters, request normalization, streaming, tool calls, structured outputs, retries, usage tracking, provider switching. | General API design, security-only, database-only, infra-only, or workflow-only tasks. | `.agent/skills/agent-api/SKILL.md` |
| `andrej-karpathy-skills/karpathy-guidelines` | Writing, reviewing, or refactoring code where simplicity, surgical edits, and verification matter. | Pure docs inventory or no-code questions. | `.agent/skills/andrej-karpathy-skills/karpathy-guidelines/SKILL.md` |
| `superpowers` | Workflow discipline: planning, debugging, TDD, verification, code review, branch finishing. | Domain implementation details already covered by a narrower skill. | `.agent/skills/superpowers/README.md` |
| `frontend-design` | UI creation, redesign, visual polish, layout, dashboard styling, landing pages, browser-facing component aesthetics. | Bugfix-only tasks, backend/API work, existing design systems without redesign request, performance-first React/Next.js work. | `.agent/skills/frontend-design/SKILL.md` |
| `vercel-react-best-practices` | React/Next.js performance, hydration, RSC, bundle, rerender, data fetching, route handlers, server actions, rendering costs. | Non-React work, visual-only UI design, broad audits without evidence, micro-optimization before inspecting code. | `.agent/skills/vercel-react-best-practices/SKILL.md`, then one matching `rules/*.md` only if needed |
| `architecture-designer` | System design, architecture review, ADRs, scalability tradeoffs, component boundaries. | Code-level bugfixes or database-only design. | `.agent/skills/architecture-designer/SKILL.md` |
| `api-designer` | REST or GraphQL API design, OpenAPI specs, resource modeling, pagination, versioning, error contracts. | Internal provider integration or non-public app logic. | `.agent/skills/api-designer/SKILL.md` |
| `devops-engineer` | CI/CD, Docker, Kubernetes, Terraform, GitHub Actions, deployment automation, incident runbooks. | App logic, UI behavior, or database query tuning. | `.agent/skills/devops-engineer/SKILL.md` |
| `monitoring-expert` | Observability, logs, metrics, tracing, dashboards, alerts, profiling, load tests, capacity planning. | General deployment or feature implementation. | `.agent/skills/monitoring-expert/SKILL.md` |
| `secure-code-guardian` | Auth, authorization, input validation, encryption, OWASP prevention, security headers, session hardening. | General code review without security-sensitive behavior. | `.agent/skills/secure-code-guardian/SKILL.md` |
| `database-optimizer` | Slow queries, execution plans, indexes, lock contention, PostgreSQL/MySQL performance. | General schema design without performance evidence. | `.agent/skills/database-optimizer/SKILL.md` |
| `sql-pro` | SQL writing, complex joins, CTEs, window functions, schema/query migration, dialect differences. | Non-SQL persistence or infra tuning. | `.agent/skills/sql-pro/SKILL.md` |
| `legacy-modernizer` | Incremental modernization, strangler fig, branch by abstraction, monolith decomposition, technical debt roadmaps. | Small isolated refactors. | `.agent/skills/legacy-modernizer/SKILL.md` |

## Long Session Guardrails

- Re-run `agent-bootstrap context --compact` at the start of a new session, not every time uncertainty appears.
- Use `agent-bootstrap context --why` before expanding context.
- Use `agent-bootstrap context --full` only when daily/session history is needed.
- If a fact is not in repo files, context output, or a cited source, write it as unknown instead of guessing.
- Supporting docs, upstream guides, and rule folders are lazy-loaded assets; they are not startup context.

Upstream attribution readmes and full upstream guides are source attribution only. Do not load them during normal task execution.
