# Codex Workspace Guide

This is the kit-managed Codex workspace installed by `agent-bootstrap`.
Use it after `AGENTS.md`; the compact context command loads the key indexes
without scanning every skill or subagent file.

## Load Order

1. `AGENTS.md`
2. `agent-bootstrap context --compact`
3. `agent-bootstrap plan status` for implementation, fix, security, frontend, backend, or verification work
4. `agent-bootstrap harness status` for medium/high-risk feature work
5. `.codex/INDEX.md`
6. `.codex/agents/INDEX.md`
7. `.codex/skills/INDEX.md`
8. `agent-bootstrap recall "<query>"` only when compact context is insufficient
9. One targeted skill or subagent only when the task requires it

## Boundaries

- `AGENTS.md` is the always-on operating contract.
- `.codex/config.toml` contains conservative Codex subagent defaults.
- `.codex/agents/` contains the 3 core quality subagents plus optional registered custom agents.
- `.codex/commands/` contains prompt templates managed by this kit, not native Codex slash commands.
- `.codex/skills/` contains the bundled Superpowers workflow skill, bundled optional domain skills, and optional registered custom skills. Do not recursively read it.
- `docs/` and the linked vault hold durable project memory.
- `docs/superpowers/plans/` and vault `Plans/` hold Active Plan State so agents know what is active, interrupted, completed, or unverified.
- `docs/product/`, `docs/stories/`, `docs/validation/`, `docs/decisions/`, and vault `ProductHarness/` hold Product Harness state for feature intent, risk, scope, proof, trace, friction, and product decisions.
- `agent-bootstrap context --compact` imports matched Codex sessions, refreshes bounded hybrid Auto Recall from the linked vault, loads bounded Active Plan State and Product Harness, and keeps full memory bodies on disk until queried.
- `agent-bootstrap plan start|update|complete|interrupt` keeps the active plan dashboard current; completion requires verification evidence.
- `agent-bootstrap harness intake|proof|decision|trace|friction` keeps product understanding current; Product Harness is not a skill and does not replace Superpowers.
- `agent-bootstrap memory import-sessions` is available for maintenance inspection, but agents normally rely on compact context to run it automatically.

There is no `.codex/rules/` folder. Short mandatory guardrails are kept in the
always-on files above; deeper workflow guidance and optional security rule
references stay lazy-loaded in skills.

## Drift Control

Run `agent-bootstrap update [projectPath]` after installing a newer CLI version.
It refreshes the kit-managed `.codex` workspace and bridge files while preserving
project source code, the root README, and vault memory.
