const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const binPath = path.join(__dirname, '..', 'bin', 'agent-bootstrap.js');
const repoRoot = path.join(__dirname, '..');

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

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

test('config set-vault initializes a portable vault skeleton on an empty path', () => {
  const root = makeTempDir('agent-bootstrap-vault-init-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'workspace');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  const result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  assert.equal(fs.existsSync(path.join(vaultRoot, 'AGENTS.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Daily')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Templates', 'Daily Note.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Projects', '_template', 'README.md')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Research')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'Notes')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, '.obsidian', 'core-plugins.json')), true);
  assert.equal(fs.existsSync(path.join(vaultRoot, '.obsidian', 'daily-notes.json')), true);

  const dailySettings = JSON.parse(readFile(path.join(vaultRoot, '.obsidian', 'daily-notes.json')));
  assert.equal(dailySettings.folder, 'Daily');
  assert.equal(dailySettings.template, 'Templates/Daily Note');
});

test('config set-vault uses the current working directory when no path is provided', () => {
  const root = makeTempDir('agent-bootstrap-vault-cwd-');
  const vaultRoot = path.join(root, 'vault-root');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(vaultRoot, { recursive: true });

  const result = runCli(['config', 'set-vault'], { configHome, cwd: vaultRoot });
  assert.equal(result.status, 0, result.stderr);

  const config = parseJson(runCli(['config', 'get'], { configHome, cwd: vaultRoot }).stdout);
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

  const config = parseJson(runCli(['config', 'get'], { configHome, cwd: workspaceRoot }).stdout);
  assert.equal(config.vaultRoot, vaultRoot);
  assert.equal(fs.existsSync(path.join(vaultRoot, 'AGENTS.md')), true);
});

test('help prints the four-command quickstart flow', () => {
  const root = makeTempDir('agent-bootstrap-help-');
  const configHome = path.join(root, 'config-home');
  const workspaceRoot = path.join(root, 'workspace');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  const result = runCli(['help'], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /npm i -g @tytybill123\/agent-bootstrap/);
  assert.match(result.stdout, /agent-bootstrap setup/);
  assert.match(result.stdout, /agent-bootstrap init/);
  assert.match(result.stdout, /npm uninstall -g @tytybill123\/agent-bootstrap/);
});

test('config set-vault stores portable config and init bootstraps current repo', () => {
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

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const projectRoot = path.join(vaultRoot, 'Projects', 'face-gen-tools');
  assert.ok(fs.existsSync(path.join(projectRoot, 'README.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'AGENT.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'AGENT.md')), false);
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'vault-memory.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'code-standards.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'plans', 'templates', 'feature-implementation-plan.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, '.github', 'commands', 'plan', 'brainstorm.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'planner.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, 'runtime')), false);
  assert.ok(fs.existsSync(path.join(repoRoot, 'scripts', 'agent-memory.js')));
  assert.ok(fs.existsSync(path.join(repoRoot, '.githooks', 'post-commit')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'vault.config.json')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'README.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'copilot-instructions.md')), false);

  const readme = readFile(path.join(projectRoot, 'README.md'));
  assert.match(readme, /face-gen-tools/);
  assert.match(readme, new RegExp(repoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  const repoReadme = readFile(path.join(repoRoot, 'README.md'));
  assert.match(repoReadme, /face-gen-tools/i);

  const rootAgent = readFile(path.join(repoRoot, 'AGENT.md'));
  assert.match(rootAgent, /node scripts\/agent-memory\.js context/);
  assert.match(rootAgent, /vault/i);
});

test('context reads repo and vault files from a nested directory', () => {
  const root = makeTempDir('agent-bootstrap-context-');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'src', 'deep');
  const vaultRoot = path.join(root, 'vault');
  const projectRoot = path.join(vaultRoot, 'Projects', 'demo-project');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });
  fs.mkdirSync(projectRoot, { recursive: true });
  writeFile(path.join(repoRoot, 'AGENT.md'), '# Repo AGENT\n');
  writeFile(path.join(vaultRoot, 'AGENTS.md'), '# Vault AGENTS\n');
  writeFile(path.join(projectRoot, 'README.md'), '# Project README\n');
  writeFile(path.join(projectRoot, 'Tasks.md'), '# Tasks\n');
  writeFile(path.join(repoRoot, 'vault.config.json'), JSON.stringify({
    vault_root: vaultRoot,
    project_slug: 'demo-project',
    project_root: projectRoot,
    tasks_file: 'Tasks.md',
    decisions_file: 'Decisions.md',
    research_dir: 'Research',
    notes_dir: 'Notes'
  }, null, 2));

  const result = runCli(['context'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Repo AGENT/);
  assert.match(result.stdout, /Vault AGENTS/);
  assert.match(result.stdout, /Project README/);
  assert.match(result.stdout, /# Tasks/);
});

test('memory task appends to project tasks from nested repo path', () => {
  const root = makeTempDir('agent-bootstrap-memory-');
  const repoRoot = path.join(root, 'repo');
  const nested = path.join(repoRoot, 'internal');
  const vaultRoot = path.join(root, 'vault');
  const projectRoot = path.join(vaultRoot, 'Projects', 'demo-project');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(nested, { recursive: true });
  fs.mkdirSync(projectRoot, { recursive: true });
  writeFile(path.join(projectRoot, 'Tasks.md'), '# Tasks\n');
  writeFile(path.join(projectRoot, 'Decisions.md'), '# Decisions\n');
  writeFile(path.join(repoRoot, 'vault.config.json'), JSON.stringify({
    vault_root: vaultRoot,
    project_slug: 'demo-project',
    project_root: projectRoot,
    tasks_file: 'Tasks.md',
    decisions_file: 'Decisions.md',
    research_dir: 'Research',
    notes_dir: 'Notes'
  }, null, 2));

  const result = runCli(['memory', 'task', 'Append from global CLI'], { configHome, cwd: nested });
  assert.equal(result.status, 0, result.stderr);

  const tasks = readFile(path.join(projectRoot, 'Tasks.md'));
  assert.match(tasks, /Append from global CLI/);
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

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const readme = readFile(path.join(repoRoot, 'README.md'));
  assert.match(readme, /Keep this content\./);
  assert.doesNotMatch(readme, /VS Code friendly agent workspace layout/i);
  assert.ok(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'planner.md')));
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'AGENT.md')), false);
});

test('post-commit hook writes a durable worklog note into the vault', () => {
  const root = makeTempDir('agent-bootstrap-hook-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
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

test('new command bootstraps a typed project and registers it', () => {
  const root = makeTempDir('agent-bootstrap-new-');
  const vaultRoot = path.join(root, 'vault');
  const workspaceRoot = path.join(root, 'workspace');
  const configHome = path.join(root, 'config-home');
  const repoRoot = path.join(workspaceRoot, 'shop-web');

  fs.mkdirSync(workspaceRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['new', 'web', repoRoot], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);

  const repoConfig = JSON.parse(readFile(path.join(repoRoot, 'vault.config.json')));
  assert.equal(repoConfig.project_type, 'web');

  const rootAgent = readFile(path.join(repoRoot, 'AGENT.md'));
  assert.match(rootAgent, /Project type: web/i);

  result = runCli(['projects', 'list'], { configHome, cwd: workspaceRoot });
  assert.equal(result.status, 0, result.stderr);

  const projects = parseJson(result.stdout);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].projectType, 'web');
  assert.equal(projects[0].repoRoot, repoRoot);
});

test('doctor reports healthy repo state and sync restores generated files', () => {
  const root = makeTempDir('agent-bootstrap-doctor-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['new', 'tool', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['doctor'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const doctor = parseJson(result.stdout);
  assert.equal(doctor.ok, true);
  assert.equal(doctor.repo.projectType, 'tool');
  assert.equal(doctor.checks.vaultConfig, true);
  assert.equal(doctor.checks.agentFile, true);
  assert.equal(doctor.checks.githubTemplate, true);
  assert.equal(doctor.checks.docs, true);
  assert.equal(doctor.checks.plans, true);

  const deletedPath = path.join(repoRoot, 'docs', 'system-architecture.md');
  fs.rmSync(deletedPath, { force: true });
  assert.equal(fs.existsSync(deletedPath), false);

  result = runCli(['sync'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(deletedPath), true);
});

test('typed bootstrap seeds kit metadata and a type-aware project map', () => {
  const root = makeTempDir('agent-bootstrap-project-map-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['new', 'web', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const repoConfig = JSON.parse(readFile(path.join(repoRoot, 'vault.config.json')));
  assert.equal(typeof repoConfig.kit_version, 'string');
  assert.match(repoConfig.kit_version, /^\d+\.\d+\.\d+/);

  const projectMap = readFile(path.join(repoRoot, 'docs', 'project-map.md'));
  assert.match(projectMap, /Project map/i);
  assert.match(projectMap, /routes/i);
  assert.match(projectMap, /deployment/i);
});

test('update restores repo-local managed assets without clobbering a custom README', () => {
  const root = makeTempDir('agent-bootstrap-update-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['new', 'tool', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  writeFile(path.join(repoRoot, 'README.md'), '# Custom README\n\nKeep my repo intro.\n');
  fs.rmSync(path.join(repoRoot, '.github', 'agents', 'planner.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'scripts', 'agent-memory.js'), { force: true });

  result = runCli(['update'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const updateReport = parseJson(result.stdout);
  assert.equal(updateReport.action, 'update');
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'agents', 'planner.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'scripts', 'agent-memory.js')), true);
  assert.match(readFile(path.join(repoRoot, 'README.md')), /Keep my repo intro\./);
});

test('migrate upgrades a legacy repo into the single-root-AGENT kit layout', () => {
  const root = makeTempDir('agent-bootstrap-migrate-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'legacy-repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(path.join(repoRoot, '.github'), { recursive: true });
  writeFile(path.join(repoRoot, 'README.md'), '# Legacy README\n\nDo not overwrite this.\n');
  writeFile(path.join(repoRoot, 'AGENTS.md'), '# Legacy root AGENTS\n');
  writeFile(path.join(repoRoot, '.github', 'AGENT.md'), '# Legacy github AGENT\n');

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['migrate', repoRoot, '--type', 'api'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const migrateReport = parseJson(result.stdout);
  assert.equal(migrateReport.action, 'migrate');
  assert.equal(fs.existsSync(path.join(repoRoot, 'vault.config.json')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'AGENT.md')), true);
  assert.equal(fs.existsSync(path.join(repoRoot, 'AGENTS.md')), false);
  assert.equal(fs.existsSync(path.join(repoRoot, '.github', 'AGENT.md')), false);
  assert.match(readFile(path.join(repoRoot, 'README.md')), /Do not overwrite this\./);
});

test('doctor reports actionable missing paths and suggested repair commands', () => {
  const root = makeTempDir('agent-bootstrap-doctor-actionable-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['new', 'desktop', repoRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  fs.rmSync(path.join(repoRoot, '.github', 'agents', 'planner.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'docs', 'project-map.md'), { force: true });
  fs.rmSync(path.join(repoRoot, 'scripts', 'agent-memory.js'), { force: true });

  result = runCli(['doctor'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const doctor = parseJson(result.stdout);
  assert.equal(doctor.ok, false);
  assert.equal(doctor.checks.runtimeScript, false);
  assert.equal(doctor.checks.projectMap, false);
  assert.match(doctor.repo.kitVersion, /^\d+\.\d+\.\d+/);
  assert.ok(doctor.missing.repoPaths.includes('.github/agents/planner.md'));
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

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
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

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
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

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli([], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['memory', 'decision', 'Use a single runtime bridge', '--title', 'Runtime bridge'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  result = runCli(['memory', 'research', 'Shared routing strategy for future projects', '--title', 'Routing strategy'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);

  const indexPath = path.join(vaultRoot, 'Projects', 'repo', 'Artifacts', 'memory-index.json');
  assert.equal(fs.existsSync(indexPath), true);

  const index = JSON.parse(readFile(indexPath));
  assert.equal(index.project.slug, 'repo');
  assert.equal(index.recent.decisions[0].title, 'Runtime bridge');
  assert.equal(index.recent.research[0].title, 'Routing strategy');

  result = runCli(['context'], { configHome, cwd: repoRoot });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Project Memory Index/);
  assert.match(result.stdout, /Runtime bridge/);
  assert.match(result.stdout, /Routing strategy/);
});

test('daily note logging deduplicates repeated note writes with the same title', () => {
  const root = makeTempDir('agent-bootstrap-daily-dedupe-');
  const vaultRoot = path.join(root, 'vault');
  const repoRoot = path.join(root, 'repo');
  const configHome = path.join(root, 'config-home');
  const today = getTodayString();

  fs.mkdirSync(repoRoot, { recursive: true });

  let result = runCli(['config', 'set-vault', vaultRoot], { configHome, cwd: repoRoot });
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
    ? `npm install -g "${tarballPath}" --prefix "${prefix}"`
    : `npm install -g '${tarballPath}' --prefix '${prefix}'`;

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
      'config',
      'get',
    ], {
      cwd: root,
      encoding: 'utf8',
    })
    : spawnSync(path.join(prefix, 'bin', 'agent-bootstrap'), ['config', 'get'], {
      cwd: root,
      encoding: 'utf8',
    });

  assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
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
    ? `npm install -g "${tarballPath}" --prefix "${prefix}"`
    : `npm install -g '${tarballPath}' --prefix '${prefix}'`;

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
      'help',
    ], {
      cwd: root,
      encoding: 'utf8',
    })
    : spawnSync(path.join(prefix, 'bin', 'agent-bootstrap'), ['help'], {
      cwd: root,
      encoding: 'utf8',
    });

  assert.equal(smoke.status, 0, smoke.stderr || smoke.stdout);
  assert.match(smoke.stdout, /agent-bootstrap setup/);
});
