"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryStatus = getMemoryStatus;
exports.syncProjectSessions = syncProjectSessions;
exports.exportProjectMemory = exportProjectMemory;
exports.backupProjectMemory = backupProjectMemory;
exports.runRecall = runRecall;
exports.runMemoryCommand = runMemoryCommand;
exports.syncSessionsFromConfig = syncSessionsFromConfig;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = __importDefault(require("node:child_process"));
const context_1 = require("./context");
const fs_utils_1 = require("./fs-utils");
const vault_1 = require("./vault");
const date_1 = require("./date");
const recall_1 = require("./recall");
function timestampForFile() {
    return (0, date_1.getIsoTimestamp)().replace(/[:.]/g, '-');
}
function listFiles(dirPath, predicate) {
    if (!node_fs_1.default.existsSync(dirPath)) {
        return [];
    }
    return node_fs_1.default.readdirSync(dirPath)
        .filter(predicate)
        .map((fileName) => node_path_1.default.join(dirPath, fileName))
        .sort();
}
function latestFile(dirPath) {
    if (!node_fs_1.default.existsSync(dirPath)) {
        return null;
    }
    const files = node_fs_1.default.readdirSync(dirPath)
        .map((fileName) => node_path_1.default.join(dirPath, fileName))
        .filter((filePath) => node_fs_1.default.statSync(filePath).isFile())
        .sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs);
    return files[0] || null;
}
function countMemoryRecords(config) {
    const index = (0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type);
    return Object.values(index.recent).reduce((total, records) => total + records.length, 0);
}
function getCriticalMemoryPaths(config) {
    const files = [
        node_path_1.default.join(config.project_root, 'README.md'),
        node_path_1.default.join(config.project_root, config.tasks_file),
        node_path_1.default.join(config.project_root, config.decisions_file),
        node_path_1.default.join(config.project_root, config.facts_file || 'Facts.md'),
        node_path_1.default.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
        node_path_1.default.join(config.project_root, config.handoff_file || 'Handoff.md'),
        (0, vault_1.getProjectMemoryIndexPath)(config.project_root),
        (0, recall_1.getRecallIndexPath)(config.project_root),
        node_path_1.default.join(config.project_root, 'Artifacts', 'session-summary.md'),
    ];
    for (const dirName of [config.research_dir, config.notes_dir, 'Sessions']) {
        const dirPath = node_path_1.default.join(config.project_root, dirName);
        if (!node_fs_1.default.existsSync(dirPath)) {
            continue;
        }
        const stack = [dirPath];
        while (stack.length > 0) {
            const current = stack.pop();
            if (!current)
                continue;
            for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
                const entryPath = node_path_1.default.join(current, entry.name);
                if (entry.isDirectory()) {
                    stack.push(entryPath);
                }
                else if (entry.isFile()) {
                    files.push(entryPath);
                }
            }
        }
    }
    return [...new Set(files)].filter((filePath) => node_fs_1.default.existsSync(filePath));
}
function getGitSummary(repoRoot) {
    try {
        const branch = node_child_process_1.default.execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim() || 'unknown';
        const status = node_child_process_1.default.execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' })
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter(Boolean);
        return { branch, dirty: status.length > 0, status };
    }
    catch {
        return { branch: 'unknown', dirty: false, status: [] };
    }
}
function resolveConfig(options) {
    const repoRoot = (0, context_1.resolveRepoRoot)(options.repoRoot);
    return { repoRoot, config: (0, context_1.readRepoConfig)(repoRoot) };
}
function getMemoryStatus(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    const recall = (0, recall_1.buildRecallIndex)(config);
    const sessionsRoot = node_path_1.default.join(config.project_root, 'Sessions');
    const exportsRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Exports');
    const backupsRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Backups');
    const latestSession = latestFile(sessionsRoot);
    return {
        ok: node_fs_1.default.existsSync(config.vault_root) && node_fs_1.default.existsSync(config.project_root),
        repoRoot,
        vaultRoot: config.vault_root,
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        checks: {
            vaultRoot: node_fs_1.default.existsSync(config.vault_root),
            projectRoot: node_fs_1.default.existsSync(config.project_root),
            memoryIndex: node_fs_1.default.existsSync((0, vault_1.getProjectMemoryIndexPath)(config.project_root)),
            recallIndex: node_fs_1.default.existsSync((0, recall_1.getRecallIndexPath)(config.project_root)),
            sessionsDir: node_fs_1.default.existsSync(sessionsRoot),
        },
        counts: {
            memoryRecords: countMemoryRecords(config),
            recallDocuments: recall.index.documents.length,
            sessions: listFiles(sessionsRoot, (fileName) => fileName.endsWith('.md')).length,
            exports: listFiles(exportsRoot, (fileName) => fileName.endsWith('.json')).length,
            backups: node_fs_1.default.existsSync(backupsRoot)
                ? node_fs_1.default.readdirSync(backupsRoot).filter((entry) => node_fs_1.default.statSync(node_path_1.default.join(backupsRoot, entry)).isDirectory()).length
                : 0,
        },
        latestSession: latestSession
            ? {
                path: latestSession,
                updatedAt: node_fs_1.default.statSync(latestSession).mtime.toISOString(),
            }
            : null,
        commands: [
            'agent-bootstrap context --compact',
            'agent-bootstrap recall "<query>"',
            'agent-bootstrap memory sync-sessions',
            'agent-bootstrap memory export',
            'agent-bootstrap memory backup',
        ],
    };
}
function syncProjectSessions(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    const sessionsRoot = node_path_1.default.join(config.project_root, 'Sessions');
    (0, fs_utils_1.ensureDir)(sessionsRoot);
    const timestamp = timestampForFile();
    const sessionPath = node_path_1.default.join(sessionsRoot, `${timestamp}.md`);
    const git = getGitSummary(repoRoot);
    const memoryIndex = (0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type);
    const summary = [
        '# Session Summary',
        '',
        `- Project: \`${config.project_slug}\``,
        `- Project type: \`${config.project_type}\``,
        `- Repo: \`${repoRoot}\``,
        `- Updated: \`${(0, date_1.getIsoTimestamp)()}\``,
        `- Git branch: \`${git.branch}\``,
        `- Git dirty: \`${git.dirty ? 'yes' : 'no'}\``,
        '',
        '## Git Status',
        ...(git.status.length > 0 ? git.status.map((line) => `- ${line}`) : ['- clean or unavailable']),
        '',
        (0, vault_1.formatProjectMemoryIndex)(memoryIndex).trimEnd(),
        '',
    ].join('\n');
    (0, fs_utils_1.writeFile)(sessionPath, summary);
    const sessionSummaryPath = node_path_1.default.join(config.project_root, 'Artifacts', 'session-summary.md');
    (0, fs_utils_1.writeFile)(sessionSummaryPath, summary);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'sessions',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'session',
            title: 'Session summary',
            preview: summary,
            scope: 'project',
            path: sessionPath,
            reason: 'memory sync-sessions',
        }),
    });
    (0, vault_1.appendDailyLog)(config.vault_root, `Session memory synced for \`${config.project_slug}\``, (0, vault_1.buildMemoryLogMarker)({
        kind: 'session',
        projectSlug: config.project_slug,
        title: timestamp,
        scope: 'project',
    }));
    const recall = (0, recall_1.buildRecallIndex)(config);
    return {
        sessionPath,
        sessionSummaryPath,
        recallIndexPath: (0, recall_1.getRecallIndexPath)(config.project_root),
        indexedDocuments: recall.index.documents.length,
    };
}
function exportProjectMemory(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    const recall = (0, recall_1.buildRecallIndex)(config);
    const exportsRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Exports');
    (0, fs_utils_1.ensureDir)(exportsRoot);
    const exportPath = node_path_1.default.join(exportsRoot, `agent-bootstrap-memory-${timestampForFile()}.json`);
    const memoryIndex = (0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type);
    const files = getCriticalMemoryPaths(config).map((filePath) => ({
        relativePath: node_path_1.default.relative(config.project_root, filePath).replace(/\\/g, '/'),
        path: filePath,
        content: (0, fs_utils_1.readIfExists)(filePath) || '',
    }));
    const payload = {
        exportedAt: (0, date_1.getIsoTimestamp)(),
        repoRoot,
        project: {
            slug: config.project_slug,
            type: config.project_type,
            root: config.project_root,
            vaultRoot: config.vault_root,
        },
        memoryIndex,
        recallIndex: recall.index,
        files,
    };
    (0, fs_utils_1.writeFile)(exportPath, JSON.stringify(payload, null, 2));
    return {
        exportPath,
        files: files.length,
        recallDocuments: recall.index.documents.length,
    };
}
function backupProjectMemory(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    (0, recall_1.buildRecallIndex)(config);
    const backupRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Backups');
    const backupPath = node_path_1.default.join(backupRoot, timestampForFile());
    (0, fs_utils_1.ensureDir)(backupPath);
    const copied = [];
    for (const sourcePath of getCriticalMemoryPaths(config)) {
        const relative = node_path_1.default.relative(config.project_root, sourcePath);
        const targetPath = node_path_1.default.join(backupPath, relative);
        (0, fs_utils_1.ensureDir)(node_path_1.default.dirname(targetPath));
        node_fs_1.default.copyFileSync(sourcePath, targetPath);
        copied.push(relative.replace(/\\/g, '/'));
    }
    const manifestPath = node_path_1.default.join(backupPath, 'manifest.json');
    (0, fs_utils_1.writeFile)(manifestPath, JSON.stringify({
        createdAt: (0, date_1.getIsoTimestamp)(),
        repoRoot,
        vaultRoot: config.vault_root,
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        files: copied,
        note: 'Plain-file backup; zip compression is intentionally not required.',
    }, null, 2));
    return {
        backupPath,
        manifestPath,
        files: copied.length,
    };
}
function runRecall(options) {
    const { config } = resolveConfig(options);
    const results = (0, recall_1.recallProjectMemory)(config, options.query, options.limit);
    return (0, recall_1.formatRecallResults)(config, options.query, results);
}
function runMemoryCommand(subcommand, options = {}) {
    switch (subcommand) {
        case 'status':
            return getMemoryStatus(options);
        case 'sync-sessions':
            return syncProjectSessions(options);
        case 'export':
            return exportProjectMemory(options);
        case 'backup':
            return backupProjectMemory(options);
        default:
            throw new Error('Unknown memory command. Use: status, sync-sessions, export, backup.');
    }
}
function syncSessionsFromConfig(repoRoot, config) {
    const sessionsRoot = node_path_1.default.join(config.project_root, 'Sessions');
    (0, fs_utils_1.ensureDir)(sessionsRoot);
    const timestamp = timestampForFile();
    const sessionPath = node_path_1.default.join(sessionsRoot, `${timestamp}.md`);
    const git = getGitSummary(repoRoot);
    const index = (0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type);
    const summary = [
        '# Session Summary',
        '',
        `- Project: \`${config.project_slug}\``,
        `- Updated: \`${(0, date_1.getIsoTimestamp)()}\``,
        `- Git branch: \`${git.branch}\``,
        `- Git dirty: \`${git.dirty ? 'yes' : 'no'}\``,
        '',
        (0, vault_1.formatProjectMemoryIndex)(index).trimEnd(),
        '',
    ].join('\n');
    (0, fs_utils_1.writeFile)(sessionPath, summary);
    (0, fs_utils_1.writeFile)(node_path_1.default.join(config.project_root, 'Artifacts', 'session-summary.md'), summary);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'sessions',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'session',
            title: 'Session summary',
            preview: summary,
            scope: 'project',
            path: sessionPath,
            reason: 'memory compact',
        }),
    });
    (0, recall_1.buildRecallIndex)(config);
    return sessionPath;
}
