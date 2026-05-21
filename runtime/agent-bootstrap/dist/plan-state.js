"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRepoPlansRoot = getRepoPlansRoot;
exports.getVaultPlansRoot = getVaultPlansRoot;
exports.ensurePlanState = ensurePlanState;
exports.getPlanStatus = getPlanStatus;
exports.startPlan = startPlan;
exports.updatePlanProgress = updatePlanProgress;
exports.interruptPlan = interruptPlan;
exports.completePlan = completePlan;
exports.runPlanCommand = runPlanCommand;
exports.getActivePlanFile = getActivePlanFile;
exports.getRecentPlanFiles = getRecentPlanFiles;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const fs_utils_1 = require("./fs-utils");
function repoPlansRoot(repoRoot) {
    return node_path_1.default.join(repoRoot, 'docs', 'superpowers', 'plans');
}
function getRepoPlansRoot(repoRoot) {
    return repoPlansRoot(repoRoot);
}
function getVaultPlansRoot(config) {
    return node_path_1.default.join(config.project_root, 'Plans');
}
function repoCurrentPath(repoRoot) {
    return node_path_1.default.join(repoPlansRoot(repoRoot), 'CURRENT.md');
}
function repoIndexPath(repoRoot) {
    return node_path_1.default.join(repoPlansRoot(repoRoot), 'INDEX.md');
}
function vaultCurrentPath(config) {
    return node_path_1.default.join(getVaultPlansRoot(config), 'CURRENT.md');
}
function vaultIndexPath(config) {
    return node_path_1.default.join(getVaultPlansRoot(config), 'INDEX.md');
}
function toPosix(relativePath) {
    return relativePath.replace(/\\/g, '/');
}
function relativeRepoPlanPath(repoRoot, filePath) {
    return toPosix(node_path_1.default.relative(repoRoot, filePath));
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
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim();
        fields[key] = value;
    }
    return fields;
}
function extractNextAction(content) {
    const match = content.match(/- Next action:\s*(.+)/i);
    return match ? match[1].trim() : 'continue from current task scope';
}
function normalizeStatus(value) {
    if (value === 'planned'
        || value === 'in_progress'
        || value === 'needs_correction'
        || value === 'blocked'
        || value === 'interrupted'
        || value === 'completed') {
        return value;
    }
    return 'planned';
}
function planTitleFromContent(filePath, content) {
    const fields = parseFrontmatter(content);
    if (fields.title) {
        return fields.title;
    }
    const heading = content.match(/^#\s+(.+)$/m);
    return heading ? heading[1].trim() : node_path_1.default.basename(filePath, '.md');
}
function planRecordFromFile(repoRoot, config, filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath);
    if (!content) {
        return null;
    }
    const fields = parseFrontmatter(content);
    const title = planTitleFromContent(filePath, content);
    const slug = fields.slug || (0, fs_utils_1.slugify)(title);
    const status = normalizeStatus(fields.status);
    const created = fields.created || node_path_1.default.basename(node_path_1.default.dirname(filePath));
    const updated = fields.updated || node_fs_1.default.statSync(filePath).mtime.toISOString();
    const verification = fields.verification === 'passed' ? 'passed' : 'not_run';
    const relative = relativeRepoPlanPath(repoRoot, filePath);
    const relativePlansPath = toPosix(node_path_1.default.relative(repoPlansRoot(repoRoot), filePath));
    return {
        title,
        slug,
        status,
        created,
        updated,
        verification,
        repoPath: filePath,
        vaultPath: node_path_1.default.join(getVaultPlansRoot(config), relativePlansPath),
        relativeRepoPath: relative,
        nextAction: extractNextAction(content),
    };
}
function collectPlanFiles(plansRoot) {
    if (!node_fs_1.default.existsSync(plansRoot)) {
        return [];
    }
    const files = [];
    const stack = [plansRoot];
    while (stack.length > 0) {
        const current = stack.pop();
        if (!current)
            continue;
        for (const entry of node_fs_1.default.readdirSync(current, { withFileTypes: true })) {
            const entryPath = node_path_1.default.join(current, entry.name);
            if (entry.isDirectory()) {
                stack.push(entryPath);
            }
            else if (entry.isFile()
                && entry.name.endsWith('.md')
                && entry.name !== 'CURRENT.md'
                && entry.name !== 'INDEX.md') {
                files.push(entryPath);
            }
        }
    }
    return files.sort();
}
function readPlans(repoRoot, config) {
    return collectPlanFiles(repoPlansRoot(repoRoot))
        .map((filePath) => planRecordFromFile(repoRoot, config, filePath))
        .filter((record) => Boolean(record))
        .sort((left, right) => right.updated.localeCompare(left.updated));
}
function renderEmptyCurrent() {
    return [
        '# Current Plan State',
        '',
        `Last updated: ${(0, date_1.getIsoTimestamp)()}`,
        '',
        '## Current Focus',
        '',
        '- none',
        '',
        '## Active Plans',
        '',
        '- none',
        '',
        '## Completed Today',
        '',
        '- none',
        '',
        '## Interrupted Or Needs Correction',
        '',
        '- none',
        '',
        '## Rules For Agents',
        '',
        '- Do not mark completed without verification evidence.',
        '- If the session is interrupted, keep status in_progress or interrupted.',
        '- Same-scope fixes update the existing plan.',
        '- Different-scope work starts a new plan with a specific filename.',
        '- Do not infer completion from silence, shutdown, or lack of user response.',
        '',
    ].join('\n');
}
function renderCurrent(repoRoot, plans, current) {
    const today = (0, date_1.getTodayString)();
    const active = plans.filter((plan) => plan.status !== 'completed');
    const completedToday = plans.filter((plan) => plan.status === 'completed' && plan.updated.startsWith(today));
    const needsAttention = plans.filter((plan) => (plan.status === 'interrupted'
        || plan.status === 'needs_correction'
        || plan.status === 'blocked'));
    const lines = [
        '# Current Plan State',
        '',
        `Last updated: ${(0, date_1.getIsoTimestamp)()}`,
        '',
        '## Current Focus',
        '',
    ];
    if (current) {
        lines.push(`- Plan: ${current.relativeRepoPath}`, `- Title: ${current.title}`, `- Status: ${current.status}`, `- Verification: ${current.verification}`, `- Next action: ${current.nextAction}`);
    }
    else {
        lines.push('- none');
    }
    lines.push('', '## Active Plans', '');
    if (active.length === 0) {
        lines.push('- none');
    }
    else {
        for (const plan of active.slice(0, 8)) {
            lines.push(`- ${plan.relativeRepoPath} - ${plan.status} - ${plan.title} - next: ${plan.nextAction}`);
        }
    }
    lines.push('', '## Completed Today', '');
    if (completedToday.length === 0) {
        lines.push('- none');
    }
    else {
        for (const plan of completedToday.slice(0, 8)) {
            lines.push(`- ${plan.relativeRepoPath} - ${plan.title}`);
        }
    }
    lines.push('', '## Interrupted Or Needs Correction', '');
    if (needsAttention.length === 0) {
        lines.push('- none');
    }
    else {
        for (const plan of needsAttention.slice(0, 8)) {
            lines.push(`- ${plan.relativeRepoPath} - ${plan.status} - ${plan.title} - next: ${plan.nextAction}`);
        }
    }
    lines.push('', '## Rules For Agents', '', '- Do not mark completed without verification evidence.', '- If the session is interrupted, keep status in_progress or interrupted.', '- Same-scope fixes update the existing plan.', '- Different-scope work starts a new plan with a specific filename.', '- Do not infer completion from silence, shutdown, or lack of user response.', '');
    return lines.join('\n');
}
function renderIndex(plans) {
    const byDate = new Map();
    for (const plan of plans) {
        const date = plan.created || (0, date_1.getTodayString)();
        byDate.set(date, [...(byDate.get(date) || []), plan]);
    }
    const lines = [
        '# Plan Index',
        '',
        `Last updated: ${(0, date_1.getIsoTimestamp)()}`,
        '',
        'This index tracks Superpowers implementation plans created by agent-bootstrap plan state.',
        'Root `plans/` remains a clean template/handoff area; active implementation plans live here.',
        '',
    ];
    if (plans.length === 0) {
        lines.push('No implementation plans recorded yet.', '');
        return lines.join('\n');
    }
    for (const date of [...byDate.keys()].sort().reverse()) {
        lines.push(`## ${date}`, '');
        for (const plan of (byDate.get(date) || []).sort((left, right) => left.title.localeCompare(right.title))) {
            lines.push(`- ${plan.status} - [${plan.title}](${plan.relativeRepoPath}) - verification: ${plan.verification}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
function renderPlan({ config, title, status, verification, currentStep, nextAction, progressLines, corrections, created, updated, }) {
    const slug = (0, fs_utils_1.slugify)(title);
    return [
        '---',
        'type: agent-bootstrap-plan',
        `project: ${config.project_slug}`,
        `title: ${title}`,
        `slug: ${slug}`,
        `status: ${status}`,
        `created: ${created}`,
        `updated: ${updated}`,
        `verification: ${verification}`,
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
        '- Track work tied to this task only.',
        '',
        '## Checklist',
        '',
        '- [ ] Define implementation steps before editing if the task needs a full Superpowers plan.',
        '- [ ] Implement the requested change.',
        '- [ ] Verify the result.',
        '- [ ] Update memory/handoff if meaningful.',
        '',
        '## Last Known State',
        '',
        `- Updated: ${updated}`,
        `- Current step: ${currentStep}`,
        `- Verification: ${verification}`,
        `- Next action: ${nextAction}`,
        '',
        '## Progress Log',
        '',
        ...(progressLines.length > 0 ? progressLines : ['- none yet']),
        '',
        '## Corrections',
        '',
        ...(corrections.length > 0 ? corrections : ['- none yet']),
        '',
    ].join('\n');
}
function planPathFor(repoRoot, title, date = (0, date_1.getTodayString)()) {
    return node_path_1.default.join(repoPlansRoot(repoRoot), date, `${date}-${(0, fs_utils_1.slugify)(title)}.md`);
}
function readPlanParts(filePath) {
    const content = (0, fs_utils_1.readIfExists)(filePath) || '';
    const fields = parseFrontmatter(content);
    const title = fields.title || planTitleFromContent(filePath, content);
    const created = fields.created || node_path_1.default.basename(node_path_1.default.dirname(filePath));
    const progressMatch = content.match(/## Progress Log\r?\n\r?\n([\s\S]*?)(?:\r?\n## Corrections|\s*$)/);
    const correctionsMatch = content.match(/## Corrections\r?\n\r?\n([\s\S]*?)\s*$/);
    const clean = (value) => (value || '')
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line && line !== '- none yet');
    return {
        title,
        created,
        progressLines: clean(progressMatch?.[1]),
        corrections: clean(correctionsMatch?.[1]),
    };
}
function currentFromPlans(plans) {
    return plans.find((plan) => plan.status !== 'completed') || null;
}
function mirrorPlansToVault(repoRoot, config) {
    const sourceRoot = repoPlansRoot(repoRoot);
    const targetRoot = getVaultPlansRoot(config);
    (0, fs_utils_1.ensureDir)(sourceRoot);
    (0, fs_utils_1.ensureDir)(targetRoot);
    node_fs_1.default.cpSync(sourceRoot, targetRoot, { recursive: true });
}
function refreshPlanSummaries(repoRoot, config, current) {
    const plans = readPlans(repoRoot, config);
    const nextCurrent = current === undefined ? currentFromPlans(plans) : current;
    (0, fs_utils_1.writeFile)(repoCurrentPath(repoRoot), renderCurrent(repoRoot, plans, nextCurrent));
    (0, fs_utils_1.writeFile)(repoIndexPath(repoRoot), renderIndex(plans));
    mirrorPlansToVault(repoRoot, config);
}
function ensurePlanState(repoRoot, config) {
    const repoRootPath = repoPlansRoot(repoRoot);
    const vaultRootPath = getVaultPlansRoot(config);
    (0, fs_utils_1.ensureDir)(repoRootPath);
    (0, fs_utils_1.ensureDir)(vaultRootPath);
    if (!node_fs_1.default.existsSync(repoCurrentPath(repoRoot)) && node_fs_1.default.existsSync(vaultCurrentPath(config))) {
        node_fs_1.default.cpSync(vaultCurrentPath(config), repoCurrentPath(repoRoot));
    }
    if (!node_fs_1.default.existsSync(repoIndexPath(repoRoot)) && node_fs_1.default.existsSync(vaultIndexPath(config))) {
        node_fs_1.default.cpSync(vaultIndexPath(config), repoIndexPath(repoRoot));
    }
    (0, fs_utils_1.writeFileIfMissing)(repoCurrentPath(repoRoot), renderEmptyCurrent());
    (0, fs_utils_1.writeFileIfMissing)(repoIndexPath(repoRoot), renderIndex([]));
    (0, fs_utils_1.writeFileIfMissing)(node_path_1.default.join(vaultRootPath, 'README.md'), '# Plans\n\nDurable mirror of project implementation plan state.\n');
    mirrorPlansToVault(repoRoot, config);
    return getPlanStatus({ repoRoot, config });
}
function getPlanStatus({ repoRoot, config }) {
    (0, fs_utils_1.ensureDir)(repoPlansRoot(repoRoot));
    (0, fs_utils_1.ensureDir)(getVaultPlansRoot(config));
    const plans = readPlans(repoRoot, config);
    const current = currentFromPlans(plans);
    const today = (0, date_1.getTodayString)();
    return {
        ok: node_fs_1.default.existsSync(repoCurrentPath(repoRoot)) && node_fs_1.default.existsSync(vaultCurrentPath(config)),
        repoPlansRoot: repoPlansRoot(repoRoot),
        vaultPlansRoot: getVaultPlansRoot(config),
        currentPath: repoCurrentPath(repoRoot),
        vaultCurrentPath: vaultCurrentPath(config),
        current,
        counts: {
            total: plans.length,
            active: plans.filter((plan) => plan.status !== 'completed').length,
            completedToday: plans.filter((plan) => plan.status === 'completed' && plan.updated.startsWith(today)).length,
            interruptedOrNeedsCorrection: plans.filter((plan) => (plan.status === 'interrupted'
                || plan.status === 'needs_correction'
                || plan.status === 'blocked')).length,
        },
        plans,
    };
}
function writePlanUpdate({ repoRoot, config, planPath, status, verification, currentStep, nextAction, logLine, correctionLine, }) {
    const parts = readPlanParts(planPath);
    const updated = (0, date_1.getIsoTimestamp)();
    const progressLines = [...parts.progressLines, `- ${updated} - ${logLine}`];
    const corrections = correctionLine ? [...parts.corrections, `- ${updated} - ${correctionLine}`] : parts.corrections;
    (0, fs_utils_1.writeFile)(planPath, renderPlan({
        config,
        title: parts.title,
        status,
        verification,
        currentStep,
        nextAction,
        progressLines,
        corrections,
        created: parts.created,
        updated,
    }));
    const record = planRecordFromFile(repoRoot, config, planPath);
    refreshPlanSummaries(repoRoot, config, status === 'completed' ? null : record);
    if (!record) {
        throw new Error(`Could not read plan after writing ${planPath}`);
    }
    return record;
}
function activePlanOrThrow(repoRoot, config) {
    const current = getPlanStatus({ repoRoot, config }).current;
    if (!current) {
        throw new Error('No active plan. Run `agent-bootstrap plan start "<title>"` before updating plan state.');
    }
    return current;
}
function startPlan({ repoRoot, config, titleOrNote }) {
    const title = titleOrNote?.trim();
    if (!title) {
        throw new Error('Plan start requires a title: agent-bootstrap plan start "<title>" [project-path]');
    }
    ensurePlanState(repoRoot, config);
    const slug = (0, fs_utils_1.slugify)(title);
    const existing = readPlans(repoRoot, config).find((plan) => plan.slug === slug && plan.status !== 'completed');
    if (existing) {
        const resumed = writePlanUpdate({
            repoRoot,
            config,
            planPath: existing.repoPath,
            status: existing.status,
            verification: existing.verification,
            currentStep: 'resumed',
            nextAction: existing.nextAction,
            logLine: 'Plan resumed.',
        });
        return {
            action: 'resumed',
            status: resumed.status,
            planPath: resumed.repoPath,
            vaultPlanPath: resumed.vaultPath,
            currentPath: repoCurrentPath(repoRoot),
            vaultCurrentPath: vaultCurrentPath(config),
        };
    }
    const created = (0, date_1.getTodayString)();
    const updated = (0, date_1.getIsoTimestamp)();
    const planPath = planPathFor(repoRoot, title, created);
    (0, fs_utils_1.writeFile)(planPath, renderPlan({
        config,
        title,
        status: 'in_progress',
        verification: 'not_run',
        currentStep: 'started',
        nextAction: 'continue from current task scope',
        progressLines: [`- ${updated} - Plan started.`],
        corrections: [],
        created,
        updated,
    }));
    const record = planRecordFromFile(repoRoot, config, planPath);
    refreshPlanSummaries(repoRoot, config, record);
    if (!record) {
        throw new Error(`Could not read plan after writing ${planPath}`);
    }
    return {
        action: 'started',
        status: record.status,
        planPath: record.repoPath,
        vaultPlanPath: record.vaultPath,
        currentPath: repoCurrentPath(repoRoot),
        vaultCurrentPath: vaultCurrentPath(config),
    };
}
function updatePlanProgress({ repoRoot, config, titleOrNote }) {
    const note = titleOrNote?.trim();
    if (!note) {
        throw new Error('Plan update requires a progress note.');
    }
    ensurePlanState(repoRoot, config);
    const active = activePlanOrThrow(repoRoot, config);
    const isCorrection = /^correction:/i.test(note);
    const status = isCorrection ? 'needs_correction' : active.status === 'interrupted' ? 'in_progress' : active.status;
    const record = writePlanUpdate({
        repoRoot,
        config,
        planPath: active.repoPath,
        status,
        verification: 'not_run',
        currentStep: isCorrection ? 'needs correction' : 'updated',
        nextAction: note,
        logLine: note,
        correctionLine: isCorrection ? note : undefined,
    });
    return {
        action: 'updated',
        status: record.status,
        planPath: record.repoPath,
        vaultPlanPath: record.vaultPath,
    };
}
function interruptPlan({ repoRoot, config, titleOrNote }) {
    const note = titleOrNote?.trim();
    if (!note) {
        throw new Error('Plan interrupt requires the last known state and next action.');
    }
    ensurePlanState(repoRoot, config);
    const active = activePlanOrThrow(repoRoot, config);
    const record = writePlanUpdate({
        repoRoot,
        config,
        planPath: active.repoPath,
        status: 'interrupted',
        verification: 'not_run',
        currentStep: 'interrupted',
        nextAction: note,
        logLine: `Interrupted: ${note}`,
    });
    return {
        action: 'interrupted',
        status: record.status,
        planPath: record.repoPath,
        vaultPlanPath: record.vaultPath,
    };
}
function completePlan({ repoRoot, config, titleOrNote }) {
    const summary = titleOrNote?.trim();
    if (!summary) {
        throw new Error('Plan complete requires a non-empty verification summary.');
    }
    ensurePlanState(repoRoot, config);
    const active = activePlanOrThrow(repoRoot, config);
    const record = writePlanUpdate({
        repoRoot,
        config,
        planPath: active.repoPath,
        status: 'completed',
        verification: 'passed',
        currentStep: 'completed',
        nextAction: 'none',
        logLine: `Completed with verification: ${summary}`,
    });
    return {
        action: 'completed',
        status: record.status,
        planPath: record.repoPath,
        vaultPlanPath: record.vaultPath,
    };
}
function runPlanCommand(subcommand, options) {
    switch (subcommand) {
        case 'status':
            ensurePlanState(options.repoRoot, options.config);
            return getPlanStatus({ repoRoot: options.repoRoot, config: options.config });
        case 'start':
            return startPlan(options);
        case 'update':
            return updatePlanProgress(options);
        case 'complete':
            return completePlan(options);
        case 'interrupt':
            return interruptPlan(options);
        default:
            throw new Error('Unknown plan command. Use: status, start, update, complete, interrupt.');
    }
}
function getActivePlanFile(repoRoot, config) {
    const current = getPlanStatus({ repoRoot, config }).current;
    return current ? current.repoPath : null;
}
function getRecentPlanFiles(repoRoot, limit = 4) {
    return collectPlanFiles(repoPlansRoot(repoRoot))
        .sort((left, right) => node_fs_1.default.statSync(right).mtimeMs - node_fs_1.default.statSync(left).mtimeMs)
        .slice(0, limit);
}
