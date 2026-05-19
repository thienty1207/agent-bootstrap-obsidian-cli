"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSessionImportStatePath = getSessionImportStatePath;
exports.readSessionImportState = readSessionImportState;
exports.redactSecrets = redactSecrets;
exports.importCodexSessionsForProject = importCodexSessionsForProject;
exports.describeSessionImportReport = describeSessionImportReport;
exports.formatSessionImportReport = formatSessionImportReport;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
const vault_1 = require("./vault");
const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_IMPORTS = 16;
const SESSION_FILE_EXTENSIONS = new Set(['.jsonl', '.json', '.log', '.txt']);
function getSessionImportStatePath(projectRoot) {
    return node_path_1.default.join(projectRoot, 'Artifacts', 'session-import-state.json');
}
function emptyState(config) {
    return {
        version: 1,
        projectSlug: config.project_slug,
        updatedAt: (0, date_1.getIsoTimestamp)(),
        roots_checked: [],
        imported: [],
        skipped_unmatched: 0,
        skipped_duplicate: 0,
        skipped_low_value: 0,
        parse_errors: 0,
    };
}
function readSessionImportState(config) {
    const statePath = getSessionImportStatePath(config.project_root);
    const raw = (0, fs_utils_1.readIfExists)(statePath);
    if (!raw) {
        return emptyState(config);
    }
    try {
        const parsed = JSON.parse(raw);
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
    }
    catch {
        return emptyState(config);
    }
}
function writeSessionImportState(config, state) {
    state.updatedAt = (0, date_1.getIsoTimestamp)();
    (0, fs_utils_1.writeFile)(getSessionImportStatePath(config.project_root), JSON.stringify(state, null, 2));
}
function normalizePathForMatch(value) {
    return node_path_1.default.resolve(value).replace(/\\/g, '/').toLowerCase();
}
function stableHash(value) {
    return node_crypto_1.default.createHash('sha256').update(value).digest('hex').slice(0, 16);
}
function compactContent(value, maxLength = 2400) {
    const normalized = value.replace(/\r\n/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim();
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 17).trimEnd()}\n...[truncated]` : normalized;
}
function redactSecrets(value) {
    return value
        .replace(/\bsk-[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_SECRET]')
        .replace(/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_SECRET]')
        .replace(/\bnpm_[A-Za-z0-9]{20,}\b/g, '[REDACTED_SECRET]')
        .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[REDACTED_SECRET]')
        .replace(/\b(api[_-]?key|token|password|secret)\s*[:=]\s*["']?[^"'\s`]+/gi, '$1=[REDACTED_SECRET]');
}
function valueToText(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (Array.isArray(value)) {
        return value
            .map((item) => {
            if (typeof item === 'string')
                return item;
            if (item && typeof item === 'object' && 'text' in item) {
                return valueToText(item.text);
            }
            if (item && typeof item === 'object' && 'content' in item) {
                return valueToText(item.content);
            }
            return '';
        })
            .filter(Boolean)
            .join('\n');
    }
    if (value && typeof value === 'object') {
        if ('text' in value) {
            return valueToText(value.text);
        }
        if ('content' in value) {
            return valueToText(value.content);
        }
    }
    return '';
}
function extractRecordContent(record) {
    return valueToText(record.content)
        || valueToText(record.text)
        || valueToText(record.message?.content)
        || valueToText(record.delta?.content);
}
function extractRecordRole(record) {
    const role = record.role
        || record.message?.role
        || record.author
        || record.type;
    return typeof role === 'string' ? role.toLowerCase() : '';
}
function isMetadataRecord(record) {
    return Boolean(record.cwd
        || record.repoRoot
        || record.repo_root
        || record.workspace
        || record.workspaceRoot
        || record.project_root
        || record.project_slug
        || record.type === 'session_meta');
}
function metadataFromRecord(record) {
    const metadata = {};
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
function isToolNoise(record, role) {
    const type = typeof record.type === 'string' ? record.type.toLowerCase() : '';
    return Boolean(role === 'system'
        || role === 'developer'
        || role === 'tool'
        || role === 'function'
        || type.includes('tool')
        || type.includes('function_call')
        || type.includes('system')
        || type.includes('developer'));
}
function isUsefulAssistantMessage(content) {
    return /decision|handoff|summary|unresolved|question|next|todo|remember|use |implemented|fixed|blocked|chose|decided/i.test(content);
}
function parseJsonLikeLine(line) {
    const trimmed = line.trim();
    if (!trimmed) {
        return null;
    }
    try {
        const parsed = JSON.parse(trimmed);
        return parsed && typeof parsed === 'object' ? parsed : null;
    }
    catch {
        const match = trimmed.match(/\{.*\}/);
        if (!match) {
            return null;
        }
        try {
            const parsed = JSON.parse(match[0]);
            return parsed && typeof parsed === 'object' ? parsed : null;
        }
        catch {
            return null;
        }
    }
}
function parseSessionSegments(sourcePath, raw) {
    const segments = [];
    let current = {
        sourcePath,
        index: 0,
        metadata: {},
        raw: '',
        entries: [],
    };
    let parseErrors = 0;
    function flush() {
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
        if (!line.trim())
            continue;
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
        }
        else if (role === 'assistant' && isUsefulAssistantMessage(content)) {
            current.entries.push({ role: 'assistant', content });
        }
    }
    flush();
    return { segments, parseErrors };
}
function discoverCodexSessionRoots(repoRoot) {
    const roots = new Set();
    const envRoot = process.env.AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT;
    if (envRoot) {
        for (const part of envRoot.split(node_path_1.default.delimiter).map((item) => item.trim()).filter(Boolean)) {
            roots.add(node_path_1.default.resolve(part));
        }
    }
    if (roots.size > 0) {
        return [...roots].filter((root) => node_fs_1.default.existsSync(root));
    }
    const codexHome = process.env.CODEX_HOME;
    if (codexHome) {
        for (const child of ['sessions', 'projects', 'history', 'logs']) {
            roots.add(node_path_1.default.join(codexHome, child));
        }
    }
    const homeCodex = node_path_1.default.join(node_os_1.default.homedir(), '.codex');
    for (const candidate of [
        node_path_1.default.join(homeCodex, 'sessions'),
        node_path_1.default.join(homeCodex, 'projects'),
        node_path_1.default.join(homeCodex, 'history'),
        node_path_1.default.join(homeCodex, 'logs'),
        node_path_1.default.join(repoRoot, '.codex', 'sessions'),
    ]) {
        roots.add(candidate);
    }
    return [...roots].filter((root) => node_fs_1.default.existsSync(root));
}
function listSessionFiles(roots, maxFiles) {
    const files = [];
    for (const root of roots) {
        const stack = [root];
        while (stack.length > 0 && files.length < maxFiles) {
            const current = stack.pop();
            if (!current || !node_fs_1.default.existsSync(current))
                continue;
            for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
                const entryPath = node_path_1.default.join(current, entry.name);
                if (entry.isDirectory()) {
                    stack.push(entryPath);
                }
                else if (entry.isFile() && SESSION_FILE_EXTENSIONS.has(node_path_1.default.extname(entry.name).toLowerCase())) {
                    files.push(entryPath);
                }
                if (files.length >= maxFiles)
                    break;
            }
        }
    }
    return files
        .sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs)
        .slice(0, maxFiles);
}
function segmentMatchesProject(segment, repoRoot, config) {
    const normalizedRepo = normalizePathForMatch(repoRoot);
    const raw = `${JSON.stringify(segment.metadata)}\n${segment.raw}`.replace(/\\/g, '/').toLowerCase();
    if (raw.includes(normalizedRepo)) {
        return true;
    }
    const pathFields = ['cwd', 'repoRoot', 'repo_root', 'workspace', 'workspaceRoot', 'project_root'];
    for (const key of pathFields) {
        const value = segment.metadata[key];
        if (typeof value !== 'string')
            continue;
        const candidate = normalizePathForMatch(value);
        if (candidate === normalizedRepo || candidate.startsWith(`${normalizedRepo}/`)) {
            return true;
        }
    }
    const slug = String(segment.metadata.project_slug || segment.metadata.projectSlug || '').toLowerCase();
    return Boolean(slug.length >= 8
        && slug === config.project_slug.toLowerCase()
        && raw.includes(config.project_slug.toLowerCase()));
}
function titleForSegment(segment) {
    const assistantDecision = segment.entries.find((entry) => (entry.role === 'assistant' && /^decision\s*:/i.test(entry.content)));
    const source = assistantDecision || segment.entries[0];
    if (!source) {
        return 'Imported Codex session';
    }
    return compactContent(source.content.replace(/^decision\s*:\s*/i, ''), 72)
        .replace(/\n/g, ' ')
        || 'Imported Codex session';
}
function formatImportedMarkdown(segment, repoRoot, config, title) {
    const lines = [
        '# Imported Codex Session',
        '',
        `- Title: ${title}`,
        `- Imported: \`${(0, date_1.getIsoTimestamp)()}\``,
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
function importCodexSessionsForProject(repoRoot, config, options = {}) {
    const rootsChecked = discoverCodexSessionRoots(repoRoot);
    const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
    const maxImports = options.maxImports ?? DEFAULT_MAX_IMPORTS;
    const files = listSessionFiles(rootsChecked, maxFiles);
    const state = readSessionImportState(config);
    const importedKeys = new Set(state.imported.map((record) => record.sourceKey));
    const importedNotes = [];
    const report = {
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
        const raw = (0, fs_utils_1.readIfExists)(filePath);
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
            const importedRoot = node_path_1.default.join(config.project_root, 'Sessions', 'Imported');
            (0, fs_utils_1.ensureDir)(importedRoot);
            const title = titleForSegment(segment);
            const notePath = node_path_1.default.join(importedRoot, `${(0, date_1.getIsoTimestamp)().replace(/[:.]/g, '-')}-${stableHash(sourceKey)}.md`);
            const body = redactSecrets(formatImportedMarkdown(segment, repoRoot, config, title));
            (0, fs_utils_1.writeFile)(notePath, body);
            importedNotes.push(notePath);
            importedKeys.add(sourceKey);
            report.imported += 1;
            state.imported.push({
                sourceKey,
                sourcePath: filePath,
                notePath,
                importedAt: (0, date_1.getIsoTimestamp)(),
                title,
            });
            (0, vault_1.updateProjectMemoryIndex)({
                projectRoot: config.project_root,
                projectSlug: config.project_slug,
                projectType: config.project_type,
                bucket: 'sessions',
                item: (0, vault_1.createMemoryIndexRecord)({
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
        at: (0, date_1.getIsoTimestamp)(),
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
function describeSessionImportReport(report) {
    if (report.imported > 0) {
        return {
            summary: `Imported ${report.imported} new Codex session${report.imported === 1 ? '' : 's'}.`,
            nextAction: 'Run agent-bootstrap recall "<query>" when compact context needs targeted prior memory.',
        };
    }
    if (report.skippedDuplicate > 0) {
        return {
            summary: 'No new Codex sessions imported; matching sessions were already imported.',
            nextAction: 'Run agent-bootstrap recall "<query>" to search the imported session memory.',
        };
    }
    if (report.rootsChecked.length === 0) {
        return {
            summary: 'No matching Codex sessions imported; no Codex session roots were found.',
            nextAction: 'Check session roots or set AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT if your Codex history lives elsewhere.',
        };
    }
    if (report.scannedFiles === 0) {
        return {
            summary: 'No matching Codex sessions imported; no session files were found in checked roots.',
            nextAction: 'Check session roots or set AGENT_BOOTSTRAP_CODEX_SESSIONS_ROOT to a folder containing Codex JSONL logs.',
        };
    }
    if (report.skippedUnmatched > 0) {
        return {
            summary: 'No matching Codex sessions imported for this repo.',
            nextAction: 'Confirm the session log contains this repo path; importer skips ambiguous sessions to avoid cross-project memory leaks.',
        };
    }
    if (report.skippedLowValue > 0) {
        return {
            summary: 'No matching Codex sessions imported; matched logs did not contain durable user or assistant memory.',
            nextAction: 'Run context again after a session with decisions, handoffs, unresolved questions, or useful summaries.',
        };
    }
    return {
        summary: 'No matching Codex sessions imported.',
        nextAction: 'Run agent-bootstrap context --compact later; importer is bounded and deduped.',
    };
}
function formatSessionImportReport(report) {
    const guidance = describeSessionImportReport(report);
    return [
        '# Session Import',
        '',
        '- mode: automatic Codex session importer',
        `- summary: ${guidance.summary}`,
        `- next action: ${guidance.nextAction}`,
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
