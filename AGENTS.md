# Workspace Agent Guide

Read this file first if you are working in the `agent-bootstrap-obsidian-cli` repository itself.

This file mirrors `AGENT.md` for tool compatibility.

## Purpose

This repo builds the portable `agent-bootstrap` CLI.

The CLI bootstraps new coding projects so they get:

- an external Obsidian vault bridge
- root-level workspace instructions
- a generated `.github/` agent workspace
- `docs/`, `plans/`, and local runtime helpers

## Important structure

- `src/`: CLI implementation
- `test/`: Node test suite
- `scaffold/base/`: template assets copied into generated project roots
- `.github/workflows/`: CI for this CLI repo itself

## Important note about `scaffold/base/.github`

`scaffold/base/.github` is intentionally a template source.

It is not the active `.github` folder for this CLI repo. During bootstrap, the CLI copies that folder into the target project's root so the generated repository ends up with its own real root `.github/`.

## Working rules

- Keep the generated project shape aligned with VS Code/Copilot workspace expectations.
- Prefer root `AGENT.md` for fast human/agent orientation.
- Keep root `AGENTS.md` in sync for tools that recognize that filename.
- Do not reintroduce `.github/copilot-instructions.md` into generated repos unless explicitly requested.
- Verify bootstrap behavior through `test/cli.test.js` and real smoke tests before claiming completion.

## Fast path

1. Read `.github/AGENT.md`
2. Read `README.md`
3. Run `npm test`

