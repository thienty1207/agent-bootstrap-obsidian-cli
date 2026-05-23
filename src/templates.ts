import type { ProjectType } from './project-types';

export function projectReadmeTemplate(projectSlug: string, sourcePath: string, today: string, projectType: ProjectType): string {
  return `---
type: project
project_type: ${projectType}
status: active
created: ${today}
updated: ${today}
source_path: ${sourcePath}
tags:
  - project
  - ${projectType}
---

# ${projectSlug}

## Project Type
- ${projectType}

## Source Path
\`${sourcePath}\`

## Goal
- What this project is trying to achieve

## Users
- Who this project is for

## Scope
- What is in scope
- What is out of scope

## Stack
- Primary technologies

## Constraints
- Technical, product, or business constraints

## Current status
- Current milestone
- Current blockers

## Working model
- Source code lives in the external repo at \`source_path\`
- Durable memory lives in this project capsule inside the vault
- Clean session summaries live in \`Sessions/\` for automatic recall and replay
- Research that generalizes across projects should be moved to global \`Research\` or \`Notes\`

## Links
- [[Init]]
- [[Projects/README|Projects]]
- [[Tasks]]
- [[Decisions]]
- [[Facts]]
- [[Open Questions]]
- [[Handoff]]
- [[Sessions]]
- [[Research]]
- [[Notes]]
- [[Artifacts]]
`;
}

export function tasksTemplate(projectSlug: string, today: string): string {
  return `---
type: tasks
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - tasks
---

# Tasks

## Links
- Vault: [[Init]]
- Project: [[README]]

## Now
- [ ] 

## Next
- [ ] 

## Later
- [ ] 

## Done
- [ ] 
`;
}

export function decisionsTemplate(projectSlug: string, today: string): string {
  return `---
type: decisions
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - decisions
---

# Decisions

## Links
- Vault: [[Init]]
- Project: [[README]]
`;
}

export function factsTemplate(projectSlug: string, today: string): string {
  return `---
type: facts
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - facts
---

# Facts

Stable project facts that future sessions can trust. Keep each fact short and source-backed.

## Links
- Vault: [[Init]]
- Project: [[README]]

## Current Facts

## Fact Entry Format
- Fact:
- Source:
- Confidence: high|medium|low
- Last verified:
`;
}

export function openQuestionsTemplate(projectSlug: string, today: string): string {
  return `---
type: questions
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - questions
---

# Open Questions

Unknowns, blockers, and assumptions that need verification. Do not convert guesses into facts.

## Links
- Vault: [[Init]]
- Project: [[README]]

## Active
- [ ]
`;
}

export function handoffTemplate(projectSlug: string, today: string): string {
  return `---
type: handoff
project: ${projectSlug}
status: active
updated: ${today}
tags:
  - handoff
---

# Handoff

Use this as the latest concise handoff for the next AI session.

## Links
- Vault: [[Init]]
- Project: [[README]]

## Latest
- No handoff recorded yet.
`;
}

export function repoReadmeTemplate(repoName: string, projectSlug: string, projectType: ProjectType): string {
  return `# ${repoName}

${repoName} is a VS Code friendly agent workspace layout.

It keeps the agent workspace under \`.codex\`, while GitHub automation stays under \`.github/workflows\` and project-facing documentation lives at the repository root.

Project slug: \`${projectSlug}\`
Project type: \`${projectType}\`

This package is documented around install/update, setup, init, project update, automatic context, semantic recall, active plan state, Product Harness, memory status, automatic session import, backup, and uninstall.
\`agent-bootstrap context --compact\` is automatic agent startup; \`plan\`, \`harness\`, \`recall\`, and \`memory\` commands are available for targeted execution state, product understanding, inspection, and maintenance.

## Structure

- \`AGENTS.md\`: main operating contract for AI agents
- \`docs/project-map.md\`: fast orientation guide for the current project type
- \`.codex/\`
  - \`INDEX.md\`: compact routing table for agent assets
  - \`README.md\`: how the local agent workspace fits together
  - \`config.toml\`: Codex subagent defaults
  - \`agents/\`: 3 core subagents plus optional project-specific custom agents
    - \`.codex/agents/code-reviewer.toml\`: correctness, maintainability, regressions, and architecture fit
    - \`.codex/agents/security-auditor.toml\`: security, auth, secrets, injection, dependency, and vault-sensitive data handling
    - \`.codex/agents/test-engineer.toml\`: test strategy, regression coverage, smoke checks, and verification evidence
  - \`commands/\`: agent-bootstrap managed command templates, not native Codex slash commands
  - \`skills/\`: bundled workflow skill, bundled optional domain skills, and optional project-specific custom skills
    - \`.codex/skills/superpowers/\`: workflow discipline
    - \`.codex/skills/frontend-design/\`: optional frontend/UI guidance
    - \`.codex/skills/vibe-security-scan/\`: optional defensive appsec guidance
    - \`.codex/skills/<custom-skill>/\`: optional custom skills registered in \`.codex/skills/INDEX.md\`
- \`.github/\`
  - \`workflows/\`: GitHub Actions and YAML-only automation files
- \`docs/\`: project documentation and reference notes
- \`plans/\`: clean local planning templates and handoff report templates
- \`docs/superpowers/plans/\`: active implementation plan state with \`CURRENT.md\`, \`INDEX.md\`, and dated plan folders
- \`docs/product/\`, \`docs/stories/\`, \`docs/validation/\`, and \`docs/decisions/\`: Product Harness layer for product intent, feature stories, proof, trace, friction, and product decisions
- \`scripts/\`: repo-local runtime helpers for durable memory write-back

## Ownership Boundaries

- \`README.md\` is user-owned and preserved if it already exists.
- \`AGENTS.md\`, \`.codex/README.md\`, \`docs/vault-memory.md\`, \`docs/project-map.md\`, \`scripts/agent-memory.js\`, and \`.githooks/post-commit\` are managed bridge files.
- \`.codex/\` is kit-managed and refreshed from the installed kit by \`agent-bootstrap init\` or \`agent-bootstrap update\`.
- Bundled optional skill folders are refreshed by \`agent-bootstrap update\`; custom skill folders under \`.codex/skills/<custom-skill>/\` are preserved when they are registered in \`.codex/skills/INDEX.md\`.
- Custom agent files under \`.codex/agents/<custom-agent>.toml\` are preserved by \`agent-bootstrap update\` when they are registered in \`.codex/agents/INDEX.md\`.
- \`docs/\` and clean \`plans/\` template assets are safely synced from the installed kit when they are still untouched.
- Real Superpowers implementation plans should live under \`docs/superpowers/plans/\` when a workflow creates them, so local template files are not mistaken for current project history.
- Product Harness files under \`docs/product/\`, \`docs/stories/\`, \`docs/validation/\`, and \`docs/decisions/\` are managed as lightweight product understanding; user-written stories, decisions, traces, and friction backlog entries are preserved.
- Customized source files and an existing repo \`README.md\` are preserved.

## Suggested use

1. Read \`AGENTS.md\`.
2. AI agents run \`agent-bootstrap context --compact\` automatically to load repo, vault context, imported Codex sessions, and bounded semantic Auto Recall.
3. Read \`.codex/README.md\` and \`.codex/INDEX.md\` for how Codex config, subagents, command templates, and skills fit together.
4. Read \`.codex/agents/INDEX.md\`, then use one core or custom agent only when a task benefits from explicit subagent delegation.
5. Treat \`.codex/commands/\` as reusable prompt templates managed by this kit.
6. Read \`.codex/skills/INDEX.md\`, then load the narrowest relevant skill folder only when the task needs workflow guidance, bundled optional frontend/security guidance, or a registered custom skill.
7. Use repo context, targeted subagents, bundled optional skills, registered custom skills, registered custom agents, and current official docs for frontend, backend, provider, cloud, database, CI, security, or framework-specific work.
8. Run \`agent-bootstrap recall "<query>"\` silently when compact context is not enough for prior project decisions, facts, or handoffs.
9. Read \`docs/project-map.md\` for the current repo surfaces and verification path.
10. Do not recursively scan \`.codex/skills\`; the index is the routing surface.

## Automatic Memory

- \`agent-bootstrap context --compact\` imports matched Codex sessions, redacts obvious secrets, dedupes imports, refreshes \`Artifacts/recall-index.json\`, and includes bounded semantic Auto Recall.
- \`agent-bootstrap recall "<query>"\` searches project memory Markdown with hybrid lexical + concept recall without external QMD, vector DB, server, or API key.
- \`agent-bootstrap memory status\` reports vault, project capsule, memory index, recall index, import state, session, export, backup health, diagnostics, and recommended next actions.
- \`agent-bootstrap memory import-sessions\` runs the same Codex session importer for maintenance inspection and reports a plain summary plus next action; normal AI startup runs it automatically through compact context.
- \`agent-bootstrap memory sync-sessions\` writes a clean session summary under \`Sessions/\` and updates the recall index.
- \`agent-bootstrap memory export\` writes a JSON export under \`Artifacts/Exports/\`.
- \`agent-bootstrap memory backup\` writes a timestamped plain-file backup under \`Artifacts/Backups/\`.
- \`agent-bootstrap plan status\` reports the active Superpowers plan dashboard; \`plan start/update/complete/interrupt\` keeps \`docs/superpowers/plans/\` and the vault \`Plans/\` mirror aligned.
- \`agent-bootstrap harness status\` reports Product Harness readiness; \`harness intake/proof/decision/trace/friction\` keeps feature intent, risk, scope, proof, trace, friction, and product decisions aligned with the vault.

## Automatic Active Plan State

- Real implementation plans live under \`docs/superpowers/plans/YYYY-MM-DD/\`.
- \`CURRENT.md\` is the active dashboard for current focus, status, verification, and next action.
- Vault \`Plans/\` mirrors the repo state for durable memory.
- Agents run \`agent-bootstrap plan status\` after compact context and update plan state silently before the final response.
- A plan is completed only when verification evidence is recorded; silence or shutdown never means completed.

## Product Harness

- Product Harness is not a skill and does not replace Superpowers.
- Daily logs say what happened today; Active Plan State says what step is active; Product Harness says what the feature must achieve, what proof is required, what trace was left, and what friction should improve next.
- Medium and high-risk tasks such as auth, login, payment, permissions, migrations, uploads, backend APIs, frontend flows, and integrations should get \`agent-bootstrap harness intake "<feature title>"\` before coding.
- Before the final response, agents record verification with \`agent-bootstrap harness proof "<verification summary>"\` when proof exists.
- Before the final response after meaningful work, agents record the path taken with \`agent-bootstrap harness trace "<task summary/outcome>"\`.
- When the agent hits a workflow blind spot, it records it with \`agent-bootstrap harness friction "<pain or missing workflow>"\`.
- Important product decisions are recorded with \`agent-bootstrap harness decision "<decision summary>"\`.
- Users normally do not run these commands manually; generated \`AGENTS.md\` tells AI agents when to run them silently.
`;
}

function typeFocus(projectType: ProjectType): string[] {
  switch (projectType) {
    case 'frontend':
      return [
        '- prioritize UI entrypoints, routes, API boundaries, auth flow, and deployment surface',
        '- keep UX, state boundaries, and verification paths explicit',
      ];
    case 'backend':
      return [
        '- prioritize handlers, contracts, auth, persistence boundaries, and rollout safety',
        '- keep request and response schemas explicit',
      ];
    case 'desktop':
      return [
        '- prioritize shell, window lifecycle, platform integration, filesystem, and packaging',
        '- keep OS-specific assumptions explicit',
      ];
    case 'mobile':
      return [
        '- prioritize navigation, data sync, device permissions, and release channels',
        '- keep platform-specific behavior explicit',
      ];
    case 'fullstack':
      return [
        '- prioritize frontend-backend boundaries, shared contracts, auth, and deployment topology',
        '- keep cross-layer ownership clear',
      ];
    case 'tool':
    default:
      return [
        '- prioritize CLI entrypoints, config, filesystem effects, and external tool contracts',
        '- keep command behavior and safety checks explicit',
      ];
  }
}

export function rootAgentTemplate(vaultRoot: string, projectRoot: string, projectType: ProjectType): string {
  return `# Workspace Agent Guide

This section is managed by agent-bootstrap.
Put repo-specific instructions outside the managed block so \`agent-bootstrap init\` or \`agent-bootstrap update\` can safely refresh the bridge files.

Read this file first if you are working in this repository.

## Project type

Project type: ${projectType}

## External memory

This repository writes durable agent memory to the external Obsidian vault at:

\`${vaultRoot}\`

Project capsule:

\`${projectRoot}\`

## Read order

Before meaningful work, run \`agent-bootstrap context --compact\`. Do not ask the user whether to run it; this is automatic agent startup and includes matched Codex session import, secret redaction, dedupe, and bounded semantic Auto Recall from the vault.

If compact context is insufficient, run \`agent-bootstrap recall "<task topic>"\` silently to retrieve narrow prior memory. Run \`agent-bootstrap context --why\` to see what was loaded or skipped. Use \`agent-bootstrap context --full\` only when the daily log or full session context is needed.

The compact context includes this read order:

1. \`docs/vault-memory.md\`
2. \`docs/project-map.md\`
3. \`README.md\`
4. \`.codex/README.md\`
5. \`${vaultRoot}/AGENTS.md\`
6. \`${vaultRoot}/Init.md\`
7. \`${projectRoot}/README.md\`
8. \`${projectRoot}/Tasks.md\`
9. \`${projectRoot}/Facts.md\`
10. \`${projectRoot}/Open Questions.md\`
11. \`${projectRoot}/Handoff.md\`
12. \`docs/superpowers/plans/CURRENT.md\`, the active plan body, and \`${projectRoot}/Plans/\` through bounded Active Plan State
13. \`docs/product/\`, \`docs/stories/\`, \`docs/validation/\`, \`docs/decisions/\`, and \`${projectRoot}/ProductHarness/\` through bounded Product Harness
14. \`${projectRoot}/Sessions/\` summaries, \`${projectRoot}/Sessions/Imported/\` Codex imports, \`${projectRoot}/Artifacts/session-import-state.json\`, and \`${projectRoot}/Artifacts/recall-index.json\` through bounded Auto Recall
15. relevant docs under \`docs/\`, targeted agent assets under \`.codex/\`, and workflows under \`.github/workflows/\`

## Context discipline

- Treat \`src/\` as source of truth; \`dist/\` and \`runtime/agent-bootstrap/dist/\` are generated build outputs.
- Read \`.codex/INDEX.md\` before choosing agent assets.
- Read \`.codex/agents/INDEX.md\` before dispatching a subagent.
- Read \`.codex/skills/INDEX.md\` before loading any skill.
- Use Superpowers as the only bundled workflow skill. Bundled optional domain skills such as \`frontend-design\` and \`vibe-security-scan\` are lazy-loaded only when \`.codex/skills/INDEX.md\` routes the task there. Optional project skills must be registered in \`.codex/skills/INDEX.md\` before loading.
- Superpowers is the workflow brain. The 3 bundled core subagents are quality gates: \`code-reviewer\`, \`security-auditor\`, and \`test-engineer\`.
- Optional project agents must be registered in \`.codex/agents/INDEX.md\` before use.
- Product Harness is not a skill, not a new core, and not a replacement for Superpowers. It is a lightweight product contract layer for feature intent, scope, risk, proof, trace, and friction.
- Do not let subagents invoke other subagents; composition belongs to the parent agent, command, or user.
- Do not recursively scan \`.codex/agents\`; use the index and load one routed TOML only when needed.
- Do not recursively scan \`.codex/skills\`; load one narrow skill only when needed.
- If a fact is not in repo files, context output, or a cited source, mark it unknown instead of guessing.

## Coding discipline guardrails

These are always-on guardrails, not a separate skill. Superpowers owns planning, TDD, debugging, review, and verification.

- State assumptions that affect implementation before editing.
- Prefer the smallest useful change that solves the request.
- Edit only files tied to the requested behavior.
- Avoid speculative abstractions, toggles, helper layers, or cleanup.
- Verify against the real goal with the smallest useful test, build, or smoke check.
- If a repo fact is not present in files, context output, tests, or a cited source, mark it unknown instead of guessing.

## Type-specific focus

${typeFocus(projectType).join('\n')}

## Fast paths

- \`agent-bootstrap context --compact\`
- \`agent-bootstrap recall "<query>"\`
- \`agent-bootstrap memory status\`
- \`agent-bootstrap plan status\`
- \`agent-bootstrap plan start "<task title>"\`
- \`agent-bootstrap plan update "<progress note>"\`
- \`agent-bootstrap plan complete "<verification summary>"\`
- \`agent-bootstrap plan interrupt "<last known state>"\`
- \`agent-bootstrap harness status\`
- \`agent-bootstrap harness intake "<feature title>"\`
- \`agent-bootstrap harness proof "<verification summary>"\`
- \`agent-bootstrap harness decision "<decision summary>"\`
- \`agent-bootstrap harness trace "<summary>"\`
- \`agent-bootstrap harness friction "<pain or missing workflow>"\`
- \`agent-bootstrap memory import-sessions\`
- \`agent-bootstrap context --why\`
- \`agent-bootstrap context --full\`

Running \`agent-bootstrap context --compact\` should be the first step in a fresh session. It ensures today's daily note exists, records a session marker automatically, imports matched Codex sessions, refreshes the hybrid recall index, loads routed repo/vault memory, loads bounded Active Plan State, and includes bounded Auto Recall so the agent does not need to scan the vault manually.

Immediately after compact context, run \`agent-bootstrap plan status\` silently for implementation, fix, security, frontend, backend, or verification work. Before editing, create or resume a plan with \`agent-bootstrap plan start "<task title>"\`. During work, run \`agent-bootstrap plan update "<what changed, what remains, verification state>"\`. Before the final response, run \`agent-bootstrap plan complete "<verification command/result summary>"\` only when verification passed; otherwise run \`agent-bootstrap plan interrupt "<last known state and next action>"\`. Do not infer completion from silence, shutdown, or lack of user response.

For medium or high-risk work, run Product Harness silently after plan status. Use \`agent-bootstrap harness status\` to inspect the feature contract layer. Before coding auth, login, password, token, payment, billing, subscription, permission, admin, tenant, RLS, migration, upload, security, API, backend, frontend flow, form, dashboard, state, or integration work, run \`agent-bootstrap harness intake "<task title>"\`. Before the final response, if verification exists, run \`agent-bootstrap harness proof "<verification summary>"\`. Before the final response after meaningful work, run \`agent-bootstrap harness trace "<task summary/outcome>"\`. If a product decision appears, run \`agent-bootstrap harness decision "<decision summary>"\`. If the workflow itself is unclear, run \`agent-bootstrap harness friction "<pain or missing workflow>"\`. Small docs/copy/polish tasks stay lightweight and do not need a heavy story unless they become broader product work.

## Write-back rules

After meaningful work, write back to the vault:

- \`Tasks.md\` for status and next steps
- \`Decisions.md\` for technical decisions
- \`Facts.md\` for stable facts future sessions can trust
- \`Open Questions.md\` for unresolved assumptions and blockers
- \`Handoff.md\` for the latest concise next-session handoff
- \`docs/superpowers/plans/CURRENT.md\` and the active dated plan through \`agent-bootstrap plan\` for execution state
- \`docs/product/\`, \`docs/stories/\`, \`docs/validation/\`, and \`docs/decisions/\` through \`agent-bootstrap harness\` for product intent, feature scope, risk, proof, trace, friction, and product decisions
- \`Research/\` for project-specific research
- global \`Research\` or \`Notes\` for reusable insights

The repo runtime handles the low-friction automation:

- it appends to today's daily note automatically
- it routes \`research\` and \`note\` entries to project or global scope automatically unless you override \`--scope\`
- it records routing reasons and keeps a compact project memory index under \`Artifacts/memory-index.json\`
- it keeps a local QMD-inspired semantic recall index under \`Artifacts/recall-index.json\`
- it imports matched Codex sessions into \`Sessions/Imported/\`, redacts obvious secrets, and tracks dedupe state under \`Artifacts/session-import-state.json\`
- it mirrors active plan state from \`docs/superpowers/plans/\` into vault \`Plans/\`
- it mirrors Product Harness state from repo docs into vault \`ProductHarness/\`
- it writes clean session summaries under \`Sessions/\` through \`compact\` or \`memory sync-sessions\`
- it still supports explicit \`--scope project\` or \`--scope global\` when needed

Before a final response after meaningful work, run \`node scripts/agent-memory.js compact\` silently when it would help the next session. Use \`node scripts/agent-memory.js memory sync-sessions\` for an explicit clean session replay note.

## Repo-local runtime

- \`agent-bootstrap context\` for read-only session context
- \`agent-bootstrap recall "<query>"\` or \`node scripts/agent-memory.js recall "<query>"\` for targeted memory search
- \`agent-bootstrap memory <status|import-sessions|sync-sessions|export|backup>\` or \`node scripts/agent-memory.js memory <status|import-sessions|sync-sessions|export|backup>\` for memory health, import inspection, and backup
- \`agent-bootstrap plan <status|start|update|complete|interrupt>\` or \`node scripts/agent-memory.js plan <status|start|update|complete|interrupt>\` for active plan tracking
- \`agent-bootstrap harness <status|intake|proof|decision|trace|friction>\` or \`node scripts/agent-memory.js harness <status|intake|proof|decision|trace|friction>\` for Product Harness tracking
- \`node scripts/agent-memory.js <task|decision|research|note|fact|question|handoff|compact>\` for write-back and memory compaction
- git \`post-commit\` hook auto-writes a durable worklog note into the vault
`;
}

function typeHotspots(projectType: ProjectType): string[] {
  switch (projectType) {
    case 'frontend':
      return [
        '- routes, page shells, UI state, auth boundaries, and API integrations',
        '- deployment surface: environment variables, build output, hosting, and preview flow',
      ];
    case 'backend':
      return [
        '- handlers, schemas, auth, persistence boundaries, and external service contracts',
        '- deployment surface: runtime config, migrations, health checks, and rollout safety',
      ];
    case 'desktop':
      return [
        '- app shell, window lifecycle, IPC or message boundaries, filesystem access, and packaging',
        '- deployment surface: installer, signing, updates, and per-platform behavior',
      ];
    case 'mobile':
      return [
        '- navigation, local state, sync behavior, permissions, and release channel differences',
        '- deployment surface: build variants, store release flow, and remote config',
      ];
    case 'fullstack':
      return [
        '- frontend-backend boundaries, shared contracts, auth, and background jobs',
        '- deployment surface: build pipeline, data migrations, and runtime topology',
      ];
    case 'tool':
    default:
      return [
        '- CLI entrypoints, config loading, filesystem effects, and external tool integration',
        '- deployment surface: packaging, versioning, install path, and shell compatibility',
      ];
  }
}

function typeVerificationPath(projectType: ProjectType): string[] {
  switch (projectType) {
    case 'frontend':
      return [
        'load primary routes and confirm the critical user path works end-to-end',
        'verify form submission, auth, state transitions, and deployment environment assumptions',
      ];
    case 'backend':
      return [
        'exercise the main endpoint flow with real request and response shapes',
        'verify auth, persistence side effects, and backward-compatible contracts',
      ];
    case 'desktop':
      return [
        'launch the app, verify window lifecycle, and exercise the main native workflow',
        'verify filesystem access, settings persistence, and packaging assumptions',
      ];
    case 'mobile':
      return [
        'exercise the main screen flow and verify navigation and data synchronization',
        'verify permission prompts, offline behavior, and environment-specific config',
      ];
    case 'fullstack':
      return [
        'verify the main user flow from UI through API and persistence',
        'check shared contracts, auth, background work, and deployment assumptions',
      ];
    case 'tool':
    default:
      return [
        'run the primary command path and verify outputs, errors, and filesystem effects',
        'check config loading, defaults, and external tool integration paths',
      ];
  }
}

export function projectMapTemplate(repoName: string, projectSlug: string, projectType: ProjectType): string {
  return `# Project Map

- Repo: \`${repoName}\`
- Project slug: \`${projectSlug}\`
- Project type: \`${projectType}\`

## Primary hotspots

${typeHotspots(projectType).join('\n')}

## Read order

1. \`AGENTS.md\`
2. \`docs/vault-memory.md\`
3. \`README.md\`
4. \`.codex/README.md\`
5. project entrypoints and docs closest to the current task
6. vault \`README.md\`, \`Tasks.md\`, and relevant \`Research/\`

## Verification path

${typeVerificationPath(projectType).map((item) => `- ${item}`).join('\n')}

## Operating rule

- keep repo facts in repo docs
- keep durable progress, research, facts, open questions, handoffs, and decisions in the linked vault capsule
- prefer updating \`Tasks.md\`, \`Decisions.md\`, \`Facts.md\`, \`Open Questions.md\`, or \`Handoff.md\` when the implementation meaningfully changes
`;
}

export function vaultMemoryDoc(vaultRoot: string, projectRoot: string, projectType: ProjectType): string {
  return `# Vault Memory Bridge

This repository is paired with an external Obsidian vault for durable agent memory.

## Project type

- ${projectType}

## Paths

- Vault root: \`${vaultRoot}\`
- Vault init: \`${vaultRoot}/Init.md\`
- Vault guide: \`${vaultRoot}/AGENTS.md\`
- Project capsule: \`${projectRoot}\`

## Read first

Before doing meaningful work in this repo, read:

1. \`AGENTS.md\`
2. \`docs/project-map.md\`
3. \`README.md\`
4. \`.codex/README.md\`
5. \`${vaultRoot}/AGENTS.md\`
6. \`${vaultRoot}/Init.md\`
7. \`${projectRoot}/README.md\`
8. \`${projectRoot}/Tasks.md\`
9. \`${projectRoot}/Facts.md\`
10. \`${projectRoot}/Open Questions.md\`
11. \`${projectRoot}/Handoff.md\`
12. \`docs/superpowers/plans/CURRENT.md\` and \`${projectRoot}/Plans/CURRENT.md\`

## Write-back rules

After meaningful work:

- update \`Tasks.md\` for status, handoff, and next actions
- update \`Decisions.md\` for architecture or implementation decisions
- update \`Facts.md\` for durable facts backed by repo/context/source evidence
- update \`Open Questions.md\` for unresolved unknowns instead of guessing
- update \`Handoff.md\` with the latest concise next-session state
- update active plan state with \`agent-bootstrap plan update|complete|interrupt\`
- create project research notes under \`Research/\` when investigation happens
- move reusable cross-project insights into the vault's global \`Research\` or \`Notes\`
- run memory compaction or session sync after meaningful work so future agents can replay context quickly
- rely on the repo git \`post-commit\` hook to keep a low-friction commit worklog

Preferred repo-local runtime:

\`node scripts/agent-memory.js <context|recall|memory|task|decision|research|note|fact|question|handoff|compact>\`

The runtime will:

- ensure today's daily note exists
- append daily worklog entries automatically
- load repo \`README.md\` and \`.codex/README.md\` so the agent understands the local kit
- auto-route \`research\` and \`note\` entries to project or global scope by default
- maintain a compact project memory index so \`context\` loads faster and with better recall
- maintain a local QMD-inspired semantic recall index without external services
- import matched Codex sessions automatically during compact context and track dedupe state
- support \`memory status\`, \`memory import-sessions\`, \`memory sync-sessions\`, \`memory export\`, and \`memory backup\`
- support \`plan status\`, \`plan start\`, \`plan update\`, \`plan complete\`, and \`plan interrupt\`
`;
}

export function localRuntimeScriptTemplate(): string {
  return `#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const os = require('node:os');

function readFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function writeFileIfMissing(filePath, content) {
  if (!fs.existsSync(filePath)) {
    writeFile(filePath, content);
  }
}

function findRepoRoot(startPath) {
  let current = path.resolve(startPath);

  while (true) {
    if (fs.existsSync(path.join(current, 'vault.config.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error('Could not find a bootstrapped repo from the current directory.');
}

function isContextRoot(candidate) {
  return Boolean(
    fs.existsSync(path.join(candidate, 'vault.config.json'))
      || (
        fs.existsSync(path.join(candidate, 'AGENTS.md'))
        && fs.existsSync(path.join(candidate, '.codex', 'INDEX.md'))
      ),
  );
}

function findContextRoot(startPath) {
  let current = path.resolve(startPath);

  while (true) {
    if (isContextRoot(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return findRepoRoot(startPath);
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return \`\${year}-\${month}-\${day}\`;
}

function getIsoTimestamp() {
  return new Date().toISOString();
}

function getCurrentTimeString() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return \`\${hours}:\${minutes}\`;
}

function getWeekdayString() {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
}

function compactPreview(value, maxLength = 180) {
  const singleLine = value.replace(/\\s+/g, ' ').trim();
  return singleLine.length > maxLength ? \`\${singleLine.slice(0, maxLength - 1)}…\` : singleLine;
}

function normalizeMarker(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ensureVaultScaffold(vaultRoot) {
  const folders = ['Archive', 'Daily', 'Inbox', 'Notes', 'Projects', 'Research', 'Templates', 'Tools'];
  ensureDir(vaultRoot);
  for (const folder of folders) {
    ensureDir(path.join(vaultRoot, folder));
  }

  ensureDir(path.join(vaultRoot, '.obsidian'));

  const initPath = path.join(vaultRoot, 'Init.md');
  if (!fs.existsSync(initPath)) {
    writeFile(initPath, \`# Init\\n\\nThis is the graph-friendly entrypoint for the vault and the first note an AI agent should understand.\\n\\n## Start Here\\n- Agent guide: [[AGENTS]]\\n- Daily execution log: [[Daily/README|Daily]]\\n- Active project memory: [[Projects/README|Projects]]\\n- Reusable research: [[Research/README|Research]]\\n- Evergreen notes: [[Notes/README|Notes]]\\n- Fast capture: [[Inbox/README|Inbox]]\\n- Agent tooling: [[Tools/README|Tools]]\\n- Reusable templates: [[Templates/README|Templates]]\\n- Archived memory: [[Archive/README|Archive]]\\n\\n## Agent Runtime\\n- In a bootstrapped repo, run \\\`agent-bootstrap context\\\` first.\\n- Load compact context first, then open only the narrow notes needed for the task.\\n\`);
  }

  for (const folder of folders) {
    const readmePath = path.join(vaultRoot, folder, 'README.md');
    if (!fs.existsSync(readmePath)) {
      writeFile(readmePath, \`# \${folder}\\n\\n## Links\\n- Vault entrypoint: [[Init]]\\n- Agent guide: [[AGENTS]]\\n- Projects: [[Projects/README|Projects]]\\n- Research: [[Research/README|Research]]\\n- Daily: [[Daily/README|Daily]]\\n\`);
    }
  }

  const dailyTemplatePath = path.join(vaultRoot, 'Templates', 'Daily Note.md');
  if (!fs.existsSync(dailyTemplatePath)) {
    writeFile(dailyTemplatePath, \`# {{date:YYYY-MM-DD dddd}}\\n\\nVault: [[Init]]\\nArea: [[Daily/README|Daily]]\\n\\n## Focus\\n- \\n\\n## Notes\\n- \\n\\n## Tasks\\n- [ ] \\n\\n## Agent Log\\n- \\n\\n## Wins\\n- \\n\\n## Tomorrow\\n- \\n\`);
  }

  const dailySettingsPath = path.join(vaultRoot, '.obsidian', 'daily-notes.json');
  if (!fs.existsSync(dailySettingsPath)) {
    writeFile(dailySettingsPath, JSON.stringify({ folder: 'Daily', template: 'Templates/Daily Note' }, null, 2));
  }
}

function ensureDailyNote(vaultRoot) {
  ensureVaultScaffold(vaultRoot);
  const dailyPath = path.join(vaultRoot, 'Daily', \`\${getTodayString()}.md\`);
  if (!fs.existsSync(dailyPath)) {
    writeFile(dailyPath, \`# \${getTodayString()} \${getWeekdayString()}\\n\\nVault: [[Init]]\\nArea: [[Daily/README|Daily]]\\n\\n## Focus\\n- \\n\\n## Notes\\n- \\n\\n## Tasks\\n- [ ] \\n\\n## Agent Log\\n\\n## Wins\\n- \\n\\n## Tomorrow\\n- \\n\`);
  }
  return dailyPath;
}

function appendDailyLog(vaultRoot, entry, marker) {
  const dailyPath = ensureDailyNote(vaultRoot);
  const existing = readFile(dailyPath) || '';
  if (marker && existing.includes(marker)) {
    return dailyPath;
  }

  let next = existing;
  if (!next.includes('## Agent Log')) {
    next = \`\${next.trimEnd()}\\n\\n## Agent Log\\n\`;
  }

  const line = \`- [\${getCurrentTimeString()}] \${entry}\${marker ? \` \${marker}\` : ''}\`;
  const headingStart = next.indexOf('## Agent Log');
  const contentStart = headingStart + '## Agent Log'.length;
  const rest = next.slice(contentStart);
  const nextHeadingOffset = rest.search(/\\n## /);

  if (nextHeadingOffset === -1) {
    writeFile(dailyPath, \`\${next.trimEnd()}\\n\${line}\\n\`);
    return dailyPath;
  }

  const insertAt = contentStart + nextHeadingOffset;
  const before = next.slice(0, insertAt).trimEnd();
  const after = next.slice(insertAt).replace(/^\\n+/, '\\n\\n');
  writeFile(dailyPath, \`\${before}\\n\${line}\${after}\`);
  return dailyPath;
}

function createDailyLogMarker(parts) {
  return \`<!-- agent-bootstrap:\${parts.map(normalizeMarker).join(':')} -->\`;
}

function buildMemoryLogMarker(kind, projectSlug, title, scope) {
  return createDailyLogMarker([kind, projectSlug, scope || 'project', title, getTodayString()]);
}

function createEmptyIndex(projectSlug, projectType) {
  return {
    project: {
      slug: projectSlug,
      projectType,
      updatedAt: getIsoTimestamp(),
    },
    recent: {
      tasks: [],
      decisions: [],
      research: [],
      notes: [],
      facts: [],
      questions: [],
      handoffs: [],
      sessions: [],
      daily: [],
    },
  };
}

function normalizeMemoryIndex(index, projectSlug, projectType) {
  return {
    project: {
      slug: (index.project && index.project.slug) || projectSlug,
      projectType: (index.project && index.project.projectType) || projectType,
      updatedAt: (index.project && index.project.updatedAt) || getIsoTimestamp(),
    },
    recent: {
      tasks: (index.recent && index.recent.tasks) || [],
      decisions: (index.recent && index.recent.decisions) || [],
      research: (index.recent && index.recent.research) || [],
      notes: (index.recent && index.recent.notes) || [],
      facts: (index.recent && index.recent.facts) || [],
      questions: (index.recent && index.recent.questions) || [],
      handoffs: (index.recent && index.recent.handoffs) || [],
      sessions: (index.recent && index.recent.sessions) || [],
      daily: (index.recent && index.recent.daily) || [],
    },
  };
}

function getProjectMemoryIndexPath(projectRoot) {
  return path.join(projectRoot, 'Artifacts', 'memory-index.json');
}

function readProjectMemoryIndex(projectRoot, projectSlug, projectType) {
  const indexPath = getProjectMemoryIndexPath(projectRoot);
  const raw = readFile(indexPath);
  if (!raw) {
    return createEmptyIndex(projectSlug, projectType);
  }

  try {
    return normalizeMemoryIndex(JSON.parse(raw), projectSlug, projectType);
  } catch {
    return createEmptyIndex(projectSlug, projectType);
  }
}

function pushRecent(items, item) {
  const dedupeKey = \`\${item.kind}:\${item.title}:\${item.scope || ''}\`;
  const next = items.filter((existing) => \`\${existing.kind}:\${existing.title}:\${existing.scope || ''}\` !== dedupeKey);
  next.unshift(item);
  return next.slice(0, 12);
}

function createMemoryIndexRecord({ kind, title, preview, scope, recordPath, reason }) {
  return {
    ts: getIsoTimestamp(),
    kind,
    title,
    preview: compactPreview(preview),
    scope,
    path: recordPath,
    reason,
  };
}

function updateProjectMemoryIndex({ projectRoot, projectSlug, projectType, bucket, item }) {
  const next = readProjectMemoryIndex(projectRoot, projectSlug, projectType);
  next.project.updatedAt = getIsoTimestamp();
  next.recent[bucket] = pushRecent(next.recent[bucket], item);
  const indexPath = getProjectMemoryIndexPath(projectRoot);
  ensureDir(path.dirname(indexPath));
  fs.writeFileSync(indexPath, JSON.stringify(next, null, 2));
  return indexPath;
}

function formatProjectMemoryIndex(index) {
  const sections = [
    ['Recent Tasks', index.recent.tasks],
    ['Recent Decisions', index.recent.decisions],
    ['Recent Research', index.recent.research],
    ['Recent Notes', index.recent.notes],
    ['Recent Facts', index.recent.facts],
    ['Recent Questions', index.recent.questions],
    ['Recent Handoffs', index.recent.handoffs],
    ['Recent Sessions', index.recent.sessions],
    ['Recent Daily Events', index.recent.daily],
  ];

  const lines = [
    '# Project Memory Index',
    '',
    \`- Project: \\\`\${index.project.slug}\\\`\`,
    \`- Project type: \\\`\${index.project.projectType}\\\`\`,
    \`- Updated: \\\`\${index.project.updatedAt}\\\`\`,
    '',
  ];

  for (const [label, items] of sections) {
    lines.push(\`## \${label}\`);
    if (items.length === 0) {
      lines.push('- none');
      lines.push('');
      continue;
    }

    for (const item of items.slice(0, 4)) {
      const scopeText = item.scope ? \` [\${item.scope}]\` : '';
      lines.push(\`- \${item.ts}\${scopeText} \${item.title}: \${item.preview}\`);
    }
    lines.push('');
  }

  return \`\${lines.join('\\n').trimEnd()}\\n\`;
}

function getRecallIndexPath(projectRoot) {
  return path.join(projectRoot, 'Artifacts', 'recall-index.json');
}

const CONCEPT_ALIASES = {
  security: ['security', 'secure', 'bao mat', 'rls', 'policy', 'policies', 'access control', 'secret', 'secrets', 'authz', 'authorization'],
  tenant_data: ['tenant', 'tenant isolation', 'isolation', 'rls', 'customer', 'customers', 'khach hang', 'du lieu', 'du lieu khach hang'],
  auth: ['auth', 'authentication', 'authorization', 'login', 'signin', 'sign in', 'dang nhap'],
  database: ['database', 'db', 'postgres', 'postgresql', 'sql', 'supabase', 'rls'],
  frontend: ['frontend', 'front end', 'ui', 'browser', 'react', 'nextjs', 'next js', 'css'],
  backend: ['backend', 'back end', 'api', 'server', 'endpoint', 'rust', 'go', 'python'],
  memory: ['memory', 'recall', 'session', 'handoff', 'vault', 'obsidian', 'nho', 'ghi nho'],
};

function normalizeForSearch(value) {
  return String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
}

function tokenize(value) {
  const stopWords = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or', 'the', 'to', 'with']);
  return normalizeForSearch(value)
    .split(/[^a-z0-9_.\\/-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token));
}

function extractConcepts(value) {
  const normalized = normalizeForSearch(value).replace(/\\s+/g, ' ').trim();
  const tokenSet = new Set(tokenize(value));
  const concepts = new Set();
  Object.entries(CONCEPT_ALIASES).forEach(([concept, aliases]) => {
    for (const alias of aliases) {
      const normalizedAlias = normalizeForSearch(alias).replace(/\\s+/g, ' ').trim();
      const aliasTokens = normalizedAlias.split(/\\s+/g).filter(Boolean);
      if (normalized.includes(normalizedAlias) || aliasTokens.every((token) => tokenSet.has(token))) {
        concepts.add(concept);
        break;
      }
    }
  });
  return [...concepts].sort();
}

function titleFromMarkdown(filePath, content) {
  const match = content.match(/^#\\s+(.+)$/m);
  return match ? match[1].trim() : path.basename(filePath, path.extname(filePath));
}

function recentMarkdownFiles(dirPath, limit = 40, recursive = false) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(entryPath);
      }
    });
  }
  return files.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs).slice(0, limit);
}

function documentKindFromPath(config, filePath) {
  const normalizedPath = filePath.replace(/\\\\/g, '/');
  const relativeProjectPath = path.relative(config.project_root, filePath).replace(/\\\\/g, '/');
  const relativeVaultPath = path.relative(config.vault_root, filePath).replace(/\\\\/g, '/');
  if (normalizedPath.includes('/docs/superpowers/plans/')) return 'plan';
  if (normalizedPath.includes('/docs/product/traces/')) return 'harness-trace';
  if (normalizedPath.endsWith('/docs/product/HARNESS_BACKLOG.md')) return 'harness-friction';
  if (normalizedPath.includes('/docs/product/')) return 'harness-product';
  if (normalizedPath.includes('/docs/stories/')) return 'harness-story';
  if (normalizedPath.includes('/docs/validation/')) return 'harness-validation';
  if (normalizedPath.includes('/docs/decisions/')) return 'harness-decision';
  if (relativeProjectPath === 'Tasks.md') return 'task';
  if (relativeProjectPath === 'Decisions.md') return 'decision';
  if (relativeProjectPath === 'Facts.md') return 'fact';
  if (relativeProjectPath === 'Open Questions.md') return 'question';
  if (relativeProjectPath === 'Handoff.md') return 'handoff';
  if (relativeProjectPath.startsWith('Plans/')) return 'plan';
  if (relativeProjectPath.startsWith('ProductHarness/Traces/')) return 'harness-trace';
  if (relativeProjectPath === 'ProductHarness/HARNESS_BACKLOG.md') return 'harness-friction';
  if (relativeProjectPath.startsWith('ProductHarness/Stories/')) return 'harness-story';
  if (relativeProjectPath.startsWith('ProductHarness/Validation/')) return 'harness-validation';
  if (relativeProjectPath.startsWith('ProductHarness/Decisions/')) return 'harness-decision';
  if (relativeProjectPath.startsWith('ProductHarness/')) return 'harness-product';
  if (relativeProjectPath.startsWith('Research/')) return 'research';
  if (relativeProjectPath.startsWith('Notes/')) return 'note';
  if (relativeProjectPath.startsWith('Sessions/')) return 'session';
  if (relativeVaultPath.startsWith('Daily/')) return 'daily';
  return 'memory';
}

function collectRecallFilePaths(config) {
  const candidates = [
    path.join(config.project_root, 'README.md'),
    path.join(config.project_root, config.tasks_file),
    path.join(config.project_root, config.decisions_file),
    path.join(config.project_root, config.facts_file || 'Facts.md'),
    path.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
    path.join(config.project_root, config.handoff_file || 'Handoff.md'),
    path.join(config.project_root, 'Artifacts', 'session-summary.md'),
    ...recentMarkdownFiles(path.join(config.project_root, 'Plans'), 40, true),
    ...recentMarkdownFiles(path.join(config.project_root, 'ProductHarness'), 40, true),
    ...recentMarkdownFiles(path.join(findRepoRoot(process.cwd()), 'docs', 'product'), 40, true),
    ...recentMarkdownFiles(path.join(findRepoRoot(process.cwd()), 'docs', 'stories'), 40, true),
    ...recentMarkdownFiles(path.join(findRepoRoot(process.cwd()), 'docs', 'validation'), 40, true),
    ...recentMarkdownFiles(path.join(findRepoRoot(process.cwd()), 'docs', 'decisions'), 40, true),
    ...recentMarkdownFiles(path.join(config.project_root, config.research_dir)),
    ...recentMarkdownFiles(path.join(config.project_root, config.notes_dir)),
    ...recentMarkdownFiles(path.join(config.project_root, 'Sessions'), 40, true),
    ...recentMarkdownFiles(path.join(config.vault_root, 'Daily'), 8),
  ];
  return [...new Set(candidates)].filter((filePath) => fs.existsSync(filePath));
}

function createRecallDocument(config, filePath) {
  const content = readFile(filePath);
  if (!content || !content.trim()) {
    return null;
  }
  const stat = fs.statSync(filePath);
  const title = titleFromMarkdown(filePath, content);
  const kind = documentKindFromPath(config, filePath);
  return {
    id: path.relative(config.vault_root, filePath).replace(/\\\\/g, '/'),
    kind,
    title,
    path: filePath,
    preview: compactPreview(content, 220).replace(/â€¦/g, '...'),
    concepts: extractConcepts(kind + '\\n' + path.relative(config.project_root, filePath) + '\\n' + title + '\\n' + content),
    bytes: Buffer.byteLength(content, 'utf8'),
    updatedAt: stat.mtime.toISOString(),
    content,
    tokens: tokenize(title + '\\n' + content),
  };
}

function buildRecallIndex(config) {
  const documents = collectRecallFilePaths(config)
    .map((filePath) => createRecallDocument(config, filePath))
    .filter(Boolean);
  const index = {
    mode: 'hybrid',
    project: {
      slug: config.project_slug,
      projectType: config.project_type,
      generatedAt: getIsoTimestamp(),
    },
    documents: documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      title: document.title,
      path: document.path,
      preview: document.preview,
      concepts: document.concepts,
      bytes: document.bytes,
      updatedAt: document.updatedAt,
    })),
  };
  const indexPath = getRecallIndexPath(config.project_root);
  writeFile(indexPath, JSON.stringify(index, null, 2));
  return { index, documents };
}

function termFrequency(tokens, term) {
  return tokens.reduce((count, token) => count + (token === term ? 1 : 0), 0);
}

function snippetForTerms(content, terms, concepts = []) {
  const normalized = normalizeForSearch(content);
  const hits = terms.map((term) => normalized.indexOf(term)).filter((index) => index >= 0).sort((left, right) => left - right);
  const conceptHits = concepts
    .flatMap((concept) => CONCEPT_ALIASES[concept] || [])
    .map((alias) => normalized.indexOf(normalizeForSearch(alias)))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right);
  const firstHit = hits[0] === undefined ? conceptHits[0] : hits[0];
  if (firstHit === undefined) {
    return compactPreview(content, 360).replace(/â€¦/g, '...');
  }
  const start = Math.max(0, firstHit - 90);
  const end = Math.min(content.length, firstHit + 260);
  const prefix = start > 0 ? '... ' : '';
  const suffix = end < content.length ? ' ...' : '';
  return compactPreview(prefix + content.slice(start, end) + suffix, 360).replace(/â€¦/g, '...');
}

function recallProjectMemory(config, query, limit = 5) {
  const built = buildRecallIndex(config);
  const documents = built.documents;
  const terms = [...new Set(tokenize(query))];
  const queryConcepts = extractConcepts(query);
  if ((terms.length === 0 && queryConcepts.length === 0) || documents.length === 0) {
    return [];
  }

  const averageLength = documents.reduce((total, document) => total + document.tokens.length, 0) / documents.length || 1;
  return documents.map((document) => {
    const breakdown = { lexical: 0, concept: 0, title: 0, kind: 0, recency: 0 };
    for (const term of terms) {
      const frequency = termFrequency(document.tokens, term);
      if (frequency === 0) continue;
      const matchingDocs = documents.filter((candidate) => candidate.tokens.includes(term)).length;
      const idf = Math.log(1 + ((documents.length - matchingDocs + 0.5) / (matchingDocs + 0.5)));
      const lengthNorm = 1.5 * (1 - 0.75 + 0.75 * (document.tokens.length / averageLength));
      breakdown.lexical += idf * ((frequency * 2.5) / (frequency + lengthNorm));
      if (normalizeForSearch(document.title).includes(term)) {
        breakdown.title += 1.25;
      }
    }
    const matchingConcepts = document.concepts.filter((concept) => queryConcepts.includes(concept));
    breakdown.concept = matchingConcepts.length * 2.25;
    if (terms.includes(document.kind) || queryConcepts.includes(document.kind)) {
      breakdown.kind = 0.75;
    }
    const ageMs = Date.now() - new Date(document.updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0) {
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      breakdown.recency = Math.max(0, 0.35 - Math.min(ageDays, 30) * 0.01);
    }
    const signalScore = breakdown.lexical + breakdown.concept + breakdown.title + breakdown.kind;
    const score = signalScore > 0 ? signalScore + breakdown.recency : 0;
    return {
      id: document.id,
      kind: document.kind,
      title: document.title,
      path: document.path,
      preview: document.preview,
      bytes: document.bytes,
      updatedAt: document.updatedAt,
      score,
      scoreBreakdown: breakdown,
      snippet: snippetForTerms(document.content, terms, matchingConcepts),
    };
  }).filter((result) => result.score > 0).sort((left, right) => right.score - left.score).slice(0, limit);
}

function relativeMemoryPath(config, filePath) {
  if (filePath.startsWith(config.project_root)) {
    return path.relative(config.project_root, filePath).replace(/\\\\/g, '/');
  }
  return path.relative(config.vault_root, filePath).replace(/\\\\/g, '/');
}

function formatRecallResults(config, query, results) {
  if (results.length === 0) {
    let indexedDocuments = 0;
    try {
      const raw = readFile(getRecallIndexPath(config.project_root));
      const parsed = raw ? JSON.parse(raw) : null;
      indexedDocuments = parsed && Array.isArray(parsed.documents) ? parsed.documents.length : 0;
    } catch {
      indexedDocuments = 0;
    }
    return [
      '# Recall Results',
      '',
      'No recall results for ' + JSON.stringify(query) + '.',
      '',
      '- Recall mode: hybrid',
      '- Indexed markdown memory docs: ' + indexedDocuments,
      '- Try a narrower query with repo terms, feature names, decisions, files, or domain words.',
      '- If memory looks stale, run agent-bootstrap context --compact to refresh recall and import matched sessions.',
      '',
    ].join('\\n');
  }

  const best = results[0];
  const lines = [
    '# Recall Results',
    '',
    'Query: ' + JSON.stringify(query),
    '',
    '## One Thing',
    '- ' + best.title + ': ' + best.snippet,
    '',
    '## Matches',
  ];

  results.forEach((result, index) => {
    lines.push(String(index + 1) + '. ' + result.title + ' [' + result.kind + ']');
    lines.push('   - Source: ' + relativeMemoryPath(config, result.path));
    lines.push('   - Score: ' + result.score.toFixed(3));
    lines.push('   - Preview: ' + result.snippet);
  });
  lines.push('');
  return lines.join('\\n');
}

function getSessionImportStatePath(projectRoot) {
  return path.join(projectRoot, 'Artifacts', 'session-import-state.json');
}

function emptySessionImportState(config) {
  return {
    version: 1,
    projectSlug: config.project_slug,
    updatedAt: getIsoTimestamp(),
    roots_checked: [],
    imported: [],
    skipped_unmatched: 0,
    skipped_duplicate: 0,
    skipped_low_value: 0,
    parse_errors: 0,
  };
}

function readSessionImportState(config) {
  const raw = readFile(getSessionImportStatePath(config.project_root));
  if (!raw) return emptySessionImportState(config);
  try {
    const parsed = JSON.parse(raw);
    return Object.assign(emptySessionImportState(config), parsed, {
      imported: Array.isArray(parsed.imported) ? parsed.imported : [],
      roots_checked: Array.isArray(parsed.roots_checked) ? parsed.roots_checked : [],
    });
  } catch {
    return emptySessionImportState(config);
  }
}

function writeSessionImportState(config, state) {
  state.updatedAt = getIsoTimestamp();
  writeFile(getSessionImportStatePath(config.project_root), JSON.stringify(state, null, 2));
}

function stableHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function redactSecrets(value) {
  return String(value || '')
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, '[REDACTED_SECRET]')
    .replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, '[REDACTED_SECRET]')
    .replace(/npm_[A-Za-z0-9]{20,}/g, '[REDACTED_SECRET]')
    .replace(/eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_SECRET]')
    .replace(/(api[_-]?key|token|password|secret)\\s*[:=]\\s*["']?[^"'\\s\`]+/gi, '$1=[REDACTED_SECRET]');
}

function compactSessionContent(value, maxLength = 2400) {
  const normalized = redactSecrets(value).replace(/\\r\\n/g, '\\n').replace(/\\n{4,}/g, '\\n\\n\\n').trim();
  return normalized.length > maxLength ? normalized.slice(0, maxLength - 17).trimEnd() + '\\n...[truncated]' : normalized;
}

function valueToText(value) {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object' && item.text !== undefined) return valueToText(item.text);
      if (item && typeof item === 'object' && item.content !== undefined) return valueToText(item.content);
      return '';
    }).filter(Boolean).join('\\n');
  }
  if (value && typeof value === 'object') {
    if (value.text !== undefined) return valueToText(value.text);
    if (value.content !== undefined) return valueToText(value.content);
  }
  return '';
}

function extractRecordContent(record) {
  return valueToText(record.content)
    || valueToText(record.text)
    || valueToText(record.message && record.message.content)
    || valueToText(record.delta && record.delta.content);
}

function extractRecordRole(record) {
  const role = record.role || (record.message && record.message.role) || record.author || record.type;
  return typeof role === 'string' ? role.toLowerCase() : '';
}

function isMetadataRecord(record) {
  return Boolean(record.cwd || record.repoRoot || record.repo_root || record.workspace || record.workspaceRoot || record.project_root || record.project_slug || record.type === 'session_meta');
}

function metadataFromRecord(record) {
  const metadata = {};
  ['cwd', 'repoRoot', 'repo_root', 'workspace', 'workspaceRoot', 'project_root', 'project_slug', 'projectSlug'].forEach((key) => {
    if (record[key] !== undefined) metadata[key] = record[key];
  });
  return metadata;
}

function isToolNoise(record, role) {
  const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
  return role === 'system' || role === 'developer' || role === 'tool' || role === 'function' || type.includes('tool') || type.includes('function_call') || type.includes('system') || type.includes('developer');
}

function usefulAssistantMessage(content) {
  return /decision|handoff|summary|unresolved|question|next|todo|remember|use |implemented|fixed|blocked|chose|decided/i.test(content);
}

function parseJsonLikeLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    const match = trimmed.match(/\\{.*\\}/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }
}

function parseSessionSegments(sourcePath, raw) {
  const segments = [];
  let parseErrors = 0;
  let current = { sourcePath, index: 0, metadata: {}, raw: '', entries: [] };
  function flush() {
    if (current.raw.trim() || current.entries.length > 0 || Object.keys(current.metadata).length > 0) {
      segments.push(current);
    }
    current = { sourcePath, index: segments.length, metadata: {}, raw: '', entries: [] };
  }
  raw.split(/\\r?\\n/g).forEach((line) => {
    if (!line.trim()) return;
    const record = parseJsonLikeLine(line);
    if (!record) {
      parseErrors += 1;
      current.raw += line + '\\n';
      return;
    }
    if (isMetadataRecord(record)) {
      if (current.raw.trim() || current.entries.length > 0 || Object.keys(current.metadata).length > 0) flush();
      current.metadata = Object.assign(current.metadata, metadataFromRecord(record));
      current.raw += line + '\\n';
      return;
    }
    current.raw += line + '\\n';
    const role = extractRecordRole(record);
    if (isToolNoise(record, role)) return;
    const content = compactSessionContent(extractRecordContent(record));
    if (!content) return;
    if (role === 'user') current.entries.push({ role: 'user', content });
    if (role === 'assistant' && usefulAssistantMessage(content)) current.entries.push({ role: 'assistant', content });
  });
  flush();
  return { segments, parseErrors };
}

function discoverCodexSessionRoots(repoRoot) {
  const roots = new Set();
  if (process.env.AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT) {
    process.env.AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT.split(path.delimiter).map((item) => item.trim()).filter(Boolean).forEach((item) => roots.add(path.resolve(item)));
  }
  if (roots.size > 0) {
    return [...roots].filter((root) => fs.existsSync(root));
  }
  if (process.env.CODEX_HOME) {
    ['sessions', 'projects', 'history', 'logs'].forEach((child) => roots.add(path.join(process.env.CODEX_HOME, child)));
  }
  const homeCodex = path.join(os.homedir(), '.codex');
  [path.join(homeCodex, 'sessions'), path.join(homeCodex, 'projects'), path.join(homeCodex, 'history'), path.join(homeCodex, 'logs'), path.join(repoRoot, '.codex', 'sessions')]
    .forEach((candidate) => roots.add(candidate));
  return [...roots].filter((root) => fs.existsSync(root));
}

function listSessionFiles(roots, maxFiles = 200) {
  const files = [];
  roots.forEach((root) => {
    const stack = [root];
    while (stack.length > 0 && files.length < maxFiles) {
      const current = stack.pop();
      if (!current || !fs.existsSync(current)) continue;
      fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
        if (files.length >= maxFiles) return;
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.isFile() && ['.jsonl', '.json', '.log', '.txt'].includes(path.extname(entry.name).toLowerCase())) {
          files.push(entryPath);
        }
      });
    }
  });
  return files.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs).slice(0, maxFiles);
}

function normalizePathForMatch(value) {
  return path.resolve(value).replace(/\\\\/g, '/').toLowerCase();
}

function segmentMatchesProject(segment, repoRoot, config) {
  const normalizedRepo = normalizePathForMatch(repoRoot);
  const raw = (JSON.stringify(segment.metadata) + '\\n' + segment.raw).replace(/\\\\/g, '/').toLowerCase();
  if (raw.includes(normalizedRepo)) return true;
  for (const key of ['cwd', 'repoRoot', 'repo_root', 'workspace', 'workspaceRoot', 'project_root']) {
    const value = segment.metadata[key];
    if (typeof value !== 'string') continue;
    const candidate = normalizePathForMatch(value);
    if (candidate === normalizedRepo || candidate.startsWith(normalizedRepo + '/')) return true;
  }
  const slug = String(segment.metadata.project_slug || segment.metadata.projectSlug || '').toLowerCase();
  return Boolean(slug.length >= 8 && slug === String(config.project_slug).toLowerCase() && raw.includes(String(config.project_slug).toLowerCase()));
}

function titleForSegment(segment) {
  const decision = segment.entries.find((entry) => entry.role === 'assistant' && /^decision\\s*:/i.test(entry.content));
  const source = decision || segment.entries[0];
  return source ? compactSessionContent(source.content.replace(/^decision\\s*:\\s*/i, ''), 72).replace(/\\n/g, ' ') : 'Imported Codex session';
}

function formatImportedSessionMarkdown(segment, repoRoot, config, title) {
  const lines = [
    '# Imported Codex Session',
    '',
    '- Title: ' + title,
    '- Imported: ' + getIsoTimestamp(),
    '- Project: ' + config.project_slug,
    '- Repo: ' + repoRoot,
    '- Source: ' + segment.sourcePath,
    '',
    '## Clean Transcript',
  ];
  segment.entries.forEach((entry) => {
    lines.push('', '### ' + (entry.role === 'user' ? 'User' : 'Assistant'), '', entry.content);
  });
  lines.push('');
  return redactSecrets(lines.join('\\n'));
}

function importCodexSessions(repoRoot, config, options = {}) {
  const rootsChecked = discoverCodexSessionRoots(repoRoot);
  const maxFiles = options.maxFiles || 200;
  const maxImports = options.maxImports || 16;
  const files = listSessionFiles(rootsChecked, maxFiles);
  const state = readSessionImportState(config);
  const importedKeys = new Set(state.imported.map((record) => record.sourceKey));
  const report = { statePath: getSessionImportStatePath(config.project_root), rootsChecked, scannedFiles: files.length, imported: 0, skippedUnmatched: 0, skippedDuplicate: 0, skippedLowValue: 0, parseErrors: 0, importedNotes: [] };
  for (const filePath of files) {
    if (report.imported >= maxImports) break;
    const raw = readFile(filePath);
    if (!raw) continue;
    const parsed = parseSessionSegments(filePath, raw);
    report.parseErrors += parsed.parseErrors;
    for (const segment of parsed.segments) {
      if (report.imported >= maxImports) break;
      if (!segmentMatchesProject(segment, repoRoot, config)) {
        report.skippedUnmatched += 1;
        continue;
      }
      if (segment.entries.length === 0) {
        report.skippedLowValue += 1;
        continue;
      }
      const sourceKey = filePath + '#' + segment.index + ':' + stableHash(segment.raw);
      if (importedKeys.has(sourceKey)) {
        report.skippedDuplicate += 1;
        continue;
      }
      const importedRoot = path.join(config.project_root, 'Sessions', 'Imported');
      ensureDir(importedRoot);
      const title = titleForSegment(segment);
      const notePath = path.join(importedRoot, timestampForFile() + '-' + stableHash(sourceKey) + '.md');
      const body = formatImportedSessionMarkdown(segment, repoRoot, config, title);
      writeFile(notePath, body);
      report.imported += 1;
      report.importedNotes.push(notePath);
      importedKeys.add(sourceKey);
      state.imported.push({ sourceKey, sourcePath: filePath, notePath, importedAt: getIsoTimestamp(), title });
      updateProjectMemoryIndex({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'sessions',
        item: createMemoryIndexRecord({ kind: 'session', title, preview: body, scope: 'project', recordPath: notePath, reason: 'codex session import' }),
      });
    }
  }
  state.roots_checked = rootsChecked;
  state.skipped_unmatched += report.skippedUnmatched;
  state.skipped_duplicate += report.skippedDuplicate;
  state.skipped_low_value += report.skippedLowValue;
  state.parse_errors += report.parseErrors;
  state.last_run = { at: getIsoTimestamp(), imported: report.imported, skipped_unmatched: report.skippedUnmatched, skipped_duplicate: report.skippedDuplicate, skipped_low_value: report.skippedLowValue, parse_errors: report.parseErrors, roots_checked: rootsChecked };
  writeSessionImportState(config, state);
  return report;
}

function describeSessionImportReport(report) {
  if (report.imported > 0) {
    return {
      summary: 'Imported ' + report.imported + ' new Codex session' + (report.imported === 1 ? '' : 's') + '.',
      nextAction: 'Run agent-bootstrap recall "<query>" when compact context needs targeted prior memory.',
    };
  }
  if (report.skippedDuplicate > 0) {
    return {
      summary: 'No new Codex sessions imported; matching sessions were already imported.',
      nextAction: 'Run agent-bootstrap recall "<query>" to search the imported session memory.',
    };
  }
  if (report.rootsChecked.length === 0) {
    return {
      summary: 'No matching Codex sessions imported; no Codex session roots were found.',
      nextAction: 'Check session roots or set AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT if your Codex history lives elsewhere.',
    };
  }
  if (report.scannedFiles === 0) {
    return {
      summary: 'No matching Codex sessions imported; no session files were found in checked roots.',
      nextAction: 'Check session roots or set AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT to a folder containing Codex JSONL logs.',
    };
  }
  if (report.skippedUnmatched > 0) {
    return {
      summary: 'No matching Codex sessions imported for this repo.',
      nextAction: 'Confirm the session log contains this repo path; importer skips ambiguous sessions to avoid cross-project memory leaks.',
    };
  }
  if (report.skippedLowValue > 0) {
    return {
      summary: 'No matching Codex sessions imported; matched logs did not contain durable user or assistant memory.',
      nextAction: 'Run context again after a session with decisions, handoffs, unresolved questions, or useful summaries.',
    };
  }
  return {
    summary: 'No matching Codex sessions imported.',
    nextAction: 'Run agent-bootstrap context --compact later; importer is bounded and deduped.',
  };
}

function formatSessionImportReport(report) {
  const guidance = describeSessionImportReport(report);
  return [
    '# Session Import',
    '',
    '- mode: automatic Codex session importer',
    '- summary: ' + guidance.summary,
    '- next action: ' + guidance.nextAction,
    '- roots checked: ' + report.rootsChecked.length,
    '- session files scanned: ' + report.scannedFiles,
    '- imported: ' + report.imported,
    '- skipped unmatched: ' + report.skippedUnmatched,
    '- skipped duplicate: ' + report.skippedDuplicate,
    '- skipped low value: ' + report.skippedLowValue,
    '- parse errors: ' + report.parseErrors,
    '- state: ' + report.statePath,
    '- Full imported session bodies stay in the vault and are searched through recall.',
    '',
  ].join('\\n');
}

function formatAutoRecallContext(config, limit = 5) {
  const built = buildRecallIndex(config);
  const index = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const recent = [
    ...((index.recent && index.recent.sessions) || []),
    ...index.recent.handoffs,
    ...index.recent.facts,
    ...index.recent.decisions,
    ...index.recent.tasks,
    ...index.recent.questions,
    ...index.recent.research,
    ...index.recent.notes,
    ...index.recent.daily,
  ].sort((left, right) => right.ts.localeCompare(left.ts)).slice(0, limit);
  const lines = [
    '# Auto Recall',
    '',
    'Recall index: ' + getRecallIndexPath(config.project_root),
    'Indexed markdown memory docs: ' + built.index.documents.length,
    'Full recall memory bodies are indexed on disk but not loaded into compact context.',
    '',
    '## Recent Durable Memory',
  ];
  if (recent.length === 0) {
    lines.push('- none');
  } else {
    recent.forEach((item) => {
      const source = item.path ? ' (source: ' + relativeMemoryPath(config, item.path) + ')' : '';
      lines.push('- ' + item.kind + ': ' + item.title + ' - ' + item.preview + source);
    });
  }
  lines.push('');
  return lines.join('\\n');
}

function getGitSummary(repoRoot) {
  try {
    const branch = cp.execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim() || 'unknown';
    const status = cp.execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' })
      .split(/\\r?\\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    return { branch, dirty: status.length > 0, status };
  } catch {
    return { branch: 'unknown', dirty: false, status: [] };
  }
}

function timestampForFile() {
  return getIsoTimestamp().replace(/[:.]/g, '-');
}

function writeSessionSummary(repoRoot, config, reason) {
  const sessionsRoot = path.join(config.project_root, 'Sessions');
  ensureDir(sessionsRoot);
  const stamp = timestampForFile();
  const sessionPath = path.join(sessionsRoot, stamp + '.md');
  const git = getGitSummary(repoRoot);
  const index = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const summary = [
    '# Session Summary',
    '',
    '- Project: \`' + config.project_slug + '\`',
    '- Project type: \`' + config.project_type + '\`',
    '- Repo: \`' + repoRoot + '\`',
    '- Updated: \`' + getIsoTimestamp() + '\`',
    '- Git branch: \`' + git.branch + '\`',
    '- Git dirty: \`' + (git.dirty ? 'yes' : 'no') + '\`',
    '',
    '## Git Status',
    ...(git.status.length > 0 ? git.status.map((line) => '- ' + line) : ['- clean or unavailable']),
    '',
    formatProjectMemoryIndex(index).trimEnd(),
    '',
  ].join('\\n');
  const sessionSummaryPath = path.join(config.project_root, 'Artifacts', 'session-summary.md');
  writeFile(sessionPath, summary);
  writeFile(sessionSummaryPath, summary);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'sessions',
    item: createMemoryIndexRecord({
      kind: 'session',
      title: 'Session summary',
      preview: summary,
      scope: 'project',
      recordPath: sessionPath,
      reason,
    }),
  });
  appendDailyLog(
    config.vault_root,
    'Session memory synced for \`' + config.project_slug + '\`',
    buildMemoryLogMarker('session', config.project_slug, stamp, 'project'),
  );
  buildRecallIndex(config);
  return { sessionPath, sessionSummaryPath };
}

function listFiles(dirPath, predicate) {
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  return fs.readdirSync(dirPath).filter(predicate).map((fileName) => path.join(dirPath, fileName)).sort();
}

function latestFile(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return null;
  }
  const files = fs.readdirSync(dirPath)
    .map((fileName) => path.join(dirPath, fileName))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
  return files[0] || null;
}

function memoryRecordCount(config) {
  const index = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  return Object.values(index.recent).reduce((total, records) => total + records.length, 0);
}

function getCriticalMemoryPaths(config, repoRoot) {
  const files = [
    path.join(config.project_root, 'README.md'),
    path.join(config.project_root, config.tasks_file),
    path.join(config.project_root, config.decisions_file),
    path.join(config.project_root, config.facts_file || 'Facts.md'),
    path.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
    path.join(config.project_root, config.handoff_file || 'Handoff.md'),
    getProjectMemoryIndexPath(config.project_root),
    getRecallIndexPath(config.project_root),
    path.join(config.project_root, 'Artifacts', 'session-summary.md'),
  ];
  [config.research_dir, config.notes_dir, 'Sessions', 'Plans', 'ProductHarness'].forEach((dirName) => {
    const root = path.join(config.project_root, dirName);
    if (!fs.existsSync(root)) return;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.isFile()) {
          files.push(entryPath);
        }
      });
    }
  });
  [path.join(repoRoot, 'docs', 'superpowers', 'plans'), path.join(repoRoot, 'docs', 'product'), path.join(repoRoot, 'docs', 'stories'), path.join(repoRoot, 'docs', 'validation'), path.join(repoRoot, 'docs', 'decisions')].forEach((root) => {
    if (!fs.existsSync(root)) return;
    const stack = [root];
    while (stack.length > 0) {
      const current = stack.pop();
      fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.isFile()) {
          files.push(entryPath);
        }
      });
    }
  });
  return [...new Set(files)].filter((filePath) => fs.existsSync(filePath)).map((sourcePath) => {
    if (sourcePath.startsWith(config.project_root)) {
      return { sourcePath, relativePath: path.relative(config.project_root, sourcePath).replace(/\\\\/g, '/') };
    }
    return { sourcePath, relativePath: 'Repo/' + path.relative(repoRoot, sourcePath).replace(/\\\\/g, '/') };
  });
}

function memoryStatus(repoRoot, config) {
  ensurePlanState(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  const planState = getPlanStatus(repoRoot, config);
  const productHarness = getProductHarnessStatus(repoRoot, config);
  const built = buildRecallIndex(config);
  const sessionsRoot = path.join(config.project_root, 'Sessions');
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  const backupsRoot = path.join(config.project_root, 'Artifacts', 'Backups');
  const latestSession = latestFile(sessionsRoot);
  const importState = readSessionImportState(config);
  const diagnostics = buildMemoryDiagnostics(built.index.documents.length, importState);
  return {
    ok: fs.existsSync(config.vault_root) && fs.existsSync(config.project_root),
    recallMode: built.index.mode,
    repoRoot,
    vaultRoot: config.vault_root,
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    checks: {
      vaultRoot: fs.existsSync(config.vault_root),
      projectRoot: fs.existsSync(config.project_root),
      memoryIndex: fs.existsSync(getProjectMemoryIndexPath(config.project_root)),
      recallIndex: fs.existsSync(getRecallIndexPath(config.project_root)),
      sessionsDir: fs.existsSync(sessionsRoot),
      sessionImportState: fs.existsSync(getSessionImportStatePath(config.project_root)),
      planState: fs.existsSync(planState.currentPath) && fs.existsSync(planState.vaultCurrentPath),
      productHarness: productHarness.ok,
    },
    counts: {
      memoryRecords: memoryRecordCount(config),
      recallDocuments: built.index.documents.length,
      sessions: listFiles(sessionsRoot, (fileName) => fileName.endsWith('.md')).length,
      importedSessions: importState.imported.length,
      exports: listFiles(exportsRoot, (fileName) => fileName.endsWith('.json')).length,
      backups: fs.existsSync(backupsRoot)
        ? fs.readdirSync(backupsRoot).filter((entry) => fs.statSync(path.join(backupsRoot, entry)).isDirectory()).length
        : 0,
      plans: planState.counts.total,
      stories: productHarness.counts.stories,
    },
    planState,
    productHarness,
    imports: {
      mode: 'automatic Codex session importer',
      statePath: getSessionImportStatePath(config.project_root),
      rootsChecked: importState.roots_checked,
      importedSessions: importState.imported.length,
      skippedUnmatched: importState.skipped_unmatched,
      skippedDuplicate: importState.skipped_duplicate,
      skippedLowValue: importState.skipped_low_value,
      parseErrors: importState.parse_errors,
      lastImportAt: importState.last_run ? importState.last_run.at : null,
    },
    diagnostics: diagnostics.diagnostics,
    nextActions: diagnostics.nextActions,
    latestSession: latestSession ? { path: latestSession, updatedAt: fs.statSync(latestSession).mtime.toISOString() } : null,
  };
}

function exportMemory(repoRoot, config) {
  ensurePlanState(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  const built = buildRecallIndex(config);
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  ensureDir(exportsRoot);
  const exportPath = path.join(exportsRoot, 'agent-bootstrap-memory-' + timestampForFile() + '.json');
  const files = getCriticalMemoryPaths(config, repoRoot).map((file) => ({
    relativePath: file.relativePath,
    path: file.sourcePath,
    content: readFile(file.sourcePath) || '',
  }));
  writeFile(exportPath, JSON.stringify({
    exportedAt: getIsoTimestamp(),
    repoRoot,
    project: {
      slug: config.project_slug,
      type: config.project_type,
      root: config.project_root,
      vaultRoot: config.vault_root,
    },
    memoryIndex: readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type),
    recallIndex: built.index,
    files,
  }, null, 2));
  return { exportPath, files: files.length, recallDocuments: built.index.documents.length };
}

function backupMemory(repoRoot, config) {
  ensurePlanState(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  buildRecallIndex(config);
  const backupPath = path.join(config.project_root, 'Artifacts', 'Backups', timestampForFile());
  ensureDir(backupPath);
  const copied = [];
  getCriticalMemoryPaths(config, repoRoot).forEach((file) => {
    const targetPath = path.join(backupPath, file.relativePath);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(file.sourcePath, targetPath);
    copied.push(file.relativePath);
  });
  const manifestPath = path.join(backupPath, 'manifest.json');
  writeFile(manifestPath, JSON.stringify({
    createdAt: getIsoTimestamp(),
    repoRoot,
    vaultRoot: config.vault_root,
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    files: copied,
    note: 'Plain-file backup; zip compression is intentionally not required.',
  }, null, 2));
  return { backupPath, manifestPath, files: copied.length };
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function buildMemoryDiagnostics(recallDocuments, importState) {
  const diagnostics = [];
  const nextActions = ['agent-bootstrap context --compact'];
  if (recallDocuments > 0) {
    diagnostics.push({
      level: 'ok',
      code: 'recall-index-ready',
      message: 'Hybrid recall has ' + recallDocuments + ' indexed markdown memory document' + (recallDocuments === 1 ? '' : 's') + '.',
    });
    nextActions.push('agent-bootstrap recall "<query>"');
  } else {
    diagnostics.push({
      level: 'warn',
      code: 'recall-index-empty',
      message: 'Hybrid recall has no indexed markdown memory documents yet.',
    });
  }
  if (importState.last_run) {
    diagnostics.push({
      level: 'ok',
      code: 'session-import-ready',
      message: 'Session importer last ran at ' + importState.last_run.at + '; imported ' + importState.imported.length + ' total session note' + (importState.imported.length === 1 ? '' : 's') + '.',
    });
  } else {
    diagnostics.push({
      level: 'warn',
      code: 'session-import-not-run',
      message: 'Session importer has not recorded a run for this project yet.',
    });
  }
  if (importState.roots_checked.length === 0) {
    nextActions.push('agent-bootstrap memory import-sessions');
  }
  nextActions.push('agent-bootstrap memory backup');
  return { diagnostics, nextActions: uniqueValues(nextActions) };
}

function runMemoryCommand(repoRoot, config, subcommand) {
  switch (subcommand) {
    case 'status':
      return memoryStatus(repoRoot, config);
    case 'import-sessions': {
      const imported = importCodexSessions(repoRoot, config, { maxFiles: 400, maxImports: 32 });
      const built = buildRecallIndex(config);
      const guidance = describeSessionImportReport(imported);
      return {
        summary: guidance.summary,
        nextAction: guidance.nextAction,
        imported: imported.imported,
        skippedUnmatched: imported.skippedUnmatched,
        skippedDuplicate: imported.skippedDuplicate,
        skippedLowValue: imported.skippedLowValue,
        parseErrors: imported.parseErrors,
        rootsChecked: imported.rootsChecked,
        scannedFiles: imported.scannedFiles,
        statePath: imported.statePath,
        importedNotes: imported.importedNotes,
        recallMode: built.index.mode,
        recallDocuments: built.index.documents.length,
      };
    }
    case 'sync-sessions': {
      const synced = writeSessionSummary(repoRoot, config, 'memory sync-sessions');
      const built = buildRecallIndex(config);
      return {
        sessionPath: synced.sessionPath,
        sessionSummaryPath: synced.sessionSummaryPath,
        recallIndexPath: getRecallIndexPath(config.project_root),
        indexedDocuments: built.index.documents.length,
      };
    }
    case 'export':
      return exportMemory(repoRoot, config);
    case 'backup':
      return backupMemory(repoRoot, config);
    default:
      throw new Error('Unknown memory command. Use: status, import-sessions, sync-sessions, export, backup.');
  }
}

function resolveRoutingDecision(mode, title, content, scope, projectSlug, repoName) {
  if (scope === 'project' || scope === 'global') {
    return {
      scope,
      reason: \`explicit --scope \${scope}\`,
      scores: { global: scope === 'global' ? 100 : 0, project: scope === 'project' ? 100 : 0 },
    };
  }

  if (mode === 'task' || mode === 'decision') {
    return {
      scope: 'project',
      reason: \`\${mode} entries are always project-scoped\`,
      scores: { global: 0, project: 100 },
    };
  }

  const haystack = \`\${title || ''}\\n\${content}\`.toLowerCase();
  let globalScore = 0;
  let projectScore = 0;
  const globalReasons = [];
  const projectReasons = [];

  const globalSignals = [
    ['cross-project', 5, 'cross-project signal'],
    ['across projects', 5, 'across-projects signal'],
    ['future projects', 5, 'future-projects signal'],
    ['future repos', 5, 'future-repos signal'],
    ['multi-project', 4, 'multi-project signal'],
    ['shared', 3, 'shared signal'],
    ['reusable', 3, 'reusable signal'],
    ['global', 3, 'global signal'],
    ['playbook', 4, 'playbook signal'],
    ['template', 4, 'template signal'],
    ['standard', 3, 'standard signal'],
    ['convention', 3, 'convention signal'],
    ['guideline', 3, 'guideline signal'],
    ['best practice', 3, 'best-practice signal'],
    ['team-wide', 4, 'team-wide signal'],
    ['org-wide', 4, 'org-wide signal'],
  ];

  for (const [signal, weight, reason] of globalSignals) {
    if (haystack.includes(signal)) {
      globalScore += weight;
      globalReasons.push(reason);
    }
  }

  const projectSignals = [
    ['this repo', 6, 'this-repo signal'],
    ['this project', 6, 'this-project signal'],
    ['current repo', 6, 'current-repo signal'],
    ['current project', 6, 'current-project signal'],
    ['project-specific', 6, 'project-specific signal'],
    ['codebase', 4, 'codebase signal'],
  ];

  for (const [signal, weight, reason] of projectSignals) {
    if (haystack.includes(signal)) {
      projectScore += weight;
      projectReasons.push(reason);
    }
  }

  for (const candidate of [projectSlug, repoName]) {
    if (candidate) {
      const normalized = candidate.toLowerCase();
      if (normalized && haystack.includes(normalized)) {
        projectScore += 5;
        projectReasons.push(\`project identity signal: \${normalized}\`);
      }
    }
  }

  if (/(src\\/|app\\/|pages\\/|components\\/|routes\\/|lib\\/|internal\\/)/i.test(haystack)) {
    projectScore += 4;
    projectReasons.push('repo-path signal');
  }

  if (/\\b(package\\.json|tsconfig\\.json|cargo\\.toml|go\\.mod|requirements\\.txt|pom\\.xml|dockerfile)\\b/i.test(haystack)) {
    projectScore += 4;
    projectReasons.push('repo-file signal');
  }

  if (/\`[^\`]+\`/.test(\`\${title || ''}\\n\${content}\`) || /\\b[a-z0-9_-]+\\.[a-z]{2,4}\\b/i.test(haystack)) {
    projectScore += 2;
    projectReasons.push('code-or-file reference signal');
  }

  if (/\\b(module|feature|flow|endpoint|handler|schema|migration|bug|checkout|payment)\\b/i.test(haystack)) {
    projectScore += 1;
    projectReasons.push('implementation-detail signal');
  }

  if (projectScore >= globalScore) {
    return {
      scope: 'project',
      reason: projectReasons.length > 0
        ? \`project signals outranked global signals: \${projectReasons.join(', ')}\`
        : 'defaulted to project scope',
      scores: { global: globalScore, project: projectScore },
    };
  }

  return {
    scope: 'global',
    reason: globalReasons.length > 0
      ? \`global signals outranked project signals: \${globalReasons.join(', ')}\`
      : 'defaulted to global scope',
    scores: { global: globalScore, project: projectScore },
  };
}

function readRepoConfig(repoRoot) {
  const config = readOptionalRepoConfig(repoRoot);
  if (!config) {
    throw new Error('Missing vault.config.json. Run agent-bootstrap in the repo root first.');
  }
  return config;
}

function readOptionalRepoConfig(repoRoot) {
  const configPath = path.join(repoRoot, 'vault.config.json');
  const raw = readFile(configPath);
  return raw ? JSON.parse(raw) : null;
}

function formatContextManifest(mode, loaded, skipped) {
  return [
    '===== Context Manifest =====',
    \`Context mode: \${mode}\`,
    '',
    'Loaded:',
    ...loaded.map((section) => \`- \${section.label}: \${section.filePath}\`),
    '',
    'Skipped:',
    ...skipped.map((item) => \`- \${item}\`),
    '',
  ].join('\\n');
}

function getContext(repoRoot, config, mode = 'compact', includeWhy = false) {
  const sections = [
    { label: 'Repo AGENTS', filePath: path.join(repoRoot, 'AGENTS.md') },
    { label: 'Agent Routing Index', filePath: path.join(repoRoot, '.codex', 'INDEX.md') },
    { label: 'Subagent Routing Index', filePath: path.join(repoRoot, '.codex', 'agents', 'INDEX.md') },
    { label: 'Skills Routing Index', filePath: path.join(repoRoot, '.codex', 'skills', 'INDEX.md') },
    { label: 'Vault Bridge', filePath: path.join(repoRoot, 'docs', 'vault-memory.md') },
    { label: 'Project Map', filePath: path.join(repoRoot, 'docs', 'project-map.md') },
    { label: 'Repo README', filePath: path.join(repoRoot, 'README.md') },
    { label: 'Agent Workspace Guide', filePath: path.join(repoRoot, '.codex', 'README.md') },
  ];
  const loaded = [];
  const skipped = [
    '.codex/agents/** recursive agent bodies (load only the routed TOML when needed)',
    '.codex/skills/** recursive skill bodies (load only the routed SKILL.md when needed)',
    'Full recall memory bodies (indexed on disk; compact context receives bounded snippets only)',
  ];
  let sessionImportReport = null;
  if (mode === 'compact') {
    skipped.push('Daily/** daily logs (run agent-bootstrap context --full when needed)');
  }
  if (config) {
    ensurePlanState(repoRoot, config);
    ensureProductHarness(repoRoot, config);
    ensureDailyNote(config.vault_root);
    appendDailyLog(
      config.vault_root,
      \`Session started for \\\`\${config.project_slug}\\\`\`,
      createDailyLogMarker(['session', config.project_slug, new Date().toISOString().slice(0, 13)]),
    );
    sessionImportReport = importCodexSessions(repoRoot, config, {
      maxFiles: mode === 'full' ? 400 : 160,
      maxImports: mode === 'full' ? 32 : 8,
    });
    sections.push(
      { label: 'Vault Init', filePath: path.join(config.vault_root, 'Init.md') },
      { label: 'Vault AGENTS', filePath: path.join(config.vault_root, 'AGENTS.md') },
      { label: 'Project README', filePath: path.join(config.project_root, 'README.md') },
      { label: 'Project Tasks', filePath: path.join(config.project_root, config.tasks_file) },
      { label: 'Project Decisions', filePath: path.join(config.project_root, config.decisions_file) },
      { label: 'Project Facts', filePath: path.join(config.project_root, config.facts_file || 'Facts.md') },
      { label: 'Project Open Questions', filePath: path.join(config.project_root, config.open_questions_file || 'Open Questions.md') },
      { label: 'Project Handoff', filePath: path.join(config.project_root, config.handoff_file || 'Handoff.md') },
      { label: 'Active Plan State', filePath: path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md') },
      { label: 'Product Contract', filePath: path.join(repoRoot, 'docs', 'product', 'PRODUCT.md') },
      { label: 'Product Harness Guide', filePath: path.join(repoRoot, 'docs', 'product', 'HARNESS.md') },
      { label: 'Today Daily Note', filePath: path.join(config.vault_root, 'Daily', \`\${getTodayString()}.md\`), fullOnly: true },
    );
    const activePlan = getPlanStatus(repoRoot, config).current;
    if (activePlan) {
      sections.push({ label: 'Active Plan', filePath: activePlan.repoPath });
    }
    const activeStory = getProductHarnessStatus(repoRoot, config).currentStory;
    if (activeStory) {
      sections.push({ label: 'Product Harness Story', filePath: activeStory.repoPath });
    }
    if (mode === 'full') {
      collectPlanFiles(getRepoPlansRoot(repoRoot)).slice(0, 4).forEach((filePath) => {
        sections.push({ label: 'Recent Plan', filePath, fullOnly: true });
      });
      collectStoryFiles(getRepoStoriesRoot(repoRoot)).slice(0, 4).forEach((filePath) => {
        sections.push({ label: 'Recent Story', filePath, fullOnly: true });
      });
      collectTraceFiles(getRepoTracesRoot(repoRoot)).slice(0, 4).forEach((filePath) => {
        sections.push({ label: 'Recent Harness Trace', filePath, fullOnly: true });
      });
    }
    skipped.push('Plan history date folders (compact context loads CURRENT.md and the active plan only)');
    skipped.push('Story history date folders (compact context loads Product Harness summary and current story only)');
    skipped.push('Trace and friction history (compact context loads only latest trace and open friction count)');
  } else {
    skipped.push('vault.config.json missing; loaded repo-local source context only');
    skipped.push('Vault/project memory files unavailable until agent-bootstrap setup and agent-bootstrap init run');
  }

  const output = sections
    .map((section) => {
      if (section.fullOnly && mode !== 'full') {
        return null;
      }

      const body = readFile(section.filePath);
      if (!body) {
        skipped.push(\`\${section.label}: \${section.filePath} (missing)\`);
        return null;
      }

      loaded.push(section);
      return \`===== \${section.label} =====\\n\${body.trimEnd()}\\n\`;
    })
    .filter(Boolean);

  if (config) {
    const memoryIndex = formatProjectMemoryIndex(
      readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type),
    );
    output.push(\`===== Project Memory Index =====\\n\${memoryIndex.trimEnd()}\\n\`);
    loaded.push({ label: 'Project Memory Index', filePath: path.join(config.project_root, 'Artifacts', 'memory-index.json') });
    if (sessionImportReport) {
      output.push(\`===== Session Import =====\\n\${formatSessionImportReport(sessionImportReport).trimEnd()}\\n\`);
      loaded.push({ label: 'Session Import State', filePath: sessionImportReport.statePath });
    }
    output.push(\`===== Product Harness =====\\n\${renderHarnessContext(getProductHarnessStatus(repoRoot, config)).trimEnd()}\\n\`);
    loaded.push({ label: 'Product Harness State', filePath: path.join(repoRoot, 'docs', 'stories', 'INDEX.md') });
    output.push(\`===== Auto Recall =====\\n\${formatAutoRecallContext(config, mode === 'full' ? 8 : 5).trimEnd()}\\n\`);
    loaded.push({ label: 'Recall Index', filePath: getRecallIndexPath(config.project_root) });
  } else {
    output.push([
      '===== Source Repo Context =====',
      'No vault.config.json found. Loaded repo-local instructions only.',
      'Run agent-bootstrap setup and agent-bootstrap init to enable vault-backed memory.',
      '',
    ].join('\\n'));
  }

  if (includeWhy) {
    output.push(formatContextManifest(mode, loaded, skipped));
  }

  return output.join('\\n');
}

function appendTask(config, content) {
  const tasksPath = path.join(config.project_root, config.tasks_file);
  const existing = readFile(tasksPath) || '# Tasks\\n';
  fs.writeFileSync(tasksPath, \`\${existing.trimEnd()}\\n\\n- [ ] \${content}\\n\`);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'tasks',
    item: createMemoryIndexRecord({
      kind: 'task',
      title: content,
      preview: content,
      scope: 'project',
      recordPath: tasksPath,
      reason: 'tasks are always project-scoped',
    }),
  });
  appendDailyLog(
    config.vault_root,
    \`Task updated for \\\`\${config.project_slug}\\\`: \${content}\`,
    buildMemoryLogMarker('task', config.project_slug, content, 'project'),
  );
  return tasksPath;
}

function appendDecision(config, title, content) {
  const decisionsPath = path.join(config.project_root, config.decisions_file);
  const existing = readFile(decisionsPath) || '# Decisions\\n';
  const today = getTodayString();
  const entry = \`\\n## \${today} - \${title}\\n- Context: repo-local agent runtime\\n- Decision: \${content}\\n\`;
  fs.writeFileSync(decisionsPath, \`\${existing.trimEnd()}\\n\${entry}\`);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'decisions',
    item: createMemoryIndexRecord({
      kind: 'decision',
      title,
      preview: content,
      scope: 'project',
      recordPath: decisionsPath,
      reason: 'decisions are always project-scoped',
    }),
  });
  appendDailyLog(
    config.vault_root,
    \`Decision recorded for \\\`\${config.project_slug}\\\`: \${title}\`,
    buildMemoryLogMarker('decision', config.project_slug, title, 'project'),
  );
  return decisionsPath;
}

function normalizeConfidence(confidence) {
  if (confidence === 'high' || confidence === 'medium' || confidence === 'low') {
    return confidence;
  }
  return 'medium';
}

function appendFact(config, title, content, source, confidence) {
  const factsPath = path.join(config.project_root, config.facts_file || 'Facts.md');
  const existing = readFile(factsPath) || '# Facts\\n';
  const today = getTodayString();
  const entry = [
    '',
    \`## \${title}\`,
    \`- Fact: \${content}\`,
    \`- Source: \${source && source.trim() ? source.trim() : 'unspecified'}\`,
    \`- Confidence: \${normalizeConfidence(confidence)}\`,
    \`- Last verified: \${today}\`,
    '',
  ].join('\\n');
  fs.writeFileSync(factsPath, \`\${existing.trimEnd()}\\n\${entry}\`);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'facts',
    item: createMemoryIndexRecord({
      kind: 'fact',
      title,
      preview: content,
      scope: 'project',
      recordPath: factsPath,
      reason: 'stable project fact',
    }),
  });
  appendDailyLog(
    config.vault_root,
    \`Fact recorded for \\\`\${config.project_slug}\\\`: \${title}\`,
    buildMemoryLogMarker('fact', config.project_slug, title, 'project'),
  );
  return factsPath;
}

function appendQuestion(config, title, content) {
  const questionsPath = path.join(config.project_root, config.open_questions_file || 'Open Questions.md');
  const existing = readFile(questionsPath) || '# Open Questions\\n';
  const today = getTodayString();
  const entry = \`\\n## \${title}\\n- Created: \${today}\\n- [ ] \${content}\\n\`;
  fs.writeFileSync(questionsPath, \`\${existing.trimEnd()}\\n\${entry}\`);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'questions',
    item: createMemoryIndexRecord({
      kind: 'question',
      title,
      preview: content,
      scope: 'project',
      recordPath: questionsPath,
      reason: 'open question for future verification',
    }),
  });
  appendDailyLog(
    config.vault_root,
    \`Open question recorded for \\\`\${config.project_slug}\\\`: \${title}\`,
    buildMemoryLogMarker('question', config.project_slug, title, 'project'),
  );
  return questionsPath;
}

function appendHandoff(config, content) {
  const handoffPath = path.join(config.project_root, config.handoff_file || 'Handoff.md');
  const existing = readFile(handoffPath) || '# Handoff\\n';
  const today = getTodayString();
  const title = 'Session handoff';
  const entry = \`\\n## \${today} - \${title}\\n\${content}\\n\`;
  fs.writeFileSync(handoffPath, \`\${existing.trimEnd()}\\n\${entry}\`);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'handoffs',
    item: createMemoryIndexRecord({
      kind: 'handoff',
      title,
      preview: content,
      scope: 'project',
      recordPath: handoffPath,
      reason: 'latest session handoff',
    }),
  });
  appendDailyLog(
    config.vault_root,
    \`Handoff updated for \\\`\${config.project_slug}\\\`\`,
    buildMemoryLogMarker('handoff', config.project_slug, title, 'project'),
  );
  return handoffPath;
}

function compactSessionMemory(config) {
  const repoRoot = findRepoRoot(process.cwd());
  const synced = writeSessionSummary(repoRoot, config, 'memory compact');
  appendDailyLog(
    config.vault_root,
    \`Compacted session memory for \\\`\${config.project_slug}\\\`\`,
    buildMemoryLogMarker('compact', config.project_slug, 'session-summary', 'project'),
  );
  return synced.sessionSummaryPath;
}

function createNote(config, noteType, title, content, scope, extraTags = []) {
  const routing = resolveRoutingDecision(noteType, title, content, scope, config.project_slug, path.basename(findRepoRoot(process.cwd())));
  const resolvedScope = routing.scope;
  const baseRoot = resolvedScope === 'global' ? config.vault_root : config.project_root;
  const directory = noteType === 'research'
    ? (resolvedScope === 'global' ? 'Research' : config.research_dir)
    : (resolvedScope === 'global' ? 'Notes' : config.notes_dir);
  const targetDir = path.join(baseRoot, directory);
  ensureDir(targetDir);
  const today = getTodayString();
  const safeTitle = title.replace(/[<>:"/\\\\|?*\\u0000-\\u001F]/g, '-').replace(/\\s+/g, ' ').trim();
  const tags = extraTags.length > 0
    ? \`tags:\\n\${extraTags.map((tag) => \`  - \${tag}\`).join('\\n')}\\n\`
    : '';
  const notePath = path.join(targetDir, \`\${today} \${safeTitle}.md\`);
  const hubLink = resolvedScope === 'global' ? '[[Research/README|Research]]' : '[[README]]';
  const hubLabel = resolvedScope === 'global' ? 'Global hub' : 'Project';
  writeFile(notePath, \`---\\ntype: \${noteType}\\nscope: \${resolvedScope}\\nscope_reason: \${routing.reason}\\nproject: \${resolvedScope === 'global' ? '' : config.project_slug}\\nproject_type: \${config.project_type}\\ncreated: \${today}\\nupdated: \${today}\\nstatus: draft\\n\${tags}---\\n\\n# \${title}\\n\\n## Links\\n- Vault: [[Init]]\\n- \${hubLabel}: \${hubLink}\\n\\n\${content}\\n\`);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: noteType === 'research' ? 'research' : 'notes',
    item: createMemoryIndexRecord({
      kind: noteType,
      title,
      preview: content,
      scope: resolvedScope,
      recordPath: notePath,
      reason: routing.reason,
    }),
  });
  appendDailyLog(
    config.vault_root,
    \`\${noteType === 'research' ? 'Research' : 'Note'} captured [\${resolvedScope}] for \\\`\${config.project_slug}\\\`: \${title}\`,
    buildMemoryLogMarker(noteType, config.project_slug, title, resolvedScope),
  );
  return notePath;
}

function getRepoPlansRoot(repoRoot) {
  return path.join(repoRoot, 'docs', 'superpowers', 'plans');
}

function getVaultPlansRoot(config) {
  return path.join(config.project_root, 'Plans');
}

function planSlug(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!slug) {
    throw new Error('Could not derive a valid plan slug.');
  }
  return slug;
}

function parsePlanFields(content) {
  const match = content.match(/^---\\r?\\n([\\s\\S]*?)\\r?\\n---/);
  const fields = {};
  if (!match) return fields;
  match[1].split(/\\r?\\n/).forEach((line) => {
    const index = line.indexOf(':');
    if (index === -1) return;
    fields[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  });
  return fields;
}

function collectPlanFiles(plansRoot) {
  if (!fs.existsSync(plansRoot)) return [];
  const files = [];
  const stack = [plansRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'CURRENT.md' && entry.name !== 'INDEX.md') {
        files.push(entryPath);
      }
    });
  }
  return files.sort();
}

function planTitleFromContent(filePath, content) {
  const fields = parsePlanFields(content);
  if (fields.title) return fields.title;
  const heading = content.match(/^#\\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(filePath, '.md');
}

function planNextAction(content) {
  const match = content.match(/- Next action:\\s*(.+)/i);
  return match ? match[1].trim() : 'continue from current task scope';
}

function readPlanRecord(repoRoot, config, filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  const fields = parsePlanFields(content);
  const title = planTitleFromContent(filePath, content);
  const relativePlansPath = path.relative(getRepoPlansRoot(repoRoot), filePath).replace(/\\\\/g, '/');
  return {
    title,
    slug: fields.slug || planSlug(title),
    status: fields.status || 'planned',
    created: fields.created || path.basename(path.dirname(filePath)),
    updated: fields.updated || fs.statSync(filePath).mtime.toISOString(),
    verification: fields.verification === 'passed' ? 'passed' : 'not_run',
    repoPath: filePath,
    vaultPath: path.join(getVaultPlansRoot(config), relativePlansPath),
    relativeRepoPath: path.relative(repoRoot, filePath).replace(/\\\\/g, '/'),
    nextAction: planNextAction(content),
  };
}

function readPlanRecords(repoRoot, config) {
  return collectPlanFiles(getRepoPlansRoot(repoRoot))
    .map((filePath) => readPlanRecord(repoRoot, config, filePath))
    .filter(Boolean)
    .sort((left, right) => String(right.updated).localeCompare(String(left.updated)));
}

function renderEmptyPlanCurrent() {
  return [
    '# Current Plan State',
    '',
    'Last updated: ' + getIsoTimestamp(),
    '',
    '## Current Focus',
    '',
    '- none',
    '',
    '## Active Plans',
    '',
    '- none',
    '',
    '## Completed Today',
    '',
    '- none',
    '',
    '## Interrupted Or Needs Correction',
    '',
    '- none',
    '',
    '## Rules For Agents',
    '',
    '- Do not mark completed without verification evidence.',
    '- If the session is interrupted, keep status in_progress or interrupted.',
    '- Same-scope fixes update the existing plan.',
    '- Different-scope work starts a new plan with a specific filename.',
    '- Do not infer completion from silence, shutdown, or lack of user response.',
    '',
  ].join('\\n');
}

function currentPlanFromRecords(plans) {
  return plans.find((plan) => plan.status !== 'completed') || null;
}

function renderPlanCurrent(plans, current) {
  const today = getTodayString();
  const active = plans.filter((plan) => plan.status !== 'completed');
  const completedToday = plans.filter((plan) => plan.status === 'completed' && String(plan.updated).startsWith(today));
  const attention = plans.filter((plan) => ['interrupted', 'needs_correction', 'blocked'].includes(plan.status));
  const lines = ['# Current Plan State', '', 'Last updated: ' + getIsoTimestamp(), '', '## Current Focus', ''];
  if (current) {
    lines.push('- Plan: ' + current.relativeRepoPath, '- Title: ' + current.title, '- Status: ' + current.status, '- Verification: ' + current.verification, '- Next action: ' + current.nextAction);
  } else {
    lines.push('- none');
  }
  lines.push('', '## Active Plans', '');
  lines.push(...(active.length ? active.slice(0, 8).map((plan) => '- ' + plan.relativeRepoPath + ' - ' + plan.status + ' - ' + plan.title + ' - next: ' + plan.nextAction) : ['- none']));
  lines.push('', '## Completed Today', '');
  lines.push(...(completedToday.length ? completedToday.slice(0, 8).map((plan) => '- ' + plan.relativeRepoPath + ' - ' + plan.title) : ['- none']));
  lines.push('', '## Interrupted Or Needs Correction', '');
  lines.push(...(attention.length ? attention.slice(0, 8).map((plan) => '- ' + plan.relativeRepoPath + ' - ' + plan.status + ' - ' + plan.title + ' - next: ' + plan.nextAction) : ['- none']));
  lines.push('', '## Rules For Agents', '', '- Do not mark completed without verification evidence.', '- If the session is interrupted, keep status in_progress or interrupted.', '- Same-scope fixes update the existing plan.', '- Different-scope work starts a new plan with a specific filename.', '- Do not infer completion from silence, shutdown, or lack of user response.', '');
  return lines.join('\\n');
}

function renderPlanIndex(plans) {
  const lines = ['# Plan Index', '', 'Last updated: ' + getIsoTimestamp(), '', 'This index tracks Superpowers implementation plans created by agent-bootstrap plan state.', 'Root plans/ remains a clean template/handoff area; active implementation plans live here.', ''];
  if (!plans.length) {
    lines.push('No implementation plans recorded yet.', '');
    return lines.join('\\n');
  }
  const dates = [...new Set(plans.map((plan) => plan.created))].sort().reverse();
  dates.forEach((date) => {
    lines.push('## ' + date, '');
    plans.filter((plan) => plan.created === date).sort((left, right) => left.title.localeCompare(right.title)).forEach((plan) => {
      lines.push('- ' + plan.status + ' - [' + plan.title + '](' + plan.relativeRepoPath + ') - verification: ' + plan.verification);
    });
    lines.push('');
  });
  return lines.join('\\n');
}

function renderPlanFile(config, data) {
  return [
    '---',
    'type: agent-bootstrap-plan',
    'project: ' + config.project_slug,
    'title: ' + data.title,
    'slug: ' + planSlug(data.title),
    'status: ' + data.status,
    'created: ' + data.created,
    'updated: ' + data.updated,
    'verification: ' + data.verification,
    '---',
    '',
    '# ' + data.created + ' - ' + data.title,
    '',
    '## Goal',
    '',
    data.title,
    '',
    '## Scope',
    '',
    '- Track work tied to this task only.',
    '',
    '## Checklist',
    '',
    '- [ ] Define implementation steps before editing if the task needs a full Superpowers plan.',
    '- [ ] Implement the requested change.',
    '- [ ] Verify the result.',
    '- [ ] Update memory/handoff if meaningful.',
    '',
    '## Last Known State',
    '',
    '- Updated: ' + data.updated,
    '- Current step: ' + data.currentStep,
    '- Verification: ' + data.verification,
    '- Next action: ' + data.nextAction,
    '',
    '## Progress Log',
    '',
    ...(data.progressLines.length ? data.progressLines : ['- none yet']),
    '',
    '## Corrections',
    '',
    ...(data.corrections.length ? data.corrections : ['- none yet']),
    '',
  ].join('\\n');
}

function readPlanParts(filePath) {
  const content = readFile(filePath) || '';
  const fields = parsePlanFields(content);
  const progressMatch = content.match(/## Progress Log\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## Corrections|\\s*$)/);
  const correctionsMatch = content.match(/## Corrections\\r?\\n\\r?\\n([\\s\\S]*?)\\s*$/);
  const clean = (value) => (value || '').split(/\\r?\\n/).map((line) => line.trimEnd()).filter((line) => line && line !== '- none yet');
  return {
    title: fields.title || planTitleFromContent(filePath, content),
    created: fields.created || path.basename(path.dirname(filePath)),
    progressLines: clean(progressMatch && progressMatch[1]),
    corrections: clean(correctionsMatch && correctionsMatch[1]),
  };
}

function mirrorPlanState(repoRoot, config) {
  ensureDir(getRepoPlansRoot(repoRoot));
  ensureDir(getVaultPlansRoot(config));
  fs.cpSync(getRepoPlansRoot(repoRoot), getVaultPlansRoot(config), { recursive: true });
}

function refreshPlanSummaries(repoRoot, config, current) {
  const plans = readPlanRecords(repoRoot, config);
  const currentPlan = current === undefined ? currentPlanFromRecords(plans) : current;
  writeFile(path.join(getRepoPlansRoot(repoRoot), 'CURRENT.md'), renderPlanCurrent(plans, currentPlan));
  writeFile(path.join(getRepoPlansRoot(repoRoot), 'INDEX.md'), renderPlanIndex(plans));
  mirrorPlanState(repoRoot, config);
}

function ensurePlanState(repoRoot, config) {
  ensureDir(getRepoPlansRoot(repoRoot));
  ensureDir(getVaultPlansRoot(config));
  const currentPath = path.join(getRepoPlansRoot(repoRoot), 'CURRENT.md');
  const indexPath = path.join(getRepoPlansRoot(repoRoot), 'INDEX.md');
  if (!fs.existsSync(currentPath)) writeFile(currentPath, renderEmptyPlanCurrent());
  if (!fs.existsSync(indexPath)) writeFile(indexPath, renderPlanIndex([]));
  writeFile(path.join(getVaultPlansRoot(config), 'README.md'), '# Plans\\n\\nDurable mirror of repo active implementation plan state.\\n');
  mirrorPlanState(repoRoot, config);
  return getPlanStatus(repoRoot, config);
}

function getPlanStatus(repoRoot, config) {
  const plans = readPlanRecords(repoRoot, config);
  const current = currentPlanFromRecords(plans);
  const today = getTodayString();
  return {
    ok: fs.existsSync(path.join(getRepoPlansRoot(repoRoot), 'CURRENT.md')) && fs.existsSync(path.join(getVaultPlansRoot(config), 'CURRENT.md')),
    repoPlansRoot: getRepoPlansRoot(repoRoot),
    vaultPlansRoot: getVaultPlansRoot(config),
    currentPath: path.join(getRepoPlansRoot(repoRoot), 'CURRENT.md'),
    vaultCurrentPath: path.join(getVaultPlansRoot(config), 'CURRENT.md'),
    current,
    counts: {
      total: plans.length,
      active: plans.filter((plan) => plan.status !== 'completed').length,
      completedToday: plans.filter((plan) => plan.status === 'completed' && String(plan.updated).startsWith(today)).length,
      interruptedOrNeedsCorrection: plans.filter((plan) => ['interrupted', 'needs_correction', 'blocked'].includes(plan.status)).length,
    },
    plans,
  };
}

function writePlanUpdate(repoRoot, config, planPath, status, verification, currentStep, nextAction, logLine, correctionLine) {
  const parts = readPlanParts(planPath);
  const updated = getIsoTimestamp();
  const progressLines = [...parts.progressLines, '- ' + updated + ' - ' + logLine];
  const corrections = correctionLine ? [...parts.corrections, '- ' + updated + ' - ' + correctionLine] : parts.corrections;
  writeFile(planPath, renderPlanFile(config, { title: parts.title, status, verification, currentStep, nextAction, progressLines, corrections, created: parts.created, updated }));
  const record = readPlanRecord(repoRoot, config, planPath);
  refreshPlanSummaries(repoRoot, config, status === 'completed' ? null : record);
  return record;
}

function activePlanOrThrow(repoRoot, config) {
  const current = getPlanStatus(repoRoot, config).current;
  if (!current) {
    throw new Error('No active plan. Run agent-bootstrap plan start "<title>" before updating plan state.');
  }
  return current;
}

function runPlanCommand(repoRoot, config, subcommand, value) {
  ensurePlanState(repoRoot, config);
  if (subcommand === 'status') return getPlanStatus(repoRoot, config);
  if (subcommand === 'start') {
    const title = (value || '').trim();
    if (!title) throw new Error('Plan start requires a title.');
    const slug = planSlug(title);
    const existing = readPlanRecords(repoRoot, config).find((plan) => plan.slug === slug && plan.status !== 'completed');
    if (existing) {
      const resumed = writePlanUpdate(repoRoot, config, existing.repoPath, existing.status, existing.verification, 'resumed', existing.nextAction, 'Plan resumed.');
      return { action: 'resumed', status: resumed.status, planPath: resumed.repoPath, vaultPlanPath: resumed.vaultPath };
    }
    const today = getTodayString();
    const updated = getIsoTimestamp();
    const planPath = path.join(getRepoPlansRoot(repoRoot), today, today + '-' + slug + '.md');
    writeFile(planPath, renderPlanFile(config, { title, status: 'in_progress', verification: 'not_run', currentStep: 'started', nextAction: 'continue from current task scope', progressLines: ['- ' + updated + ' - Plan started.'], corrections: [], created: today, updated }));
    const record = readPlanRecord(repoRoot, config, planPath);
    refreshPlanSummaries(repoRoot, config, record);
    return { action: 'started', status: record.status, planPath: record.repoPath, vaultPlanPath: record.vaultPath };
  }
  if (subcommand === 'update') {
    const note = (value || '').trim();
    if (!note) throw new Error('Plan update requires a progress note.');
    const active = activePlanOrThrow(repoRoot, config);
    const correction = /^correction:/i.test(note);
    const record = writePlanUpdate(repoRoot, config, active.repoPath, correction ? 'needs_correction' : (active.status === 'interrupted' ? 'in_progress' : active.status), 'not_run', correction ? 'needs correction' : 'updated', note, note, correction ? note : undefined);
    return { action: 'updated', status: record.status, planPath: record.repoPath, vaultPlanPath: record.vaultPath };
  }
  if (subcommand === 'interrupt') {
    const note = (value || '').trim();
    if (!note) throw new Error('Plan interrupt requires the last known state and next action.');
    const active = activePlanOrThrow(repoRoot, config);
    const record = writePlanUpdate(repoRoot, config, active.repoPath, 'interrupted', 'not_run', 'interrupted', note, 'Interrupted: ' + note);
    return { action: 'interrupted', status: record.status, planPath: record.repoPath, vaultPlanPath: record.vaultPath };
  }
  if (subcommand === 'complete') {
    const summary = (value || '').trim();
    if (!summary) throw new Error('Plan complete requires a non-empty verification summary.');
    const active = activePlanOrThrow(repoRoot, config);
    const record = writePlanUpdate(repoRoot, config, active.repoPath, 'completed', 'passed', 'completed', 'none', 'Completed with verification: ' + summary);
    return { action: 'completed', status: record.status, planPath: record.repoPath, vaultPlanPath: record.vaultPath };
  }
  throw new Error('Unknown plan command. Use: status, start, update, complete, interrupt.');
}

function getRepoProductRoot(repoRoot) {
  return path.join(repoRoot, 'docs', 'product');
}

function getRepoTracesRoot(repoRoot) {
  return path.join(getRepoProductRoot(repoRoot), 'traces');
}

function getRepoBacklogPath(repoRoot) {
  return path.join(getRepoProductRoot(repoRoot), 'HARNESS_BACKLOG.md');
}

function getRepoStoriesRoot(repoRoot) {
  return path.join(repoRoot, 'docs', 'stories');
}

function getRepoValidationRoot(repoRoot) {
  return path.join(repoRoot, 'docs', 'validation');
}

function getRepoDecisionsRoot(repoRoot) {
  return path.join(repoRoot, 'docs', 'decisions');
}

function getVaultProductHarnessRoot(config) {
  return path.join(config.project_root, 'ProductHarness');
}

function getVaultTracesRoot(config) {
  return path.join(getVaultProductHarnessRoot(config), 'Traces');
}

function getVaultBacklogPath(config) {
  return path.join(getVaultProductHarnessRoot(config), 'HARNESS_BACKLOG.md');
}

function getVaultStoriesRoot(config) {
  return path.join(getVaultProductHarnessRoot(config), 'Stories');
}

function getVaultValidationRoot(config) {
  return path.join(getVaultProductHarnessRoot(config), 'Validation');
}

function getVaultDecisionsRoot(config) {
  return path.join(getVaultProductHarnessRoot(config), 'Decisions');
}

function classifyHarnessRisk(title) {
  return classifyHarnessIntake(title).risk;
}

function hasAny(value, patterns) {
  return patterns.some((pattern) => pattern.test(value));
}

function classifyHarnessIntake(title) {
  const value = String(title || '').toLowerCase();
  const flags = [];
  if (hasAny(value, [/\\bauth\\b/, /\\blogin\\b/, /\\bpassword\\b/, /\\btoken\\b/, /\\bjwt\\b/, /\\bsession\\b/, /\\boauth\\b/])) flags.push('auth');
  if (hasAny(value, [/\\bpermission\\b/, /\\bauthorization\\b/, /\\badmin\\b/, /\\brole\\b/, /\\brls\\b/, /\\btenant\\b/, /\\baccess\\s+control\\b/])) flags.push('authorization');
  if (hasAny(value, [/\\bdatabase\\b/, /\\bdb\\b/, /\\bschema\\b/, /\\bmodel\\b/, /\\bmigration\\b/, /\\bdata\\s+loss\\b/, /\\bdelete\\b/, /\\bdeletes\\b/, /\\bdestroy\\b/, /\\binvoice\\b/, /\\btable\\b/, /\\bsupabase\\b/, /\\bpostgres\\b/, /\\bsql\\b/])) flags.push('data_model');
  if (hasAny(value, [/\\bsecurity\\b/, /\\baudit\\b/, /\\bsecret\\b/, /\\bsecrets\\b/, /\\.env\\b/, /\\bupload\\b/, /\\bcors\\b/, /\\brate\\s*limit\\b/, /\\bvulnerability\\b/])) flags.push('audit_security');
  if (hasAny(value, [/\\bprovider\\b/, /\\bexternal\\b/, /\\bstripe\\b/, /\\bpayment\\b/, /\\bbilling\\b/, /\\bsubscription\\b/, /\\bwebhook\\b/, /\\bemail\\b/])) flags.push('external_systems');
  if (hasAny(value, [/\\bapi\\b/, /\\bendpoint\\b/, /\\bpublic\\s+contract\\b/, /\\bsdk\\b/, /\\bexport\\b/, /\\bimport\\b/])) flags.push('public_contract');
  if (hasAny(value, [/\\bmobile\\b/, /\\bdesktop\\b/, /\\bios\\b/, /\\bandroid\\b/, /\\bweb\\b/, /\\bbrowser\\b/, /\\bcross-platform\\b/])) flags.push('cross_platform');
  if (hasAny(value, [/\\bfix\\b/, /\\bbug\\b/, /\\bregression\\b/, /\\bexisting\\b/, /\\blegacy\\b/, /\\brefactor\\b/, /\\bmigrate\\b/, /\\bmigration\\b/, /\\bdelete\\b/, /\\bdeletes\\b/])) flags.push('existing_behavior');
  if (hasAny(value, [/\\bmaybe\\b/, /\\btemporary\\b/, /\\bquick\\s+hack\\b/, /\\bunclear\\b/, /\\bunknown\\b/])) flags.push('weak_proof');
  const domains = [/\\bfrontend\\b/.test(value), /\\bbackend\\b/.test(value), /\\bapi\\b/.test(value), /\\bdatabase\\b|\\bdb\\b|\\bschema\\b|\\bmigration\\b/.test(value), /\\bauth\\b|\\blogin\\b|\\bpermission\\b/.test(value), /\\bpayment\\b|\\bbilling\\b|\\bprovider\\b|\\bintegration\\b/.test(value)].filter(Boolean).length;
  if (domains >= 3) flags.push('multi_domain');
  const riskFlags = [...new Set(flags)];
  let inputType = 'change_request';
  if (/\\bharness\\b/.test(value)) inputType = 'harness_improvement';
  else if (/\\bmaintenance\\b|\\bdependency\\b|\\bupgrade\\b|\\bchore\\b|\\bcleanup\\b/.test(value)) inputType = 'maintenance';
  else if (/\\bslice\\b|\\bphase\\b|\\bpart\\b/.test(value)) inputType = 'spec_slice';
  else if (/\\binitiative\\b|\\bnew\\s+product\\b|\\blaunch\\b/.test(value)) inputType = 'new_initiative';
  else if (/\\bspec\\b|\\brequirement\\b/.test(value)) inputType = 'new_spec';
  const hardFlags = new Set(['auth', 'authorization', 'data_model', 'audit_security', 'external_systems']);
  let risk = riskFlags.some((flag) => hardFlags.has(flag)) ? 'high' : 'low';
  if (risk !== 'high' && hasAny(value, [/\\bapi\\b/, /\\bbackend\\b/, /\\bfrontend\\s+flow\\b/, /\\bform\\b/, /\\bdashboard\\b/, /\\bstate\\b/, /\\bintegration\\b/, /\\bcheckout\\b/])) risk = 'medium';
  if (risk !== 'high' && riskFlags.some((flag) => ['public_contract', 'cross_platform', 'existing_behavior', 'multi_domain'].includes(flag))) risk = 'medium';
  return { inputType, riskFlags, risk };
}

function productHarnessTemplate(config) {
  return ['# Product Contract', '', 'Project: ' + config.project_slug, 'Project type: ' + config.project_type, '', '## What This Product Is', '', '- Describe the product in plain language.', '', '## Users', '', '- Who this product is for.', '', '## Product Promises', '', '- What users should be able to trust.', '', '## Non-Goals', '', '- What this product should not become.', ''].join('\\n');
}

function harnessGuideTemplate() {
  return ['# Product Harness', '', 'Product Harness is not a skill and does not replace Superpowers.', '', 'It keeps feature work tied to plain product intent, risk, scope, proof, trace, and friction.', '', 'Daily logs record what happened today. Active Plan State records what step is active. Product Harness records the feature contract, proof, trace, and friction.', ''].join('\\n');
}

function storyIndexTemplate() {
  return ['# Story Index', '', 'Feature stories created by Product Harness live in dated folders.', '', '- Low and medium-risk tasks use one compact story file.', '- High-risk tasks use a packet folder with overview, design, validation, and execplan files.', '- High-risk stories need proof before final completion claims.', ''].join('\\n');
}

function validationMatrixTemplate() {
  return ['# Test Matrix', '', 'Product Harness keeps story proof visible here.', '', '| Story | Risk | Unit | Integration | E2E | Platform | Status | Evidence |', '| --- | --- | --- | --- | --- | --- | --- | --- |', ''].join('\\n');
}

function harnessDecisionsTemplate() {
  return ['# Product Decisions', '', 'Product Harness decisions are short product or feature decisions. Use vault Decisions.md for broader durable technical decisions when needed.', ''].join('\\n');
}

function harnessBacklogTemplate() {
  return ['# Harness Backlog', '', 'Open workflow friction that should make future harness behavior sharper.', '', '## Open Friction', '', '- none yet', ''].join('\\n');
}

function tracesReadmeTemplate() {
  return ['# Harness Traces', '', 'Short execution traces written after meaningful work. Compact context loads only the latest trace.', ''].join('\\n');
}

function ensureProductHarness(repoRoot, config) {
  [getRepoProductRoot(repoRoot), getRepoTracesRoot(repoRoot), getRepoStoriesRoot(repoRoot), getRepoValidationRoot(repoRoot), getRepoDecisionsRoot(repoRoot), getVaultProductHarnessRoot(config), getVaultTracesRoot(config), getVaultStoriesRoot(config), getVaultValidationRoot(config), getVaultDecisionsRoot(config)].forEach(ensureDir);
  writeFileIfMissing(path.join(getRepoProductRoot(repoRoot), 'PRODUCT.md'), productHarnessTemplate(config));
  writeFileIfMissing(path.join(getRepoProductRoot(repoRoot), 'HARNESS.md'), harnessGuideTemplate());
  writeFileIfMissing(getRepoBacklogPath(repoRoot), harnessBacklogTemplate());
  writeFileIfMissing(path.join(getRepoTracesRoot(repoRoot), 'README.md'), tracesReadmeTemplate());
  writeFileIfMissing(path.join(getRepoStoriesRoot(repoRoot), 'INDEX.md'), storyIndexTemplate());
  writeFileIfMissing(path.join(getRepoValidationRoot(repoRoot), 'TEST_MATRIX.md'), validationMatrixTemplate());
  writeFileIfMissing(path.join(getRepoDecisionsRoot(repoRoot), 'INDEX.md'), harnessDecisionsTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'), productHarnessTemplate(config));
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'HARNESS.md'), harnessGuideTemplate());
  writeFileIfMissing(getVaultBacklogPath(config), harnessBacklogTemplate());
  writeFileIfMissing(path.join(getVaultTracesRoot(config), 'README.md'), tracesReadmeTemplate());
  writeFileIfMissing(path.join(getVaultStoriesRoot(config), 'INDEX.md'), storyIndexTemplate());
  writeFileIfMissing(path.join(getVaultValidationRoot(config), 'TEST_MATRIX.md'), validationMatrixTemplate());
  writeFileIfMissing(path.join(getVaultDecisionsRoot(config), 'INDEX.md'), harnessDecisionsTemplate());
  [path.join(getRepoProductRoot(repoRoot), 'PRODUCT.md'), path.join(getRepoProductRoot(repoRoot), 'HARNESS.md'), getRepoBacklogPath(repoRoot)].forEach((sourcePath) => {
    const targetPath = path.join(getVaultProductHarnessRoot(config), path.basename(sourcePath));
    if (fs.existsSync(sourcePath)) {
      ensureDir(path.dirname(targetPath));
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
  fs.cpSync(getRepoTracesRoot(repoRoot), getVaultTracesRoot(config), { recursive: true });
  fs.cpSync(getRepoStoriesRoot(repoRoot), getVaultStoriesRoot(config), { recursive: true });
  fs.cpSync(getRepoValidationRoot(repoRoot), getVaultValidationRoot(config), { recursive: true });
  fs.cpSync(getRepoDecisionsRoot(repoRoot), getVaultDecisionsRoot(config), { recursive: true });
  updateHarnessMatrix(repoRoot, config);
  return getProductHarnessStatus(repoRoot, config);
}

function parseHarnessFields(content) {
  return parsePlanFields(content);
}

function collectStoryFiles(storiesRoot) {
  if (!fs.existsSync(storiesRoot)) return [];
  const files = [];
  const stack = [storiesRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md' && !['design.md', 'validation.md', 'execplan.md'].includes(entry.name)) {
        files.push(entryPath);
      }
    });
  }
  return files.sort();
}

function storyTitleFromContent(filePath, content) {
  const fields = parseHarnessFields(content);
  if (fields.title) return fields.title;
  const heading = content.match(/^#\\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(filePath, '.md');
}

function countStoryProofs(content) {
  const match = content.match(/## Proof Log\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)/);
  if (!match) return 0;
  return match[1].split(/\\r?\\n/).filter((line) => /^-\\s+\\d{4}-\\d{2}-\\d{2}T/.test(line.trim())).length;
}

function latestStoryProof(content) {
  const match = content.match(/## Proof Log\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)/);
  if (!match) return null;
  const proofLines = match[1].split(/\\r?\\n/).filter((line) => /^-\\s+\\d{4}-\\d{2}-\\d{2}T/.test(line.trim()));
  const latest = proofLines[proofLines.length - 1];
  return latest ? latest.replace(/^-\\s+\\d{4}-\\d{2}-\\d{2}T[^\\s]+\\s+-\\s+/, '').trim() : null;
}

function readStoryRecord(repoRoot, config, filePath) {
  const content = readFile(filePath);
  if (!content) return null;
  const fields = parseHarnessFields(content);
  const title = storyTitleFromContent(filePath, content);
  const relativeStoryPath = path.relative(getRepoStoriesRoot(repoRoot), filePath).replace(/\\\\/g, '/');
  const isPacket = path.basename(filePath) === 'overview.md' || fields.type === 'agent-bootstrap-story-packet';
  const storyRoot = isPacket ? path.dirname(filePath) : filePath;
  return {
    title,
    slug: fields.slug || planSlug(title),
    risk: fields.risk || 'medium',
    inputType: fields.input_type || 'change_request',
    riskFlags: fields.risk_flags && fields.risk_flags !== 'none' ? fields.risk_flags.split(',').map((item) => item.trim()).filter(Boolean) : [],
    status: fields.status === 'proof_added' ? 'proof_added' : 'intake',
    created: fields.created || path.basename(path.dirname(filePath)),
    updated: fields.updated || fs.statSync(filePath).mtime.toISOString(),
    proofCount: countStoryProofs(content),
    latestProof: latestStoryProof(content),
    repoPath: filePath,
    storyRoot,
    vaultPath: path.join(getVaultStoriesRoot(config), relativeStoryPath),
    vaultStoryRoot: path.join(getVaultStoriesRoot(config), path.relative(getRepoStoriesRoot(repoRoot), storyRoot).replace(/\\\\/g, '/')),
    relativeRepoPath: path.relative(repoRoot, filePath).replace(/\\\\/g, '/'),
    isPacket,
  };
}

function readStoryRecords(repoRoot, config) {
  return collectStoryFiles(getRepoStoriesRoot(repoRoot)).map((filePath) => readStoryRecord(repoRoot, config, filePath)).filter(Boolean).sort((left, right) => String(right.updated).localeCompare(String(left.updated)));
}

function proofGapsForStory(story) {
  if (!story || story.proofCount > 0) return [];
  if (story.risk === 'high') return ['High-risk story "' + story.title + '" has no proof recorded yet.', 'Auth/security or data-safety proof is required before completion claims when relevant.'];
  if (story.risk === 'medium') return ['Medium-risk story "' + story.title + '" needs at least one verification proof before final response.'];
  return [];
}

function getProductHarnessStatus(repoRoot, config) {
  const stories = readStoryRecords(repoRoot, config);
  const currentStory = stories[0] || null;
  const decisions = readFile(path.join(getRepoDecisionsRoot(repoRoot), 'INDEX.md')) || '';
  const openFriction = readOpenFriction(repoRoot, config);
  const traces = collectTraceFiles(getRepoTracesRoot(repoRoot));
  return {
    ok: fs.existsSync(path.join(getRepoProductRoot(repoRoot), 'HARNESS.md')) && fs.existsSync(getRepoBacklogPath(repoRoot)) && fs.existsSync(getRepoTracesRoot(repoRoot)) && fs.existsSync(path.join(getVaultStoriesRoot(config), 'INDEX.md')) && fs.existsSync(getVaultBacklogPath(config)) && fs.existsSync(getVaultTracesRoot(config)),
    repoHarnessRoot: path.join(repoRoot, 'docs'),
    vaultHarnessRoot: getVaultProductHarnessRoot(config),
    currentStory,
    latestTrace: traces[0] ? readTraceRecord(repoRoot, config, traces[0]) : null,
    openFriction,
    proofGaps: proofGapsForStory(currentStory),
    counts: {
      stories: stories.length,
      highRiskStories: stories.filter((story) => story.risk === 'high').length,
      storiesMissingProof: stories.filter((story) => story.risk !== 'low' && story.proofCount === 0).length,
      decisions: (decisions.match(/^##\\s+/gm) || []).length,
      traces: traces.length,
      openFriction: openFriction.length,
    },
    stories,
  };
}

function renderHarnessContext(status) {
  const lines = ['# Product Harness', '', 'Product Harness is not a skill and does not replace Superpowers.', 'It records feature intent, risk, scope, proof, trace, and friction while daily logs record what happened today.', '', '- Stories: ' + status.counts.stories, '- High-risk stories: ' + status.counts.highRiskStories, '- Stories missing proof: ' + status.counts.storiesMissingProof, '- Traces: ' + status.counts.traces, '- Open friction: ' + status.counts.openFriction, '', '## Current Story'];
  if (status.currentStory) {
    lines.push('- Title: ' + status.currentStory.title, '- Risk: ' + status.currentStory.risk, '- Input type: ' + status.currentStory.inputType, '- Risk flags: ' + (status.currentStory.riskFlags.length ? status.currentStory.riskFlags.join(', ') : 'none'), '- Status: ' + status.currentStory.status, '- Source: ' + status.currentStory.relativeRepoPath);
  } else {
    lines.push('- none');
  }
  lines.push('', '## Proof gaps');
  lines.push(...(status.proofGaps.length ? status.proofGaps.map((gap) => '- ' + gap) : ['- none']));
  lines.push('', '## Latest Trace');
  if (status.latestTrace) lines.push('- Summary: ' + status.latestTrace.summary, '- Outcome: ' + status.latestTrace.outcome, '- Source: ' + status.latestTrace.relativeRepoPath);
  else lines.push('- none');
  lines.push('', '## Open Friction');
  lines.push(...(status.openFriction.length ? status.openFriction.slice(0, 3).map((item) => '- ' + item.pain) : ['- none']));
  lines.push('');
  return lines.join('\\n');
}

function storyProofChecklist(risk) {
  if (risk === 'high') {
    return ['- [ ] happy path proof: expected user flow works.', '- [ ] failure path proof: wrong password, unauthorized request, invalid input, or equivalent bad path is rejected.', '- [ ] auth/security proof: verify auth, permission, token, secret, rate-limit, and data exposure behavior when relevant.', '- [ ] regression proof: smallest useful automated test, build, or smoke check ran.'];
  }
  if (risk === 'medium') {
    return ['- [ ] primary flow proof: expected behavior works.', '- [ ] boundary proof: at least one error, empty, or edge path is checked when relevant.', '- [ ] regression proof: smallest useful automated test, build, or smoke check ran.'];
  }
  return ['- [ ] lightweight proof: quick check, doc review, or smallest useful smoke test.'];
}

function renderStoryFile(config, data) {
  return ['---', 'type: agent-bootstrap-story', 'project: ' + config.project_slug, 'title: ' + data.title, 'slug: ' + planSlug(data.title), 'risk: ' + data.risk, 'input_type: ' + data.inputType, 'risk_flags: ' + (data.riskFlags.length ? data.riskFlags.join(',') : 'none'), 'status: ' + data.status, 'created: ' + data.created, 'updated: ' + data.updated, 'linked_plan: docs/superpowers/plans/CURRENT.md', '---', '', '# ' + data.created + ' - ' + data.title, '', '## Goal', '', data.title, '', '## Scope', '', '- Track product behavior tied to this feature only.', '- Keep implementation work in Active Plan State and daily execution details in Daily logs.', '', '## Out Of Scope', '', '- Unrelated refactors.', '- Unrequested product behavior.', '- New workflow skills or new core subagents.', '', '## Risk', '', '- Level: ' + data.risk, '- Input type: ' + data.inputType, '- Risk flags: ' + (data.riskFlags.length ? data.riskFlags.join(', ') : 'none'), '- Product Harness uses risk only to decide proof depth; Superpowers still owns the workflow.', '', '## Proof Checklist', '', ...storyProofChecklist(data.risk), '', '## Progress Log', '', ...(data.progressLines.length ? data.progressLines : ['- none yet']), '', '## Proof Log', '', ...(data.proofLines.length ? data.proofLines : ['- none yet']), '', '## Product Decisions', '', '- none yet', ''].join('\\n');
}

function renderStoryPacketOverview(config, data) {
  return ['---', 'type: agent-bootstrap-story-packet', 'project: ' + config.project_slug, 'title: ' + data.title, 'slug: ' + planSlug(data.title), 'risk: ' + data.risk, 'input_type: ' + data.inputType, 'risk_flags: ' + (data.riskFlags.length ? data.riskFlags.join(',') : 'none'), 'status: ' + data.status, 'created: ' + data.created, 'updated: ' + data.updated, 'linked_plan: docs/superpowers/plans/CURRENT.md', '---', '', '# ' + data.created + ' - ' + data.title, '', '## Goal', '', data.title, '', '## Current Behavior', '', '- Unknown until confirmed from repo context, user request, tests, or source-backed memory.', '- Do not guess current behavior when evidence is missing.', '', '## Scope', '', '- Track product behavior tied to this high-risk task only.', '- Keep implementation work in Active Plan State and daily execution details in Daily logs.', '', '## Out Of Scope', '', '- Unrelated refactors.', '- Unrequested product behavior.', '- New workflow skills or new core subagents.', '', '## Risk', '', '- Level: ' + data.risk, '- Input type: ' + data.inputType, '- Risk flags: ' + (data.riskFlags.length ? data.riskFlags.join(', ') : 'none'), '- Hard gates such as auth, permission, migration, data loss, security, and external providers require proof before completion claims.', '', '## Proof Checklist', '', ...storyProofChecklist(data.risk), '', '## Story Packet', '', '- Design: design.md', '- Validation: validation.md', '- Execution plan: execplan.md', '', '## Progress Log', '', ...(data.progressLines.length ? data.progressLines : ['- none yet']), '', '## Proof Log', '', ...(data.proofLines.length ? data.proofLines : ['- none yet']), '', '## Product Decisions', '', '- none yet', ''].join('\\n');
}

function renderPacketValidation(title, data, proofLines) {
  return ['# Validation', '', 'Story: ' + title, '', '## Required Proof', '', ...storyProofChecklist(data.risk), '', '## Auth/Security Proof', '', '- auth/security proof: wrong password, unauthorized request, invalid token, missing permission, or equivalent bad path must be rejected when relevant.', '', '## Regression Proof', '', '- Run the smallest useful automated test, build, or smoke check.', '', '## Proof Log', '', ...(proofLines.length ? proofLines : ['- none yet']), ''].join('\\n');
}

function renderPacketDesign(title, data) {
  return ['# Design', '', 'Story: ' + title, 'Risk: ' + data.risk, 'Risk flags: ' + (data.riskFlags.length ? data.riskFlags.join(', ') : 'none'), '', '## Existing Behavior To Confirm', '', '- Read the current code path before changing behavior.', '- Mark unknowns as unknown instead of filling gaps from memory.', '', '## Proposed Shape', '', '- Keep the smallest useful change that satisfies the story.', '- Preserve public contracts unless the story explicitly changes them.', '', '## Data And Security Notes', '', '- Verify auth, authorization, data access, secrets, uploads, providers, and migrations when relevant.', '- No sensitive secrets should be copied into this packet.', ''].join('\\n');
}

function renderPacketExecPlan(title) {
  return ['# Execution Plan', '', 'Story: ' + title, '', '## Steps', '', '- [ ] Confirm existing behavior and scope.', '- [ ] Implement the smallest useful change.', '- [ ] Run required proof.', '- [ ] Record Product Harness proof and trace.', '', '## Stop Conditions', '', '- Stop and ask if scope changes materially.', '- Stop if required proof cannot be run or interpreted.', '- Stop if auth, data, or external-provider behavior is unknown.', ''].join('\\n');
}

function readStoryParts(filePath) {
  const content = readFile(filePath) || '';
  const fields = parseHarnessFields(content);
  const clean = (section) => {
    const match = content.match(new RegExp('## ' + section + '\\\\r?\\\\n\\\\r?\\\\n([\\\\s\\\\S]*?)(?:\\\\r?\\\\n## |\\\\s*$)'));
    return (match && match[1] ? match[1] : '').split(/\\r?\\n/).map((line) => line.trimEnd()).filter((line) => line && line !== '- none yet');
  };
  return {
    title: fields.title || storyTitleFromContent(filePath, content),
    risk: fields.risk || 'medium',
    inputType: fields.input_type || 'change_request',
    riskFlags: fields.risk_flags && fields.risk_flags !== 'none' ? fields.risk_flags.split(',').map((item) => item.trim()).filter(Boolean) : [],
    created: fields.created || path.basename(path.dirname(filePath)),
    progressLines: clean('Progress Log'),
    proofLines: clean('Proof Log'),
  };
}

function writeStoryUpdate(repoRoot, config, storyPath, status, progressLine, proofLine) {
  const parts = readStoryParts(storyPath);
  const updated = getIsoTimestamp();
  const progressLines = progressLine ? [...parts.progressLines, '- ' + updated + ' - ' + progressLine] : parts.progressLines;
  const proofLines = proofLine ? [...parts.proofLines, '- ' + updated + ' - ' + proofLine] : parts.proofLines;
  if (path.basename(storyPath) === 'overview.md') {
    writeFile(storyPath, renderStoryPacketOverview(config, { title: parts.title, risk: parts.risk, inputType: parts.inputType, riskFlags: parts.riskFlags, status, created: parts.created, updated, progressLines, proofLines }));
    writeFile(path.join(path.dirname(storyPath), 'validation.md'), renderPacketValidation(parts.title, parts, proofLines));
  } else {
    writeFile(storyPath, renderStoryFile(config, { title: parts.title, risk: parts.risk, inputType: parts.inputType, riskFlags: parts.riskFlags, status, created: parts.created, updated, progressLines, proofLines }));
  }
  updateHarnessMatrix(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  return readStoryRecord(repoRoot, config, storyPath);
}

function updateHarnessMatrix(repoRoot, config) {
  const stories = readStoryRecords(repoRoot, config);
  const lines = ['# Test Matrix', '', 'Product Harness keeps story proof visible here.', '', '| Story | Risk | Unit | Integration | E2E | Platform | Status | Evidence |', '| --- | --- | --- | --- | --- | --- | --- | --- |'];
  stories.slice().reverse().forEach((story) => {
    const hasProof = story.proofCount > 0;
    const evidence = (story.latestProof || 'none').replace(/\\|/g, '/');
    lines.push('| ' + [story.title.replace(/\\|/g, '/'), story.risk, hasProof ? 'yes' : 'no', 'no', 'no', 'no', hasProof ? 'implemented' : 'planned', evidence].join(' | ') + ' |');
  });
  lines.push('');
  writeFile(path.join(getRepoValidationRoot(repoRoot), 'TEST_MATRIX.md'), lines.join('\\n'));
  writeFile(path.join(getVaultValidationRoot(config), 'TEST_MATRIX.md'), lines.join('\\n'));
}

function collectTraceFiles(root) {
  if (!fs.existsSync(root)) return [];
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(entryPath);
      else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') files.push(entryPath);
    });
  }
  return files.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
}

function readTraceRecord(repoRoot, config, filePath) {
  const content = readFile(filePath) || '';
  const summary = (content.match(/^- Summary:\\s+(.+)$/m) || [])[1] || path.basename(filePath, '.md');
  const outcome = (content.match(/^- Outcome:\\s+(.+)$/m) || [])[1] || 'completed';
  const created = (content.match(/^- Created:\\s+(.+)$/m) || [])[1] || fs.statSync(filePath).mtime.toISOString();
  const currentStory = (content.match(/^- Current story:\\s+(.+)$/m) || [])[1] || null;
  const relative = path.relative(getRepoTracesRoot(repoRoot), filePath).replace(/\\\\/g, '/');
  return { summary, outcome, created, repoPath: filePath, vaultPath: path.join(getVaultTracesRoot(config), relative), relativeRepoPath: path.relative(repoRoot, filePath).replace(/\\\\/g, '/'), currentStory: currentStory === 'none' ? null : currentStory };
}

function readOpenFriction(repoRoot, config) {
  const content = readFile(getRepoBacklogPath(repoRoot)) || '';
  const records = [];
  content.split(/\\r?\\n##\\s+/).slice(1).forEach((block) => {
    const lines = block.split(/\\r?\\n/);
    const heading = lines.shift();
    if (!heading || heading === 'Open Friction' || /\\bresolved\\b/i.test(heading)) return;
    const painLine = lines.find((line) => /^-\\s+Pain:\\s+/.test(line)) || lines.find((line) => /^-\\s+/.test(line));
    const pain = painLine ? painLine.replace(/^-\\s+Pain:\\s+/, '').replace(/^-\\s+/, '').trim() : heading.trim();
    if (pain && pain !== 'none yet') records.push({ pain, status: 'proposed', created: heading.split(' - ')[0].trim(), repoPath: getRepoBacklogPath(repoRoot), vaultPath: getVaultBacklogPath(config) });
  });
  return records;
}

function inferHarnessOutcome(summary) {
  const value = String(summary || '').toLowerCase();
  if (/\\bblocked\\b|\\bstuck\\b|\\bwaiting\\b/.test(value)) return 'blocked';
  if (/\\bfailed\\b|\\bfail\\b|\\berror\\b|\\bbroken\\b/.test(value)) return 'failed';
  if (/\\bpartial\\b|\\bunfinished\\b|\\bincomplete\\b|\\bremaining\\b|\\bwip\\b/.test(value)) return 'partial';
  return 'completed';
}

function runtimeTimestampForFile() {
  return getIsoTimestamp().replace(/[:.]/g, '-');
}

function currentPlanPointer(repoRoot) {
  const currentPath = path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md');
  const body = readFile(currentPath);
  if (!body) return 'none';
  const match = body.match(/- Plan:\\s+(.+)$/m);
  return match ? match[1].trim() : path.relative(repoRoot, currentPath).replace(/\\\\/g, '/');
}

function runHarnessCommand(repoRoot, config, subcommand, value) {
  ensureProductHarness(repoRoot, config);
  if (subcommand === 'status') return getProductHarnessStatus(repoRoot, config);
  if (subcommand === 'intake') {
    const title = (value || '').trim();
    if (!title) throw new Error('Harness intake requires a feature title.');
    const slug = planSlug(title);
    const existing = readStoryRecords(repoRoot, config).find((story) => story.slug === slug);
    if (existing) {
      const resumed = writeStoryUpdate(repoRoot, config, existing.repoPath, existing.status, 'Product Harness story resumed.');
      return { action: 'resumed', risk: resumed.risk, inputType: resumed.inputType, riskFlags: resumed.riskFlags, status: resumed.status, storyPath: resumed.repoPath, storyRoot: resumed.storyRoot, vaultStoryPath: resumed.vaultPath, vaultStoryRoot: resumed.vaultStoryRoot };
    }
    const today = getTodayString();
    const updated = getIsoTimestamp();
    const classification = classifyHarnessIntake(title);
    const storyRoot = classification.risk === 'high' ? path.join(getRepoStoriesRoot(repoRoot), today, today + '-' + slug) : path.join(getRepoStoriesRoot(repoRoot), today, today + '-' + slug + '.md');
    const storyPath = classification.risk === 'high' ? path.join(storyRoot, 'overview.md') : storyRoot;
    if (classification.risk === 'high') {
      writeFile(storyPath, renderStoryPacketOverview(config, { title, risk: classification.risk, inputType: classification.inputType, riskFlags: classification.riskFlags, status: 'intake', created: today, updated, progressLines: ['- ' + updated + ' - Product Harness intake created.'], proofLines: [] }));
      writeFile(path.join(storyRoot, 'design.md'), renderPacketDesign(title, classification));
      writeFile(path.join(storyRoot, 'validation.md'), renderPacketValidation(title, classification, []));
      writeFile(path.join(storyRoot, 'execplan.md'), renderPacketExecPlan(title));
    } else {
      writeFile(storyPath, renderStoryFile(config, { title, risk: classification.risk, inputType: classification.inputType, riskFlags: classification.riskFlags, status: 'intake', created: today, updated, progressLines: ['- ' + updated + ' - Product Harness intake created.'], proofLines: [] }));
    }
    updateHarnessMatrix(repoRoot, config);
    ensureProductHarness(repoRoot, config);
    const record = readStoryRecord(repoRoot, config, storyPath);
    return { action: 'started', risk: record.risk, inputType: record.inputType, riskFlags: record.riskFlags, status: record.status, storyPath: record.repoPath, storyRoot: record.storyRoot, vaultStoryPath: record.vaultPath, vaultStoryRoot: record.vaultStoryRoot };
  }
  if (subcommand === 'proof') {
    const summary = (value || '').trim();
    if (!summary) throw new Error('Harness proof requires a verification summary.');
    const active = getProductHarnessStatus(repoRoot, config).currentStory;
    if (!active) throw new Error('No Product Harness story. Run harness intake first.');
    const record = writeStoryUpdate(repoRoot, config, active.repoPath, 'proof_added', undefined, summary);
    return { action: 'proof-recorded', status: record.status, storyPath: record.repoPath, storyRoot: record.storyRoot, vaultStoryPath: record.vaultPath, vaultStoryRoot: record.vaultStoryRoot };
  }
  if (subcommand === 'decision') {
    const summary = (value || '').trim();
    if (!summary) throw new Error('Harness decision requires a decision summary.');
    const timestamp = getIsoTimestamp();
    const entry = '\\n## ' + timestamp + '\\n- Decision: ' + summary + '\\n- Source: Product Harness\\n';
    const repoDecisionPath = path.join(getRepoDecisionsRoot(repoRoot), 'INDEX.md');
    const vaultDecisionPath = path.join(getVaultDecisionsRoot(config), 'INDEX.md');
    writeFile(repoDecisionPath, (readFile(repoDecisionPath) || harnessDecisionsTemplate()).trimEnd() + '\\n' + entry);
    writeFile(vaultDecisionPath, (readFile(vaultDecisionPath) || harnessDecisionsTemplate()).trimEnd() + '\\n' + entry);
    ensureProductHarness(repoRoot, config);
    return { action: 'decision-recorded', repoDecisionPath, vaultDecisionPath };
  }
  if (subcommand === 'trace') {
    const summary = (value || '').trim();
    if (!summary) throw new Error('Harness trace requires a short task summary.');
    const status = getProductHarnessStatus(repoRoot, config);
    const today = getTodayString();
    const timestamp = getIsoTimestamp();
    const outcome = inferHarnessOutcome(summary);
    const tracePath = path.join(getRepoTracesRoot(repoRoot), today, runtimeTimestampForFile() + '-' + planSlug(summary).slice(0, 80) + '.md');
    const relative = path.relative(getRepoTracesRoot(repoRoot), tracePath).replace(/\\\\/g, '/');
    const vaultTracePath = path.join(getVaultTracesRoot(config), relative);
    let gitStatus = [];
    try {
      gitStatus = cp.execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' }).split(/\\r?\\n/).map((line) => line.trimEnd()).filter(Boolean);
    } catch (_) {}
    const body = ['# Harness Trace', '', '- Created: ' + timestamp, '- Summary: ' + summary, '- Outcome: ' + outcome, '- Current story: ' + (status.currentStory ? status.currentStory.title : 'none'), '- Current story path: ' + (status.currentStory ? status.currentStory.relativeRepoPath : 'none'), '- Current plan: ' + currentPlanPointer(repoRoot), '- Proof summary: ' + ((status.currentStory && status.currentStory.latestProof) || 'none'), '', '## Files Changed Or Read', '', ...(gitStatus.length ? gitStatus.map((line) => '- ' + line) : ['- clean or unavailable']), '', '## Notes', '', '- This trace is a short Product Harness breadcrumb, not a replacement for tests, daily logs, or Active Plan State.', ''].join('\\n');
    writeFile(tracePath, body);
    writeFile(vaultTracePath, body);
    ensureProductHarness(repoRoot, config);
    return { action: 'trace-recorded', outcome, tracePath, vaultTracePath };
  }
  if (subcommand === 'friction') {
    const pain = (value || '').trim();
    if (!pain) throw new Error('Harness friction requires a pain point or missing workflow.');
    const status = getProductHarnessStatus(repoRoot, config);
    const timestamp = getIsoTimestamp();
    const existing = (readFile(getRepoBacklogPath(repoRoot)) || harnessBacklogTemplate()).replace(/\\n-\\s+none yet\\s*\\n?/, '\\n');
    const entry = '\\n## ' + timestamp + ' - proposed\\n- Pain: ' + pain + '\\n- Current story: ' + (status.currentStory ? status.currentStory.title : 'none') + '\\n- Current plan: ' + currentPlanPointer(repoRoot) + '\\n- Next harness improvement: clarify this friction before it repeats.\\n';
    writeFile(getRepoBacklogPath(repoRoot), existing.trimEnd() + '\\n' + entry);
    writeFile(getVaultBacklogPath(config), existing.trimEnd() + '\\n' + entry);
    ensureProductHarness(repoRoot, config);
    return { action: 'friction-recorded', status: 'proposed', backlogPath: getRepoBacklogPath(repoRoot), vaultBacklogPath: getVaultBacklogPath(config) };
  }
  throw new Error('Unknown harness command. Use: status, intake, proof, decision, trace, friction.');
}

function parseFlags(argv) {
  const args = [...argv];
  const options = {};
  const rest = [];
  const booleanFlags = new Set(['compact', 'full', 'why']);

  while (args.length > 0) {
    const value = args.shift();
    if (!value.startsWith('--')) {
      rest.push(value);
      continue;
    }

    const flag = value.slice(2);
    if (booleanFlags.has(flag)) {
      options[flag] = true;
      continue;
    }

    const next = args.shift();
    if (!next || next.startsWith('--')) {
      throw new Error(\`Missing value for --\${flag}\`);
    }

    options[flag] = next;
  }

  return { rest, options };
}

function writeMemory(repoRoot, config, mode, content, title, scope, source, confidence) {
  switch (mode) {
    case 'task':
      return appendTask(config, content);
    case 'decision':
      if (!title) {
        throw new Error('Title is required for decision mode.');
      }
      return appendDecision(config, title, content);
    case 'fact':
      if (!title) {
        throw new Error('Title is required for fact mode.');
      }
      return appendFact(config, title, content, source, confidence);
    case 'question':
      if (!title) {
        throw new Error('Title is required for question mode.');
      }
      return appendQuestion(config, title, content);
    case 'handoff':
      return appendHandoff(config, content);
    case 'compact':
      return compactSessionMemory(config);
    case 'research':
    case 'note':
      if (!title) {
        throw new Error(\`Title is required for \${mode} mode.\`);
      }
      return createNote(config, mode, title, content, scope);
    case 'post-commit': {
      let sha = '';
      let subject = '';
      let body = '';

      try {
        sha = cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' }).trim();
        subject = cp.execFileSync('git', ['log', '-1', '--pretty=%s'], { cwd: repoRoot, encoding: 'utf8' }).trim();
        body = cp.execFileSync('git', ['log', '-1', '--pretty=%b'], { cwd: repoRoot, encoding: 'utf8' }).trim();
      } catch (error) {
        throw new Error(\`Could not read latest commit information: \${error.message}\`);
      }

      const shortSha = sha.slice(0, 7);
      const noteTitle = \`Commit \${shortSha} - \${subject || 'update'}\`;
      const noteBody = [
        \`- Commit: \\\`\${sha}\\\`\`,
        \`- Subject: \${subject || 'n/a'}\`,
        body ? \`- Body: \${body.replace(/\\r?\\n+/g, ' / ')}\` : '- Body: n/a',
        '- Source: git post-commit hook',
      ].join('\\n');
      return createNote(config, 'note', noteTitle, noteBody, 'project', ['commit-log']);
    }
    default:
      throw new Error(\`Unsupported mode: \${mode}\`);
  }
}

function main(argv) {
  const { rest, options } = parseFlags(argv);
  const [command, maybeContent] = rest;
  const repoRoot = options['repo-root'] ? findContextRoot(path.resolve(options['repo-root'])) : findContextRoot(process.cwd());

  if (!command || command === 'context') {
    const mode = options.full ? 'full' : 'compact';
    const config = readOptionalRepoConfig(repoRoot);
    process.stdout.write(\`\${getContext(repoRoot, config, mode, Boolean(options.why))}\\n\`);
    return;
  }

  const config = readRepoConfig(repoRoot);

  if (command === 'recall') {
    if (!maybeContent) {
      throw new Error('Recall requires a query: node scripts/agent-memory.js recall "<query>"');
    }
    process.stdout.write(\`\${formatRecallResults(config, maybeContent, recallProjectMemory(config, maybeContent))}\\n\`);
    return;
  }

  if (command === 'memory') {
    if (!maybeContent) {
      throw new Error('Memory requires a subcommand: status, import-sessions, sync-sessions, export, backup.');
    }
    process.stdout.write(\`\${JSON.stringify(runMemoryCommand(repoRoot, config, maybeContent), null, 2)}\\n\`);
    return;
  }

  if (command === 'plan') {
    if (!maybeContent) {
      throw new Error('Plan requires a subcommand: status, start, update, complete, interrupt.');
    }
    process.stdout.write(\`\${JSON.stringify(runPlanCommand(repoRoot, config, maybeContent, rest[2]), null, 2)}\\n\`);
    return;
  }

  if (command === 'harness') {
    if (!maybeContent) {
      throw new Error('Harness requires a subcommand: status, intake, proof, decision, trace, friction.');
    }
    process.stdout.write(\`\${JSON.stringify(runHarnessCommand(repoRoot, config, maybeContent, rest[2]), null, 2)}\\n\`);
    return;
  }

  if (command === 'post-commit') {
    process.stdout.write(\`\${writeMemory(repoRoot, config, 'post-commit', '', '', 'project')}\\n\`);
    return;
  }

  process.stdout.write(\`\${writeMemory(repoRoot, config, command, maybeContent || '', options.title, options.scope, options.source, options.confidence)}\\n\`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  process.stderr.write(\`\${message}\\n\`);
  process.exit(1);
}
`;
}

export function gitPostCommitHookTemplate(): string {
  return `#!/usr/bin/env sh
set +e

if command -v node >/dev/null 2>&1; then
  node scripts/agent-memory.js post-commit >/dev/null 2>&1 || true
fi

exit 0
`;
}
