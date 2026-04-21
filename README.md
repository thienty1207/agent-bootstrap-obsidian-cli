# @tytybill123/agent-bootstrap

Portable TypeScript CLI for bootstrapping coding projects into an Obsidian-based agent memory system.

The public flow is intentionally small: install, set up the vault once, initialize a project, uninstall if you no longer need the CLI.

## Quickstart

### 1. Install or update

Run the same command every time. If the CLI is not installed yet, it installs. If it is already installed cleanly, the same command updates it.

```bash
npm i -g @tytybill123/agent-bootstrap
```

### 2. Set up your vault once

Pick the Obsidian vault root you want to use on this machine.

```bash
agent-bootstrap setup "C:\Users\Ty\ObsidianVault"
```

Ubuntu example:

```bash
agent-bootstrap setup "/home/ty/ObsidianVault"
```

If you are already standing inside the folder you want to use as the vault root, the path is optional:

```bash
agent-bootstrap setup
```

### 3. Initialize a project

Move into the project folder, then initialize it:

```bash
cd D:\project\nodejs\shop-web
agent-bootstrap init
```

Or bootstrap an explicit path:

```bash
agent-bootstrap init "D:\project\nodejs\shop-web"
```

`agent-bootstrap` with no arguments still initializes the current folder, but `agent-bootstrap init` is the documented primary command.

### 4. Uninstall

```bash
npm uninstall -g @tytybill123/agent-bootstrap
```

## What `setup` creates

The first `setup` creates or repairs a portable vault skeleton:

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

## What `init` creates

Project initialization keeps the repo onboarding small while wiring the vault integration automatically.

It will:

- create a project capsule under `Projects/<slug>` in the vault
- connect the repo to the vault with `vault.config.json`
- stamp the current kit version into repo metadata
- create exactly one root `AGENT.md`
- scaffold `.github/`, `docs/`, and `plans/`
- create `docs/vault-memory.md`
- create a type-aware `docs/project-map.md`
- create a repo-local `scripts/agent-memory.js` runtime
- create or touch today's daily note automatically
- install a git `post-commit` hook that writes commit worklogs into the vault

Existing repo READMEs are preserved.

## Built-in help

The CLI now exposes a small quickstart directly:

```bash
agent-bootstrap help
```

That help output is aligned with the same 4-command flow above.

## For contributors

Run the full verification suite locally with:

```bash
npm test
```
