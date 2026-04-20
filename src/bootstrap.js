const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { resolveVaultRoot } = require('./config');
const {
  ensureDir,
  writeFile,
  writeFileIfMissing,
  slugify,
  upsertManagedBlock,
  copyMissingRecursive,
} = require('./fs-utils');
const {
  projectReadmeTemplate,
  tasksTemplate,
  decisionsTemplate,
  repoReadmeTemplate,
  rootAgentsBlock,
  githubAgentBlock,
  vaultMemoryDoc,
  localRuntimeScriptTemplate,
  gitPostCommitHookTemplate,
} = require('./templates');
const { getTodayString } = require('./date');

function copyTemplateIfPresent(vaultRoot, projectRoot) {
  const templateRoot = path.join(vaultRoot, 'Projects', '_template');
  if (fs.existsSync(templateRoot) && !fs.existsSync(projectRoot)) {
    fs.cpSync(templateRoot, projectRoot, { recursive: true });
  }
}

function copyRepoScaffold(repoRoot) {
  const scaffoldRoot = path.join(__dirname, '..', 'scaffold', 'base');
  copyMissingRecursive(scaffoldRoot, repoRoot);
}

function ensureGitRepository(repoRoot) {
  if (fs.existsSync(path.join(repoRoot, '.git'))) {
    return true;
  }

  const result = cp.spawnSync('git', ['init'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  if (result.error || result.status !== 0) {
    return false;
  }

  return true;
}

function configureHooks(repoRoot) {
  const hooksRoot = path.join(repoRoot, '.githooks');
  ensureDir(hooksRoot);
  writeFile(path.join(hooksRoot, 'post-commit'), gitPostCommitHookTemplate());

  if (process.platform !== 'win32') {
    fs.chmodSync(path.join(hooksRoot, 'post-commit'), 0o755);
  }

  const result = cp.spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return !result.error && result.status === 0;
}

function initProject({ projectPath, slug, vaultRoot: explicitVaultRoot }) {
  const repoRoot = path.resolve(projectPath || process.cwd());
  const vaultRoot = resolveVaultRoot(explicitVaultRoot);
  const repoName = path.basename(repoRoot);
  const projectSlug = slug ? slugify(slug) : slugify(repoName);
  const projectRoot = path.join(vaultRoot, 'Projects', projectSlug);
  const today = getTodayString();

  ensureDir(repoRoot);
  copyTemplateIfPresent(vaultRoot, projectRoot);

  ensureDir(path.join(projectRoot, 'Research'));
  ensureDir(path.join(projectRoot, 'Notes'));
  ensureDir(path.join(projectRoot, 'Artifacts'));

  writeFile(path.join(projectRoot, 'README.md'), projectReadmeTemplate(projectSlug, repoRoot, today));
  writeFile(path.join(projectRoot, 'Tasks.md'), tasksTemplate(projectSlug, today));
  writeFile(path.join(projectRoot, 'Decisions.md'), decisionsTemplate(projectSlug, today));

  copyRepoScaffold(repoRoot);
  writeFileIfMissing(path.join(repoRoot, 'README.md'), repoReadmeTemplate(repoName, projectSlug));
  writeFile(path.join(repoRoot, 'scripts', 'agent-memory.js'), localRuntimeScriptTemplate());

  const rootAgentsPath = path.join(repoRoot, 'AGENTS.md');
  const githubAgentPath = path.join(repoRoot, '.github', 'AGENT.md');
  const docsPath = path.join(repoRoot, 'docs', 'vault-memory.md');

  const currentRootAgents = fs.existsSync(rootAgentsPath)
    ? fs.readFileSync(rootAgentsPath, 'utf8')
    : '# Repository Agent Entry Point\n';
  const currentGithubAgent = fs.existsSync(githubAgentPath)
    ? fs.readFileSync(githubAgentPath, 'utf8')
    : '';

  writeFile(rootAgentsPath, upsertManagedBlock(currentRootAgents, rootAgentsBlock(vaultRoot, projectRoot)));
  writeFile(githubAgentPath, githubAgentBlock(vaultRoot, projectRoot));
  writeFile(docsPath, vaultMemoryDoc(vaultRoot, projectRoot));

  const gitInitialized = ensureGitRepository(repoRoot);
  const hooksConfigured = gitInitialized ? configureHooks(repoRoot) : false;

  writeFile(path.join(repoRoot, 'vault.config.json'), JSON.stringify({
    vault_root: vaultRoot,
    project_slug: projectSlug,
    project_root: projectRoot,
    tasks_file: 'Tasks.md',
    decisions_file: 'Decisions.md',
    research_dir: 'Research',
    notes_dir: 'Notes',
    runtime_script: 'scripts/agent-memory.js',
    hooks_path: '.githooks',
    git_initialized: gitInitialized,
    hooks_configured: hooksConfigured
  }, null, 2));

  return {
    repo_root: repoRoot,
    project_slug: projectSlug,
    vault_project_root: projectRoot,
    git_initialized: gitInitialized,
    hooks_configured: hooksConfigured
  };
}

module.exports = {
  initProject
};
