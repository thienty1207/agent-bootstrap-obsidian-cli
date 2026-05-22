"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoProductHarnessRoots = getRepoProductHarnessRoots;
exports.getVaultProductHarnessRoot = getVaultProductHarnessRoot;
exports.classifyHarnessRisk = classifyHarnessRisk;
exports.ensureProductHarness = ensureProductHarness;
exports.getProductHarnessStatus = getProductHarnessStatus;
exports.startHarnessIntake = startHarnessIntake;
exports.recordHarnessProof = recordHarnessProof;
exports.recordHarnessDecision = recordHarnessDecision;
exports.formatProductHarnessContext = formatProductHarnessContext;
exports.getCurrentStoryFile = getCurrentStoryFile;
exports.getRecentStoryFiles = getRecentStoryFiles;
exports.runHarnessCommand = runHarnessCommand;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
function repoProductRoot(repoRoot) {
    return node_path_1.default.join(repoRoot, 'docs', 'product');
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
function normalizeStatus(value) {
    return value === 'proof_added' ? 'proof_added' : 'intake';
}
function countProofEntries(content) {
    const match = content.match(/## Proof Log\r?\n\r?\n([\s\S]*?)(?:\r?\n## |\s*$)/);
    if (!match) {
        return 0;
    }
    return match[1]
        .split(/\r?\n/)
        .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}T/.test(line.trim()))
        .length;
}
function classifyHarnessRisk(title) {
    const value = title.toLowerCase();
    const highRisk = [
        /\bauth\b/,
        /\blogin\b/,
        /\bpassword\b/,
        /\btoken\b/,
        /\bpayment\b/,
        /\bbilling\b/,
        /\bsubscription\b/,
        /\bpermission\b/,
        /\badmin\b/,
        /\btenant\b/,
        /\brls\b/,
        /\bdatabase\s+migration\b/,
        /\bmigration\b/,
        /\bupload\b/,
        /\bsecurity\b/,
        /\bsecret\b/,
        /\bsecrets\b/,
        /\bdelete\b/,
        /\bdestroy\b/,
        /\bdestructive\b/,
    ];
    if (highRisk.some((pattern) => pattern.test(value))) {
        return 'high';
    }
    const mediumRisk = [
        /\bapi\b/,
        /\bbackend\b/,
        /\bfrontend\s+flow\b/,
        /\bform\b/,
        /\bdashboard\b/,
        /\bstate\b/,
        /\bintegration\b/,
        /\bcheckout\b/,
    ];
    if (mediumRisk.some((pattern) => pattern.test(value))) {
        return 'medium';
    }
    return 'low';
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
        '',
        'Daily logs still record what happened today. Active Plan State still records what step is active. Product Harness records the feature contract and proof.',
        '',
    ].join('\n');
}
function storiesIndexTemplate() {
    return [
        '# Story Index',
        '',
        'Feature stories created by Product Harness live in dated folders.',
        '',
        '- Small tasks may not need a story.',
        '- Medium and high-risk tasks should get a story before coding.',
        '- High-risk stories need proof before final completion claims.',
        '',
    ].join('\n');
}
function validationTemplate() {
    return [
        '# Test Matrix',
        '',
        'Use this file to keep feature proof visible.',
        '',
        '| Feature | Risk | Required proof | Latest evidence |',
        '| --- | --- | --- | --- |',
        '| none yet | - | - | - |',
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
function ensureHarnessDirectories(repoRoot, config) {
    for (const dirPath of [
        repoProductRoot(repoRoot),
        repoStoriesRoot(repoRoot),
        repoValidationRoot(repoRoot),
        repoDecisionsRoot(repoRoot),
        getVaultProductHarnessRoot(config),
        vaultStoriesRoot(config),
        vaultValidationRoot(config),
        vaultDecisionsRoot(config),
    ]) {
        (0, fs_utils_1.ensureDir)(dirPath);
    }
}
function mirrorHarnessToVault(repoRoot, config) {
    ensureHarnessDirectories(repoRoot, config);
    node_fs_1.default.cpSync(repoProductRoot(repoRoot), getVaultProductHarnessRoot(config), { recursive: true });
    node_fs_1.default.cpSync(repoStoriesRoot(repoRoot), vaultStoriesRoot(config), { recursive: true });
    node_fs_1.default.cpSync(repoValidationRoot(repoRoot), vaultValidationRoot(config), { recursive: true });
    node_fs_1.default.cpSync(repoDecisionsRoot(repoRoot), vaultDecisionsRoot(config), { recursive: true });
}
function writeHarnessDefaults(repoRoot, config) {
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoProductRoot(repoRoot), 'PRODUCT.md'), productTemplate(config));
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoProductRoot(repoRoot), 'HARNESS.md'), harnessTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoStoriesRoot(repoRoot), 'INDEX.md'), storiesIndexTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoValidationRoot(repoRoot), 'TEST_MATRIX.md'), validationTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(repoDecisionsRoot(repoRoot), 'INDEX.md'), decisionsTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'), productTemplate(config));
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(getVaultProductHarnessRoot(config), 'HARNESS.md'), harnessTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultStoriesRoot(config), 'INDEX.md'), storiesIndexTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultValidationRoot(config), 'TEST_MATRIX.md'), validationTemplate());
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultDecisionsRoot(config), 'INDEX.md'), decisionsTemplate());
}
function toPosix(relativePath) {
    return relativePath.replace(/\\/g, '/');
}
function storyVaultPath(repoRoot, config, storyPath) {
    const relative = toPosix(node_path_1.default.relative(repoStoriesRoot(repoRoot), storyPath));
    return node_path_1.default.join(vaultStoriesRoot(config), relative);
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
            else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md') {
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
    return {
        title,
        slug: fields.slug || (0, fs_utils_1.slugify)(title),
        risk: normalizeRisk(fields.risk),
        status: normalizeStatus(fields.status),
        created: fields.created || node_path_1.default.basename(node_path_1.default.dirname(filePath)),
        updated: fields.updated || node_fs_1.default.statSync(filePath).mtime.toISOString(),
        proofCount: countProofEntries(content),
        repoPath: filePath,
        vaultPath: storyVaultPath(repoRoot, config, filePath),
        relativeRepoPath: toPosix(node_path_1.default.relative(repoRoot, filePath)),
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
function storyPathFor(repoRoot, title, date = (0, date_1.getTodayString)()) {
    return node_path_1.default.join(repoStoriesRoot(repoRoot), date, `${date}-${(0, fs_utils_1.slugify)(title)}.md`);
}
function renderStory({ config, title, risk, status, created, updated, progressLines, proofLines, }) {
    return [
        '---',
        'type: agent-bootstrap-story',
        `project: ${config.project_slug}`,
        `title: ${title}`,
        `slug: ${(0, fs_utils_1.slugify)(title)}`,
        `risk: ${risk}`,
        `status: ${status}`,
        `created: ${created}`,
        `updated: ${updated}`,
        'linked_plan: docs/superpowers/plans/CURRENT.md',
        '---',
        '',
        `# ${created} - ${title}`,
        '',
        '## Goal',
        '',
        title,
        '',
        '## Scope',
        '',
        '- Track product behavior tied to this feature only.',
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
function readStoryParts(filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath) || '';
    const fields = parseFrontmatter(content);
    const clean = (sectionName) => {
        const match = content.match(new RegExp(`## ${sectionName}\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)`));
        return (match?.[1] || '')
            .split(/\r?\n/)
            .map((line) => line.trimEnd())
            .filter((line) => line && line !== '- none yet');
    };
    return {
        title: fields.title || storyTitleFromContent(filePath, content),
        risk: normalizeRisk(fields.risk),
        created: fields.created || node_path_1.default.basename(node_path_1.default.dirname(filePath)),
        progressLines: clean('Progress Log'),
        proofLines: clean('Proof Log'),
    };
}
function writeStoryUpdate({ repoRoot, config, storyPath, status, progressLine, proofLine, }) {
    const parts = readStoryParts(storyPath);
    const updated = (0, date_1.getIsoTimestamp)();
    (0, fs_utils_1.writeFile)(storyPath, renderStory({
        config,
        title: parts.title,
        risk: parts.risk,
        status,
        created: parts.created,
        updated,
        progressLines: progressLine ? [...parts.progressLines, `- ${updated} - ${progressLine}`] : parts.progressLines,
        proofLines: proofLine ? [...parts.proofLines, `- ${updated} - ${proofLine}`] : parts.proofLines,
    }));
    mirrorHarnessToVault(repoRoot, config);
    const record = storyRecordFromFile(repoRoot, config, storyPath);
    if (!record) {
        throw new Error(`Could not read Product Harness story after writing ${storyPath}`);
    }
    return record;
}
function ensureProductHarness(repoRoot, config) {
    ensureHarnessDirectories(repoRoot, config);
    writeHarnessDefaults(repoRoot, config);
    mirrorHarnessToVault(repoRoot, config);
    return getProductHarnessStatus({ repoRoot, config });
}
function getProductHarnessStatus({ repoRoot, config }) {
    ensureHarnessDirectories(repoRoot, config);
    const stories = readStories(repoRoot, config);
    const currentStory = currentStoryFromStories(stories);
    const decisionsBody = (0, fs_utils_1.readIfExists)(node_path_1.default.join(repoDecisionsRoot(repoRoot), 'INDEX.md')) || '';
    const decisionCount = (decisionsBody.match(/^##\s+/gm) || []).length;
    return {
        ok: node_fs_1.default.existsSync(node_path_1.default.join(repoProductRoot(repoRoot), 'HARNESS.md'))
            && node_fs_1.default.existsSync(node_path_1.default.join(vaultStoriesRoot(config), 'INDEX.md')),
        repoHarnessRoot: node_path_1.default.join(repoRoot, 'docs'),
        vaultHarnessRoot: getVaultProductHarnessRoot(config),
        currentStory,
        proofGaps: proofGapsForStory(currentStory),
        counts: {
            stories: stories.length,
            highRiskStories: stories.filter((story) => story.risk === 'high').length,
            storiesMissingProof: stories.filter((story) => story.risk !== 'low' && story.proofCount === 0).length,
            decisions: decisionCount,
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
            status: resumed.status,
            storyPath: resumed.repoPath,
            vaultStoryPath: resumed.vaultPath,
        };
    }
    const created = (0, date_1.getTodayString)();
    const updated = (0, date_1.getIsoTimestamp)();
    const risk = classifyHarnessRisk(title);
    const storyPath = storyPathFor(repoRoot, title, created);
    (0, fs_utils_1.writeFile)(storyPath, renderStory({
        config,
        title,
        risk,
        status: 'intake',
        created,
        updated,
        progressLines: [`- ${updated} - Product Harness intake created.`],
        proofLines: [],
    }));
    mirrorHarnessToVault(repoRoot, config);
    const record = storyRecordFromFile(repoRoot, config, storyPath);
    if (!record) {
        throw new Error(`Could not read Product Harness story after writing ${storyPath}`);
    }
    return {
        action: 'started',
        risk: record.risk,
        status: record.status,
        storyPath: record.repoPath,
        vaultStoryPath: record.vaultPath,
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
        vaultStoryPath: record.vaultPath,
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
function formatProductHarnessContext(status) {
    const lines = [
        '# Product Harness',
        '',
        'Product Harness is not a skill and does not replace Superpowers.',
        'It records feature intent, risk, scope, and proof while daily logs record what happened today.',
        '',
        `- Stories: ${status.counts.stories}`,
        `- High-risk stories: ${status.counts.highRiskStories}`,
        `- Stories missing proof: ${status.counts.storiesMissingProof}`,
        '',
        '## Current Story',
    ];
    if (status.currentStory) {
        lines.push(`- Title: ${status.currentStory.title}`, `- Risk: ${status.currentStory.risk}`, `- Status: ${status.currentStory.status}`, `- Source: ${status.currentStory.relativeRepoPath}`);
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
        default:
            throw new Error('Unknown harness command. Use: status, intake, proof, decision.');
    }
}
