"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeMemory = writeMemory;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
const context_1 = require("./context");
const vault_1 = require("./vault");
function appendTask(config, content) {
    const tasksPath = node_path_1.default.join(config.project_root, config.tasks_file);
    const existing = node_fs_1.default.existsSync(tasksPath) ? node_fs_1.default.readFileSync(tasksPath, 'utf8') : '# Tasks\n';
    node_fs_1.default.writeFileSync(tasksPath, `${existing.trimEnd()}\n\n- [ ] ${content}\n`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'tasks',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'task',
            title: content,
            preview: content,
            scope: 'project',
            path: tasksPath,
            reason: 'tasks are always project-scoped',
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `Task updated for \`${config.project_slug}\`: ${content}`, (0, vault_1.buildMemoryLogMarker)({ kind: 'task', projectSlug: config.project_slug, title: content, scope: 'project' }));
    return tasksPath;
}
function appendDecision(config, title, content) {
    const decisionsPath = node_path_1.default.join(config.project_root, config.decisions_file);
    const existing = node_fs_1.default.existsSync(decisionsPath) ? node_fs_1.default.readFileSync(decisionsPath, 'utf8') : '# Decisions\n';
    const today = (0, date_1.getTodayString)();
    const entry = `\n## ${today} - ${title}\n- Context: agent-bootstrap CLI memory command\n- Decision: ${content}\n`;
    node_fs_1.default.writeFileSync(decisionsPath, `${existing.trimEnd()}\n${entry}`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'decisions',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'decision',
            title,
            preview: content,
            scope: 'project',
            path: decisionsPath,
            reason: 'decisions are always project-scoped',
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `Decision recorded for \`${config.project_slug}\`: ${title}`, (0, vault_1.buildMemoryLogMarker)({ kind: 'decision', projectSlug: config.project_slug, title, scope: 'project' }));
    return decisionsPath;
}
function appendFact(config, title, content) {
    const factsPath = node_path_1.default.join(config.project_root, config.facts_file || 'Facts.md');
    const existing = node_fs_1.default.existsSync(factsPath) ? node_fs_1.default.readFileSync(factsPath, 'utf8') : '# Facts\n';
    const today = (0, date_1.getTodayString)();
    const entry = `\n## ${title}\n- Updated: ${today}\n- Fact: ${content}\n`;
    node_fs_1.default.writeFileSync(factsPath, `${existing.trimEnd()}\n${entry}`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'facts',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'fact',
            title,
            preview: content,
            scope: 'project',
            path: factsPath,
            reason: 'stable project fact',
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `Fact recorded for \`${config.project_slug}\`: ${title}`, (0, vault_1.buildMemoryLogMarker)({ kind: 'fact', projectSlug: config.project_slug, title, scope: 'project' }));
    return factsPath;
}
function appendQuestion(config, title, content) {
    const questionsPath = node_path_1.default.join(config.project_root, config.open_questions_file || 'Open Questions.md');
    const existing = node_fs_1.default.existsSync(questionsPath) ? node_fs_1.default.readFileSync(questionsPath, 'utf8') : '# Open Questions\n';
    const today = (0, date_1.getTodayString)();
    const entry = `\n## ${title}\n- Created: ${today}\n- [ ] ${content}\n`;
    node_fs_1.default.writeFileSync(questionsPath, `${existing.trimEnd()}\n${entry}`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'questions',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'question',
            title,
            preview: content,
            scope: 'project',
            path: questionsPath,
            reason: 'open question for future verification',
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `Open question recorded for \`${config.project_slug}\`: ${title}`, (0, vault_1.buildMemoryLogMarker)({ kind: 'question', projectSlug: config.project_slug, title, scope: 'project' }));
    return questionsPath;
}
function appendHandoff(config, content) {
    const handoffPath = node_path_1.default.join(config.project_root, config.handoff_file || 'Handoff.md');
    const existing = node_fs_1.default.existsSync(handoffPath) ? node_fs_1.default.readFileSync(handoffPath, 'utf8') : '# Handoff\n';
    const today = (0, date_1.getTodayString)();
    const title = 'Session handoff';
    const entry = `\n## ${today} - ${title}\n${content}\n`;
    node_fs_1.default.writeFileSync(handoffPath, `${existing.trimEnd()}\n${entry}`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'handoffs',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'handoff',
            title,
            preview: content,
            scope: 'project',
            path: handoffPath,
            reason: 'latest session handoff',
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `Handoff updated for \`${config.project_slug}\``, (0, vault_1.buildMemoryLogMarker)({ kind: 'handoff', projectSlug: config.project_slug, title, scope: 'project' }));
    return handoffPath;
}
function createScopedNote({ config, repoRoot, noteType, title, content, scope, }) {
    const routing = (0, vault_1.resolveRoutingDecision)({
        scope,
        mode: noteType,
        title,
        content,
        projectSlug: config.project_slug,
        repoName: node_path_1.default.basename(repoRoot),
    });
    const baseRoot = routing.scope === 'global' ? config.vault_root : config.project_root;
    const directory = noteType === 'research'
        ? (routing.scope === 'global' ? 'Research' : config.research_dir)
        : (routing.scope === 'global' ? 'Notes' : config.notes_dir);
    const targetDir = node_path_1.default.join(baseRoot, directory);
    (0, fs_utils_1.ensureDir)(targetDir);
    const today = (0, date_1.getTodayString)();
    const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim();
    const notePath = node_path_1.default.join(targetDir, `${today} ${safeTitle}.md`);
    const projectValue = routing.scope === 'global' ? '' : config.project_slug;
    const tags = noteType === 'research' ? '  - research' : '  - note';
    (0, fs_utils_1.writeFile)(notePath, `---\ntype: ${noteType}\nscope: ${routing.scope}\nscope_reason: ${routing.reason}\nproject: ${projectValue}\nproject_type: ${config.project_type}\ncreated: ${today}\nupdated: ${today}\nstatus: draft\ntags:\n${tags}\n---\n\n# ${title}\n\n## Links\n- Vault: [[Init]]\n- ${routing.scope === 'global' ? 'Global hub' : 'Project'}: ${routing.scope === 'global' ? '[[Research/README|Research]]' : '[[README]]'}\n\n${content}\n`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: noteType === 'research' ? 'research' : 'notes',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: noteType,
            title,
            preview: content,
            scope: routing.scope,
            path: notePath,
            reason: routing.reason,
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `${noteType === 'research' ? 'Research' : 'Note'} captured [${routing.scope}] for \`${config.project_slug}\`: ${title}`, (0, vault_1.buildMemoryLogMarker)({ kind: noteType, projectSlug: config.project_slug, title, scope: routing.scope }));
    return notePath;
}
function writeMemory({ repoRoot, mode, title, content, scope, }) {
    const resolvedRepoRoot = repoRoot ? node_path_1.default.resolve(repoRoot) : (0, fs_utils_1.findRepoRoot)(process.cwd());
    const config = (0, context_1.readRepoConfig)(resolvedRepoRoot);
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
            return appendFact(config, title, content);
        case 'question':
            if (!title) {
                throw new Error('Title is required for question mode.');
            }
            return appendQuestion(config, title, content);
        case 'handoff':
            return appendHandoff(config, content);
        case 'research':
        case 'note':
            if (!title) {
                throw new Error(`Title is required for ${mode} mode.`);
            }
            return createScopedNote({ config, repoRoot: resolvedRepoRoot, noteType: mode, title, content, scope });
        default:
            throw new Error(`Unsupported memory mode: ${mode}`);
    }
}
