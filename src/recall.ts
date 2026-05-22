import fs from 'node:fs';
import path from 'node:path';
import type { RepoConfig } from './context';
import { ensureDir, readIfExists } from './fs-utils';
import { readProjectMemoryIndex, type MemoryIndexRecord } from './vault';
import { getIsoTimestamp } from './date';

export interface RecallIndexDocument {
  id: string;
  kind: string;
  title: string;
  path: string;
  preview: string;
  concepts: string[];
  bytes: number;
  updatedAt: string;
}

export interface RecallIndex {
  mode: 'hybrid';
  project: {
    slug: string;
    projectType: string;
    generatedAt: string;
  };
  documents: RecallIndexDocument[];
}

export interface RecallResult extends RecallIndexDocument {
  score: number;
  snippet: string;
  scoreBreakdown: {
    lexical: number;
    concept: number;
    title: number;
    kind: number;
    recency: number;
  };
}

interface RecallDocument extends RecallIndexDocument {
  content: string;
  tokens: string[];
}

const MAX_MARKDOWN_FILES_PER_DIR = 40;
const DEFAULT_RECALL_LIMIT = 5;
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
  security: [
    'security',
    'secure',
    'bao mat',
    'rls',
    'policy',
    'policies',
    'access control',
    'secret',
    'secrets',
    'authz',
    'authorization',
  ],
  tenant_data: [
    'tenant',
    'tenant isolation',
    'isolation',
    'rls',
    'customer',
    'customers',
    'khach hang',
    'du lieu',
    'du lieu khach hang',
  ],
  auth: [
    'auth',
    'authentication',
    'authorization',
    'login',
    'signin',
    'sign in',
    'dang nhap',
  ],
  database: [
    'database',
    'db',
    'postgres',
    'postgresql',
    'sql',
    'supabase',
    'rls',
  ],
  frontend: [
    'frontend',
    'front end',
    'ui',
    'browser',
    'react',
    'nextjs',
    'next js',
    'css',
  ],
  backend: [
    'backend',
    'back end',
    'api',
    'server',
    'endpoint',
    'rust',
    'go',
    'python',
  ],
  memory: [
    'memory',
    'recall',
    'session',
    'handoff',
    'vault',
    'obsidian',
    'nho',
    'ghi nho',
  ],
};

export function getRecallIndexPath(projectRoot: string): string {
  return path.join(projectRoot, 'Artifacts', 'recall-index.json');
}

function compactPreview(value: string, maxLength = 220): string {
  const singleLine = value.replace(/\s+/g, ' ').trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 3)}...` : singleLine;
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

function extractConcepts(value: string): string[] {
  const normalized = normalizeForSearch(value).replace(/\s+/g, ' ').trim();
  const tokenSet = new Set(tokenize(value));
  const concepts = new Set<string>();

  for (const [concept, aliases] of Object.entries(CONCEPT_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeForSearch(alias).replace(/\s+/g, ' ').trim();
      const aliasTokens = normalizedAlias.split(/\s+/g).filter(Boolean);
      if (
        normalized.includes(normalizedAlias)
        || aliasTokens.every((token) => tokenSet.has(token))
      ) {
        concepts.add(concept);
        break;
      }
    }
  }

  return [...concepts].sort();
}

function titleFromMarkdown(filePath: string, content: string): string {
  const heading = content.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(filePath, path.extname(filePath));
}

function documentKindFromPath(config: RepoConfig, filePath: string): string {
  const normalizedPath = filePath.replace(/\\/g, '/');
  const relativeProjectPath = path.relative(config.project_root, filePath).replace(/\\/g, '/');
  const relativeVaultPath = path.relative(config.vault_root, filePath).replace(/\\/g, '/');

  if (normalizedPath.includes('/docs/superpowers/plans/')) return 'plan';
  if (normalizedPath.includes('/docs/product/')) return 'harness-product';
  if (normalizedPath.includes('/docs/stories/')) return 'harness-story';
  if (normalizedPath.includes('/docs/validation/')) return 'harness-validation';
  if (normalizedPath.includes('/docs/decisions/')) return 'harness-decision';
  if (relativeProjectPath === 'Tasks.md') return 'task';
  if (relativeProjectPath === 'Decisions.md') return 'decision';
  if (relativeProjectPath === 'Facts.md') return 'fact';
  if (relativeProjectPath === 'Open Questions.md') return 'question';
  if (relativeProjectPath === 'Handoff.md') return 'handoff';
  if (relativeProjectPath.startsWith('Plans/')) return 'plan';
  if (relativeProjectPath.startsWith('ProductHarness/Stories/')) return 'harness-story';
  if (relativeProjectPath.startsWith('ProductHarness/Validation/')) return 'harness-validation';
  if (relativeProjectPath.startsWith('ProductHarness/Decisions/')) return 'harness-decision';
  if (relativeProjectPath.startsWith('ProductHarness/')) return 'harness-product';
  if (relativeProjectPath.startsWith('Research/')) return 'research';
  if (relativeProjectPath.startsWith('Notes/')) return 'note';
  if (relativeProjectPath.startsWith('Sessions/')) return 'session';
  if (relativeVaultPath.startsWith('Daily/')) return 'daily';
  return 'memory';
}

function recentMarkdownFiles(dirPath: string, limit = MAX_MARKDOWN_FILES_PER_DIR, recursive = false): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  const files: string[] = [];
  const stack = [dirPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          stack.push(entryPath);
        }
        continue;
      }

      if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(entryPath);
      }
    }
  }

  files.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);

  return files.slice(0, limit);
}

function collectRecallFilePaths(config: RepoConfig, repoRoot?: string): string[] {
  const candidates = [
    path.join(config.project_root, 'README.md'),
    path.join(config.project_root, config.tasks_file),
    path.join(config.project_root, config.decisions_file),
    path.join(config.project_root, config.facts_file || 'Facts.md'),
    path.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
    path.join(config.project_root, config.handoff_file || 'Handoff.md'),
    path.join(config.project_root, 'Artifacts', 'session-summary.md'),
    ...recentMarkdownFiles(path.join(config.project_root, 'Plans'), MAX_MARKDOWN_FILES_PER_DIR, true),
    ...recentMarkdownFiles(path.join(config.project_root, 'ProductHarness'), MAX_MARKDOWN_FILES_PER_DIR, true),
    ...recentMarkdownFiles(path.join(config.project_root, config.research_dir)),
    ...recentMarkdownFiles(path.join(config.project_root, config.notes_dir)),
    ...recentMarkdownFiles(path.join(config.project_root, 'Sessions'), MAX_MARKDOWN_FILES_PER_DIR, true),
    ...recentMarkdownFiles(path.join(config.vault_root, 'Daily'), 8),
  ];
  if (repoRoot) {
    candidates.push(...recentMarkdownFiles(path.join(repoRoot, 'docs', 'superpowers', 'plans'), MAX_MARKDOWN_FILES_PER_DIR, true));
    candidates.push(...recentMarkdownFiles(path.join(repoRoot, 'docs', 'product'), MAX_MARKDOWN_FILES_PER_DIR, true));
    candidates.push(...recentMarkdownFiles(path.join(repoRoot, 'docs', 'stories'), MAX_MARKDOWN_FILES_PER_DIR, true));
    candidates.push(...recentMarkdownFiles(path.join(repoRoot, 'docs', 'validation'), MAX_MARKDOWN_FILES_PER_DIR, true));
    candidates.push(...recentMarkdownFiles(path.join(repoRoot, 'docs', 'decisions'), MAX_MARKDOWN_FILES_PER_DIR, true));
  }

  return [...new Set(candidates)].filter((filePath) => fs.existsSync(filePath));
}

function createRecallDocument(config: RepoConfig, filePath: string): RecallDocument | null {
  const content = readIfExists(filePath);
  if (!content || !content.trim()) {
    return null;
  }

  const stat = fs.statSync(filePath);
  const title = titleFromMarkdown(filePath, content);
  const kind = documentKindFromPath(config, filePath);
  const tokens = tokenize(`${title}\n${content}`);
  const concepts = extractConcepts(`${kind}\n${path.relative(config.project_root, filePath)}\n${title}\n${content}`);

  return {
    id: path.relative(config.vault_root, filePath).replace(/\\/g, '/'),
    kind,
    title,
    path: filePath,
    preview: compactPreview(content),
    concepts,
    bytes: Buffer.byteLength(content, 'utf8'),
    updatedAt: stat.mtime.toISOString(),
    content,
    tokens,
  };
}

export function buildRecallIndex(config: RepoConfig, repoRoot?: string): { index: RecallIndex; documents: RecallDocument[] } {
  const documents = collectRecallFilePaths(config, repoRoot)
    .map((filePath) => createRecallDocument(config, filePath))
    .filter((document): document is RecallDocument => Boolean(document));

  const index: RecallIndex = {
    mode: 'hybrid',
    project: {
      slug: config.project_slug,
      projectType: config.project_type,
      generatedAt: getIsoTimestamp(),
    },
    documents: documents.map(({ content: _content, tokens: _tokens, ...document }) => document),
  };

  const indexPath = getRecallIndexPath(config.project_root);
  ensureDir(path.dirname(indexPath));
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  return { index, documents };
}

function termFrequency(tokens: string[], term: string): number {
  return tokens.reduce((count, token) => count + (token === term ? 1 : 0), 0);
}

function scoreDocuments(query: string, documents: RecallDocument[]): RecallResult[] {
  const queryTerms = [...new Set(tokenize(query))];
  const queryConcepts = extractConcepts(query);
  if ((queryTerms.length === 0 && queryConcepts.length === 0) || documents.length === 0) {
    return [];
  }

  const averageLength = documents.reduce((total, document) => total + document.tokens.length, 0) / documents.length || 1;
  const results = documents.map((document) => {
    const breakdown = {
      lexical: 0,
      concept: 0,
      title: 0,
      kind: 0,
      recency: 0,
    };

    for (const term of queryTerms) {
      const frequency = termFrequency(document.tokens, term);
      if (frequency === 0) {
        continue;
      }

      const matchingDocs = documents.filter((candidate) => candidate.tokens.includes(term)).length;
      const idf = Math.log(1 + ((documents.length - matchingDocs + 0.5) / (matchingDocs + 0.5)));
      const lengthNorm = 1.5 * (1 - 0.75 + 0.75 * (document.tokens.length / averageLength));
      breakdown.lexical += idf * ((frequency * 2.5) / (frequency + lengthNorm));

      if (normalizeForSearch(document.title).includes(term)) {
        breakdown.title += 1.25;
      }
    }

    const matchingConcepts = document.concepts.filter((concept) => queryConcepts.includes(concept));
    breakdown.concept = matchingConcepts.length * 2.25;
    if (queryTerms.includes(document.kind) || queryConcepts.includes(document.kind)) {
      breakdown.kind = 0.75;
    }
    const ageMs = Date.now() - new Date(document.updatedAt).getTime();
    if (Number.isFinite(ageMs) && ageMs >= 0) {
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      breakdown.recency = Math.max(0, 0.35 - Math.min(ageDays, 30) * 0.01);
    }

    const signalScore = breakdown.lexical + breakdown.concept + breakdown.title + breakdown.kind;
    const score = signalScore > 0 ? signalScore + breakdown.recency : 0;
    const { content: _content, tokens: _tokens, ...publicDocument } = document;
    return {
      ...publicDocument,
      score,
      scoreBreakdown: breakdown,
      snippet: snippetForTerms(document.content, queryTerms, matchingConcepts),
    };
  });

  return results
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score);
}

function snippetForTerms(content: string, terms: string[], concepts: string[] = []): string {
  const normalized = normalizeForSearch(content);
  const lexicalHit = terms
    .map((term) => normalized.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const conceptAliases = concepts.flatMap((concept) => CONCEPT_ALIASES[concept] || []);
  const conceptHit = conceptAliases
    .map((alias) => normalized.indexOf(normalizeForSearch(alias)))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const firstHit = lexicalHit ?? conceptHit;

  if (firstHit === undefined) {
    return compactPreview(content);
  }

  const start = Math.max(0, firstHit - 90);
  const end = Math.min(content.length, firstHit + 260);
  const prefix = start > 0 ? '... ' : '';
  const suffix = end < content.length ? ' ...' : '';
  return compactPreview(`${prefix}${content.slice(start, end)}${suffix}`, 360);
}

export function recallProjectMemory(config: RepoConfig, query: string, limit = DEFAULT_RECALL_LIMIT, repoRoot?: string): RecallResult[] {
  const { documents } = buildRecallIndex(config, repoRoot);
  return scoreDocuments(query, documents).slice(0, limit);
}

function readRecallIndexDocumentCount(config: RepoConfig): number {
  const raw = readIfExists(getRecallIndexPath(config.project_root));
  if (!raw) {
    return 0;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RecallIndex>;
    return Array.isArray(parsed.documents) ? parsed.documents.length : 0;
  } catch {
    return 0;
  }
}

function relativeMemoryPath(config: RepoConfig, filePath: string): string {
  if (filePath.startsWith(config.project_root)) {
    return path.relative(config.project_root, filePath).replace(/\\/g, '/');
  }

  return path.relative(config.vault_root, filePath).replace(/\\/g, '/');
}

export function formatRecallResults(config: RepoConfig, query: string, results: RecallResult[]): string {
  if (results.length === 0) {
    const indexedDocuments = readRecallIndexDocumentCount(config);
    return [
      '# Recall Results',
      '',
      `No recall results for \`${query}\`.`,
      '',
      `- Recall mode: hybrid`,
      `- Indexed markdown memory docs: ${indexedDocuments}`,
      '- Try a narrower query with repo terms, feature names, decisions, files, or domain words.',
      '- If memory looks stale, run `agent-bootstrap context --compact` to refresh recall and import matched sessions.',
      '',
    ].join('\n');
  }

  const best = results[0];
  const lines = [
    '# Recall Results',
    '',
    `Query: \`${query}\``,
    '',
    '## One Thing',
    `- ${best.title}: ${best.snippet}`,
    '',
    '## Matches',
  ];

  for (const [index, result] of results.entries()) {
    lines.push(`${index + 1}. ${result.title} [${result.kind}]`);
    lines.push(`   - Source: ${relativeMemoryPath(config, result.path)}`);
    lines.push(`   - Score: ${result.score.toFixed(3)}`);
    lines.push(`   - Preview: ${result.snippet}`);
  }

  lines.push('');
  return lines.join('\n');
}

function flattenRecentMemory(records: {
  tasks: MemoryIndexRecord[];
  decisions: MemoryIndexRecord[];
  research: MemoryIndexRecord[];
  notes: MemoryIndexRecord[];
  facts: MemoryIndexRecord[];
  questions: MemoryIndexRecord[];
  handoffs: MemoryIndexRecord[];
  daily: MemoryIndexRecord[];
  sessions?: MemoryIndexRecord[];
}): MemoryIndexRecord[] {
  return [
    ...(records.sessions || []),
    ...records.handoffs,
    ...records.facts,
    ...records.decisions,
    ...records.tasks,
    ...records.questions,
    ...records.research,
    ...records.notes,
    ...records.daily,
  ].sort((left, right) => right.ts.localeCompare(left.ts));
}

export function formatAutoRecallContext(config: RepoConfig, limit = 5): string {
  const { index } = buildRecallIndex(config);
  const memoryIndex = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const recent = flattenRecentMemory(memoryIndex.recent).slice(0, limit);
  const indexPath = getRecallIndexPath(config.project_root);
  const lines = [
    '# Auto Recall',
    '',
    `- Recall index: \`${indexPath}\``,
    `- Indexed markdown memory docs: ${index.documents.length}`,
    '- Full recall memory bodies are indexed on disk but not loaded into compact context.',
    '',
    '## Recent Durable Memory',
  ];

  if (recent.length === 0) {
    lines.push('- none');
  } else {
    for (const item of recent) {
      const source = item.path ? ` (source: ${relativeMemoryPath(config, item.path)})` : '';
      lines.push(`- ${item.kind}: ${item.title} - ${item.preview}${source}`);
    }
  }

  lines.push('');
  return lines.join('\n');
}
