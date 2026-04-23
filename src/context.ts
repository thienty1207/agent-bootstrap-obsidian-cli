import path from 'node:path';
import { findRepoRoot, readIfExists } from './fs-utils';
import {
  appendDailyLog,
  createDailyLogMarker,
  ensureDailyNote,
  formatProjectMemoryIndex,
  getDailyNotePath,
  readProjectMemoryIndex,
} from './vault';

export interface RepoConfig {
  vault_root: string;
  project_slug: string;
  project_root: string;
  project_type: string;
  kit_version?: string;
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
  ensureDailyNote(config.vault_root);
  appendDailyLog(
    config.vault_root,
    `Session started for \`${config.project_slug}\``,
    createDailyLogMarker(['session', config.project_slug, new Date().toISOString().slice(0, 13)]),
  );

  const sections: Array<[string, string]> = [
    ['Repo AGENT', path.join(resolvedRepoRoot, 'AGENT.md')],
    ['Vault Bridge', path.join(resolvedRepoRoot, 'docs', 'vault-memory.md')],
    ['Project Map', path.join(resolvedRepoRoot, 'docs', 'project-map.md')],
    ['Repo README', path.join(resolvedRepoRoot, 'README.md')],
    ['Agent Workspace Guide', path.join(resolvedRepoRoot, '.agent', 'README.md')],
    ['Vault AGENTS', path.join(config.vault_root, 'AGENTS.md')],
    ['Project README', path.join(config.project_root, 'README.md')],
    ['Project Tasks', path.join(config.project_root, config.tasks_file)],
    ['Project Decisions', path.join(config.project_root, config.decisions_file)],
    ['Today Daily Note', getDailyNotePath(config.vault_root)],
  ];
  const memoryIndex = formatProjectMemoryIndex(
    readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type),
  );

  return [
    ...sections
      .map(([label, filePath]) => {
        const body = readIfExists(filePath);
        if (!body) {
          return null;
        }

        return `===== ${label} =====\n${body.trimEnd()}\n`;
      })
      .filter((value): value is string => Boolean(value)),
    `===== Project Memory Index =====\n${memoryIndex.trimEnd()}\n`,
  ].join('\n');
}
