# agent-bootstrap-obsidian-cli

Portable TypeScript CLI for bootstrapping coding projects into an Obsidian-based agent memory system.

The intended user flow stays simple:

1. install the CLI
2. run `agent-bootstrap config set-vault <path>` once
3. `cd` into a project and run `agent-bootstrap`

Everything else should be automated by the kit.

## Install

Global install from the GitHub tarball:

```bash
npm install -g https://codeload.github.com/thienty1207/agent-bootstrap-obsidian-cli/tar.gz/refs/heads/main
```

Windows note:
- Avoid `npm install -g github:thienty1207/agent-bootstrap-obsidian-cli` on Windows. npm global Git installs can leave a broken shim for this package path, while the tarball install path works reliably.

## One-time setup

Set your vault root once on each machine:

```bash
agent-bootstrap config set-vault "C:\Users\Ty\Ho Thien Ty"
```

If you are already inside the folder you want to use as the vault root, the path is optional:

```bash
agent-bootstrap config set-vault
```

Ubuntu example:

```bash
agent-bootstrap config set-vault "/home/ty/ObsidianVault"
```

If the vault path is empty or does not exist yet, `set-vault` now auto-initializes a portable vault skeleton:

- `Daily`
- `Templates`
- `Projects`
- `Research`
- `Notes`
- `Inbox`
- `Archive`
- `Tools`
- root `AGENTS.md`
- `Projects/_template`
- `.obsidian` daily note settings

You can also override per-command:

```bash
agent-bootstrap init --vault-root "/home/ty/ObsidianVault"
```

## Quick start

Create a new project folder, enter it, then run:

```bash
agent-bootstrap
```

That single command will:

- ensure the vault skeleton exists even on a fresh machine
- create a project capsule under `Projects/<slug>` in the vault
- connect the project folder to the vault with `vault.config.json`
- stamp the current kit version into repo metadata
- create exactly one root `AGENT.md`
- scaffold `.github/`, `docs/`, and `plans/` with the FullAgent layout
- create `docs/vault-memory.md`
- create a type-aware `docs/project-map.md`
- create a repo-local `scripts/agent-memory.js` runtime
- create or touch today's daily note automatically
- install a git `post-commit` hook that writes commit worklogs into the vault

After bootstrap, the generated runtime is designed so the agent can follow the kit without extra user commands:

- `context` ensures today's daily note exists and records a session marker
- `context` also includes a compact project memory index for faster warmup
- `task`, `decision`, `research`, and `note` writes also append to today's daily note automatically
- `research` and `note` entries auto-route to project or global scope by default
- routing decisions are stored with a `scope_reason`
- the project capsule keeps an `Artifacts/memory-index.json` summary for fast recall
- `post-commit` keeps writing commit worklogs into the project capsule

You can also bootstrap an explicit path:

```bash
agent-bootstrap "D:\project\Go\face_gen_tools"
```

Create a typed project in one command:

```bash
agent-bootstrap new web "D:\project\nodejs\shop-web"
agent-bootstrap new api "/home/ty/projects/payments-api"
agent-bootstrap new tool
```

Supported project types:

- `web`
- `api`
- `tool`
- `desktop`
- `mobile`
- `fullstack`

The default type for `agent-bootstrap` or `agent-bootstrap init` is `tool`.

## Command surface

```bash
agent-bootstrap
agent-bootstrap init [path] --type <type>
agent-bootstrap new <type> [path]
agent-bootstrap config set-vault <path>
agent-bootstrap config get
agent-bootstrap projects list
agent-bootstrap projects show [slug]
agent-bootstrap doctor
agent-bootstrap update
agent-bootstrap migrate [path] --type <type>
agent-bootstrap sync
agent-bootstrap context
agent-bootstrap memory <task|decision|research|note> ...
```

## Project registry

Bootstrapped projects are registered machine-locally at:

- Windows: `%USERPROFILE%\.agent-bootstrap\projects.json`
- Linux/macOS: `~/.agent-bootstrap/projects.json`

Useful commands:

```bash
agent-bootstrap projects list
agent-bootstrap projects show
```

## Diagnostics and sync

Check the current repo health:

```bash
agent-bootstrap doctor
```

Restore missing generated files without clobbering your existing README:

```bash
agent-bootstrap sync
```

Refresh the repo-local kit files from the current CLI version:

```bash
agent-bootstrap update
```

Upgrade an older repo into the current single-`AGENT.md` kit layout:

```bash
agent-bootstrap migrate "D:\project\legacy-api" --type api
```

`doctor` now reports:

- current repo and vault bridge health
- missing managed repo paths such as `.github/agents/planner.md` or `scripts/agent-memory.js`
- missing vault capsule paths such as `Tasks.md`
- suggested repair commands like `agent-bootstrap update` or `agent-bootstrap sync`

## Agent-only commands

These are intended for the agent workflow after bootstrap. The repo-local runtime is preferred because it works even if the global CLI is not installed:

```bash
node scripts/agent-memory.js context
node scripts/agent-memory.js task "Investigate module layout"
node scripts/agent-memory.js decision "Use Cobra CLI" --title "CLI framework choice"
node scripts/agent-memory.js research "Compared image libs" --title "Go image tooling survey"
node scripts/agent-memory.js note "Implemented first prototype" --title "Prototype notes"
```

Routing behavior:

- `task` and `decision` always stay project-scoped
- `research` and `note` default to auto routing
- reusable or cross-project material goes to global `Research` or `Notes`
- project-specific material stays under `Projects/<slug>/...`
- you can still override with `--scope project` or `--scope global`

The global CLI still exposes the same capabilities:

```bash
agent-bootstrap context
agent-bootstrap memory task "Investigate module layout"
agent-bootstrap memory decision "Use Cobra CLI" --title "CLI framework choice"
agent-bootstrap memory research "Compared image libs" --title "Go image tooling survey"
agent-bootstrap memory note "Implemented first prototype" --title "Prototype notes"
```

## Config file

The CLI stores machine-local config at:

- Windows: `%USERPROFILE%\.agent-bootstrap\config.json`
- Linux/macOS: `~/.agent-bootstrap/config.json`

Supported environment variables:

- `AGENT_BOOTSTRAP_CONFIG_HOME`
- `AGENT_BOOTSTRAP_VAULT_ROOT`

## Tests

```bash
npm test
```

The test script builds TypeScript to `dist/` before running the test suite.

## Template source

This repository keeps the reusable template content directly at the root:

- `.github/agents`
- `.github/commands`
- `.github/prompts`
- `.github/rules`
- `.github/skills`
- `docs`
- `plans`

During bootstrap, those directories are copied into the generated project root.

In addition, the CLI generates a managed `docs/project-map.md` per project so a fresh agent session can orient itself faster.
