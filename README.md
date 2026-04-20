# agent-bootstrap-obsidian-cli

Portable CLI for bootstrapping coding projects into an Obsidian-based agent memory system.

## Install

Global install from GitHub:

```bash
npm install -g github:thienty1207/agent-bootstrap-obsidian-cli
```

## One-time setup

Set your vault root once on each machine:

```bash
agent-bootstrap config set-vault "C:\Users\Ty\Ho Thien Ty"
```

Ubuntu example:

```bash
agent-bootstrap config set-vault "/home/ty/ObsidianVault"
```

You can also override per-command:

```bash
agent-bootstrap init --vault-root "/home/ty/ObsidianVault"
```

## Daily use

Create a new project folder, enter it, then run:

```bash
agent-bootstrap
```

That single command will:

- create a project capsule under `Projects/<slug>` in the vault
- connect the project folder to the vault with `vault.config.json`
- create root `AGENT.md` and `AGENTS.md`
- scaffold `.github/`, `docs/`, and `plans/` with the FullAgent layout
- create `.github/AGENT.md`
- create `docs/vault-memory.md`
- create a repo-local `scripts/agent-memory.js` runtime
- install a git `post-commit` hook that writes commit worklogs into the vault

You can also bootstrap an explicit path:

```bash
agent-bootstrap "D:\project\Go\face_gen_tools"
```

## Agent-only commands

These are intended for the agent workflow after bootstrap. The repo-local runtime is preferred because it works even if the global CLI is not installed:

```bash
node scripts/agent-memory.js context
node scripts/agent-memory.js task "Investigate module layout"
node scripts/agent-memory.js decision "Use Cobra CLI" --title "CLI framework choice"
node scripts/agent-memory.js research "Compared image libs" --title "Go image tooling survey"
node scripts/agent-memory.js note "Implemented first prototype" --title "Prototype notes"
```

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
