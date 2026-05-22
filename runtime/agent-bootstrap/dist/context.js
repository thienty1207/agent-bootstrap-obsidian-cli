"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readRepoConfig = readRepoConfig;
exports.resolveRepoRoot = resolveRepoRoot;
exports.getContext = getContext;
const node_path_1 = __importDefault(require("node:path"));
const fs_utils_1 = require("./fs-utils");
const vault_1 = require("./vault");
const recall_1 = require("./recall");
const session_importer_1 = require("./session-importer");
const plan_state_1 = require("./plan-state");
const product_harness_1 = require("./product-harness");
function readRepoConfig(repoRoot) {
    const config = readOptionalRepoConfig(repoRoot);
    if (!config) {
        throw new Error(`Missing vault.config.json in ${repoRoot}`);
    }
    return config;
}
function readOptionalRepoConfig(repoRoot) {
    const raw = (0, fs_utils_1.readIfExists)(node_path_1.default.join(repoRoot, 'vault.config.json'));
    return raw ? JSON.parse(raw) : null;
}
function isContextRoot(candidate) {
    return Boolean((0, fs_utils_1.readIfExists)(node_path_1.default.join(candidate, 'vault.config.json'))
        || ((0, fs_utils_1.readIfExists)(node_path_1.default.join(candidate, 'AGENTS.md'))
            && (0, fs_utils_1.readIfExists)(node_path_1.default.join(candidate, '.codex', 'INDEX.md'))));
}
function findContextRoot(startPath) {
    let current = node_path_1.default.resolve(startPath);
    while (true) {
        if (isContextRoot(current)) {
            return current;
        }
        const parent = node_path_1.default.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    return (0, fs_utils_1.findRepoRoot)(startPath);
}
function resolveRepoRoot(repoRoot) {
    return repoRoot ? findContextRoot(node_path_1.default.resolve(repoRoot)) : findContextRoot(process.cwd());
}
function formatContextManifest({ mode, loaded, skipped, }) {
    return [
        '===== Context Manifest =====',
        `Context mode: ${mode}`,
        '',
        'Loaded:',
        ...loaded.map((section) => `- ${section.label}: ${section.filePath}`),
        '',
        'Skipped:',
        ...skipped.map((item) => `- ${item}`),
        '',
    ].join('\n');
}
function getContext({ repoRoot, mode = 'compact', includeWhy = false, }) {
    const resolvedRepoRoot = resolveRepoRoot(repoRoot);
    const config = readOptionalRepoConfig(resolvedRepoRoot);
    let sessionImport = null;
    const sections = [
        { label: 'Repo AGENTS', filePath: node_path_1.default.join(resolvedRepoRoot, 'AGENTS.md') },
        { label: 'Agent Routing Index', filePath: node_path_1.default.join(resolvedRepoRoot, '.codex', 'INDEX.md') },
        { label: 'Subagent Routing Index', filePath: node_path_1.default.join(resolvedRepoRoot, '.codex', 'agents', 'INDEX.md') },
        { label: 'Skills Routing Index', filePath: node_path_1.default.join(resolvedRepoRoot, '.codex', 'skills', 'INDEX.md') },
        { label: 'Vault Bridge', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'vault-memory.md') },
        { label: 'Project Map', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'project-map.md') },
        { label: 'Repo README', filePath: node_path_1.default.join(resolvedRepoRoot, 'README.md') },
        { label: 'Agent Workspace Guide', filePath: node_path_1.default.join(resolvedRepoRoot, '.codex', 'README.md') },
    ];
    const loaded = [];
    const skipped = [
        '.codex/agents/** recursive agent bodies (load only the routed TOML when needed)',
        '.codex/skills/** recursive skill bodies (load only the routed SKILL.md when needed)',
        'Full recall memory bodies (indexed on disk; compact context receives bounded snippets only)',
    ];
    if (mode === 'compact') {
        skipped.push('Daily/** daily logs (run `agent-bootstrap context --full` when needed)');
    }
    if (config) {
        (0, plan_state_1.ensurePlanState)(resolvedRepoRoot, config);
        (0, product_harness_1.ensureProductHarness)(resolvedRepoRoot, config);
        (0, vault_1.ensureDailyNote)(config.vault_root);
        (0, vault_1.appendDailyLog)(config.vault_root, `Session started for \`${config.project_slug}\``, (0, vault_1.createDailyLogMarker)(['session', config.project_slug, new Date().toISOString().slice(0, 13)]));
        sessionImport = (0, session_importer_1.importCodexSessionsForProject)(resolvedRepoRoot, config, {
            maxFiles: mode === 'full' ? 400 : 160,
            maxImports: mode === 'full' ? 32 : 8,
        });
        sections.push({ label: 'Vault Init', filePath: node_path_1.default.join(config.vault_root, 'Init.md') }, { label: 'Vault AGENTS', filePath: node_path_1.default.join(config.vault_root, 'AGENTS.md') }, { label: 'Project README', filePath: node_path_1.default.join(config.project_root, 'README.md') }, { label: 'Project Tasks', filePath: node_path_1.default.join(config.project_root, config.tasks_file) }, { label: 'Project Decisions', filePath: node_path_1.default.join(config.project_root, config.decisions_file) }, { label: 'Project Facts', filePath: node_path_1.default.join(config.project_root, config.facts_file || 'Facts.md') }, { label: 'Project Open Questions', filePath: node_path_1.default.join(config.project_root, config.open_questions_file || 'Open Questions.md') }, { label: 'Project Handoff', filePath: node_path_1.default.join(config.project_root, config.handoff_file || 'Handoff.md') }, { label: 'Active Plan State', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md') }, { label: 'Product Contract', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'product', 'PRODUCT.md') }, { label: 'Product Harness Guide', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'product', 'HARNESS.md') }, { label: 'Today Daily Note', filePath: (0, vault_1.getDailyNotePath)(config.vault_root), fullOnly: true });
        const activePlanFile = (0, plan_state_1.getActivePlanFile)(resolvedRepoRoot, config);
        if (activePlanFile) {
            sections.push({ label: 'Active Plan', filePath: activePlanFile });
        }
        const currentStoryFile = (0, product_harness_1.getCurrentStoryFile)(resolvedRepoRoot, config);
        if (currentStoryFile) {
            sections.push({ label: 'Product Harness Story', filePath: currentStoryFile });
        }
        if (mode === 'full') {
            for (const filePath of (0, plan_state_1.getRecentPlanFiles)(resolvedRepoRoot, 4)) {
                sections.push({ label: 'Recent Plan', filePath, fullOnly: true });
            }
            for (const filePath of (0, product_harness_1.getRecentStoryFiles)(resolvedRepoRoot, 4)) {
                sections.push({ label: 'Recent Story', filePath, fullOnly: true });
            }
        }
        skipped.push('Plan history date folders (compact context loads CURRENT.md and the active plan only)');
        skipped.push('Story history date folders (compact context loads Product Harness summary and current story only)');
    }
    else {
        skipped.push('vault.config.json missing; loaded repo-local source context only');
        skipped.push('Vault/project memory files unavailable until `agent-bootstrap setup` and `agent-bootstrap init` run');
    }
    const output = sections
        .map((section) => {
        if (section.fullOnly && mode !== 'full') {
            return null;
        }
        const body = (0, fs_utils_1.readIfExists)(section.filePath);
        if (!body) {
            skipped.push(`${section.label}: ${section.filePath} (missing)`);
            return null;
        }
        loaded.push(section);
        return `===== ${section.label} =====\n${body.trimEnd()}\n`;
    })
        .filter((value) => Boolean(value));
    if (config) {
        const memoryIndex = (0, vault_1.formatProjectMemoryIndex)((0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type));
        output.push(`===== Project Memory Index =====\n${memoryIndex.trimEnd()}\n`);
        loaded.push({ label: 'Project Memory Index', filePath: node_path_1.default.join(config.project_root, 'Artifacts', 'memory-index.json') });
        if (sessionImport) {
            output.push(`===== Session Import =====\n${(0, session_importer_1.formatSessionImportReport)(sessionImport).trimEnd()}\n`);
            loaded.push({ label: 'Session Import State', filePath: sessionImport.statePath });
        }
        const harnessStatus = (0, product_harness_1.getProductHarnessStatus)({ repoRoot: resolvedRepoRoot, config });
        output.push(`===== Product Harness =====\n${(0, product_harness_1.formatProductHarnessContext)(harnessStatus).trimEnd()}\n`);
        loaded.push({ label: 'Product Harness State', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'stories', 'INDEX.md') });
        const autoRecall = (0, recall_1.formatAutoRecallContext)(config, mode === 'full' ? 8 : 5);
        output.push(`===== Auto Recall =====\n${autoRecall.trimEnd()}\n`);
        loaded.push({ label: 'Recall Index', filePath: (0, recall_1.getRecallIndexPath)(config.project_root) });
    }
    else {
        output.push([
            '===== Source Repo Context =====',
            'No vault.config.json found. Loaded repo-local instructions only.',
            'Run `agent-bootstrap setup` and `agent-bootstrap init` to enable vault-backed memory.',
            '',
        ].join('\n'));
    }
    if (includeWhy) {
        output.push(formatContextManifest({ mode, loaded, skipped }));
    }
    return output.join('\n');
}
