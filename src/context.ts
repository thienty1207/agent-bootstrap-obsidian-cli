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
  facts_file?: string;
  open_questions_file?: string;
  handoff_file?: string;
  research_dir: string;
  notes_dir: string;
  runtime_script: string;
  hooks_path: string;
  git_initialized: boolean;
  hooks_configured: boolean;
}

export function readRepoConfig(repoRoot: string): RepoConfig {
  const config = readOptionalRepoConfig(repoRoot);
  if (!config) {
    throw new Error(`Missing vault.config.json in ${repoRoot}`);
  }

  return config;
}

function readOptionalRepoConfig(repoRoot: string): RepoConfig | null {
  const raw = readIfExists(path.join(repoRoot, 'vault.config.json'));
  return raw ? JSON.parse(raw) as RepoConfig : null;
}

function isContextRoot(candidate: string): boolean {
  return Boolean(
    readIfExists(path.join(candidate, 'vault.config.json'))
      || (
        readIfExists(path.join(candidate, 'AGENTS.md'))
        && readIfExists(path.join(candidate, '.agent', 'INDEX.md'))
      ),
  );
}

function findContextRoot(startPath: string): string {
  let current = path.resolve(startPath);

  while (true) {
    if (isContextRoot(current)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  return findRepoRoot(startPath);
}

export function resolveRepoRoot(repoRoot?: string): string {
  return repoRoot ? findContextRoot(path.resolve(repoRoot)) : findContextRoot(process.cwd());
}

export type ContextMode = 'compact' | 'full';

interface ContextSection {
  label: string;
  filePath: string;
  fullOnly?: boolean;
}

function formatContextManifest({
  mode,
  loaded,
  skipped,
}: {
  mode: ContextMode;
  loaded: ContextSection[];
  skipped: string[];
}): string {
  return [
    '===== Context Manifest =====',
    `Context mode: ${mode}`,
    '',
    'Loaded:',
    ...loaded.map((section) => `- ${section.label}: ${section.filePath}`),
    '',
    'Skipped:',
    ...skipped.map((item) => `- ${item}`),
    '',
  ].join('\n');
}

export function getContext({
  repoRoot,
  mode = 'compact',
  includeWhy = false,
}: {
  repoRoot?: string;
  mode?: ContextMode;
  includeWhy?: boolean;
}): string {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const config = readOptionalRepoConfig(resolvedRepoRoot);
  const sections: ContextSection[] = [
    { label: 'Repo AGENTS', filePath: path.join(resolvedRepoRoot, 'AGENTS.md') },
    { label: 'Agent Routing Index', filePath: path.join(resolvedRepoRoot, '.agent', 'INDEX.md') },
    { label: 'Skills Routing Index', filePath: path.join(resolvedRepoRoot, '.agent', 'skills', 'INDEX.md') },
    { label: 'Vault Bridge', filePath: path.join(resolvedRepoRoot, 'docs', 'vault-memory.md') },
    { label: 'Project Map', filePath: path.join(resolvedRepoRoot, 'docs', 'project-map.md') },
    { label: 'Repo README', filePath: path.join(resolvedRepoRoot, 'README.md') },
    { label: 'Agent Workspace Guide', filePath: path.join(resolvedRepoRoot, '.agent', 'README.md') },
  ];
  const loaded: ContextSection[] = [];
  const skipped: string[] = [
    '.agent/skills/** recursive skill bodies (load only the routed SKILL.md when needed)',
  ];
  if (mode === 'compact') {
    skipped.push('Daily/** daily logs (run `agent-bootstrap context --full` when needed)');
  }
  if (config) {
    ensureDailyNote(config.vault_root);
    appendDailyLog(
      config.vault_root,
      `Session started for \`${config.project_slug}\``,
      createDailyLogMarker(['session', config.project_slug, new Date().toISOString().slice(0, 13)]),
    );
    sections.push(
      { label: 'Vault Init', filePath: path.join(config.vault_root, 'Init.md') },
      { label: 'Vault AGENTS', filePath: path.join(config.vault_root, 'AGENTS.md') },
      { label: 'Project README', filePath: path.join(config.project_root, 'README.md') },
      { label: 'Project Tasks', filePath: path.join(config.project_root, config.tasks_file) },
      { label: 'Project Decisions', filePath: path.join(config.project_root, config.decisions_file) },
      { label: 'Project Facts', filePath: path.join(config.project_root, config.facts_file || 'Facts.md') },
      { label: 'Project Open Questions', filePath: path.join(config.project_root, config.open_questions_file || 'Open Questions.md') },
      { label: 'Project Handoff', filePath: path.join(config.project_root, config.handoff_file || 'Handoff.md') },
      { label: 'Today Daily Note', filePath: getDailyNotePath(config.vault_root), fullOnly: true },
    );
  } else {
    skipped.push('vault.config.json missing; loaded repo-local source context only');
    skipped.push('Vault/project memory files unavailable until `agent-bootstrap setup` and `agent-bootstrap init` run');
  }

  const output = sections
    .map((section) => {
      if (section.fullOnly && mode !== 'full') {
        return null;
      }

      const body = readIfExists(section.filePath);
      if (!body) {
        skipped.push(`${section.label}: ${section.filePath} (missing)`);
        return null;
      }

      loaded.push(section);
      return `===== ${section.label} =====\n${body.trimEnd()}\n`;
    })
    .filter((value): value is string => Boolean(value));

  if (config) {
    const memoryIndex = formatProjectMemoryIndex(
      readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type),
    );
    output.push(`===== Project Memory Index =====\n${memoryIndex.trimEnd()}\n`);
    loaded.push({ label: 'Project Memory Index', filePath: path.join(config.project_root, 'Artifacts', 'memory-index.json') });
  } else {
    output.push([
      '===== Source Repo Context =====',
      'No vault.config.json found. Loaded repo-local instructions only.',
      'Run `agent-bootstrap setup` and `agent-bootstrap init` to enable vault-backed memory.',
      '',
    ].join('\n'));
  }

  if (includeWhy) {
    output.push(formatContextManifest({ mode, loaded, skipped }));
  }

  return output.join('\n');
}
