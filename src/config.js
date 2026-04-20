const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function getConfigDir() {
  return process.env.AGENT_BOOTSTRAP_CONFIG_HOME || path.join(os.homedir(), '.agent-bootstrap');
}

function getConfigPath() {
  return path.join(getConfigDir(), 'config.json');
}

function loadConfig() {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function saveConfig(nextConfig) {
  const configDir = getConfigDir();
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(nextConfig, null, 2));
}

function resolveVaultRoot(explicitVaultRoot) {
  if (explicitVaultRoot) {
    return path.resolve(explicitVaultRoot);
  }

  if (process.env.AGENT_BOOTSTRAP_VAULT_ROOT) {
    return path.resolve(process.env.AGENT_BOOTSTRAP_VAULT_ROOT);
  }

  const config = loadConfig();
  if (config.vaultRoot) {
    return path.resolve(config.vaultRoot);
  }

  throw new Error('No vault root configured. Run "agent-bootstrap config set-vault <path>" first.');
}

module.exports = {
  getConfigPath,
  loadConfig,
  saveConfig,
  resolveVaultRoot
};
