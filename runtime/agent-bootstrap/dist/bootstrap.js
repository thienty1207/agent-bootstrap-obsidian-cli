"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initProject = initProject;
exports.newProject = newProject;
exports.syncProject = syncProject;
exports.updateProject = updateProject;
exports.migrateProject = migrateProject;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = __importDefault(require("node:child_process"));
const config_1 = require("./config");
const projects_1 = require("./projects");
const fs_utils_1 = require("./fs-utils");
const templates_1 = require("./templates");
const date_1 = require("./date");
const project_types_1 = require("./project-types");
const context_1 = require("./context");
const kit_1 = require("./kit");
const scaffold_1 = require("./scaffold");
const vault_1 = require("./vault");
const SCAFFOLD_MANIFEST_PATH = '.agent-bootstrap-manifest.json';
const SEEDED_REPO_PATHS = ['.agent', 'docs', 'plans'];
function copyTemplateIfPresent(vaultRoot, projectRoot) {
    const templateRoot = node_path_1.default.join(vaultRoot, 'Projects', '_template');
    if (node_fs_1.default.existsSync(templateRoot) && !node_fs_1.default.existsSync(projectRoot)) {
        node_fs_1.default.cpSync(templateRoot, projectRoot, { recursive: true });
    }
}
function copyRepoScaffold(repoRoot) {
    const packageRoot = (0, kit_1.getPackageRoot)();
    (0, scaffold_1.syncSeededScaffold)({
        sourceRoot: packageRoot,
        targetRoot: repoRoot,
        manifestPath: node_path_1.default.join(repoRoot, SCAFFOLD_MANIFEST_PATH),
        seedPaths: SEEDED_REPO_PATHS,
    });
}
function ensureGitRepository(repoRoot) {
    if (node_fs_1.default.existsSync(node_path_1.default.join(repoRoot, '.git'))) {
        return true;
    }
    const result = node_child_process_1.default.spawnSync('git', ['init'], { cwd: repoRoot, encoding: 'utf8' });
    return !result.error && result.status === 0;
}
function configureHooks(repoRoot) {
    const hooksRoot = node_path_1.default.join(repoRoot, '.githooks');
    (0, fs_utils_1.ensureDir)(hooksRoot);
    (0, fs_utils_1.writeFile)(node_path_1.default.join(hooksRoot, 'post-commit'), (0, templates_1.gitPostCommitHookTemplate)());
    if (process.platform !== 'win32') {
        node_fs_1.default.chmodSync(node_path_1.default.join(hooksRoot, 'post-commit'), 0o755);
    }
    const result = node_child_process_1.default.spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
        cwd: repoRoot,
        encoding: 'utf8',
    });
    return !result.error && result.status === 0;
}
function applyBootstrap({ action, repoRoot, vaultRoot, projectSlug, projectType, preserveReadme, syncVault, }) {
    const projectRoot = node_path_1.default.join(vaultRoot, 'Projects', projectSlug);
    const today = (0, date_1.getTodayString)();
    const repoName = node_path_1.default.basename(repoRoot);
    const kitVersion = (0, kit_1.getKitVersion)();
    const projectRootAlreadyExisted = node_fs_1.default.existsSync(projectRoot);
    (0, fs_utils_1.ensureDir)(repoRoot);
    (0, vault_1.ensureVaultScaffold)(vaultRoot);
    if (syncVault) {
        copyTemplateIfPresent(vaultRoot, projectRoot);
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Research'));
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Notes'));
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Artifacts'));
        const writeVaultFile = projectRootAlreadyExisted ? fs_utils_1.writeFileIfMissing : fs_utils_1.writeFile;
        writeVaultFile(node_path_1.default.join(projectRoot, 'README.md'), (0, templates_1.projectReadmeTemplate)(projectSlug, repoRoot, today, projectType));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Tasks.md'), (0, templates_1.tasksTemplate)(projectSlug, today));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Decisions.md'), (0, templates_1.decisionsTemplate)(projectSlug, today));
    }
    copyRepoScaffold(repoRoot);
    if (preserveReadme) {
        (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoRoot, 'README.md'), (0, templates_1.repoReadmeTemplate)(repoName, projectSlug, projectType));
    }
    else {
        (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'README.md'), (0, templates_1.repoReadmeTemplate)(repoName, projectSlug, projectType));
    }
    (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'scripts', 'agent-memory.js'), (0, templates_1.localRuntimeScriptTemplate)());
    const rootAgentPath = node_path_1.default.join(repoRoot, 'AGENT.md');
    const vaultMemoryPath = node_path_1.default.join(repoRoot, 'docs', 'vault-memory.md');
    const currentRootAgent = node_fs_1.default.existsSync(rootAgentPath)
        ? node_fs_1.default.readFileSync(rootAgentPath, 'utf8')
        : '';
    (0, fs_utils_1.writeFile)(rootAgentPath, (0, fs_utils_1.upsertManagedBlock)(currentRootAgent, (0, templates_1.rootAgentTemplate)(vaultRoot, projectRoot, projectType)));
    (0, fs_utils_1.writeFile)(vaultMemoryPath, (0, templates_1.vaultMemoryDoc)(vaultRoot, projectRoot, projectType));
    (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'docs', 'project-map.md'), (0, templates_1.projectMapTemplate)(repoName, projectSlug, projectType));
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, 'AGENTS.md'), { force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'AGENT.md'), { force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'copilot-instructions.md'), { force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'agents'), { recursive: true, force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'commands'), { recursive: true, force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'rules'), { recursive: true, force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'skills'), { recursive: true, force: true });
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.github', 'prompts'), { recursive: true, force: true });
    const gitInitialized = ensureGitRepository(repoRoot);
    const hooksConfigured = gitInitialized ? configureHooks(repoRoot) : false;
    (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'vault.config.json'), JSON.stringify({
        vault_root: vaultRoot,
        project_slug: projectSlug,
        project_root: projectRoot,
        project_type: projectType,
        kit_version: kitVersion,
        tasks_file: 'Tasks.md',
        decisions_file: 'Decisions.md',
        research_dir: 'Research',
        notes_dir: 'Notes',
        runtime_script: 'scripts/agent-memory.js',
        hooks_path: '.githooks',
        git_initialized: gitInitialized,
        hooks_configured: hooksConfigured,
    }, null, 2));
    (0, projects_1.registerProject)({
        slug: projectSlug,
        projectType,
        repoRoot,
        vaultRoot,
        vaultProjectRoot: projectRoot,
    });
    (0, vault_1.appendDailyLog)(vaultRoot, `Bootstrapped project \`${projectSlug}\` from repo \`${repoName}\``, `<!-- agent-bootstrap:bootstrap:${projectSlug}:${today} -->`);
    (0, vault_1.updateProjectMemoryIndex)({
        projectRoot,
        projectSlug,
        projectType,
        bucket: 'daily',
        item: (0, vault_1.createMemoryIndexRecord)({
            kind: 'daily',
            title: 'Bootstrap',
            preview: `Bootstrapped project ${projectSlug} from repo ${repoName}`,
            scope: 'project',
            path: node_path_1.default.join(vaultRoot, 'Daily', `${today}.md`),
            reason: 'bootstrap event',
        }),
    });
    return {
        action,
        repo_root: repoRoot,
        project_slug: projectSlug,
        project_type: projectType,
        vault_project_root: projectRoot,
        git_initialized: gitInitialized,
        hooks_configured: hooksConfigured,
        kit_version: kitVersion,
    };
}
function initProject({ projectPath, slug, vaultRoot: explicitVaultRoot, projectType, }) {
    const repoRoot = node_path_1.default.resolve(projectPath || process.cwd());
    const vaultRoot = (0, config_1.resolveVaultRoot)(explicitVaultRoot);
    const normalizedType = (0, project_types_1.normalizeProjectType)(projectType || project_types_1.DEFAULT_PROJECT_TYPE);
    const projectSlug = slug ? (0, fs_utils_1.slugify)(slug) : (0, fs_utils_1.slugify)(node_path_1.default.basename(repoRoot));
    return applyBootstrap({
        action: 'init',
        repoRoot,
        vaultRoot,
        projectSlug,
        projectType: normalizedType,
        preserveReadme: true,
        syncVault: true,
    });
}
function newProject({ projectType, projectPath, slug, vaultRoot, }) {
    const repoRoot = node_path_1.default.resolve(projectPath || process.cwd());
    const resolvedVaultRoot = (0, config_1.resolveVaultRoot)(vaultRoot);
    const normalizedType = (0, project_types_1.normalizeProjectType)(projectType);
    const projectSlug = slug ? (0, fs_utils_1.slugify)(slug) : (0, fs_utils_1.slugify)(node_path_1.default.basename(repoRoot));
    return applyBootstrap({
        action: 'new',
        repoRoot,
        vaultRoot: resolvedVaultRoot,
        projectSlug,
        projectType: normalizedType,
        preserveReadme: true,
        syncVault: true,
    });
}
function syncProject({ repoRoot } = {}) {
    const resolvedRepoRoot = repoRoot ? node_path_1.default.resolve(repoRoot) : (0, fs_utils_1.findRepoRoot)(process.cwd());
    const config = (0, context_1.readRepoConfig)(resolvedRepoRoot);
    return applyBootstrap({
        action: 'sync',
        repoRoot: resolvedRepoRoot,
        vaultRoot: config.vault_root,
        projectSlug: config.project_slug,
        projectType: (0, project_types_1.normalizeProjectType)(config.project_type),
        preserveReadme: true,
        syncVault: true,
    });
}
function updateProject({ repoRoot } = {}) {
    const resolvedRepoRoot = repoRoot ? node_path_1.default.resolve(repoRoot) : (0, fs_utils_1.findRepoRoot)(process.cwd());
    const config = (0, context_1.readRepoConfig)(resolvedRepoRoot);
    return applyBootstrap({
        action: 'update',
        repoRoot: resolvedRepoRoot,
        vaultRoot: config.vault_root,
        projectSlug: config.project_slug,
        projectType: (0, project_types_1.normalizeProjectType)(config.project_type),
        preserveReadme: true,
        syncVault: false,
    });
}
function migrateProject({ repoRoot, slug, vaultRoot, projectType, } = {}) {
    const resolvedRepoRoot = node_path_1.default.resolve(repoRoot || process.cwd());
    const configPath = node_path_1.default.join(resolvedRepoRoot, 'vault.config.json');
    if (node_fs_1.default.existsSync(configPath)) {
        const config = (0, context_1.readRepoConfig)(resolvedRepoRoot);
        return applyBootstrap({
            action: 'migrate',
            repoRoot: resolvedRepoRoot,
            vaultRoot: vaultRoot ? node_path_1.default.resolve(vaultRoot) : config.vault_root,
            projectSlug: slug ? (0, fs_utils_1.slugify)(slug) : config.project_slug,
            projectType: (0, project_types_1.normalizeProjectType)(projectType || config.project_type),
            preserveReadme: true,
            syncVault: true,
        });
    }
    const resolvedVaultRoot = (0, config_1.resolveVaultRoot)(vaultRoot);
    const normalizedType = (0, project_types_1.normalizeProjectType)(projectType || project_types_1.DEFAULT_PROJECT_TYPE);
    const projectSlug = slug ? (0, fs_utils_1.slugify)(slug) : (0, fs_utils_1.slugify)(node_path_1.default.basename(resolvedRepoRoot));
    return applyBootstrap({
        action: 'migrate',
        repoRoot: resolvedRepoRoot,
        vaultRoot: resolvedVaultRoot,
        projectSlug,
        projectType: normalizedType,
        preserveReadme: true,
        syncVault: true,
    });
}
