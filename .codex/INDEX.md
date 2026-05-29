# Codex Routing Index

Read this file after `AGENTS.md` or through `agent-bootstrap context --compact`.
It is the routing surface for the kit-managed `.codex` workspace; do not scan this
folder recursively.

## Automatic Startup

- Run `agent-bootstrap context --compact` before meaningful repo work. It also imports matched Codex sessions, redacts obvious secrets, dedupes imports, refreshes hybrid recall and AI Memory Engine, and loads bounded Active Plan State plus Product Harness.
- Run `agent-bootstrap plan status` after compact context for implementation, fix, security, frontend, backend, or verification work.
- Use `agent-bootstrap plan start|update|complete|interrupt` to keep `docs/superpowers/plans/` and vault `Plans/` aligned; never infer completion from silence.
- Run `agent-bootstrap harness status` and `agent-bootstrap harness check` after plan status for medium/high-risk feature work.
- Use `agent-bootstrap harness intake|proof|decision|trace|friction` to keep feature intent, risk, scope, proof, trace, friction, and product decisions aligned with vault `ProductHarness/`.
- Use `agent-bootstrap harness trace "<summary>"` before final response after meaningful work.
- Use `agent-bootstrap harness friction "<pain>"` when the workflow itself is unclear.
- Use `agent-bootstrap recall "<query>"` when compact context is not enough for prior decisions, facts, handoffs, or session summaries.
- Use `agent-bootstrap memory status|index|compact|promote-global` when Memory Engine health, shared Vault indexing, diagnostics, next actions, export, backup, or session sync needs inspection.
- Use `agent-bootstrap memory import-sessions` only for explicit maintenance; normal startup already runs it through compact context.
- Use `agent-bootstrap context --why` before expanding context.
- Use `agent-bootstrap context --full` only when daily/session history is needed.
- Read `.codex/agents/INDEX.md` before dispatching a subagent.
- Read `.codex/skills/INDEX.md` before loading a skill body.

## What Lives Here

- `.codex/config.toml`: Codex subagent settings.
- `.codex/agents/`: 3 core subagents plus optional custom agents registered in the agent index.
- `.codex/commands/`: agent-bootstrap managed prompt templates, not native Codex slash commands.
- `.codex/skills/`: one bundled Superpowers workflow skill, bundled optional domain skills, and optional custom skills registered in the skills index.
- Vault `Artifacts/recall-index.json`, `Artifacts/session-import-state.json`, `Artifacts/AgentBootstrap/`, and `Sessions/`: generated semantic recall, AI Memory Engine, approved global memory, and imported session assets maintained by `context`, `recall`, and `memory` commands.
- `docs/superpowers/plans/` and vault `Plans/`: Active Plan State maintained by `agent-bootstrap plan`.
- `docs/product/`, `docs/stories/`, `docs/validation/`, `docs/decisions/`, and vault `ProductHarness/`: Product Harness maintained by `agent-bootstrap harness`.
- Product Harness docs health includes `SYSTEM_MAP.md`, `CONTEXT_RULES.md`, `GLOSSARY.md`, `MATURITY.md`, and `COMPONENTS.md`.

There is no `.codex/rules/` folder. Mandatory guardrails live in `AGENTS.md`,
this index, and `.codex/skills/INDEX.md`. Security rule references live inside
the optional `vibe-security-scan` skill and load only when routed.

## Skill Routing

- `superpowers` is the only bundled workflow skill and owns workflow discipline: planning, TDD, debugging, review, verification, and finishing work.
- `frontend-design` and `vibe-security-scan` are bundled optional domain skills. Load them only when `.codex/skills/INDEX.md` routes the task there.
- Optional project-specific skills must be registered in `.codex/skills/INDEX.md` before loading.

Load the narrowest matching skill from the index. If a fact is not in repo files,
context output, or a cited source, mark it unknown instead of guessing.

## Product Harness

Product Harness is not a skill and does not replace Superpowers. It is the bounded
product contract layer for feature intent, scope, risk, proof, trace, friction,
and product decisions. Use it for medium/high-risk work; keep small docs/copy/polish
tasks lightweight.

## AI Memory Engine

AI Memory Engine is not a skill and not a database source of truth. It is the
shared-Vault memory firewall: current project memory wins, approved global
memory is used only when relevant, and weak cross-project memory is blocked
unless targeted recall has a clear match.

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
