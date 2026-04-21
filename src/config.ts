import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir } from './fs-utils';

export interface AppConfig {
  vaultRoot?: string;
  defaultProjectType?: string;
}

export interface RegistryEntry {
  slug: string;
  projectType: string;
  repoRoot: string;
  vaultRoot: string;
  vaultProjectRoot: string;
  updatedAt: string;
}

export function getConfigDir(): string {
  return process.env.AGENT_BOOTSTRAP_CONFIG_HOME || path.join(os.homedir(), '.agent-bootstrap');
}

export function getConfigPath(): string {
  return path.join(getConfigDir(), 'config.json');
}

export function getRegistryPath(): string {
  return path.join(getConfigDir(), 'projects.json');
}

export function loadConfig(): AppConfig {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as AppConfig;
}

export function saveConfig(nextConfig: AppConfig): void {
  ensureDir(getConfigDir());
  fs.writeFileSync(getConfigPath(), JSON.stringify(nextConfig, null, 2));
}

export function loadRegistry(): RegistryEntry[] {
  const registryPath = getRegistryPath();
  if (!fs.existsSync(registryPath)) {
    return [];
  }

  return JSON.parse(fs.readFileSync(registryPath, 'utf8')) as RegistryEntry[];
}

export function saveRegistry(entries: RegistryEntry[]): void {
  ensureDir(getConfigDir());
  fs.writeFileSync(getRegistryPath(), JSON.stringify(entries, null, 2));
}

export function resolveVaultRoot(explicitVaultRoot?: string): string {
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

  throw new Error('No vault root configured. Run "agent-bootstrap config set-vault [path]" first.');
}
