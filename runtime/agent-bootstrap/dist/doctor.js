"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDoctor = runDoctor;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = __importDefault(require("node:child_process"));
const config_1 = require("./config");
const context_1 = require("./context");
const kit_1 = require("./kit");
function hasGit() {
    const result = node_child_process_1.default.spawnSync('git', ['--version'], { encoding: 'utf8' });
    return !result.error && result.status === 0;
}
function runDoctor({ repoRoot } = {}) {
    const resolvedRepoRoot = (0, context_1.resolveRepoRoot)(repoRoot);
    const config = (0, context_1.readRepoConfig)(resolvedRepoRoot);
    const registry = (0, config_1.loadRegistry)();
    const currentKitVersion = (0, kit_1.getKitVersion)();
    const registered = registry.some((item) => item.repoRoot === resolvedRepoRoot);
    const missingRepoPaths = kit_1.MANAGED_REPO_PATHS.filter((relativePath) => (!node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, relativePath))));
    const missingVaultPaths = [
        ['README.md', node_path_1.default.join(config.project_root, 'README.md')],
        [config.tasks_file, node_path_1.default.join(config.project_root, config.tasks_file)],
        [config.decisions_file, node_path_1.default.join(config.project_root, config.decisions_file)],
        [config.research_dir, node_path_1.default.join(config.project_root, config.research_dir)],
        [config.notes_dir, node_path_1.default.join(config.project_root, config.notes_dir)],
    ]
        .filter(([, absolutePath]) => !node_fs_1.default.existsSync(absolutePath))
        .map(([relativePath]) => relativePath);
    const checks = {
        vaultConfig: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, 'vault.config.json')),
        agentFile: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, 'AGENT.md')),
        githubTemplate: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, '.github', 'agents', 'planner.md'))
            && node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, '.github', 'commands', 'plan', 'brainstorm.md')),
        docs: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, 'docs')),
        plans: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, 'plans')),
        gitAvailable: hasGit(),
        registered,
        vaultProject: node_fs_1.default.existsSync(config.project_root),
        runtimeScript: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, 'scripts', 'agent-memory.js')),
        hookFile: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, '.githooks', 'post-commit')),
        projectMap: node_fs_1.default.existsSync(node_path_1.default.join(resolvedRepoRoot, 'docs', 'project-map.md')),
        projectReadme: node_fs_1.default.existsSync(node_path_1.default.join(config.project_root, 'README.md')),
        projectTasks: node_fs_1.default.existsSync(node_path_1.default.join(config.project_root, config.tasks_file)),
        projectDecisions: node_fs_1.default.existsSync(node_path_1.default.join(config.project_root, config.decisions_file)),
    };
    const suggestedCommands = [];
    if (missingRepoPaths.length > 0 || config.kit_version !== currentKitVersion) {
        suggestedCommands.push('agent-bootstrap init');
    }
    if (missingVaultPaths.length > 0 || !registered) {
        if (!suggestedCommands.includes('agent-bootstrap init')) {
            suggestedCommands.push('agent-bootstrap init');
        }
    }
    return {
        ok: Object.values(checks).every(Boolean),
        repo: {
            repoRoot: resolvedRepoRoot,
            projectSlug: config.project_slug,
            projectType: config.project_type,
            vaultRoot: config.vault_root,
            vaultProjectRoot: config.project_root,
            kitVersion: config.kit_version || currentKitVersion,
        },
        checks,
        missing: {
            repoPaths: [...missingRepoPaths],
            vaultPaths: [...missingVaultPaths],
        },
        suggestedCommands,
    };
}
