# Skills Library

This folder contains the core skill set shipped with the kit.

Read `INDEX.md` first during normal agent work. It is the compact routing table for choosing one narrow skill without scanning this whole folder.

## Workflow and principles

- `superpowers/`
- `andrej-karpathy-skills/`

## Portable agent integration

- `agent-api/`

## Frontend and React/Next.js

- `frontend-design/`
- `vercel-react-best-practices/`

## Core specialist skills

- `architecture-designer/`
- `api-designer/`
- `devops-engineer/`
- `monitoring-expert/`
- `secure-code-guardian/`
- `database-optimizer/`
- `sql-pro/`
- `legacy-modernizer/`

## Notes

- `agent-api/` stays scoped to multi-provider LLM and agent integration layers: provider adapters, request normalization, streaming, tool calling, structured outputs, retries, and provider switching.
- `frontend-design/` stays scoped to visual UI creation, redesign, layout, and styling. It should not override existing design systems or small bugfixes.
- `vercel-react-best-practices/` stays scoped to React/Next.js performance evidence. Read `SKILL.md` first, then only one targeted `rules/*.md` file when the task points to a specific performance category.
- `superpowers/` stays responsible for workflow, planning, debugging, verification, and execution discipline.
- `andrej-karpathy-skills/` stays responsible for coding principles and implementation style.
- The eight top-level specialist folders above are the default non-conflicting core skills for architecture, backend, security, data, operations, and modernization work.
- `agent-api/` is intentionally narrower than the other specialist folders so it does not replace architecture, security, database, DevOps, or migration skills.
- The top-level specialist skills were vendored from `Jeffallan/claude-skills`.
- `README.upstream.md` files preserve upstream overview or source attribution where needed; they are not normal task context.
