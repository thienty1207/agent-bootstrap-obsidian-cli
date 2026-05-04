# Codex Workspace Guide

This is the kit-managed Codex workspace installed by `agent-bootstrap`.
Use it after `AGENTS.md`; the compact context command loads the key indexes
without scanning every skill or subagent file.

## Load Order

1. `AGENTS.md`
2. `agent-bootstrap context --compact`
3. `.codex/INDEX.md`
4. `.codex/skills/INDEX.md`
5. One targeted skill or subagent only when the task requires it

## Boundaries

- `AGENTS.md` is the always-on operating contract.
- `.codex/config.toml` contains conservative Codex subagent defaults.
- `.codex/agents/*.toml` are Codex custom agents for explicit delegation.
- `.codex/commands/` contains prompt templates managed by this kit, not native Codex slash commands.
- `.codex/skills/` contains lazy-loaded expertise. Do not recursively read it.
- `docs/` and the linked vault hold durable project memory.

There is no `rules/` folder. Short mandatory guardrails are kept in the always-on
files above; deeper process and domain guidance stays lazy-loaded in skills.

## Drift Control

Run `agent-bootstrap update [projectPath]` after installing a newer CLI version.
It refreshes the kit-managed `.codex` workspace and bridge files while preserving
project source code, the root README, and vault memory.
