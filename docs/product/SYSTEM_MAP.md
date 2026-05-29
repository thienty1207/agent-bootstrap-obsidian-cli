# System Map

This map gives AI agents a bounded product/system picture before they change code.

## Main Surfaces

- CLI surface: `agent-bootstrap setup`, `init`, `update`, `context`, `recall`, `memory`, `plan`, and `harness`.
- Vault surface: Obsidian Markdown under `Projects/<slug>/`, `Daily/`, `Research/`, `Notes/`, and `Artifacts/AgentBootstrap/`.
- Generated project surface: root `AGENTS.md`, `.codex/`, `docs/`, `plans/`, and `scripts/agent-memory.js`.

## Safety Boundaries

- Vault Markdown is the source of truth.
- Memory Engine indexes are cache/mục lục only.
- Rust acceleration is optional and must not be required for normal npm use.
