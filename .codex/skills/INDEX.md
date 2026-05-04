# Skills Routing Index

Read this index before loading a skill. Load one narrow `SKILL.md` only when the
task shape matches. Do not recursively scan `.codex/skills`.

## Priority

1. `superpowers`: always first for workflow-heavy work such as planning, TDD,
   debugging, implementation plans, code review, verification, or finishing work.
2. `karpathy-coding-principles`: second for coding/refactor/review mindset:
   simple design, explicit assumptions, surgical edits, and fresh verification.
3. `frontend-design`: third for UI creation, redesign, layout, component styling,
   responsive behavior, visual polish, and browser-facing product surfaces.
4. `agent-api`: fourth for AI/model/provider backend work: streaming, tool calls,
   structured output, retries, provider switching, and usage tracking.

Superpowers owns workflow. Karpathy does not replace Superpowers; it is a small
coding-principles overlay once the workflow path is chosen.

## Routing Table

| Task shape | Load |
| --- | --- |
| Planning, debugging, TDD, review, verification, branch finishing | `.codex/skills/superpowers/README.md` |
| Non-trivial coding, refactor, bugfix, review, or implementation judgment | `.codex/skills/karpathy-coding-principles/SKILL.md` |
| UI/UX design, frontend layout, component styling, dashboard/product surface polish | `.codex/skills/frontend-design/SKILL.md` |
| Agent backend, provider adapters, streaming, tool calling, structured output | `.codex/skills/agent-api/SKILL.md` |

## Load Budget

- Default: Superpowers route plus Karpathy overlay for implementation work.
- Add one domain skill only when the task clearly needs frontend or agent/backend knowledge.
- If unsure, inspect the nearest repo files or write the uncertainty down instead of loading multiple skills.
- Supporting docs and upstream readmes are attribution/reference only; do not load them during startup.

## Hallucination Guard

- If a fact is not in repo files, context output, tests, or a cited source, mark it unknown.
- Prefer `agent-bootstrap context --why` before widening context.
- Use `agent-bootstrap context --full` only when daily/session history is required.
