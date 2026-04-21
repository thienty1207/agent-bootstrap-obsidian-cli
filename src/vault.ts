import fs from 'node:fs';
import path from 'node:path';
import { getTodayString } from './date';
import { ensureDir, writeFileIfMissing, readIfExists } from './fs-utils';

export type MemoryScope = 'auto' | 'project' | 'global';

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

function getCurrentTimeString(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function getWeekdayString(): string {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
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

export function resolveScope({
  scope,
  mode,
  title,
  content,
}: {
  scope?: string;
  mode: string;
  title?: string;
  content: string;
}): Exclude<MemoryScope, 'auto'> {
  if (scope === 'project' || scope === 'global') {
    return scope;
  }

  if (mode === 'task' || mode === 'decision') {
    return 'project';
  }

  const haystack = `${title || ''}\n${content}`.toLowerCase();
  const globalSignals = [
    'cross-project',
    'across projects',
    'shared',
    'reusable',
    'global',
    'playbook',
    'template',
    'standard',
    'general pattern',
    'future repos',
    'future projects',
    'multi-project',
  ];

  if (globalSignals.some((signal) => haystack.includes(signal))) {
    return 'global';
  }

  return 'project';
}
