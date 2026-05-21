import fs from 'node:fs';
import path from 'node:path';
import { getIsoTimestamp, getTodayString } from './date';
import { ensureDir, readIfExists, slugify, writeFile, writeFileIfMissing } from './fs-utils';
import type { RepoConfig } from './context';

export type PlanStatus = 'planned' | 'in_progress' | 'needs_correction' | 'blocked' | 'interrupted' | 'completed';

export interface PlanRecord {
  title: string;
  slug: string;
  status: PlanStatus;
  created: string;
  updated: string;
  verification: 'not_run' | 'passed';
  repoPath: string;
  vaultPath: string;
  relativeRepoPath: string;
  nextAction: string;
}

export interface PlanStateStatus {
  ok: boolean;
  repoPlansRoot: string;
  vaultPlansRoot: string;
  currentPath: string;
  vaultCurrentPath: string;
  current: PlanRecord | null;
  counts: {
    total: number;
    active: number;
    completedToday: number;
    interruptedOrNeedsCorrection: number;
  };
  plans: PlanRecord[];
}

interface PlanCommandOptions {
  repoRoot: string;
  config: RepoConfig;
  titleOrNote?: string;
}

function repoPlansRoot(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'superpowers', 'plans');
}

export function getRepoPlansRoot(repoRoot: string): string {
  return repoPlansRoot(repoRoot);
}

export function getVaultPlansRoot(config: RepoConfig): string {
  return path.join(config.project_root, 'Plans');
}

function repoCurrentPath(repoRoot: string): string {
  return path.join(repoPlansRoot(repoRoot), 'CURRENT.md');
}

function repoIndexPath(repoRoot: string): string {
  return path.join(repoPlansRoot(repoRoot), 'INDEX.md');
}

function vaultCurrentPath(config: RepoConfig): string {
  return path.join(getVaultPlansRoot(config), 'CURRENT.md');
}

function vaultIndexPath(config: RepoConfig): string {
  return path.join(getVaultPlansRoot(config), 'INDEX.md');
}

function toPosix(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

function relativeRepoPlanPath(repoRoot: string, filePath: string): string {
  return toPosix(path.relative(repoRoot, filePath));
}

function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const fields: Record<string, string> = {};
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

function extractNextAction(content: string): string {
  const match = content.match(/- Next action:\s*(.+)/i);
  return match ? match[1].trim() : 'continue from current task scope';
}

function normalizeStatus(value?: string): PlanStatus {
  if (
    value === 'planned'
    || value === 'in_progress'
    || value === 'needs_correction'
    || value === 'blocked'
    || value === 'interrupted'
    || value === 'completed'
  ) {
    return value;
  }
  return 'planned';
}

function planTitleFromContent(filePath: string, content: string): string {
  const fields = parseFrontmatter(content);
  if (fields.title) {
    return fields.title;
  }
  const heading = content.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(filePath, '.md');
}

function planRecordFromFile(repoRoot: string, config: RepoConfig, filePath: string): PlanRecord | null {
  const content = readIfExists(filePath);
  if (!content) {
    return null;
  }

  const fields = parseFrontmatter(content);
  const title = planTitleFromContent(filePath, content);
  const slug = fields.slug || slugify(title);
  const status = normalizeStatus(fields.status);
  const created = fields.created || path.basename(path.dirname(filePath));
  const updated = fields.updated || fs.statSync(filePath).mtime.toISOString();
  const verification = fields.verification === 'passed' ? 'passed' : 'not_run';
  const relative = relativeRepoPlanPath(repoRoot, filePath);
  const relativePlansPath = toPosix(path.relative(repoPlansRoot(repoRoot), filePath));

  return {
    title,
    slug,
    status,
    created,
    updated,
    verification,
    repoPath: filePath,
    vaultPath: path.join(getVaultPlansRoot(config), relativePlansPath),
    relativeRepoPath: relative,
    nextAction: extractNextAction(content),
  };
}

function collectPlanFiles(plansRoot: string): string[] {
  if (!fs.existsSync(plansRoot)) {
    return [];
  }

  const files: string[] = [];
  const stack = [plansRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (
        entry.isFile()
        && entry.name.endsWith('.md')
        && entry.name !== 'CURRENT.md'
        && entry.name !== 'INDEX.md'
      ) {
        files.push(entryPath);
      }
    }
  }

  return files.sort();
}

function readPlans(repoRoot: string, config: RepoConfig): PlanRecord[] {
  return collectPlanFiles(repoPlansRoot(repoRoot))
    .map((filePath) => planRecordFromFile(repoRoot, config, filePath))
    .filter((record): record is PlanRecord => Boolean(record))
    .sort((left, right) => right.updated.localeCompare(left.updated));
}

function renderEmptyCurrent(): string {
  return [
    '# Current Plan State',
    '',
    `Last updated: ${getIsoTimestamp()}`,
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

function renderCurrent(repoRoot: string, plans: PlanRecord[], current: PlanRecord | null): string {
  const today = getTodayString();
  const active = plans.filter((plan) => plan.status !== 'completed');
  const completedToday = plans.filter((plan) => plan.status === 'completed' && plan.updated.startsWith(today));
  const needsAttention = plans.filter((plan) => (
    plan.status === 'interrupted'
    || plan.status === 'needs_correction'
    || plan.status === 'blocked'
  ));

  const lines = [
    '# Current Plan State',
    '',
    `Last updated: ${getIsoTimestamp()}`,
    '',
    '## Current Focus',
    '',
  ];

  if (current) {
    lines.push(
      `- Plan: ${current.relativeRepoPath}`,
      `- Title: ${current.title}`,
      `- Status: ${current.status}`,
      `- Verification: ${current.verification}`,
      `- Next action: ${current.nextAction}`,
    );
  } else {
    lines.push('- none');
  }

  lines.push('', '## Active Plans', '');
  if (active.length === 0) {
    lines.push('- none');
  } else {
    for (const plan of active.slice(0, 8)) {
      lines.push(`- ${plan.relativeRepoPath} - ${plan.status} - ${plan.title} - next: ${plan.nextAction}`);
    }
  }

  lines.push('', '## Completed Today', '');
  if (completedToday.length === 0) {
    lines.push('- none');
  } else {
    for (const plan of completedToday.slice(0, 8)) {
      lines.push(`- ${plan.relativeRepoPath} - ${plan.title}`);
    }
  }

  lines.push('', '## Interrupted Or Needs Correction', '');
  if (needsAttention.length === 0) {
    lines.push('- none');
  } else {
    for (const plan of needsAttention.slice(0, 8)) {
      lines.push(`- ${plan.relativeRepoPath} - ${plan.status} - ${plan.title} - next: ${plan.nextAction}`);
    }
  }

  lines.push(
    '',
    '## Rules For Agents',
    '',
    '- Do not mark completed without verification evidence.',
    '- If the session is interrupted, keep status in_progress or interrupted.',
    '- Same-scope fixes update the existing plan.',
    '- Different-scope work starts a new plan with a specific filename.',
    '- Do not infer completion from silence, shutdown, or lack of user response.',
    '',
  );

  return lines.join('\n');
}

function renderIndex(plans: PlanRecord[]): string {
  const byDate = new Map<string, PlanRecord[]>();
  for (const plan of plans) {
    const date = plan.created || getTodayString();
    byDate.set(date, [...(byDate.get(date) || []), plan]);
  }

  const lines = [
    '# Plan Index',
    '',
    `Last updated: ${getIsoTimestamp()}`,
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

function renderPlan({
  config,
  title,
  status,
  verification,
  currentStep,
  nextAction,
  progressLines,
  corrections,
  created,
  updated,
}: {
  config: RepoConfig;
  title: string;
  status: PlanStatus;
  verification: 'not_run' | 'passed';
  currentStep: string;
  nextAction: string;
  progressLines: string[];
  corrections: string[];
  created: string;
  updated: string;
}): string {
  const slug = slugify(title);
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

function planPathFor(repoRoot: string, title: string, date = getTodayString()): string {
  return path.join(repoPlansRoot(repoRoot), date, `${date}-${slugify(title)}.md`);
}

function readPlanParts(filePath: string): {
  title: string;
  created: string;
  progressLines: string[];
  corrections: string[];
} {
  const content = readIfExists(filePath) || '';
  const fields = parseFrontmatter(content);
  const title = fields.title || planTitleFromContent(filePath, content);
  const created = fields.created || path.basename(path.dirname(filePath));
  const progressMatch = content.match(/## Progress Log\r?\n\r?\n([\s\S]*?)(?:\r?\n## Corrections|\s*$)/);
  const correctionsMatch = content.match(/## Corrections\r?\n\r?\n([\s\S]*?)\s*$/);
  const clean = (value?: string): string[] => (value || '')
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

function currentFromPlans(plans: PlanRecord[]): PlanRecord | null {
  return plans.find((plan) => plan.status !== 'completed') || null;
}

function mirrorPlansToVault(repoRoot: string, config: RepoConfig): void {
  const sourceRoot = repoPlansRoot(repoRoot);
  const targetRoot = getVaultPlansRoot(config);
  ensureDir(sourceRoot);
  ensureDir(targetRoot);
  fs.cpSync(sourceRoot, targetRoot, { recursive: true });
}

function refreshPlanSummaries(repoRoot: string, config: RepoConfig, current?: PlanRecord | null): void {
  const plans = readPlans(repoRoot, config);
  const nextCurrent = current === undefined ? currentFromPlans(plans) : current;
  writeFile(repoCurrentPath(repoRoot), renderCurrent(repoRoot, plans, nextCurrent));
  writeFile(repoIndexPath(repoRoot), renderIndex(plans));
  mirrorPlansToVault(repoRoot, config);
}

export function ensurePlanState(repoRoot: string, config: RepoConfig): PlanStateStatus {
  const repoRootPath = repoPlansRoot(repoRoot);
  const vaultRootPath = getVaultPlansRoot(config);
  ensureDir(repoRootPath);
  ensureDir(vaultRootPath);

  if (!fs.existsSync(repoCurrentPath(repoRoot)) && fs.existsSync(vaultCurrentPath(config))) {
    fs.cpSync(vaultCurrentPath(config), repoCurrentPath(repoRoot));
  }
  if (!fs.existsSync(repoIndexPath(repoRoot)) && fs.existsSync(vaultIndexPath(config))) {
    fs.cpSync(vaultIndexPath(config), repoIndexPath(repoRoot));
  }

  writeFileIfMissing(repoCurrentPath(repoRoot), renderEmptyCurrent());
  writeFileIfMissing(repoIndexPath(repoRoot), renderIndex([]));
  writeFileIfMissing(path.join(vaultRootPath, 'README.md'), '# Plans\n\nDurable mirror of project implementation plan state.\n');
  mirrorPlansToVault(repoRoot, config);

  return getPlanStatus({ repoRoot, config });
}

export function getPlanStatus({ repoRoot, config }: { repoRoot: string; config: RepoConfig }): PlanStateStatus {
  ensureDir(repoPlansRoot(repoRoot));
  ensureDir(getVaultPlansRoot(config));
  const plans = readPlans(repoRoot, config);
  const current = currentFromPlans(plans);
  const today = getTodayString();
  return {
    ok: fs.existsSync(repoCurrentPath(repoRoot)) && fs.existsSync(vaultCurrentPath(config)),
    repoPlansRoot: repoPlansRoot(repoRoot),
    vaultPlansRoot: getVaultPlansRoot(config),
    currentPath: repoCurrentPath(repoRoot),
    vaultCurrentPath: vaultCurrentPath(config),
    current,
    counts: {
      total: plans.length,
      active: plans.filter((plan) => plan.status !== 'completed').length,
      completedToday: plans.filter((plan) => plan.status === 'completed' && plan.updated.startsWith(today)).length,
      interruptedOrNeedsCorrection: plans.filter((plan) => (
        plan.status === 'interrupted'
        || plan.status === 'needs_correction'
        || plan.status === 'blocked'
      )).length,
    },
    plans,
  };
}

function writePlanUpdate({
  repoRoot,
  config,
  planPath,
  status,
  verification,
  currentStep,
  nextAction,
  logLine,
  correctionLine,
}: {
  repoRoot: string;
  config: RepoConfig;
  planPath: string;
  status: PlanStatus;
  verification: 'not_run' | 'passed';
  currentStep: string;
  nextAction: string;
  logLine: string;
  correctionLine?: string;
}): PlanRecord {
  const parts = readPlanParts(planPath);
  const updated = getIsoTimestamp();
  const progressLines = [...parts.progressLines, `- ${updated} - ${logLine}`];
  const corrections = correctionLine ? [...parts.corrections, `- ${updated} - ${correctionLine}`] : parts.corrections;
  writeFile(planPath, renderPlan({
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

function activePlanOrThrow(repoRoot: string, config: RepoConfig): PlanRecord {
  const current = getPlanStatus({ repoRoot, config }).current;
  if (!current) {
    throw new Error('No active plan. Run `agent-bootstrap plan start "<title>"` before updating plan state.');
  }
  return current;
}

export function startPlan({ repoRoot, config, titleOrNote }: PlanCommandOptions): Record<string, unknown> {
  const title = titleOrNote?.trim();
  if (!title) {
    throw new Error('Plan start requires a title: agent-bootstrap plan start "<title>" [project-path]');
  }

  ensurePlanState(repoRoot, config);
  const slug = slugify(title);
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

  const created = getTodayString();
  const updated = getIsoTimestamp();
  const planPath = planPathFor(repoRoot, title, created);
  writeFile(planPath, renderPlan({
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

export function updatePlanProgress({ repoRoot, config, titleOrNote }: PlanCommandOptions): Record<string, unknown> {
  const note = titleOrNote?.trim();
  if (!note) {
    throw new Error('Plan update requires a progress note.');
  }
  ensurePlanState(repoRoot, config);
  const active = activePlanOrThrow(repoRoot, config);
  const isCorrection = /^correction:/i.test(note);
  const status: PlanStatus = isCorrection ? 'needs_correction' : active.status === 'interrupted' ? 'in_progress' : active.status;
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

export function interruptPlan({ repoRoot, config, titleOrNote }: PlanCommandOptions): Record<string, unknown> {
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

export function completePlan({ repoRoot, config, titleOrNote }: PlanCommandOptions): Record<string, unknown> {
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

export function runPlanCommand(subcommand: string, options: PlanCommandOptions): unknown {
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

export function getActivePlanFile(repoRoot: string, config: RepoConfig): string | null {
  const current = getPlanStatus({ repoRoot, config }).current;
  return current ? current.repoPath : null;
}

export function getRecentPlanFiles(repoRoot: string, limit = 4): string[] {
  return collectPlanFiles(repoPlansRoot(repoRoot))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .slice(0, limit);
}
