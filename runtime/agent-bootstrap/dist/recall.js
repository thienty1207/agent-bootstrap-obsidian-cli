"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecallIndexPath = getRecallIndexPath;
exports.buildRecallIndex = buildRecallIndex;
exports.recallProjectMemory = recallProjectMemory;
exports.formatRecallResults = formatRecallResults;
exports.formatAutoRecallContext = formatAutoRecallContext;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const fs_utils_1 = require("./fs-utils");
const vault_1 = require("./vault");
const date_1 = require("./date");
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
const CONCEPT_ALIASES = {
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
function getRecallIndexPath(projectRoot) {
    return node_path_1.default.join(projectRoot, 'Artifacts', 'recall-index.json');
}
function compactPreview(value, maxLength = 220) {
    const singleLine = value.replace(/\s+/g, ' ').trim();
    return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength - 3)}...` : singleLine;
}
function normalizeForSearch(value) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
}
function tokenize(value) {
    return normalizeForSearch(value)
        .split(/[^a-z0-9_./-]+/g)
        .map((token) => token.trim())
        .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}
function extractConcepts(value) {
    const normalized = normalizeForSearch(value).replace(/\s+/g, ' ').trim();
    const tokenSet = new Set(tokenize(value));
    const concepts = new Set();
    for (const [concept, aliases] of Object.entries(CONCEPT_ALIASES)) {
        for (const alias of aliases) {
            const normalizedAlias = normalizeForSearch(alias).replace(/\s+/g, ' ').trim();
            const aliasTokens = normalizedAlias.split(/\s+/g).filter(Boolean);
            if (normalized.includes(normalizedAlias)
                || aliasTokens.every((token) => tokenSet.has(token))) {
                concepts.add(concept);
                break;
            }
        }
    }
    return [...concepts].sort();
}
function titleFromMarkdown(filePath, content) {
    const heading = content.match(/^#\s+(.+)$/m);
    return heading ? heading[1].trim() : node_path_1.default.basename(filePath, node_path_1.default.extname(filePath));
}
function documentKindFromPath(config, filePath) {
    const relativeProjectPath = node_path_1.default.relative(config.project_root, filePath).replace(/\\/g, '/');
    const relativeVaultPath = node_path_1.default.relative(config.vault_root, filePath).replace(/\\/g, '/');
    if (relativeProjectPath === 'Tasks.md')
        return 'task';
    if (relativeProjectPath === 'Decisions.md')
        return 'decision';
    if (relativeProjectPath === 'Facts.md')
        return 'fact';
    if (relativeProjectPath === 'Open Questions.md')
        return 'question';
    if (relativeProjectPath === 'Handoff.md')
        return 'handoff';
    if (relativeProjectPath.startsWith('Research/'))
        return 'research';
    if (relativeProjectPath.startsWith('Notes/'))
        return 'note';
    if (relativeProjectPath.startsWith('Sessions/'))
        return 'session';
    if (relativeVaultPath.startsWith('Daily/'))
        return 'daily';
    return 'memory';
}
function recentMarkdownFiles(dirPath, limit = MAX_MARKDOWN_FILES_PER_DIR, recursive = false) {
    if (!node_fs_1.default.existsSync(dirPath)) {
        return [];
    }
    const files = [];
    const stack = [dirPath];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const entryPath = node_path_1.default.join(current, entry.name);
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
    files.sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs);
    return files.slice(0, limit);
}
function collectRecallFilePaths(config) {
    const candidates = [
        node_path_1.default.join(config.project_root, 'README.md'),
        node_path_1.default.join(config.project_root, config.tasks_file),
        node_path_1.default.join(config.project_root, config.decisions_file),
        node_path_1.default.join(config.project_root, config.facts_file || 'Facts.md'),
        node_path_1.default.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
        node_path_1.default.join(config.project_root, config.handoff_file || 'Handoff.md'),
        node_path_1.default.join(config.project_root, 'Artifacts', 'session-summary.md'),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, config.research_dir)),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, config.notes_dir)),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, 'Sessions'), MAX_MARKDOWN_FILES_PER_DIR, true),
        ...recentMarkdownFiles(node_path_1.default.join(config.vault_root, 'Daily'), 8),
    ];
    return [...new Set(candidates)].filter((filePath) => node_fs_1.default.existsSync(filePath));
}
function createRecallDocument(config, filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath);
    if (!content || !content.trim()) {
        return null;
    }
    const stat = node_fs_1.default.statSync(filePath);
    const title = titleFromMarkdown(filePath, content);
    const kind = documentKindFromPath(config, filePath);
    const tokens = tokenize(`${title}\n${content}`);
    const concepts = extractConcepts(`${kind}\n${node_path_1.default.relative(config.project_root, filePath)}\n${title}\n${content}`);
    return {
        id: node_path_1.default.relative(config.vault_root, filePath).replace(/\\/g, '/'),
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
function buildRecallIndex(config) {
    const documents = collectRecallFilePaths(config)
        .map((filePath) => createRecallDocument(config, filePath))
        .filter((document) => Boolean(document));
    const index = {
        mode: 'hybrid',
        project: {
            slug: config.project_slug,
            projectType: config.project_type,
            generatedAt: (0, date_1.getIsoTimestamp)(),
        },
        documents: documents.map(({ content: _content, tokens: _tokens, ...document }) => document),
    };
    const indexPath = getRecallIndexPath(config.project_root);
    (0, fs_utils_1.ensureDir)(node_path_1.default.dirname(indexPath));
    node_fs_1.default.writeFileSync(indexPath, JSON.stringify(index, null, 2));
    return { index, documents };
}
function termFrequency(tokens, term) {
    return tokens.reduce((count, token) => count + (token === term ? 1 : 0), 0);
}
function scoreDocuments(query, documents) {
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
function snippetForTerms(content, terms, concepts = []) {
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
function recallProjectMemory(config, query, limit = DEFAULT_RECALL_LIMIT) {
    const { documents } = buildRecallIndex(config);
    return scoreDocuments(query, documents).slice(0, limit);
}
function readRecallIndexDocumentCount(config) {
    const raw = (0, fs_utils_1.readIfExists)(getRecallIndexPath(config.project_root));
    if (!raw) {
        return 0;
    }
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.documents) ? parsed.documents.length : 0;
    }
    catch {
        return 0;
    }
}
function relativeMemoryPath(config, filePath) {
    if (filePath.startsWith(config.project_root)) {
        return node_path_1.default.relative(config.project_root, filePath).replace(/\\/g, '/');
    }
    return node_path_1.default.relative(config.vault_root, filePath).replace(/\\/g, '/');
}
function formatRecallResults(config, query, results) {
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
function flattenRecentMemory(records) {
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
function formatAutoRecallContext(config, limit = 5) {
    const { index } = buildRecallIndex(config);
    const memoryIndex = (0, vault_1.readProjectMemoryIndex)(config.project_root, config.project_slug, config.project_type);
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
    }
    else {
        for (const item of recent) {
            const source = item.path ? ` (source: ${relativeMemoryPath(config, item.path)})` : '';
            lines.push(`- ${item.kind}: ${item.title} - ${item.preview}${source}`);
        }
    }
    lines.push('');
    return lines.join('\n');
}
