# Skills Routing Index

Read this index before loading a skill. Load one narrow skill entry only when the
task shape matches. Do not recursively scan `.codex/skills`.

## Bundled Skill

`superpowers` is the only bundled skill. It owns workflow discipline for planning,
TDD, debugging, implementation plans, code review, verification, and finishing
work.

| Task shape | Load |
| --- | --- |
| Planning, debugging, TDD, review, verification, branch finishing, or implementation workflow | `.codex/skills/superpowers/README.md` |

<!-- agent-bootstrap:custom-skills:start -->
## Custom Skills

No custom project skills are registered yet.

When adding one, create `.codex/skills/<skill-name>/SKILL.md` and replace this line with a precise routing table entry.
<!-- agent-bootstrap:custom-skills:end -->

## Load Budget

- Load Superpowers first for workflow-heavy work.
- Load a custom skill only when it is installed locally and the routing row above matches the task.
- For frontend, backend, cloud, database, CI, provider, or framework work without a matching custom skill, use nearest repo files, the 3 core quality subagents when delegation helps, registered custom agents when installed, and current official docs when API details matter.
- Supporting docs and upstream readmes are attribution/reference only; do not load them during startup.

## Hallucination Guard

- If a fact is not in repo files, context output, tests, or a cited source, mark it unknown.
- Prefer `agent-bootstrap context --why` before widening context.
- Use `agent-bootstrap context --full` only when daily/session history is required.
