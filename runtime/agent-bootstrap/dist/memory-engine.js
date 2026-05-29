"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMemoryEnginePaths = getMemoryEnginePaths;
exports.ensureMemoryEngineArtifacts = ensureMemoryEngineArtifacts;
exports.buildMemoryEngineIndex = buildMemoryEngineIndex;
exports.readMemoryEngineIndex = readMemoryEngineIndex;
exports.searchMemoryEngine = searchMemoryEngine;
exports.promoteGlobalMemory = promoteGlobalMemory;
exports.compactMemoryEngine = compactMemoryEngine;
exports.getMemoryEngineStatus = getMemoryEngineStatus;
exports.formatMemoryEngineContext = formatMemoryEngineContext;
const node_child_process_1 = __importDefault(require("node:child_process"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
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
const CONCEPT_ALIASES = {
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
function getMemoryEnginePaths(vaultRoot) {
    const root = node_path_1.default.join(vaultRoot, 'Artifacts', 'AgentBootstrap');
    return {
        root,
        indexPath: node_path_1.default.join(root, 'memory-engine-index.json'),
        statePath: node_path_1.default.join(root, 'memory-engine-state.json'),
        approvedGlobalPath: node_path_1.default.join(root, 'APPROVED_GLOBAL.md'),
        globalCandidatesPath: node_path_1.default.join(root, 'GLOBAL_CANDIDATES.md'),
    };
}
function ensureMemoryEngineArtifacts(vaultRoot) {
    const paths = getMemoryEnginePaths(vaultRoot);
    (0, fs_utils_1.ensureDir)(paths.root);
    (0, fs_utils_1.writeFileIfMissing)(paths.approvedGlobalPath, [
        '# Approved Global Memory',
        '',
        'Only cross-project learnings that are confirmed and useful across projects belong here.',
        'AI agents may use entries from this file as verified global memory when a task matches.',
        '',
    ].join('\n'));
    (0, fs_utils_1.writeFileIfMissing)(paths.globalCandidatesPath, [
        '# Global Memory Candidates',
        '',
        'Potential cross-project learnings live here until confirmed. These are not loaded as facts.',
        '',
    ].join('\n'));
    (0, fs_utils_1.writeFileIfMissing)(paths.statePath, JSON.stringify({
        version: 1,
        updatedAt: (0, date_1.getIsoTimestamp)(),
        provider: 'node',
        lastDiagnostics: [],
    }, null, 2));
    (0, fs_utils_1.writeFileIfMissing)(paths.indexPath, JSON.stringify({
        version: 1,
        mode: 'memory-engine',
        provider: 'node',
        generatedAt: (0, date_1.getIsoTimestamp)(),
        vaultRoot,
        currentProjectSlug: '',
        documents: [],
        diagnostics: [],
    }, null, 2));
    return paths;
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
function compactPreview(value, maxLength = 360) {
    const oneLine = value.replace(/\s+/g, ' ').trim();
    return oneLine.length > maxLength ? `${oneLine.slice(0, maxLength - 3)}...` : oneLine;
}
function stripFrontmatter(value) {
    return value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
function extractConcepts(value) {
    const normalized = normalizeForSearch(value).replace(/\s+/g, ' ').trim();
    const tokens = new Set(tokenize(value));
    const concepts = new Set();
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
function titleFromMarkdown(filePath, content) {
    return content.match(/^#\s+(.+)$/m)?.[1]?.trim()
        || content.match(/^##\s+(.+)$/m)?.[1]?.trim()
        || node_path_1.default.basename(filePath, node_path_1.default.extname(filePath));
}
function previewForDocument(content, scope) {
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
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match)
        return {};
    const fields = {};
    for (const line of match[1].split(/\r?\n/)) {
        const separator = line.indexOf(':');
        if (separator === -1)
            continue;
        fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
    return fields;
}
function kindFromPath(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('/Plans/'))
        return 'plan';
    if (normalized.includes('/ProductHarness/Traces/'))
        return 'harness-trace';
    if (normalized.includes('/ProductHarness/Stories/'))
        return 'harness-story';
    if (normalized.includes('/ProductHarness/Validation/'))
        return 'harness-validation';
    if (normalized.includes('/ProductHarness/Decisions/'))
        return 'harness-decision';
    if (normalized.includes('/ProductHarness/'))
        return 'harness-product';
    if (normalized.includes('/Sessions/'))
        return 'session';
    if (normalized.includes('/Research/'))
        return 'research';
    if (normalized.includes('/Notes/'))
        return 'note';
    if (normalized.endsWith('/Tasks.md'))
        return 'task';
    if (normalized.endsWith('/Decisions.md'))
        return 'decision';
    if (normalized.endsWith('/Facts.md'))
        return 'fact';
    if (normalized.endsWith('/Open Questions.md'))
        return 'question';
    if (normalized.endsWith('/Handoff.md'))
        return 'handoff';
    if (normalized.includes('/Daily/'))
        return 'daily';
    if (normalized.includes('/docs/product/'))
        return 'harness-product';
    if (normalized.includes('/docs/stories/'))
        return 'harness-story';
    if (normalized.includes('/docs/superpowers/plans/'))
        return 'plan';
    return 'memory';
}
function hasProof(content) {
    return /proof|verification|verified|test(s)? passed|npm test|go test|cargo test|pytest|smoke/i.test(content);
}
function inferStatus(content) {
    const fields = parseFrontmatter(content);
    if (fields.status)
        return fields.status;
    if (/status:\s*completed/i.test(content) || /\bcompleted\b/i.test(content))
        return 'completed';
    if (/status:\s*interrupted|verification:\s*not_run|not_run/i.test(content))
        return 'in_progress';
    if (/status:\s*draft/i.test(content))
        return 'draft';
    return 'active';
}
function inferConfidence(content, kind, scope) {
    if (scope === 'global-approved')
        return 'high';
    if (/Confidence:\s*high/i.test(content))
        return 'high';
    if (/Confidence:\s*low/i.test(content))
        return 'low';
    if (hasProof(content) || /status:\s*proof_added|status:\s*completed/i.test(content))
        return 'high';
    if (kind === 'question' || kind === 'daily' || kind === 'session' || /status:\s*draft|verification:\s*not_run|interrupted/i.test(content))
        return 'low';
    if (scope === 'global-candidate')
        return 'low';
    return 'medium';
}
function recentMarkdownFiles(dirPath, limit, recursive = true) {
    if (!node_fs_1.default.existsSync(dirPath))
        return [];
    const files = [];
    const stack = [dirPath];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const entryPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                if (recursive && !['Backups', 'Exports'].includes(entry.name))
                    stack.push(entryPath);
                continue;
            }
            if (entry.isFile() && entry.name.endsWith('.md'))
                files.push(entryPath);
        }
    }
    return files
        .sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs)
        .slice(0, limit);
}
function collectCurrentProjectFiles(config, repoRoot) {
    const files = [
        node_path_1.default.join(config.project_root, 'README.md'),
        node_path_1.default.join(config.project_root, config.tasks_file),
        node_path_1.default.join(config.project_root, config.decisions_file),
        node_path_1.default.join(config.project_root, config.facts_file || 'Facts.md'),
        node_path_1.default.join(config.project_root, config.open_questions_file || 'Open Questions.md'),
        node_path_1.default.join(config.project_root, config.handoff_file || 'Handoff.md'),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, 'Plans'), MAX_PROJECT_MARKDOWN),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, 'ProductHarness'), MAX_PROJECT_MARKDOWN),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, config.research_dir), MAX_PROJECT_MARKDOWN),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, config.notes_dir), MAX_PROJECT_MARKDOWN),
        ...recentMarkdownFiles(node_path_1.default.join(config.project_root, 'Sessions'), MAX_PROJECT_MARKDOWN),
    ];
    if (repoRoot) {
        files.push(...recentMarkdownFiles(node_path_1.default.join(repoRoot, 'docs', 'superpowers', 'plans'), MAX_PROJECT_MARKDOWN), ...recentMarkdownFiles(node_path_1.default.join(repoRoot, 'docs', 'product'), MAX_PROJECT_MARKDOWN), ...recentMarkdownFiles(node_path_1.default.join(repoRoot, 'docs', 'stories'), MAX_PROJECT_MARKDOWN), ...recentMarkdownFiles(node_path_1.default.join(repoRoot, 'docs', 'validation'), MAX_PROJECT_MARKDOWN), ...recentMarkdownFiles(node_path_1.default.join(repoRoot, 'docs', 'decisions'), MAX_PROJECT_MARKDOWN));
    }
    return [...new Set(files)].filter((filePath) => node_fs_1.default.existsSync(filePath));
}
function collectCrossProjectFiles(config) {
    const projectsRoot = node_path_1.default.join(config.vault_root, 'Projects');
    if (!node_fs_1.default.existsSync(projectsRoot))
        return [];
    const files = [];
    for (const entry of node_fs_1.default.readdirSync(projectsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === config.project_slug || entry.name === '_template')
            continue;
        files.push(...recentMarkdownFiles(node_path_1.default.join(projectsRoot, entry.name), MAX_CROSS_PROJECT_MARKDOWN));
    }
    return files;
}
function collectGlobalCandidateFiles(config, paths) {
    return [
        paths.globalCandidatesPath,
        ...recentMarkdownFiles(node_path_1.default.join(config.vault_root, 'Research'), MAX_GLOBAL_MARKDOWN),
        ...recentMarkdownFiles(node_path_1.default.join(config.vault_root, 'Notes'), MAX_GLOBAL_MARKDOWN),
    ].filter((filePath) => node_fs_1.default.existsSync(filePath));
}
function projectSlugFromPath(config, filePath, scope) {
    if (scope === 'current-project')
        return config.project_slug;
    const relative = node_path_1.default.relative(node_path_1.default.join(config.vault_root, 'Projects'), filePath);
    if (!relative.startsWith('..') && relative !== '') {
        return relative.split(node_path_1.default.sep)[0] || null;
    }
    return null;
}
function relativePathFor(config, repoRoot, filePath) {
    if (filePath.startsWith(config.project_root))
        return node_path_1.default.relative(config.project_root, filePath).replace(/\\/g, '/');
    if (repoRoot && filePath.startsWith(repoRoot))
        return `Repo/${node_path_1.default.relative(repoRoot, filePath).replace(/\\/g, '/')}`;
    return node_path_1.default.relative(config.vault_root, filePath).replace(/\\/g, '/');
}
function createDocument(config, filePath, scope, repoRoot) {
    const content = (0, fs_utils_1.readIfExists)(filePath);
    if (!content?.trim())
        return null;
    const stat = node_fs_1.default.statSync(filePath);
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
function tryRustAccelerator() {
    const configured = process.env.AGENT_BOOTSTRAP_RUST_INDEXER;
    const bundled = node_path_1.default.join(__dirname, '..', 'accelerators', 'vault-indexer', 'target', 'release', process.platform === 'win32' ? 'vault-indexer.exe' : 'vault-indexer');
    const binary = configured || (node_fs_1.default.existsSync(bundled) ? bundled : '');
    if (!binary) {
        return { provider: 'node', diagnostics: [] };
    }
    try {
        const result = node_child_process_1.default.spawnSync(binary, ['index'], {
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
        const parsed = JSON.parse(result.stdout || '{}');
        return {
            provider: 'rust',
            diagnostics: parsed.diagnostics || ['Rust accelerator probe succeeded.'],
        };
    }
    catch (error) {
        return {
            provider: 'node-fallback',
            diagnostics: [`Rust accelerator failed; using Node provider. ${error instanceof Error ? error.message : String(error)}`],
        };
    }
}
function buildMemoryEngineIndex(config, repoRoot) {
    const paths = ensureMemoryEngineArtifacts(config.vault_root);
    const accelerator = tryRustAccelerator();
    const documents = [
        ...collectCurrentProjectFiles(config, repoRoot).map((filePath) => createDocument(config, filePath, 'current-project', repoRoot)),
        createDocument(config, paths.approvedGlobalPath, 'global-approved', repoRoot),
        ...collectGlobalCandidateFiles(config, paths).map((filePath) => createDocument(config, filePath, 'global-candidate', repoRoot)),
        ...collectCrossProjectFiles(config).map((filePath) => createDocument(config, filePath, 'cross-project', repoRoot)),
    ].filter((document) => Boolean(document));
    const index = {
        version: 1,
        mode: 'memory-engine',
        provider: accelerator.provider,
        generatedAt: (0, date_1.getIsoTimestamp)(),
        vaultRoot: config.vault_root,
        currentProjectSlug: config.project_slug,
        documents,
        diagnostics: accelerator.diagnostics,
    };
    (0, fs_utils_1.writeFile)(paths.indexPath, JSON.stringify(index, null, 2));
    (0, fs_utils_1.writeFile)(paths.statePath, JSON.stringify({
        version: 1,
        updatedAt: index.generatedAt,
        provider: index.provider,
        lastDiagnostics: index.diagnostics,
    }, null, 2));
    return index;
}
function readMemoryEngineIndex(config) {
    const raw = (0, fs_utils_1.readIfExists)(getMemoryEnginePaths(config.vault_root).indexPath);
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function termFrequency(tokens, term) {
    return tokens.reduce((count, token) => count + (token === term ? 1 : 0), 0);
}
function documentTokens(document) {
    return tokenize(`${document.title}\n${document.kind}\n${document.relativePath}\n${document.preview}`);
}
function snippetFor(document, terms) {
    const normalized = normalizeForSearch(document.preview);
    const hit = terms
        .map((term) => normalized.indexOf(term))
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0];
    if (hit === undefined)
        return document.preview;
    return compactPreview(document.preview.slice(Math.max(0, hit - 80), hit + 260), 340);
}
function searchMemoryEngine(index, query, limit = DEFAULT_ENGINE_LIMIT) {
    const queryTerms = [...new Set(tokenize(query))];
    const queryConcepts = extractConcepts(query);
    const normalizedQuery = normalizeForSearch(query);
    if (queryTerms.length === 0 && queryConcepts.length === 0)
        return [];
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
            if (frequency === 0)
                continue;
            const matchingDocs = tokenized.filter((candidate) => candidate.tokens.includes(term)).length;
            const idf = Math.log(1 + ((tokenized.length - matchingDocs + 0.5) / (matchingDocs + 0.5)));
            const lengthNorm = 1.5 * (1 - 0.75 + 0.75 * (tokens.length / averageLength));
            breakdown.lexical += idf * ((frequency * 2.5) / (frequency + lengthNorm));
        }
        breakdown.concept = document.concepts.filter((concept) => queryConcepts.includes(concept)).length * 1.8;
        if (document.scope === 'current-project')
            breakdown.scope = 2.5;
        if (document.scope === 'global-approved')
            breakdown.scope = 1.4;
        if (document.scope === 'global-candidate')
            breakdown.scope = -2;
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
function promoteGlobalMemory(config, summary) {
    const paths = ensureMemoryEngineArtifacts(config.vault_root);
    const trimmed = summary.trim();
    if (!trimmed) {
        throw new Error('memory promote-global requires a summary.');
    }
    const existing = (0, fs_utils_1.readIfExists)(paths.approvedGlobalPath) || '# Approved Global Memory\n';
    const entry = [
        '',
        `## ${(0, date_1.getIsoTimestamp)()}`,
        `- Summary: ${trimmed}`,
        '- Confidence: high',
        '- Scope: global-approved',
        '',
    ].join('\n');
    (0, fs_utils_1.writeFile)(paths.approvedGlobalPath, `${existing.trimEnd()}\n${entry}`);
    return {
        action: 'global-memory-promoted',
        approvedGlobalPath: paths.approvedGlobalPath,
    };
}
function compactMemoryEngine(config, repoRoot) {
    const index = buildMemoryEngineIndex(config, repoRoot);
    const paths = ensureMemoryEngineArtifacts(config.vault_root);
    const current = index.documents.filter((document) => document.scope === 'current-project').slice(0, 12);
    const approved = index.documents.filter((document) => document.scope === 'global-approved').slice(0, 5);
    const compactPath = node_path_1.default.join(config.project_root, 'Artifacts', 'memory-engine-compact.md');
    const lines = [
        '# Memory Engine Compact Summary',
        '',
        `- Project: \`${config.project_slug}\``,
        `- Updated: \`${(0, date_1.getIsoTimestamp)()}\``,
        `- Index: \`${paths.indexPath}\``,
        '',
        '## Current Project Signals',
        ...(current.length ? current.map((document) => `- ${document.kind}: ${document.title} [${document.confidence}] - ${document.preview}`) : ['- none']),
        '',
        '## Approved Global Signals',
        ...(approved.length ? approved.map((document) => `- ${document.title} - ${document.preview}`) : ['- none']),
        '',
    ];
    (0, fs_utils_1.writeFile)(compactPath, lines.join('\n'));
    return {
        action: 'memory-compacted',
        compactPath,
        indexPath: paths.indexPath,
        documents: index.documents.length,
    };
}
function getMemoryEngineStatus(config, repoRoot) {
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
        ok: node_fs_1.default.existsSync(paths.indexPath) && node_fs_1.default.existsSync(paths.approvedGlobalPath) && node_fs_1.default.existsSync(paths.globalCandidatesPath),
        provider: index.provider,
        indexPath: paths.indexPath,
        statePath: paths.statePath,
        approvedGlobalPath: paths.approvedGlobalPath,
        globalCandidatesPath: paths.globalCandidatesPath,
        counts,
        diagnostics: index.diagnostics,
    };
}
function formatMemoryEngineContext(config, repoRoot, limit = 5) {
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
