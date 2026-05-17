# Codex Routing Index

Read this file after `AGENTS.md` or through `agent-bootstrap context --compact`.
It is the routing surface for the kit-managed `.codex` workspace; do not scan this
folder recursively.

## Automatic Startup

- Run `agent-bootstrap context --compact` before meaningful repo work.
- Use `agent-bootstrap recall "<query>"` when compact context is not enough for prior decisions, facts, handoffs, or session summaries.
- Use `agent-bootstrap memory status` when memory health, export, backup, or session sync needs inspection.
- Use `agent-bootstrap context --why` before expanding context.
- Use `agent-bootstrap context --full` only when daily/session history is needed.
- Read `.codex/agents/INDEX.md` before dispatching a subagent.
- Read `.codex/skills/INDEX.md` before loading a skill body.

## What Lives Here

- `.codex/config.toml`: Codex subagent settings.
- `.codex/agents/`: 3 core subagents plus optional custom agents registered in the agent index.
- `.codex/commands/`: agent-bootstrap managed prompt templates, not native Codex slash commands.
- `.codex/skills/`: one bundled Superpowers workflow skill plus optional custom skills registered in the skills index.
- Vault `Artifacts/recall-index.json` and `Sessions/`: generated memory recall assets maintained by `context`, `recall`, and `memory` commands.

There is no `rules/` folder. Mandatory guardrails live in `AGENTS.md`, this index,
and `.codex/skills/INDEX.md`.

## Skill Routing

- `superpowers` is the only bundled skill and owns workflow discipline: planning, TDD, debugging, review, verification, and finishing work.
- Optional project-specific skills must be registered in `.codex/skills/INDEX.md` before loading.

Load the narrowest matching skill from the index. If a fact is not in repo files,
context output, or a cited source, mark it unknown instead of guessing.

## Subagent Routing

The core execution model is Superpowers + 3 core subagents:

- `code-reviewer`: correctness, maintainability, regressions, and architecture fit.
- `security-auditor`: exploitable security issues, auth, secrets, injection, dependencies, and vault-sensitive data handling.
- `test-engineer`: test strategy, regression coverage, smoke checks, and verification evidence.

Read `.codex/agents/INDEX.md` before dispatching any subagent. Custom agents
must be registered there before use.

## Command Templates

Use `.codex/commands/` as copyable workflow prompts when useful:

- Planning: `.codex/commands/plan/brainstorm.md`, `.codex/commands/plan/write-plan.md`
- Debugging: `.codex/commands/debug/root-cause.md`, `.codex/commands/debug/regression-hunt.md`
- Testing: `.codex/commands/test/test-first.md`, `.codex/commands/test/verify-fix.md`
- Git/release: `.codex/commands/git/*`, `.codex/commands/deploy/*`
