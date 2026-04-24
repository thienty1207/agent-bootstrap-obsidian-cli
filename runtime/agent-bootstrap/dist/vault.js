"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureVaultScaffold = ensureVaultScaffold;
exports.getDailyNotePath = getDailyNotePath;
exports.ensureDailyNote = ensureDailyNote;
exports.appendDailyLog = appendDailyLog;
exports.createDailyLogMarker = createDailyLogMarker;
exports.getProjectMemoryIndexPath = getProjectMemoryIndexPath;
exports.readProjectMemoryIndex = readProjectMemoryIndex;
exports.updateProjectMemoryIndex = updateProjectMemoryIndex;
exports.formatProjectMemoryIndex = formatProjectMemoryIndex;
exports.resolveRoutingDecision = resolveRoutingDecision;
exports.resolveScope = resolveScope;
exports.buildMemoryLogMarker = buildMemoryLogMarker;
exports.createMemoryIndexRecord = createMemoryIndexRecord;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
const DEFAULT_FOLDERS = [
    'Archive',
    'Daily',
    'Inbox',
    'Notes',
    'Projects',
    'Research',
    'Templates',
    'Tools',
];
const MAX_INDEX_ITEMS = 12;
function getCurrentTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}
function getWeekdayString() {
    return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
}
function compactPreview(value, maxLength = 180) {
    const singleLine = value.replace(/\s+/g, ' ').trim();
    return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 1)}…` : singleLine;
}
function normalizeMarker(value) {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
function vaultAgentTemplate() {
    return `# Agent Guide

This vault is a long-lived workspace for daily notes, research, projects, and custom tools.

Start at [[Init]] when opening the vault or when an agent needs a graph-friendly memory map.

The goal is compounding memory:
- reusable knowledge stays global
- project-specific knowledge stays inside each project capsule
- the agent should not create a new vault for every project by default

## Folder Map
- [[Inbox/README|Inbox]] for quick capture and triage
- [[Daily/README|Daily]] for daily notes and logs
- [[Notes/README|Notes]] for evergreen notes and distilled thinking
- [[Projects/README|Projects]] for active project capsules
- [[Research/README|Research]] for global source-based research and synthesized findings
- [[Tools/README|Tools]] for scripts, automations, agent workflows, and technical documentation
- [[Archive/README|Archive]] for inactive or completed material
- [[Templates/README|Templates]] for reusable note templates

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
function vaultInitTemplate() {
    return `# Init

This is the graph-friendly entrypoint for the vault and the first note an AI agent should understand.

## Start Here
- Agent guide: [[AGENTS]]
- Daily execution log: [[Daily/README|Daily]]
- Active project memory: [[Projects/README|Projects]]
- Reusable research: [[Research/README|Research]]
- Evergreen notes: [[Notes/README|Notes]]
- Fast capture: [[Inbox/README|Inbox]]
- Agent tooling: [[Tools/README|Tools]]
- Reusable templates: [[Templates/README|Templates]]
- Archived memory: [[Archive/README|Archive]]
- Project template: [[Projects/_template/README|Project Template]]

## Agent Runtime
- In a bootstrapped repo, run \`agent-bootstrap context\` first.
- Keep short-term execution in [[Daily/README|Daily]].
- Keep durable project facts in [[Projects/README|Projects]].
- Keep reusable knowledge in [[Research/README|Research]] or [[Notes/README|Notes]].

## Memory Model
- The vault can grow without a fixed memory ceiling because notes stay on disk.
- Agents should load compact context first, then open only the narrow notes needed for the task.
- Stable cross-project learnings should become reusable notes instead of staying buried in daily logs.
`;
}
function folderReadmeTemplate(folder) {
    const descriptions = {
        Archive: 'Inactive or completed material that may still be useful later.',
        Daily: 'Daily execution logs, session markers, and work summaries.',
        Inbox: 'Fast capture for unprocessed ideas, notes, and incoming context.',
        Notes: 'Evergreen notes and distilled knowledge that can help future work.',
        Projects: 'Project capsules with tasks, decisions, research, notes, and artifacts.',
        Research: 'Reusable cross-project research, comparisons, and source-based findings.',
        Templates: 'Reusable templates for daily notes, research notes, and project notes.',
        Tools: 'Scripts, automations, agent workflows, and technical documentation.',
    };
    return `# ${folder}

${descriptions[folder] || 'Vault memory folder.'}

## Links
- Vault entrypoint: [[Init]]
- Agent guide: [[AGENTS]]
- Projects: [[Projects/README|Projects]]
- Research: [[Research/README|Research]]
- Daily: [[Daily/README|Daily]]
`;
}
function dailyTemplate() {
    return `# {{date:YYYY-MM-DD dddd}}

Vault: [[Init]]
Area: [[Daily/README|Daily]]

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
function renderDailyNote() {
    return `# ${(0, date_1.getTodayString)()} ${getWeekdayString()}

Vault: [[Init]]
Area: [[Daily/README|Daily]]

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
function researchTemplate() {
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

## Links
- Vault: [[Init]]
- Research hub: [[Research/README|Research]]

## Question
- 

## Findings
- 

## Sources
- 
`;
}
function projectNoteTemplate() {
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

## Links
- Vault: [[Init]]
- Projects hub: [[Projects/README|Projects]]
- Tasks: [[Tasks]]
- Decisions: [[Decisions]]

## Goal
- 

## Source Path
\`\`\`
\`\`\`

## Current Status
- 
`;
}
function projectTemplateReadme() {
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

## Links
- Vault: [[Init]]
- Projects hub: [[Projects/README|Projects]]
- Tasks: [[Tasks]]
- Decisions: [[Decisions]]
- Facts: [[Facts]]
- Open Questions: [[Open Questions]]
- Handoff: [[Handoff]]
- Research: [[Research]]
- Notes: [[Notes]]
- Artifacts: [[Artifacts]]

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
function projectTemplateTasks() {
    return `---
type: tasks
project:
status: active
updated: {{date:YYYY-MM-DD}}
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
function projectTemplateDecisions() {
    return `---
type: decisions
project:
status: active
updated: {{date:YYYY-MM-DD}}
tags:
  - decisions
---

# Decisions

## Links
- Vault: [[Init]]
- Project: [[README]]
`;
}
function projectTemplateFacts() {
    return `---
type: facts
project:
status: active
updated: {{date:YYYY-MM-DD}}
tags:
  - facts
---

# Facts

## Links
- Vault: [[Init]]
- Project: [[README]]

## Current Facts
-
`;
}
function projectTemplateOpenQuestions() {
    return `---
type: questions
project:
status: active
updated: {{date:YYYY-MM-DD}}
tags:
  - questions
---

# Open Questions

## Links
- Vault: [[Init]]
- Project: [[README]]

## Active
- [ ]
`;
}
function projectTemplateHandoff() {
    return `---
type: handoff
project:
status: active
updated: {{date:YYYY-MM-DD}}
tags:
  - handoff
---

# Handoff

## Links
- Vault: [[Init]]
- Project: [[README]]

## Latest
- No handoff recorded yet.
`;
}
function corePluginsConfig() {
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
function dailyNotesConfig() {
    return JSON.stringify({
        folder: 'Daily',
        template: 'Templates/Daily Note',
    }, null, 2);
}
function appConfig() {
    return JSON.stringify({
        promptDelete: false,
    }, null, 2);
}
function ensureVaultScaffold(vaultRoot) {
    (0, fs_utils_1.ensureDir)(vaultRoot);
    for (const folder of DEFAULT_FOLDERS) {
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(vaultRoot, folder));
    }
    (0, fs_utils_1.ensureDir)(node_path_1.default.join(vaultRoot, '.obsidian'));
    (0, fs_utils_1.ensureDir)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Research'));
    (0, fs_utils_1.ensureDir)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Notes'));
    (0, fs_utils_1.ensureDir)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Artifacts'));
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'AGENTS.md'), vaultAgentTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Init.md'), vaultInitTemplate());
    for (const folder of DEFAULT_FOLDERS) {
        (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, folder, 'README.md'), folderReadmeTemplate(folder));
    }
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Templates', 'Daily Note.md'), dailyTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Templates', 'Research Note.md'), researchTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Templates', 'Project Note.md'), projectNoteTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'README.md'), projectTemplateReadme());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Tasks.md'), projectTemplateTasks());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Decisions.md'), projectTemplateDecisions());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Facts.md'), projectTemplateFacts());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Open Questions.md'), projectTemplateOpenQuestions());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Handoff.md'), projectTemplateHandoff());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Research', 'README.md'), '# Research\n\n- Vault: [[Init]]\n- Project: [[README]]\n');
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Notes', 'README.md'), '# Notes\n\n- Vault: [[Init]]\n- Project: [[README]]\n');
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, 'Projects', '_template', 'Artifacts', 'README.md'), '# Artifacts\n\n- Vault: [[Init]]\n- Project: [[README]]\n');
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, '.obsidian', 'core-plugins.json'), corePluginsConfig());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, '.obsidian', 'daily-notes.json'), dailyNotesConfig());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRoot, '.obsidian', 'app.json'), appConfig());
}
function getDailyNotePath(vaultRoot) {
    return node_path_1.default.join(vaultRoot, 'Daily', `${(0, date_1.getTodayString)()}.md`);
}
function ensureDailyNote(vaultRoot) {
    ensureVaultScaffold(vaultRoot);
    const dailyPath = getDailyNotePath(vaultRoot);
    (0, fs_utils_1.writeFileIfMissing)(dailyPath, renderDailyNote());
    return dailyPath;
}
function appendDailyLog(vaultRoot, entry, marker) {
    const dailyPath = ensureDailyNote(vaultRoot);
    const existing = (0, fs_utils_1.readIfExists)(dailyPath) || renderDailyNote();
    if (marker && existing.includes(marker)) {
        return dailyPath;
    }
    let next = existing;
    if (!next.includes('## Agent Log')) {
        next = `${next.trimEnd()}\n\n## Agent Log\n`;
    }
    const line = `- [${getCurrentTimeString()}] ${entry}${marker ? ` ${marker}` : ''}`;
    const headingStart = next.indexOf('## Agent Log');
    const contentStart = headingStart + '## Agent Log'.length;
    const rest = next.slice(contentStart);
    const nextHeadingOffset = rest.search(/\n## /);
    if (nextHeadingOffset === -1) {
        node_fs_1.default.writeFileSync(dailyPath, `${next.trimEnd()}\n${line}\n`);
        return dailyPath;
    }
    const insertAt = contentStart + nextHeadingOffset;
    const before = next.slice(0, insertAt).trimEnd();
    const after = next.slice(insertAt).replace(/^\n+/, '\n\n');
    node_fs_1.default.writeFileSync(dailyPath, `${before}\n${line}${after}`);
    return dailyPath;
}
function createDailyLogMarker(parts) {
    return `<!-- agent-bootstrap:${parts.map(normalizeMarker).join(':')} -->`;
}
function createEmptyIndex(projectSlug, projectType) {
    return {
        project: {
            slug: projectSlug,
            projectType,
            updatedAt: (0, date_1.getIsoTimestamp)(),
        },
        recent: {
            tasks: [],
            decisions: [],
            research: [],
            notes: [],
            facts: [],
            questions: [],
            handoffs: [],
            daily: [],
        },
    };
}
function normalizeMemoryIndex(index, projectSlug, projectType) {
    return {
        project: {
            slug: index.project?.slug || projectSlug,
            projectType: index.project?.projectType || projectType,
            updatedAt: index.project?.updatedAt || (0, date_1.getIsoTimestamp)(),
        },
        recent: {
            tasks: index.recent?.tasks || [],
            decisions: index.recent?.decisions || [],
            research: index.recent?.research || [],
            notes: index.recent?.notes || [],
            facts: index.recent?.facts || [],
            questions: index.recent?.questions || [],
            handoffs: index.recent?.handoffs || [],
            daily: index.recent?.daily || [],
        },
    };
}
function getProjectMemoryIndexPath(projectRoot) {
    return node_path_1.default.join(projectRoot, 'Artifacts', 'memory-index.json');
}
function readProjectMemoryIndex(projectRoot, projectSlug, projectType) {
    const indexPath = getProjectMemoryIndexPath(projectRoot);
    const raw = (0, fs_utils_1.readIfExists)(indexPath);
    if (!raw) {
        return createEmptyIndex(projectSlug, projectType);
    }
    try {
        return normalizeMemoryIndex(JSON.parse(raw), projectSlug, projectType);
    }
    catch {
        return createEmptyIndex(projectSlug, projectType);
    }
}
function pushRecent(items, item) {
    const dedupeKey = `${item.kind}:${item.title}:${item.scope || ''}`;
    const next = items.filter((existing) => `${existing.kind}:${existing.title}:${existing.scope || ''}` !== dedupeKey);
    next.unshift(item);
    return next.slice(0, MAX_INDEX_ITEMS);
}
function updateProjectMemoryIndex({ projectRoot, projectSlug, projectType, bucket, item, }) {
    const next = readProjectMemoryIndex(projectRoot, projectSlug, projectType);
    next.project.updatedAt = (0, date_1.getIsoTimestamp)();
    next.recent[bucket] = pushRecent(next.recent[bucket], item);
    const indexPath = getProjectMemoryIndexPath(projectRoot);
    (0, fs_utils_1.ensureDir)(node_path_1.default.dirname(indexPath));
    node_fs_1.default.writeFileSync(indexPath, JSON.stringify(next, null, 2));
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
function resolveRoutingDecision({ scope, mode, title, content, projectSlug, repoName, }) {
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
function resolveScope({ scope, mode, title, content, projectSlug, repoName, }) {
    return resolveRoutingDecision({ scope, mode, title, content, projectSlug, repoName }).scope;
}
function buildMemoryLogMarker({ kind, projectSlug, title, scope, }) {
    return createDailyLogMarker([kind, projectSlug, scope || 'project', title, (0, date_1.getTodayString)()]);
}
function createMemoryIndexRecord({ kind, title, preview, scope, path: recordPath, reason, }) {
    return {
        ts: (0, date_1.getIsoTimestamp)(),
        kind,
        title,
        preview: compactPreview(preview),
        scope,
        path: recordPath,
        reason,
    };
}
