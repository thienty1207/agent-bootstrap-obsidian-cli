# Workspace Agent Guide

Read this file first if you are working in the `agent-bootstrap-obsidian-cli` repository itself.

## Purpose

This repo builds the portable TypeScript `agent-bootstrap` CLI.

The CLI bootstraps new coding projects so they get:

- an external Obsidian vault bridge
- automatic vault skeleton setup from `setup`
- root-level workspace instructions
- a generated `.agent/` workspace for agent-readable assets
- `docs/`, `plans/`, and local runtime helpers
- typed project kits (`frontend`, `backend`, `tool`, `desktop`, `mobile`, `fullstack`)
- machine-local project registry and repo diagnostics
- automatic daily-note touches and project/global memory routing through the repo runtime
- graph-friendly vault memory hubs such as `Init.md` and folder README notes

## Important structure

- `src/`: TypeScript CLI implementation
- `dist/`: built runtime used by the published CLI
- `test/`: Node test suite
- `.agent/agents`, `.agent/commands`, `.agent/rules`, `.agent/skills`: template assets copied into generated project roots
- `.github/workflows/`: CI for this CLI repo itself
- `docs/` and `plans/`: template assets copied into generated project roots

## Public CLI surface

The documented user-facing flow has 4 actions only: install/update, `setup`, `init`, and uninstall.

`context` remains available as an optional AI-context command. AI agents should run `agent-bootstrap context --compact` automatically from this file instead of asking the user to run it.

This source repo also contains lifecycle helper modules such as `syncProject`, `updateProject`, `migrateProject`, and `runDoctor`, but those are contributor-facing source APIs exercised through tests rather than part of the documented global install flow.

## Working rules

- Keep the generated project shape aligned with VS Code/Copilot workspace expectations.
- Keep exactly one root `AGENTS.md` in generated repos.
- Do not reintroduce `.github/copilot-instructions.md` into generated repos unless explicitly requested.
- Do not reintroduce legacy agent assets under `.github/agents`, `.github/commands`, `.github/rules`, or `.github/skills`.
- Keep `agent-bootstrap` with no arguments as the default one-command bootstrap path.
- Keep `agent-bootstrap setup [path]` sufficient to initialize a brand new vault path, defaulting to the current working directory when omitted.
- Keep `agent-bootstrap context --compact` as the automatic first command agents run at the start of a fresh project session.
- Use `agent-bootstrap context --why` before expanding context, and `agent-bootstrap context --full` only when daily history is needed.
- Keep `docs/project-map.md` generated and type-aware so a new agent session can orient quickly.
- Keep repo-local memory writes appending to daily notes and auto-routing project vs global research by default.
- Keep `context` loading a compact project memory index so large repos do not require broad vault scans.
- Keep vault scaffold links centered around `Init.md` so Obsidian Graph View and agent memory navigation stay useful as the vault grows.
- Treat `src/` as the source of truth; `dist/` and `runtime/agent-bootstrap/dist/` are generated build outputs.
- Do not recursively scan `.agent/skills`; read `.agent/skills/INDEX.md` and load one narrow skill only when needed.
- Workflow skills have priority over domain skills: use Superpowers workflow guidance and Karpathy coding principles before specialist domain skills when both apply.
- Treat older dated files under `plans/` as historical context; do not read them by default unless the task is about lifecycle history.
- If a fact is not present in repo, context output, or a cited source, mark it unknown instead of guessing.
- Treat `README.md` and `src/cli.ts` as the source of truth for the public CLI surface if an older plan file mentions superseded commands.
- Keep the managed `AGENTS.md` block refreshable without overwriting user-written instructions outside the markers.
- Verify bootstrap behavior through `test/cli.test.js` and real smoke tests before claiming completion.

## Fast path

1. Read `README.md`
2. Read `.agent/README.md` and `.agent/INDEX.md`; list targeted `.agent/agents`, `.agent/commands`, and `.agent/rules` only when needed
3. Run `npm test`
4. Confirm `README.md` and `src/cli.ts` still agree on the public command surface
5. In generated projects, use `agent-bootstrap context --compact` as the automatic first-step context loader for AI sessions
