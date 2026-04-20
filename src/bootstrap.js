const fs = require('node:fs');
const path = require('node:path');
const { resolveVaultRoot } = require('./config');
const { ensureDir, writeFile, slugify, upsertManagedBlock } = require('./fs-utils');
const {
  projectReadmeTemplate,
  tasksTemplate,
  decisionsTemplate,
  rootAgentsBlock,
  githubAgentBlock,
  vaultMemoryDoc
} = require('./templates');
const { getTodayString } = require('./date');

function copyTemplateIfPresent(vaultRoot, projectRoot) {
  const templateRoot = path.join(vaultRoot, 'Projects', '_template');
  if (fs.existsSync(templateRoot) && !fs.existsSync(projectRoot)) {
    fs.cpSync(templateRoot, projectRoot, { recursive: true });
  }
}

function initProject({ projectPath, slug, vaultRoot: explicitVaultRoot }) {
  const repoRoot = path.resolve(projectPath || process.cwd());
  const vaultRoot = resolveVaultRoot(explicitVaultRoot);
  const projectSlug = slug ? slugify(slug) : slugify(path.basename(repoRoot));
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

  const rootAgentsPath = path.join(repoRoot, 'AGENTS.md');
  const githubAgentPath = path.join(repoRoot, '.github', 'AGENT.md');
  const docsPath = path.join(repoRoot, 'docs', 'vault-memory.md');

  const currentRootAgents = fs.existsSync(rootAgentsPath) ? fs.readFileSync(rootAgentsPath, 'utf8') : '# Repository Agent Entry Point\n';
  const currentGithubAgent = fs.existsSync(githubAgentPath) ? fs.readFileSync(githubAgentPath, 'utf8') : '# Repository Team Contract\n';

  writeFile(rootAgentsPath, upsertManagedBlock(currentRootAgents, rootAgentsBlock(vaultRoot, projectRoot)));
  writeFile(githubAgentPath, upsertManagedBlock(currentGithubAgent, githubAgentBlock(vaultRoot, projectRoot)));
  writeFile(docsPath, vaultMemoryDoc(vaultRoot, projectRoot));

  writeFile(path.join(repoRoot, 'vault.config.json'), JSON.stringify({
    vault_root: vaultRoot,
    project_slug: projectSlug,
    project_root: projectRoot,
    tasks_file: 'Tasks.md',
    decisions_file: 'Decisions.md',
    research_dir: 'Research',
    notes_dir: 'Notes'
  }, null, 2));

  return {
    repo_root: repoRoot,
    project_slug: projectSlug,
    vault_project_root: projectRoot
  };
}

module.exports = {
  initProject
};
