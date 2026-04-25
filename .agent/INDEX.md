# Agent Routing Index

Use this file to choose the smallest useful `.agent` asset. Do not recursively scan `.agent`.

## Automatic Startup
- Run `agent-bootstrap context --compact` before meaningful repo work.
- If context is insufficient, run `agent-bootstrap context --why` before expanding to `agent-bootstrap context --full`.
- Skill routing is mandatory: read `.agent/skills/INDEX.md` before loading a skill body.

## First Read
- `AGENTS.md`
- `docs/project-map.md`
- `.agent/README.md`
- `.agent/skills/INDEX.md`

## Route By Task
- Planning or scope: `.agent/commands/plan/brainstorm.md`, `.agent/commands/plan/write-plan.md`
- Debugging: `.agent/commands/debug/root-cause.md`, `.agent/rules/debug/root-cause-before-fix.md`
- Tests or verification: `.agent/commands/test/test-first.md`, `.agent/commands/test/verify-fix.md`
- Git or PR work: `.agent/commands/git/branch-and-commit.md`, `.agent/commands/git/prepare-pr.md`
- Release or deploy: `.agent/commands/deploy/release-checklist.md`, `.agent/commands/deploy/post-deploy-verify.md`
- Unknowns or assumptions: `.agent/rules/context/unknowns-gate.md`
- Context getting too broad: `.agent/rules/context/stop-overthinking.md`

## Specialist Roles
- Architecture and boundaries: `.agent/agents/architect.md`
- Creative ideation and framing: `.agent/agents/brainstormer.md`
- Code review and risk finding: `.agent/agents/code-reviewer.md`
- Product copy and release notes: `.agent/agents/copywriter.md`
- Database schema, migration, and data integrity: `.agent/agents/database-admin.md`
- Debugging and root cause: `.agent/agents/debugger.md`
- Documentation alignment: `.agent/agents/docs-manager.md`
- Git hygiene and PR preparation: `.agent/agents/git-manager.md`
- Journals, decisions, and handoffs: `.agent/agents/journal-writer.md`
- Implementation planning: `.agent/agents/planner.md`
- Milestones and sequencing: `.agent/agents/project-manager.md`
- Focused refactoring: `.agent/agents/refactorer.md`
- Release readiness: `.agent/agents/release-manager.md`
- Structured research: `.agent/agents/researcher.md`
- External tools, docs, and assets: `.agent/agents/scout-external.md`
- Codebase exploration: `.agent/agents/scout.md`
- Test planning and verification: `.agent/agents/tester.md`

## Skills
- Read `.agent/skills/INDEX.md` before loading any skill.
- Workflow skills have priority over domain skills when workflow discipline applies.
- Load one narrow skill folder only when the task clearly matches it.
- Do not recursively scan `.agent/skills`.
