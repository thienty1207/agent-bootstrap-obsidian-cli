# Core Skills Source

The top-level specialist skills in this folder were selected and vendored from:

- `https://github.com/Jeffallan/claude-skills`
- source snapshot: `3d95bb16b030af43bd838dc99fdc77dd40b29014`

Selection goal:

- keep `superpowers/` as the workflow layer
- keep `andrej-karpathy-skills/` as the coding-principles layer
- add only specialist skills that are broadly useful for long-term full-stack work
- avoid skills that duplicate planning, debugging, testing, or review workflows already covered by existing packs

Vendored specialist skills:

- `architecture-designer`
- `api-designer`
- `devops-engineer`
- `monitoring-expert`
- `secure-code-guardian`
- `database-optimizer`
- `sql-pro`
- `legacy-modernizer`

Portable derived skill:

- `agent-api` was written for this kit using the structure and portability lessons from `https://github.com/anthropics/skills/tree/main/skills/claude-api`
- the new skill was rewritten to be provider-agnostic and runtime-agnostic, with lightweight guidance for `Python`, `TypeScript`, `Go`, and `Rust`
- source inspiration is retained here so future updates can compare against the upstream Apache 2.0 skill responsibly

Frontend and React/Next.js skills:

- `frontend-design` was added from the local evaluated skill source at `D:/project/nodejs/srcEcommerce/.agents/skills/frontend-design` and keeps its Apache 2.0 license text in `LICENSE.txt`
- `vercel-react-best-practices` was added from the local evaluated skill source at `D:/project/nodejs/srcEcommerce/.agents/skills/vercel-react-best-practices`
- the Vercel skill keeps individual rule files under `rules/` for lazy loading and keeps the compiled upstream output as `FULL_GUIDE.upstream.md` instead of nested `AGENTS.md`
