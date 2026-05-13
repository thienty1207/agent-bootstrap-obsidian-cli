# Codex Routing Index

Read this file after `AGENTS.md` or through `agent-bootstrap context --compact`.
It is the routing surface for the kit-managed `.codex` workspace; do not scan this
folder recursively.

## Automatic Startup

- Run `agent-bootstrap context --compact` before meaningful repo work.
- Use `agent-bootstrap context --why` before expanding context.
- Use `agent-bootstrap context --full` only when daily/session history is needed.
- Read `.codex/skills/INDEX.md` before loading a skill body.

## What Lives Here

- `.codex/config.toml`: Codex subagent settings.
- `.codex/agents/*.toml`: project-scoped Codex custom subagents.
- `.codex/commands/`: agent-bootstrap managed prompt templates, not native Codex slash commands.
- `.codex/skills/`: one bundled Superpowers workflow skill plus optional custom skills registered in the skills index.

There is no `rules/` folder. Mandatory guardrails live in `AGENTS.md`, this index,
and `.codex/skills/INDEX.md`.

## Skill Routing

- `superpowers` is the only bundled skill and owns workflow discipline: planning, TDD, debugging, review, verification, and finishing work.
- Optional project-specific skills must be registered in `.codex/skills/INDEX.md` before loading.

Load the narrowest matching skill from the index. If a fact is not in repo files,
context output, or a cited source, mark it unknown instead of guessing.

## Subagent Routing

Core/default dispatch agents:

- `manager`: research, requirements, tech-stack options, feature scope, handoff for user approval.
- `architect`: system architecture after direction is clear; boundaries, data flow, contracts, ownership.
- `frontend_implementer`: frontend implementation under the chosen architecture.
- `backend_implementer`: backend implementation under the chosen architecture.
- `tester`: focused tests, reproductions, smoke checks, regression risk.
- `reviewer`: correctness, security, behavior regressions, missing tests.

Advanced/on-demand agents:

- `docs_researcher`: current docs/API verification.
- `ci_cd`: CI/CD, release automation, pipeline failures.
- `cloud`: cloud deployment and managed service topology.
- `database`: schema, migrations, query and data-integrity work.

Do not dispatch subagents by default. Dispatch only when the task is broad enough
to benefit from parallel work or a specialized review.

## Command Templates

Use `.codex/commands/` as copyable workflow prompts when useful:

- Planning: `.codex/commands/plan/brainstorm.md`, `.codex/commands/plan/write-plan.md`
- Debugging: `.codex/commands/debug/root-cause.md`, `.codex/commands/debug/regression-hunt.md`
- Testing: `.codex/commands/test/test-first.md`, `.codex/commands/test/verify-fix.md`
- Git/release: `.codex/commands/git/*`, `.codex/commands/deploy/*`
