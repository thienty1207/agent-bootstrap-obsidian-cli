# Skills Routing Index

Read this index before loading a skill. Load one narrow skill entry only when the
task shape matches. Do not recursively scan `.codex/skills`.

## Priority

1. `superpowers`: always first for workflow-heavy work such as planning, TDD,
   debugging, implementation plans, code review, verification, or finishing work.
2. `karpathy-coding-principles`: second for coding/refactor/review mindset:
   simple design, explicit assumptions, surgical edits, and fresh verification.

Superpowers owns workflow. Karpathy does not replace Superpowers; it is a small
coding-principles overlay once the workflow path is chosen.

## Routing Table

| Task shape | Load |
| --- | --- |
| Planning, debugging, TDD, review, verification, branch finishing | `.codex/skills/superpowers/README.md` |
| Non-trivial coding, refactor, bugfix, review, or implementation judgment | `.codex/skills/karpathy-coding-principles/SKILL.md` |

## Load Budget

- Default: Superpowers route plus Karpathy overlay for implementation work.
- For frontend, backend, cloud, database, CI, or provider-specific work, use the
  nearest repo files, the relevant subagent when delegation helps, and current
  official docs when API details matter.
- If unsure, inspect the nearest repo files or write the uncertainty down instead of loading multiple skills.
- Supporting docs and upstream readmes are attribution/reference only; do not load them during startup.

## Hallucination Guard

- If a fact is not in repo files, context output, tests, or a cited source, mark it unknown.
- Prefer `agent-bootstrap context --why` before widening context.
- Use `agent-bootstrap context --full` only when daily/session history is required.
