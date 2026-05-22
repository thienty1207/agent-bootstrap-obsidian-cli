"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryStatus = getMemoryStatus;
exports.importProjectSessions = importProjectSessions;
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
const session_importer_1 = require("./session-importer");
const plan_state_1 = require("./plan-state");
const product_harness_1 = require("./product-harness");
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
function getCriticalMemoryFiles(config, repoRoot) {
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
    for (const dirPath of [
        node_path_1.default.join(config.project_root, 'Plans'),
        node_path_1.default.join(config.project_root, 'ProductHarness'),
        node_path_1.default.join(repoRoot, 'docs', 'superpowers', 'plans'),
        node_path_1.default.join(repoRoot, 'docs', 'product'),
        node_path_1.default.join(repoRoot, 'docs', 'stories'),
        node_path_1.default.join(repoRoot, 'docs', 'validation'),
        node_path_1.default.join(repoRoot, 'docs', 'decisions'),
    ]) {
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
    return [...new Set(files)]
        .filter((filePath) => node_fs_1.default.existsSync(filePath))
        .map((sourcePath) => {
        if (sourcePath.startsWith(config.project_root)) {
            return {
                sourcePath,
                relativePath: node_path_1.default.relative(config.project_root, sourcePath).replace(/\\/g, '/'),
            };
        }
        return {
            sourcePath,
            relativePath: `Repo/${node_path_1.default.relative(repoRoot, sourcePath).replace(/\\/g, '/')}`,
        };
    });
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
function uniqueValues(values) {
    return [...new Set(values)];
}
function buildMemoryDiagnostics({ recallDocuments, importState, }) {
    const diagnostics = [];
    const nextActions = ['agent-bootstrap context --compact'];
    if (recallDocuments > 0) {
        diagnostics.push({
            level: 'ok',
            code: 'recall-index-ready',
            message: `Hybrid recall has ${recallDocuments} indexed markdown memory document${recallDocuments === 1 ? '' : 's'}.`,
        });
        nextActions.push('agent-bootstrap recall "<query>"');
    }
    else {
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
            message: `Session importer last ran at ${importState.last_run.at}; imported ${importState.imported.length} total session note${importState.imported.length === 1 ? '' : 's'}.`,
        });
    }
    else {
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
function getMemoryStatus(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    (0, plan_state_1.ensurePlanState)(repoRoot, config);
    (0, product_harness_1.ensureProductHarness)(repoRoot, config);
    const planState = (0, plan_state_1.getPlanStatus)({ repoRoot, config });
    const productHarness = (0, product_harness_1.getProductHarnessStatus)({ repoRoot, config });
    const recall = (0, recall_1.buildRecallIndex)(config, repoRoot);
    const sessionsRoot = node_path_1.default.join(config.project_root, 'Sessions');
    const exportsRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Exports');
    const backupsRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Backups');
    const latestSession = latestFile(sessionsRoot);
    const importState = (0, session_importer_1.readSessionImportState)(config);
    const diagnostics = buildMemoryDiagnostics({
        recallDocuments: recall.index.documents.length,
        importState,
    });
    if (planState.current && planState.current.verification === 'not_run') {
        diagnostics.diagnostics.push({
            level: 'warn',
            code: 'active-plan-unverified',
            message: `Active plan "${planState.current.title}" is ${planState.current.status} and has no verification evidence yet.`,
        });
        diagnostics.nextActions.push('agent-bootstrap plan status');
    }
    if (productHarness.proofGaps.length > 0) {
        diagnostics.diagnostics.push({
            level: 'warn',
            code: 'product-harness-proof-gap',
            message: productHarness.proofGaps.join(' '),
        });
        diagnostics.nextActions.push('agent-bootstrap harness status');
    }
    return {
        ok: node_fs_1.default.existsSync(config.vault_root) && node_fs_1.default.existsSync(config.project_root),
        recallMode: recall.index.mode,
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
            sessionImportState: node_fs_1.default.existsSync((0, session_importer_1.getSessionImportStatePath)(config.project_root)),
            planState: node_fs_1.default.existsSync(planState.currentPath) && node_fs_1.default.existsSync(planState.vaultCurrentPath),
            productHarness: productHarness.ok,
        },
        counts: {
            memoryRecords: countMemoryRecords(config),
            recallDocuments: recall.index.documents.length,
            sessions: listFiles(sessionsRoot, (fileName) => fileName.endsWith('.md')).length,
            importedSessions: importState.imported.length,
            exports: listFiles(exportsRoot, (fileName) => fileName.endsWith('.json')).length,
            backups: node_fs_1.default.existsSync(backupsRoot)
                ? node_fs_1.default.readdirSync(backupsRoot).filter((entry) => node_fs_1.default.statSync(node_path_1.default.join(backupsRoot, entry)).isDirectory()).length
                : 0,
            plans: planState.counts.total,
            stories: productHarness.counts.stories,
        },
        planState,
        productHarness,
        imports: {
            mode: 'automatic Codex session importer',
            statePath: (0, session_importer_1.getSessionImportStatePath)(config.project_root),
            rootsChecked: importState.roots_checked,
            importedSessions: importState.imported.length,
            skippedUnmatched: importState.skipped_unmatched,
            skippedDuplicate: importState.skipped_duplicate,
            skippedLowValue: importState.skipped_low_value,
            parseErrors: importState.parse_errors,
            lastImportAt: importState.last_run?.at || null,
        },
        diagnostics: diagnostics.diagnostics,
        nextActions: diagnostics.nextActions,
        latestSession: latestSession
            ? {
                path: latestSession,
                updatedAt: node_fs_1.default.statSync(latestSession).mtime.toISOString(),
            }
            : null,
        commands: [
            'agent-bootstrap context --compact',
            'agent-bootstrap recall "<query>"',
            'agent-bootstrap memory import-sessions',
            'agent-bootstrap memory sync-sessions',
            'agent-bootstrap memory export',
            'agent-bootstrap memory backup',
            'agent-bootstrap harness status',
        ],
    };
}
function importProjectSessions(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    const report = (0, session_importer_1.importCodexSessionsForProject)(repoRoot, config, {
        maxFiles: 400,
        maxImports: 32,
    });
    const recall = (0, recall_1.buildRecallIndex)(config, repoRoot);
    const guidance = (0, session_importer_1.describeSessionImportReport)(report);
    return {
        summary: guidance.summary,
        nextAction: guidance.nextAction,
        imported: report.imported,
        skippedUnmatched: report.skippedUnmatched,
        skippedDuplicate: report.skippedDuplicate,
        skippedLowValue: report.skippedLowValue,
        parseErrors: report.parseErrors,
        rootsChecked: report.rootsChecked,
        scannedFiles: report.scannedFiles,
        statePath: report.statePath,
        importedNotes: report.importedNotes,
        recallMode: recall.index.mode,
        recallDocuments: recall.index.documents.length,
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
    const recall = (0, recall_1.buildRecallIndex)(config, repoRoot);
    return {
        sessionPath,
        sessionSummaryPath,
        recallIndexPath: (0, recall_1.getRecallIndexPath)(config.project_root),
        indexedDocuments: recall.index.documents.length,
    };
}
function exportProjectMemory(options = {}) {
    const { repoRoot, config } = resolveConfig(options);
    (0, plan_state_1.ensurePlanState)(repoRoot, config);
    (0, product_harness_1.ensureProductHarness)(repoRoot, config);
    const recall = (0, recall_1.buildRecallIndex)(config, repoRoot);
    const exportsRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Exports');
    (0, fs_utils_1.ensureDir)(exportsRoot);
    const exportPath = node_path_1.default.join(exportsRoot, `agent-bootstrap-memory-${timestampForFile()}.json`);
    const memoryIndex = (0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type);
    const files = getCriticalMemoryFiles(config, repoRoot).map((file) => ({
        relativePath: file.relativePath,
        path: file.sourcePath,
        content: (0, fs_utils_1.readIfExists)(file.sourcePath) || '',
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
    (0, plan_state_1.ensurePlanState)(repoRoot, config);
    (0, product_harness_1.ensureProductHarness)(repoRoot, config);
    (0, recall_1.buildRecallIndex)(config, repoRoot);
    const backupRoot = node_path_1.default.join(config.project_root, 'Artifacts', 'Backups');
    const backupPath = node_path_1.default.join(backupRoot, timestampForFile());
    (0, fs_utils_1.ensureDir)(backupPath);
    const copied = [];
    for (const file of getCriticalMemoryFiles(config, repoRoot)) {
        const targetPath = node_path_1.default.join(backupPath, file.relativePath);
        (0, fs_utils_1.ensureDir)(node_path_1.default.dirname(targetPath));
        node_fs_1.default.copyFileSync(file.sourcePath, targetPath);
        copied.push(file.relativePath);
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
    const { repoRoot, config } = resolveConfig(options);
    const results = (0, recall_1.recallProjectMemory)(config, options.query, options.limit, repoRoot);
    return (0, recall_1.formatRecallResults)(config, options.query, results);
}
function runMemoryCommand(subcommand, options = {}) {
    switch (subcommand) {
        case 'status':
            return getMemoryStatus(options);
        case 'import-sessions':
            return importProjectSessions(options);
        case 'sync-sessions':
            return syncProjectSessions(options);
        case 'export':
            return exportProjectMemory(options);
        case 'backup':
            return backupProjectMemory(options);
        default:
            throw new Error('Unknown memory command. Use: status, import-sessions, sync-sessions, export, backup.');
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
    (0, recall_1.buildRecallIndex)(config, repoRoot);
    return sessionPath;
}
