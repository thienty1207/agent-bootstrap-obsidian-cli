# Workspace Agent Guide

Read this file first if you are working in the `agent-bootstrap-obsidian-cli` repository itself.

## Purpose

This repo builds the portable TypeScript `agent-bootstrap` CLI.

The CLI bootstraps new coding projects so they get:

- an external Obsidian vault bridge
- root-level workspace instructions
- a generated `.github/` agent workspace
- `docs/`, `plans/`, and local runtime helpers
- typed project kits (`web`, `api`, `tool`, `desktop`, `mobile`, `fullstack`)
- machine-local project registry and repo diagnostics
- lifecycle commands for legacy repos and kit refreshes (`migrate`, `update`, `sync`)

## Important structure

- `src/`: TypeScript CLI implementation
- `dist/`: built runtime used by the published CLI
- `test/`: Node test suite
- `.github/agents`, `.github/commands`, `.github/prompts`, `.github/rules`, `.github/skills`: template assets copied into generated project roots
- `.github/workflows/`: CI for this CLI repo itself
- `docs/` and `plans/`: template assets copied into generated project roots

## Working rules

- Keep the generated project shape aligned with VS Code/Copilot workspace expectations.
- Keep exactly one root `AGENT.md` in generated repos.
- Do not reintroduce `.github/copilot-instructions.md` into generated repos unless explicitly requested.
- Keep `agent-bootstrap` with no arguments as the default one-command bootstrap path.
- Keep `docs/project-map.md` generated and type-aware so a new agent session can orient quickly.
- Keep `doctor` actionable: when something is missing, it should point users to `update` or `sync`.
- Verify bootstrap behavior through `test/cli.test.js` and real smoke tests before claiming completion.

## Fast path

1. Read `README.md`
2. Inspect `.github/`, `docs/`, and `plans/`
3. Run `npm test`
4. Use `agent-bootstrap doctor` and `agent-bootstrap projects list` as the operational checkpoints for the end-user flow
