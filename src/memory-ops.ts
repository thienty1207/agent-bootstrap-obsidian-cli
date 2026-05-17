import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { resolveRepoRoot, readRepoConfig, type RepoConfig } from './context';
import { ensureDir, readIfExists, writeFile } from './fs-utils';
import {
  appendDailyLog,
  buildMemoryLogMarker,
  createMemoryIndexRecord,
  formatProjectMemoryIndex,
  getProjectMemoryIndexPath,
  readProjectMemoryIndex,
  updateProjectMemoryIndex,
} from './vault';
import { getIsoTimestamp, getTodayString } from './date';
import {
  buildRecallIndex,
  formatRecallResults,
  getRecallIndexPath,
  recallProjectMemory,
} from './recall';

interface MemoryCommandOptions {
  repoRoot?: string;
}

function timestampForFile(): string {
  return getIsoTimestamp().replace(/[:.]/g, '-');
}

function listFiles(dirPath: string, predicate: (fileName: string) => boolean): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath)
    .filter(predicate)
    .map((fileName) => path.join(dirPath, fileName))
    .sort();
}

function latestFile(dirPath: string): string | null {
  if (!fs.existsSync(dirPath)) {
    return null;
  }

  const files = fs.readdirSync(dirPath)
    .map((fileName) => path.join(dirPath, fileName))
    .filter((filePath) => fs.statSync(filePath).isFile())
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);

  return files[0] || null;
}

function countMemoryRecords(config: RepoConfig): number {
  const index = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  return Object.values(index.recent).reduce((total, records) => total + records.length, 0);
}

function getCriticalMemoryPaths(config: RepoConfig): string[] {
  const files = [
    path.join(config.project_root, 'README.md'),
    path.join(config.project_root, config.tasks_file),
    path.join(config.project_root, config.decisions_file),
    path.join(config.project_root, config.facts_file || 'Facts.md'),
    path.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
    path.join(config.project_root, config.handoff_file || 'Handoff.md'),
    getProjectMemoryIndexPath(config.project_root),
    getRecallIndexPath(config.project_root),
    path.join(config.project_root, 'Artifacts', 'session-summary.md'),
  ];

  for (const dirName of [config.research_dir, config.notes_dir, 'Sessions']) {
    const dirPath = path.join(config.project_root, dirName);
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    const stack = [dirPath];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.isFile()) {
          files.push(entryPath);
        }
      }
    }
  }

  return [...new Set(files)].filter((filePath) => fs.existsSync(filePath));
}

function getGitSummary(repoRoot: string): { branch: string; dirty: boolean; status: string[] } {
  try {
    const branch = cp.execFileSync('git', ['branch', '--show-current'], { cwd: repoRoot, encoding: 'utf8' }).trim() || 'unknown';
    const status = cp.execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
    return { branch, dirty: status.length > 0, status };
  } catch {
    return { branch: 'unknown', dirty: false, status: [] };
  }
}

function resolveConfig(options: MemoryCommandOptions): { repoRoot: string; config: RepoConfig } {
  const repoRoot = resolveRepoRoot(options.repoRoot);
  return { repoRoot, config: readRepoConfig(repoRoot) };
}

export function getMemoryStatus(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  const recall = buildRecallIndex(config);
  const sessionsRoot = path.join(config.project_root, 'Sessions');
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  const backupsRoot = path.join(config.project_root, 'Artifacts', 'Backups');
  const latestSession = latestFile(sessionsRoot);

  return {
    ok: fs.existsSync(config.vault_root) && fs.existsSync(config.project_root),
    repoRoot,
    vaultRoot: config.vault_root,
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    checks: {
      vaultRoot: fs.existsSync(config.vault_root),
      projectRoot: fs.existsSync(config.project_root),
      memoryIndex: fs.existsSync(getProjectMemoryIndexPath(config.project_root)),
      recallIndex: fs.existsSync(getRecallIndexPath(config.project_root)),
      sessionsDir: fs.existsSync(sessionsRoot),
    },
    counts: {
      memoryRecords: countMemoryRecords(config),
      recallDocuments: recall.index.documents.length,
      sessions: listFiles(sessionsRoot, (fileName) => fileName.endsWith('.md')).length,
      exports: listFiles(exportsRoot, (fileName) => fileName.endsWith('.json')).length,
      backups: fs.existsSync(backupsRoot)
        ? fs.readdirSync(backupsRoot).filter((entry) => fs.statSync(path.join(backupsRoot, entry)).isDirectory()).length
        : 0,
    },
    latestSession: latestSession
      ? {
        path: latestSession,
        updatedAt: fs.statSync(latestSession).mtime.toISOString(),
      }
      : null,
    commands: [
      'agent-bootstrap context --compact',
      'agent-bootstrap recall "<query>"',
      'agent-bootstrap memory sync-sessions',
      'agent-bootstrap memory export',
      'agent-bootstrap memory backup',
    ],
  };
}

export function syncProjectSessions(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  const sessionsRoot = path.join(config.project_root, 'Sessions');
  ensureDir(sessionsRoot);

  const timestamp = timestampForFile();
  const sessionPath = path.join(sessionsRoot, `${timestamp}.md`);
  const git = getGitSummary(repoRoot);
  const memoryIndex = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const summary = [
    '# Session Summary',
    '',
    `- Project: \`${config.project_slug}\``,
    `- Project type: \`${config.project_type}\``,
    `- Repo: \`${repoRoot}\``,
    `- Updated: \`${getIsoTimestamp()}\``,
    `- Git branch: \`${git.branch}\``,
    `- Git dirty: \`${git.dirty ? 'yes' : 'no'}\``,
    '',
    '## Git Status',
    ...(git.status.length > 0 ? git.status.map((line) => `- ${line}`) : ['- clean or unavailable']),
    '',
    formatProjectMemoryIndex(memoryIndex).trimEnd(),
    '',
  ].join('\n');

  writeFile(sessionPath, summary);
  const sessionSummaryPath = path.join(config.project_root, 'Artifacts', 'session-summary.md');
  writeFile(sessionSummaryPath, summary);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'sessions',
    item: createMemoryIndexRecord({
      kind: 'session',
      title: 'Session summary',
      preview: summary,
      scope: 'project',
      path: sessionPath,
      reason: 'memory sync-sessions',
    }),
  });
  appendDailyLog(
    config.vault_root,
    `Session memory synced for \`${config.project_slug}\``,
    buildMemoryLogMarker({
      kind: 'session',
      projectSlug: config.project_slug,
      title: timestamp,
      scope: 'project',
    }),
  );

  const recall = buildRecallIndex(config);
  return {
    sessionPath,
    sessionSummaryPath,
    recallIndexPath: getRecallIndexPath(config.project_root),
    indexedDocuments: recall.index.documents.length,
  };
}

export function exportProjectMemory(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  const recall = buildRecallIndex(config);
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  ensureDir(exportsRoot);
  const exportPath = path.join(exportsRoot, `agent-bootstrap-memory-${timestampForFile()}.json`);
  const memoryIndex = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const files = getCriticalMemoryPaths(config).map((filePath) => ({
    relativePath: path.relative(config.project_root, filePath).replace(/\\/g, '/'),
    path: filePath,
    content: readIfExists(filePath) || '',
  }));
  const payload = {
    exportedAt: getIsoTimestamp(),
    repoRoot,
    project: {
      slug: config.project_slug,
      type: config.project_type,
      root: config.project_root,
      vaultRoot: config.vault_root,
    },
    memoryIndex,
    recallIndex: recall.index,
    files,
  };

  writeFile(exportPath, JSON.stringify(payload, null, 2));
  return {
    exportPath,
    files: files.length,
    recallDocuments: recall.index.documents.length,
  };
}

export function backupProjectMemory(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  buildRecallIndex(config);
  const backupRoot = path.join(config.project_root, 'Artifacts', 'Backups');
  const backupPath = path.join(backupRoot, timestampForFile());
  ensureDir(backupPath);

  const copied: string[] = [];
  for (const sourcePath of getCriticalMemoryPaths(config)) {
    const relative = path.relative(config.project_root, sourcePath);
    const targetPath = path.join(backupPath, relative);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
    copied.push(relative.replace(/\\/g, '/'));
  }

  const manifestPath = path.join(backupPath, 'manifest.json');
  writeFile(manifestPath, JSON.stringify({
    createdAt: getIsoTimestamp(),
    repoRoot,
    vaultRoot: config.vault_root,
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    files: copied,
    note: 'Plain-file backup; zip compression is intentionally not required.',
  }, null, 2));

  return {
    backupPath,
    manifestPath,
    files: copied.length,
  };
}

export function runRecall(options: MemoryCommandOptions & { query: string; limit?: number }): string {
  const { config } = resolveConfig(options);
  const results = recallProjectMemory(config, options.query, options.limit);
  return formatRecallResults(config, options.query, results);
}

export function runMemoryCommand(subcommand: string, options: MemoryCommandOptions = {}): Record<string, unknown> {
  switch (subcommand) {
    case 'status':
      return getMemoryStatus(options);
    case 'sync-sessions':
      return syncProjectSessions(options);
    case 'export':
      return exportProjectMemory(options);
    case 'backup':
      return backupProjectMemory(options);
    default:
      throw new Error('Unknown memory command. Use: status, sync-sessions, export, backup.');
  }
}

export function syncSessionsFromConfig(repoRoot: string, config: RepoConfig): string {
  const sessionsRoot = path.join(config.project_root, 'Sessions');
  ensureDir(sessionsRoot);
  const timestamp = timestampForFile();
  const sessionPath = path.join(sessionsRoot, `${timestamp}.md`);
  const git = getGitSummary(repoRoot);
  const index = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const summary = [
    '# Session Summary',
    '',
    `- Project: \`${config.project_slug}\``,
    `- Updated: \`${getIsoTimestamp()}\``,
    `- Git branch: \`${git.branch}\``,
    `- Git dirty: \`${git.dirty ? 'yes' : 'no'}\``,
    '',
    formatProjectMemoryIndex(index).trimEnd(),
    '',
  ].join('\n');

  writeFile(sessionPath, summary);
  writeFile(path.join(config.project_root, 'Artifacts', 'session-summary.md'), summary);
  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'sessions',
    item: createMemoryIndexRecord({
      kind: 'session',
      title: 'Session summary',
      preview: summary,
      scope: 'project',
      path: sessionPath,
      reason: 'memory compact',
    }),
  });
  buildRecallIndex(config);
  return sessionPath;
}
