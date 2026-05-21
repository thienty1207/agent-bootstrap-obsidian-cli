# Skills Routing Index

Read this index before loading a skill. Load one narrow skill entry only when the
task shape matches. Do not recursively scan `.codex/skills`.

## Bundled Workflow Skill

`superpowers` is the only bundled workflow skill. It owns planning, TDD,
debugging, implementation plans, code review flow, verification, and finishing
work.

| Task shape | Load |
| --- | --- |
| Planning, debugging, TDD, review flow, verification, branch finishing, or implementation workflow | `.codex/skills/superpowers/README.md` |

## Bundled Optional Domain Skills

These skills ship with the kit and are lazy-loaded only when the task matches.
They do not replace Superpowers or the 3 core subagents.

| Task shape | Load |
| --- | --- |
| Frontend UI, pages, components, layouts, dashboards, browser-facing product flows, responsive behavior, accessibility, interaction states, or visual polish | `.codex/skills/frontend-design/SKILL.md` |
| Defensive security review touching auth, API, server action, secrets, `.env`, Supabase, RLS, storage, upload, payment, subscription, quota, dependency, CORS, JWT, rate limit, access control, tenant, admin, user permissions, or security review | `.codex/skills/vibe-security-scan/SKILL.md` |

<!-- agent-bootstrap:custom-skills:start -->
## Custom Skills

No custom project skills are registered yet.

When adding one, create `.codex/skills/<skill-name>/SKILL.md` and replace this line with a precise routing table entry.
<!-- agent-bootstrap:custom-skills:end -->

## Load Budget

- Load Superpowers first for workflow-heavy work.
- Load a bundled optional domain skill only when the routing row above matches the task.
- Load a custom skill only when it is installed locally and the custom routing row matches the task.
- For backend, cloud, database, CI, provider, or framework work without a matching skill, use nearest repo files, the 3 core quality subagents when delegation helps, registered custom agents when installed, and current official docs when API details matter.
- Supporting docs and upstream readmes are attribution/reference only; do not load them during startup.

## Hallucination Guard

- If a fact is not in repo files, context output, tests, or a cited source, mark it unknown.
- Prefer `agent-bootstrap context --why` before widening context.
- Use `agent-bootstrap context --full` only when daily/session history is required.
