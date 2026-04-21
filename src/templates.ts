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
- Research that generalizes across projects should be moved to global \`Research\` or \`Notes\`

## Links
- [[Tasks]]
- [[Decisions]]
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
`;
}

export function repoReadmeTemplate(repoName: string, projectSlug: string, projectType: ProjectType): string {
  return `# ${repoName}

${repoName} is a VS Code friendly agent workspace layout.

It keeps the agent workspace under \`.github\`, while project-facing documentation and planning live at the repository root.

Project slug: \`${projectSlug}\`
Project type: \`${projectType}\`

## Structure

- \`AGENT.md\`: main operating contract for AI agents
- \`docs/project-map.md\`: fast orientation guide for the current project type
- \`.github/\`
  - \`agents/\`: specialized subagents
  - \`commands/\`: reusable workflow prompts
  - \`prompts/\`: prompt packs and assets
  - \`rules/\`: workflow and quality guardrails
  - \`skills/\`: upstream skill libraries and deeper guidance
- \`docs/\`: project documentation and reference notes
- \`plans/\`: implementation templates and handoff reports
- \`scripts/\`: repo-local runtime helpers for durable memory write-back

## Suggested use

1. Read \`AGENT.md\`.
2. Pick a specialist from \`.github/agents/\` when the task fits a role.
3. Use \`.github/commands/\` to kick off repeatable workflows.
4. Treat \`.github/rules/\` as the guardrails.
5. Read \`docs/project-map.md\` for the current repo surfaces and verification path.
6. Use \`node scripts/agent-memory.js context\` to load repo and vault context.
`;
}

function typeFocus(projectType: ProjectType): string[] {
  switch (projectType) {
    case 'web':
      return [
        '- prioritize UI entrypoints, routes, API boundaries, auth flow, and deployment surface',
        '- keep UX, state boundaries, and verification paths explicit',
      ];
    case 'api':
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

Read this file first if you are working in this repository.

## Project type

Project type: ${projectType}

## External memory

This repository writes durable agent memory to the external Obsidian vault at:

\`${vaultRoot}\`

Project capsule:

\`${projectRoot}\`

## Read order

Before meaningful work, read:

1. \`docs/vault-memory.md\`
2. \`docs/project-map.md\`
3. \`${vaultRoot}/AGENTS.md\`
4. \`${projectRoot}/README.md\`
5. \`${projectRoot}/Tasks.md\`
6. relevant docs under \`docs/\` and workflows under \`.github/\`

## Type-specific focus

${typeFocus(projectType).join('\n')}

## Fast paths

- \`agent-bootstrap context\`
- \`node scripts/agent-memory.js context\`

Running \`context\` should be the first step in a fresh session. It ensures today's daily note exists, records a session marker automatically, and includes the project memory index so the agent does not need to scan the vault manually.

## Write-back rules

After meaningful work, write back to the vault:

- \`Tasks.md\` for status and next steps
- \`Decisions.md\` for technical decisions
- \`Research/\` for project-specific research
- global \`Research\` or \`Notes\` for reusable insights

The repo runtime handles the low-friction automation:

- it appends to today's daily note automatically
- it routes \`research\` and \`note\` entries to project or global scope automatically unless you override \`--scope\`
- it records routing reasons and keeps a compact project memory index under \`Artifacts/memory-index.json\`
- it still supports explicit \`--scope project\` or \`--scope global\` when needed

## Repo-local runtime

- \`node scripts/agent-memory.js <context|task|decision|research|note>\`
- git \`post-commit\` hook auto-writes a durable worklog note into the vault

## Global fallback

\`agent-bootstrap memory <task|decision|research|note> ...\`
`;
}

function typeHotspots(projectType: ProjectType): string[] {
  switch (projectType) {
    case 'web':
      return [
        '- routes, page shells, UI state, auth boundaries, and API integrations',
        '- deployment surface: environment variables, build output, hosting, and preview flow',
      ];
    case 'api':
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
    case 'web':
      return [
        'load primary routes and confirm the critical user path works end-to-end',
        'verify form submission, auth, state transitions, and deployment environment assumptions',
      ];
    case 'api':
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

1. \`AGENT.md\`
2. \`docs/vault-memory.md\`
3. project entrypoints and docs closest to the current task
4. vault \`README.md\`, \`Tasks.md\`, and relevant \`Research/\`

## Verification path

${typeVerificationPath(projectType).map((item) => `- ${item}`).join('\n')}

## Operating rule

- keep repo facts in repo docs
- keep durable progress, research, and decisions in the linked vault capsule
- prefer updating \`Tasks.md\` and \`Decisions.md\` when the implementation meaningfully changes
`;
}

export function vaultMemoryDoc(vaultRoot: string, projectRoot: string, projectType: ProjectType): string {
  return `# Vault Memory Bridge

This repository is paired with an external Obsidian vault for durable agent memory.

## Project type

- ${projectType}

## Paths

- Vault root: \`${vaultRoot}\`
- Vault guide: \`${vaultRoot}/AGENTS.md\`
- Project capsule: \`${projectRoot}\`

## Read first

Before doing meaningful work in this repo, read:

1. \`AGENT.md\`
2. \`docs/project-map.md\`
3. \`${vaultRoot}/AGENTS.md\`
4. \`${projectRoot}/README.md\`
5. \`${projectRoot}/Tasks.md\`

## Write-back rules

After meaningful work:

- update \`Tasks.md\` for status, handoff, and next actions
- update \`Decisions.md\` for architecture or implementation decisions
- create project research notes under \`Research/\` when investigation happens
- move reusable cross-project insights into the vault's global \`Research\` or \`Notes\`
- rely on the repo git \`post-commit\` hook to keep a low-friction commit worklog

Preferred repo-local runtime:

\`node scripts/agent-memory.js <context|task|decision|research|note>\`

The runtime will:

- ensure today's daily note exists
- append daily worklog entries automatically
- auto-route \`research\` and \`note\` entries to project or global scope by default
- maintain a compact project memory index so \`context\` loads faster and with better recall

Global fallback:

\`agent-bootstrap memory <task|decision|research|note> ...\`
`;
}

export function localRuntimeScriptTemplate(): string {
  return `#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

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

  const dailyTemplatePath = path.join(vaultRoot, 'Templates', 'Daily Note.md');
  if (!fs.existsSync(dailyTemplatePath)) {
    writeFile(dailyTemplatePath, \`# {{date:YYYY-MM-DD dddd}}\\n\\n## Focus\\n- \\n\\n## Notes\\n- \\n\\n## Tasks\\n- [ ] \\n\\n## Agent Log\\n- \\n\\n## Wins\\n- \\n\\n## Tomorrow\\n- \\n\`);
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
    writeFile(dailyPath, \`# \${getTodayString()} \${getWeekdayString()}\\n\\n## Focus\\n- \\n\\n## Notes\\n- \\n\\n## Tasks\\n- [ ] \\n\\n## Agent Log\\n\\n## Wins\\n- \\n\\n## Tomorrow\\n- \\n\`);
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
  writeFile(dailyPath, \`\${next.trimEnd()}\\n\${line}\\n\`);
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
      daily: [],
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
    return JSON.parse(raw);
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
  const configPath = path.join(repoRoot, 'vault.config.json');
  const raw = readFile(configPath);
  if (!raw) {
    throw new Error('Missing vault.config.json. Run agent-bootstrap in the repo root first.');
  }
  return JSON.parse(raw);
}

function getContext(repoRoot, config) {
  ensureDailyNote(config.vault_root);
  appendDailyLog(
    config.vault_root,
    \`Session started for \\\`\${config.project_slug}\\\`\`,
    createDailyLogMarker(['session', config.project_slug, new Date().toISOString().slice(0, 13)]),
  );

  const sections = [
    ['Repo AGENT', path.join(repoRoot, 'AGENT.md')],
    ['Vault Bridge', path.join(repoRoot, 'docs', 'vault-memory.md')],
    ['Project Map', path.join(repoRoot, 'docs', 'project-map.md')],
    ['Vault AGENTS', path.join(config.vault_root, 'AGENTS.md')],
    ['Project README', path.join(config.project_root, 'README.md')],
    ['Project Tasks', path.join(config.project_root, config.tasks_file)],
    ['Project Decisions', path.join(config.project_root, config.decisions_file)],
    ['Today Daily Note', path.join(config.vault_root, 'Daily', \`\${getTodayString()}.md\`)],
  ];
  const memoryIndex = formatProjectMemoryIndex(
    readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type),
  );

  return [
    ...sections
    .map(([label, filePath]) => {
      const body = readFile(filePath);
      if (!body) {
        return null;
      }
      return \`===== \${label} =====\\n\${body.trimEnd()}\\n\`;
    })
    .filter(Boolean)
    ,
    \`===== Project Memory Index =====\\n\${memoryIndex.trimEnd()}\\n\`,
  ].join('\\n');
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
  writeFile(notePath, \`---\\ntype: \${noteType}\\nscope: \${resolvedScope}\\nscope_reason: \${routing.reason}\\nproject: \${resolvedScope === 'global' ? '' : config.project_slug}\\nproject_type: \${config.project_type}\\ncreated: \${today}\\nupdated: \${today}\\nstatus: draft\\n\${tags}---\\n\\n# \${title}\\n\\n\${content}\\n\`);
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

  while (args.length > 0) {
    const value = args.shift();
    if (!value.startsWith('--')) {
      rest.push(value);
      continue;
    }

    const flag = value.slice(2);
    const next = args.shift();
    if (!next || next.startsWith('--')) {
      throw new Error(\`Missing value for --\${flag}\`);
    }

    options[flag] = next;
  }

  return { rest, options };
}

function writeMemory(repoRoot, config, mode, content, title, scope) {
  switch (mode) {
    case 'task':
      return appendTask(config, content);
    case 'decision':
      if (!title) {
        throw new Error('Title is required for decision mode.');
      }
      return appendDecision(config, title, content);
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
  const repoRoot = options['repo-root'] ? path.resolve(options['repo-root']) : findRepoRoot(process.cwd());
  const config = readRepoConfig(repoRoot);

  if (!command || command === 'context') {
    process.stdout.write(\`\${getContext(repoRoot, config)}\\n\`);
    return;
  }

  if (command === 'post-commit') {
    process.stdout.write(\`\${writeMemory(repoRoot, config, 'post-commit', '', '', 'project')}\\n\`);
    return;
  }

  process.stdout.write(\`\${writeMemory(repoRoot, config, command, maybeContent, options.title, options.scope)}\\n\`);
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
