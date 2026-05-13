import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { resolveVaultRoot } from './config';
import { registerProject } from './projects';
import {
  ensureDir,
  writeFile,
  writeFileIfMissing,
  readIfExists,
  slugify,
  upsertManagedBlock,
  findRepoRoot,
} from './fs-utils';
import {
  projectReadmeTemplate,
  tasksTemplate,
  decisionsTemplate,
  factsTemplate,
  openQuestionsTemplate,
  handoffTemplate,
  repoReadmeTemplate,
  rootAgentTemplate,
  projectMapTemplate,
  vaultMemoryDoc,
  localRuntimeScriptTemplate,
  gitPostCommitHookTemplate,
} from './templates';
import { getTodayString } from './date';
import { DEFAULT_PROJECT_TYPE, normalizeProjectType, type ProjectType } from './project-types';
import { readRepoConfig } from './context';
import { getKitVersion, getPackageRoot } from './kit';
import { syncSeededScaffold } from './scaffold';
import {
  appendDailyLog,
  createMemoryIndexRecord,
  ensureVaultScaffold,
  updateProjectMemoryIndex,
} from './vault';

type BootstrapAction = 'init' | 'new' | 'sync' | 'update' | 'migrate';

const SCAFFOLD_MANIFEST_PATH = '.agent-bootstrap-manifest.json';
const SEEDED_REPO_PATHS = ['.codex', 'docs', 'plans'];
const BUNDLED_SKILL_DIRS = new Set(['superpowers']);
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
const CUSTOM_SKILLS_START = '<!-- agent-bootstrap:custom-skills:start -->';
const CUSTOM_SKILLS_END = '<!-- agent-bootstrap:custom-skills:end -->';
const CUSTOM_AGENTS_START = '<!-- agent-bootstrap:custom-agents:start -->';
const CUSTOM_AGENTS_END = '<!-- agent-bootstrap:custom-agents:end -->';

interface CustomSkillsSnapshot {
  tempRoot: string;
  skillNames: string[];
  customIndexBlock?: string;
}

interface CustomAgentsSnapshot {
  tempRoot: string;
  agentFiles: string[];
  customIndexBlock?: string;
}

interface BootstrapReport {
  action: BootstrapAction;
  repo_root: string;
  project_slug: string;
  project_type: ProjectType;
  vault_project_root: string;
  git_initialized: boolean;
  hooks_configured: boolean;
  kit_version: string;
}

function copyTemplateIfPresent(vaultRoot: string, projectRoot: string): void {
  const templateRoot = path.join(vaultRoot, 'Projects', '_template');
  if (fs.existsSync(templateRoot) && !fs.existsSync(projectRoot)) {
    fs.cpSync(templateRoot, projectRoot, { recursive: true });
  }
}

function removeLegacyAgentAssets(repoRoot: string): void {
  const legacyPaths = [
    '.agent',
    '.agents',
    path.join('.github', 'AGENTS.md'),
    path.join('.github', ['AGENT', 'md'].join('.')),
    path.join('.github', 'copilot-instructions.md'),
    path.join('.github', 'agents'),
    path.join('.github', 'commands'),
    path.join('.github', 'rules'),
    path.join('.github', 'skills'),
    path.join('.github', 'prompts'),
  ];

  for (const relativePath of legacyPaths) {
    fs.rmSync(path.join(repoRoot, relativePath), { recursive: true, force: true });
  }
}

function extractMarkedBlock(content: string | null | undefined, startMarker: string, endMarker: string): string | undefined {
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

function extractCustomSkillsBlock(content?: string | null): string | undefined {
  return extractMarkedBlock(content, CUSTOM_SKILLS_START, CUSTOM_SKILLS_END);
}

function extractCustomAgentsBlock(content?: string | null): string | undefined {
  return extractMarkedBlock(content, CUSTOM_AGENTS_START, CUSTOM_AGENTS_END);
}

function defaultCustomSkillsBlock(): string {
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

function defaultCustomAgentsBlock(): string {
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

function snapshotCustomSkills(repoRoot: string): CustomSkillsSnapshot {
  const skillsRoot = path.join(repoRoot, '.codex', 'skills');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-bootstrap-custom-skills-'));
  const skillNames: string[] = [];
  const customIndexBlock = extractCustomSkillsBlock(readIfExists(path.join(skillsRoot, 'INDEX.md')));

  if (!fs.existsSync(skillsRoot)) {
    return { tempRoot, skillNames, customIndexBlock };
  }

  for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (BUNDLED_SKILL_DIRS.has(entry.name) || OBSOLETE_MANAGED_SKILL_DIRS.has(entry.name)) {
      continue;
    }

    fs.cpSync(path.join(skillsRoot, entry.name), path.join(tempRoot, entry.name), { recursive: true });
    skillNames.push(entry.name);
  }

  return { tempRoot, skillNames, customIndexBlock };
}

function snapshotCustomAgents(repoRoot: string): CustomAgentsSnapshot {
  const agentsRoot = path.join(repoRoot, '.codex', 'agents');
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-bootstrap-custom-agents-'));
  const agentFiles: string[] = [];
  const customIndexBlock = extractCustomAgentsBlock(readIfExists(path.join(agentsRoot, 'INDEX.md')));

  if (!fs.existsSync(agentsRoot)) {
    return { tempRoot, agentFiles, customIndexBlock };
  }

  for (const entry of fs.readdirSync(agentsRoot, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.toml')) {
      continue;
    }

    if (CORE_AGENT_FILES.has(entry.name) || OBSOLETE_MANAGED_AGENT_FILES.has(entry.name)) {
      continue;
    }

    fs.cpSync(path.join(agentsRoot, entry.name), path.join(tempRoot, entry.name));
    agentFiles.push(entry.name);
  }

  return { tempRoot, agentFiles, customIndexBlock };
}

function mergeCustomSkillsBlock(indexPath: string, customIndexBlock?: string): void {
  const body = readIfExists(indexPath);
  if (!body) {
    return;
  }

  const block = customIndexBlock || defaultCustomSkillsBlock();
  const currentBlock = extractCustomSkillsBlock(body);
  const next = currentBlock
    ? body.replace(currentBlock, block)
    : `${body.trimEnd()}\n\n${block}\n`;

  writeFile(indexPath, next);
}

function mergeCustomAgentsBlock(indexPath: string, customIndexBlock?: string): void {
  const body = readIfExists(indexPath);
  if (!body) {
    return;
  }

  const block = customIndexBlock || defaultCustomAgentsBlock();
  const currentBlock = extractCustomAgentsBlock(body);
  const next = currentBlock
    ? body.replace(currentBlock, block)
    : `${body.trimEnd()}\n\n${block}\n`;

  writeFile(indexPath, next);
}

function restoreCustomSkills(repoRoot: string, snapshot: CustomSkillsSnapshot): void {
  const skillsRoot = path.join(repoRoot, '.codex', 'skills');
  ensureDir(skillsRoot);

  for (const skillName of snapshot.skillNames) {
    fs.cpSync(path.join(snapshot.tempRoot, skillName), path.join(skillsRoot, skillName), { recursive: true });
  }

  mergeCustomSkillsBlock(path.join(skillsRoot, 'INDEX.md'), snapshot.customIndexBlock);
}

function restoreCustomAgents(repoRoot: string, snapshot: CustomAgentsSnapshot): void {
  const agentsRoot = path.join(repoRoot, '.codex', 'agents');
  ensureDir(agentsRoot);

  for (const agentFile of snapshot.agentFiles) {
    fs.cpSync(path.join(snapshot.tempRoot, agentFile), path.join(agentsRoot, agentFile));
  }

  mergeCustomAgentsBlock(path.join(agentsRoot, 'INDEX.md'), snapshot.customIndexBlock);
}

function cleanupCustomSkillsSnapshot(snapshot: CustomSkillsSnapshot): void {
  fs.rmSync(snapshot.tempRoot, { recursive: true, force: true });
}

function cleanupCustomAgentsSnapshot(snapshot: CustomAgentsSnapshot): void {
  fs.rmSync(snapshot.tempRoot, { recursive: true, force: true });
}

function resetManagedCodexWorkspace(repoRoot: string): void {
  fs.rmSync(path.join(repoRoot, '.codex'), { recursive: true, force: true });
}

function copyRepoScaffold(repoRoot: string): void {
  const packageRoot = getPackageRoot();
  const customSkills = snapshotCustomSkills(repoRoot);
  const customAgents = snapshotCustomAgents(repoRoot);

  try {
    resetManagedCodexWorkspace(repoRoot);
    syncSeededScaffold({
      sourceRoot: packageRoot,
      targetRoot: repoRoot,
      manifestPath: path.join(repoRoot, SCAFFOLD_MANIFEST_PATH),
      seedPaths: SEEDED_REPO_PATHS,
    });
    restoreCustomAgents(repoRoot, customAgents);
    restoreCustomSkills(repoRoot, customSkills);
  } finally {
    cleanupCustomAgentsSnapshot(customAgents);
    cleanupCustomSkillsSnapshot(customSkills);
  }
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
  action: BootstrapAction;
  repoRoot: string;
  vaultRoot: string;
  projectSlug: string;
  projectType: ProjectType;
  preserveReadme: boolean;
  syncVault: boolean;
}

function applyBootstrap({
  action,
  repoRoot,
  vaultRoot,
  projectSlug,
  projectType,
  preserveReadme,
  syncVault,
}: ApplyBootstrapOptions): BootstrapReport {
  const projectRoot = path.join(vaultRoot, 'Projects', projectSlug);
  const today = getTodayString();
  const repoName = path.basename(repoRoot);
  const kitVersion = getKitVersion();
  const projectRootAlreadyExisted = fs.existsSync(projectRoot);

  ensureDir(repoRoot);
  ensureVaultScaffold(vaultRoot);
  removeLegacyAgentAssets(repoRoot);

  if (syncVault) {
    copyTemplateIfPresent(vaultRoot, projectRoot);
    ensureDir(path.join(projectRoot, 'Research'));
    ensureDir(path.join(projectRoot, 'Notes'));
    ensureDir(path.join(projectRoot, 'Artifacts'));

    const writeVaultFile = projectRootAlreadyExisted ? writeFileIfMissing : writeFile;
    writeVaultFile(path.join(projectRoot, 'README.md'), projectReadmeTemplate(projectSlug, repoRoot, today, projectType));
    writeVaultFile(path.join(projectRoot, 'Tasks.md'), tasksTemplate(projectSlug, today));
    writeVaultFile(path.join(projectRoot, 'Decisions.md'), decisionsTemplate(projectSlug, today));
    writeVaultFile(path.join(projectRoot, 'Facts.md'), factsTemplate(projectSlug, today));
    writeVaultFile(path.join(projectRoot, 'Open Questions.md'), openQuestionsTemplate(projectSlug, today));
    writeVaultFile(path.join(projectRoot, 'Handoff.md'), handoffTemplate(projectSlug, today));
  }

  copyRepoScaffold(repoRoot);
  if (preserveReadme) {
    writeFileIfMissing(path.join(repoRoot, 'README.md'), repoReadmeTemplate(repoName, projectSlug, projectType));
  } else {
    writeFile(path.join(repoRoot, 'README.md'), repoReadmeTemplate(repoName, projectSlug, projectType));
  }
  writeFile(path.join(repoRoot, 'scripts', 'agent-memory.js'), localRuntimeScriptTemplate());

  const rootAgentsPath = path.join(repoRoot, 'AGENTS.md');
  const legacyAgentFile = ['AGENT', 'md'].join('.');
  const legacyRootAgentPath = path.join(repoRoot, legacyAgentFile);
  const vaultMemoryPath = path.join(repoRoot, 'docs', 'vault-memory.md');
  const currentRootAgent = fs.existsSync(rootAgentsPath)
    ? fs.readFileSync(rootAgentsPath, 'utf8')
    : (fs.existsSync(legacyRootAgentPath) ? fs.readFileSync(legacyRootAgentPath, 'utf8') : '');

  writeFile(rootAgentsPath, upsertManagedBlock(currentRootAgent, rootAgentTemplate(vaultRoot, projectRoot, projectType)));
  writeFile(vaultMemoryPath, vaultMemoryDoc(vaultRoot, projectRoot, projectType));
  writeFile(path.join(repoRoot, 'docs', 'project-map.md'), projectMapTemplate(repoName, projectSlug, projectType));

  fs.rmSync(legacyRootAgentPath, { force: true });
  removeLegacyAgentAssets(repoRoot);

  const gitInitialized = ensureGitRepository(repoRoot);
  const hooksConfigured = gitInitialized ? configureHooks(repoRoot) : false;

  writeFile(
    path.join(repoRoot, 'vault.config.json'),
    JSON.stringify({
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
    }, null, 2),
  );

  registerProject({
    slug: projectSlug,
    projectType,
    repoRoot,
    vaultRoot,
    vaultProjectRoot: projectRoot,
  });

  appendDailyLog(
    vaultRoot,
    `Bootstrapped project \`${projectSlug}\` from repo \`${repoName}\``,
    `<!-- agent-bootstrap:bootstrap:${projectSlug}:${today} -->`,
  );
  updateProjectMemoryIndex({
    projectRoot,
    projectSlug,
    projectType,
    bucket: 'daily',
    item: createMemoryIndexRecord({
      kind: 'daily',
      title: 'Bootstrap',
      preview: `Bootstrapped project ${projectSlug} from repo ${repoName}`,
      scope: 'project',
      path: path.join(vaultRoot, 'Daily', `${today}.md`),
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
}): BootstrapReport {
  const repoRoot = path.resolve(projectPath || process.cwd());
  const vaultRoot = resolveVaultRoot(explicitVaultRoot);
  const normalizedType = normalizeProjectType(projectType || DEFAULT_PROJECT_TYPE);
  const projectSlug = slug ? slugify(slug) : slugify(path.basename(repoRoot));

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
}): BootstrapReport {
  const repoRoot = path.resolve(projectPath || process.cwd());
  const resolvedVaultRoot = resolveVaultRoot(vaultRoot);
  const normalizedType = normalizeProjectType(projectType);
  const projectSlug = slug ? slugify(slug) : slugify(path.basename(repoRoot));

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

export function syncProject({ repoRoot }: { repoRoot?: string } = {}): BootstrapReport {
  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
  const config = readRepoConfig(resolvedRepoRoot);

  return applyBootstrap({
    action: 'sync',
    repoRoot: resolvedRepoRoot,
    vaultRoot: config.vault_root,
    projectSlug: config.project_slug,
    projectType: normalizeProjectType(config.project_type),
    preserveReadme: true,
    syncVault: true,
  });
}

export function updateProject({ repoRoot }: { repoRoot?: string } = {}): BootstrapReport {
  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
  const config = readRepoConfig(resolvedRepoRoot);

  return applyBootstrap({
    action: 'update',
    repoRoot: resolvedRepoRoot,
    vaultRoot: config.vault_root,
    projectSlug: config.project_slug,
    projectType: normalizeProjectType(config.project_type),
    preserveReadme: true,
    syncVault: false,
  });
}

export function migrateProject({
  repoRoot,
  slug,
  vaultRoot,
  projectType,
}: {
  repoRoot?: string;
  slug?: string;
  vaultRoot?: string;
  projectType?: string;
} = {}): BootstrapReport {
  const resolvedRepoRoot = path.resolve(repoRoot || process.cwd());
  const configPath = path.join(resolvedRepoRoot, 'vault.config.json');

  if (fs.existsSync(configPath)) {
    const config = readRepoConfig(resolvedRepoRoot);
    return applyBootstrap({
      action: 'migrate',
      repoRoot: resolvedRepoRoot,
      vaultRoot: vaultRoot ? path.resolve(vaultRoot) : config.vault_root,
      projectSlug: slug ? slugify(slug) : config.project_slug,
      projectType: normalizeProjectType(projectType || config.project_type),
      preserveReadme: true,
      syncVault: true,
    });
  }

  const resolvedVaultRoot = resolveVaultRoot(vaultRoot);
  const normalizedType = normalizeProjectType(projectType || DEFAULT_PROJECT_TYPE);
  const projectSlug = slug ? slugify(slug) : slugify(path.basename(resolvedRepoRoot));

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
