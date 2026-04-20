# CLI Repo Contract

This `.github` folder belongs to the `agent-bootstrap-obsidian-cli` repository itself.

It is separate from `scaffold/base/.github`, which is only the template copied into generated project roots.

## Read order

1. `../AGENT.md`
2. `../README.md`
3. `workflows/ci.yml`

## Expectations

- Keep generated repository instructions at the generated repo root.
- Keep the scaffold under `scaffold/base/` because it is package data, not the live workspace config for this repo.
- Keep CI green on Windows and Ubuntu compatible paths.
