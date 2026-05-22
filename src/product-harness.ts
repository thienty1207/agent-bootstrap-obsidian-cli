import fs from 'node:fs';
import path from 'node:path';
import { getIsoTimestamp, getTodayString } from './date';
import { ensureDir, readIfExists, slugify, writeFile, writeFileIfMissing } from './fs-utils';
import type { RepoConfig } from './context';

export type HarnessRisk = 'low' | 'medium' | 'high';
export type HarnessStoryStatus = 'intake' | 'proof_added';

export interface HarnessStoryRecord {
  title: string;
  slug: string;
  risk: HarnessRisk;
  status: HarnessStoryStatus;
  created: string;
  updated: string;
  proofCount: number;
  repoPath: string;
  vaultPath: string;
  relativeRepoPath: string;
}

export interface ProductHarnessStatus {
  ok: boolean;
  repoHarnessRoot: string;
  vaultHarnessRoot: string;
  currentStory: HarnessStoryRecord | null;
  proofGaps: string[];
  counts: {
    stories: number;
    highRiskStories: number;
    storiesMissingProof: number;
    decisions: number;
  };
  stories: HarnessStoryRecord[];
}

interface HarnessCommandOptions {
  repoRoot: string;
  config: RepoConfig;
  value?: string;
}

function repoProductRoot(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'product');
}

function repoStoriesRoot(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'stories');
}

function repoValidationRoot(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'validation');
}

function repoDecisionsRoot(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'decisions');
}

export function getRepoProductHarnessRoots(repoRoot: string): {
  productRoot: string;
  storiesRoot: string;
  validationRoot: string;
  decisionsRoot: string;
} {
  return {
    productRoot: repoProductRoot(repoRoot),
    storiesRoot: repoStoriesRoot(repoRoot),
    validationRoot: repoValidationRoot(repoRoot),
    decisionsRoot: repoDecisionsRoot(repoRoot),
  };
}

export function getVaultProductHarnessRoot(config: RepoConfig): string {
  return path.join(config.project_root, 'ProductHarness');
}

function vaultStoriesRoot(config: RepoConfig): string {
  return path.join(getVaultProductHarnessRoot(config), 'Stories');
}

function vaultValidationRoot(config: RepoConfig): string {
  return path.join(getVaultProductHarnessRoot(config), 'Validation');
}

function vaultDecisionsRoot(config: RepoConfig): string {
  return path.join(getVaultProductHarnessRoot(config), 'Decisions');
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
    fields[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return fields;
}

function storyTitleFromContent(filePath: string, content: string): string {
  const fields = parseFrontmatter(content);
  if (fields.title) {
    return fields.title;
  }
  const heading = content.match(/^#\s+(.+)$/m);
  return heading ? heading[1].trim() : path.basename(filePath, '.md');
}

function normalizeRisk(value?: string): HarnessRisk {
  if (value === 'high' || value === 'medium' || value === 'low') {
    return value;
  }
  return 'medium';
}

function normalizeStatus(value?: string): HarnessStoryStatus {
  return value === 'proof_added' ? 'proof_added' : 'intake';
}

function countProofEntries(content: string): number {
  const match = content.match(/## Proof Log\r?\n\r?\n([\s\S]*?)(?:\r?\n## |\s*$)/);
  if (!match) {
    return 0;
  }
  return match[1]
    .split(/\r?\n/)
    .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}T/.test(line.trim()))
    .length;
}

export function classifyHarnessRisk(title: string): HarnessRisk {
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

function productTemplate(config: RepoConfig): string {
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

function harnessTemplate(): string {
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

function storiesIndexTemplate(): string {
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

function validationTemplate(): string {
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

function decisionsTemplate(): string {
  return [
    '# Product Decisions',
    '',
    'Product Harness decisions are short product or feature decisions. Use vault `Decisions.md` for broader durable technical decisions when needed.',
    '',
  ].join('\n');
}

function ensureHarnessDirectories(repoRoot: string, config: RepoConfig): void {
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
    ensureDir(dirPath);
  }
}

function mirrorHarnessToVault(repoRoot: string, config: RepoConfig): void {
  ensureHarnessDirectories(repoRoot, config);
  fs.cpSync(repoProductRoot(repoRoot), getVaultProductHarnessRoot(config), { recursive: true });
  fs.cpSync(repoStoriesRoot(repoRoot), vaultStoriesRoot(config), { recursive: true });
  fs.cpSync(repoValidationRoot(repoRoot), vaultValidationRoot(config), { recursive: true });
  fs.cpSync(repoDecisionsRoot(repoRoot), vaultDecisionsRoot(config), { recursive: true });
}

function writeHarnessDefaults(repoRoot: string, config: RepoConfig): void {
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'PRODUCT.md'), productTemplate(config));
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'HARNESS.md'), harnessTemplate());
  writeFileIfMissing(path.join(repoStoriesRoot(repoRoot), 'INDEX.md'), storiesIndexTemplate());
  writeFileIfMissing(path.join(repoValidationRoot(repoRoot), 'TEST_MATRIX.md'), validationTemplate());
  writeFileIfMissing(path.join(repoDecisionsRoot(repoRoot), 'INDEX.md'), decisionsTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'), productTemplate(config));
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'HARNESS.md'), harnessTemplate());
  writeFileIfMissing(path.join(vaultStoriesRoot(config), 'INDEX.md'), storiesIndexTemplate());
  writeFileIfMissing(path.join(vaultValidationRoot(config), 'TEST_MATRIX.md'), validationTemplate());
  writeFileIfMissing(path.join(vaultDecisionsRoot(config), 'INDEX.md'), decisionsTemplate());
}

function toPosix(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
}

function storyVaultPath(repoRoot: string, config: RepoConfig, storyPath: string): string {
  const relative = toPosix(path.relative(repoStoriesRoot(repoRoot), storyPath));
  return path.join(vaultStoriesRoot(config), relative);
}

function collectStoryFiles(storiesRoot: string): string[] {
  if (!fs.existsSync(storiesRoot)) {
    return [];
  }

  const files: string[] = [];
  const stack = [storiesRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md') {
        files.push(entryPath);
      }
    }
  }
  return files.sort();
}

function storyRecordFromFile(repoRoot: string, config: RepoConfig, filePath: string): HarnessStoryRecord | null {
  const content = readIfExists(filePath);
  if (!content) {
    return null;
  }
  const fields = parseFrontmatter(content);
  const title = storyTitleFromContent(filePath, content);
  return {
    title,
    slug: fields.slug || slugify(title),
    risk: normalizeRisk(fields.risk),
    status: normalizeStatus(fields.status),
    created: fields.created || path.basename(path.dirname(filePath)),
    updated: fields.updated || fs.statSync(filePath).mtime.toISOString(),
    proofCount: countProofEntries(content),
    repoPath: filePath,
    vaultPath: storyVaultPath(repoRoot, config, filePath),
    relativeRepoPath: toPosix(path.relative(repoRoot, filePath)),
  };
}

function readStories(repoRoot: string, config: RepoConfig): HarnessStoryRecord[] {
  return collectStoryFiles(repoStoriesRoot(repoRoot))
    .map((filePath) => storyRecordFromFile(repoRoot, config, filePath))
    .filter((record): record is HarnessStoryRecord => Boolean(record))
    .sort((left, right) => right.updated.localeCompare(left.updated));
}

function currentStoryFromStories(stories: HarnessStoryRecord[]): HarnessStoryRecord | null {
  return stories[0] || null;
}

function proofGapsForStory(story: HarnessStoryRecord | null): string[] {
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

function proofChecklist(risk: HarnessRisk): string[] {
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

function storyPathFor(repoRoot: string, title: string, date = getTodayString()): string {
  return path.join(repoStoriesRoot(repoRoot), date, `${date}-${slugify(title)}.md`);
}

function renderStory({
  config,
  title,
  risk,
  status,
  created,
  updated,
  progressLines,
  proofLines,
}: {
  config: RepoConfig;
  title: string;
  risk: HarnessRisk;
  status: HarnessStoryStatus;
  created: string;
  updated: string;
  progressLines: string[];
  proofLines: string[];
}): string {
  return [
    '---',
    'type: agent-bootstrap-story',
    `project: ${config.project_slug}`,
    `title: ${title}`,
    `slug: ${slugify(title)}`,
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

function readStoryParts(filePath: string): {
  title: string;
  risk: HarnessRisk;
  created: string;
  progressLines: string[];
  proofLines: string[];
} {
  const content = readIfExists(filePath) || '';
  const fields = parseFrontmatter(content);
  const clean = (sectionName: string): string[] => {
    const match = content.match(new RegExp(`## ${sectionName}\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)`));
    return (match?.[1] || '')
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter((line) => line && line !== '- none yet');
  };

  return {
    title: fields.title || storyTitleFromContent(filePath, content),
    risk: normalizeRisk(fields.risk),
    created: fields.created || path.basename(path.dirname(filePath)),
    progressLines: clean('Progress Log'),
    proofLines: clean('Proof Log'),
  };
}

function writeStoryUpdate({
  repoRoot,
  config,
  storyPath,
  status,
  progressLine,
  proofLine,
}: {
  repoRoot: string;
  config: RepoConfig;
  storyPath: string;
  status: HarnessStoryStatus;
  progressLine?: string;
  proofLine?: string;
}): HarnessStoryRecord {
  const parts = readStoryParts(storyPath);
  const updated = getIsoTimestamp();
  writeFile(storyPath, renderStory({
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

export function ensureProductHarness(repoRoot: string, config: RepoConfig): ProductHarnessStatus {
  ensureHarnessDirectories(repoRoot, config);
  writeHarnessDefaults(repoRoot, config);
  mirrorHarnessToVault(repoRoot, config);
  return getProductHarnessStatus({ repoRoot, config });
}

export function getProductHarnessStatus({ repoRoot, config }: { repoRoot: string; config: RepoConfig }): ProductHarnessStatus {
  ensureHarnessDirectories(repoRoot, config);
  const stories = readStories(repoRoot, config);
  const currentStory = currentStoryFromStories(stories);
  const decisionsBody = readIfExists(path.join(repoDecisionsRoot(repoRoot), 'INDEX.md')) || '';
  const decisionCount = (decisionsBody.match(/^##\s+/gm) || []).length;
  return {
    ok: fs.existsSync(path.join(repoProductRoot(repoRoot), 'HARNESS.md'))
      && fs.existsSync(path.join(vaultStoriesRoot(config), 'INDEX.md')),
    repoHarnessRoot: path.join(repoRoot, 'docs'),
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

export function startHarnessIntake({ repoRoot, config, value }: HarnessCommandOptions): Record<string, unknown> {
  const title = value?.trim();
  if (!title) {
    throw new Error('Harness intake requires a feature title: agent-bootstrap harness intake "<feature title>" [project-path]');
  }
  ensureProductHarness(repoRoot, config);
  const slug = slugify(title);
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

  const created = getTodayString();
  const updated = getIsoTimestamp();
  const risk = classifyHarnessRisk(title);
  const storyPath = storyPathFor(repoRoot, title, created);
  writeFile(storyPath, renderStory({
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

function activeStoryOrThrow(repoRoot: string, config: RepoConfig): HarnessStoryRecord {
  const current = getProductHarnessStatus({ repoRoot, config }).currentStory;
  if (!current) {
    throw new Error('No Product Harness story. Run `agent-bootstrap harness intake "<feature title>"` before recording proof.');
  }
  return current;
}

export function recordHarnessProof({ repoRoot, config, value }: HarnessCommandOptions): Record<string, unknown> {
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

export function recordHarnessDecision({ repoRoot, config, value }: HarnessCommandOptions): Record<string, unknown> {
  const summary = value?.trim();
  if (!summary) {
    throw new Error('Harness decision requires a decision summary.');
  }
  ensureProductHarness(repoRoot, config);
  const timestamp = getIsoTimestamp();
  const entry = [
    '',
    `## ${timestamp}`,
    `- Decision: ${summary}`,
    '- Source: Product Harness',
    '',
  ].join('\n');
  for (const filePath of [
    path.join(repoDecisionsRoot(repoRoot), 'INDEX.md'),
    path.join(vaultDecisionsRoot(config), 'INDEX.md'),
  ]) {
    const existing = readIfExists(filePath) || decisionsTemplate();
    writeFile(filePath, `${existing.trimEnd()}\n${entry}`);
  }
  mirrorHarnessToVault(repoRoot, config);
  return {
    action: 'decision-recorded',
    repoDecisionPath: path.join(repoDecisionsRoot(repoRoot), 'INDEX.md'),
    vaultDecisionPath: path.join(vaultDecisionsRoot(config), 'INDEX.md'),
  };
}

export function formatProductHarnessContext(status: ProductHarnessStatus): string {
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
    lines.push(
      `- Title: ${status.currentStory.title}`,
      `- Risk: ${status.currentStory.risk}`,
      `- Status: ${status.currentStory.status}`,
      `- Source: ${status.currentStory.relativeRepoPath}`,
    );
  } else {
    lines.push('- none');
  }

  lines.push('', '## Proof gaps');
  if (status.proofGaps.length === 0) {
    lines.push('- none');
  } else {
    lines.push(...status.proofGaps.map((gap) => `- ${gap}`));
  }
  lines.push('');
  return lines.join('\n');
}

export function getCurrentStoryFile(repoRoot: string, config: RepoConfig): string | null {
  const current = getProductHarnessStatus({ repoRoot, config }).currentStory;
  return current ? current.repoPath : null;
}

export function getRecentStoryFiles(repoRoot: string, limit = 4): string[] {
  return collectStoryFiles(repoStoriesRoot(repoRoot))
    .sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs)
    .slice(0, limit);
}

export function runHarnessCommand(subcommand: string, options: HarnessCommandOptions): unknown {
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
