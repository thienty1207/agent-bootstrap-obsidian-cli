# @kakasitink/agent-bootstrap

Portable CLI for bootstrapping coding projects into an Obsidian-backed AI memory kit with a Codex-native workspace.

## Public Flow

The core bootstrap flow stays small, with automatic memory commands available for agents and maintenance:

1. Install or update the CLI
2. Set the Obsidian vault path
3. Initialize a project
4. Update an existing project's kit files
5. Let AI agents auto-load context and recall memory
6. Export or back up memory when needed
7. Uninstall when no longer needed

Generated `AGENTS.md` files tell AI agents to run compact context automatically. Users can inspect recall, status, export, and backup manually, but normal AI work should not depend on manual memory commands.

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
- `.codex/` with Codex config, 3 core quality subagents, command templates, one bundled workflow skill, and optional custom skills/agents
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

`update` refreshes kit-managed `.codex` assets, `AGENTS.md` managed block, docs bridge, runtime script, manifest, and kit version metadata. It preserves project source code, the root README, `vault.config.json` identity fields, vault memory, registered custom skill folders under `.codex/skills/`, and registered custom agents under `.codex/agents/`.

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

## Automatic Memory Recall

The kit now includes a local, Obsidian-first recall layer inspired by QMD-style
Markdown search and AgentMemory-style status/export/backup workflows. Recall is
hybrid: it still uses exact keyword ranking, but also understands small local
concept aliases such as `security`/`bảo mật`, tenant isolation, Supabase RLS,
auth/login, database/db, frontend/UI, and backend/API. It does not require QMD,
AgentMemory, a server, MCP plugin, vector database, API key, or background
daemon.

AI agents should run this automatically:

```bash
agent-bootstrap context --compact
```

That command imports recent matched Codex session logs, redacts obvious secrets,
dedupes already imported logs, refreshes `Artifacts/recall-index.json`, loads
the project memory index, and injects a bounded `Auto Recall` section into
context. It does not dump full daily logs or recursively scan the vault. Normal
AI work does not require the user to manually import sessions.

Targeted recall:

```bash
agent-bootstrap recall "<query>" "D:\project\nodejs\srcEcommerce"
```

Examples:

```bash
agent-bootstrap recall "auth decision"
agent-bootstrap recall "billing export path"
agent-bootstrap recall "next handoff"
```

Memory maintenance:

```bash
agent-bootstrap memory status "D:\project\nodejs\srcEcommerce"
agent-bootstrap memory import-sessions "D:\project\nodejs\srcEcommerce"
agent-bootstrap memory sync-sessions "D:\project\nodejs\srcEcommerce"
agent-bootstrap memory export "D:\project\nodejs\srcEcommerce"
agent-bootstrap memory backup "D:\project\nodejs\srcEcommerce"
```

- `memory status` reports vault, project capsule, memory index, recall index,
  semantic recall mode, automatic Codex session import health, sessions,
  exports, backups, diagnostics, and recommended next actions.
- `memory import-sessions` runs the same automatic Codex session importer used
  by `context --compact`; it reports a plain summary and next action when no
  sessions are imported, but it is a maintenance command for inspection, not a
  normal manual step.
- `memory sync-sessions` writes a clean Markdown session summary under
  `Projects/<slug>/Sessions/` and refreshes recall.
- `memory export` writes a JSON export under
  `Projects/<slug>/Artifacts/Exports/`.
- `memory backup` writes a timestamped plain-file backup under
  `Projects/<slug>/Artifacts/Backups/`.

Generated project agents should also use the repo-local runtime silently:

```bash
node scripts/agent-memory.js recall "<query>"
node scripts/agent-memory.js memory status
node scripts/agent-memory.js memory import-sessions
node scripts/agent-memory.js memory sync-sessions
node scripts/agent-memory.js compact
```

After meaningful work, agents should write durable memory with the existing
runtime commands and run `compact` or `memory sync-sessions` when it helps the
next session. This keeps memory automatic without asking the user to run commands.

Imported Codex session notes are written under
`Projects/<slug>/Sessions/Imported/`. Import progress and dedupe state live in
`Projects/<slug>/Artifacts/session-import-state.json`.

When recall has no match, the output reports how many Markdown memory documents
were indexed and suggests how to narrow the query or refresh context.

### Backup Before Reinstalling Windows

Memory is stored on disk in your Obsidian vault and in each repo's generated
bridge files. Before reinstalling Windows, back up:

1. Your Obsidian vault folder.
2. Your project repositories.
3. The global CLI config folder if you want to keep machine registration:
   `%USERPROFILE%\.agent-bootstrap` or the folder set by
   `AGENT_BOOTSTRAP_CONFIG_HOME`.

For each important project, run:

```bash
agent-bootstrap memory backup "D:\project\nodejs\srcEcommerce"
agent-bootstrap memory export "D:\project\nodejs\srcEcommerce"
```

After reinstalling Windows, install the CLI again, run `agent-bootstrap setup`
against the restored vault, then run `agent-bootstrap update` inside each restored
project.

## Codex Workspace

Generated projects use `.codex/`:

- `config.toml`: default `[agents] max_threads = 6` and `max_depth = 1`
- `agents/`: 3 core subagents plus optional project-specific custom agents
  - `.codex/agents/code-reviewer.toml`: correctness, maintainability, regressions, and architecture fit
  - `.codex/agents/security-auditor.toml`: security, auth, secrets, injection, dependency, and vault-sensitive data handling
  - `.codex/agents/test-engineer.toml`: test strategy, regression coverage, smoke checks, and verification evidence
- `commands/`: agent-bootstrap managed prompt templates, not native Codex slash commands
- `skills/`: one bundled workflow skill plus optional project-specific custom skills
  - `.codex/skills/superpowers/`: workflow discipline
  - `.codex/skills/<custom-skill>/`: optional user-added project skills registered in `.codex/skills/INDEX.md`

Shipped bundled skill:

- `superpowers`: workflow discipline for planning, TDD, debugging, review, verification, and finishing work

Core subagents:

- `code-reviewer`: quality gate for correctness, maintainability, regressions, and architecture fit
- `security-auditor`: security gate for exploitable issues and sensitive-data handling
- `test-engineer`: verification gate for tests, smoke checks, and missing coverage

Frontend, backend, cloud, database, CI, provider, and framework-specific work is
handled through repo context, registered custom skills, registered custom agents,
and current official docs when API details matter. If a project needs reusable
local guidance for a specific stack, add a custom skill or custom agent and
register it in the matching index instead of changing the bundled Superpowers
workflow or the 3 core subagents.

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

## Add Project-Specific Agents

Generated projects can add domain agents for independent perspectives that are
not covered by the 3 core subagents. Agents should inspect
`.codex/agents/INDEX.md` first, then load or dispatch only the matching custom
agent. They should not recursively scan every agent file.

To add a custom agent:

1. Create `.codex/agents/<agent-name>.toml`.
2. Define `name`, `description`, `developer_instructions`, and optional `nickname_candidates`.
3. Register the agent under the custom agents block in `.codex/agents/INDEX.md`.
4. Keep the agent domain-specific. Do not duplicate Superpowers workflow or the
   built-in `code-reviewer`, `security-auditor`, and `test-engineer` gates.

Example custom agent file:

```toml
name = "nextjs-ui-reviewer"
description = "Use when reviewing Next.js App Router UI, routing, accessibility, and browser behavior."
developer_instructions = """
You are a project-specific Next.js UI review agent.

Use Superpowers as the workflow brain. Review only Next.js UI concerns, cite repo
evidence, and report findings back to the parent agent. Do not invoke other
subagents.
"""
nickname_candidates = ["Next UI", "Frontend Review"]
```

Example custom routing entries for `.codex/agents/INDEX.md`:

```md
| Task shape | Agent |
| --- | --- |
| Next.js App Router UI, accessibility, or browser behavior review | `.codex/agents/nextjs-ui-reviewer.toml` |
| Rust service ownership, concurrency, or Cargo release review | `.codex/agents/rust-service-reviewer.toml` |
| Supabase RLS, Auth, storage policy, or SQL migration review | `.codex/agents/supabase-reviewer.toml` |
```

`agent-bootstrap update` preserves custom agent files that are not bundled core
agents and are not obsolete managed agents.

## Vault Bridge

The vault bridge is stable across `init` and `update`:

- `vault.config.json` links repo, vault, project slug, project type, and kit version
- `agent-bootstrap context --compact` loads repo context, vault context, project memory index, automatic Codex session import, and bounded semantic Auto Recall
- `agent-bootstrap recall "<query>"` searches durable project memory Markdown with hybrid lexical + concept recall
- `agent-bootstrap memory <status|import-sessions|sync-sessions|export|backup>` handles health, import inspection, session replay, export, and backup
- `scripts/agent-memory.js` writes tasks, decisions, facts, questions, handoffs, research, notes, recall output, memory maintenance, and compact summaries
- `Facts.md` is for source-backed facts
- `Open Questions.md` is for unresolved assumptions
- `Handoff.md` keeps the next-session state short

## Contributor Verification

```bash
npm test
```
