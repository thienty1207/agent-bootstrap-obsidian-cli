import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { RepoConfig } from './context';
import { getIsoTimestamp } from './date';
import { ensureDir, readIfExists, writeFile } from './fs-utils';
import {
  createMemoryIndexRecord,
  updateProjectMemoryIndex,
} from './vault';

type SessionRole = 'user' | 'assistant';

interface SessionEntry {
  role: SessionRole;
  content: string;
}

interface SessionSegment {
  sourcePath: string;
  index: number;
  metadata: Record<string, unknown>;
  raw: string;
  entries: SessionEntry[];
}

interface ImportedSessionRecord {
  sourceKey: string;
  sourcePath: string;
  notePath: string;
  importedAt: string;
  title: string;
}

export interface SessionImportState {
  version: 1;
  projectSlug: string;
  updatedAt: string;
  roots_checked: string[];
  imported: ImportedSessionRecord[];
  skipped_unmatched: number;
  skipped_duplicate: number;
  skipped_low_value: number;
  parse_errors: number;
  last_run?: {
    at: string;
    imported: number;
    skipped_unmatched: number;
    skipped_duplicate: number;
    skipped_low_value: number;
    parse_errors: number;
    roots_checked: string[];
  };
}

export interface SessionImportReport {
  statePath: string;
  rootsChecked: string[];
  scannedFiles: number;
  imported: number;
  skippedUnmatched: number;
  skippedDuplicate: number;
  skippedLowValue: number;
  parseErrors: number;
  importedNotes: string[];
}

interface ImportOptions {
  maxFiles?: number;
  maxImports?: number;
}

const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_IMPORTS = 16;
const SESSION_FILE_EXTENSIONS = new Set(['.jsonl', '.json', '.log', '.txt']);

export function getSessionImportStatePath(projectRoot: string): string {
  return path.join(projectRoot, 'Artifacts', 'session-import-state.json');
}

function emptyState(config: RepoConfig): SessionImportState {
  return {
    version: 1,
    projectSlug: config.project_slug,
    updatedAt: getIsoTimestamp(),
    roots_checked: [],
    imported: [],
    skipped_unmatched: 0,
    skipped_duplicate: 0,
    skipped_low_value: 0,
    parse_errors: 0,
  };
}

export function readSessionImportState(config: RepoConfig): SessionImportState {
  const statePath = getSessionImportStatePath(config.project_root);
  const raw = readIfExists(statePath);
  if (!raw) {
    return emptyState(config);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<SessionImportState>;
    return {
      ...emptyState(config),
      ...parsed,
      version: 1,
      projectSlug: parsed.projectSlug || config.project_slug,
      imported: Array.isArray(parsed.imported) ? parsed.imported : [],
      roots_checked: Array.isArray(parsed.roots_checked) ? parsed.roots_checked : [],
      skipped_unmatched: parsed.skipped_unmatched || 0,
      skipped_duplicate: parsed.skipped_duplicate || 0,
      skipped_low_value: parsed.skipped_low_value || 0,
      parse_errors: parsed.parse_errors || 0,
    };
  } catch {
    return emptyState(config);
  }
}

function writeSessionImportState(config: RepoConfig, state: SessionImportState): void {
  state.updatedAt = getIsoTimestamp();
  writeFile(getSessionImportStatePath(config.project_root), JSON.stringify(state, null, 2));
}

function normalizePathForMatch(value: string): string {
  return path.resolve(value).replace(/\\/g, '/').toLowerCase();
}

function stableHash(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function compactContent(value: string, maxLength = 2400): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 17).trimEnd()}\n...[truncated]` : normalized;
}

export function redactSecrets(value: string): string {
  return value
    .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_SECRET]')
    .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_SECRET]')
    .replace(/\bnpm_[A-Za-z0-9]{20,}\b/g, '[REDACTED_SECRET]')
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_SECRET]')
    .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^"'\s`]+/gi, '$1=[REDACTED_SECRET]');
}

function valueToText(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'text' in item) {
          return valueToText((item as { text: unknown }).text);
        }
        if (item && typeof item === 'object' && 'content' in item) {
          return valueToText((item as { content: unknown }).content);
        }
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  if (value && typeof value === 'object') {
    if ('text' in value) {
      return valueToText((value as { text: unknown }).text);
    }
    if ('content' in value) {
      return valueToText((value as { content: unknown }).content);
    }
  }

  return '';
}

function extractRecordContent(record: Record<string, unknown>): string {
  return valueToText(record.content)
    || valueToText(record.text)
    || valueToText((record.message as Record<string, unknown> | undefined)?.content)
    || valueToText((record.delta as Record<string, unknown> | undefined)?.content);
}

function extractRecordRole(record: Record<string, unknown>): string {
  const role = record.role
    || (record.message as Record<string, unknown> | undefined)?.role
    || record.author
    || record.type;

  return typeof role === 'string' ? role.toLowerCase() : '';
}

function isMetadataRecord(record: Record<string, unknown>): boolean {
  return Boolean(
    record.cwd
      || record.repoRoot
      || record.repo_root
      || record.workspace
      || record.workspaceRoot
      || record.project_root
      || record.project_slug
      || record.type === 'session_meta',
  );
}

function metadataFromRecord(record: Record<string, unknown>): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  for (const key of [
    'cwd',
    'repoRoot',
    'repo_root',
    'workspace',
    'workspaceRoot',
    'project_root',
    'project_slug',
    'projectSlug',
  ]) {
    if (record[key] !== undefined) {
      metadata[key] = record[key];
    }
  }
  return metadata;
}

function isToolNoise(record: Record<string, unknown>, role: string): boolean {
  const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
  return Boolean(
    role === 'system'
      || role === 'developer'
      || role === 'tool'
      || role === 'function'
      || type.includes('tool')
      || type.includes('function_call')
      || type.includes('system')
      || type.includes('developer'),
  );
}

function isUsefulAssistantMessage(content: string): boolean {
  return /decision|handoff|summary|unresolved|question|next|todo|remember|use |implemented|fixed|blocked|chose|decided/i.test(content);
}

function parseJsonLikeLine(line: string): Record<string, unknown> | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    const match = trimmed.match(/\{.*\}/);
    if (!match) {
      return null;
    }

    try {
      const parsed = JSON.parse(match[0]);
      return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }
}

function parseSessionSegments(sourcePath: string, raw: string): { segments: SessionSegment[]; parseErrors: number } {
  const segments: SessionSegment[] = [];
  let current: SessionSegment = {
    sourcePath,
    index: 0,
    metadata: {},
    raw: '',
    entries: [],
  };
  let parseErrors = 0;

  function flush(): void {
    if (current.raw.trim() || current.entries.length > 0 || Object.keys(current.metadata).length > 0) {
      segments.push(current);
    }
    current = {
      sourcePath,
      index: segments.length,
      metadata: {},
      raw: '',
      entries: [],
    };
  }

  for (const line of raw.split(/\r?\n/g)) {
    if (!line.trim()) continue;
    const record = parseJsonLikeLine(line);
    if (!record) {
      parseErrors += 1;
      current.raw += `${line}\n`;
      continue;
    }

    if (isMetadataRecord(record)) {
      if (current.raw.trim() || current.entries.length > 0 || Object.keys(current.metadata).length > 0) {
        flush();
      }
      current.metadata = { ...current.metadata, ...metadataFromRecord(record) };
      current.raw += `${line}\n`;
      continue;
    }

    current.raw += `${line}\n`;
    const role = extractRecordRole(record);
    if (isToolNoise(record, role)) {
      continue;
    }

    const content = compactContent(redactSecrets(extractRecordContent(record)));
    if (!content) {
      continue;
    }

    if (role === 'user') {
      current.entries.push({ role: 'user', content });
    } else if (role === 'assistant' && isUsefulAssistantMessage(content)) {
      current.entries.push({ role: 'assistant', content });
    }
  }

  flush();
  return { segments, parseErrors };
}

function discoverCodexSessionRoots(repoRoot: string): string[] {
  const roots = new Set<string>();
  const envRoot = process.env.AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT;
  if (envRoot) {
    for (const part of envRoot.split(path.delimiter).map((item) => item.trim()).filter(Boolean)) {
      roots.add(path.resolve(part));
    }
  }

  if (roots.size > 0) {
    return [...roots].filter((root) => fs.existsSync(root));
  }

  const codexHome = process.env.CODEX_HOME;
  if (codexHome) {
    for (const child of ['sessions', 'projects', 'history', 'logs']) {
      roots.add(path.join(codexHome, child));
    }
  }

  const homeCodex = path.join(os.homedir(), '.codex');
  for (const candidate of [
    path.join(homeCodex, 'sessions'),
    path.join(homeCodex, 'projects'),
    path.join(homeCodex, 'history'),
    path.join(homeCodex, 'logs'),
    path.join(repoRoot, '.codex', 'sessions'),
  ]) {
    roots.add(candidate);
  }

  return [...roots].filter((root) => fs.existsSync(root));
}

function listSessionFiles(roots: string[], maxFiles: number): string[] {
  const files: string[] = [];
  for (const root of roots) {
    const stack = [root];
    while (stack.length > 0 && files.length < maxFiles) {
      const current = stack.pop();
      if (!current || !fs.existsSync(current)) continue;
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const entryPath = path.join(current, entry.name);
        if (entry.isDirectory()) {
          stack.push(entryPath);
        } else if (entry.isFile() && SESSION_FILE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
          files.push(entryPath);
        }
        if (files.length >= maxFiles) break;
      }
    }
  }

  return files
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .slice(0, maxFiles);
}

function segmentMatchesProject(segment: SessionSegment, repoRoot: string, config: RepoConfig): boolean {
  const normalizedRepo = normalizePathForMatch(repoRoot);
  const raw = `${JSON.stringify(segment.metadata)}\n${segment.raw}`.replace(/\\/g, '/').toLowerCase();
  if (raw.includes(normalizedRepo)) {
    return true;
  }

  const pathFields = ['cwd', 'repoRoot', 'repo_root', 'workspace', 'workspaceRoot', 'project_root'];
  for (const key of pathFields) {
    const value = segment.metadata[key];
    if (typeof value !== 'string') continue;
    const candidate = normalizePathForMatch(value);
    if (candidate === normalizedRepo || candidate.startsWith(`${normalizedRepo}/`)) {
      return true;
    }
  }

  const slug = String(segment.metadata.project_slug || segment.metadata.projectSlug || '').toLowerCase();
  return Boolean(
    slug.length >= 8
      && slug === config.project_slug.toLowerCase()
      && raw.includes(config.project_slug.toLowerCase()),
  );
}

function titleForSegment(segment: SessionSegment): string {
  const assistantDecision = segment.entries.find((entry) => (
    entry.role === 'assistant' && /^decision\s*:/i.test(entry.content)
  ));
  const source = assistantDecision || segment.entries[0];
  if (!source) {
    return 'Imported Codex session';
  }

  return compactContent(source.content.replace(/^decision\s*:\s*/i, ''), 72)
    .replace(/\n/g, ' ')
    || 'Imported Codex session';
}

function formatImportedMarkdown(segment: SessionSegment, repoRoot: string, config: RepoConfig, title: string): string {
  const lines = [
    '# Imported Codex Session',
    '',
    `- Title: ${title}`,
    `- Imported: \`${getIsoTimestamp()}\``,
    `- Project: \`${config.project_slug}\``,
    `- Repo: \`${repoRoot}\``,
    `- Source: \`${segment.sourcePath}\``,
    '',
    '## Clean Transcript',
  ];

  for (const entry of segment.entries) {
    lines.push('');
    lines.push(`### ${entry.role === 'user' ? 'User' : 'Assistant'}`);
    lines.push('');
    lines.push(entry.content);
  }

  lines.push('');
  return lines.join('\n');
}

export function importCodexSessionsForProject(
  repoRoot: string,
  config: RepoConfig,
  options: ImportOptions = {},
): SessionImportReport {
  const rootsChecked = discoverCodexSessionRoots(repoRoot);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxImports = options.maxImports ?? DEFAULT_MAX_IMPORTS;
  const files = listSessionFiles(rootsChecked, maxFiles);
  const state = readSessionImportState(config);
  const importedKeys = new Set(state.imported.map((record) => record.sourceKey));
  const importedNotes: string[] = [];
  const report: SessionImportReport = {
    statePath: getSessionImportStatePath(config.project_root),
    rootsChecked,
    scannedFiles: files.length,
    imported: 0,
    skippedUnmatched: 0,
    skippedDuplicate: 0,
    skippedLowValue: 0,
    parseErrors: 0,
    importedNotes,
  };

  for (const filePath of files) {
    if (report.imported >= maxImports) {
      break;
    }

    const raw = readIfExists(filePath);
    if (!raw) {
      continue;
    }

    const parsed = parseSessionSegments(filePath, raw);
    report.parseErrors += parsed.parseErrors;

    for (const segment of parsed.segments) {
      if (report.imported >= maxImports) {
        break;
      }

      if (!segmentMatchesProject(segment, repoRoot, config)) {
        report.skippedUnmatched += 1;
        continue;
      }

      if (segment.entries.length === 0) {
        report.skippedLowValue += 1;
        continue;
      }

      const sourceKey = `${filePath}#${segment.index}:${stableHash(segment.raw)}`;
      if (importedKeys.has(sourceKey)) {
        report.skippedDuplicate += 1;
        continue;
      }

      const importedRoot = path.join(config.project_root, 'Sessions', 'Imported');
      ensureDir(importedRoot);
      const title = titleForSegment(segment);
      const notePath = path.join(importedRoot, `${getIsoTimestamp().replace(/[:.]/g, '-')}-${stableHash(sourceKey)}.md`);
      const body = redactSecrets(formatImportedMarkdown(segment, repoRoot, config, title));
      writeFile(notePath, body);
      importedNotes.push(notePath);
      importedKeys.add(sourceKey);
      report.imported += 1;
      state.imported.push({
        sourceKey,
        sourcePath: filePath,
        notePath,
        importedAt: getIsoTimestamp(),
        title,
      });
      updateProjectMemoryIndex({
        projectRoot: config.project_root,
        projectSlug: config.project_slug,
        projectType: config.project_type,
        bucket: 'sessions',
        item: createMemoryIndexRecord({
          kind: 'session',
          title,
          preview: body,
          scope: 'project',
          path: notePath,
          reason: 'codex session import',
        }),
      });
    }
  }

  state.roots_checked = rootsChecked;
  state.skipped_unmatched += report.skippedUnmatched;
  state.skipped_duplicate += report.skippedDuplicate;
  state.skipped_low_value += report.skippedLowValue;
  state.parse_errors += report.parseErrors;
  state.last_run = {
    at: getIsoTimestamp(),
    imported: report.imported,
    skipped_unmatched: report.skippedUnmatched,
    skipped_duplicate: report.skippedDuplicate,
    skipped_low_value: report.skippedLowValue,
    parse_errors: report.parseErrors,
    roots_checked: rootsChecked,
  };
  writeSessionImportState(config, state);
  return report;
}

export function formatSessionImportReport(report: SessionImportReport): string {
  return [
    '# Session Import',
    '',
    '- mode: automatic Codex session importer',
    `- roots checked: ${report.rootsChecked.length}`,
    `- session files scanned: ${report.scannedFiles}`,
    `- imported: ${report.imported}`,
    `- skipped unmatched: ${report.skippedUnmatched}`,
    `- skipped duplicate: ${report.skippedDuplicate}`,
    `- skipped low value: ${report.skippedLowValue}`,
    `- parse errors: ${report.parseErrors}`,
    `- state: \`${report.statePath}\``,
    '- Full imported session bodies stay in the vault and are searched through recall.',
    '',
  ].join('\n');
}
