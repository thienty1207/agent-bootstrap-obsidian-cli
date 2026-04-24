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
const coreSkills = [
  'architecture-designer',
  'api-designer',
  'devops-engineer',
  'monitoring-expert',
  'secure-code-guardian',
  'database-optimizer',
  'sql-pro',
  'legacy-modernizer',
];
const portableSkills = ['agent-api'];

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

function assertCoreSkillsPresent(repoRoot) {
  for (const skill of coreSkills) {
    const skillPath = path.join(repoRoot, '.agent', 'skills', skill, 'SKILL.md');
    assert.equal(fs.existsSync(skillPath), true, `Expected vendored core skill at ${skillPath}`);
  }
}

function assertPortableSkillsPresent(repoRoot) {
  for (const skill of portableSkills) {
    const skillRoot = path.join(repoRoot, '.agent', 'skills', skill);
    assert.equal(fs.existsSync(path.join(skillRoot, 'SKILL.md')), true, `Expected portable skill at ${skillRoot}`);
  }

  const agentApiRoot = path.join(repoRoot, '.agent', 'skills', 'agent-api');
  for (const file of [
    path.join(agentApiRoot, 'references', 'agent-api-architecture.md'),
    path.join(agentApiRoot, 'references', 'provider-capabilities.md'),
    path.join(agentApiRoot, 'references', 'streaming-contract.md'),
    path.join(agentApiRoot, 'references', 'tool-calling.md'),
    path.join(agentApiRoot, 'references', 'structured-output.md'),
    path.join(agentApiRoot, 'references', 'reliability-and-cost.md'),
    path.join(agentApiRoot, 'references', 'provider-migration.md'),
    path.join(agentApiRoot, 'python', 'agent-api.md'),
    path.join(agentApiRoot, 'typescript', 'agent-api.md'),
    path.join(agentApiRoot, 'go', 'agent-api.md'),
    path.join(agentApiRoot, 'rust', 'agent-api.md'),
  ]) {
    assert.equal(fs.existsSync(file), true, `Expected agent-api asset at ${file}`);
  }
}

function assertAgentWorkspacePresent(repoRoot) {
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'INDEX.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'agents', 'planner.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'commands', 'plan', 'brainstorm.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'rules', 'plan', 'brainstorm-before-build.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'rules', 'context', 'unknowns-gate.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'rules', 'context', 'stop-overthinking.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'skills', 'INDEX.md')), true);
  assertCoreSkillsPresent(repoRoot);
  assertPortableSkillsPresent(repoRoot);
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
  assert.match(result.stdout, /npm i -g --force @tytybill123\/agent-bootstrap/);
  assert.match(result.stdout, /agent-bootstrap setup/);
  assert.match(result.stdout, /agent-bootstrap init/);
  assert.match(result.stdout, /agent-bootstrap context/);
  assert.match(result.stdout, /npm uninstall -g @tytybill123\/agent-bootstrap/);
});

test('global CLI rejects internal commands instead of treating them as project paths', () => {
  const root = makeTempDir('agent-bootstrap-reject-internal-');
  const configHome = path.join(root, 'config-home');
  const workspaceRoot = path.join(root, 'workspace');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  for (const command of ['memory', 'doctor', 'update', 'migrate', 'sync', 'projects', 'config', 'new']) {
    const result = runCli([command], { configHome, cwd: workspaceRoot });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Public commands: setup, init, context/i);
  }
});

test('repo docs stay aligned with the limited public CLI surface', () => {
  const readme = readFile(path.join(repoRoot, 'README.md'));
  const agentGuide = readFile(path.join(repoRoot, 'AGENTS.md'));

  assert.doesNotMatch(agentGuide, /config set-vault/i);
  assert.doesNotMatch(agentGuide, /agent-bootstrap doctor/i);
  assert.doesNotMatch(agentGuide, /projects list/i);
  assert.match(agentGuide, /public cli surface/i);
  assert.match(readme, /public user flow is intentionally kept to 4 actions/);
  assert.match(readme, /Optional: AI Context/);
  assert.match(readme, /AI agents should run it automatically from `AGENTS\.md`/);
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
  assert.ok(fs.existsSync(path.join(repoRoot, 'AGENTS.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, legacyAgentFile)), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', legacyAgentFile)), false);
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'vault-memory.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'code-standards.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'plans', 'templates', 'feature-implementation-plan.md')));
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
  assert.match(repoReadme, /`\.agent\/skills\/agent-api\/`/i);
  assert.doesNotMatch(repoReadme, /prompts\//i);

  const rootAgent = readFile(path.join(repoRoot, 'AGENTS.md'));
  assert.match(rootAgent, /agent-bootstrap context --compact/);
  assert.match(rootAgent, /Do not ask the user whether to run it/);
  assert.match(rootAgent, /agent-bootstrap context --why/);
  assert.match(rootAgent, /agent-bootstrap context --full/);
  assert.match(rootAgent, /\.agent\/skills\/INDEX\.md/);
  assert.match(rootAgent, /Workflow skills have priority over domain skills/);
  assert.match(rootAgent, /Do not recursively scan `.agent\/skills`/);
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
  assert.match(result.stdout, /How the four folders work together/i);
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

  const compact = runCli(['context', '--compact'], { configHome, cwd: nested });
  assert.equal(compact.status, 0, compact.stderr);
  assert.match(compact.stdout, /Agent Routing Index/);
  assert.match(compact.stdout, /Skills Routing Index/);
  assert.match(compact.stdout, /Project Facts/);
  assert.doesNotMatch(compact.stdout, /Today Daily Note/);
  assert.doesNotMatch(compact.stdout, /# Test-Driven Development \(TDD\)/);
  assert.doesNotMatch(compact.stdout, /README\.upstream\.md/);

  const defaultContext = runCli(['context'], { configHome, cwd: nested });
  assert.equal(defaultContext.status, 0, defaultContext.stderr);
  assert.equal(defaultContext.stdout, compact.stdout);

  const why = runCli(['context', '--compact', '--why'], { configHome, cwd: nested });
  assert.equal(why.status, 0, why.stderr);
  assert.match(why.stdout, /Context mode: compact/);
  assert.match(why.stdout, /Loaded:/);
  assert.match(why.stdout, /Skipped:/);
  assert.match(why.stdout, /\.agent\/skills\/\*\*/);
  assert.match(why.stdout, /Daily\/\*\*/);

  const full = runCli(['context', '--full'], { configHome, cwd: nested });
  assert.equal(full.status, 0, full.stderr);
  assert.match(full.stdout, /Today Daily Note/);
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
  assert.ok(fs.existsSync(path.join(repoRoot, '.agent', 'agents', 'planner.md')));
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
  assert.match(readme, /rerun `agent-bootstrap init` to repair missing managed assets/i);
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
  fs.rmSync(path.join(repoRoot, '.agent', 'agents', 'planner.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'scripts', 'agent-memory.js'), { force: true });
  writeFile(path.join(repoRoot, '.github', 'prompts', 'legacy-prompt.md'), '# Legacy prompt\n');

  const updateReport = withConfigHome(configHome, () => updateProject({ repoRoot }));
  assert.equal(updateReport.action, 'update');
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'agents', 'planner.md')), true);
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
  assert.match(readFile(path.join(repoRoot, 'AGENTS.md')), /Keep this note\./);
  assert.match(readFile(path.join(repoRoot, 'AGENTS.md')), /Project type: backend/);
  assert.match(readFile(path.join(repoRoot, 'README.md')), /Do not overwrite this\./);
});

test('doctor internal report suggests rerunning init for repairable drift', () => {
  const root = makeTempDir('agent-bootstrap-doctor-actionable-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['setup', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['init', repoRoot, '--type', 'desktop'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  fs.rmSync(path.join(repoRoot, '.agent', 'agents', 'planner.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'docs', 'project-map.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'scripts', 'agent-memory.js'), { force: true });

  const doctor = withConfigHome(configHome, () => runDoctor({ repoRoot }));
  assert.equal(doctor.ok, false);
  assert.equal(doctor.checks.runtimeScript, false);
  assert.equal(doctor.checks.projectMap, false);
  assert.match(doctor.repo.kitVersion, /^\d+\.\d+\.\d+/);
  assert.ok(doctor.missing.repoPaths.includes('.agent/agents/planner.md'));
  assert.ok(doctor.missing.repoPaths.includes('docs/project-map.md'));
  assert.ok(doctor.missing.repoPaths.includes('scripts/agent-memory.js'));
  assert.ok(doctor.suggestedCommands.includes('agent-bootstrap init'));
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
  assert.equal(fs.existsSync(summaryPath), true);
  const summary = readFile(summaryPath);
  assert.match(summary, /# Session Summary/);
  assert.match(summary, /Recent Tasks/);
  assert.match(summary, /Keep compact memory useful/);
});

test('agent indexes enforce workflow skill priority and anti-overthinking rules', () => {
  const agentIndex = readFile(path.join(repoRoot, '.agent', 'INDEX.md'));
  const skillsIndex = readFile(path.join(repoRoot, '.agent', 'skills', 'INDEX.md'));
  const unknownsGate = readFile(path.join(repoRoot, '.agent', 'rules', 'context', 'unknowns-gate.md'));
  const stopOverthinking = readFile(path.join(repoRoot, '.agent', 'rules', 'context', 'stop-overthinking.md'));

  assert.match(agentIndex, /Run `agent-bootstrap context --compact`/);
  assert.match(agentIndex, /Skill routing is mandatory/);
  assert.match(skillsIndex, /Workflow skills have priority over domain skills/);
  assert.match(skillsIndex, /superpowers/);
  assert.match(skillsIndex, /karpathy-guidelines/);
  assert.match(unknownsGate, /Open Questions\.md/);
  assert.match(unknownsGate, /Do not convert assumptions into facts/);
  assert.match(stopOverthinking, /Maximum 3 context expansion steps/);
  assert.match(stopOverthinking, /task touches one file/);
});

test('skill index covers shipped skills and skill frontmatter is triggerable', () => {
  const skillsRoot = path.join(repoRoot, '.agent', 'skills');
  const skillsIndex = readFile(path.join(skillsRoot, 'INDEX.md'));
  const requiredIndexEntries = [
    'agent-api',
    'andrej-karpathy-skills',
    'superpowers',
    'architecture-designer',
    'api-designer',
    'devops-engineer',
    'monitoring-expert',
    'secure-code-guardian',
    'database-optimizer',
    'sql-pro',
    'legacy-modernizer',
  ];

  for (const entry of requiredIndexEntries) {
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

  writeFile(path.join(sourceRoot, '.agent', 'README.md'), '# Workspace Guide v1\n');
  writeFile(path.join(sourceRoot, 'docs', 'project-map.md'), '# Project Map v1\n');
  writeFile(path.join(sourceRoot, 'plans', 'plan.md'), '# Plan v1\n');

  syncSeededScaffold({
    sourceRoot,
    targetRoot,
    manifestPath,
    seedPaths: ['.agent', 'docs', 'plans'],
  });

  assert.equal(readFile(path.join(targetRoot, '.agent', 'README.md')), '# Workspace Guide v1\n');
  assert.equal(readFile(path.join(targetRoot, 'docs', 'project-map.md')), '# Project Map v1\n');

  writeFile(path.join(sourceRoot, '.agent', 'README.md'), '# Workspace Guide v2\n');
  writeFile(path.join(sourceRoot, 'docs', 'project-map.md'), '# Project Map v2\n');
  writeFile(path.join(targetRoot, 'docs', 'project-map.md'), '# Custom Project Map\n');

  syncSeededScaffold({
    sourceRoot,
    targetRoot,
    manifestPath,
    seedPaths: ['.agent', 'docs', 'plans'],
  });

  assert.equal(readFile(path.join(targetRoot, '.agent', 'README.md')), '# Workspace Guide v2\n');
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
  assert.equal(fs.existsSync(path.join(repoRoot, '.agent', 'agents', 'planner.md')), true);
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
