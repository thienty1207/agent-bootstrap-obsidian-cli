import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { resolveVaultRoot } from './config';
import { registerProject } from './projects';
import {
  ensureDir,
  writeFile,
  writeFileIfMissing,
  slugify,
  upsertManagedBlock,
  copyMissingRecursive,
  findRepoRoot,
} from './fs-utils';
import {
  projectReadmeTemplate,
  tasksTemplate,
  decisionsTemplate,
  repoReadmeTemplate,
  rootAgentTemplate,
  vaultMemoryDoc,
  localRuntimeScriptTemplate,
  gitPostCommitHookTemplate,
} from './templates';
import { getTodayString } from './date';
import { DEFAULT_PROJECT_TYPE, normalizeProjectType, type ProjectType } from './project-types';
import { readRepoConfig } from './context';

function copyTemplateIfPresent(vaultRoot: string, projectRoot: string): void {
  const templateRoot = path.join(vaultRoot, 'Projects', '_template');
  if (fs.existsSync(templateRoot) && !fs.existsSync(projectRoot)) {
    fs.cpSync(templateRoot, projectRoot, { recursive: true });
  }
}

function copyRepoScaffold(repoRoot: string): void {
  const packageRoot = path.join(__dirname, '..');
  const githubDirs = ['agents', 'commands', 'prompts', 'rules', 'skills'];

  for (const directory of githubDirs) {
    copyMissingRecursive(
      path.join(packageRoot, '.github', directory),
      path.join(repoRoot, '.github', directory),
    );
  }

  copyMissingRecursive(path.join(packageRoot, 'docs'), path.join(repoRoot, 'docs'));
  copyMissingRecursive(path.join(packageRoot, 'plans'), path.join(repoRoot, 'plans'));
}

function ensureGitRepository(repoRoot: string): boolean {
  if (fs.existsSync(path.join(repoRoot, '.git'))) {
    return true;
  }

  const result = cp.spawnSync('git', ['init'], { cwd: repoRoot, encoding: 'utf8' });
  return !result.error && result.status === 0;
}

function configureHooks(repoRoot: string): boolean {
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

interface ApplyBootstrapOptions {
  repoRoot: string;
  vaultRoot: string;
  projectSlug: string;
  projectType: ProjectType;
  preserveReadme: boolean;
}

function applyBootstrap({
  repoRoot,
  vaultRoot,
  projectSlug,
  projectType,
  preserveReadme,
}: ApplyBootstrapOptions): {
  repo_root: string;
  project_slug: string;
  project_type: ProjectType;
  vault_project_root: string;
  git_initialized: boolean;
  hooks_configured: boolean;
} {
  const projectRoot = path.join(vaultRoot, 'Projects', projectSlug);
  const today = getTodayString();
  const repoName = path.basename(repoRoot);

  ensureDir(repoRoot);
  copyTemplateIfPresent(vaultRoot, projectRoot);

  ensureDir(path.join(projectRoot, 'Research'));
  ensureDir(path.join(projectRoot, 'Notes'));
  ensureDir(path.join(projectRoot, 'Artifacts'));

  writeFile(path.join(projectRoot, 'README.md'), projectReadmeTemplate(projectSlug, repoRoot, today, projectType));
  writeFile(path.join(projectRoot, 'Tasks.md'), tasksTemplate(projectSlug, today));
  writeFile(path.join(projectRoot, 'Decisions.md'), decisionsTemplate(projectSlug, today));

  copyRepoScaffold(repoRoot);
  if (preserveReadme) {
    writeFileIfMissing(path.join(repoRoot, 'README.md'), repoReadmeTemplate(repoName, projectSlug, projectType));
  } else {
    writeFile(path.join(repoRoot, 'README.md'), repoReadmeTemplate(repoName, projectSlug, projectType));
  }
  writeFile(path.join(repoRoot, 'scripts', 'agent-memory.js'), localRuntimeScriptTemplate());

  const rootAgentPath = path.join(repoRoot, 'AGENT.md');
  const docsPath = path.join(repoRoot, 'docs', 'vault-memory.md');
  const agentTemplate = rootAgentTemplate(vaultRoot, projectRoot, projectType);
  const currentRootAgent = fs.existsSync(rootAgentPath)
    ? fs.readFileSync(rootAgentPath, 'utf8')
    : '# Workspace Agent Guide\n';

  writeFile(rootAgentPath, upsertManagedBlock(currentRootAgent, agentTemplate));
  writeFile(docsPath, vaultMemoryDoc(vaultRoot, projectRoot, projectType));

  fs.rmSync(path.join(repoRoot, 'AGENTS.md'), { force: true });
  fs.rmSync(path.join(repoRoot, '.github', 'AGENT.md'), { force: true });
  fs.rmSync(path.join(repoRoot, '.github', 'copilot-instructions.md'), { force: true });

  const gitInitialized = ensureGitRepository(repoRoot);
  const hooksConfigured = gitInitialized ? configureHooks(repoRoot) : false;

  writeFile(
    path.join(repoRoot, 'vault.config.json'),
    JSON.stringify({
      vault_root: vaultRoot,
      project_slug: projectSlug,
      project_root: projectRoot,
      project_type: projectType,
      tasks_file: 'Tasks.md',
      decisions_file: 'Decisions.md',
      research_dir: 'Research',
      notes_dir: 'Notes',
      runtime_script: 'scripts/agent-memory.js',
      hooks_path: '.githooks',
      git_initialized: gitInitialized,
      hooks_configured: hooksConfigured,
    }, null, 2),
  );

  registerProject({
    slug: projectSlug,
    projectType,
    repoRoot,
    vaultRoot,
    vaultProjectRoot: projectRoot,
  });

  return {
    repo_root: repoRoot,
    project_slug: projectSlug,
    project_type: projectType,
    vault_project_root: projectRoot,
    git_initialized: gitInitialized,
    hooks_configured: hooksConfigured,
  };
}

export function initProject({
  projectPath,
  slug,
  vaultRoot: explicitVaultRoot,
  projectType,
}: {
  projectPath?: string;
  slug?: string;
  vaultRoot?: string;
  projectType?: string;
}) {
  const repoRoot = path.resolve(projectPath || process.cwd());
  const vaultRoot = resolveVaultRoot(explicitVaultRoot);
  const normalizedType = normalizeProjectType(projectType || DEFAULT_PROJECT_TYPE);
  const projectSlug = slug ? slugify(slug) : slugify(path.basename(repoRoot));

  return applyBootstrap({
    repoRoot,
    vaultRoot,
    projectSlug,
    projectType: normalizedType,
    preserveReadme: true,
  });
}

export function newProject({
  projectType,
  projectPath,
  slug,
  vaultRoot,
}: {
  projectType: string;
  projectPath?: string;
  slug?: string;
  vaultRoot?: string;
}) {
  return initProject({
    projectType,
    projectPath,
    slug,
    vaultRoot,
  });
}

export function syncProject({ repoRoot }: { repoRoot?: string } = {}) {
  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
  const config = readRepoConfig(resolvedRepoRoot);

  return applyBootstrap({
    repoRoot: resolvedRepoRoot,
    vaultRoot: config.vault_root,
    projectSlug: config.project_slug,
    projectType: normalizeProjectType(config.project_type),
    preserveReadme: true,
  });
}
