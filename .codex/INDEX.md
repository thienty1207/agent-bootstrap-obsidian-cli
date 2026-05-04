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
- `.codex/skills/`: four lazy-loaded core skills.

There is no `rules/` folder. Mandatory guardrails live in `AGENTS.md`, this index,
and `.codex/skills/INDEX.md`.

## Skill Priority

1. `superpowers`: workflow discipline, planning, TDD, debugging, review, verification.
2. `karpathy-coding-principles`: simplicity, surgical edits, explicit assumptions.
3. `frontend-design`: browser-facing UI design and visual implementation.
4. `agent-api`: model/provider adapters, streaming, tool calling, structured output.

Load the narrowest matching skill. If a fact is not in repo files, context output,
or a cited source, mark it unknown instead of guessing.

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
