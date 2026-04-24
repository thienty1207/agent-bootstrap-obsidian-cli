# @tytybill123/agent-bootstrap

Portable CLI for bootstrapping coding projects into an Obsidian-based AI memory kit.

The public user flow is intentionally kept to 4 actions:

1. Install or update the CLI
2. Set the Obsidian vault path
3. Initialize a project
4. Uninstall when no longer needed

AI context and memory commands still exist, but users normally do not need to run them manually. Generated `AGENTS.md` files instruct AI agents to run compact context automatically.

## 1. Install Or Update

Use the same command for first install, reinstall, and update:

```bash
npm i -g --force @tytybill123/agent-bootstrap
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

Run inside a project:

```bash
agent-bootstrap init
```

Or pass the project path:

```bash
agent-bootstrap init "D:\project\nodejs\srcEcommerce"
```

Choose a project type when you want better AI routing:

```bash
agent-bootstrap init "D:\project\nodejs\srcEcommerce" --type fullstack
agent-bootstrap init "D:\project\nodejs\frontend-app" --type frontend
agent-bootstrap init "D:\project\nodejs\backend-service" --type backend
agent-bootstrap init "D:\project\nodejs\cli-tool" --type tool
agent-bootstrap init "D:\project\nodejs\desktop-app" --type desktop
agent-bootstrap init "D:\project\nodejs\mobile-app" --type mobile
```

Available project types:

- `frontend`: UI routes, state, auth screens, browser behavior, deployment surface
- `backend`: handlers, contracts, auth, persistence, migrations, service rollout
- `fullstack`: frontend, backend, database, shared contracts, deploy topology
- `tool`: CLI, scripts, filesystem effects, config, external command behavior
- `desktop`: shell, windows, IPC, filesystem access, packaging
- `mobile`: navigation, device permissions, offline sync, release channels

If `--type` is omitted, the default is `tool`.

`init` creates or refreshes:

- root `AGENTS.md`
- `.agent/` routing, rules, commands, agents, and skills
- `docs/vault-memory.md`
- `docs/project-map.md`
- `plans/`
- `vault.config.json`
- `scripts/agent-memory.js`
- `.githooks/post-commit`
- vault project capsule under `Projects/<slug>`
- stable memory files: `Tasks.md`, `Decisions.md`, `Facts.md`, `Open Questions.md`, `Handoff.md`

Existing repo `README.md` files are preserved.

Rerun `agent-bootstrap init` to repair missing managed assets or refresh untouched kit files.

## 4. Uninstall

```bash
npm uninstall -g @tytybill123/agent-bootstrap
```

## Optional: AI Context

Users can run this manually, but AI agents should run it automatically from `AGENTS.md`:

```bash
agent-bootstrap context
```

Context modes:

```bash
agent-bootstrap context --compact
agent-bootstrap context --why
agent-bootstrap context --full
```

- `context` defaults to `--compact`
- `--compact` loads the smallest useful repo and vault context
- `--why` explains what was loaded and skipped
- `--full` adds daily/session history when needed

## AI Memory Runtime

After `init`, each project gets `scripts/agent-memory.js`. This is mainly for AI agents and automation:

```bash
node scripts/agent-memory.js task "..."
node scripts/agent-memory.js decision "..." --title "..."
node scripts/agent-memory.js fact "..." --title "..." --source "..." --confidence high
node scripts/agent-memory.js question "..." --title "..."
node scripts/agent-memory.js handoff "..."
node scripts/agent-memory.js research "..." --title "..."
node scripts/agent-memory.js note "..." --title "..."
node scripts/agent-memory.js compact
node scripts/agent-memory.js context
```

Facts require provenance fields so future AI sessions do not treat guesses as truth:

- `Fact`
- `Source`
- `Confidence`
- `Last verified`

Unresolved assumptions should go to `Open Questions.md`, not `Facts.md`.

## What Setup Creates

The first `setup` creates or repairs a portable vault skeleton:

- `AGENTS.md`
- `Init.md`
- `Daily`
- `Templates`
- `Projects`
- `Research`
- `Notes`
- `Inbox`
- `Archive`
- `Tools`
- `Projects/_template`
- `.obsidian` daily note settings

`Init.md` is the graph-friendly vault entrypoint. Project-specific memory lives under `Projects/<slug>`.

## AI Consistency Model

The kit keeps user work and AI work consistent through:

- one root `AGENTS.md`
- compact context loaded first
- `.agent/INDEX.md` for routing
- `.agent/skills/INDEX.md` before loading any skill
- workflow skill priority for Superpowers and Karpathy-style coding discipline
- source-backed `Facts.md`
- unresolved unknowns in `Open Questions.md`
- short handoffs in `Handoff.md`
- no recursive scanning of `.agent/skills`

## Contributor Verification

```bash
npm test
```
