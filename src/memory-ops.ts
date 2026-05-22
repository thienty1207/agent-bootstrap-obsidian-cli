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
import {
  describeSessionImportReport,
  getSessionImportStatePath,
  importCodexSessionsForProject,
  readSessionImportState,
} from './session-importer';
import { ensurePlanState, getPlanStatus } from './plan-state';
import { ensureProductHarness, getProductHarnessStatus } from './product-harness';

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

function getCriticalMemoryFiles(config: RepoConfig, repoRoot: string): Array<{ sourcePath: string; relativePath: string }> {
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

  for (const dirPath of [
    path.join(config.project_root, 'Plans'),
    path.join(config.project_root, 'ProductHarness'),
    path.join(repoRoot, 'docs', 'superpowers', 'plans'),
    path.join(repoRoot, 'docs', 'product'),
    path.join(repoRoot, 'docs', 'stories'),
    path.join(repoRoot, 'docs', 'validation'),
    path.join(repoRoot, 'docs', 'decisions'),
  ]) {
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

  return [...new Set(files)]
    .filter((filePath) => fs.existsSync(filePath))
    .map((sourcePath) => {
      if (sourcePath.startsWith(config.project_root)) {
        return {
          sourcePath,
          relativePath: path.relative(config.project_root, sourcePath).replace(/\\/g, '/'),
        };
      }
      return {
        sourcePath,
        relativePath: `Repo/${path.relative(repoRoot, sourcePath).replace(/\\/g, '/')}`,
      };
    });
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

function uniqueValues(values: string[]): string[] {
  return [...new Set(values)];
}

function buildMemoryDiagnostics({
  recallDocuments,
  importState,
}: {
  recallDocuments: number;
  importState: ReturnType<typeof readSessionImportState>;
}): {
  diagnostics: Array<{ level: 'ok' | 'warn'; code: string; message: string }>;
  nextActions: string[];
} {
  const diagnostics: Array<{ level: 'ok' | 'warn'; code: string; message: string }> = [];
  const nextActions = ['agent-bootstrap context --compact'];

  if (recallDocuments > 0) {
    diagnostics.push({
      level: 'ok',
      code: 'recall-index-ready',
      message: `Hybrid recall has ${recallDocuments} indexed markdown memory document${recallDocuments === 1 ? '' : 's'}.`,
    });
    nextActions.push('agent-bootstrap recall "<query>"');
  } else {
    diagnostics.push({
      level: 'warn',
      code: 'recall-index-empty',
      message: 'Hybrid recall has no indexed markdown memory documents yet.',
    });
  }

  if (importState.last_run) {
    diagnostics.push({
      level: 'ok',
      code: 'session-import-ready',
      message: `Session importer last ran at ${importState.last_run.at}; imported ${importState.imported.length} total session note${importState.imported.length === 1 ? '' : 's'}.`,
    });
  } else {
    diagnostics.push({
      level: 'warn',
      code: 'session-import-not-run',
      message: 'Session importer has not recorded a run for this project yet.',
    });
  }

  if (importState.roots_checked.length === 0) {
    nextActions.push('agent-bootstrap memory import-sessions');
  }

  nextActions.push('agent-bootstrap memory backup');
  return { diagnostics, nextActions: uniqueValues(nextActions) };
}

export function getMemoryStatus(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  ensurePlanState(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  const planState = getPlanStatus({ repoRoot, config });
  const productHarness = getProductHarnessStatus({ repoRoot, config });
  const recall = buildRecallIndex(config, repoRoot);
  const sessionsRoot = path.join(config.project_root, 'Sessions');
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  const backupsRoot = path.join(config.project_root, 'Artifacts', 'Backups');
  const latestSession = latestFile(sessionsRoot);
  const importState = readSessionImportState(config);
  const diagnostics = buildMemoryDiagnostics({
    recallDocuments: recall.index.documents.length,
    importState,
  });
  if (planState.current && planState.current.verification === 'not_run') {
    diagnostics.diagnostics.push({
      level: 'warn',
      code: 'active-plan-unverified',
      message: `Active plan "${planState.current.title}" is ${planState.current.status} and has no verification evidence yet.`,
    });
    diagnostics.nextActions.push('agent-bootstrap plan status');
  }
  if (productHarness.proofGaps.length > 0) {
    diagnostics.diagnostics.push({
      level: 'warn',
      code: 'product-harness-proof-gap',
      message: productHarness.proofGaps.join(' '),
    });
    diagnostics.nextActions.push('agent-bootstrap harness status');
  }

  return {
    ok: fs.existsSync(config.vault_root) && fs.existsSync(config.project_root),
    recallMode: recall.index.mode,
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
      sessionImportState: fs.existsSync(getSessionImportStatePath(config.project_root)),
      planState: fs.existsSync(planState.currentPath) && fs.existsSync(planState.vaultCurrentPath),
      productHarness: productHarness.ok,
    },
    counts: {
      memoryRecords: countMemoryRecords(config),
      recallDocuments: recall.index.documents.length,
      sessions: listFiles(sessionsRoot, (fileName) => fileName.endsWith('.md')).length,
      importedSessions: importState.imported.length,
      exports: listFiles(exportsRoot, (fileName) => fileName.endsWith('.json')).length,
      backups: fs.existsSync(backupsRoot)
        ? fs.readdirSync(backupsRoot).filter((entry) => fs.statSync(path.join(backupsRoot, entry)).isDirectory()).length
        : 0,
      plans: planState.counts.total,
      stories: productHarness.counts.stories,
    },
    planState,
    productHarness,
    imports: {
      mode: 'automatic Codex session importer',
      statePath: getSessionImportStatePath(config.project_root),
      rootsChecked: importState.roots_checked,
      importedSessions: importState.imported.length,
      skippedUnmatched: importState.skipped_unmatched,
      skippedDuplicate: importState.skipped_duplicate,
      skippedLowValue: importState.skipped_low_value,
      parseErrors: importState.parse_errors,
      lastImportAt: importState.last_run?.at || null,
    },
    diagnostics: diagnostics.diagnostics,
    nextActions: diagnostics.nextActions,
    latestSession: latestSession
      ? {
        path: latestSession,
        updatedAt: fs.statSync(latestSession).mtime.toISOString(),
      }
      : null,
    commands: [
      'agent-bootstrap context --compact',
      'agent-bootstrap recall "<query>"',
      'agent-bootstrap memory import-sessions',
      'agent-bootstrap memory sync-sessions',
      'agent-bootstrap memory export',
      'agent-bootstrap memory backup',
      'agent-bootstrap harness status',
    ],
  };
}

export function importProjectSessions(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  const report = importCodexSessionsForProject(repoRoot, config, {
    maxFiles: 400,
    maxImports: 32,
  });
  const recall = buildRecallIndex(config, repoRoot);
  const guidance = describeSessionImportReport(report);

  return {
    summary: guidance.summary,
    nextAction: guidance.nextAction,
    imported: report.imported,
    skippedUnmatched: report.skippedUnmatched,
    skippedDuplicate: report.skippedDuplicate,
    skippedLowValue: report.skippedLowValue,
    parseErrors: report.parseErrors,
    rootsChecked: report.rootsChecked,
    scannedFiles: report.scannedFiles,
    statePath: report.statePath,
    importedNotes: report.importedNotes,
    recallMode: recall.index.mode,
    recallDocuments: recall.index.documents.length,
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

  const recall = buildRecallIndex(config, repoRoot);
  return {
    sessionPath,
    sessionSummaryPath,
    recallIndexPath: getRecallIndexPath(config.project_root),
    indexedDocuments: recall.index.documents.length,
  };
}

export function exportProjectMemory(options: MemoryCommandOptions = {}): Record<string, unknown> {
  const { repoRoot, config } = resolveConfig(options);
  ensurePlanState(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  const recall = buildRecallIndex(config, repoRoot);
  const exportsRoot = path.join(config.project_root, 'Artifacts', 'Exports');
  ensureDir(exportsRoot);
  const exportPath = path.join(exportsRoot, `agent-bootstrap-memory-${timestampForFile()}.json`);
  const memoryIndex = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const files = getCriticalMemoryFiles(config, repoRoot).map((file) => ({
    relativePath: file.relativePath,
    path: file.sourcePath,
    content: readIfExists(file.sourcePath) || '',
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
  ensurePlanState(repoRoot, config);
  ensureProductHarness(repoRoot, config);
  buildRecallIndex(config, repoRoot);
  const backupRoot = path.join(config.project_root, 'Artifacts', 'Backups');
  const backupPath = path.join(backupRoot, timestampForFile());
  ensureDir(backupPath);

  const copied: string[] = [];
  for (const file of getCriticalMemoryFiles(config, repoRoot)) {
    const targetPath = path.join(backupPath, file.relativePath);
    ensureDir(path.dirname(targetPath));
    fs.copyFileSync(file.sourcePath, targetPath);
    copied.push(file.relativePath);
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
  const { repoRoot, config } = resolveConfig(options);
  const results = recallProjectMemory(config, options.query, options.limit, repoRoot);
  return formatRecallResults(config, options.query, results);
}

export function runMemoryCommand(subcommand: string, options: MemoryCommandOptions = {}): Record<string, unknown> {
  switch (subcommand) {
    case 'status':
      return getMemoryStatus(options);
    case 'import-sessions':
      return importProjectSessions(options);
    case 'sync-sessions':
      return syncProjectSessions(options);
    case 'export':
      return exportProjectMemory(options);
    case 'backup':
      return backupProjectMemory(options);
    default:
      throw new Error('Unknown memory command. Use: status, import-sessions, sync-sessions, export, backup.');
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
  buildRecallIndex(config, repoRoot);
  return sessionPath;
}
