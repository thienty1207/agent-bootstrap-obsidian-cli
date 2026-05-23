const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { runDoctor } = require('../dist/doctor');
const { syncProject, updateProject, migrateProject } = require('../dist/bootstrap');
const { PROJECT_TYPES, normalizeProjectType } = require('../dist/project-types');
const { syncSeededScaffold } = require('../dist/scaffold');

const binPath = path.join(__dirname, '..', 'bin', 'agent-bootstrap.js');
const repoRoot = path.join(__dirname, '..');
const legacyAgentFile = ['AGENT', 'md'].join('.');
const shippedSkills = [
  'frontend-design',
  'superpowers',
  'vibe-security-scan',
];
const obsoleteSkillDirs = [
  [['kar', 'pathy'].join(''), 'coding', 'principles'].join('-'),
];
const obsoleteManagedPlanFiles = [
  '2026-04-21-kit-v2-implementation-plan.md',
  '2026-04-21-kit-v3-lifecycle-plan.md',
];
const coreAgents = [
  'code-reviewer',
  'security-auditor',
  'test-engineer',
];
const obsoleteManagedAgents = [
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
];

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function copyFixtureRepo(targetRoot) {
  const trackedFiles = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(trackedFiles.status, 0, trackedFiles.stderr);

  const entries = new Set(trackedFiles.stdout.split('\0').filter(Boolean));

  for (const entry of entries) {
    const sourcePath = path.join(repoRoot, entry);
    if (!fs.existsSync(sourcePath)) {
      continue;
    }

    const targetPath = path.join(targetRoot, entry);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.cpSync(sourcePath, targetPath, { recursive: true });
  }
}

function runCli(args, options = {}) {
  const env = {
    ...process.env,
    AGENT_BOOTSTRAP_CONFIG_HOME: options.configHome,
    ...options.env,
  };

  const result = spawnSync(process.execPath, [binPath, ...args], {
    cwd: options.cwd,
    env,
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function parseJson(stdout) {
  return JSON.parse(stdout.trim());
}

function readConfigFile(configHome) {
  return JSON.parse(readFile(path.join(configHome, 'config.json')));
}

function obsoleteSkillNamePattern() {
  return new RegExp(obsoleteSkillDirs[0].split('-')[0], 'i');
}

function assertCoreSkillsPresent(repoRoot) {
  for (const skill of shippedSkills) {
    const skillPath = path.join(repoRoot, '.codex', 'skills', skill, 'SKILL.md');
    const fallbackReadme = path.join(repoRoot, '.codex', 'skills', skill, 'README.md');
    assert.equal(
      fs.existsSync(skillPath) || fs.existsSync(fallbackReadme),
      true,
      `Expected shipped skill at ${skill}`,
    );
  }

  for (const skill of obsoleteSkillDirs) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, '.codex', 'skills', skill)),
      false,
      `Expected obsolete skill to be removed: ${skill}`,
    );
  }
}

function assertAgentWorkspacePresent(repoRoot) {
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'config.toml')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'INDEX.md')), true);
  for (const agent of coreAgents) {
    assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', `${agent}.toml`)), true);
  }
  for (const agent of obsoleteManagedAgents) {
    assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', `${agent}.toml`)), false);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'commands', 'plan', 'brainstorm.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'rules')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', 'INDEX.md')), true);
  assertCoreSkillsPresent(repoRoot);
}

function assertCleanPlansWorkspace(repoRoot) {
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans', 'templates', 'feature-implementation-plan.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans', 'templates', 'bugfix-plan.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans', 'reports', 'handover-report-template.md')), true);
  for (const fileName of obsoleteManagedPlanFiles) {
    assert.equal(
      fs.existsSync(path.join(repoRoot, 'plans', fileName)),
      false,
      `Expected obsolete managed plan to be absent: ${fileName}`,
    );
  }
}

function assertActivePlanWorkspace(repoRoot, vaultProjectRoot) {
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'superpowers', 'plans', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'Plans', 'CURRENT.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'Plans', 'INDEX.md')), true);
}

function assertProductHarnessWorkspace(repoRoot, vaultProjectRoot) {
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'product', 'PRODUCT.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'product', 'HARNESS.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'product', 'HARNESS_BACKLOG.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'product', 'traces')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'stories', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'validation', 'TEST_MATRIX.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'decisions', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'PRODUCT.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'HARNESS.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'HARNESS_BACKLOG.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'Traces')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'Stories', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'Validation', 'TEST_MATRIX.md')), true);
  assert.equal(fs.existsSync(path.join(vaultProjectRoot, 'ProductHarness', 'Decisions', 'INDEX.md')), true);
}

function assertLegacyGithubAgentAssetsRemoved(repoRoot) {
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', legacyAgentFile)), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'agents')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'commands')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'rules')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'skills')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'prompts')), false);
}

function runRuntime(repoRoot, args, options = {}) {
  const runtimePath = path.join(repoRoot, 'scripts', 'agent-memory.js');
  const result = spawnSync(process.execPath, [runtimePath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...options.env,
    },
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function withConfigHome(configHome, callback) {
  const previous = process.env.AGENT_BOOTSTRAP_CONFIG_HOME;
  process.env.AGENT_BOOTSTRAP_CONFIG_HOME = configHome;

  try {
    return callback();
  } finally {
    if (previous === undefined) {
      delete process.env.AGENT_BOOTSTRAP_CONFIG_HOME;
    } else {
      process.env.AGENT_BOOTSTRAP_CONFIG_HOME = previous;
    }
  }
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test('setup initializes a portable vault skeleton on an empty path', () => {
  const root = makeTempDir('agent-bootstrap-vault-init-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'workspace');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  const result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  assert.equal(fs.existsSync(path.join(vaultRoot, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Init.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Daily')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Templates', 'Daily Note.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Projects', '_template', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Research')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Notes')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, '.obsidian', 'core-plugins.json')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, '.obsidian', 'daily-notes.json')), true);

  for (const folder of ['Archive', 'Daily', 'Inbox', 'Notes', 'Projects', 'Research', 'Templates', 'Tools']) {
    assert.equal(fs.existsSync(path.join(vaultRoot, folder, 'README.md')), true);
  }

  const init = readFile(path.join(vaultRoot, 'Init.md'));
  assert.match(init, /\[\[AGENTS\]\]/);
  assert.match(init, /\[\[Projects\/README\|Projects\]\]/);
  assert.match(init, /\[\[Daily\/README\|Daily\]\]/);
  assert.match(init, /\[\[Research\/README\|Research\]\]/);
  assert.match(init, /agent-bootstrap context/);

  const vaultAgent = readFile(path.join(vaultRoot, 'AGENTS.md'));
  assert.match(vaultAgent, /\[\[Init\]\]/);

  const dailyTemplate = readFile(path.join(vaultRoot, 'Templates', 'Daily Note.md'));
  assert.match(dailyTemplate, /\[\[Init\]\]/);

  const projectTemplate = readFile(path.join(vaultRoot, 'Projects', '_template', 'README.md'));
  assert.match(projectTemplate, /\[\[Init\]\]/);
  assert.match(projectTemplate, /\[\[Tasks\]\]/);
  assert.match(projectTemplate, /\[\[Decisions\]\]/);

  const researchTemplate = readFile(path.join(vaultRoot, 'Templates', 'Research Note.md'));
  assert.match(researchTemplate, /\[\[Init\]\]/);

  const dailySettings = JSON.parse(readFile(path.join(vaultRoot, '.obsidian', 'daily-notes.json')));
  assert.equal(dailySettings.folder, 'Daily');
  assert.equal(dailySettings.template, 'Templates/Daily Note');
});

test('setup uses the current working directory when no path is provided', () => {
  const root = makeTempDir('agent-bootstrap-vault-cwd-');
  const vaultRoot = path.join(root, 'vault-root');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(vaultRoot, { recursive: true });

  const result = runCli(['setup'], { configHome, cwd: vaultRoot });
  assert.equal(result.status, 0, result.stderr);

  const config = readConfigFile(configHome);
  assert.equal(config.vaultRoot, vaultRoot);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Projects', '_template', 'README.md')), true);
});

test('setup command is a direct alias for configuring the vault root', () => {
  const root = makeTempDir('agent-bootstrap-setup-');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');
  const workspaceRoot = path.join(root, 'workspace');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  const result = runCli(['setup', vaultRoot], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);

  const config = readConfigFile(configHome);
  assert.equal(config.vaultRoot, vaultRoot);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'AGENTS.md')), true);
});

test('--help prints the quickstart flow', () => {
  const root = makeTempDir('agent-bootstrap-help-');
  const configHome = path.join(root, 'config-home');
  const workspaceRoot = path.join(root, 'workspace');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  const result = runCli(['--help'], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npm i -g --force @kakasitink\/agent-bootstrap/);
  assert.match(result.stdout, /agent-bootstrap setup/);
  assert.match(result.stdout, /agent-bootstrap init/);
  assert.match(result.stdout, /agent-bootstrap update/);
  assert.match(result.stdout, /agent-bootstrap context/);
  assert.match(result.stdout, /agent-bootstrap recall/);
  assert.match(result.stdout, /agent-bootstrap memory status/);
  assert.match(result.stdout, /agent-bootstrap memory import-sessions/);
  assert.match(result.stdout, /agent-bootstrap plan status/);
  assert.match(result.stdout, /agent-bootstrap plan start/);
  assert.match(result.stdout, /agent-bootstrap harness status/);
  assert.match(result.stdout, /agent-bootstrap harness intake/);
  assert.match(result.stdout, /agent-bootstrap harness trace/);
  assert.match(result.stdout, /agent-bootstrap harness friction/);
  assert.match(result.stdout, /npm uninstall -g @kakasitink\/agent-bootstrap/);
});

test('global CLI rejects internal commands instead of treating them as project paths', () => {
  const root = makeTempDir('agent-bootstrap-reject-internal-');
  const configHome = path.join(root, 'config-home');
  const workspaceRoot = path.join(root, 'workspace');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  for (const command of ['doctor', 'migrate', 'sync', 'projects', 'config', 'new']) {
    const result = runCli([command], { configHome, cwd: workspaceRoot });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Public commands: setup, init, update, context, recall, memory, plan, harness/i);
  }
});

test('repo docs stay aligned with the limited public CLI surface', () => {
  const packageJson = JSON.parse(readFile(path.join(repoRoot, 'package.json')));
  const readme = readFile(path.join(repoRoot, 'README.md'));
  const agentGuide = readFile(path.join(repoRoot, 'AGENTS.md'));

  assert.equal(packageJson.version, '0.7.0');
  assert.doesNotMatch(agentGuide, /config set-vault/i);
  assert.doesNotMatch(agentGuide, /agent-bootstrap doctor/i);
  assert.doesNotMatch(agentGuide, /projects list/i);
  assert.match(agentGuide, /Coding discipline guardrails/i);
  assert.match(agentGuide, /State assumptions that affect implementation/);
  assert.match(agentGuide, /Superpowers owns planning, TDD, debugging, review, and verification/);
  assert.doesNotMatch(agentGuide, obsoleteSkillNamePattern());
  assert.match(agentGuide, /public cli surface/i);
  assert.match(readme, /Automatic Memory Recall/);
  assert.match(readme, /Automatic Active Plan State/);
  assert.match(readme, /Product Harness/);
  assert.match(readme, /Daily log/i);
  assert.match(readme, /Update an existing project's kit files/);
  assert.match(readme, /Optional: AI Context/);
  assert.match(readme, /AI agents should run it automatically from `AGENTS\.md`/);
  assert.match(readme, /agent-bootstrap recall "<query>"/);
  assert.match(readme, /agent-bootstrap memory backup/);
  assert.match(readme, /agent-bootstrap plan status/);
  assert.match(readme, /agent-bootstrap harness status/);
  assert.match(readme, /agent-bootstrap harness trace/);
  assert.match(readme, /agent-bootstrap harness friction/);
  assert.match(readme, /Trace = task này đã đi qua đường nào|Trace/i);
  assert.match(readme, /Friction = điểm nghẽn|Friction/i);
  assert.match(readme, /docs\/superpowers\/plans/);
  assert.match(readme, /semantic recall/i);
  assert.match(readme, /automatic Codex session/i);
  assert.match(readme, /Add Project-Specific Skills/);
  assert.match(readme, /Add Project-Specific Agents/);
  assert.match(readme, /\.codex\/skills\/INDEX\.md/);
  assert.match(readme, /\.codex\/agents\/INDEX\.md/);
  assert.doesNotMatch(agentGuide, /older dated files under `plans\/`/i);
  assert.doesNotMatch(readme, /lifecycle plan/i);
  assert.match(readme, /--type frontend/);
  assert.match(readme, /--type backend/);
  assert.doesNotMatch(readme, /--type web/);
  assert.doesNotMatch(readme, /--type api/);
});

test('project type labels use frontend and backend while preserving legacy aliases', () => {
  assert.deepEqual(PROJECT_TYPES, ['frontend', 'backend', 'tool', 'desktop', 'mobile', 'fullstack']);
  assert.equal(normalizeProjectType('frontend'), 'frontend');
  assert.equal(normalizeProjectType('backend'), 'backend');
  assert.equal(normalizeProjectType('web'), 'frontend');
  assert.equal(normalizeProjectType('api'), 'backend');
  assert.throws(
    () => normalizeProjectType('website'),
    /Supported types: frontend, backend, tool, desktop, mobile, fullstack/,
  );
});

test('setup stores portable config and init bootstraps current repo', () => {
  const root = makeTempDir('agent-bootstrap-cli-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo', 'Face Gen Tools');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });
  writeFile(path.join(vaultRoot, 'Projects', '_template', 'README.md'), `---\ntype: project\nstatus: active\ncreated: {{date:YYYY-MM-DD}}\nupdated: {{date:YYYY-MM-DD}}\nsource_path:\ntags:\n  - project\n---\n\n# Project Name\n\n## Source Path\n\`\`\n\n## Goal\n- What this project is trying to achieve\n`);
  writeFile(path.join(vaultRoot, 'Projects', '_template', 'Tasks.md'), `---\ntype: tasks\nproject:\nstatus: active\nupdated: {{date:YYYY-MM-DD}}\ntags:\n  - tasks\n---\n\n# Tasks\n`);
  writeFile(path.join(vaultRoot, 'Projects', '_template', 'Decisions.md'), `---\ntype: decisions\nproject:\nstatus: active\nupdated: {{date:YYYY-MM-DD}}\ntags:\n  - decisions\n---\n\n# Decisions\n`);
  writeFile(path.join(vaultRoot, 'Projects', '_template', 'Research', 'README.md'), '# Research\n');
  writeFile(path.join(vaultRoot, 'Projects', '_template', 'Notes', 'README.md'), '# Notes\n');
  writeFile(path.join(vaultRoot, 'Projects', '_template', 'Artifacts', 'README.md'), '# Artifacts\n');

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const projectRoot = path.join(vaultRoot, 'Projects', 'face-gen-tools');
  assert.ok(fs.existsSync(path.join(projectRoot, 'README.md')));
  assert.ok(fs.existsSync(path.join(projectRoot, 'Facts.md')));
  assert.ok(fs.existsSync(path.join(projectRoot, 'Open Questions.md')));
  assert.ok(fs.existsSync(path.join(projectRoot, 'Handoff.md')));
  assertActivePlanWorkspace(repoRoot, projectRoot);
  assertProductHarnessWorkspace(repoRoot, projectRoot);
  assert.ok(fs.existsSync(path.join(repoRoot, 'AGENTS.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, legacyAgentFile)), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', legacyAgentFile)), false);
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'vault-memory.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'code-standards.md')));
  assertCleanPlansWorkspace(repoRoot);
  assertAgentWorkspacePresent(repoRoot);
  assertLegacyGithubAgentAssetsRemoved(repoRoot);
  assert.equal(fs.existsSync(path.join(repoRoot, 'runtime')), false);
  assert.ok(fs.existsSync(path.join(repoRoot, 'scripts', 'agent-memory.js')));
  assert.ok(fs.existsSync(path.join(repoRoot, '.githooks', 'post-commit')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'vault.config.json')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'README.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'copilot-instructions.md')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'workflows')), false);

  const readme = readFile(path.join(projectRoot, 'README.md'));
  assert.match(readme, /face-gen-tools/);
  assert.match(readme, new RegExp(repoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(readme, /\[\[Init\]\]/);
  assert.match(readme, /\[\[Tasks\]\]/);
  assert.match(readme, /\[\[Decisions\]\]/);
  assert.match(readme, /\[\[Research\]\]/);

  const repoReadme = readFile(path.join(repoRoot, 'README.md'));
  assert.match(repoReadme, /face-gen-tools/i);
  assert.match(repoReadme, /3 core subagents/i);
  assert.match(repoReadme, /`\.codex\/agents\/code-reviewer\.toml`/i);
  assert.match(repoReadme, /`\.codex\/skills\/superpowers\/`/i);
  assert.match(repoReadme, /bundled optional domain skills/i);
  assert.match(repoReadme, /optional project-specific custom skills/i);
  assert.match(repoReadme, /Automatic Active Plan State/i);
  assert.match(repoReadme, /Product Harness/i);
  assert.match(repoReadme, /docs\/stories/i);
  assert.match(repoReadme, /agent-bootstrap plan status/i);
  assert.doesNotMatch(repoReadme, /`\.codex\/skills\/agent-api\/`/i);
  assert.match(repoReadme, /`\.codex\/skills\/frontend-design\/`/i);
  assert.match(repoReadme, /`\.codex\/skills\/vibe-security-scan\/`/i);
  assert.doesNotMatch(repoReadme, obsoleteSkillNamePattern());
  assert.doesNotMatch(repoReadme, /prompts\//i);

  const rootAgent = readFile(path.join(repoRoot, 'AGENTS.md'));
  assert.match(rootAgent, /agent-bootstrap context --compact/);
  assert.match(rootAgent, /agent-bootstrap plan status/);
  assert.match(rootAgent, /agent-bootstrap plan start/);
  assert.match(rootAgent, /agent-bootstrap harness status/);
  assert.match(rootAgent, /agent-bootstrap harness intake/);
  assert.match(rootAgent, /agent-bootstrap harness trace/);
  assert.match(rootAgent, /agent-bootstrap harness friction/);
  assert.match(rootAgent, /Product Harness is not a skill/i);
  assert.match(rootAgent, /Do not infer completion from silence/i);
  assert.match(rootAgent, /Do not ask the user whether to run it/);
  assert.match(rootAgent, /agent-bootstrap context --why/);
  assert.match(rootAgent, /agent-bootstrap context --full/);
  assert.match(rootAgent, /\.codex\/skills\/INDEX\.md/);
  assert.match(rootAgent, /\.codex\/agents\/INDEX\.md/);
  assert.match(rootAgent, /Superpowers is the workflow brain/);
  assert.match(rootAgent, /code-reviewer/);
  assert.match(rootAgent, /security-auditor/);
  assert.match(rootAgent, /test-engineer/);
  assert.match(rootAgent, /Coding discipline guardrails/);
  assert.match(rootAgent, /State assumptions that affect implementation/);
  assert.match(rootAgent, /Superpowers owns planning, TDD, debugging, review, and verification/);
  assert.doesNotMatch(rootAgent, obsoleteSkillNamePattern());
  assert.match(rootAgent, /Do not recursively scan `.codex\/skills`/);
  assert.match(rootAgent, /vault/i);

  const facts = readFile(path.join(projectRoot, 'Facts.md'));
  assert.match(facts, /- Fact:/);
  assert.match(facts, /- Source:/);
  assert.match(facts, /- Confidence: high\|medium\|low/);
  assert.match(facts, /- Last verified:/);
});

test('context reads repo and vault files from a nested directory', () => {
  const root = makeTempDir('agent-bootstrap-context-');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'deep');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });
  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['context'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repo AGENTS/);
  assert.match(result.stdout, /Repo README/);
  assert.match(result.stdout, /Agent Workspace Guide/);
  assert.match(result.stdout, /Vault AGENTS/);
  assert.match(result.stdout, /Project README/);
  assert.match(result.stdout, /Project Facts/);
  assert.match(result.stdout, /Project Open Questions/);
  assert.match(result.stdout, /Project Handoff/);
  assert.match(result.stdout, /# Tasks/);
  assert.match(result.stdout, /Codex Workspace Guide/i);
  assert.match(result.stdout, /There is no `\.codex\/rules\/` folder/i);
});

test('global context command reads repo and vault files from the current project', () => {
  const root = makeTempDir('agent-bootstrap-global-context-');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'deep');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });
  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['context'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repo AGENTS/);
  assert.match(result.stdout, /Repo README/);
  assert.match(result.stdout, /Agent Workspace Guide/);
  assert.match(result.stdout, /Vault AGENTS/);
  assert.match(result.stdout, /Project Memory Index/);
});

test('global context command falls back to repo-local context before init', () => {
  const root = makeTempDir('agent-bootstrap-source-context-');
  const repoRoot = path.join(root, 'source-repo');
  const nested = path.join(repoRoot, 'src', 'deep');
  const configHome = path.join(root, 'config-home');

  writeFile(path.join(repoRoot, 'AGENTS.md'), '# Repo Agent Guide\n\nRun compact context first.\n');
  writeFile(path.join(repoRoot, 'README.md'), '# Source Repo\n');
  writeFile(path.join(repoRoot, 'docs', 'project-map.md'), '# Project Map\n');
  writeFile(path.join(repoRoot, 'docs', 'vault-memory.md'), '# Vault Bridge\n');
  writeFile(path.join(repoRoot, '.codex', 'INDEX.md'), '# Agent Routing Index\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md'), '# Subagent Routing Index\n');
  writeFile(path.join(repoRoot, '.codex', 'README.md'), '# Agent Workspace Guide\n');
  writeFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md'), '# Skills Routing Index\n');
  fs.mkdirSync(nested, { recursive: true });

  const compact = runCli(['context'], { configHome, cwd: nested });
  assert.equal(compact.status, 0, compact.stderr);
  assert.match(compact.stdout, /Repo AGENTS/);
  assert.match(compact.stdout, /Agent Routing Index/);
  assert.match(compact.stdout, /Subagent Routing Index/);
  assert.match(compact.stdout, /Skills Routing Index/);
  assert.match(compact.stdout, /Repo README/);
  assert.match(compact.stdout, /Source Repo Context/);
  assert.doesNotMatch(compact.stdout, /Vault AGENTS/);
  assert.doesNotMatch(compact.stdout, /Project Memory Index/);

  const why = runCli(['context', '--why'], { configHome, cwd: nested });
  assert.equal(why.status, 0, why.stderr);
  assert.match(why.stdout, /Context mode: compact/);
  assert.match(why.stdout, /\.codex\/agents\/\*\* recursive agent bodies/);
  assert.match(why.stdout, /vault\.config\.json missing/);
});

test('init creates the Codex workspace and removes legacy agent workspaces', () => {
  const root = makeTempDir('agent-bootstrap-codex-init-');
  const configHome = path.join(root, 'config-home');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');

  fs.mkdirSync(configHome, { recursive: true });
  fs.mkdirSync(vaultRoot, { recursive: true });
  fs.mkdirSync(repoRoot, { recursive: true });

  writeFile(path.join(repoRoot, '.agent', 'INDEX.md'), '# Legacy agent index\n');
  writeFile(path.join(repoRoot, '.agents', 'old.md'), '# Legacy plural workspace\n');
  writeFile(path.join(repoRoot, '.github', 'agents', 'old.md'), '# Legacy GitHub agent\n');

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'fullstack'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'config.toml')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'rules')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'INDEX.md')), true);
  for (const agent of coreAgents) {
    assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', `${agent}.toml`)), true);
  }
  for (const agent of obsoleteManagedAgents) {
    assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', `${agent}.toml`)), false);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'commands', 'plan', 'brainstorm.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agents')), false);
  assertLegacyGithubAgentAssetsRemoved(repoRoot);

  const codexConfig = readFile(path.join(repoRoot, '.codex', 'config.toml'));
  assert.match(codexConfig, /\[agents\]/);
  assert.match(codexConfig, /max_threads = 6/);
  assert.match(codexConfig, /max_depth = 1/);

  const skills = fs.readdirSync(path.join(repoRoot, '.codex', 'skills'))
    .filter((entry) => fs.statSync(path.join(repoRoot, '.codex', 'skills', entry)).isDirectory())
    .sort();
  assert.deepEqual(skills, shippedSkills);
});

test('update command refreshes Codex assets while preserving project and vault memory', () => {
  const root = makeTempDir('agent-bootstrap-codex-update-');
  const configHome = path.join(root, 'config-home');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');

  fs.mkdirSync(configHome, { recursive: true });
  fs.mkdirSync(vaultRoot, { recursive: true });
  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'backend'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  writeFile(path.join(repoRoot, 'src', 'app.js'), 'console.log("keep user source");\n');
  writeFile(path.join(repoRoot, '.agent', 'INDEX.md'), '# Legacy agent index\n');
  writeFile(path.join(repoRoot, '.codex', 'INDEX.md'), '# Broken Codex index\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', 'mobile-reviewer.toml'), 'name = "mobile-reviewer"\ndescription = "Use when reviewing mobile navigation and release flows."\ndeveloper_instructions = """\nYou are a project custom mobile review agent.\n"""\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', obsoleteManagedAgents[0] + '.toml'), 'name = "obsolete"\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md'), [
    '# Custom-only old agents index',
    '',
    '<!-- agent-bootstrap:custom-agents:start -->',
    '## Custom Agents',
    '',
    '| Task shape | Agent |',
    '| --- | --- |',
    '| Mobile navigation, permissions, or release-flow review | `.codex/agents/mobile-reviewer.toml` |',
    '<!-- agent-bootstrap:custom-agents:end -->',
    '',
  ].join('\n'));
  writeFile(path.join(repoRoot, '.codex', 'skills', 'nextjs', 'SKILL.md'), '---\nname: nextjs\ndescription: Use when working on Next.js routes, React Server Components, or App Router behavior.\n---\n\n# Next.js Skill\n');
  writeFile(path.join(repoRoot, '.codex', 'skills', obsoleteSkillDirs[0], 'SKILL.md'), '# Obsolete managed skill\n');
  writeFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md'), [
    '# Custom-only old index',
    '',
    '<!-- agent-bootstrap:custom-skills:start -->',
    '## Custom Skills',
    '',
    '| Task shape | Load |',
    '| --- | --- |',
    '| Next.js routes, React Server Components, or App Router behavior | `.codex/skills/nextjs/SKILL.md` |',
    '<!-- agent-bootstrap:custom-skills:end -->',
    '',
  ].join('\n'));
  writeFile(path.join(repoRoot, '.github', 'skills', 'old.md'), '# Legacy GitHub skill\n');
  for (const fileName of obsoleteManagedPlanFiles) {
    writeFile(path.join(repoRoot, 'plans', fileName), '# Obsolete kit plan\n');
  }
  writeFile(path.join(repoRoot, 'plans', 'my-feature-plan.md'), '# User feature plan\n');
  writeFile(path.join(repoRoot, 'docs', 'stories', getTodayString(), `${getTodayString()}-custom-user-story.md`), '# Custom User Story\n\nKeep this story.\n');
  writeFile(path.join(repoRoot, 'docs', 'decisions', 'INDEX.md'), '# Product Decisions\n\n## Custom decision\nKeep this decision.\n');
  writeFile(path.join(repoRoot, 'docs', 'product', 'traces', getTodayString(), `${getTodayString()}-custom-trace.md`), '# Custom Trace\n\nKeep this trace.\n');
  writeFile(path.join(repoRoot, 'docs', 'product', 'HARNESS_BACKLOG.md'), '# Harness Backlog\n\n## Open Friction\n\n- Keep this backlog item.\n');
  const existingPlanPath = path.join(repoRoot, 'docs', 'superpowers', 'plans', getTodayString(), `${getTodayString()}-keep-user-plan.md`);
  writeFile(existingPlanPath, [
    '---',
    'type: agent-bootstrap-plan',
    'project: repo',
    'title: Keep User Plan',
    'slug: keep-user-plan',
    'status: in_progress',
    `created: ${getTodayString()}`,
    `updated: ${new Date().toISOString()}`,
    'verification: not_run',
    '---',
    '',
    '# Keep User Plan',
    '',
  ].join('\n'));
  fs.rmSync(path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'docs', 'product', 'HARNESS.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'docs', 'validation', 'TEST_MATRIX.md'), { force: true });

  const projectConfigBefore = JSON.parse(readFile(path.join(repoRoot, 'vault.config.json')));
  const projectReadmeBefore = readFile(path.join(projectConfigBefore.project_root, 'README.md'));

  result = runCli(['update', repoRoot], { configHome, cwd: root });
  assert.equal(result.status, 0, result.stderr);

  assert.equal(readFile(path.join(repoRoot, 'src', 'app.js')), 'console.log("keep user source");\n');
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'INDEX.md')), true);
  assertAgentWorkspacePresent(repoRoot);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'mobile-reviewer.toml')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', obsoleteManagedAgents[0] + '.toml')), false);
  const agentsIndexAfterUpdate = readFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md'));
  assert.match(agentsIndexAfterUpdate, /Mobile navigation, permissions, or release-flow review/);
  assert.match(agentsIndexAfterUpdate, /\.codex\/agents\/mobile-reviewer\.toml/);
  assert.match(agentsIndexAfterUpdate, /code-reviewer/);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', 'nextjs', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', 'frontend-design', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', 'vibe-security-scan', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', obsoleteSkillDirs[0])), false);
  const skillsIndexAfterUpdate = readFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md'));
  assert.match(skillsIndexAfterUpdate, /Next\.js routes, React Server Components, or App Router behavior/);
  assert.match(skillsIndexAfterUpdate, /\.codex\/skills\/nextjs\/SKILL\.md/);
  assert.match(skillsIndexAfterUpdate, /superpowers/);
  assert.match(skillsIndexAfterUpdate, /frontend-design/);
  assert.match(skillsIndexAfterUpdate, /vibe-security-scan/);
  const projectConfigAfter = JSON.parse(readFile(path.join(repoRoot, 'vault.config.json')));
  assertCleanPlansWorkspace(repoRoot);
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans', 'my-feature-plan.md')), true);
  assertActivePlanWorkspace(repoRoot, projectConfigAfter.project_root);
  assertProductHarnessWorkspace(repoRoot, projectConfigAfter.project_root);
  assert.equal(fs.existsSync(existingPlanPath), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'stories', getTodayString(), `${getTodayString()}-custom-user-story.md`)), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'product', 'traces', getTodayString(), `${getTodayString()}-custom-trace.md`)), true);
  assert.match(readFile(path.join(repoRoot, 'docs', 'decisions', 'INDEX.md')), /Custom decision/);
  assert.match(readFile(path.join(repoRoot, 'docs', 'product', 'HARNESS_BACKLOG.md')), /Keep this backlog item/);
  assert.match(readFile(path.join(repoRoot, 'docs', 'product', 'HARNESS.md')), /Product Harness/);
  assert.match(readFile(path.join(repoRoot, 'docs', 'validation', 'TEST_MATRIX.md')), /TEST_MATRIX|Test Matrix/i);
  assert.match(readFile(path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md')), /Current Plan State/);
  assertLegacyGithubAgentAssetsRemoved(repoRoot);

  assert.equal(projectConfigAfter.project_slug, projectConfigBefore.project_slug);
  assert.equal(projectConfigAfter.project_type, 'backend');
  assert.equal(readFile(path.join(projectConfigAfter.project_root, 'README.md')), projectReadmeBefore);
});

test('context modes keep compact context narrow and explain context choices', () => {
  const root = makeTempDir('agent-bootstrap-context-modes-');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'deep');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });
  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['plan', 'start', 'frontend HomePage'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'intake', 'frontend HomePage'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'trace', 'implemented frontend HomePage shell'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'friction', 'responsive proof was unclear'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);

  const compact = runCli(['context', '--compact'], { configHome, cwd: nested });
  assert.equal(compact.status, 0, compact.stderr);
  assert.match(compact.stdout, /Agent Routing Index/);
  assert.match(compact.stdout, /Skills Routing Index/);
  assert.match(compact.stdout, /Active Plan State/);
  assert.match(compact.stdout, /Active Plan/);
  assert.match(compact.stdout, /Product Harness/);
  assert.match(compact.stdout, /frontend HomePage/i);
  assert.match(compact.stdout, /frontend HomePage/i);
  assert.match(compact.stdout, /Latest Trace/i);
  assert.match(compact.stdout, /implemented frontend HomePage shell/);
  assert.match(compact.stdout, /Open friction/i);
  assert.match(compact.stdout, /Project Facts/);
  assert.doesNotMatch(compact.stdout, /Today Daily Note/);
  assert.doesNotMatch(compact.stdout, /# Test-Driven Development \(TDD\)/);
  assert.doesNotMatch(compact.stdout, /# Vercel React Best Practices/);
  assert.doesNotMatch(compact.stdout, /This skill guides creation of distinctive/);
  assert.doesNotMatch(compact.stdout, /README\.upstream\.md/);
  assert.doesNotMatch(compact.stdout, /FULL_GUIDE\.upstream\.md/);

  const defaultContext = runCli(['context'], { configHome, cwd: nested });
  assert.equal(defaultContext.status, 0, defaultContext.stderr);
  assert.equal(defaultContext.stdout, compact.stdout);

  const why = runCli(['context', '--compact', '--why'], { configHome, cwd: nested });
  assert.equal(why.status, 0, why.stderr);
  assert.match(why.stdout, /Context mode: compact/);
  assert.match(why.stdout, /Loaded:/);
  assert.match(why.stdout, /Skipped:/);
  assert.match(why.stdout, /\.codex\/skills\/\*\*/);
  assert.match(why.stdout, /Daily\/\*\*/);
  assert.match(why.stdout, /Plan history date folders/);
  assert.match(why.stdout, /Story history date folders/);
  assert.match(why.stdout, /Trace and friction history/);

  const full = runCli(['context', '--full'], { configHome, cwd: nested });
  assert.equal(full.status, 0, full.stderr);
  assert.match(full.stdout, /Today Daily Note/);
  assert.match(full.stdout, /Recent Plan/);
  assert.match(full.stdout, /Recent Story/);
  assert.match(full.stdout, /Recent Harness Trace/);
  assert.ok(full.stdout.length > compact.stdout.length);
});

test('daily note log entries stay inside the Agent Log section', () => {
  const root = makeTempDir('agent-bootstrap-daily-layout-');
  const repoRoot = path.join(root, 'repo');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');
  const dailyPath = path.join(vaultRoot, 'Daily', `${getTodayString()}.md`);

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const daily = readFile(dailyPath);
  const agentLogIndex = daily.indexOf('## Agent Log');
  const winsIndex = daily.indexOf('## Wins');
  const bootstrapIndex = daily.indexOf('Bootstrapped project');

  assert.notEqual(agentLogIndex, -1);
  assert.notEqual(winsIndex, -1);
  assert.notEqual(bootstrapIndex, -1);
  assert.ok(agentLogIndex < bootstrapIndex, 'expected log entry after Agent Log heading');
  assert.ok(bootstrapIndex < winsIndex, 'expected log entry before Wins section');
});

test('memory task appends to project tasks from nested repo path', () => {
  const root = makeTempDir('agent-bootstrap-memory-');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'internal');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });
  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['task', 'Append from repo-local runtime'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);

  const tasks = readFile(path.join(vaultRoot, 'Projects', 'repo', 'Tasks.md'));
  assert.match(tasks, /Append from repo-local runtime/);
});

test('rerunning init preserves existing vault project memory files', () => {
  const root = makeTempDir('agent-bootstrap-preserve-vault-memory-');
  const repoRoot = path.join(root, 'repo');
  const vaultRoot = path.join(root, 'vault');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const projectRoot = path.join(vaultRoot, 'Projects', 'repo');
  writeFile(path.join(projectRoot, 'README.md'), '# Project README\n\nKeep project overview.\n');
  writeFile(path.join(projectRoot, 'Tasks.md'), '# Tasks\n\n- [ ] Keep this task\n');
  writeFile(path.join(projectRoot, 'Decisions.md'), '# Decisions\n\n## Keep this decision\n');
  writeFile(path.join(projectRoot, 'Facts.md'), '# Facts\n\n## Keep\n- Durable fact\n');
  writeFile(path.join(projectRoot, 'Open Questions.md'), '# Open Questions\n\n- [ ] Keep question\n');
  writeFile(path.join(projectRoot, 'Handoff.md'), '# Handoff\n\nKeep handoff.\n');

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  assert.match(readFile(path.join(projectRoot, 'README.md')), /Keep project overview/);
  assert.match(readFile(path.join(projectRoot, 'Tasks.md')), /Keep this task/);
  assert.match(readFile(path.join(projectRoot, 'Decisions.md')), /Keep this decision/);
  assert.match(readFile(path.join(projectRoot, 'Facts.md')), /Durable fact/);
  assert.match(readFile(path.join(projectRoot, 'Open Questions.md')), /Keep question/);
  assert.match(readFile(path.join(projectRoot, 'Handoff.md')), /Keep handoff/);
});

test('init fails clearly when no vault root is configured', () => {
  const root = makeTempDir('agent-bootstrap-no-config-');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');
  fs.mkdirSync(repoRoot, { recursive: true });

  const result = runCli([], { configHome, cwd: repoRoot });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /No vault root configured/i);
});

test('bootstrap preserves an existing root README while adding bridge files', () => {
  const root = makeTempDir('agent-bootstrap-existing-readme-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });
  writeFile(path.join(repoRoot, 'README.md'), '# Custom README\n\nKeep this content.\n');

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const readme = readFile(path.join(repoRoot, 'README.md'));
  assert.match(readme, /Keep this content\./);
  assert.doesNotMatch(readme, /VS Code friendly agent workspace layout/i);
  for (const agent of coreAgents) {
    assert.ok(fs.existsSync(path.join(repoRoot, '.codex', 'agents', `${agent}.toml`)));
  }
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', legacyAgentFile)), false);
  assertLegacyGithubAgentAssetsRemoved(repoRoot);
});

test('generated repo docs explain ownership boundaries and the safe repair path', () => {
  const root = makeTempDir('agent-bootstrap-owned-assets-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const agentGuide = readFile(path.join(repoRoot, 'AGENTS.md'));
  const readme = readFile(path.join(repoRoot, 'README.md'));

  assert.match(agentGuide, /managed by agent-bootstrap/i);
  assert.match(agentGuide, /outside the managed block/i);
  assert.equal(agentGuide.split('# Workspace Agent Guide').length - 1, 1);
  assert.match(readme, /agent-bootstrap update/i);
  assert.match(readme, /README\.md.*user-owned and preserved if it already exists/i);
});

test('post-commit hook writes a durable worklog note into the vault', () => {
  const root = makeTempDir('agent-bootstrap-hook-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  let git = spawnSync('git', ['config', 'user.name', 'Agent Bootstrap'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.email', 'agent@example.com'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  writeFile(path.join(repoRoot, 'app.txt'), 'hello\n');

  git = spawnSync('git', ['add', '.'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['commit', '-m', 'Initial agent sync'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  const notesRoot = path.join(vaultRoot, 'Projects', 'repo', 'Notes');
  const notes = fs.readdirSync(notesRoot).filter((file) => file.endsWith('.md'));
  const worklog = notes.find((file) => /Commit/i.test(file) || /initial-agent-sync/i.test(file));
  assert.ok(worklog, `Expected a commit worklog note in ${notesRoot}, got: ${notes.join(', ')}`);

  const noteBody = readFile(path.join(notesRoot, worklog));
  assert.match(noteBody, /Initial agent sync/);
  assert.match(noteBody, /git post-commit hook/i);
});

test('init bootstraps a typed project and registers it', () => {
  const root = makeTempDir('agent-bootstrap-new-');
  const vaultRoot = path.join(root, 'vault');
  const workspaceRoot = path.join(root, 'workspace');
  const configHome = path.join(root, 'config-home');
  const repoRoot = path.join(workspaceRoot, 'shop-frontend');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'frontend'], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);

  const repoConfig = JSON.parse(readFile(path.join(repoRoot, 'vault.config.json')));
  assert.equal(repoConfig.project_type, 'frontend');

  const rootAgent = readFile(path.join(repoRoot, 'AGENTS.md'));
  assert.match(rootAgent, /Project type: frontend/i);

  const projects = JSON.parse(readFile(path.join(configHome, 'projects.json')));
  assert.equal(projects.length, 1);
  assert.equal(projects[0].projectType, 'frontend');
  assert.equal(projects[0].repoRoot, repoRoot);
});

test('doctor internal report is healthy and sync helper restores generated files', () => {
  const root = makeTempDir('agent-bootstrap-doctor-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'tool'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const doctor = withConfigHome(configHome, () => runDoctor({ repoRoot }));
  assert.equal(doctor.ok, true);
  assert.equal(doctor.repo.projectType, 'tool');
  assert.equal(doctor.checks.vaultConfig, true);
  assert.equal(doctor.checks.agentFile, true);
  assert.equal(doctor.checks.agentWorkspace, true);
  assert.equal(doctor.checks.docs, true);
  assert.equal(doctor.checks.plans, true);

  const deletedPath = path.join(repoRoot, 'docs', 'system-architecture.md');
  fs.rmSync(deletedPath, { force: true });
  assert.equal(fs.existsSync(deletedPath), false);

  const syncReport = withConfigHome(configHome, () => syncProject({ repoRoot }));
  assert.equal(syncReport.action, 'sync');
  assert.equal(fs.existsSync(deletedPath), true);
});

test('typed bootstrap seeds kit metadata and a type-aware project map', () => {
  const root = makeTempDir('agent-bootstrap-project-map-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'frontend'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const repoConfig = JSON.parse(readFile(path.join(repoRoot, 'vault.config.json')));
  assert.equal(typeof repoConfig.kit_version, 'string');
  assert.match(repoConfig.kit_version, /^\d+\.\d+\.\d+/);

  const projectMap = readFile(path.join(repoRoot, 'docs', 'project-map.md'));
  assert.match(projectMap, /Project map/i);
  assert.match(projectMap, /routes/i);
  assert.match(projectMap, /deployment/i);
});

test('update helper restores repo-local managed assets without clobbering a custom README', () => {
  const root = makeTempDir('agent-bootstrap-update-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'tool'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  writeFile(path.join(repoRoot, 'README.md'), '# Custom README\n\nKeep my repo intro.\n');
  fs.rmSync(path.join(repoRoot, '.codex', 'agents', 'code-reviewer.toml'), { force: true });
  fs.rmSync(path.join(repoRoot, 'scripts', 'agent-memory.js'), { force: true });
  writeFile(path.join(repoRoot, '.github', 'prompts', 'legacy-prompt.md'), '# Legacy prompt\n');

  const updateReport = withConfigHome(configHome, () => updateProject({ repoRoot }));
  assert.equal(updateReport.action, 'update');
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'code-reviewer.toml')), true);
  assertAgentWorkspacePresent(repoRoot);
  assert.equal(fs.existsSync(path.join(repoRoot, 'scripts', 'agent-memory.js')), true);
  assertLegacyGithubAgentAssetsRemoved(repoRoot);
  assert.match(readFile(path.join(repoRoot, 'README.md')), /Keep my repo intro\./);
});

test('migrate helper upgrades a legacy repo into the single-root-AGENTS kit layout', () => {
  const root = makeTempDir('agent-bootstrap-migrate-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'legacy-repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(path.join(repoRoot, '.github'), { recursive: true });
  writeFile(path.join(repoRoot, 'README.md'), '# Legacy README\n\nDo not overwrite this.\n');
  writeFile(path.join(repoRoot, legacyAgentFile), '# Legacy root agent guide\n\nKeep this note.\n');
  writeFile(path.join(repoRoot, '.github', legacyAgentFile), '# Legacy github agent guide\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', 'mobile-reviewer.toml'), 'name = "mobile-reviewer"\ndescription = "Use when reviewing mobile navigation and release flows."\ndeveloper_instructions = """\nYou are a project custom mobile review agent.\n"""\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', obsoleteManagedAgents[1] + '.toml'), 'name = "obsolete"\n');
  writeFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md'), [
    '# Legacy Agents Index',
    '',
    '<!-- agent-bootstrap:custom-agents:start -->',
    '## Custom Agents',
    '',
    '| Task shape | Agent |',
    '| --- | --- |',
    '| Mobile navigation, permissions, or release-flow review | `.codex/agents/mobile-reviewer.toml` |',
    '<!-- agent-bootstrap:custom-agents:end -->',
    '',
  ].join('\n'));
  writeFile(path.join(repoRoot, '.codex', 'skills', 'rust', 'SKILL.md'), '---\nname: rust\ndescription: Use when working on Rust services, Cargo workflows, or ownership-sensitive refactors.\n---\n\n# Rust Skill\n');
  writeFile(path.join(repoRoot, '.codex', 'skills', obsoleteSkillDirs[0], 'SKILL.md'), '# Obsolete managed skill\n');
  writeFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md'), [
    '# Legacy Skills Index',
    '',
    '<!-- agent-bootstrap:custom-skills:start -->',
    '## Custom Skills',
    '',
    '| Task shape | Load |',
    '| --- | --- |',
    '| Rust services, Cargo workflows, or ownership-sensitive refactors | `.codex/skills/rust/SKILL.md` |',
    '<!-- agent-bootstrap:custom-skills:end -->',
    '',
  ].join('\n'));
  for (const fileName of obsoleteManagedPlanFiles) {
    writeFile(path.join(repoRoot, 'plans', fileName), '# Obsolete kit plan\n');
  }
  writeFile(path.join(repoRoot, 'plans', 'legacy-user-plan.md'), '# Keep user plan\n');

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const migrateReport = withConfigHome(configHome, () => migrateProject({
    repoRoot,
    projectType: 'backend',
  }));
  assert.equal(migrateReport.action, 'migrate');
  assert.equal(fs.existsSync(path.join(repoRoot, 'vault.config.json')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, legacyAgentFile)), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', legacyAgentFile)), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'mobile-reviewer.toml')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', obsoleteManagedAgents[1] + '.toml')), false);
  assert.match(readFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md')), /Mobile navigation, permissions/);
  for (const agent of coreAgents) {
    assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', `${agent}.toml`)), true);
  }
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', 'rust', 'SKILL.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'skills', obsoleteSkillDirs[0])), false);
  assert.match(readFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md')), /Rust services, Cargo workflows/);
  assertCleanPlansWorkspace(repoRoot);
  assert.equal(fs.existsSync(path.join(repoRoot, 'plans', 'legacy-user-plan.md')), true);
  assert.match(readFile(path.join(repoRoot, 'AGENTS.md')), /Keep this note\./);
  assert.match(readFile(path.join(repoRoot, 'AGENTS.md')), /Project type: backend/);
  assert.match(readFile(path.join(repoRoot, 'README.md')), /Do not overwrite this\./);
});

test('doctor internal report suggests update for repairable drift', () => {
  const root = makeTempDir('agent-bootstrap-doctor-actionable-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'desktop'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  fs.rmSync(path.join(repoRoot, '.codex', 'agents', 'code-reviewer.toml'), { force: true });
  fs.rmSync(path.join(repoRoot, 'docs', 'project-map.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'scripts', 'agent-memory.js'), { force: true });

  const doctor = withConfigHome(configHome, () => runDoctor({ repoRoot }));
  assert.equal(doctor.ok, false);
  assert.equal(doctor.checks.runtimeScript, false);
  assert.equal(doctor.checks.projectMap, false);
  assert.match(doctor.repo.kitVersion, /^\d+\.\d+\.\d+/);
  assert.ok(doctor.missing.repoPaths.includes('.codex/agents/code-reviewer.toml'));
  assert.ok(doctor.missing.repoPaths.includes('docs/project-map.md'));
  assert.ok(doctor.missing.repoPaths.includes('scripts/agent-memory.js'));
  assert.ok(doctor.suggestedCommands.includes('agent-bootstrap update'));
});

test('bootstrap and repo-local runtime auto-create daily note and route research to global or project scope', () => {
  const root = makeTempDir('agent-bootstrap-auto-memory-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');
  const today = getTodayString();

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const dailyPath = path.join(vaultRoot, 'Daily', `${today}.md`);
  assert.equal(fs.existsSync(dailyPath), true);
  assert.match(readFile(dailyPath), /repo/i);

  const runtimePath = path.join(repoRoot, 'scripts', 'agent-memory.js');

  let runtime = spawnSync(process.execPath, [
    runtimePath,
    'research',
    'Reusable auth pattern shared across projects and future repos',
    '--title',
    'Auth pattern playbook',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(runtime.status, 0, runtime.stderr);

  const globalResearchPath = path.join(vaultRoot, 'Research', `${today} Auth pattern playbook.md`);
  assert.equal(fs.existsSync(globalResearchPath), true);

  runtime = spawnSync(process.execPath, [
    runtimePath,
    'research',
    'Checkout edge cases specific to this repo checkout flow',
    '--title',
    'Checkout flow notes',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(runtime.status, 0, runtime.stderr);

  const projectResearchPath = path.join(vaultRoot, 'Projects', 'repo', 'Research', `${today} Checkout flow notes.md`);
  assert.equal(fs.existsSync(projectResearchPath), true);

  const daily = readFile(dailyPath);
  assert.match(daily, /Auth pattern playbook/);
  assert.match(daily, /Checkout flow notes/);
});

test('auto routing prefers strong project signals over a single reusable keyword', () => {
  const root = makeTempDir('agent-bootstrap-routing-score-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'checkout-engine');
  const configHome = path.join(root, 'config-home');
  const today = getTodayString();

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const runtimePath = path.join(repoRoot, 'scripts', 'agent-memory.js');
  const runtime = spawnSync(process.execPath, [
    runtimePath,
    'research',
    'Reusable input validation notes for this repo checkout-engine payment flow and src/checkout module',
    '--title',
    'Reusable checkout validation',
  ], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  assert.equal(runtime.status, 0, runtime.stderr);

  const projectPath = path.join(vaultRoot, 'Projects', 'checkout-engine', 'Research', `${today} Reusable checkout validation.md`);
  const globalPath = path.join(vaultRoot, 'Research', `${today} Reusable checkout validation.md`);

  assert.equal(fs.existsSync(projectPath), true);
  assert.equal(fs.existsSync(globalPath), false);

  const body = readFile(projectPath);
  assert.match(body, /scope_reason:/);
  assert.match(body, /project/i);
});

test('memory writes build a project memory index and context includes it', () => {
  const root = makeTempDir('agent-bootstrap-memory-index-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['decision', 'Use a single runtime bridge', '--title', 'Runtime bridge']);
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['research', 'Shared routing strategy for future projects', '--title', 'Routing strategy']);
  assert.equal(result.status, 0, result.stderr);

  const indexPath = path.join(vaultRoot, 'Projects', 'repo', 'Artifacts', 'memory-index.json');
  assert.equal(fs.existsSync(indexPath), true);

  const index = JSON.parse(readFile(indexPath));
  assert.equal(index.project.slug, 'repo');
  assert.equal(index.recent.decisions[0].title, 'Runtime bridge');
  assert.equal(index.recent.research[0].title, 'Routing strategy');

  result = runRuntime(repoRoot, ['context']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Project Memory Index/);
  assert.match(result.stdout, /Runtime bridge/);
  assert.match(result.stdout, /Routing strategy/);
});

test('recall searches durable project memory and handles empty results', () => {
  const root = makeTempDir('agent-bootstrap-recall-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['decision', 'Use Supabase RLS policies for tenant isolation.', '--title', 'Tenant security']);
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['fact', 'Billing exports live under src/billing/export.ts.', '--title', 'Billing export path', '--source', 'repo files']);
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['recall', 'tenant isolation', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Recall Results/);
  assert.match(result.stdout, /One Thing/);
  assert.match(result.stdout, /Tenant security/);
  assert.match(result.stdout, /Supabase RLS policies/);
  assert.match(result.stdout, /Decisions\.md/);

  const empty = runCli(['recall', 'nonexistent-zebra-query', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(empty.status, 0, empty.stderr);
  assert.match(empty.stdout, /No recall results/);
  assert.match(empty.stdout, /Indexed markdown memory docs:/);
  assert.match(empty.stdout, /Try a narrower query/i);
});

test('plan commands track active implementation state and mirror it to the vault', () => {
  const root = makeTempDir('agent-bootstrap-plan-state-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'ui');
  const configHome = path.join(root, 'config-home');
  const today = getTodayString();

  fs.mkdirSync(nested, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['plan', 'status', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  let status = parseJson(result.stdout);
  assert.equal(status.ok, true);
  assert.equal(status.current, null);
  assert.equal(status.counts.total, 0);
  assertActivePlanWorkspace(repoRoot, path.join(vaultRoot, 'Projects', 'repo'));

  result = runCli(['plan', 'start', 'frontend HomePage', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const started = parseJson(result.stdout);
  assert.equal(started.action, 'started');
  assert.equal(started.status, 'in_progress');
  assert.match(started.planPath, new RegExp(`docs[\\\\/]superpowers[\\\\/]plans[\\\\/]${today}[\\\\/]${today}-frontend-homepage\\.md$`));
  assert.equal(fs.existsSync(started.planPath), true);
  assert.equal(fs.existsSync(started.vaultPlanPath), true);

  let planBody = readFile(started.planPath);
  assert.match(planBody, /type: agent-bootstrap-plan/);
  assert.match(planBody, /status: in_progress/);
  assert.match(planBody, /verification: not_run/);
  assert.match(planBody, /# .*frontend HomePage/i);

  const currentPath = path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md');
  const currentBody = readFile(currentPath);
  assert.match(currentBody, /Current Plan State/);
  assert.match(currentBody, /frontend HomePage/);
  assert.match(currentBody, /Do not mark completed without verification evidence/);
  assert.match(readFile(path.join(vaultRoot, 'Projects', 'repo', 'Plans', 'CURRENT.md')), /frontend HomePage/);

  result = runCli(['plan', 'start', 'frontend HomePage', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const resumed = parseJson(result.stdout);
  assert.equal(resumed.action, 'resumed');
  assert.equal(resumed.planPath, started.planPath);
  const dailyFiles = fs.readdirSync(path.join(repoRoot, 'docs', 'superpowers', 'plans', today)).filter((file) => file.endsWith('.md'));
  assert.deepEqual(dailyFiles, [`${today}-frontend-homepage.md`]);

  result = runCli(['plan', 'update', 'Implemented desktop shell; mobile responsive verification remains.', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const updated = parseJson(result.stdout);
  assert.equal(updated.status, 'in_progress');
  planBody = readFile(started.planPath);
  assert.match(planBody, /Implemented desktop shell/);
  assert.match(planBody, /mobile responsive verification remains/);

  result = runCli(['recall', 'homepage responsive', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /frontend HomePage/i);
  assert.match(result.stdout, /\[plan\]/);

  result = runCli(['plan', 'interrupt', 'Stopped before mobile screenshot verification. Next action: test responsive footer.', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const interrupted = parseJson(result.stdout);
  assert.equal(interrupted.status, 'interrupted');
  assert.match(readFile(currentPath), /Interrupted Or Needs Correction/);
  assert.match(readFile(currentPath), /test responsive footer/);

  result = runCli(['plan', 'complete'], { configHome, cwd: nested });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /verification summary/i);

  result = runCli(['plan', 'complete', 'npm test passed and mobile screenshot verified', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const completed = parseJson(result.stdout);
  assert.equal(completed.status, 'completed');
  planBody = readFile(started.planPath);
  assert.match(planBody, /status: completed/);
  assert.match(planBody, /verification: passed/);
  assert.match(planBody, /npm test passed/);
  assert.match(readFile(currentPath), /Completed Today/);
  assert.match(readFile(path.join(vaultRoot, 'Projects', 'repo', 'Plans', today, `${today}-frontend-homepage.md`)), /status: completed/);
});

test('harness commands classify feature risk, track proof, and mirror stories to the vault', () => {
  const root = makeTempDir('agent-bootstrap-product-harness-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'internal', 'auth');
  const configHome = path.join(root, 'config-home');
  const today = getTodayString();

  fs.mkdirSync(nested, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['harness', 'status', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  let status = parseJson(result.stdout);
  assert.equal(status.ok, true);
  assert.equal(status.currentStory, null);
  assert.equal(status.counts.stories, 0);
  assertProductHarnessWorkspace(repoRoot, path.join(vaultRoot, 'Projects', 'repo'));

  result = runCli(['harness', 'intake', 'backend login with Gin', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const intake = parseJson(result.stdout);
  assert.equal(intake.action, 'started');
  assert.equal(intake.risk, 'high');
  assert.equal(intake.inputType, 'change_request');
  assert.deepEqual(intake.riskFlags, ['auth']);
  assert.match(intake.storyPath, new RegExp(`docs[\\\\/]stories[\\\\/]${today}[\\\\/]${today}-backend-login-with-gin[\\\\/]overview\\.md$`));
  assert.match(intake.storyRoot, new RegExp(`docs[\\\\/]stories[\\\\/]${today}[\\\\/]${today}-backend-login-with-gin$`));
  assert.equal(fs.existsSync(intake.storyPath), true);
  assert.equal(fs.existsSync(path.join(intake.storyRoot, 'design.md')), true);
  assert.equal(fs.existsSync(path.join(intake.storyRoot, 'validation.md')), true);
  assert.equal(fs.existsSync(path.join(intake.storyRoot, 'execplan.md')), true);
  assert.equal(fs.existsSync(intake.vaultStoryPath), true);

  const storyBody = readFile(intake.storyPath);
  assert.match(storyBody, /type: agent-bootstrap-story-packet/);
  assert.match(storyBody, /risk: high/);
  assert.match(storyBody, /input_type: change_request/);
  assert.match(storyBody, /risk_flags: auth/);
  assert.match(storyBody, /Backend Login With Gin|backend login with Gin/i);
  assert.match(storyBody, /## Current Behavior/);
  assert.match(readFile(path.join(intake.storyRoot, 'execplan.md')), /## Stop Conditions/);
  assert.match(readFile(path.join(intake.storyRoot, 'validation.md')), /auth\/security proof/i);
  assert.match(storyBody, /auth\/security proof/i);
  assert.match(storyBody, /wrong password/i);
  assert.match(readFile(path.join(vaultRoot, 'Projects', 'repo', 'ProductHarness', 'Stories', today, `${today}-backend-login-with-gin`, 'overview.md')), /risk: high/);
  let matrixBody = readFile(path.join(repoRoot, 'docs', 'validation', 'TEST_MATRIX.md'));
  assert.match(matrixBody, /backend login with Gin/);
  assert.match(matrixBody, /\| backend login with Gin \| high \| no \| no \| no \| no \| planned \| none \|/);

  result = runCli(['harness', 'intake', 'backend login with Gin', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const resumed = parseJson(result.stdout);
  assert.equal(resumed.action, 'resumed');
  assert.equal(resumed.storyPath, intake.storyPath);
  const dailyEntries = fs.readdirSync(path.join(repoRoot, 'docs', 'stories', today));
  assert.deepEqual(dailyEntries, [`${today}-backend-login-with-gin`]);

  result = runCli(['harness', 'proof', 'go test ./... passed for auth handlers', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const proof = parseJson(result.stdout);
  assert.equal(proof.action, 'proof-recorded');
  assert.equal(proof.status, 'proof_added');
  assert.match(readFile(intake.storyPath), /go test \.\/\.\.\. passed for auth handlers/);
  assert.match(readFile(path.join(intake.storyRoot, 'validation.md')), /go test \.\/\.\.\. passed for auth handlers/);
  assert.match(readFile(path.join(vaultRoot, 'Projects', 'repo', 'ProductHarness', 'Stories', today, `${today}-backend-login-with-gin`, 'overview.md')), /proof_added/);
  matrixBody = readFile(path.join(repoRoot, 'docs', 'validation', 'TEST_MATRIX.md'));
  assert.match(matrixBody, /\| backend login with Gin \| high \| yes \| no \| no \| no \| implemented \| go test \.\/\.\.\. passed for auth handlers \|/);

  result = runCli(['harness', 'trace', 'implemented backend login with proof', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const trace = parseJson(result.stdout);
  assert.equal(trace.action, 'trace-recorded');
  assert.equal(trace.outcome, 'completed');
  assert.match(trace.tracePath, new RegExp(`docs[\\\\/]product[\\\\/]traces[\\\\/]${today}[\\\\/]`));
  assert.equal(fs.existsSync(trace.tracePath), true);
  assert.equal(fs.existsSync(trace.vaultTracePath), true);
  assert.match(readFile(trace.tracePath), /implemented backend login with proof/);
  assert.match(readFile(trace.tracePath), /backend login with Gin/);

  result = runCli(['harness', 'friction', 'validation command was unclear', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const friction = parseJson(result.stdout);
  assert.equal(friction.action, 'friction-recorded');
  assert.equal(friction.status, 'proposed');
  assert.match(readFile(friction.backlogPath), /validation command was unclear/);
  assert.match(readFile(friction.vaultBacklogPath), /validation command was unclear/);

  result = runCli(['recall', 'Gin login proof', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /backend login with Gin/i);
  assert.match(result.stdout, /\[harness-story\]/);
  assert.match(result.stdout, /implemented backend login with proof/);

  result = runCli(['harness', 'decision', 'Use bcrypt password verification and short-lived JWT.', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const decision = parseJson(result.stdout);
  assert.equal(decision.action, 'decision-recorded');
  assert.match(readFile(path.join(repoRoot, 'docs', 'decisions', 'INDEX.md')), /Use bcrypt password verification/);
  assert.match(readFile(path.join(vaultRoot, 'Projects', 'repo', 'ProductHarness', 'Decisions', 'INDEX.md')), /Use bcrypt password verification/);

  result = runCli(['harness', 'intake', 'docs copy polish', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const lowRisk = parseJson(result.stdout);
  assert.equal(lowRisk.risk, 'low');
  assert.equal(lowRisk.inputType, 'change_request');
  assert.deepEqual(lowRisk.riskFlags, []);
  assert.match(lowRisk.storyPath, new RegExp(`docs[\\\\/]stories[\\\\/]${today}[\\\\/]${today}-docs-copy-polish\\.md$`));
  assert.doesNotMatch(readFile(lowRisk.storyPath), /auth\/security proof/i);
  assert.equal(fs.existsSync(path.join(path.dirname(lowRisk.storyPath), `${today}-docs-copy-polish`, 'overview.md')), false);

  result = runCli(['harness', 'intake', 'database migration deletes old invoices', repoRoot], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const migrationRisk = parseJson(result.stdout);
  assert.equal(migrationRisk.risk, 'high');
  assert.ok(migrationRisk.riskFlags.includes('data_model'));
});

test('compact context auto-refreshes recall index and includes bounded auto recall', () => {
  const root = makeTempDir('agent-bootstrap-auto-recall-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['decision', 'Keep recall context bounded to five entries.', '--title', 'Bounded recall']);
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['harness', 'intake', 'backend login with Gin', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'trace', 'partial backend login implementation', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'friction', 'auth integration proof is unclear', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['context', '--compact'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Auto Recall/);
  assert.match(result.stdout, /Product Harness/);
  assert.match(result.stdout, /backend login with Gin/i);
  assert.match(result.stdout, /Proof gaps/i);
  assert.match(result.stdout, /Bounded recall/);
  assert.doesNotMatch(result.stdout, /===== Today Daily Note =====/);
  assert.doesNotMatch(result.stdout, /===== Recent Story =====/);

  const recallIndexPath = path.join(vaultRoot, 'Projects', 'repo', 'Artifacts', 'recall-index.json');
  assert.equal(fs.existsSync(recallIndexPath), true);
  const recallIndex = JSON.parse(readFile(recallIndexPath));
  assert.ok(recallIndex.documents.length > 0);

  const why = runCli(['context', '--compact', '--why'], { configHome, cwd: repoRoot });
  assert.equal(why.status, 0, why.stderr);
  assert.match(why.stdout, /Recall index/);
  assert.match(why.stdout, /full recall memory bodies/i);
  assert.match(why.stdout, /Story history date folders/i);

  const full = runCli(['context', '--full'], { configHome, cwd: repoRoot });
  assert.equal(full.status, 0, full.stderr);
  assert.match(full.stdout, /===== Recent Story =====/);
});

test('context compact automatically imports matching Codex sessions with redaction and dedupe', () => {
  const root = makeTempDir('agent-bootstrap-session-import-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');
  const codexSessionsRoot = path.join(root, 'codex-sessions');
  const sessionFile = path.join(codexSessionsRoot, 'session-001.jsonl');

  fs.mkdirSync(repoRoot, { recursive: true });
  writeFile(sessionFile, [
    JSON.stringify({ type: 'session_meta', cwd: repoRoot, project_slug: 'repo' }),
    JSON.stringify({ role: 'system', content: 'SYSTEM_PROMPT_SHOULD_NOT_IMPORT' }),
    JSON.stringify({ role: 'user', content: 'Please remember tenant security for this repo. Token sk-test1234567890abcdef should be hidden.' }),
    JSON.stringify({ role: 'assistant', content: 'Decision: Use Supabase RLS policies for tenant isolation.' }),
    JSON.stringify({ role: 'tool', type: 'tool_call', content: 'TOOL_NOISE_SHOULD_NOT_IMPORT' }),
    JSON.stringify({ type: 'session_meta', cwd: path.join(root, 'other-repo'), project_slug: 'other' }),
    JSON.stringify({ role: 'assistant', content: 'Decision: This unmatched repo session must not import.' }),
  ].join('\n'));

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['context', '--compact', '--why'], {
    configHome,
    cwd: repoRoot,
    env: { AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT: codexSessionsRoot },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Session Import/);
  assert.match(result.stdout, /imported: 1/i);

  const importedRoot = path.join(vaultRoot, 'Projects', 'repo', 'Sessions', 'Imported');
  const importedFiles = fs.readdirSync(importedRoot).filter((file) => file.endsWith('.md'));
  assert.equal(importedFiles.length, 1);
  const importedBody = readFile(path.join(importedRoot, importedFiles[0]));
  assert.match(importedBody, /Please remember tenant security/);
  assert.match(importedBody, /Use Supabase RLS policies/);
  assert.match(importedBody, /\[REDACTED_SECRET\]/);
  assert.doesNotMatch(importedBody, /sk-test1234567890abcdef/);
  assert.doesNotMatch(importedBody, /SYSTEM_PROMPT_SHOULD_NOT_IMPORT/);
  assert.doesNotMatch(importedBody, /TOOL_NOISE_SHOULD_NOT_IMPORT/);
  assert.doesNotMatch(importedBody, /unmatched repo session/);

  result = runCli(['context', '--compact'], {
    configHome,
    cwd: repoRoot,
    env: { AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT: codexSessionsRoot },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /already imported/i);
  const afterSecondRun = fs.readdirSync(importedRoot).filter((file) => file.endsWith('.md'));
  assert.equal(afterSecondRun.length, 1);

  const state = JSON.parse(readFile(path.join(vaultRoot, 'Projects', 'repo', 'Artifacts', 'session-import-state.json')));
  assert.equal(state.imported.length, 1);
  assert.ok(state.skipped_unmatched >= 1);

  result = runCli(['memory', 'status', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  const status = parseJson(result.stdout);
  assert.equal(status.recallMode, 'hybrid');
  assert.equal(status.imports.importedSessions, 1);
  assert.ok(status.imports.skippedUnmatched >= 1);
  assert.ok(status.diagnostics.some((item) => item.code === 'session-import-ready'));
  assert.ok(status.nextActions.includes('agent-bootstrap recall "<query>"'));
});

test('hybrid semantic recall finds related memory without exact keyword overlap', () => {
  const root = makeTempDir('agent-bootstrap-semantic-recall-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['decision', 'Use Supabase RLS policies for tenant isolation.', '--title', 'Tenant data isolation']);
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['recall', 'bảo mật dữ liệu khách hàng', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Tenant data isolation/);
  assert.match(result.stdout, /Supabase RLS policies/);

  const recallIndexPath = path.join(vaultRoot, 'Projects', 'repo', 'Artifacts', 'recall-index.json');
  const recallIndex = JSON.parse(readFile(recallIndexPath));
  const decisionDocument = recallIndex.documents.find((document) => document.path.endsWith('Decisions.md'));
  assert.ok(decisionDocument);
  assert.ok(decisionDocument.concepts.includes('security'));
  assert.equal(recallIndex.mode, 'hybrid');
});

test('memory commands report status sync sessions export and backup project memory', () => {
  const root = makeTempDir('agent-bootstrap-memory-ops-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['task', 'Ship automatic recall status commands']);
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['plan', 'start', 'memory status dashboard', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['harness', 'intake', 'backend login with Gin', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'trace', 'partial backend login implementation', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  result = runCli(['harness', 'friction', 'auth integration proof is unclear', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['memory', 'status', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  let status = parseJson(result.stdout);
  assert.equal(status.ok, true);
  assert.equal(status.projectSlug, 'repo');
  assert.equal(status.recallMode, 'hybrid');
  assert.equal(status.planState.current.title, 'memory status dashboard');
  assert.equal(status.planState.current.status, 'in_progress');
  assert.equal(status.productHarness.currentStory.title, 'backend login with Gin');
  assert.equal(status.productHarness.currentStory.risk, 'high');
  assert.ok(status.productHarness.proofGaps.length > 0);
  assert.equal(status.productHarness.latestTrace.summary, 'partial backend login implementation');
  assert.equal(status.productHarness.openFriction.length, 1);
  assert.equal(status.checks.productHarness, true);
  assert.ok(status.checks.planState);
  assert.equal(status.checks.projectRoot, true);
  assert.ok(status.counts.memoryRecords >= 1);
  assert.ok(status.counts.harnessTraces >= 1);
  assert.ok(status.counts.harnessFriction >= 1);
  assert.ok(status.diagnostics.some((item) => item.code === 'session-import-not-run'));
  assert.ok(status.diagnostics.some((item) => item.code === 'product-harness-friction'));
  assert.ok(status.nextActions.includes('agent-bootstrap context --compact'));

  const emptySessionsRoot = path.join(root, 'empty-codex-sessions');
  fs.mkdirSync(emptySessionsRoot, { recursive: true });
  result = runCli(['memory', 'import-sessions', repoRoot], {
    configHome,
    cwd: repoRoot,
    env: { AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT: emptySessionsRoot },
  });
  assert.equal(result.status, 0, result.stderr);
  const imported = parseJson(result.stdout);
  assert.equal(imported.imported, 0);
  assert.match(imported.summary, /No matching Codex sessions imported/i);
  assert.match(imported.nextAction, /Check session roots/i);

  result = runCli(['memory', 'sync-sessions', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  const sync = parseJson(result.stdout);
  assert.equal(fs.existsSync(sync.sessionPath), true);
  assert.match(readFile(sync.sessionPath), /Ship automatic recall status commands/);

  result = runCli(['memory', 'export', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  const exported = parseJson(result.stdout);
  assert.equal(fs.existsSync(exported.exportPath), true);
  const exportBody = JSON.parse(readFile(exported.exportPath));
  assert.equal(exportBody.project.slug, 'repo');
  assert.ok(exportBody.files.some((file) => file.relativePath === 'Tasks.md'));
  assert.ok(exportBody.files.some((file) => file.relativePath === 'Plans/CURRENT.md'));
  assert.ok(exportBody.files.some((file) => file.relativePath === 'Repo/docs/superpowers/plans/CURRENT.md'));
  assert.ok(exportBody.files.some((file) => file.relativePath === 'ProductHarness/HARNESS.md'));
  assert.ok(exportBody.files.some((file) => file.relativePath === 'ProductHarness/HARNESS_BACKLOG.md'));
  assert.ok(exportBody.files.some((file) => file.relativePath.startsWith('ProductHarness/Traces/')));
  assert.ok(exportBody.files.some((file) => file.relativePath === 'Repo/docs/stories/INDEX.md'));
  assert.ok(exportBody.files.some((file) => file.relativePath.startsWith('Repo/docs/product/traces/')));

  result = runCli(['memory', 'backup', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  const backup = parseJson(result.stdout);
  assert.equal(fs.existsSync(backup.backupPath), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'manifest.json')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'Tasks.md')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'Plans', 'CURRENT.md')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'Repo', 'docs', 'superpowers', 'plans', 'CURRENT.md')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'ProductHarness', 'HARNESS.md')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'ProductHarness', 'HARNESS_BACKLOG.md')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'ProductHarness', 'Traces')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'Repo', 'docs', 'stories', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(backup.backupPath, 'Repo', 'docs', 'product', 'traces')), true);

  result = runCli(['memory', 'status', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  status = parseJson(result.stdout);
  assert.ok(status.counts.sessions >= 1);
  assert.ok(status.counts.exports >= 1);
  assert.ok(status.counts.backups >= 1);
});

test('stable memory writes update project fact question and handoff files', () => {
  const root = makeTempDir('agent-bootstrap-stable-memory-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, [
    'fact',
    'Source edits happen in src; dist and runtime dist are generated.',
    '--title',
    'Source of truth',
    '--source',
    'AGENTS.md',
    '--confidence',
    'high',
  ]);
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['question', 'Should npm publish wait until the pushed GitHub branch is reviewed?', '--title', 'Publish gate']);
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['handoff', 'Next session should run npm test before publishing 0.1.8.']);
  assert.equal(result.status, 0, result.stderr);

  const projectRoot = path.join(vaultRoot, 'Projects', 'repo');
  const facts = readFile(path.join(projectRoot, 'Facts.md'));
  const questions = readFile(path.join(projectRoot, 'Open Questions.md'));
  const handoff = readFile(path.join(projectRoot, 'Handoff.md'));

  assert.match(facts, /Source of truth/);
  assert.match(facts, /Source edits happen in src/);
  assert.match(facts, /Source: AGENTS\.md/);
  assert.match(facts, /Confidence: high/);
  assert.match(facts, /Last verified:/);
  assert.match(questions, /Publish gate/);
  assert.match(questions, /Should npm publish wait/);
  assert.match(handoff, /Next session should run npm test/);

  const index = JSON.parse(readFile(path.join(projectRoot, 'Artifacts', 'memory-index.json')));
  assert.equal(index.recent.facts[0].title, 'Source of truth');
  assert.equal(index.recent.questions[0].title, 'Publish gate');
  assert.equal(index.recent.handoffs[0].title, 'Session handoff');

  result = runRuntime(repoRoot, ['context']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Project Facts/);
  assert.match(result.stdout, /Source of truth/);
  assert.match(result.stdout, /Project Open Questions/);
  assert.match(result.stdout, /Publish gate/);
  assert.match(result.stdout, /Project Handoff/);
  assert.match(result.stdout, /Next session should run npm test/);
});

test('memory compact summarizes session noise into a project artifact', () => {
  const root = makeTempDir('agent-bootstrap-memory-compact-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['task', 'Keep compact memory useful']);
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['compact']);
  assert.equal(result.status, 0, result.stderr);

  const summaryPath = path.join(vaultRoot, 'Projects', 'repo', 'Artifacts', 'session-summary.md');
  const sessionsRoot = path.join(vaultRoot, 'Projects', 'repo', 'Sessions');
  assert.equal(fs.existsSync(summaryPath), true);
  const summary = readFile(summaryPath);
  assert.match(summary, /# Session Summary/);
  assert.match(summary, /Recent Tasks/);
  assert.match(summary, /Keep compact memory useful/);
  assert.equal(fs.existsSync(sessionsRoot), true);
  assert.ok(fs.readdirSync(sessionsRoot).some((file) => file.endsWith('.md')));
});

test('repo-local runtime mirrors recall and memory status commands from nested paths', () => {
  const root = makeTempDir('agent-bootstrap-runtime-recall-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'feature');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['fact', 'Frontend recall uses bounded snippets.', '--title', 'Recall snippet budget'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['recall', 'bounded snippets'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Recall Results/);
  assert.match(result.stdout, /Recall snippet budget/);

  result = runRuntime(repoRoot, ['memory', 'status'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const status = parseJson(result.stdout);
  assert.equal(status.projectSlug, 'repo');
  assert.equal(status.ok, true);

  result = runRuntime(repoRoot, ['plan', 'start', 'auth security review'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const started = parseJson(result.stdout);
  assert.equal(started.status, 'in_progress');
  assert.equal(fs.existsSync(started.planPath), true);

  result = runRuntime(repoRoot, ['plan', 'status'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const planStatus = parseJson(result.stdout);
  assert.equal(planStatus.current.title, 'auth security review');

  result = runRuntime(repoRoot, ['harness', 'intake', 'auth login'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const harnessIntake = parseJson(result.stdout);
  assert.equal(harnessIntake.risk, 'high');
  assert.deepEqual(harnessIntake.riskFlags, ['auth']);
  assert.equal(fs.existsSync(harnessIntake.storyPath), true);
  assert.equal(fs.existsSync(path.join(harnessIntake.storyRoot, 'execplan.md')), true);

  result = runRuntime(repoRoot, ['harness', 'status'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const harnessStatus = parseJson(result.stdout);
  assert.equal(harnessStatus.currentStory.title, 'auth login');
  assert.ok(harnessStatus.proofGaps.length > 0);

  result = runRuntime(repoRoot, ['harness', 'trace', 'completed auth login packet'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const runtimeTrace = parseJson(result.stdout);
  assert.equal(runtimeTrace.action, 'trace-recorded');
  assert.equal(fs.existsSync(runtimeTrace.tracePath), true);

  result = runRuntime(repoRoot, ['harness', 'friction', 'auth smoke proof was unclear'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  const runtimeFriction = parseJson(result.stdout);
  assert.equal(runtimeFriction.action, 'friction-recorded');
  assert.equal(fs.existsSync(runtimeFriction.backlogPath), true);

  result = runRuntime(repoRoot, ['context'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Product Harness/);
  assert.match(result.stdout, /completed auth login packet/);
  assert.match(result.stdout, /Open friction/i);
});

test('repo-local runtime imports Codex sessions and recall finds imported memory', () => {
  const root = makeTempDir('agent-bootstrap-runtime-import-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'feature');
  const configHome = path.join(root, 'config-home');
  const codexSessionsRoot = path.join(root, 'codex-sessions');

  fs.mkdirSync(nested, { recursive: true });
  writeFile(path.join(codexSessionsRoot, 'session-runtime.jsonl'), [
    JSON.stringify({ type: 'session_meta', cwd: repoRoot, project_slug: 'repo' }),
    JSON.stringify({ role: 'user', content: 'Can you remember how we protected customer records?' }),
    JSON.stringify({ role: 'assistant', content: 'Decision: Use Supabase RLS policies for tenant isolation in the backend.' }),
  ].join('\n'));

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runRuntime(repoRoot, ['memory', 'import-sessions'], {
    cwd: nested,
    env: { AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT: codexSessionsRoot },
  });
  assert.equal(result.status, 0, result.stderr);
  const imported = parseJson(result.stdout);
  assert.equal(imported.imported, 1);

  result = runRuntime(repoRoot, ['recall', 'bao mat du lieu khach hang'], { cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Supabase RLS policies/);
  assert.match(result.stdout, /tenant isolation/);
});

test('Codex indexes enforce workflow priority and compact-context guardrails', () => {
  const agentIndex = readFile(path.join(repoRoot, '.codex', 'INDEX.md'));
  const subagentIndex = readFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md'));
  const skillsIndex = readFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md'));

  assert.match(agentIndex, /Run `agent-bootstrap context --compact`/);
  assert.match(agentIndex, /agent-bootstrap plan status/);
  assert.match(agentIndex, /agent-bootstrap harness status/);
  assert.match(agentIndex, /harness trace/);
  assert.match(agentIndex, /harness friction/);
  assert.match(agentIndex, /Product Harness/);
  assert.match(agentIndex, /Active Plan State/);
  assert.match(agentIndex, /There is no `\.codex\/rules\/` folder/);
  assert.match(agentIndex, /agent-bootstrap managed prompt templates, not native Codex slash commands/);
  assert.match(agentIndex, /Superpowers \+ 3 core subagents/i);
  assert.match(agentIndex, /code-reviewer/);
  assert.match(agentIndex, /security-auditor/);
  assert.match(agentIndex, /test-engineer/);
  assert.match(subagentIndex, /3 core subagents/i);
  assert.match(subagentIndex, /Custom Agents/);
  assert.match(subagentIndex, /Do not dispatch subagents by default/);
  assert.match(skillsIndex, /superpowers/);
  assert.match(skillsIndex, /Custom Skills/);
  assert.doesNotMatch(skillsIndex, obsoleteSkillNamePattern());
  assert.match(skillsIndex, /If a fact is not in repo files, context output, tests, or a cited source, mark it unknown/);
  assert.match(agentIndex, /Product Harness is not a skill/i);
  assert.doesNotMatch(agentIndex, /replaces Superpowers/i);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'rules')), false);
});

test('skill routing keeps one bundled workflow skill with optional domain skills', () => {
  const skillsIndex = readFile(path.join(repoRoot, '.codex', 'skills', 'INDEX.md'));
  const superpowersReadme = readFile(path.join(repoRoot, '.codex', 'skills', 'superpowers', 'README.md'));
  const skillDirs = fs.readdirSync(path.join(repoRoot, '.codex', 'skills'))
    .filter((entry) => fs.statSync(path.join(repoRoot, '.codex', 'skills', entry)).isDirectory())
    .sort();

  assert.deepEqual(skillDirs, shippedSkills);
  assert.match(skillsIndex, /`superpowers` is the only bundled workflow skill/);
  assert.match(skillsIndex, /Bundled Optional Domain Skills/);
  assert.match(skillsIndex, /\.codex\/skills\/frontend-design\/SKILL\.md/);
  assert.match(skillsIndex, /\.codex\/skills\/vibe-security-scan\/SKILL\.md/);
  assert.match(skillsIndex, /auth|API|server action|secrets|\.env|Supabase|RLS|storage|upload|payment|subscription|quota|dependency|CORS|JWT|rate limit|access control|tenant|admin|security review/);
  assert.match(skillsIndex, /Custom Skills/);
  assert.doesNotMatch(skillsIndex, /agent-api/);
  assert.doesNotMatch(skillsIndex, obsoleteSkillNamePattern());

  assert.match(superpowersReadme, /# Superpowers Workflow Routing Index/);
  assert.match(superpowersReadme, /Feature or bugfix/);
  assert.match(superpowersReadme, /test-driven-development/);
  assert.match(superpowersReadme, /Unexpected behavior or failing test/);
  assert.match(superpowersReadme, /systematic-debugging/);
  assert.match(superpowersReadme, /Before claiming completion/);
  assert.match(superpowersReadme, /verification-before-completion/);
  assert.doesNotMatch(superpowersReadme, obsoleteSkillNamePattern());
});

test('bundled optional domain skills stay lazy-loaded without expanding compact context', () => {
  const skillsRoot = path.join(repoRoot, '.codex', 'skills');
  const skillsIndex = readFile(path.join(skillsRoot, 'INDEX.md'));

  assert.match(skillsIndex, /superpowers/);
  assert.match(skillsIndex, /frontend-design/);
  assert.match(skillsIndex, /vibe-security-scan/);
  assert.match(skillsIndex, /Custom Skills/);
  assert.doesNotMatch(skillsIndex, obsoleteSkillNamePattern());
  assert.doesNotMatch(skillsIndex, /agent-api/);
  assert.equal(fs.existsSync(path.join(skillsRoot, 'frontend-design')), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, 'vibe-security-scan')), true);
  assert.equal(fs.existsSync(path.join(skillsRoot, 'agent-api')), false);
  assert.equal(fs.existsSync(path.join(skillsRoot, obsoleteSkillDirs[0])), false);

  const nestedAgentGuides = [];
  const stack = [skillsRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.name === 'AGENTS.md') {
        nestedAgentGuides.push(path.relative(skillsRoot, entryPath));
      }
    }
  }

  assert.deepEqual(nestedAgentGuides, []);
});

test('shipped skill metadata is triggerable and does not reference removed skills', () => {
  const skillsRoot = path.join(repoRoot, '.codex', 'skills');
  const obsoleteStem = obsoleteSkillDirs[0].split('-')[0];
  const removedSkillPattern = new RegExp([
    obsoleteStem,
    'agent-api',
    ['andrej', obsoleteStem, 'skills'].join('-'),
    'api-designer',
    'architecture-designer',
    'database-optimizer',
    'devops-engineer',
    'legacy-modernizer',
    'monitoring-expert',
    'secure-code-guardian',
    'sql-pro',
    'vercel-react-best-practices',
  ].join('|'), 'i');

  const skillsIndex = readFile(path.join(skillsRoot, 'INDEX.md'));
  const superpowersReadme = readFile(path.join(skillsRoot, 'superpowers', 'README.md'));
  assert.doesNotMatch(skillsIndex, removedSkillPattern);
  assert.doesNotMatch(superpowersReadme, removedSkillPattern);
});

test('bundled optional skill contracts are triggerable and bounded', () => {
  const skillsRoot = path.join(repoRoot, '.codex', 'skills');
  const frontend = readFile(path.join(skillsRoot, 'frontend-design', 'SKILL.md'));
  const security = readFile(path.join(skillsRoot, 'vibe-security-scan', 'SKILL.md'));
  const securityReadme = readFile(path.join(skillsRoot, 'vibe-security-scan', 'rules', 'languages', 'rust', 'README.md'));
  const genericRulesRoot = path.join(skillsRoot, 'vibe-security-scan', 'rules', 'generic');
  const genericRules = fs.readdirSync(genericRulesRoot).filter((entry) => entry.endsWith('.md')).sort();

  assert.match(frontend, /^---\r?\n[\s\S]*name: frontend-design/);
  assert.match(frontend, /description: Use when/i);
  assert.match(frontend, /license: Apache-2\.0/i);
  assert.doesNotMatch(frontend, /TomoTy/i);

  assert.match(security, /^---\r?\n[\s\S]*name: vibe-security-scan/);
  assert.match(security, /description: Use when/i);
  assert.match(security, /Superpowers/);
  assert.match(security, /security-auditor/);
  assert.match(security, /defensive/i);
  assert.match(security, /Do not attack live systems/i);
  assert.match(security, /Never write secrets/i);
  assert.match(security, /evidence-first/i);
  assert.match(security, /MIT/i);
  assert.match(security, /tanviet12\/vbsec/i);
  assert.match(security, /Rust/i);
  assert.match(securityReadme, /Rust Security Overlay/i);
  assert.equal(genericRules.length, 21);
});

test('Codex routing index exposes exactly three core subagents with vault-aware contracts', () => {
  const agentIndex = readFile(path.join(repoRoot, '.codex', 'INDEX.md'));
  const subagentIndex = readFile(path.join(repoRoot, '.codex', 'agents', 'INDEX.md'));
  const agentsRoot = path.join(repoRoot, '.codex', 'agents');
  const agentFiles = fs.readdirSync(agentsRoot).filter((entry) => entry.endsWith('.toml')).sort();

  assert.deepEqual(agentFiles, coreAgents.map((agent) => `${agent}.toml`).sort());
  for (const agent of coreAgents) {
    const body = readFile(path.join(agentsRoot, `${agent}.toml`));
    assert.match(body, new RegExp(`name = "${agent}"`));
    assert.match(body, /description = "/);
    assert.match(body, /developer_instructions = """\r?\n/);
    assert.match(body, /Superpowers/);
    assert.match(body, /vault bridge/i);
    assert.match(body, /evidence/i);
    assert.match(body, /Do not invoke other subagents/);
    assert.match(agentIndex, new RegExp(`\\b${agent}\\b`));
    assert.match(subagentIndex, new RegExp(`\\b${agent}\\b`));
  }
  assert.match(readFile(path.join(agentsRoot, 'code-reviewer.toml')), /Findings first/);
  assert.match(readFile(path.join(agentsRoot, 'security-auditor.toml')), /Severity/);
  assert.match(readFile(path.join(agentsRoot, 'test-engineer.toml')), /Missing coverage/);
  assert.equal(agentFiles.some((file) => ['default.toml', 'worker.toml', 'explorer.toml'].includes(file)), false);
  for (const agent of obsoleteManagedAgents) {
    assert.equal(fs.existsSync(path.join(agentsRoot, `${agent}.toml`)), false);
  }
});

test('skill index covers shipped skills and skill frontmatter is triggerable', () => {
  const skillsRoot = path.join(repoRoot, '.codex', 'skills');
  const skillsIndex = readFile(path.join(skillsRoot, 'INDEX.md'));

  for (const entry of shippedSkills) {
    assert.match(skillsIndex, new RegExp(entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const stack = [skillsRoot];
  const skillFiles = [];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.name === 'SKILL.md') {
        skillFiles.push(entryPath);
      }
    }
  }

  assert.ok(skillFiles.length > 0);
  for (const skillFile of skillFiles) {
    const body = readFile(skillFile);
    assert.match(body, /^---\r?\n[\s\S]*\bname:/, `Missing name in ${skillFile}`);
    assert.match(body, /^---\r?\n[\s\S]*\bdescription:/, `Missing description in ${skillFile}`);
  }
});

test('daily note logging deduplicates repeated note writes with the same title', () => {
  const root = makeTempDir('agent-bootstrap-daily-dedupe-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');
  const today = getTodayString();

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const runtimePath = path.join(repoRoot, 'scripts', 'agent-memory.js');

  for (let index = 0; index < 2; index += 1) {
    const runtime = spawnSync(process.execPath, [
      runtimePath,
      'research',
      'Shared deployment checklist across projects',
      '--title',
      'Deployment checklist',
    ], {
      cwd: repoRoot,
      encoding: 'utf8',
    });
    assert.equal(runtime.status, 0, runtime.stderr);
  }

  const dailyPath = path.join(vaultRoot, 'Daily', `${today}.md`);
  const daily = readFile(dailyPath);
  const occurrences = daily.split('Deployment checklist').length - 1;
  assert.equal(occurrences, 1);
});

test('seeded scaffold sync refreshes untouched kit files and preserves customized files', () => {
  const root = makeTempDir('agent-bootstrap-seeded-sync-');
  const sourceRoot = path.join(root, 'source');
  const targetRoot = path.join(root, 'target');
  const manifestPath = path.join(targetRoot, '.agent-bootstrap-manifest.json');

  writeFile(path.join(sourceRoot, '.codex', 'README.md'), '# Workspace Guide v1\n');
  writeFile(path.join(sourceRoot, 'docs', 'project-map.md'), '# Project Map v1\n');
  writeFile(path.join(sourceRoot, 'plans', 'plan.md'), '# Plan v1\n');

  syncSeededScaffold({
    sourceRoot,
    targetRoot,
    manifestPath,
    seedPaths: ['.codex', 'docs', 'plans'],
  });

  assert.equal(readFile(path.join(targetRoot, '.codex', 'README.md')), '# Workspace Guide v1\n');
  assert.equal(readFile(path.join(targetRoot, 'docs', 'project-map.md')), '# Project Map v1\n');

  writeFile(path.join(sourceRoot, '.codex', 'README.md'), '# Workspace Guide v2\n');
  writeFile(path.join(sourceRoot, 'docs', 'project-map.md'), '# Project Map v2\n');
  writeFile(path.join(targetRoot, 'docs', 'project-map.md'), '# Custom Project Map\n');

  syncSeededScaffold({
    sourceRoot,
    targetRoot,
    manifestPath,
    seedPaths: ['.codex', 'docs', 'plans'],
  });

  assert.equal(readFile(path.join(targetRoot, '.codex', 'README.md')), '# Workspace Guide v2\n');
  assert.equal(readFile(path.join(targetRoot, 'docs', 'project-map.md')), '# Custom Project Map\n');
  assert.equal(fs.existsSync(manifestPath), true);
});

test('global tarball install succeeds from a packed local repo snapshot', { timeout: 120000 }, () => {
  const root = makeTempDir('agent-bootstrap-global-install-');
  const packageRepo = path.join(root, 'package-repo');
  const prefix = path.join(root, 'prefix');
  const cache = path.join(root, 'npm-cache');

  fs.mkdirSync(packageRepo, { recursive: true });
  fs.mkdirSync(prefix, { recursive: true });
  copyFixtureRepo(packageRepo);

  let git = spawnSync('git', ['init'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.name', 'Agent Bootstrap Tests'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.email', 'agent-bootstrap-tests@example.com'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['add', '.'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['commit', '-m', 'Fixture snapshot'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  const pack = spawnSync('npm pack --silent', {
    cwd: packageRepo,
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(pack.status, 0, pack.stderr || pack.stdout);

  const tarballName = pack.stdout.trim().split(/\r?\n/).pop();
  assert.ok(tarballName);

  const tarballPath = path.join(packageRepo, tarballName);
  const installCommand = process.platform === 'win32'
    ? `npm install -g --force "${tarballPath}" --prefix "${prefix}"`
    : `npm install -g --force '${tarballPath}' --prefix '${prefix}'`;

  const result = spawnSync(installCommand, {
    cwd: root,
    env: {
      ...process.env,
      npm_config_cache: cache,
    },
    encoding: 'utf8',
    shell: true,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const smoke = process.platform === 'win32'
    ? spawnSync('cmd.exe', [
      '/d',
      '/s',
      '/c',
      path.join(prefix, 'agent-bootstrap.cmd'),
      '--help',
    ], {
      cwd: root,
      encoding: 'utf8',
    })
    : spawnSync(path.join(prefix, 'bin', 'agent-bootstrap'), ['--help'], {
      cwd: root,
      encoding: 'utf8',
    });

  assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
  assert.match(smoke.stdout, /agent-bootstrap init/);
});

test('packed install supports setup from the vault cwd and init from the repo cwd', { timeout: 120000 }, () => {
  const root = makeTempDir('agent-bootstrap-global-init-');
  const packageRepo = path.join(root, 'package-repo');
  const prefix = path.join(root, 'prefix');
  const cache = path.join(root, 'npm-cache');
  const configHome = path.join(root, 'config-home');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');

  fs.mkdirSync(packageRepo, { recursive: true });
  fs.mkdirSync(prefix, { recursive: true });
  fs.mkdirSync(configHome, { recursive: true });
  fs.mkdirSync(vaultRoot, { recursive: true });
  fs.mkdirSync(repoRoot, { recursive: true });
  copyFixtureRepo(packageRepo);

  let git = spawnSync('git', ['init'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.name', 'Agent Bootstrap Tests'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.email', 'agent-bootstrap-tests@example.com'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['add', '.'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['commit', '-m', 'Fixture snapshot'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  const pack = spawnSync('npm pack --silent', {
    cwd: packageRepo,
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(pack.status, 0, pack.stderr || pack.stdout);

  const tarballName = pack.stdout.trim().split(/\r?\n/).pop();
  assert.ok(tarballName);

  const tarballPath = path.join(packageRepo, tarballName);
  const installCommand = process.platform === 'win32'
    ? `npm install -g --force "${tarballPath}" --prefix "${prefix}"`
    : `npm install -g --force '${tarballPath}' --prefix '${prefix}'`;

  const install = spawnSync(installCommand, {
    cwd: root,
    env: {
      ...process.env,
      npm_config_cache: cache,
    },
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(install.status, 0, install.stderr || install.stdout);

  const cliCommand = process.platform === 'win32'
    ? path.join(prefix, 'agent-bootstrap.cmd')
    : path.join(prefix, 'bin', 'agent-bootstrap');
  const cliArgs = process.platform === 'win32'
    ? ['/d', '/s', '/c', cliCommand]
    : [];
  const cliShell = process.platform === 'win32' ? 'cmd.exe' : cliCommand;
  const cliEnv = {
    ...process.env,
    AGENT_BOOTSTRAP_CONFIG_HOME: configHome,
  };

  const setup = spawnSync(cliShell, [...cliArgs, 'setup'], {
    cwd: vaultRoot,
    env: cliEnv,
    encoding: 'utf8',
  });
  assert.equal(setup.status, 0, setup.stderr || setup.stdout);
  assert.equal(readConfigFile(configHome).vaultRoot, vaultRoot);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'AGENTS.md')), true);

  const init = spawnSync(cliShell, [...cliArgs, 'init'], {
    cwd: repoRoot,
    env: cliEnv,
    encoding: 'utf8',
  });
  assert.equal(init.status, 0, init.stderr || init.stdout);
  assert.equal(fs.existsSync(path.join(repoRoot, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, legacyAgentFile)), false);
  assert.equal(fs.existsSync(path.join(repoRoot, 'docs', 'vault-memory.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'code-reviewer.toml')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'security-auditor.toml')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.codex', 'agents', 'test-engineer.toml')), true);
  assertLegacyGithubAgentAssetsRemoved(repoRoot);
});

test('global install command can be repeated to update the same package', { timeout: 120000 }, () => {
  const root = makeTempDir('agent-bootstrap-global-reinstall-');
  const packageRepo = path.join(root, 'package-repo');
  const prefix = path.join(root, 'prefix');
  const cache = path.join(root, 'npm-cache');

  fs.mkdirSync(packageRepo, { recursive: true });
  fs.mkdirSync(prefix, { recursive: true });
  copyFixtureRepo(packageRepo);

  let git = spawnSync('git', ['init'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.name', 'Agent Bootstrap Tests'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.email', 'agent-bootstrap-tests@example.com'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['add', '.'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['commit', '-m', 'Fixture snapshot'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  const pack = spawnSync('npm pack --silent', {
    cwd: packageRepo,
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(pack.status, 0, pack.stderr || pack.stdout);

  const tarballName = pack.stdout.trim().split(/\r?\n/).pop();
  assert.ok(tarballName);

  const tarballPath = path.join(packageRepo, tarballName);
  const installCommand = process.platform === 'win32'
    ? `npm install -g --force "${tarballPath}" --prefix "${prefix}"`
    : `npm install -g --force '${tarballPath}' --prefix '${prefix}'`;

  const firstInstall = spawnSync(installCommand, {
    cwd: root,
    env: {
      ...process.env,
      npm_config_cache: cache,
    },
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(firstInstall.status, 0, firstInstall.stderr || firstInstall.stdout);

  const secondInstall = spawnSync(installCommand, {
    cwd: root,
    env: {
      ...process.env,
      npm_config_cache: cache,
    },
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(secondInstall.status, 0, secondInstall.stderr || secondInstall.stdout);
  assert.match(secondInstall.stdout, /(changed|up to date|added) 1 package/i);

  const smoke = process.platform === 'win32'
    ? spawnSync('cmd.exe', [
      '/d',
      '/s',
      '/c',
      path.join(prefix, 'agent-bootstrap.cmd'),
      '--help',
    ], {
      cwd: root,
      encoding: 'utf8',
    })
    : spawnSync(path.join(prefix, 'bin', 'agent-bootstrap'), ['--help'], {
      cwd: root,
      encoding: 'utf8',
    });

  assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
  assert.match(smoke.stdout, /agent-bootstrap setup/);
});

test('documented install command overwrites a stale global shim instead of failing with EEXIST', { timeout: 120000 }, () => {
  const root = makeTempDir('agent-bootstrap-global-stale-shim-');
  const packageRepo = path.join(root, 'package-repo');
  const prefix = path.join(root, 'prefix');
  const cache = path.join(root, 'npm-cache');

  fs.mkdirSync(packageRepo, { recursive: true });
  fs.mkdirSync(prefix, { recursive: true });
  copyFixtureRepo(packageRepo);
  writeFile(path.join(prefix, 'agent-bootstrap'), 'stale shim\n');

  let git = spawnSync('git', ['init'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.name', 'Agent Bootstrap Tests'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['config', 'user.email', 'agent-bootstrap-tests@example.com'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['add', '.'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  git = spawnSync('git', ['commit', '-m', 'Fixture snapshot'], {
    cwd: packageRepo,
    encoding: 'utf8',
  });
  assert.equal(git.status, 0, git.stderr);

  const pack = spawnSync('npm pack --silent', {
    cwd: packageRepo,
    encoding: 'utf8',
    shell: true,
  });
  assert.equal(pack.status, 0, pack.stderr || pack.stdout);

  const tarballName = pack.stdout.trim().split(/\r?\n/).pop();
  assert.ok(tarballName);

  const tarballPath = path.join(packageRepo, tarballName);
  const installCommand = process.platform === 'win32'
    ? `npm install -g --force "${tarballPath}" --prefix "${prefix}"`
    : `npm install -g --force '${tarballPath}' --prefix '${prefix}'`;

  const result = spawnSync(installCommand, {
    cwd: root,
    env: {
      ...process.env,
      npm_config_cache: cache,
    },
    encoding: 'utf8',
    shell: true,
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(path.join(prefix, 'agent-bootstrap.cmd')), true);
  assert.equal(fs.existsSync(path.join(prefix, 'agent-bootstrap.ps1')), true);
});
