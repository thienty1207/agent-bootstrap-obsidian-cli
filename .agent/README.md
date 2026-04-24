# Agent Workspace Guide

This folder is the local operating kit for AI work in this repo. Read this file after `AGENTS.md` and `docs/project-map.md`, or use `agent-bootstrap context --compact` to load it automatically.

For quick routing, read `.agent/INDEX.md`. For skills, read `.agent/skills/INDEX.md` before loading any `SKILL.md`.

## How the four folders work together

- `agents/` defines role prompts. Pick one when a task clearly matches a specialty such as planning, debugging, testing, security, release work, or research.
- `commands/` defines repeatable workflow starters. Use them to begin common jobs like brainstorming, root-cause debugging, test-first work, PR prep, and release checks.
- `rules/` defines guardrails. These constrain how commands and agents behave, especially around planning, root-cause analysis, testing, deploys, and git hygiene.
- `skills/` defines deeper operating knowledge. Load the narrowest relevant skill when the task needs domain guidance, workflow discipline, or provider-specific implementation patterns.

## Priority

- `AGENTS.md` is the repo entry contract.
- `docs/project-map.md` tells you where to look for this project type.
- This file explains how to use `.agent/` without scanning every asset.
- `.agent/INDEX.md` and `.agent/skills/INDEX.md` are routing indexes, not long-form context.
- Rules beat commands when they conflict.
- Commands should pull in the relevant rules and skills instead of replacing them.
- Skills are used on demand; do not load the whole skill library by default.
- Do not recursively scan `.agent/skills`; load one narrow skill only after the index points to it.

## Default flow

1. Run `agent-bootstrap context --compact` at the start of a fresh session.
2. Read `.agent/INDEX.md` when you need to route to a role, command, rule, or skill.
3. Read the task and choose whether a specialist in `agents/` is useful.
4. If the task matches a workflow in `commands/`, use that command as the starting script.
5. Apply the matching files in `rules/` as non-negotiable guardrails.
6. Load `.agent/skills/INDEX.md`, then the narrowest relevant `SKILL.md`, only when extra domain or workflow knowledge is needed.
7. Write durable progress back through `node scripts/agent-memory.js <task|decision|research|note|fact|question|handoff|compact>` when the work meaningfully changes context.

## Drift control

`agent-bootstrap init` refreshes managed bridge files and safely syncs untouched scaffold assets from the installed kit. Files you have customized are preserved instead of overwritten.
