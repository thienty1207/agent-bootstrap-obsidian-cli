"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectReadmeTemplate = projectReadmeTemplate;
exports.tasksTemplate = tasksTemplate;
exports.decisionsTemplate = decisionsTemplate;
exports.factsTemplate = factsTemplate;
exports.openQuestionsTemplate = openQuestionsTemplate;
exports.handoffTemplate = handoffTemplate;
exports.repoReadmeTemplate = repoReadmeTemplate;
exports.rootAgentTemplate = rootAgentTemplate;
exports.projectMapTemplate = projectMapTemplate;
exports.vaultMemoryDoc = vaultMemoryDoc;
exports.localRuntimeScriptTemplate = localRuntimeScriptTemplate;
exports.gitPostCommitHookTemplate = gitPostCommitHookTemplate;
function projectReadmeTemplate(projectSlug, sourcePath, today, projectType) {
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
function tasksTemplate(projectSlug, today) {
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
function decisionsTemplate(projectSlug, today) {
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
function factsTemplate(projectSlug, today) {
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
function openQuestionsTemplate(projectSlug, today) {
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
function handoffTemplate(projectSlug, today) {
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
function repoReadmeTemplate(repoName, projectSlug, projectType) {
    return `# ${repoName}

${repoName} is a VS Code friendly agent workspace layout.

It keeps the agent workspace under \`.codex\`, while GitHub automation stays under \`.github/workflows\` and project-facing documentation lives at the repository root.

Project slug: \`${projectSlug}\`
Project type: \`${projectType}\`

This package is documented around install/update, setup, init, project update, automatic context, semantic recall, memory status, automatic session import, backup, and uninstall.
\`agent-bootstrap context --compact\` is automatic agent startup; \`recall\` and \`memory\` commands are available for targeted inspection and maintenance.

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
- \`plans/\`: implementation templates and handoff reports
- \`scripts/\`: repo-local runtime helpers for durable memory write-back

## Ownership Boundaries

- \`README.md\` is user-owned and preserved if it already exists.
- \`AGENTS.md\`, \`.codex/README.md\`, \`docs/vault-memory.md\`, \`docs/project-map.md\`, \`scripts/agent-memory.js\`, and \`.githooks/post-commit\` are managed bridge files.
- \`.codex/\` is kit-managed and refreshed from the installed kit by \`agent-bootstrap init\` or \`agent-bootstrap update\`.
- Bundled optional skill folders are refreshed by \`agent-bootstrap update\`; custom skill folders under \`.codex/skills/<custom-skill>/\` are preserved when they are registered in \`.codex/skills/INDEX.md\`.
- Custom agent files under \`.codex/agents/<custom-agent>.toml\` are preserved by \`agent-bootstrap update\` when they are registered in \`.codex/agents/INDEX.md\`.
- \`docs/\` and \`plans/\` template assets are safely synced from the installed kit when they are still untouched.
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
`;
}
function typeFocus(projectType) {
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
function rootAgentTemplate(vaultRoot, projectRoot, projectType) {
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
12. \`${projectRoot}/Sessions/\` summaries, \`${projectRoot}/Sessions/Imported/\` Codex imports, \`${projectRoot}/Artifacts/session-import-state.json\`, and \`${projectRoot}/Artifacts/recall-index.json\` through bounded Auto Recall
13. relevant docs under \`docs/\`, targeted agent assets under \`.codex/\`, and workflows under \`.github/workflows/\`

## Context discipline

- Treat \`src/\` as source of truth; \`dist/\` and \`runtime/agent-bootstrap/dist/\` are generated build outputs.
- Read \`.codex/INDEX.md\` before choosing agent assets.
- Read \`.codex/agents/INDEX.md\` before dispatching a subagent.
- Read \`.codex/skills/INDEX.md\` before loading any skill.
- Use Superpowers as the only bundled workflow skill. Bundled optional domain skills such as \`frontend-design\` and \`vibe-security-scan\` are lazy-loaded only when \`.codex/skills/INDEX.md\` routes the task there. Optional project skills must be registered in \`.codex/skills/INDEX.md\` before loading.
- Superpowers is the workflow brain. The 3 bundled core subagents are quality gates: \`code-reviewer\`, \`security-auditor\`, and \`test-engineer\`.
- Optional project agents must be registered in \`.codex/agents/INDEX.md\` before use.
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
- \`agent-bootstrap memory import-sessions\`
- \`agent-bootstrap context --why\`
- \`agent-bootstrap context --full\`

Running \`agent-bootstrap context --compact\` should be the first step in a fresh session. It ensures today's daily note exists, records a session marker automatically, imports matched Codex sessions, refreshes the hybrid recall index, loads routed repo/vault memory, and includes bounded Auto Recall so the agent does not need to scan the vault manually.

## Write-back rules

After meaningful work, write back to the vault:

- \`Tasks.md\` for status and next steps
- \`Decisions.md\` for technical decisions
- \`Facts.md\` for stable facts future sessions can trust
- \`Open Questions.md\` for unresolved assumptions and blockers
- \`Handoff.md\` for the latest concise next-session handoff
- \`Research/\` for project-specific research
- global \`Research\` or \`Notes\` for reusable insights

The repo runtime handles the low-friction automation:

- it appends to today's daily note automatically
- it routes \`research\` and \`note\` entries to project or global scope automatically unless you override \`--scope\`
- it records routing reasons and keeps a compact project memory index under \`Artifacts/memory-index.json\`
- it keeps a local QMD-inspired semantic recall index under \`Artifacts/recall-index.json\`
- it imports matched Codex sessions into \`Sessions/Imported/\`, redacts obvious secrets, and tracks dedupe state under \`Artifacts/session-import-state.json\`
- it writes clean session summaries under \`Sessions/\` through \`compact\` or \`memory sync-sessions\`
- it still supports explicit \`--scope project\` or \`--scope global\` when needed

Before a final response after meaningful work, run \`node scripts/agent-memory.js compact\` silently when it would help the next session. Use \`node scripts/agent-memory.js memory sync-sessions\` for an explicit clean session replay note.

## Repo-local runtime

- \`agent-bootstrap context\` for read-only session context
- \`agent-bootstrap recall "<query>"\` or \`node scripts/agent-memory.js recall "<query>"\` for targeted memory search
- \`agent-bootstrap memory <status|import-sessions|sync-sessions|export|backup>\` or \`node scripts/agent-memory.js memory <status|import-sessions|sync-sessions|export|backup>\` for memory health, import inspection, and backup
- \`node scripts/agent-memory.js <task|decision|research|note|fact|question|handoff|compact>\` for write-back and memory compaction
- git \`post-commit\` hook auto-writes a durable worklog note into the vault
`;
}
function typeHotspots(projectType) {
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
function typeVerificationPath(projectType) {
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
function projectMapTemplate(repoName, projectSlug, projectType) {
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
function vaultMemoryDoc(vaultRoot, projectRoot, projectType) {
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

## Write-back rules

After meaningful work:

- update \`Tasks.md\` for status, handoff, and next actions
- update \`Decisions.md\` for architecture or implementation decisions
- update \`Facts.md\` for durable facts backed by repo/context/source evidence
- update \`Open Questions.md\` for unresolved unknowns instead of guessing
- update \`Handoff.md\` with the latest concise next-session state
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
`;
}
function localRuntimeScriptTemplate() {
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
  const relativeProjectPath = path.relative(config.project_root, filePath).replace(/\\\\/g, '/');
  const relativeVaultPath = path.relative(config.vault_root, filePath).replace(/\\\\/g, '/');
  if (relativeProjectPath === 'Tasks.md') return 'task';
  if (relativeProjectPath === 'Decisions.md') return 'decision';
  if (relativeProjectPath === 'Facts.md') return 'fact';
  if (relativeProjectPath === 'Open Questions.md') return 'question';
  if (relativeProjectPath === 'Handoff.md') return 'handoff';
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

function getCriticalMemoryPaths(config) {
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
  [config.research_dir, config.notes_dir, 'Sessions'].forEach((dirName) => {
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
  return [...new Set(files)].filter((filePath) => fs.existsSync(filePath));
}

function memoryStatus(repoRoot, config) {
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
    },
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
  const built = buildRecallIndex(config);
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  ensureDir(exportsRoot);
  const exportPath = path.join(exportsRoot, 'agent-bootstrap-memory-' + timestampForFile() + '.json');
  const files = getCriticalMemoryPaths(config).map((filePath) => ({
    relativePath: path.relative(config.project_root, filePath).replace(/\\\\/g, '/'),
    path: filePath,
    content: readFile(filePath) || '',
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
  buildRecallIndex(config);
  const backupPath = path.join(config.project_root, 'Artifacts', 'Backups', timestampForFile());
  ensureDir(backupPath);
  const copied = [];
  getCriticalMemoryPaths(config).forEach((sourcePath) => {
    const relative = path.relative(config.project_root, sourcePath);
    const targetPath = path.join(backupPath, relative);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
    copied.push(relative.replace(/\\\\/g, '/'));
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
      { label: 'Today Daily Note', filePath: path.join(config.vault_root, 'Daily', \`\${getTodayString()}.md\`), fullOnly: true },
    );
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
function gitPostCommitHookTemplate() {
    return `#!/usr/bin/env sh
set +e

if command -v node >/dev/null 2>&1; then
  node scripts/agent-memory.js post-commit >/dev/null 2>&1 || true
fi

exit 0
`;
}
