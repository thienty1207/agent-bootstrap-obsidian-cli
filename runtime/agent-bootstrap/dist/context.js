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
            && (0, fs_utils_1.readIfExists)(node_path_1.default.join(candidate, '.agent', 'INDEX.md'))));
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
    const sections = [
        { label: 'Repo AGENTS', filePath: node_path_1.default.join(resolvedRepoRoot, 'AGENTS.md') },
        { label: 'Agent Routing Index', filePath: node_path_1.default.join(resolvedRepoRoot, '.agent', 'INDEX.md') },
        { label: 'Skills Routing Index', filePath: node_path_1.default.join(resolvedRepoRoot, '.agent', 'skills', 'INDEX.md') },
        { label: 'Vault Bridge', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'vault-memory.md') },
        { label: 'Project Map', filePath: node_path_1.default.join(resolvedRepoRoot, 'docs', 'project-map.md') },
        { label: 'Repo README', filePath: node_path_1.default.join(resolvedRepoRoot, 'README.md') },
        { label: 'Agent Workspace Guide', filePath: node_path_1.default.join(resolvedRepoRoot, '.agent', 'README.md') },
    ];
    const loaded = [];
    const skipped = [
        '.agent/skills/** recursive skill bodies (load only the routed SKILL.md when needed)',
    ];
    if (mode === 'compact') {
        skipped.push('Daily/** daily logs (run `agent-bootstrap context --full` when needed)');
    }
    if (config) {
        (0, vault_1.ensureDailyNote)(config.vault_root);
        (0, vault_1.appendDailyLog)(config.vault_root, `Session started for \`${config.project_slug}\``, (0, vault_1.createDailyLogMarker)(['session', config.project_slug, new Date().toISOString().slice(0, 13)]));
        sections.push({ label: 'Vault Init', filePath: node_path_1.default.join(config.vault_root, 'Init.md') }, { label: 'Vault AGENTS', filePath: node_path_1.default.join(config.vault_root, 'AGENTS.md') }, { label: 'Project README', filePath: node_path_1.default.join(config.project_root, 'README.md') }, { label: 'Project Tasks', filePath: node_path_1.default.join(config.project_root, config.tasks_file) }, { label: 'Project Decisions', filePath: node_path_1.default.join(config.project_root, config.decisions_file) }, { label: 'Project Facts', filePath: node_path_1.default.join(config.project_root, config.facts_file || 'Facts.md') }, { label: 'Project Open Questions', filePath: node_path_1.default.join(config.project_root, config.open_questions_file || 'Open Questions.md') }, { label: 'Project Handoff', filePath: node_path_1.default.join(config.project_root, config.handoff_file || 'Handoff.md') }, { label: 'Today Daily Note', filePath: (0, vault_1.getDailyNotePath)(config.vault_root), fullOnly: true });
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
