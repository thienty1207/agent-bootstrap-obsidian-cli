import fs from 'node:fs';
import path from 'node:path';
import { getIsoTimestamp, getTodayString } from './date';
import { ensureDir, writeFileIfMissing, readIfExists } from './fs-utils';

export type MemoryScope = 'auto' | 'project' | 'global';

export interface MemoryRoutingDecision {
  scope: Exclude<MemoryScope, 'auto'>;
  reason: string;
  scores: {
    global: number;
    project: number;
  };
}

export interface MemoryIndexRecord {
  ts: string;
  kind: 'task' | 'decision' | 'research' | 'note' | 'daily';
  title: string;
  preview: string;
  scope?: 'project' | 'global';
  path?: string;
  reason?: string;
}

export interface ProjectMemoryIndex {
  project: {
    slug: string;
    projectType: string;
    updatedAt: string;
  };
  recent: {
    tasks: MemoryIndexRecord[];
    decisions: MemoryIndexRecord[];
    research: MemoryIndexRecord[];
    notes: MemoryIndexRecord[];
    daily: MemoryIndexRecord[];
  };
}

const DEFAULT_FOLDERS = [
  'Archive',
  'Daily',
  'Inbox',
  'Notes',
  'Projects',
  'Research',
  'Templates',
  'Tools',
] as const;

const MAX_INDEX_ITEMS = 12;

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getWeekdayString(): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
}

function compactPreview(value: string, maxLength = 180): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 1)}…` : singleLine;
}

function normalizeMarker(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function vaultAgentTemplate(): string {
  return `# Agent Guide

This vault is a long-lived workspace for daily notes, research, projects, and custom tools.

The goal is compounding memory:
- reusable knowledge stays global
- project-specific knowledge stays inside each project capsule
- the agent should not create a new vault for every project by default

## Folder Map
- \`Inbox\` for quick capture and triage
- \`Daily\` for daily notes and logs
- \`Notes\` for evergreen notes and distilled thinking
- \`Projects\` for active project capsules
- \`Research\` for global source-based research and synthesized findings
- \`Tools\` for scripts, automations, agent workflows, and technical documentation
- \`Archive\` for inactive or completed material
- \`Templates\` for reusable note templates

## Routing Rules
- Reusable knowledge that may help multiple projects goes to \`Research\` or \`Notes\`
- Knowledge specific to one project goes under \`Projects/<project-name>/\`
- Daily execution context goes to \`Daily\`
- Fast unprocessed capture goes to \`Inbox\`
- Agent or automation documentation goes to \`Tools\`
- Old but potentially useful material moves to \`Archive\`

## Global vs Project-Specific
Use \`Research\` for:
- technology comparisons
- coding patterns likely to be reused
- architecture trade-offs that generalize
- market, domain, or tooling research that spans projects

Use \`Projects/<project-name>/Research\` for:
- feature-specific investigation
- competitor or product research tied to one project
- implementation decisions that only matter to one codebase
- project-only planning material

When in doubt:
- if another future project could reasonably reuse it, make it global
- otherwise keep it inside the project capsule

## Project Capsule Standard
Each project should live under:

\`Projects/<project-name>/\`

Minimum structure:
- \`README.md\` as source of truth
- \`Tasks.md\` for next actions
- \`Decisions.md\` for decision log
- \`Research/\` for project-only research
- \`Notes/\` for working notes
- \`Artifacts/\` for generated outputs when needed

Use \`Projects/_template/\` as the starting point for new projects.

## Agent Workflow
Before starting meaningful work on a project, open:
- \`AGENTS.md\`
- \`Projects/<project-name>/README.md\`
- \`Projects/<project-name>/Tasks.md\`
- recent files inside that project folder

When the agent performs research:
- write durable results back into the vault
- route the note to global or project-specific research using the rules above
- let the repo runtime update today's daily note automatically

## External Repo Workflow
The vault is the memory layer. The codebase may live elsewhere on disk.

When a project repo is outside the vault:
- store the real path in \`Projects/<project-name>/README.md\` as \`source_path\`
- do coding work, testing, and file inspection in that external repo
- write durable memory back into the project capsule inside the vault

## Auto Memory Rules
After meaningful work, the agent should update the vault, not just the code.

Write back at least one of these when appropriate:
- \`Tasks.md\` after planning, execution, or status changes
- \`Decisions.md\` after architecture or implementation choices
- \`Research/\` after source-based investigation
- \`Notes/\` for implementation notes that may help later

Daily note logging should happen automatically through the repo runtime.

## Templates
- \`Templates/Daily Note.md\` for daily notes
- \`Templates/Research Note.md\` for research notes
- \`Templates/Project Note.md\` for project overview notes

## Working Rules
- Prefer simple notes over deep nesting
- Capture first, organize later
- Move stable knowledge from \`Inbox\` or \`Daily\` into \`Notes\` or \`Research\`
- Keep project-specific material inside \`Projects\`
- Archive instead of deleting when material may still be useful
- Use \`YYYY-MM-DD\` for dates in filenames and metadata
`;
}

function dailyTemplate(): string {
  return `# {{date:YYYY-MM-DD dddd}}

## Focus
- 

## Notes
- 

## Tasks
- [ ] 

## Agent Log
- 

## Wins
- 

## Tomorrow
- 
`;
}

function renderDailyNote(): string {
  return `# ${getTodayString()} ${getWeekdayString()}

## Focus
- 

## Notes
- 

## Tasks
- [ ] 

## Agent Log

## Wins
- 

## Tomorrow
- 
`;
}

function researchTemplate(): string {
  return `---
type: research
scope: auto
project:
status: draft
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
tags:
  - research
---

# Research Title

## Question
- 

## Findings
- 

## Sources
- 
`;
}

function projectNoteTemplate(): string {
  return `---
type: project
status: active
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
source_path:
tags:
  - project
---

# Project Name

## Goal
- 

## Source Path
\`\`\`
\`\`\`

## Current Status
- 
`;
}

function projectTemplateReadme(): string {
  return `---
type: project
status: active
created: {{date:YYYY-MM-DD}}
updated: {{date:YYYY-MM-DD}}
source_path:
tags:
  - project
---

# Project Name

## Project Type
- 

## Source Path
\`\`\`
\`\`\`

## Goal
- What this project is trying to achieve

## Current Status
- 
`;
}

function projectTemplateTasks(): string {
  return `---
type: tasks
project:
status: active
updated: {{date:YYYY-MM-DD}}
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

function projectTemplateDecisions(): string {
  return `---
type: decisions
project:
status: active
updated: {{date:YYYY-MM-DD}}
tags:
  - decisions
---

# Decisions
`;
}

function corePluginsConfig(): string {
  return JSON.stringify({
    'file-explorer': true,
    'global-search': true,
    switcher: true,
    graph: true,
    backlink: true,
    canvas: true,
    'outgoing-link': true,
    'tag-pane': true,
    footnotes: false,
    properties: true,
    'page-preview': true,
    'daily-notes': true,
    templates: true,
    'note-composer': true,
    'command-palette': true,
    'slash-command': false,
    'editor-status': true,
    bookmarks: true,
    'markdown-importer': false,
    'zk-prefixer': false,
    'random-note': false,
    outline: true,
    'word-count': true,
    slides: false,
    'audio-recorder': false,
    workspaces: false,
    'file-recovery': true,
    publish: false,
    sync: false,
    bases: true,
    webviewer: false,
  }, null, 2);
}

function dailyNotesConfig(): string {
  return JSON.stringify({
    folder: 'Daily',
    template: 'Templates/Daily Note',
  }, null, 2);
}

function appConfig(): string {
  return JSON.stringify({
    promptDelete: false,
  }, null, 2);
}

export function ensureVaultScaffold(vaultRoot: string): void {
  ensureDir(vaultRoot);

  for (const folder of DEFAULT_FOLDERS) {
    ensureDir(path.join(vaultRoot, folder));
  }

  ensureDir(path.join(vaultRoot, '.obsidian'));
  ensureDir(path.join(vaultRoot, 'Projects', '_template', 'Research'));
  ensureDir(path.join(vaultRoot, 'Projects', '_template', 'Notes'));
  ensureDir(path.join(vaultRoot, 'Projects', '_template', 'Artifacts'));

  writeFileIfMissing(path.join(vaultRoot, 'AGENTS.md'), vaultAgentTemplate());
  writeFileIfMissing(path.join(vaultRoot, 'Templates', 'Daily Note.md'), dailyTemplate());
  writeFileIfMissing(path.join(vaultRoot, 'Templates', 'Research Note.md'), researchTemplate());
  writeFileIfMissing(path.join(vaultRoot, 'Templates', 'Project Note.md'), projectNoteTemplate());
  writeFileIfMissing(path.join(vaultRoot, 'Projects', '_template', 'README.md'), projectTemplateReadme());
  writeFileIfMissing(path.join(vaultRoot, 'Projects', '_template', 'Tasks.md'), projectTemplateTasks());
  writeFileIfMissing(path.join(vaultRoot, 'Projects', '_template', 'Decisions.md'), projectTemplateDecisions());
  writeFileIfMissing(path.join(vaultRoot, 'Projects', '_template', 'Research', 'README.md'), '# Research\n');
  writeFileIfMissing(path.join(vaultRoot, 'Projects', '_template', 'Notes', 'README.md'), '# Notes\n');
  writeFileIfMissing(path.join(vaultRoot, 'Projects', '_template', 'Artifacts', 'README.md'), '# Artifacts\n');
  writeFileIfMissing(path.join(vaultRoot, '.obsidian', 'core-plugins.json'), corePluginsConfig());
  writeFileIfMissing(path.join(vaultRoot, '.obsidian', 'daily-notes.json'), dailyNotesConfig());
  writeFileIfMissing(path.join(vaultRoot, '.obsidian', 'app.json'), appConfig());
}

export function getDailyNotePath(vaultRoot: string): string {
  return path.join(vaultRoot, 'Daily', `${getTodayString()}.md`);
}

export function ensureDailyNote(vaultRoot: string): string {
  ensureVaultScaffold(vaultRoot);
  const dailyPath = getDailyNotePath(vaultRoot);
  writeFileIfMissing(dailyPath, renderDailyNote());
  return dailyPath;
}

export function appendDailyLog(vaultRoot: string, entry: string, marker?: string): string {
  const dailyPath = ensureDailyNote(vaultRoot);
  const existing = readIfExists(dailyPath) || renderDailyNote();

  if (marker && existing.includes(marker)) {
    return dailyPath;
  }

  let next = existing;
  if (!next.includes('## Agent Log')) {
    next = `${next.trimEnd()}\n\n## Agent Log\n`;
  }

  const line = `- [${getCurrentTimeString()}] ${entry}${marker ? ` ${marker}` : ''}`;
  fs.writeFileSync(dailyPath, `${next.trimEnd()}\n${line}\n`);
  return dailyPath;
}

export function createDailyLogMarker(parts: string[]): string {
  return `<!-- agent-bootstrap:${parts.map(normalizeMarker).join(':')} -->`;
}

function createEmptyIndex(projectSlug: string, projectType: string): ProjectMemoryIndex {
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

export function getProjectMemoryIndexPath(projectRoot: string): string {
  return path.join(projectRoot, 'Artifacts', 'memory-index.json');
}

export function readProjectMemoryIndex(projectRoot: string, projectSlug: string, projectType: string): ProjectMemoryIndex {
  const indexPath = getProjectMemoryIndexPath(projectRoot);
  const raw = readIfExists(indexPath);
  if (!raw) {
    return createEmptyIndex(projectSlug, projectType);
  }

  try {
    return JSON.parse(raw) as ProjectMemoryIndex;
  } catch {
    return createEmptyIndex(projectSlug, projectType);
  }
}

function pushRecent(items: MemoryIndexRecord[], item: MemoryIndexRecord): MemoryIndexRecord[] {
  const dedupeKey = `${item.kind}:${item.title}:${item.scope || ''}`;
  const next = items.filter((existing) => `${existing.kind}:${existing.title}:${existing.scope || ''}` !== dedupeKey);
  next.unshift(item);
  return next.slice(0, MAX_INDEX_ITEMS);
}

export function updateProjectMemoryIndex({
  projectRoot,
  projectSlug,
  projectType,
  bucket,
  item,
}: {
  projectRoot: string;
  projectSlug: string;
  projectType: string;
  bucket: keyof ProjectMemoryIndex['recent'];
  item: MemoryIndexRecord;
}): string {
  const next = readProjectMemoryIndex(projectRoot, projectSlug, projectType);
  next.project.updatedAt = getIsoTimestamp();
  next.recent[bucket] = pushRecent(next.recent[bucket], item);
  const indexPath = getProjectMemoryIndexPath(projectRoot);
  ensureDir(path.dirname(indexPath));
  fs.writeFileSync(indexPath, JSON.stringify(next, null, 2));
  return indexPath;
}

export function formatProjectMemoryIndex(index: ProjectMemoryIndex): string {
  const sections: Array<[string, MemoryIndexRecord[]]> = [
    ['Recent Tasks', index.recent.tasks],
    ['Recent Decisions', index.recent.decisions],
    ['Recent Research', index.recent.research],
    ['Recent Notes', index.recent.notes],
    ['Recent Daily Events', index.recent.daily],
  ];

  const lines = [
    '# Project Memory Index',
    '',
    `- Project: \`${index.project.slug}\``,
    `- Project type: \`${index.project.projectType}\``,
    `- Updated: \`${index.project.updatedAt}\``,
    '',
  ];

  for (const [label, items] of sections) {
    lines.push(`## ${label}`);
    if (items.length === 0) {
      lines.push('- none');
      lines.push('');
      continue;
    }

    for (const item of items.slice(0, 4)) {
      const scopeText = item.scope ? ` [${item.scope}]` : '';
      lines.push(`- ${item.ts}${scopeText} ${item.title}: ${item.preview}`);
    }
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

export function resolveRoutingDecision({
  scope,
  mode,
  title,
  content,
  projectSlug,
  repoName,
}: {
  scope?: string;
  mode: string;
  title?: string;
  content: string;
  projectSlug?: string;
  repoName?: string;
}): MemoryRoutingDecision {
  if (scope === 'project' || scope === 'global') {
    return {
      scope,
      reason: `explicit --scope ${scope}`,
      scores: { global: scope === 'global' ? 100 : 0, project: scope === 'project' ? 100 : 0 },
    };
  }

  if (mode === 'task' || mode === 'decision') {
    return {
      scope: 'project',
      reason: `${mode} entries are always project-scoped`,
      scores: { global: 0, project: 100 },
    };
  }

  const haystack = `${title || ''}\n${content}`.toLowerCase();
  let globalScore = 0;
  let projectScore = 0;
  const globalReasons: string[] = [];
  const projectReasons: string[] = [];

  const globalSignals: Array<[string, number, string]> = [
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

  const projectSignals: Array<[string, number, string]> = [
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
        projectReasons.push(`project identity signal: ${normalized}`);
      }
    }
  }

  if (/(src\/|app\/|pages\/|components\/|routes\/|lib\/|internal\/)/i.test(haystack)) {
    projectScore += 4;
    projectReasons.push('repo-path signal');
  }

  if (/\b(package\.json|tsconfig\.json|cargo\.toml|go\.mod|requirements\.txt|pom\.xml|dockerfile)\b/i.test(haystack)) {
    projectScore += 4;
    projectReasons.push('repo-file signal');
  }

  if (/`[^`]+`/.test(`${title || ''}\n${content}`) || /\b[a-z0-9_-]+\.[a-z]{2,4}\b/i.test(haystack)) {
    projectScore += 2;
    projectReasons.push('code-or-file reference signal');
  }

  if (/\b(module|feature|flow|endpoint|handler|schema|migration|bug|checkout|payment)\b/i.test(haystack)) {
    projectScore += 1;
    projectReasons.push('implementation-detail signal');
  }

  if (projectScore >= globalScore) {
    return {
      scope: 'project',
      reason: projectReasons.length > 0
        ? `project signals outranked global signals: ${projectReasons.join(', ')}`
        : 'defaulted to project scope',
      scores: { global: globalScore, project: projectScore },
    };
  }

  return {
    scope: 'global',
    reason: globalReasons.length > 0
      ? `global signals outranked project signals: ${globalReasons.join(', ')}`
      : 'defaulted to global scope',
    scores: { global: globalScore, project: projectScore },
  };
}

export function resolveScope({
  scope,
  mode,
  title,
  content,
  projectSlug,
  repoName,
}: {
  scope?: string;
  mode: string;
  title?: string;
  content: string;
  projectSlug?: string;
  repoName?: string;
}): Exclude<MemoryScope, 'auto'> {
  return resolveRoutingDecision({ scope, mode, title, content, projectSlug, repoName }).scope;
}

export function buildMemoryLogMarker({
  kind,
  projectSlug,
  title,
  scope,
}: {
  kind: string;
  projectSlug: string;
  title: string;
  scope?: string;
}): string {
  return createDailyLogMarker([kind, projectSlug, scope || 'project', title, getTodayString()]);
}

export function createMemoryIndexRecord({
  kind,
  title,
  preview,
  scope,
  path: recordPath,
  reason,
}: {
  kind: MemoryIndexRecord['kind'];
  title: string;
  preview: string;
  scope?: 'project' | 'global';
  path?: string;
  reason?: string;
}): MemoryIndexRecord {
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
