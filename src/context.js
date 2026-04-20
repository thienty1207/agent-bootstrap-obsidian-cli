const path = require('node:path');
const { findRepoRoot, readIfExists } = require('./fs-utils');

function readRepoConfig(repoRoot) {
  return JSON.parse(readIfExists(path.join(repoRoot, 'vault.config.json')));
}

function getContext({ repoRoot }) {
  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
  const config = readRepoConfig(resolvedRepoRoot);

  const sections = [
    ['Repo AGENT', path.join(resolvedRepoRoot, 'AGENT.md')],
    ['Repo AGENTS', path.join(resolvedRepoRoot, 'AGENTS.md')],
    ['GitHub AGENT', path.join(resolvedRepoRoot, '.github', 'AGENT.md')],
    ['Vault Bridge', path.join(resolvedRepoRoot, 'docs', 'vault-memory.md')],
    ['Vault AGENTS', path.join(config.vault_root, 'AGENTS.md')],
    ['Project README', path.join(config.project_root, 'README.md')],
    ['Project Tasks', path.join(config.project_root, config.tasks_file)]
  ];

  return sections
    .map(([label, filePath]) => {
      const body = readIfExists(filePath);
      if (!body) {
        return null;
      }

      return `===== ${label} =====\n${body.trimEnd()}\n`;
    })
    .filter(Boolean)
    .join('\n');
}

module.exports = {
  getContext,
  readRepoConfig
};
