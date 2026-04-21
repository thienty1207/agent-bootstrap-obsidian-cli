const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const binPath = path.join(__dirname, '..', 'bin', 'agent-bootstrap.js');

function makeTempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
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
