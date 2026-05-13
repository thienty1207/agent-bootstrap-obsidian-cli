# @kakasitink/agent-bootstrap

Portable CLI for bootstrapping coding projects into an Obsidian-backed AI memory kit with a Codex-native workspace.

## Public Flow

The user-facing flow is intentionally small:

1. Install or update the CLI
2. Set the Obsidian vault path
3. Initialize a project
4. Update an existing project's kit files
5. Uninstall when no longer needed

AI context commands still exist, but generated `AGENTS.md` files tell AI agents to run compact context automatically.

## 1. Install Or Update CLI

```bash
npm i -g --force @kakasitink/agent-bootstrap
```

## 2. Set Vault

Run once per machine, pointing at your Obsidian vault root:

```bash
agent-bootstrap setup "D:\project\nodejs\NodeVault"
```

If your terminal is already inside the vault folder:

```bash
agent-bootstrap setup
```

## 3. Init Project

```bash
agent-bootstrap init "D:\project\nodejs\srcEcommerce" --type fullstack
agent-bootstrap init "D:\project\nodejs\frontend-app" --type frontend
agent-bootstrap init "D:\project\nodejs\backend-service" --type backend
```

Available project types:

- `frontend`: UI routes, state, browser behavior, deployment surface
- `backend`: handlers, contracts, auth, persistence, service rollout
- `fullstack`: frontend, backend, database, shared contracts, deploy topology
- `tool`: CLI, scripts, filesystem effects, config, external command behavior
- `desktop`: shell, windows, IPC, filesystem access, packaging
- `mobile`: navigation, device permissions, offline sync, release channels

If `--type` is omitted, the default is `tool`.

`init` creates:

- root `AGENTS.md`
- `.codex/` with Codex config, custom subagents, command templates, one bundled workflow skill, and optional custom skills
- `docs/vault-memory.md` and `docs/project-map.md`
- `plans/`
- `vault.config.json`
- `scripts/agent-memory.js`
- `.githooks/post-commit`
- vault project capsule under `Projects/<slug>`
- `Tasks.md`, `Decisions.md`, `Facts.md`, `Open Questions.md`, and `Handoff.md`

Existing repo `README.md` files are preserved.

## 4. Update Project Kit

After installing a newer CLI version, refresh a project that is already being built:

```bash
agent-bootstrap update "D:\project\nodejs\srcEcommerce"
```

`update` refreshes kit-managed `.codex` assets, `AGENTS.md` managed block, docs bridge, runtime script, manifest, and kit version metadata. It preserves project source code, the root README, `vault.config.json` identity fields, vault memory, and registered custom skill folders under `.codex/skills/`.

Legacy `.agent`, `.agents`, and old `.github/agents|commands|rules|skills|prompts` assets are removed so AI agents do not read stale instructions.

## 5. Uninstall CLI

```bash
npm uninstall -g @kakasitink/agent-bootstrap
```

## Optional: AI Context

Users can run these manually. AI agents should run it automatically from `AGENTS.md`:

```bash
agent-bootstrap context --compact
agent-bootstrap context --why
agent-bootstrap context --full
```

- `--compact` loads the smallest useful repo and vault context
- `--why` explains what was loaded and skipped
- `--full` adds daily/session history when needed

## Codex Workspace

Generated projects use `.codex/`:

- `config.toml`: default `[agents] max_threads = 6` and `max_depth = 1`
- `agents/*.toml`: Codex custom agents
- `commands/`: agent-bootstrap managed prompt templates, not native Codex slash commands
- `skills/`: one bundled workflow skill plus optional project-specific custom skills
  - `.codex/skills/superpowers/`: workflow discipline
  - `.codex/skills/<custom-skill>/`: optional user-added project skills registered in `.codex/skills/INDEX.md`

Shipped bundled skill:

- `superpowers`: workflow discipline for planning, TDD, debugging, review, verification, and finishing work

Frontend, backend, cloud, database, CI, provider, and framework-specific work is
handled through repo context, the relevant subagent when delegation helps, and
current official docs when API details matter. If a project needs reusable local
guidance for a specific stack, add a custom skill and register it in the skills
index instead of changing the bundled Superpowers workflow.

There is no `rules/` folder. Always-on guardrails live in `AGENTS.md`, `.codex/INDEX.md`, and `.codex/skills/INDEX.md`.

## Add Project-Specific Skills

Generated projects can add domain skills for their own stack while keeping
Superpowers as the only bundled workflow skill. Agents should inspect
`.codex/skills/INDEX.md` first, then load only the matching custom skill body.
They should not recursively scan every skill folder.

To add a custom skill:

1. Create `.codex/skills/<skill-name>/SKILL.md`.
2. Add frontmatter with `name` and a precise `description: Use when ...`.
3. Register the skill under the custom skills block in `.codex/skills/INDEX.md`.
4. Keep the skill domain-specific. Do not duplicate planning, TDD, debugging,
   review, or verification workflow that belongs to Superpowers.

Example custom skill file:

```md
---
name: nextjs
description: Use when working on Next.js routes, React Server Components, or App Router behavior.
---

# Next.js Project Skill

Load current project conventions first, then apply Next.js-specific guidance.
```

Example custom routing entries for `.codex/skills/INDEX.md`:

```md
| Task shape | Load |
| --- | --- |
| Next.js routes, React Server Components, or App Router behavior | `.codex/skills/nextjs/SKILL.md` |
| Rust services, Cargo workflows, or ownership-sensitive refactors | `.codex/skills/rust/SKILL.md` |
| Supabase database, auth, storage, realtime, or edge function work | `.codex/skills/supabase/SKILL.md` |
```

`agent-bootstrap update` preserves custom skill folders that are not bundled kit
skills and are not obsolete managed skills.

## Vault Bridge

The vault bridge is stable across `init` and `update`:

- `vault.config.json` links repo, vault, project slug, project type, and kit version
- `agent-bootstrap context --compact` loads repo context, vault context, and project memory index
- `scripts/agent-memory.js` writes tasks, decisions, facts, questions, handoffs, research, notes, and compact summaries
- `Facts.md` is for source-backed facts
- `Open Questions.md` is for unresolved assumptions
- `Handoff.md` keeps the next-session state short

## Contributor Verification

```bash
npm test
```
