# @tytybill123/agent-bootstrap

Portable CLI for bootstrapping coding projects into an Obsidian-based agent memory system.

This package is intentionally documented around 5 user-facing actions only:

1. install or update the CLI
2. set up the vault once on a machine
3. initialize a project
4. load agent context
5. uninstall the CLI

Only `setup`, `init`, and `context` are public CLI commands.
The source repo also contains contributor-only helper modules for lifecycle repair and diagnostics, but the documented global install flow stays intentionally limited to those three commands.

## 1. Install or update

Use the same command every time:

```bash
npm i -g --force @tytybill123/agent-bootstrap
```

That single command covers:

- first install
- reinstall when you forgot whether it is already installed
- update to the latest published version
- overwriting a stale old `agent-bootstrap` shim left by an earlier broken install

## 2. Set up the vault once

Point the CLI at your Obsidian vault root:

```bash
agent-bootstrap setup "C:\Users\Ty\ObsidianVault"
```

Linux example:

```bash
agent-bootstrap setup "/home/ty/ObsidianVault"
```

If you are already inside the vault root folder, the path is optional:

```bash
agent-bootstrap setup
```

## 3. Initialize a project

Inside a repo:

```bash
agent-bootstrap init
```

Or pass an explicit path:

```bash
agent-bootstrap init "D:\project\nodejs\shop-web"
```

`init` will:

- create the project capsule under `Projects/<slug>` in the vault
- connect the repo to the vault with `vault.config.json`
- create one root `AGENT.md`
- scaffold `.agent/`, `docs/`, and `plans/`
- create `docs/vault-memory.md`
- create `docs/project-map.md`
- create `scripts/agent-memory.js`
- create or touch today's daily note
- install a git `post-commit` hook that writes commit worklogs into the vault

Existing repo READMEs are preserved.

Rerunning `agent-bootstrap init` is the supported repair path for missing managed repo assets.
It refreshes the generated bridge files while leaving an existing repo `README.md` in place.

## 4. Load context for AI agents

Run this inside a project after `agent-bootstrap init`:

```bash
agent-bootstrap context
```

Use it at the start of a fresh AI agent session, or when you want to verify what the agent should read. It loads the repo guide, `.agent` guide, project map, vault bridge, project tasks, decisions, today's daily note, and the compact memory index.

## 5. Uninstall

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

## Verification

For contributors:

```bash
npm test
```
