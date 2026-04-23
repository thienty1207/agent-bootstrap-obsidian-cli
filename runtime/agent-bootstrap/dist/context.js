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
    const raw = (0, fs_utils_1.readIfExists)(node_path_1.default.join(repoRoot, 'vault.config.json'));
    if (!raw) {
        throw new Error(`Missing vault.config.json in ${repoRoot}`);
    }
    return JSON.parse(raw);
}
function resolveRepoRoot(repoRoot) {
    return repoRoot ? node_path_1.default.resolve(repoRoot) : (0, fs_utils_1.findRepoRoot)(process.cwd());
}
function getContext({ repoRoot }) {
    const resolvedRepoRoot = resolveRepoRoot(repoRoot);
    const config = readRepoConfig(resolvedRepoRoot);
    (0, vault_1.ensureDailyNote)(config.vault_root);
    (0, vault_1.appendDailyLog)(config.vault_root, `Session started for \`${config.project_slug}\``, (0, vault_1.createDailyLogMarker)(['session', config.project_slug, new Date().toISOString().slice(0, 13)]));
    const sections = [
        ['Repo AGENT', node_path_1.default.join(resolvedRepoRoot, 'AGENT.md')],
        ['Vault Bridge', node_path_1.default.join(resolvedRepoRoot, 'docs', 'vault-memory.md')],
        ['Project Map', node_path_1.default.join(resolvedRepoRoot, 'docs', 'project-map.md')],
        ['Repo README', node_path_1.default.join(resolvedRepoRoot, 'README.md')],
        ['Agent Workspace Guide', node_path_1.default.join(resolvedRepoRoot, '.agent', 'README.md')],
        ['Vault Init', node_path_1.default.join(config.vault_root, 'Init.md')],
        ['Vault AGENTS', node_path_1.default.join(config.vault_root, 'AGENTS.md')],
        ['Project README', node_path_1.default.join(config.project_root, 'README.md')],
        ['Project Tasks', node_path_1.default.join(config.project_root, config.tasks_file)],
        ['Project Decisions', node_path_1.default.join(config.project_root, config.decisions_file)],
        ['Today Daily Note', (0, vault_1.getDailyNotePath)(config.vault_root)],
    ];
    const memoryIndex = (0, vault_1.formatProjectMemoryIndex)((0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type));
    return [
        ...sections
            .map(([label, filePath]) => {
            const body = (0, fs_utils_1.readIfExists)(filePath);
            if (!body) {
                return null;
            }
            return `===== ${label} =====\n${body.trimEnd()}\n`;
        })
            .filter((value) => Boolean(value)),
        `===== Project Memory Index =====\n${memoryIndex.trimEnd()}\n`,
    ].join('\n');
}
