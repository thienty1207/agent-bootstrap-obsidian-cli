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
- typed project kits (`web`, `api`, `tool`, `desktop`, `mobile`, `fullstack`)
- machine-local project registry and repo diagnostics
- automatic daily-note touches and project/global memory routing through the repo runtime

## Important structure

- `src/`: TypeScript CLI implementation
- `dist/`: built runtime used by the published CLI
- `test/`: Node test suite
- `.agent/agents`, `.agent/commands`, `.agent/rules`, `.agent/skills`: template assets copied into generated project roots
- `.github/workflows/`: CI for this CLI repo itself
- `docs/` and `plans/`: template assets copied into generated project roots

## Public CLI surface

Only `setup` and `init` are public CLI commands.

This source repo also contains lifecycle helper modules such as `syncProject`, `updateProject`, `migrateProject`, and `runDoctor`, but those are contributor-facing source APIs exercised through tests rather than part of the documented global install flow.

## Working rules

- Keep the generated project shape aligned with VS Code/Copilot workspace expectations.
- Keep exactly one root `AGENT.md` in generated repos.
- Do not reintroduce `.github/copilot-instructions.md` into generated repos unless explicitly requested.
- Do not reintroduce legacy agent assets under `.github/agents`, `.github/commands`, `.github/rules`, or `.github/skills`.
- Keep `agent-bootstrap` with no arguments as the default one-command bootstrap path.
- Keep `agent-bootstrap setup [path]` sufficient to initialize a brand new vault path, defaulting to the current working directory when omitted.
- Keep `docs/project-map.md` generated and type-aware so a new agent session can orient quickly.
- Keep repo-local memory writes appending to daily notes and auto-routing project vs global research by default.
- Keep `context` loading a compact project memory index so large repos do not require broad vault scans.
- Treat `README.md` and `src/cli.ts` as the source of truth for the public CLI surface if an older plan file mentions superseded commands.
- Keep the managed `AGENT.md` block refreshable without overwriting user-written instructions outside the markers.
- Verify bootstrap behavior through `test/cli.test.js` and real smoke tests before claiming completion.

## Fast path

1. Read `README.md`
2. Inspect `.agent/`, `.github/workflows/`, `docs/`, and `plans/`
3. Run `npm test`
4. Confirm `README.md` and `src/cli.ts` still agree on the public command surface
