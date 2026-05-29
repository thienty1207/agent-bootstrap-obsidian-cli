import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import type { RepoConfig } from './context';
import { getIsoTimestamp } from './date';
import { ensureDir, readIfExists, writeFile, writeFileIfMissing } from './fs-utils';
import type {
  MemoryConfidence,
  MemoryEngineDocument,
  MemoryEngineIndex,
  MemoryEngineProvider,
  MemoryEngineResult,
  MemoryEngineScope,
} from './memory-engine-types';

const MAX_PROJECT_MARKDOWN = 120;
const MAX_GLOBAL_MARKDOWN = 80;
const MAX_CROSS_PROJECT_MARKDOWN = 40;
const DEFAULT_ENGINE_LIMIT = 5;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const CONCEPT_ALIASES: Record<string, string[]> = {
  security: ['security', 'secure', 'bao mat', 'bảo mật', 'rls', 'policy', 'secret', 'authz', 'permission'],
  tenant_data: ['tenant', 'tenant isolation', 'isolation', 'rls', 'customer', 'khach hang', 'khách hàng', 'du lieu', 'dữ liệu'],
  auth: ['auth', 'authentication', 'authorization', 'login', 'signin', 'sign in', 'dang nhap', 'đăng nhập'],
  database: ['database', 'db', 'postgres', 'postgresql', 'sql', 'supabase', 'migration'],
  frontend: ['frontend', 'front end', 'ui', 'browser', 'react', 'nextjs', 'next js', 'css'],
  backend: ['backend', 'back end', 'api', 'server', 'endpoint', 'rust', 'go', 'python', 'gin'],
  memory: ['memory', 'recall', 'session', 'handoff', 'vault', 'obsidian', 'nho', 'nhớ', 'ghi nho', 'ghi nhớ'],
  proof: ['proof', 'verification', 'verified', 'test passed', 'passed', 'evidence', 'smoke'],
  product: ['product', 'harness', 'story', 'trace', 'friction', 'scope', 'risk'],
};

export interface MemoryEnginePaths {
  root: string;
  indexPath: string;
  statePath: string;
  approvedGlobalPath: string;
  globalCandidatesPath: string;
}

export function getMemoryEnginePaths(vaultRoot: string): MemoryEnginePaths {
  const root = path.join(vaultRoot, 'Artifacts', 'AgentBootstrap');
  return {
    root,
    indexPath: path.join(root, 'memory-engine-index.json'),
    statePath: path.join(root, 'memory-engine-state.json'),
    approvedGlobalPath: path.join(root, 'APPROVED_GLOBAL.md'),
    globalCandidatesPath: path.join(root, 'GLOBAL_CANDIDATES.md'),
  };
}

export function ensureMemoryEngineArtifacts(vaultRoot: string): MemoryEnginePaths {
  const paths = getMemoryEnginePaths(vaultRoot);
  ensureDir(paths.root);
  writeFileIfMissing(paths.approvedGlobalPath, [
    '# Approved Global Memory',
    '',
    'Only cross-project learnings that are confirmed and useful across projects belong here.',
    'AI agents may use entries from this file as verified global memory when a task matches.',
    '',
  ].join('\n'));
  writeFileIfMissing(paths.globalCandidatesPath, [
    '# Global Memory Candidates',
    '',
    'Potential cross-project learnings live here until confirmed. These are not loaded as facts.',
    '',
  ].join('\n'));
  writeFileIfMissing(paths.statePath, JSON.stringify({
    version: 1,
    updatedAt: getIsoTimestamp(),
    provider: 'node',
    lastDiagnostics: [],
  }, null, 2));
  writeFileIfMissing(paths.indexPath, JSON.stringify({
    version: 1,
    mode: 'memory-engine',
    provider: 'node',
    generatedAt: getIsoTimestamp(),
    vaultRoot,
    currentProjectSlug: '',
    documents: [],
    diagnostics: [],
  }, null, 2));
  return paths;
}

function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function tokenize(value: string): string[] {
  return normalizeForSearch(value)
    .split(/[^a-z0-9_./-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

function compactPreview(value: string, maxLength = 360): string {
  const oneLine = value.replace(/\s+/g, ' ').trim();
  return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength - 3)}...` : oneLine;
}

function stripFrontmatter(value: string): string {
  return value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

function extractConcepts(value: string): string[] {
  const normalized = normalizeForSearch(value).replace(/\s+/g, ' ').trim();
  const tokens = new Set(tokenize(value));
  const concepts = new Set<string>();
  for (const [concept, aliases] of Object.entries(CONCEPT_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeForSearch(alias).replace(/\s+/g, ' ').trim();
      const aliasTokens = normalizedAlias.split(/\s+/g).filter(Boolean);
      if (normalized.includes(normalizedAlias) || aliasTokens.every((token) => tokens.has(token))) {
        concepts.add(concept);
        break;
      }
    }
  }
  return [...concepts].sort();
}

function titleFromMarkdown(filePath: string, content: string): string {
  return content.match(/^#\s+(.+)$/m)?.[1]?.trim()
    || content.match(/^##\s+(.+)$/m)?.[1]?.trim()
    || path.basename(filePath, path.extname(filePath));
}

function previewForDocument(content: string, scope: MemoryEngineScope): string {
  if (scope === 'global-approved') {
    const summaries = content.match(/^- Summary:\s+(.+)$/gm)
      ?.map((line) => line.replace(/^- Summary:\s+/, '').trim())
      .filter(Boolean);
    if (summaries?.length) {
      return compactPreview(summaries.slice(-5).join(' '));
    }
  }
  return compactPreview(stripFrontmatter(content));
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function kindFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.includes('/Plans/')) return 'plan';
  if (normalized.includes('/ProductHarness/Traces/')) return 'harness-trace';
  if (normalized.includes('/ProductHarness/Stories/')) return 'harness-story';
  if (normalized.includes('/ProductHarness/Validation/')) return 'harness-validation';
  if (normalized.includes('/ProductHarness/Decisions/')) return 'harness-decision';
  if (normalized.includes('/ProductHarness/')) return 'harness-product';
  if (normalized.includes('/Sessions/')) return 'session';
  if (normalized.includes('/Research/')) return 'research';
  if (normalized.includes('/Notes/')) return 'note';
  if (normalized.endsWith('/Tasks.md')) return 'task';
  if (normalized.endsWith('/Decisions.md')) return 'decision';
  if (normalized.endsWith('/Facts.md')) return 'fact';
  if (normalized.endsWith('/Open Questions.md')) return 'question';
  if (normalized.endsWith('/Handoff.md')) return 'handoff';
  if (normalized.includes('/Daily/')) return 'daily';
  if (normalized.includes('/docs/product/')) return 'harness-product';
  if (normalized.includes('/docs/stories/')) return 'harness-story';
  if (normalized.includes('/docs/superpowers/plans/')) return 'plan';
  return 'memory';
}

function hasProof(content: string): boolean {
  return /proof|verification|verified|test(s)? passed|npm test|go test|cargo test|pytest|smoke/i.test(content);
}

function inferStatus(content: string): string {
  const fields = parseFrontmatter(content);
  if (fields.status) return fields.status;
  if (/status:\s*completed/i.test(content) || /\bcompleted\b/i.test(content)) return 'completed';
  if (/status:\s*interrupted|verification:\s*not_run|not_run/i.test(content)) return 'in_progress';
  if (/status:\s*draft/i.test(content)) return 'draft';
  return 'active';
}

function inferConfidence(content: string, kind: string, scope: MemoryEngineScope): MemoryConfidence {
  if (scope === 'global-approved') return 'high';
  if (/Confidence:\s*high/i.test(content)) return 'high';
  if (/Confidence:\s*low/i.test(content)) return 'low';
  if (hasProof(content) || /status:\s*proof_added|status:\s*completed/i.test(content)) return 'high';
  if (kind === 'question' || kind === 'daily' || kind === 'session' || /status:\s*draft|verification:\s*not_run|interrupted/i.test(content)) return 'low';
  if (scope === 'global-candidate') return 'low';
  return 'medium';
}

function recentMarkdownFiles(dirPath: string, limit: number, recursive = true): string[] {
  if (!fs.existsSync(dirPath)) return [];
  const files: string[] = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive && !['Backups', 'Exports'].includes(entry.name)) stack.push(entryPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith('.md')) files.push(entryPath);
    }
  }
  return files
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .slice(0, limit);
}

function collectCurrentProjectFiles(config: RepoConfig, repoRoot?: string): string[] {
  const files = [
    path.join(config.project_root, 'README.md'),
    path.join(config.project_root, config.tasks_file),
    path.join(config.project_root, config.decisions_file),
    path.join(config.project_root, config.facts_file || 'Facts.md'),
    path.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
    path.join(config.project_root, config.handoff_file || 'Handoff.md'),
    ...recentMarkdownFiles(path.join(config.project_root, 'Plans'), MAX_PROJECT_MARKDOWN),
    ...recentMarkdownFiles(path.join(config.project_root, 'ProductHarness'), MAX_PROJECT_MARKDOWN),
    ...recentMarkdownFiles(path.join(config.project_root, config.research_dir), MAX_PROJECT_MARKDOWN),
    ...recentMarkdownFiles(path.join(config.project_root, config.notes_dir), MAX_PROJECT_MARKDOWN),
    ...recentMarkdownFiles(path.join(config.project_root, 'Sessions'), MAX_PROJECT_MARKDOWN),
  ];
  if (repoRoot) {
    files.push(
      ...recentMarkdownFiles(path.join(repoRoot, 'docs', 'superpowers', 'plans'), MAX_PROJECT_MARKDOWN),
      ...recentMarkdownFiles(path.join(repoRoot, 'docs', 'product'), MAX_PROJECT_MARKDOWN),
      ...recentMarkdownFiles(path.join(repoRoot, 'docs', 'stories'), MAX_PROJECT_MARKDOWN),
      ...recentMarkdownFiles(path.join(repoRoot, 'docs', 'validation'), MAX_PROJECT_MARKDOWN),
      ...recentMarkdownFiles(path.join(repoRoot, 'docs', 'decisions'), MAX_PROJECT_MARKDOWN),
    );
  }
  return [...new Set(files)].filter((filePath) => fs.existsSync(filePath));
}

function collectCrossProjectFiles(config: RepoConfig): string[] {
  const projectsRoot = path.join(config.vault_root, 'Projects');
  if (!fs.existsSync(projectsRoot)) return [];
  const files: string[] = [];
  for (const entry of fs.readdirSync(projectsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === config.project_slug || entry.name === '_template') continue;
    files.push(...recentMarkdownFiles(path.join(projectsRoot, entry.name), MAX_CROSS_PROJECT_MARKDOWN));
  }
  return files;
}

function collectGlobalCandidateFiles(config: RepoConfig, paths: MemoryEnginePaths): string[] {
  return [
    paths.globalCandidatesPath,
    ...recentMarkdownFiles(path.join(config.vault_root, 'Research'), MAX_GLOBAL_MARKDOWN),
    ...recentMarkdownFiles(path.join(config.vault_root, 'Notes'), MAX_GLOBAL_MARKDOWN),
  ].filter((filePath) => fs.existsSync(filePath));
}

function projectSlugFromPath(config: RepoConfig, filePath: string, scope: MemoryEngineScope): string | null {
  if (scope === 'current-project') return config.project_slug;
  const relative = path.relative(path.join(config.vault_root, 'Projects'), filePath);
  if (!relative.startsWith('..') && relative !== '') {
    return relative.split(path.sep)[0] || null;
  }
  return null;
}

function relativePathFor(config: RepoConfig, repoRoot: string | undefined, filePath: string): string {
  if (filePath.startsWith(config.project_root)) return path.relative(config.project_root, filePath).replace(/\\/g, '/');
  if (repoRoot && filePath.startsWith(repoRoot)) return `Repo/${path.relative(repoRoot, filePath).replace(/\\/g, '/')}`;
  return path.relative(config.vault_root, filePath).replace(/\\/g, '/');
}

function createDocument(config: RepoConfig, filePath: string, scope: MemoryEngineScope, repoRoot?: string): MemoryEngineDocument | null {
  const content = readIfExists(filePath);
  if (!content?.trim()) return null;
  const stat = fs.statSync(filePath);
  const kind = kindFromPath(filePath);
  const title = titleFromMarkdown(filePath, content);
  const projectSlug = projectSlugFromPath(config, filePath, scope);
  const status = inferStatus(content);
  return {
    id: `${scope}:${relativePathFor(config, repoRoot, filePath)}`,
    kind,
    title,
    path: filePath,
    relativePath: relativePathFor(config, repoRoot, filePath),
    projectSlug,
    projectType: scope === 'current-project' ? config.project_type : null,
    scope,
    confidence: inferConfidence(content, kind, scope),
    proof: hasProof(content),
    status,
    concepts: extractConcepts(`${scope}\n${kind}\n${title}\n${content}`),
    preview: previewForDocument(content, scope),
    bytes: Buffer.byteLength(content, 'utf8'),
    updatedAt: stat.mtime.toISOString(),
  };
}

function tryRustAccelerator(): { provider: MemoryEngineProvider; diagnostics: string[] } {
  const configured = process.env.AGENT_BOOTSTRAP_RUST_INDEXER;
  const bundled = path.join(__dirname, '..', 'accelerators', 'vault-indexer', 'target', 'release', process.platform === 'win32' ? 'vault-indexer.exe' : 'vault-indexer');
  const binary = configured || (fs.existsSync(bundled) ? bundled : '');
  if (!binary) {
    return { provider: 'node', diagnostics: [] };
  }

  try {
    const result = cp.spawnSync(binary, ['index'], {
      encoding: 'utf8',
      input: JSON.stringify({ probe: true }),
      timeout: 5000,
      shell: process.platform === 'win32' && /\.cmd$/i.test(binary),
    });
    if (result.error || result.status !== 0) {
      return {
        provider: 'node-fallback',
        diagnostics: [`Rust accelerator failed; using Node provider. ${result.error?.message || result.stderr || `exit ${result.status}`}`.trim()],
      };
    }
    const parsed = JSON.parse(result.stdout || '{}') as { diagnostics?: string[] };
    return {
      provider: 'rust',
      diagnostics: parsed.diagnostics || ['Rust accelerator probe succeeded.'],
    };
  } catch (error) {
    return {
      provider: 'node-fallback',
      diagnostics: [`Rust accelerator failed; using Node provider. ${error instanceof Error ? error.message : String(error)}`],
    };
  }
}

export function buildMemoryEngineIndex(config: RepoConfig, repoRoot?: string): MemoryEngineIndex {
  const paths = ensureMemoryEngineArtifacts(config.vault_root);
  const accelerator = tryRustAccelerator();
  const documents = [
    ...collectCurrentProjectFiles(config, repoRoot).map((filePath) => createDocument(config, filePath, 'current-project', repoRoot)),
    createDocument(config, paths.approvedGlobalPath, 'global-approved', repoRoot),
    ...collectGlobalCandidateFiles(config, paths).map((filePath) => createDocument(config, filePath, 'global-candidate', repoRoot)),
    ...collectCrossProjectFiles(config).map((filePath) => createDocument(config, filePath, 'cross-project', repoRoot)),
  ].filter((document): document is MemoryEngineDocument => Boolean(document));

  const index: MemoryEngineIndex = {
    version: 1,
    mode: 'memory-engine',
    provider: accelerator.provider,
    generatedAt: getIsoTimestamp(),
    vaultRoot: config.vault_root,
    currentProjectSlug: config.project_slug,
    documents,
    diagnostics: accelerator.diagnostics,
  };

  writeFile(paths.indexPath, JSON.stringify(index, null, 2));
  writeFile(paths.statePath, JSON.stringify({
    version: 1,
    updatedAt: index.generatedAt,
    provider: index.provider,
    lastDiagnostics: index.diagnostics,
  }, null, 2));
  return index;
}

export function readMemoryEngineIndex(config: RepoConfig): MemoryEngineIndex | null {
  const raw = readIfExists(getMemoryEnginePaths(config.vault_root).indexPath);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MemoryEngineIndex;
  } catch {
    return null;
  }
}

function termFrequency(tokens: string[], term: string): number {
  return tokens.reduce((count, token) => count + (token === term ? 1 : 0), 0);
}

function documentTokens(document: MemoryEngineDocument): string[] {
  return tokenize(`${document.title}\n${document.kind}\n${document.relativePath}\n${document.preview}`);
}

function snippetFor(document: MemoryEngineDocument, terms: string[]): string {
  const normalized = normalizeForSearch(document.preview);
  const hit = terms
    .map((term) => normalized.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  if (hit === undefined) return document.preview;
  return compactPreview(document.preview.slice(Math.max(0, hit - 80), hit + 260), 340);
}

export function searchMemoryEngine(index: MemoryEngineIndex, query: string, limit = DEFAULT_ENGINE_LIMIT): MemoryEngineResult[] {
  const queryTerms = [...new Set(tokenize(query))];
  const queryConcepts = extractConcepts(query);
  const normalizedQuery = normalizeForSearch(query);
  if (queryTerms.length === 0 && queryConcepts.length === 0) return [];

  const tokenized = index.documents.map((document) => ({ document, tokens: documentTokens(document) }));
  const averageLength = tokenized.reduce((total, item) => total + item.tokens.length, 0) / tokenized.length || 1;
  const results = tokenized.map(({ document, tokens }) => {
    const breakdown = {
      lexical: 0,
      concept: 0,
      scope: 0,
      confidence: 0,
      recency: 0,
      proof: 0,
    };
    for (const term of queryTerms) {
      const frequency = termFrequency(tokens, term);
      if (frequency === 0) continue;
      const matchingDocs = tokenized.filter((candidate) => candidate.tokens.includes(term)).length;
      const idf = Math.log(1 + ((tokenized.length - matchingDocs + 0.5) / (matchingDocs + 0.5)));
      const lengthNorm = 1.5 * (1 - 0.75 + 0.75 * (tokens.length / averageLength));
      breakdown.lexical += idf * ((frequency * 2.5) / (frequency + lengthNorm));
    }
    breakdown.concept = document.concepts.filter((concept) => queryConcepts.includes(concept)).length * 1.8;
    if (document.scope === 'current-project') breakdown.scope = 2.5;
    if (document.scope === 'global-approved') breakdown.scope = 1.4;
    if (document.scope === 'global-candidate') breakdown.scope = -2;
    if (document.scope === 'cross-project') {
      const explicitProject = document.projectSlug ? normalizedQuery.includes(normalizeForSearch(document.projectSlug)) : false;
      breakdown.scope = explicitProject ? -0.2 : -20;
    }
    breakdown.confidence = document.confidence === 'high' ? 0.9 : document.confidence === 'medium' ? 0.25 : -0.5;
    breakdown.proof = document.proof ? 0.75 : 0;
    const ageMs = Date.now() - new Date(document.updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0) {
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      breakdown.recency = Math.max(0, 0.35 - Math.min(ageDays, 30) * 0.01);
    }
    const signal = breakdown.lexical + breakdown.concept;
    const score = signal > 0 ? signal + breakdown.scope + breakdown.confidence + breakdown.proof + breakdown.recency : 0;
    return {
      ...document,
      score,
      snippet: snippetFor(document, queryTerms),
      scoreBreakdown: breakdown,
    };
  });
  return results
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function promoteGlobalMemory(config: RepoConfig, summary: string): Record<string, unknown> {
  const paths = ensureMemoryEngineArtifacts(config.vault_root);
  const trimmed = summary.trim();
  if (!trimmed) {
    throw new Error('memory promote-global requires a summary.');
  }
  const existing = readIfExists(paths.approvedGlobalPath) || '# Approved Global Memory\n';
  const entry = [
    '',
    `## ${getIsoTimestamp()}`,
    `- Summary: ${trimmed}`,
    '- Confidence: high',
    '- Scope: global-approved',
    '',
  ].join('\n');
  writeFile(paths.approvedGlobalPath, `${existing.trimEnd()}\n${entry}`);
  return {
    action: 'global-memory-promoted',
    approvedGlobalPath: paths.approvedGlobalPath,
  };
}

export function compactMemoryEngine(config: RepoConfig, repoRoot?: string): Record<string, unknown> {
  const index = buildMemoryEngineIndex(config, repoRoot);
  const paths = ensureMemoryEngineArtifacts(config.vault_root);
  const current = index.documents.filter((document) => document.scope === 'current-project').slice(0, 12);
  const approved = index.documents.filter((document) => document.scope === 'global-approved').slice(0, 5);
  const compactPath = path.join(config.project_root, 'Artifacts', 'memory-engine-compact.md');
  const lines = [
    '# Memory Engine Compact Summary',
    '',
    `- Project: \`${config.project_slug}\``,
    `- Updated: \`${getIsoTimestamp()}\``,
    `- Index: \`${paths.indexPath}\``,
    '',
    '## Current Project Signals',
    ...(current.length ? current.map((document) => `- ${document.kind}: ${document.title} [${document.confidence}] - ${document.preview}`) : ['- none']),
    '',
    '## Approved Global Signals',
    ...(approved.length ? approved.map((document) => `- ${document.title} - ${document.preview}`) : ['- none']),
    '',
  ];
  writeFile(compactPath, lines.join('\n'));
  return {
    action: 'memory-compacted',
    compactPath,
    indexPath: paths.indexPath,
    documents: index.documents.length,
  };
}

export function getMemoryEngineStatus(config: RepoConfig, repoRoot?: string): Record<string, unknown> {
  const index = buildMemoryEngineIndex(config, repoRoot);
  const paths = ensureMemoryEngineArtifacts(config.vault_root);
  const counts = {
    documents: index.documents.length,
    currentProject: index.documents.filter((document) => document.scope === 'current-project').length,
    globalApproved: index.documents.filter((document) => document.scope === 'global-approved').length,
    globalCandidates: index.documents.filter((document) => document.scope === 'global-candidate').length,
    crossProject: index.documents.filter((document) => document.scope === 'cross-project').length,
    highConfidence: index.documents.filter((document) => document.confidence === 'high').length,
  };
  return {
    ok: fs.existsSync(paths.indexPath) && fs.existsSync(paths.approvedGlobalPath) && fs.existsSync(paths.globalCandidatesPath),
    provider: index.provider,
    indexPath: paths.indexPath,
    statePath: paths.statePath,
    approvedGlobalPath: paths.approvedGlobalPath,
    globalCandidatesPath: paths.globalCandidatesPath,
    counts,
    diagnostics: index.diagnostics,
  };
}

export function formatMemoryEngineContext(config: RepoConfig, repoRoot?: string, limit = 5): string {
  const index = buildMemoryEngineIndex(config, repoRoot);
  const approved = index.documents
    .filter((document) => document.scope === 'global-approved' && document.preview.length > 0)
    .slice(0, limit);
  const current = index.documents
    .filter((document) => document.scope === 'current-project' && document.confidence !== 'low')
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
  const paths = getMemoryEnginePaths(config.vault_root);
  return [
    '# Memory Engine',
    '',
    '- Memory firewall: current project memory is preferred; cross-project memory is blocked unless recall has a strong explicit match.',
    '- Vault Markdown remains the source of truth; the engine index is only a cache/mục lục.',
    `- Provider: ${index.provider}`,
    `- Index: \`${paths.indexPath}\``,
    `- Indexed documents: ${index.documents.length}`,
    '',
    '## Current Project Signals',
    ...(current.length ? current.map((document) => `- ${document.kind}: ${document.title} [${document.confidence}] - ${document.preview}`) : ['- none']),
    '',
    '## Approved Global Memory',
    ...(approved.length ? approved.map((document) => `- ${document.title}: ${document.preview}`) : ['- none']),
    '',
  ].join('\n');
}
