# Upstream Notes

This folder keeps a trimmed, project-portable skill set.

- `superpowers/` is vendored as the primary workflow layer.
- `frontend-design/` is adapted from Anthropic's `frontend-design` skill under Apache-2.0.
- `vibe-security-scan/` is adapted from `tanviet12/vbsec` under MIT and extended with an Agent Bootstrap Rust overlay.

Specialist skills here are bundled optional domain extensions. They are available
in every generated project, but agents should load them only when
`.codex/skills/INDEX.md` routes the task to the matching skill.

Project-specific skills should still use the custom skills block in
`.codex/skills/INDEX.md`.
