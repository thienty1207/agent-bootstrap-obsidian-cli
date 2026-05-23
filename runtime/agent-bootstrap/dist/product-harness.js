"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoProductHarnessRoots = getRepoProductHarnessRoots;
exports.getVaultProductHarnessRoot = getVaultProductHarnessRoot;
exports.classifyHarnessRisk = classifyHarnessRisk;
exports.classifyHarnessIntake = classifyHarnessIntake;
exports.ensureProductHarness = ensureProductHarness;
exports.getProductHarnessStatus = getProductHarnessStatus;
exports.startHarnessIntake = startHarnessIntake;
exports.recordHarnessProof = recordHarnessProof;
exports.recordHarnessDecision = recordHarnessDecision;
exports.recordHarnessTrace = recordHarnessTrace;
exports.recordHarnessFriction = recordHarnessFriction;
exports.formatProductHarnessContext = formatProductHarnessContext;
exports.getCurrentStoryFile = getCurrentStoryFile;
exports.getRecentStoryFiles = getRecentStoryFiles;
exports.getRecentHarnessTraceFiles = getRecentHarnessTraceFiles;
exports.runHarnessCommand = runHarnessCommand;
const node_child_process_1 = __importDefault(require("node:child_process"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
function repoProductRoot(repoRoot) {
    return node_path_1.default.join(repoRoot, 'docs', 'product');
}
function repoTracesRoot(repoRoot) {
    return node_path_1.default.join(repoProductRoot(repoRoot), 'traces');
}
function repoBacklogPath(repoRoot) {
    return node_path_1.default.join(repoProductRoot(repoRoot), 'HARNESS_BACKLOG.md');
}
function repoStoriesRoot(repoRoot) {
    return node_path_1.default.join(repoRoot, 'docs', 'stories');
}
function repoValidationRoot(repoRoot) {
    return node_path_1.default.join(repoRoot, 'docs', 'validation');
}
function repoDecisionsRoot(repoRoot) {
    return node_path_1.default.join(repoRoot, 'docs', 'decisions');
}
function getRepoProductHarnessRoots(repoRoot) {
    return {
        productRoot: repoProductRoot(repoRoot),
        storiesRoot: repoStoriesRoot(repoRoot),
        validationRoot: repoValidationRoot(repoRoot),
        decisionsRoot: repoDecisionsRoot(repoRoot),
        tracesRoot: repoTracesRoot(repoRoot),
    };
}
function getVaultProductHarnessRoot(config) {
    return node_path_1.default.join(config.project_root, 'ProductHarness');
}
function vaultStoriesRoot(config) {
    return node_path_1.default.join(getVaultProductHarnessRoot(config), 'Stories');
}
function vaultValidationRoot(config) {
    return node_path_1.default.join(getVaultProductHarnessRoot(config), 'Validation');
}
function vaultDecisionsRoot(config) {
    return node_path_1.default.join(getVaultProductHarnessRoot(config), 'Decisions');
}
function vaultTracesRoot(config) {
    return node_path_1.default.join(getVaultProductHarnessRoot(config), 'Traces');
}
function vaultBacklogPath(config) {
    return node_path_1.default.join(getVaultProductHarnessRoot(config), 'HARNESS_BACKLOG.md');
}
function toPosix(relativePath) {
    return relativePath.replace(/\\/g, '/');
}
function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) {
        return {};
    }
    const fields = {};
    for (const line of match[1].split(/\r?\n/)) {
        const separator = line.indexOf(':');
        if (separator === -1) {
            continue;
        }
        fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
    }
    return fields;
}
function storyTitleFromContent(filePath, content) {
    const fields = parseFrontmatter(content);
    if (fields.title) {
        return fields.title;
    }
    const heading = content.match(/^#\s+(.+)$/m);
    return heading ? heading[1].trim() : node_path_1.default.basename(filePath, '.md');
}
function normalizeRisk(value) {
    if (value === 'high' || value === 'medium' || value === 'low') {
        return value;
    }
    return 'medium';
}
function normalizeInputType(value) {
    const allowed = [
        'new_spec',
        'spec_slice',
        'change_request',
        'new_initiative',
        'maintenance',
        'harness_improvement',
    ];
    return allowed.includes(value) ? value : 'change_request';
}
function normalizeStatus(value) {
    return value === 'proof_added' ? 'proof_added' : 'intake';
}
function parseRiskFlags(value) {
    if (!value || value === 'none') {
        return [];
    }
    const allowed = new Set([
        'auth',
        'authorization',
        'data_model',
        'audit_security',
        'external_systems',
        'public_contract',
        'cross_platform',
        'existing_behavior',
        'weak_proof',
        'multi_domain',
    ]);
    return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => allowed.has(item));
}
function extractSectionLines(content, sectionName) {
    const match = content.match(new RegExp(`## ${sectionName}\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)`));
    return (match?.[1] || '')
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line && line !== '- none yet');
}
function countProofEntries(content) {
    return extractSectionLines(content, 'Proof Log')
        .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}T/.test(line.trim()))
        .length;
}
function latestProofEntry(content) {
    const proofLines = extractSectionLines(content, 'Proof Log')
        .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}T/.test(line.trim()));
    const latest = proofLines[proofLines.length - 1];
    if (!latest) {
        return null;
    }
    return latest.replace(/^-\s+\d{4}-\d{2}-\d{2}T[^\s]+\s+-\s+/, '').trim();
}
function timestampForFile() {
    return (0, date_1.getIsoTimestamp)().replace(/[:.]/g, '-');
}
function includesAny(value, patterns) {
    return patterns.some((pattern) => pattern.test(value));
}
function classifyHarnessRisk(title) {
    return classifyHarnessIntake(title).risk;
}
function classifyHarnessIntake(title) {
    const value = title.toLowerCase();
    const riskFlags = [];
    if (includesAny(value, [/\bauth\b/, /\blogin\b/, /\bsignin\b/, /\bpassword\b/, /\btoken\b/, /\bjwt\b/, /\bsession\b/, /\boauth\b/])) {
        riskFlags.push('auth');
    }
    if (includesAny(value, [/\bpermission\b/, /\bpermissions\b/, /\bauthorization\b/, /\bauthorize\b/, /\badmin\b/, /\brole\b/, /\brls\b/, /\btenant\b/, /\baccess\s+control\b/])) {
        riskFlags.push('authorization');
    }
    if (includesAny(value, [/\bdatabase\b/, /\bdb\b/, /\bschema\b/, /\bmodel\b/, /\bmigration\b/, /\bdata\s+loss\b/, /\bdelete\b/, /\bdeletes\b/, /\bdestroy\b/, /\binvoice\b/, /\btable\b/, /\bsupabase\b/, /\bpostgres\b/, /\bsql\b/])) {
        riskFlags.push('data_model');
    }
    if (includesAny(value, [/\bsecurity\b/, /\baudit\b/, /\bsecret\b/, /\bsecrets\b/, /\.env\b/, /\bupload\b/, /\bcors\b/, /\brate\s*limit\b/, /\bvulnerability\b/])) {
        riskFlags.push('audit_security');
    }
    if (includesAny(value, [/\bprovider\b/, /\bexternal\b/, /\bstripe\b/, /\bpayment\b/, /\bbilling\b/, /\bsubscription\b/, /\bwebhook\b/, /\bemail\b/])) {
        riskFlags.push('external_systems');
    }
    if (includesAny(value, [/\bapi\b/, /\bendpoint\b/, /\bpublic\s+contract\b/, /\bsdk\b/, /\bexport\b/, /\bimport\b/])) {
        riskFlags.push('public_contract');
    }
    if (includesAny(value, [/\bmobile\b/, /\bdesktop\b/, /\bios\b/, /\bandroid\b/, /\bweb\b/, /\bbrowser\b/, /\bcross-platform\b/])) {
        riskFlags.push('cross_platform');
    }
    if (includesAny(value, [/\bfix\b/, /\bbug\b/, /\bregression\b/, /\bexisting\b/, /\blegacy\b/, /\brefactor\b/, /\bmigrate\b/, /\bmigration\b/, /\bdelete\b/, /\bdeletes\b/])) {
        riskFlags.push('existing_behavior');
    }
    if (includesAny(value, [/\bmaybe\b/, /\btemporary\b/, /\bquick\s+hack\b/, /\bunclear\b/, /\bunknown\b/])) {
        riskFlags.push('weak_proof');
    }
    const domainHits = [
        /\bfrontend\b/.test(value),
        /\bbackend\b/.test(value),
        /\bapi\b/.test(value),
        /\bdatabase\b|\bdb\b|\bschema\b|\bmigration\b/.test(value),
        /\bauth\b|\blogin\b|\bpermission\b/.test(value),
        /\bpayment\b|\bbilling\b|\bprovider\b|\bintegration\b/.test(value),
    ].filter(Boolean).length;
    if (domainHits >= 3) {
        riskFlags.push('multi_domain');
    }
    const uniqueFlags = [...new Set(riskFlags)];
    let inputType = 'change_request';
    if (/\bharness\b/.test(value)) {
        inputType = 'harness_improvement';
    }
    else if (/\bmaintenance\b|\bdependency\b|\bupgrade\b|\bchore\b|\bcleanup\b/.test(value)) {
        inputType = 'maintenance';
    }
    else if (/\bslice\b|\bphase\b|\bpart\b/.test(value)) {
        inputType = 'spec_slice';
    }
    else if (/\binitiative\b|\bnew\s+product\b|\blaunch\b/.test(value)) {
        inputType = 'new_initiative';
    }
    else if (/\bspec\b|\brequirement\b/.test(value)) {
        inputType = 'new_spec';
    }
    const hardGateFlags = new Set([
        'auth',
        'authorization',
        'data_model',
        'audit_security',
        'external_systems',
    ]);
    let risk = uniqueFlags.some((flag) => hardGateFlags.has(flag)) ? 'high' : 'low';
    if (risk !== 'high' && includesAny(value, [/\bapi\b/, /\bbackend\b/, /\bfrontend\s+flow\b/, /\bform\b/, /\bdashboard\b/, /\bstate\b/, /\bintegration\b/, /\bcheckout\b/])) {
        risk = 'medium';
    }
    if (risk !== 'high' && uniqueFlags.some((flag) => flag === 'public_contract' || flag === 'cross_platform' || flag === 'existing_behavior' || flag === 'multi_domain')) {
        risk = 'medium';
    }
    return {
        inputType,
        riskFlags: uniqueFlags,
        risk,
    };
}
function productTemplate(config) {
    return [
        '# Product Contract',
        '',
        `Project: \`${config.project_slug}\``,
        `Project type: \`${config.project_type}\``,
        '',
        '## What This Product Is',
        '',
        '- Describe the product in plain language.',
        '',
        '## Users',
        '',
        '- Who this product is for.',
        '',
        '## Product Promises',
        '',
        '- What users should be able to trust.',
        '',
        '## Non-Goals',
        '',
        '- What this product should not become.',
        '',
    ].join('\n');
}
function harnessTemplate() {
    return [
        '# Product Harness',
        '',
        'Product Harness is not a skill and does not replace Superpowers.',
        '',
        'It keeps feature work tied to plain product intent:',
        '',
        '- what the feature is trying to achieve',
        '- what is in scope and out of scope',
        '- whether the task is low, medium, or high risk',
        '- what proof is required before anyone can call the feature done',
        '- what trace was left after meaningful work',
        '- what workflow friction should improve next time',
        '',
        'Daily logs still record what happened today. Active Plan State still records what step is active. Product Harness records the feature contract, proof, trace, and friction.',
        '',
    ].join('\n');
}
function storiesIndexTemplate() {
    return [
        '# Story Index',
        '',
        'Feature stories created by Product Harness live in dated folders.',
        '',
        '- Low and medium-risk tasks use one compact story file.',
        '- High-risk tasks use a packet folder with overview, design, validation, and execplan files.',
        '- High-risk stories need proof before final completion claims.',
        '',
    ].join('\n');
}
function validationTemplate() {
    return [
        '# Test Matrix',
        '',
        'Product Harness keeps story proof visible here.',
        '',
        '| Story | Risk | Unit | Integration | E2E | Platform | Status | Evidence |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
        '',
    ].join('\n');
}
function decisionsTemplate() {
    return [
        '# Product Decisions',
        '',
        'Product Harness decisions are short product or feature decisions. Use vault `Decisions.md` for broader durable technical decisions when needed.',
        '',
    ].join('\n');
}
function backlogTemplate() {
    return [
        '# Harness Backlog',
        '',
        'Open workflow friction that should make future harness behavior sharper.',
        '',
        '## Open Friction',
        '',
        '- none yet',
        '',
    ].join('\n');
}
function tracesReadmeTemplate() {
    return [
        '# Harness Traces',
        '',
        'Short execution traces written after meaningful work. Compact context loads only the latest trace.',
        '',
    ].join('\n');
}
function ensureHarnessDirectories(repoRoot, config) {
    for (const dirPath of [
        repoProductRoot(repoRoot),
        repoTracesRoot(repoRoot),
        repoStoriesRoot(repoRoot),
        repoValidationRoot(repoRoot),
        repoDecisionsRoot(repoRoot),
        getVaultProductHarnessRoot(config),
        vaultTracesRoot(config),
        vaultStoriesRoot(config),
        vaultValidationRoot(config),
        vaultDecisionsRoot(config),
    ]) {
        (0, fs_utils_1.ensureDir)(dirPath);
    }
}
function copyIfExists(sourcePath, targetPath) {
    if (!node_fs_1.default.existsSync(sourcePath)) {
        return;
    }
    (0, fs_utils_1.ensureDir)(node_path_1.default.dirname(targetPath));
    node_fs_1.default.copyFileSync(sourcePath, targetPath);
}
function mirrorHarnessToVault(repoRoot, config) {
    ensureHarnessDirectories(repoRoot, config);
    copyIfExists(node_path_1.default.join(repoProductRoot(repoRoot), 'PRODUCT.md'), node_path_1.default.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'));
    copyIfExists(node_path_1.default.join(repoProductRoot(repoRoot), 'HARNESS.md'), node_path_1.default.join(getVaultProductHarnessRoot(config), 'HARNESS.md'));
    copyIfExists(repoBacklogPath(repoRoot), vaultBacklogPath(config));
    node_fs_1.default.cpSync(repoTracesRoot(repoRoot), vaultTracesRoot(config), { recursive: true });
    node_fs_1.default.cpSync(repoStoriesRoot(repoRoot), vaultStoriesRoot(config), { recursive: true });
    node_fs_1.default.cpSync(repoValidationRoot(repoRoot), vaultValidationRoot(config), { recursive: true });
    node_fs_1.default.cpSync(repoDecisionsRoot(repoRoot), vaultDecisionsRoot(config), { recursive: true });
}
function writeHarnessDefaults(repoRoot, config) {
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoProductRoot(repoRoot), 'PRODUCT.md'), productTemplate(config));
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoProductRoot(repoRoot), 'HARNESS.md'), harnessTemplate());
    (0, fs_utils_1.writeFileIfMissing)(repoBacklogPath(repoRoot), backlogTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoTracesRoot(repoRoot), 'README.md'), tracesReadmeTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoStoriesRoot(repoRoot), 'INDEX.md'), storiesIndexTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoValidationRoot(repoRoot), 'TEST_MATRIX.md'), validationTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoDecisionsRoot(repoRoot), 'INDEX.md'), decisionsTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'), productTemplate(config));
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(getVaultProductHarnessRoot(config), 'HARNESS.md'), harnessTemplate());
    (0, fs_utils_1.writeFileIfMissing)(vaultBacklogPath(config), backlogTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultTracesRoot(config), 'README.md'), tracesReadmeTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultStoriesRoot(config), 'INDEX.md'), storiesIndexTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultValidationRoot(config), 'TEST_MATRIX.md'), validationTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultDecisionsRoot(config), 'INDEX.md'), decisionsTemplate());
}
function storyVaultPath(repoRoot, config, storyPath) {
    const relative = toPosix(node_path_1.default.relative(repoStoriesRoot(repoRoot), storyPath));
    return node_path_1.default.join(vaultStoriesRoot(config), relative);
}
function storyVaultRoot(repoRoot, config, storyRoot) {
    const relative = toPosix(node_path_1.default.relative(repoStoriesRoot(repoRoot), storyRoot));
    return node_path_1.default.join(vaultStoriesRoot(config), relative);
}
function storyPathFor(repoRoot, title, risk, date = (0, date_1.getTodayString)()) {
    const slug = (0, fs_utils_1.slugify)(title);
    if (risk === 'high') {
        const storyRoot = node_path_1.default.join(repoStoriesRoot(repoRoot), date, `${date}-${slug}`);
        return {
            storyRoot,
            storyPath: node_path_1.default.join(storyRoot, 'overview.md'),
        };
    }
    const storyPath = node_path_1.default.join(repoStoriesRoot(repoRoot), date, `${date}-${slug}.md`);
    return {
        storyRoot: storyPath,
        storyPath,
    };
}
function isPacketPart(fileName) {
    return fileName === 'design.md' || fileName === 'validation.md' || fileName === 'execplan.md';
}
function collectStoryFiles(storiesRoot) {
    if (!node_fs_1.default.existsSync(storiesRoot)) {
        return [];
    }
    const files = [];
    const stack = [storiesRoot];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const entryPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(entryPath);
            }
            else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md' && !isPacketPart(entry.name)) {
                files.push(entryPath);
            }
        }
    }
    return files.sort();
}
function storyRecordFromFile(repoRoot, config, filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath);
    if (!content) {
        return null;
    }
    const fields = parseFrontmatter(content);
    const title = storyTitleFromContent(filePath, content);
    const isPacket = node_path_1.default.basename(filePath) === 'overview.md' || fields.type === 'agent-bootstrap-story-packet';
    const storyRoot = isPacket ? node_path_1.default.dirname(filePath) : filePath;
    return {
        title,
        slug: fields.slug || (0, fs_utils_1.slugify)(title),
        risk: normalizeRisk(fields.risk),
        inputType: normalizeInputType(fields.input_type),
        riskFlags: parseRiskFlags(fields.risk_flags),
        status: normalizeStatus(fields.status),
        created: fields.created || node_path_1.default.basename(node_path_1.default.dirname(filePath)),
        updated: fields.updated || node_fs_1.default.statSync(filePath).mtime.toISOString(),
        proofCount: countProofEntries(content),
        latestProof: latestProofEntry(content),
        repoPath: filePath,
        storyRoot,
        vaultPath: storyVaultPath(repoRoot, config, filePath),
        vaultStoryRoot: storyVaultRoot(repoRoot, config, storyRoot),
        relativeRepoPath: toPosix(node_path_1.default.relative(repoRoot, filePath)),
        isPacket,
    };
}
function readStories(repoRoot, config) {
    return collectStoryFiles(repoStoriesRoot(repoRoot))
        .map((filePath) => storyRecordFromFile(repoRoot, config, filePath))
        .filter((record) => Boolean(record))
        .sort((left, right) => right.updated.localeCompare(left.updated));
}
function currentStoryFromStories(stories) {
    return stories[0] || null;
}
function proofGapsForStory(story) {
    if (!story || story.proofCount > 0) {
        return [];
    }
    if (story.risk === 'high') {
        return [
            `High-risk story "${story.title}" has no proof recorded yet.`,
            'Auth/security or data-safety proof is required before completion claims when relevant.',
        ];
    }
    if (story.risk === 'medium') {
        return [`Medium-risk story "${story.title}" needs at least one verification proof before final response.`];
    }
    return [];
}
function proofChecklist(risk) {
    if (risk === 'high') {
        return [
            '- [ ] happy path proof: expected user flow works.',
            '- [ ] failure path proof: wrong password, unauthorized request, invalid input, or equivalent bad path is rejected.',
            '- [ ] auth/security proof: verify auth, permission, token, secret, rate-limit, and data exposure behavior when relevant.',
            '- [ ] regression proof: smallest useful automated test, build, or smoke check ran.',
        ];
    }
    if (risk === 'medium') {
        return [
            '- [ ] primary flow proof: expected behavior works.',
            '- [ ] boundary proof: at least one error, empty, or edge path is checked when relevant.',
            '- [ ] regression proof: smallest useful automated test, build, or smoke check ran.',
        ];
    }
    return [
        '- [ ] lightweight proof: quick check, doc review, or smallest useful smoke test.',
    ];
}
function storyFrontmatter({ config, title, risk, inputType, riskFlags, status, created, updated, packet, }) {
    return [
        '---',
        `type: ${packet ? 'agent-bootstrap-story-packet' : 'agent-bootstrap-story'}`,
        `project: ${config.project_slug}`,
        `title: ${title}`,
        `slug: ${(0, fs_utils_1.slugify)(title)}`,
        `risk: ${risk}`,
        `input_type: ${inputType}`,
        `risk_flags: ${riskFlags.length > 0 ? riskFlags.join(',') : 'none'}`,
        `status: ${status}`,
        `created: ${created}`,
        `updated: ${updated}`,
        'linked_plan: docs/superpowers/plans/CURRENT.md',
        '---',
    ];
}
function renderStory({ config, title, risk, inputType, riskFlags, status, created, updated, progressLines, proofLines, }) {
    return [
        ...storyFrontmatter({ config, title, risk, inputType, riskFlags, status, created, updated, packet: false }),
        '',
        `# ${created} - ${title}`,
        '',
        '## Goal',
        '',
        title,
        '',
        '## Scope',
        '',
        '- Track product behavior tied to this task only.',
        '- Keep implementation work in Active Plan State and daily execution details in Daily logs.',
        '',
        '## Out Of Scope',
        '',
        '- Unrelated refactors.',
        '- Unrequested product behavior.',
        '- New workflow skills or new core subagents.',
        '',
        '## Risk',
        '',
        `- Level: ${risk}`,
        `- Input type: ${inputType}`,
        `- Risk flags: ${riskFlags.length > 0 ? riskFlags.join(', ') : 'none'}`,
        '- Product Harness uses risk only to decide proof depth; Superpowers still owns the workflow.',
        '',
        '## Proof Checklist',
        '',
        ...proofChecklist(risk),
        '',
        '## Progress Log',
        '',
        ...(progressLines.length > 0 ? progressLines : ['- none yet']),
        '',
        '## Proof Log',
        '',
        ...(proofLines.length > 0 ? proofLines : ['- none yet']),
        '',
        '## Product Decisions',
        '',
        '- none yet',
        '',
    ].join('\n');
}
function renderPacketOverview({ config, title, risk, inputType, riskFlags, status, created, updated, progressLines, proofLines, }) {
    return [
        ...storyFrontmatter({ config, title, risk, inputType, riskFlags, status, created, updated, packet: true }),
        '',
        `# ${created} - ${title}`,
        '',
        '## Goal',
        '',
        title,
        '',
        '## Current Behavior',
        '',
        '- Unknown until confirmed from repo context, user request, tests, or source-backed memory.',
        '- Do not guess current behavior when evidence is missing.',
        '',
        '## Scope',
        '',
        '- Track product behavior tied to this high-risk task only.',
        '- Keep implementation work in Active Plan State and daily execution details in Daily logs.',
        '',
        '## Out Of Scope',
        '',
        '- Unrelated refactors.',
        '- Unrequested product behavior.',
        '- New workflow skills or new core subagents.',
        '',
        '## Risk',
        '',
        `- Level: ${risk}`,
        `- Input type: ${inputType}`,
        `- Risk flags: ${riskFlags.length > 0 ? riskFlags.join(', ') : 'none'}`,
        '- Hard gates such as auth, permission, migration, data loss, security, and external providers require proof before completion claims.',
        '',
        '## Proof Checklist',
        '',
        ...proofChecklist(risk),
        '',
        '## Story Packet',
        '',
        '- Design: design.md',
        '- Validation: validation.md',
        '- Execution plan: execplan.md',
        '',
        '## Progress Log',
        '',
        ...(progressLines.length > 0 ? progressLines : ['- none yet']),
        '',
        '## Proof Log',
        '',
        ...(proofLines.length > 0 ? proofLines : ['- none yet']),
        '',
        '## Product Decisions',
        '',
        '- none yet',
        '',
    ].join('\n');
}
function renderPacketDesign(title, classification) {
    return [
        '# Design',
        '',
        `Story: ${title}`,
        `Risk: ${classification.risk}`,
        `Risk flags: ${classification.riskFlags.length > 0 ? classification.riskFlags.join(', ') : 'none'}`,
        '',
        '## Existing Behavior To Confirm',
        '',
        '- Read the current code path before changing behavior.',
        '- Mark unknowns as unknown instead of filling gaps from memory.',
        '',
        '## Proposed Shape',
        '',
        '- Keep the smallest useful change that satisfies the story.',
        '- Preserve public contracts unless the story explicitly changes them.',
        '',
        '## Data And Security Notes',
        '',
        '- Verify auth, authorization, data access, secrets, uploads, providers, and migrations when relevant.',
        '- No sensitive secrets should be copied into this packet.',
        '',
    ].join('\n');
}
function renderPacketValidation(title, classification, proofLines = []) {
    return [
        '# Validation',
        '',
        `Story: ${title}`,
        '',
        '## Required Proof',
        '',
        ...proofChecklist(classification.risk),
        '',
        '## Auth/Security Proof',
        '',
        '- auth/security proof: wrong password, unauthorized request, invalid token, missing permission, or equivalent bad path must be rejected when relevant.',
        '',
        '## Regression Proof',
        '',
        '- Run the smallest useful automated test, build, or smoke check.',
        '',
        '## Proof Log',
        '',
        ...(proofLines.length > 0 ? proofLines : ['- none yet']),
        '',
    ].join('\n');
}
function renderPacketExecPlan(title) {
    return [
        '# Execution Plan',
        '',
        `Story: ${title}`,
        '',
        '## Steps',
        '',
        '- [ ] Confirm existing behavior and scope.',
        '- [ ] Implement the smallest useful change.',
        '- [ ] Run required proof.',
        '- [ ] Record Product Harness proof and trace.',
        '',
        '## Stop Conditions',
        '',
        '- Stop and ask if scope changes materially.',
        '- Stop if required proof cannot be run or interpreted.',
        '- Stop if auth, data, or external-provider behavior is unknown.',
        '',
    ].join('\n');
}
function readStoryParts(filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath) || '';
    const fields = parseFrontmatter(content);
    const title = fields.title || storyTitleFromContent(filePath, content);
    return {
        title,
        slug: fields.slug || (0, fs_utils_1.slugify)(title),
        risk: normalizeRisk(fields.risk),
        inputType: normalizeInputType(fields.input_type),
        riskFlags: parseRiskFlags(fields.risk_flags),
        created: fields.created || node_path_1.default.basename(node_path_1.default.dirname(filePath)),
        progressLines: extractSectionLines(content, 'Progress Log'),
        proofLines: extractSectionLines(content, 'Proof Log'),
    };
}
function updateValidationMatrix(repoRoot, config) {
    const stories = readStories(repoRoot, config);
    const lines = [
        '# Test Matrix',
        '',
        'Product Harness keeps story proof visible here.',
        '',
        '| Story | Risk | Unit | Integration | E2E | Platform | Status | Evidence |',
        '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ];
    for (const story of stories.slice().reverse()) {
        const hasProof = story.proofCount > 0;
        const row = [
            story.title.replace(/\|/g, '/'),
            story.risk,
            hasProof ? 'yes' : 'no',
            'no',
            'no',
            'no',
            hasProof ? 'implemented' : 'planned',
            (story.latestProof || 'none').replace(/\|/g, '/'),
        ];
        lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push('');
    (0, fs_utils_1.writeFile)(node_path_1.default.join(repoValidationRoot(repoRoot), 'TEST_MATRIX.md'), lines.join('\n'));
    (0, fs_utils_1.writeFile)(node_path_1.default.join(vaultValidationRoot(config), 'TEST_MATRIX.md'), lines.join('\n'));
}
function writeStoryUpdate({ repoRoot, config, storyPath, status, progressLine, proofLine, }) {
    const parts = readStoryParts(storyPath);
    const updated = (0, date_1.getIsoTimestamp)();
    const progressLines = progressLine ? [...parts.progressLines, `- ${updated} - ${progressLine}`] : parts.progressLines;
    const proofLines = proofLine ? [...parts.proofLines, `- ${updated} - ${proofLine}`] : parts.proofLines;
    const isPacket = node_path_1.default.basename(storyPath) === 'overview.md';
    if (isPacket) {
        (0, fs_utils_1.writeFile)(storyPath, renderPacketOverview({
            config,
            title: parts.title,
            risk: parts.risk,
            inputType: parts.inputType,
            riskFlags: parts.riskFlags,
            status,
            created: parts.created,
            updated,
            progressLines,
            proofLines,
        }));
        const validationPath = node_path_1.default.join(node_path_1.default.dirname(storyPath), 'validation.md');
        (0, fs_utils_1.writeFile)(validationPath, renderPacketValidation(parts.title, {
            risk: parts.risk,
            inputType: parts.inputType,
            riskFlags: parts.riskFlags,
        }, proofLines));
    }
    else {
        (0, fs_utils_1.writeFile)(storyPath, renderStory({
            config,
            title: parts.title,
            risk: parts.risk,
            inputType: parts.inputType,
            riskFlags: parts.riskFlags,
            status,
            created: parts.created,
            updated,
            progressLines,
            proofLines,
        }));
    }
    updateValidationMatrix(repoRoot, config);
    mirrorHarnessToVault(repoRoot, config);
    const record = storyRecordFromFile(repoRoot, config, storyPath);
    if (!record) {
        throw new Error(`Could not read Product Harness story after writing ${storyPath}`);
    }
    return record;
}
function traceFiles(root) {
    if (!node_fs_1.default.existsSync(root)) {
        return [];
    }
    const files = [];
    const stack = [root];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const entryPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(entryPath);
            }
            else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
                files.push(entryPath);
            }
        }
    }
    return files.sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs);
}
function inferTraceOutcome(summary) {
    const value = summary.toLowerCase();
    if (/\bblocked\b|\bstuck\b|\bwaiting\b/.test(value)) {
        return 'blocked';
    }
    if (/\bfailed\b|\bfail\b|\berror\b|\bbroken\b/.test(value)) {
        return 'failed';
    }
    if (/\bpartial\b|\bunfinished\b|\bincomplete\b|\bremaining\b|\bwip\b/.test(value)) {
        return 'partial';
    }
    return 'completed';
}
function readTraceRecord(repoRoot, config, filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath);
    if (!content) {
        return null;
    }
    const summary = content.match(/^- Summary:\s+(.+)$/m)?.[1]?.trim()
        || content.match(/^#\s+(.+)$/m)?.[1]?.trim()
        || node_path_1.default.basename(filePath, '.md');
    const outcome = normalizeOutcome(content.match(/^- Outcome:\s+(.+)$/m)?.[1]?.trim());
    const created = content.match(/^- Created:\s+(.+)$/m)?.[1]?.trim() || node_fs_1.default.statSync(filePath).mtime.toISOString();
    const currentStory = content.match(/^- Current story:\s+(.+)$/m)?.[1]?.trim() || null;
    const relative = toPosix(node_path_1.default.relative(repoTracesRoot(repoRoot), filePath));
    return {
        summary,
        outcome,
        created,
        repoPath: filePath,
        vaultPath: node_path_1.default.join(vaultTracesRoot(config), relative),
        relativeRepoPath: toPosix(node_path_1.default.relative(repoRoot, filePath)),
        currentStory: currentStory === 'none' ? null : currentStory,
    };
}
function normalizeOutcome(value) {
    if (value === 'blocked' || value === 'failed' || value === 'partial' || value === 'completed') {
        return value;
    }
    return 'completed';
}
function latestTrace(repoRoot, config) {
    const latest = traceFiles(repoTracesRoot(repoRoot))[0];
    return latest ? readTraceRecord(repoRoot, config, latest) : null;
}
function readOpenFriction(repoRoot, config) {
    const content = (0, fs_utils_1.readIfExists)(repoBacklogPath(repoRoot)) || '';
    const records = [];
    const blocks = content.split(/\r?\n##\s+/).slice(1);
    for (const block of blocks) {
        const [heading, ...lines] = block.split(/\r?\n/);
        if (!heading || heading === 'Open Friction') {
            continue;
        }
        const status = /\bresolved\b/i.test(heading) ? 'resolved' : 'proposed';
        if (status !== 'proposed') {
            continue;
        }
        const pain = lines.find((line) => /^-\s+Pain:\s+/.test(line))?.replace(/^-\s+Pain:\s+/, '').trim()
            || lines.find((line) => /^-\s+/.test(line))?.replace(/^-\s+/, '').trim()
            || heading.trim();
        records.push({
            pain,
            status,
            created: heading.split(' - ')[0].trim(),
            repoPath: repoBacklogPath(repoRoot),
            vaultPath: vaultBacklogPath(config),
        });
    }
    if (records.length === 0) {
        const looseItems = content
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => /^-\s+/.test(line) && line !== '- none yet');
        for (const item of looseItems) {
            records.push({
                pain: item.replace(/^-\s+/, ''),
                status: 'proposed',
                created: 'unknown',
                repoPath: repoBacklogPath(repoRoot),
                vaultPath: vaultBacklogPath(config),
            });
        }
    }
    return records;
}
function getGitStatus(repoRoot) {
    try {
        return node_child_process_1.default.execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' })
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
function currentPlanPointer(repoRoot) {
    const currentPath = node_path_1.default.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md');
    const body = (0, fs_utils_1.readIfExists)(currentPath);
    if (!body) {
        return 'none';
    }
    return body.match(/- Plan:\s+(.+)$/m)?.[1]?.trim() || toPosix(node_path_1.default.relative(repoRoot, currentPath));
}
function ensureProductHarness(repoRoot, config) {
    ensureHarnessDirectories(repoRoot, config);
    writeHarnessDefaults(repoRoot, config);
    updateValidationMatrix(repoRoot, config);
    mirrorHarnessToVault(repoRoot, config);
    return getProductHarnessStatus({ repoRoot, config });
}
function getProductHarnessStatus({ repoRoot, config }) {
    ensureHarnessDirectories(repoRoot, config);
    const stories = readStories(repoRoot, config);
    const currentStory = currentStoryFromStories(stories);
    const decisionsBody = (0, fs_utils_1.readIfExists)(node_path_1.default.join(repoDecisionsRoot(repoRoot), 'INDEX.md')) || '';
    const decisionCount = (decisionsBody.match(/^##\s+/gm) || []).length;
    const openFriction = readOpenFriction(repoRoot, config);
    const traceCount = traceFiles(repoTracesRoot(repoRoot)).length;
    return {
        ok: node_fs_1.default.existsSync(node_path_1.default.join(repoProductRoot(repoRoot), 'HARNESS.md'))
            && node_fs_1.default.existsSync(repoBacklogPath(repoRoot))
            && node_fs_1.default.existsSync(repoTracesRoot(repoRoot))
            && node_fs_1.default.existsSync(node_path_1.default.join(vaultStoriesRoot(config), 'INDEX.md'))
            && node_fs_1.default.existsSync(vaultBacklogPath(config))
            && node_fs_1.default.existsSync(vaultTracesRoot(config)),
        repoHarnessRoot: node_path_1.default.join(repoRoot, 'docs'),
        vaultHarnessRoot: getVaultProductHarnessRoot(config),
        currentStory,
        latestTrace: latestTrace(repoRoot, config),
        openFriction,
        proofGaps: proofGapsForStory(currentStory),
        counts: {
            stories: stories.length,
            highRiskStories: stories.filter((story) => story.risk === 'high').length,
            storiesMissingProof: stories.filter((story) => story.risk !== 'low' && story.proofCount === 0).length,
            decisions: decisionCount,
            traces: traceCount,
            openFriction: openFriction.length,
        },
        stories,
    };
}
function startHarnessIntake({ repoRoot, config, value }) {
    const title = value?.trim();
    if (!title) {
        throw new Error('Harness intake requires a feature title: agent-bootstrap harness intake "<feature title>" [project-path]');
    }
    ensureProductHarness(repoRoot, config);
    const slug = (0, fs_utils_1.slugify)(title);
    const existing = readStories(repoRoot, config).find((story) => story.slug === slug);
    if (existing) {
        const resumed = writeStoryUpdate({
            repoRoot,
            config,
            storyPath: existing.repoPath,
            status: existing.status,
            progressLine: 'Product Harness story resumed.',
        });
        return {
            action: 'resumed',
            risk: resumed.risk,
            inputType: resumed.inputType,
            riskFlags: resumed.riskFlags,
            status: resumed.status,
            storyPath: resumed.repoPath,
            storyRoot: resumed.storyRoot,
            vaultStoryPath: resumed.vaultPath,
            vaultStoryRoot: resumed.vaultStoryRoot,
        };
    }
    const created = (0, date_1.getTodayString)();
    const updated = (0, date_1.getIsoTimestamp)();
    const classification = classifyHarnessIntake(title);
    const { storyPath, storyRoot } = storyPathFor(repoRoot, title, classification.risk, created);
    if (classification.risk === 'high') {
        (0, fs_utils_1.writeFile)(storyPath, renderPacketOverview({
            config,
            title,
            risk: classification.risk,
            inputType: classification.inputType,
            riskFlags: classification.riskFlags,
            status: 'intake',
            created,
            updated,
            progressLines: [`- ${updated} - Product Harness intake created.`],
            proofLines: [],
        }));
        (0, fs_utils_1.writeFile)(node_path_1.default.join(storyRoot, 'design.md'), renderPacketDesign(title, classification));
        (0, fs_utils_1.writeFile)(node_path_1.default.join(storyRoot, 'validation.md'), renderPacketValidation(title, classification));
        (0, fs_utils_1.writeFile)(node_path_1.default.join(storyRoot, 'execplan.md'), renderPacketExecPlan(title));
    }
    else {
        (0, fs_utils_1.writeFile)(storyPath, renderStory({
            config,
            title,
            risk: classification.risk,
            inputType: classification.inputType,
            riskFlags: classification.riskFlags,
            status: 'intake',
            created,
            updated,
            progressLines: [`- ${updated} - Product Harness intake created.`],
            proofLines: [],
        }));
    }
    updateValidationMatrix(repoRoot, config);
    mirrorHarnessToVault(repoRoot, config);
    const record = storyRecordFromFile(repoRoot, config, storyPath);
    if (!record) {
        throw new Error(`Could not read Product Harness story after writing ${storyPath}`);
    }
    return {
        action: 'started',
        risk: record.risk,
        inputType: record.inputType,
        riskFlags: record.riskFlags,
        status: record.status,
        storyPath: record.repoPath,
        storyRoot: record.storyRoot,
        vaultStoryPath: record.vaultPath,
        vaultStoryRoot: record.vaultStoryRoot,
    };
}
function activeStoryOrThrow(repoRoot, config) {
    const current = getProductHarnessStatus({ repoRoot, config }).currentStory;
    if (!current) {
        throw new Error('No Product Harness story. Run `agent-bootstrap harness intake "<feature title>"` before recording proof.');
    }
    return current;
}
function recordHarnessProof({ repoRoot, config, value }) {
    const summary = value?.trim();
    if (!summary) {
        throw new Error('Harness proof requires a verification summary.');
    }
    ensureProductHarness(repoRoot, config);
    const active = activeStoryOrThrow(repoRoot, config);
    const record = writeStoryUpdate({
        repoRoot,
        config,
        storyPath: active.repoPath,
        status: 'proof_added',
        proofLine: summary,
    });
    return {
        action: 'proof-recorded',
        status: record.status,
        storyPath: record.repoPath,
        storyRoot: record.storyRoot,
        vaultStoryPath: record.vaultPath,
        vaultStoryRoot: record.vaultStoryRoot,
    };
}
function recordHarnessDecision({ repoRoot, config, value }) {
    const summary = value?.trim();
    if (!summary) {
        throw new Error('Harness decision requires a decision summary.');
    }
    ensureProductHarness(repoRoot, config);
    const timestamp = (0, date_1.getIsoTimestamp)();
    const entry = [
        '',
        `## ${timestamp}`,
        `- Decision: ${summary}`,
        '- Source: Product Harness',
        '',
    ].join('\n');
    for (const filePath of [
        node_path_1.default.join(repoDecisionsRoot(repoRoot), 'INDEX.md'),
        node_path_1.default.join(vaultDecisionsRoot(config), 'INDEX.md'),
    ]) {
        const existing = (0, fs_utils_1.readIfExists)(filePath) || decisionsTemplate();
        (0, fs_utils_1.writeFile)(filePath, `${existing.trimEnd()}\n${entry}`);
    }
    mirrorHarnessToVault(repoRoot, config);
    return {
        action: 'decision-recorded',
        repoDecisionPath: node_path_1.default.join(repoDecisionsRoot(repoRoot), 'INDEX.md'),
        vaultDecisionPath: node_path_1.default.join(vaultDecisionsRoot(config), 'INDEX.md'),
    };
}
function recordHarnessTrace({ repoRoot, config, value }) {
    const summary = value?.trim();
    if (!summary) {
        throw new Error('Harness trace requires a short task summary.');
    }
    ensureProductHarness(repoRoot, config);
    const status = getProductHarnessStatus({ repoRoot, config });
    const timestamp = (0, date_1.getIsoTimestamp)();
    const today = (0, date_1.getTodayString)();
    const outcome = inferTraceOutcome(summary);
    const tracePath = node_path_1.default.join(repoTracesRoot(repoRoot), today, `${timestampForFile()}-${(0, fs_utils_1.slugify)(summary).slice(0, 80)}.md`);
    const relativeTrace = toPosix(node_path_1.default.relative(repoTracesRoot(repoRoot), tracePath));
    const vaultTracePath = node_path_1.default.join(vaultTracesRoot(config), relativeTrace);
    const changedFiles = getGitStatus(repoRoot);
    const body = [
        '# Harness Trace',
        '',
        `- Created: ${timestamp}`,
        `- Summary: ${summary}`,
        `- Outcome: ${outcome}`,
        `- Current story: ${status.currentStory ? status.currentStory.title : 'none'}`,
        `- Current story path: ${status.currentStory ? status.currentStory.relativeRepoPath : 'none'}`,
        `- Current plan: ${currentPlanPointer(repoRoot)}`,
        `- Proof summary: ${status.currentStory?.latestProof || 'none'}`,
        '',
        '## Files Changed Or Read',
        '',
        ...(changedFiles.length > 0 ? changedFiles.map((line) => `- ${line}`) : ['- clean or unavailable']),
        '',
        '## Notes',
        '',
        '- This trace is a short Product Harness breadcrumb, not a replacement for tests, daily logs, or Active Plan State.',
        '',
    ].join('\n');
    (0, fs_utils_1.writeFile)(tracePath, body);
    (0, fs_utils_1.writeFile)(vaultTracePath, body);
    mirrorHarnessToVault(repoRoot, config);
    return {
        action: 'trace-recorded',
        outcome,
        tracePath,
        vaultTracePath,
    };
}
function recordHarnessFriction({ repoRoot, config, value }) {
    const pain = value?.trim();
    if (!pain) {
        throw new Error('Harness friction requires a pain point or missing workflow.');
    }
    ensureProductHarness(repoRoot, config);
    const status = getProductHarnessStatus({ repoRoot, config });
    const timestamp = (0, date_1.getIsoTimestamp)();
    const existing = ((0, fs_utils_1.readIfExists)(repoBacklogPath(repoRoot)) || backlogTemplate()).replace(/\n-\s+none yet\s*\n?/, '\n');
    const entry = [
        '',
        `## ${timestamp} - proposed`,
        `- Pain: ${pain}`,
        `- Current story: ${status.currentStory ? status.currentStory.title : 'none'}`,
        `- Current plan: ${currentPlanPointer(repoRoot)}`,
        '- Next harness improvement: clarify this friction before it repeats.',
        '',
    ].join('\n');
    (0, fs_utils_1.writeFile)(repoBacklogPath(repoRoot), `${existing.trimEnd()}\n${entry}`);
    (0, fs_utils_1.writeFile)(vaultBacklogPath(config), `${existing.trimEnd()}\n${entry}`);
    mirrorHarnessToVault(repoRoot, config);
    return {
        action: 'friction-recorded',
        status: 'proposed',
        backlogPath: repoBacklogPath(repoRoot),
        vaultBacklogPath: vaultBacklogPath(config),
    };
}
function formatProductHarnessContext(status) {
    const lines = [
        '# Product Harness',
        '',
        'Product Harness is not a skill and does not replace Superpowers.',
        'It records feature intent, risk, scope, proof, trace, and friction while daily logs record what happened today.',
        '',
        `- Stories: ${status.counts.stories}`,
        `- High-risk stories: ${status.counts.highRiskStories}`,
        `- Stories missing proof: ${status.counts.storiesMissingProof}`,
        `- Traces: ${status.counts.traces}`,
        `- Open friction: ${status.counts.openFriction}`,
        '',
        '## Current Story',
    ];
    if (status.currentStory) {
        lines.push(`- Title: ${status.currentStory.title}`, `- Risk: ${status.currentStory.risk}`, `- Input type: ${status.currentStory.inputType}`, `- Risk flags: ${status.currentStory.riskFlags.length > 0 ? status.currentStory.riskFlags.join(', ') : 'none'}`, `- Status: ${status.currentStory.status}`, `- Source: ${status.currentStory.relativeRepoPath}`);
    }
    else {
        lines.push('- none');
    }
    lines.push('', '## Proof gaps');
    if (status.proofGaps.length === 0) {
        lines.push('- none');
    }
    else {
        lines.push(...status.proofGaps.map((gap) => `- ${gap}`));
    }
    lines.push('', '## Latest Trace');
    if (status.latestTrace) {
        lines.push(`- Summary: ${status.latestTrace.summary}`, `- Outcome: ${status.latestTrace.outcome}`, `- Source: ${status.latestTrace.relativeRepoPath}`);
    }
    else {
        lines.push('- none');
    }
    lines.push('', '## Open Friction');
    if (status.openFriction.length === 0) {
        lines.push('- none');
    }
    else {
        lines.push(...status.openFriction.slice(0, 3).map((item) => `- ${item.pain}`));
    }
    lines.push('');
    return lines.join('\n');
}
function getCurrentStoryFile(repoRoot, config) {
    const current = getProductHarnessStatus({ repoRoot, config }).currentStory;
    return current ? current.repoPath : null;
}
function getRecentStoryFiles(repoRoot, limit = 4) {
    return collectStoryFiles(repoStoriesRoot(repoRoot))
        .sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs)
        .slice(0, limit);
}
function getRecentHarnessTraceFiles(repoRoot, limit = 4) {
    return traceFiles(repoTracesRoot(repoRoot)).slice(0, limit);
}
function runHarnessCommand(subcommand, options) {
    switch (subcommand) {
        case 'status':
            ensureProductHarness(options.repoRoot, options.config);
            return getProductHarnessStatus({ repoRoot: options.repoRoot, config: options.config });
        case 'intake':
            return startHarnessIntake(options);
        case 'proof':
            return recordHarnessProof(options);
        case 'decision':
            return recordHarnessDecision(options);
        case 'trace':
            return recordHarnessTrace(options);
        case 'friction':
            return recordHarnessFriction(options);
        default:
            throw new Error('Unknown harness command. Use: status, intake, proof, decision, trace, friction.');
    }
}
