import path from 'node:path';
import { findRepoRoot, readIfExists } from './fs-utils';

export interface RepoConfig {
  vault_root: string;
  project_slug: string;
  project_root: string;
  project_type: string;
  tasks_file: string;
  decisions_file: string;
  research_dir: string;
  notes_dir: string;
  runtime_script: string;
  hooks_path: string;
  git_initialized: boolean;
  hooks_configured: boolean;
}

export function readRepoConfig(repoRoot: string): RepoConfig {
  const raw = readIfExists(path.join(repoRoot, 'vault.config.json'));
  if (!raw) {
    throw new Error(`Missing vault.config.json in ${repoRoot}`);
  }

  return JSON.parse(raw) as RepoConfig;
}

export function resolveRepoRoot(repoRoot?: string): string {
  return repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
}

export function getContext({ repoRoot }: { repoRoot?: string }): string {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const config = readRepoConfig(resolvedRepoRoot);

  const sections: Array<[string, string]> = [
    ['Repo AGENT', path.join(resolvedRepoRoot, 'AGENT.md')],
    ['Vault Bridge', path.join(resolvedRepoRoot, 'docs', 'vault-memory.md')],
    ['Vault AGENTS', path.join(config.vault_root, 'AGENTS.md')],
    ['Project README', path.join(config.project_root, 'README.md')],
    ['Project Tasks', path.join(config.project_root, config.tasks_file)],
  ];

  return sections
    .map(([label, filePath]) => {
      const body = readIfExists(filePath);
      if (!body) {
        return null;
      }

      return `===== ${label} =====\n${body.trimEnd()}\n`;
    })
    .filter((value): value is string => Boolean(value))
    .join('\n');
}
