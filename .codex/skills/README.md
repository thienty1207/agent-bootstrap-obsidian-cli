# Skills

This kit ships one bundled workflow skill and two bundled optional domain skills:

- `superpowers/`: workflow discipline for planning, TDD, debugging, review, verification, and finishing work.
- `frontend-design/`: optional frontend/UI guidance, lazy-loaded only for matching UI tasks.
- `vibe-security-scan/`: optional defensive appsec guidance, lazy-loaded only for matching security-sensitive tasks.

Projects may add custom domain skills under `.codex/skills/<skill-name>/`.
Register each custom skill in `INDEX.md`; agents should read the index first and
load only the matching skill body.
