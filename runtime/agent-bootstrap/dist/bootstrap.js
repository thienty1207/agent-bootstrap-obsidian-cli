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
const node_os_1 = __importDefault(require("node:os"));
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
const SEEDED_REPO_PATHS = ['.codex', 'docs', 'plans'];
const BUNDLED_SKILL_DIRS = new Set([
    'superpowers',
    'frontend-design',
    'vibe-security-scan',
]);
const CORE_AGENT_FILES = new Set([
    'code-reviewer.toml',
    'security-auditor.toml',
    'test-engineer.toml',
]);
const OBSOLETE_MANAGED_SKILL_DIRS = new Set([
    [['kar', 'pathy'].join(''), 'coding', 'principles'].join('-'),
]);
const OBSOLETE_MANAGED_AGENT_FILES = new Set([
    ['man', 'ager'].join(''),
    ['arch', 'itect'].join(''),
    ['frontend', 'implementer'].join('_'),
    ['backend', 'implementer'].join('_'),
    ['data', 'base'].join(''),
    ['cl', 'oud'].join(''),
    ['ci', 'cd'].join('_'),
    ['docs', 'researcher'].join('_'),
    ['rev', 'iewer'].join(''),
    ['tes', 'ter'].join(''),
].map((name) => `${name}.toml`));
const OBSOLETE_MANAGED_PLAN_FILES = [
    '2026-04-21-kit-v2-implementation-plan.md',
    '2026-04-21-kit-v3-lifecycle-plan.md',
];
const CUSTOM_SKILLS_START = '<!-- agent-bootstrap:custom-skills:start -->';
const CUSTOM_SKILLS_END = '<!-- agent-bootstrap:custom-skills:end -->';
const CUSTOM_AGENTS_START = '<!-- agent-bootstrap:custom-agents:start -->';
const CUSTOM_AGENTS_END = '<!-- agent-bootstrap:custom-agents:end -->';
function copyTemplateIfPresent(vaultRoot, projectRoot) {
    const templateRoot = node_path_1.default.join(vaultRoot, 'Projects', '_template');
    if (node_fs_1.default.existsSync(templateRoot) && !node_fs_1.default.existsSync(projectRoot)) {
        node_fs_1.default.cpSync(templateRoot, projectRoot, { recursive: true });
    }
}
function removeLegacyAgentAssets(repoRoot) {
    const legacyPaths = [
        '.agent',
        '.agents',
        node_path_1.default.join('.github', 'AGENTS.md'),
        node_path_1.default.join('.github', ['AGENT', 'md'].join('.')),
        node_path_1.default.join('.github', 'copilot-instructions.md'),
        node_path_1.default.join('.github', 'agents'),
        node_path_1.default.join('.github', 'commands'),
        node_path_1.default.join('.github', 'rules'),
        node_path_1.default.join('.github', 'skills'),
        node_path_1.default.join('.github', 'prompts'),
    ];
    for (const relativePath of legacyPaths) {
        node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, relativePath), { recursive: true, force: true });
    }
}
function removeObsoleteManagedPlanFiles(repoRoot) {
    for (const fileName of OBSOLETE_MANAGED_PLAN_FILES) {
        node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, 'plans', fileName), { force: true });
    }
}
function extractMarkedBlock(content, startMarker, endMarker) {
    if (!content) {
        return undefined;
    }
    const start = content.indexOf(startMarker);
    const end = content.indexOf(endMarker);
    if (start === -1 || end === -1 || end < start) {
        return undefined;
    }
    return content.slice(start, end + endMarker.length);
}
function extractCustomSkillsBlock(content) {
    return extractMarkedBlock(content, CUSTOM_SKILLS_START, CUSTOM_SKILLS_END);
}
function extractCustomAgentsBlock(content) {
    return extractMarkedBlock(content, CUSTOM_AGENTS_START, CUSTOM_AGENTS_END);
}
function defaultCustomSkillsBlock() {
    return [
        CUSTOM_SKILLS_START,
        '## Custom Skills',
        '',
        'No custom project skills are registered yet.',
        '',
        'When adding one, create `.codex/skills/<skill-name>/SKILL.md` and replace this line with a precise routing table entry.',
        CUSTOM_SKILLS_END,
    ].join('\n');
}
function defaultCustomAgentsBlock() {
    return [
        CUSTOM_AGENTS_START,
        '## Custom Agents',
        '',
        'No custom project agents are registered yet.',
        '',
        'When adding one, create `.codex/agents/<agent-name>.toml` and replace this line with a precise routing table entry.',
        CUSTOM_AGENTS_END,
    ].join('\n');
}
function snapshotCustomSkills(repoRoot) {
    const skillsRoot = node_path_1.default.join(repoRoot, '.codex', 'skills');
    const tempRoot = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'agent-bootstrap-custom-skills-'));
    const skillNames = [];
    const customIndexBlock = extractCustomSkillsBlock((0, fs_utils_1.readIfExists)(node_path_1.default.join(skillsRoot, 'INDEX.md')));
    if (!node_fs_1.default.existsSync(skillsRoot)) {
        return { tempRoot, skillNames, customIndexBlock };
    }
    for (const entry of node_fs_1.default.readdirSync(skillsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) {
            continue;
        }
        if (BUNDLED_SKILL_DIRS.has(entry.name) || OBSOLETE_MANAGED_SKILL_DIRS.has(entry.name)) {
            continue;
        }
        node_fs_1.default.cpSync(node_path_1.default.join(skillsRoot, entry.name), node_path_1.default.join(tempRoot, entry.name), { recursive: true });
        skillNames.push(entry.name);
    }
    return { tempRoot, skillNames, customIndexBlock };
}
function snapshotCustomAgents(repoRoot) {
    const agentsRoot = node_path_1.default.join(repoRoot, '.codex', 'agents');
    const tempRoot = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'agent-bootstrap-custom-agents-'));
    const agentFiles = [];
    const customIndexBlock = extractCustomAgentsBlock((0, fs_utils_1.readIfExists)(node_path_1.default.join(agentsRoot, 'INDEX.md')));
    if (!node_fs_1.default.existsSync(agentsRoot)) {
        return { tempRoot, agentFiles, customIndexBlock };
    }
    for (const entry of node_fs_1.default.readdirSync(agentsRoot, { withFileTypes: true })) {
        if (!entry.isFile() || !entry.name.endsWith('.toml')) {
            continue;
        }
        if (CORE_AGENT_FILES.has(entry.name) || OBSOLETE_MANAGED_AGENT_FILES.has(entry.name)) {
            continue;
        }
        node_fs_1.default.cpSync(node_path_1.default.join(agentsRoot, entry.name), node_path_1.default.join(tempRoot, entry.name));
        agentFiles.push(entry.name);
    }
    return { tempRoot, agentFiles, customIndexBlock };
}
function mergeCustomSkillsBlock(indexPath, customIndexBlock) {
    const body = (0, fs_utils_1.readIfExists)(indexPath);
    if (!body) {
        return;
    }
    const block = customIndexBlock || defaultCustomSkillsBlock();
    const currentBlock = extractCustomSkillsBlock(body);
    const next = currentBlock
        ? body.replace(currentBlock, block)
        : `${body.trimEnd()}\n\n${block}\n`;
    (0, fs_utils_1.writeFile)(indexPath, next);
}
function mergeCustomAgentsBlock(indexPath, customIndexBlock) {
    const body = (0, fs_utils_1.readIfExists)(indexPath);
    if (!body) {
        return;
    }
    const block = customIndexBlock || defaultCustomAgentsBlock();
    const currentBlock = extractCustomAgentsBlock(body);
    const next = currentBlock
        ? body.replace(currentBlock, block)
        : `${body.trimEnd()}\n\n${block}\n`;
    (0, fs_utils_1.writeFile)(indexPath, next);
}
function restoreCustomSkills(repoRoot, snapshot) {
    const skillsRoot = node_path_1.default.join(repoRoot, '.codex', 'skills');
    (0, fs_utils_1.ensureDir)(skillsRoot);
    for (const skillName of snapshot.skillNames) {
        node_fs_1.default.cpSync(node_path_1.default.join(snapshot.tempRoot, skillName), node_path_1.default.join(skillsRoot, skillName), { recursive: true });
    }
    mergeCustomSkillsBlock(node_path_1.default.join(skillsRoot, 'INDEX.md'), snapshot.customIndexBlock);
}
function restoreCustomAgents(repoRoot, snapshot) {
    const agentsRoot = node_path_1.default.join(repoRoot, '.codex', 'agents');
    (0, fs_utils_1.ensureDir)(agentsRoot);
    for (const agentFile of snapshot.agentFiles) {
        node_fs_1.default.cpSync(node_path_1.default.join(snapshot.tempRoot, agentFile), node_path_1.default.join(agentsRoot, agentFile));
    }
    mergeCustomAgentsBlock(node_path_1.default.join(agentsRoot, 'INDEX.md'), snapshot.customIndexBlock);
}
function cleanupCustomSkillsSnapshot(snapshot) {
    node_fs_1.default.rmSync(snapshot.tempRoot, { recursive: true, force: true });
}
function cleanupCustomAgentsSnapshot(snapshot) {
    node_fs_1.default.rmSync(snapshot.tempRoot, { recursive: true, force: true });
}
function resetManagedCodexWorkspace(repoRoot) {
    node_fs_1.default.rmSync(node_path_1.default.join(repoRoot, '.codex'), { recursive: true, force: true });
}
function copyRepoScaffold(repoRoot) {
    const packageRoot = (0, kit_1.getPackageRoot)();
    const customSkills = snapshotCustomSkills(repoRoot);
    const customAgents = snapshotCustomAgents(repoRoot);
    try {
        resetManagedCodexWorkspace(repoRoot);
        (0, scaffold_1.syncSeededScaffold)({
            sourceRoot: packageRoot,
            targetRoot: repoRoot,
            manifestPath: node_path_1.default.join(repoRoot, SCAFFOLD_MANIFEST_PATH),
            seedPaths: SEEDED_REPO_PATHS,
        });
        restoreCustomAgents(repoRoot, customAgents);
        restoreCustomSkills(repoRoot, customSkills);
    }
    finally {
        cleanupCustomAgentsSnapshot(customAgents);
        cleanupCustomSkillsSnapshot(customSkills);
    }
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
    removeLegacyAgentAssets(repoRoot);
    if (syncVault) {
        copyTemplateIfPresent(vaultRoot, projectRoot);
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Research'));
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Notes'));
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Sessions'));
        (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Artifacts'));
        const writeVaultFile = projectRootAlreadyExisted ? fs_utils_1.writeFileIfMissing : fs_utils_1.writeFile;
        writeVaultFile(node_path_1.default.join(projectRoot, 'README.md'), (0, templates_1.projectReadmeTemplate)(projectSlug, repoRoot, today, projectType));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Tasks.md'), (0, templates_1.tasksTemplate)(projectSlug, today));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Decisions.md'), (0, templates_1.decisionsTemplate)(projectSlug, today));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Facts.md'), (0, templates_1.factsTemplate)(projectSlug, today));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Open Questions.md'), (0, templates_1.openQuestionsTemplate)(projectSlug, today));
        writeVaultFile(node_path_1.default.join(projectRoot, 'Handoff.md'), (0, templates_1.handoffTemplate)(projectSlug, today));
    }
    (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Sessions'));
    (0, fs_utils_1.ensureDir)(node_path_1.default.join(projectRoot, 'Artifacts'));
    copyRepoScaffold(repoRoot);
    removeObsoleteManagedPlanFiles(repoRoot);
    if (preserveReadme) {
        (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoRoot, 'README.md'), (0, templates_1.repoReadmeTemplate)(repoName, projectSlug, projectType));
    }
    else {
        (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'README.md'), (0, templates_1.repoReadmeTemplate)(repoName, projectSlug, projectType));
    }
    (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'scripts', 'agent-memory.js'), (0, templates_1.localRuntimeScriptTemplate)());
    const rootAgentsPath = node_path_1.default.join(repoRoot, 'AGENTS.md');
    const legacyAgentFile = ['AGENT', 'md'].join('.');
    const legacyRootAgentPath = node_path_1.default.join(repoRoot, legacyAgentFile);
    const vaultMemoryPath = node_path_1.default.join(repoRoot, 'docs', 'vault-memory.md');
    const currentRootAgent = node_fs_1.default.existsSync(rootAgentsPath)
        ? node_fs_1.default.readFileSync(rootAgentsPath, 'utf8')
        : (node_fs_1.default.existsSync(legacyRootAgentPath) ? node_fs_1.default.readFileSync(legacyRootAgentPath, 'utf8') : '');
    (0, fs_utils_1.writeFile)(rootAgentsPath, (0, fs_utils_1.upsertManagedBlock)(currentRootAgent, (0, templates_1.rootAgentTemplate)(vaultRoot, projectRoot, projectType)));
    (0, fs_utils_1.writeFile)(vaultMemoryPath, (0, templates_1.vaultMemoryDoc)(vaultRoot, projectRoot, projectType));
    (0, fs_utils_1.writeFile)(node_path_1.default.join(repoRoot, 'docs', 'project-map.md'), (0, templates_1.projectMapTemplate)(repoName, projectSlug, projectType));
    node_fs_1.default.rmSync(legacyRootAgentPath, { force: true });
    removeLegacyAgentAssets(repoRoot);
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
        facts_file: 'Facts.md',
        open_questions_file: 'Open Questions.md',
        handoff_file: 'Handoff.md',
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
