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
  assert.ok(fs.existsSync(path.join(repoRoot, 'AGENTS.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, '.github', 'AGENTS.md')) || fs.existsSync(path.join(repoRoot, '.github', 'AGENT.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'docs', 'vault-memory.md')));
  assert.ok(fs.existsSync(path.join(repoRoot, 'vault.config.json')));

  const readme = fs.readFileSync(path.join(projectRoot, 'README.md'), 'utf8');
  assert.match(readme, /face-gen-tools/);
  assert.match(readme, new RegExp(repoRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
  writeFile(path.join(repoRoot, 'AGENTS.md'), '# Repo AGENTS\n');
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
  assert.match(result.stdout, /Repo AGENTS/);
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

  const tasks = fs.readFileSync(path.join(projectRoot, 'Tasks.md'), 'utf8');
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
