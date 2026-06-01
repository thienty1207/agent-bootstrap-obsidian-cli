import cp from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getIsoTimestamp, getTodayString } from './date';
import { ensureDir, readIfExists, slugify, writeFile, writeFileIfMissing } from './fs-utils';
import type { RepoConfig } from './context';

export type HarnessRisk = 'low' | 'medium' | 'high';
export type HarnessStoryStatus = 'intake' | 'proof_added';
export type HarnessInputType =
  | 'new_spec'
  | 'spec_slice'
  | 'change_request'
  | 'new_initiative'
  | 'maintenance'
  | 'harness_improvement';
export type HarnessRiskFlag =
  | 'auth'
  | 'authorization'
  | 'data_model'
  | 'audit_security'
  | 'external_systems'
  | 'public_contract'
  | 'cross_platform'
  | 'existing_behavior'
  | 'weak_proof'
  | 'multi_domain';
export type HarnessOutcome = 'completed' | 'partial' | 'blocked' | 'failed';
export type TraceQualityTier = 'incomplete' | 'minimal' | 'standard' | 'detailed';
export type TraceScoreStatus = 'unscored' | 'passed' | 'failed';
export type HarnessBacklogStatus = 'proposed' | 'accepted' | 'implemented' | 'rejected';

export interface HarnessStoryRecord {
  title: string;
  slug: string;
  risk: HarnessRisk;
  inputType: HarnessInputType;
  riskFlags: HarnessRiskFlag[];
  status: HarnessStoryStatus;
  created: string;
  updated: string;
  proofCount: number;
  latestProof: string | null;
  repoPath: string;
  storyRoot: string;
  vaultPath: string;
  vaultStoryRoot: string;
  relativeRepoPath: string;
  isPacket: boolean;
}

export interface HarnessTraceRecord {
  id: string;
  summary: string;
  outcome: HarnessOutcome;
  created: string;
  risk: HarnessRisk;
  inputType: HarnessInputType;
  requiredTraceTier: TraceQualityTier;
  achievedTraceTier: TraceQualityTier;
  scoreStatus: TraceScoreStatus;
  meetsRequirement: boolean;
  missingFields: string[];
  repoPath: string;
  vaultPath: string;
  relativeRepoPath: string;
  currentStory: string | null;
}

export interface HarnessFrictionRecord {
  pain: string;
  status: HarnessBacklogStatus;
  created: string;
  riskLane: HarnessRisk;
  inputType: HarnessInputType;
  currentStory: string | null;
  currentPlan: string | null;
  linkedTrace: string | null;
  expectedImprovement: string | null;
  actualOutcome: string | null;
  repoPath: string;
  vaultPath: string;
}

export interface HarnessObservabilityStatus {
  latestTraceScore: {
    traceId: string | null;
    status: TraceScoreStatus | 'none';
    achieved: TraceQualityTier | null;
    required: TraceQualityTier | null;
    meetsRequirement: boolean | null;
    missingFields: string[];
  };
  failedTraceQualityGates: number;
  backlogOpen: number;
  backlogClosed: number;
}

export interface ProductHarnessStatus {
  ok: boolean;
  repoHarnessRoot: string;
  vaultHarnessRoot: string;
  docsHealth: HarnessDocsHealth;
  currentStory: HarnessStoryRecord | null;
  latestTrace: HarnessTraceRecord | null;
  openFriction: HarnessFrictionRecord[];
  backlog: HarnessFrictionRecord[];
  observability: HarnessObservabilityStatus;
  proofGaps: string[];
  counts: {
    stories: number;
    highRiskStories: number;
    storiesMissingProof: number;
    decisions: number;
    traces: number;
    openFriction: number;
  };
  stories: HarnessStoryRecord[];
}

export interface HarnessDocsHealth {
  ok: boolean;
  missing: string[];
  maturityStage: string;
  required: string[];
}

interface HarnessCommandOptions {
  repoRoot: string;
  config: RepoConfig;
  value?: string;
  id?: string;
  filter?: 'all' | 'open' | 'closed';
}

interface HarnessClassification {
  inputType: HarnessInputType;
  riskFlags: HarnessRiskFlag[];
  risk: HarnessRisk;
}

interface StoryParts {
  title: string;
  slug: string;
  risk: HarnessRisk;
  inputType: HarnessInputType;
  riskFlags: HarnessRiskFlag[];
  created: string;
  progressLines: string[];
  proofLines: string[];
}

function repoProductRoot(repoRoot: string): string {
  return path.join(repoRoot, 'docs', 'product');
}

function repoTracesRoot(repoRoot: string): string {
  return path.join(repoProductRoot(repoRoot), 'traces');
}

function repoBacklogPath(repoRoot: string): string {
  return path.join(repoProductRoot(repoRoot), 'HARNESS_BACKLOG.md');
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
  tracesRoot: string;
} {
  return {
    productRoot: repoProductRoot(repoRoot),
    storiesRoot: repoStoriesRoot(repoRoot),
    validationRoot: repoValidationRoot(repoRoot),
    decisionsRoot: repoDecisionsRoot(repoRoot),
    tracesRoot: repoTracesRoot(repoRoot),
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

function vaultTracesRoot(config: RepoConfig): string {
  return path.join(getVaultProductHarnessRoot(config), 'Traces');
}

function vaultBacklogPath(config: RepoConfig): string {
  return path.join(getVaultProductHarnessRoot(config), 'HARNESS_BACKLOG.md');
}

function toPosix(relativePath: string): string {
  return relativePath.replace(/\\/g, '/');
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

function normalizeInputType(value?: string): HarnessInputType {
  const allowed: HarnessInputType[] = [
    'new_spec',
    'spec_slice',
    'change_request',
    'new_initiative',
    'maintenance',
    'harness_improvement',
  ];
  return allowed.includes(value as HarnessInputType) ? value as HarnessInputType : 'change_request';
}

function normalizeStatus(value?: string): HarnessStoryStatus {
  return value === 'proof_added' ? 'proof_added' : 'intake';
}

function parseRiskFlags(value?: string): HarnessRiskFlag[] {
  if (!value || value === 'none') {
    return [];
  }
  const allowed = new Set<HarnessRiskFlag>([
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
    .filter((item): item is HarnessRiskFlag => allowed.has(item as HarnessRiskFlag));
}

function extractSectionLines(content: string, sectionName: string): string[] {
  const match = content.match(new RegExp(`## ${sectionName}\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)`));
  return (match?.[1] || '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line && line !== '- none yet');
}

function countProofEntries(content: string): number {
  return extractSectionLines(content, 'Proof Log')
    .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}T/.test(line.trim()))
    .length;
}

function latestProofEntry(content: string): string | null {
  const proofLines = extractSectionLines(content, 'Proof Log')
    .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}T/.test(line.trim()));
  const latest = proofLines[proofLines.length - 1];
  if (!latest) {
    return null;
  }
  return latest.replace(/^-\s+\d{4}-\d{2}-\d{2}T[^\s]+\s+-\s+/, '').trim();
}

function timestampForFile(): string {
  return getIsoTimestamp().replace(/[:.]/g, '-');
}

function includesAny(value: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(value));
}

export function classifyHarnessRisk(title: string): HarnessRisk {
  return classifyHarnessIntake(title).risk;
}

export function classifyHarnessIntake(title: string): HarnessClassification {
  const value = title.toLowerCase();
  const riskFlags: HarnessRiskFlag[] = [];

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
  let inputType: HarnessInputType = 'change_request';
  if (/\bharness\b/.test(value)) {
    inputType = 'harness_improvement';
  } else if (/\bmaintenance\b|\bdependency\b|\bupgrade\b|\bchore\b|\bcleanup\b/.test(value)) {
    inputType = 'maintenance';
  } else if (/\bslice\b|\bphase\b|\bpart\b/.test(value)) {
    inputType = 'spec_slice';
  } else if (/\binitiative\b|\bnew\s+product\b|\blaunch\b/.test(value)) {
    inputType = 'new_initiative';
  } else if (/\bspec\b|\brequirement\b/.test(value)) {
    inputType = 'new_spec';
  }

  const hardGateFlags = new Set<HarnessRiskFlag>([
    'auth',
    'authorization',
    'data_model',
    'audit_security',
    'external_systems',
  ]);
  let risk: HarnessRisk = uniqueFlags.some((flag) => hardGateFlags.has(flag)) ? 'high' : 'low';
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
    '- what trace was left after meaningful work',
    '- what workflow friction should improve next time',
    '',
    'Daily logs still record what happened today. Active Plan State still records what step is active. Product Harness records the feature contract, proof, trace quality, friction, and backlog outcomes.',
    '',
  ].join('\n');
}

function storiesIndexTemplate(): string {
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

function validationTemplate(): string {
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

function decisionsTemplate(): string {
  return [
    '# Product Decisions',
    '',
    'Product Harness decisions are short product or feature decisions. Use vault `Decisions.md` for broader durable technical decisions when needed.',
    '',
  ].join('\n');
}

function backlogTemplate(): string {
  return [
    '# Harness Backlog',
    '',
    'Workflow friction that should make future harness behavior sharper.',
    '',
    'Statuses: proposed, accepted, implemented, rejected.',
    '',
    '## Open Friction',
    '',
    '- none yet',
    '',
  ].join('\n');
}

function traceSpecTemplate(): string {
  return [
    '# Trace Spec',
    '',
    'Product Harness traces are short execution breadcrumbs written after meaningful work.',
    'Trace Quality Gate checks whether the trace is strong enough for the task risk.',
    '',
    '## Quality Tiers',
    '',
    '- incomplete: missing summary or outcome.',
    '- minimal: includes task summary and outcome.',
    '- standard: minimal plus current story and proof summary.',
    '- detailed: standard plus current plan, files changed/read, and verification evidence.',
    '',
    '## Risk Rules',
    '',
    '- Low-risk work requires minimal trace quality.',
    '- Medium-risk work requires standard trace quality.',
    '- High-risk work requires detailed trace quality.',
    '- Auth, permission, payment, security, migration, tenant/RLS, upload, external provider, and data-loss tasks require detailed trace quality.',
    '',
    '## Completion Rule',
    '',
    'Trace scoring is not a replacement for tests. It is a completion-claim gate: if a medium/high-risk trace fails, the agent must improve the trace or avoid claiming the work is done.',
    '',
  ].join('\n');
}

function systemMapTemplate(config: RepoConfig): string {
  return [
    '# System Map',
    '',
    `Project: \`${config.project_slug}\``,
    '',
    'This map helps AI understand product boundaries before changing code.',
    '',
    '## Main Surfaces',
    '',
    '- Product surface: unknown until confirmed from repo context.',
    '- Backend/API surface: unknown until confirmed from repo context.',
    '- Data/storage surface: unknown until confirmed from repo context.',
    '',
    '## External Systems',
    '',
    '- Unknown until confirmed from source, config, or user-provided context.',
    '',
    '## Safety Boundaries',
    '',
    '- Do not infer product behavior from old memory when repo evidence disagrees.',
    '- Use Product Harness stories and proof before claiming a risky feature is done.',
    '',
  ].join('\n');
}

function contextRulesTemplate(): string {
  return [
    '# Context Rules',
    '',
    'AI agents should load the smallest reliable context slice first.',
    '',
    '## Startup Order',
    '',
    '1. `agent-bootstrap context --compact`',
    '2. `agent-bootstrap plan status` when implementation state matters',
    '3. `agent-bootstrap harness status` and `agent-bootstrap harness check` for medium/high-risk work',
    '4. `agent-bootstrap recall "<query>"` only when compact context is insufficient',
    '',
    '## Loading Rules',
    '',
    '- Prefer current project memory.',
    '- Use approved global memory only when it matches the task.',
    '- Treat cross-project memory as reference, not truth, unless the query explicitly matches it.',
    '- Do not load full story, trace, session, or daily history unless full context is requested.',
    '',
  ].join('\n');
}

function glossaryTemplate(): string {
  return [
    '# Glossary',
    '',
    '- Daily log: what happened today.',
    '- Active Plan State: the current implementation step and verification state.',
    '- Product Harness: feature goal, scope, risk, proof, trace quality, friction, and backlog outcomes.',
    '- Trace: a short breadcrumb of meaningful work after it happened.',
    '- Friction: a workflow pain that should improve the kit next time.',
    '- Memory Engine: the AI-facing index that filters Vault memory without replacing Markdown.',
    '- Memory Firewall: rules that prevent unrelated project memory from leaking into current context.',
    '',
  ].join('\n');
}

function maturityTemplate(): string {
  return [
    '# Harness Maturity',
    '',
    'Use this as a lightweight health signal, not a scorecard.',
    '',
    '## Stages',
    '',
    '- Stage 0 - Ad hoc: notes exist but feature proof is inconsistent.',
    '- Stage 1 - Basic harness: stories, risk, and proof exist for important work.',
    '- Stage 2 - Traceable delivery: proof, traces, and decisions connect to plans.',
    '- Stage 3 - Adaptive harness: recurring friction becomes kit improvement.',
    '',
    'Current default: Stage 1 until the project has repeated proof, trace quality, and friction review.',
    '',
  ].join('\n');
}

function componentsTemplate(): string {
  return [
    '# Harness Components',
    '',
    '- `PRODUCT.md`: what the product is and what users can trust.',
    '- `HARNESS.md`: how feature intent, risk, proof, trace quality, friction, and backlog outcomes fit together.',
    '- `SYSTEM_MAP.md`: product and system boundaries.',
    '- `CONTEXT_RULES.md`: what AI should load first and what to skip.',
    '- `GLOSSARY.md`: shared meaning for recurring workflow terms.',
    '- `MATURITY.md`: lightweight adoption stages.',
    '- `HARNESS_BACKLOG.md`: open workflow friction.',
    '- `TRACE_SPEC.md`: trace quality gate rules.',
    '- `docs/stories/`: feature stories and high-risk story packets.',
    '- `docs/validation/TEST_MATRIX.md`: proof visibility.',
    '- `docs/product/traces/`: short execution traces.',
    '',
  ].join('\n');
}

function tracesReadmeTemplate(): string {
  return [
    '# Harness Traces',
    '',
    'Short execution traces written after meaningful work. Compact context loads only the latest trace.',
    '',
  ].join('\n');
}

function ensureHarnessDirectories(repoRoot: string, config: RepoConfig): void {
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
    ensureDir(dirPath);
  }
}

function copyIfExists(sourcePath: string, targetPath: string): void {
  if (!fs.existsSync(sourcePath)) {
    return;
  }
  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
}

function mirrorHarnessToVault(repoRoot: string, config: RepoConfig): void {
  ensureHarnessDirectories(repoRoot, config);
  copyIfExists(path.join(repoProductRoot(repoRoot), 'PRODUCT.md'), path.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'HARNESS.md'), path.join(getVaultProductHarnessRoot(config), 'HARNESS.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'SYSTEM_MAP.md'), path.join(getVaultProductHarnessRoot(config), 'SYSTEM_MAP.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'CONTEXT_RULES.md'), path.join(getVaultProductHarnessRoot(config), 'CONTEXT_RULES.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'GLOSSARY.md'), path.join(getVaultProductHarnessRoot(config), 'GLOSSARY.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'MATURITY.md'), path.join(getVaultProductHarnessRoot(config), 'MATURITY.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'COMPONENTS.md'), path.join(getVaultProductHarnessRoot(config), 'COMPONENTS.md'));
  copyIfExists(path.join(repoProductRoot(repoRoot), 'TRACE_SPEC.md'), path.join(getVaultProductHarnessRoot(config), 'TRACE_SPEC.md'));
  copyIfExists(repoBacklogPath(repoRoot), vaultBacklogPath(config));
  fs.cpSync(repoTracesRoot(repoRoot), vaultTracesRoot(config), { recursive: true });
  fs.cpSync(repoStoriesRoot(repoRoot), vaultStoriesRoot(config), { recursive: true });
  fs.cpSync(repoValidationRoot(repoRoot), vaultValidationRoot(config), { recursive: true });
  fs.cpSync(repoDecisionsRoot(repoRoot), vaultDecisionsRoot(config), { recursive: true });
}

function writeHarnessDefaults(repoRoot: string, config: RepoConfig): void {
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'PRODUCT.md'), productTemplate(config));
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'HARNESS.md'), harnessTemplate());
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'SYSTEM_MAP.md'), systemMapTemplate(config));
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'CONTEXT_RULES.md'), contextRulesTemplate());
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'GLOSSARY.md'), glossaryTemplate());
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'MATURITY.md'), maturityTemplate());
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'COMPONENTS.md'), componentsTemplate());
  writeFileIfMissing(path.join(repoProductRoot(repoRoot), 'TRACE_SPEC.md'), traceSpecTemplate());
  writeFileIfMissing(repoBacklogPath(repoRoot), backlogTemplate());
  writeFileIfMissing(path.join(repoTracesRoot(repoRoot), 'README.md'), tracesReadmeTemplate());
  writeFileIfMissing(path.join(repoStoriesRoot(repoRoot), 'INDEX.md'), storiesIndexTemplate());
  writeFileIfMissing(path.join(repoValidationRoot(repoRoot), 'TEST_MATRIX.md'), validationTemplate());
  writeFileIfMissing(path.join(repoDecisionsRoot(repoRoot), 'INDEX.md'), decisionsTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'PRODUCT.md'), productTemplate(config));
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'HARNESS.md'), harnessTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'SYSTEM_MAP.md'), systemMapTemplate(config));
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'CONTEXT_RULES.md'), contextRulesTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'GLOSSARY.md'), glossaryTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'MATURITY.md'), maturityTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'COMPONENTS.md'), componentsTemplate());
  writeFileIfMissing(path.join(getVaultProductHarnessRoot(config), 'TRACE_SPEC.md'), traceSpecTemplate());
  writeFileIfMissing(vaultBacklogPath(config), backlogTemplate());
  writeFileIfMissing(path.join(vaultTracesRoot(config), 'README.md'), tracesReadmeTemplate());
  writeFileIfMissing(path.join(vaultStoriesRoot(config), 'INDEX.md'), storiesIndexTemplate());
  writeFileIfMissing(path.join(vaultValidationRoot(config), 'TEST_MATRIX.md'), validationTemplate());
  writeFileIfMissing(path.join(vaultDecisionsRoot(config), 'INDEX.md'), decisionsTemplate());
}

function storyVaultPath(repoRoot: string, config: RepoConfig, storyPath: string): string {
  const relative = toPosix(path.relative(repoStoriesRoot(repoRoot), storyPath));
  return path.join(vaultStoriesRoot(config), relative);
}

function storyVaultRoot(repoRoot: string, config: RepoConfig, storyRoot: string): string {
  const relative = toPosix(path.relative(repoStoriesRoot(repoRoot), storyRoot));
  return path.join(vaultStoriesRoot(config), relative);
}

function storyPathFor(repoRoot: string, title: string, risk: HarnessRisk, date = getTodayString()): { storyPath: string; storyRoot: string } {
  const slug = slugify(title);
  if (risk === 'high') {
    const storyRoot = path.join(repoStoriesRoot(repoRoot), date, `${date}-${slug}`);
    return {
      storyRoot,
      storyPath: path.join(storyRoot, 'overview.md'),
    };
  }
  const storyPath = path.join(repoStoriesRoot(repoRoot), date, `${date}-${slug}.md`);
  return {
    storyRoot: storyPath,
    storyPath,
  };
}

function isPacketPart(fileName: string): boolean {
  return fileName === 'design.md' || fileName === 'validation.md' || fileName === 'execplan.md';
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
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'INDEX.md' && !isPacketPart(entry.name)) {
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
  const isPacket = path.basename(filePath) === 'overview.md' || fields.type === 'agent-bootstrap-story-packet';
  const storyRoot = isPacket ? path.dirname(filePath) : filePath;
  return {
    title,
    slug: fields.slug || slugify(title),
    risk: normalizeRisk(fields.risk),
    inputType: normalizeInputType(fields.input_type),
    riskFlags: parseRiskFlags(fields.risk_flags),
    status: normalizeStatus(fields.status),
    created: fields.created || path.basename(path.dirname(filePath)),
    updated: fields.updated || fs.statSync(filePath).mtime.toISOString(),
    proofCount: countProofEntries(content),
    latestProof: latestProofEntry(content),
    repoPath: filePath,
    storyRoot,
    vaultPath: storyVaultPath(repoRoot, config, filePath),
    vaultStoryRoot: storyVaultRoot(repoRoot, config, storyRoot),
    relativeRepoPath: toPosix(path.relative(repoRoot, filePath)),
    isPacket,
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

function storyFrontmatter({
  config,
  title,
  risk,
  inputType,
  riskFlags,
  status,
  created,
  updated,
  packet,
}: {
  config: RepoConfig;
  title: string;
  risk: HarnessRisk;
  inputType: HarnessInputType;
  riskFlags: HarnessRiskFlag[];
  status: HarnessStoryStatus;
  created: string;
  updated: string;
  packet: boolean;
}): string[] {
  return [
    '---',
    `type: ${packet ? 'agent-bootstrap-story-packet' : 'agent-bootstrap-story'}`,
    `project: ${config.project_slug}`,
    `title: ${title}`,
    `slug: ${slugify(title)}`,
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

function renderStory({
  config,
  title,
  risk,
  inputType,
  riskFlags,
  status,
  created,
  updated,
  progressLines,
  proofLines,
}: {
  config: RepoConfig;
  title: string;
  risk: HarnessRisk;
  inputType: HarnessInputType;
  riskFlags: HarnessRiskFlag[];
  status: HarnessStoryStatus;
  created: string;
  updated: string;
  progressLines: string[];
  proofLines: string[];
}): string {
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

function renderPacketOverview({
  config,
  title,
  risk,
  inputType,
  riskFlags,
  status,
  created,
  updated,
  progressLines,
  proofLines,
}: {
  config: RepoConfig;
  title: string;
  risk: HarnessRisk;
  inputType: HarnessInputType;
  riskFlags: HarnessRiskFlag[];
  status: HarnessStoryStatus;
  created: string;
  updated: string;
  progressLines: string[];
  proofLines: string[];
}): string {
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

function renderPacketDesign(title: string, classification: HarnessClassification): string {
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

function renderPacketValidation(title: string, classification: HarnessClassification, proofLines: string[] = []): string {
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

function renderPacketExecPlan(title: string): string {
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

function readStoryParts(filePath: string): StoryParts {
  const content = readIfExists(filePath) || '';
  const fields = parseFrontmatter(content);
  const title = fields.title || storyTitleFromContent(filePath, content);
  return {
    title,
    slug: fields.slug || slugify(title),
    risk: normalizeRisk(fields.risk),
    inputType: normalizeInputType(fields.input_type),
    riskFlags: parseRiskFlags(fields.risk_flags),
    created: fields.created || path.basename(path.dirname(filePath)),
    progressLines: extractSectionLines(content, 'Progress Log'),
    proofLines: extractSectionLines(content, 'Proof Log'),
  };
}

function updateValidationMatrix(repoRoot: string, config: RepoConfig): void {
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
  writeFile(path.join(repoValidationRoot(repoRoot), 'TEST_MATRIX.md'), lines.join('\n'));
  writeFile(path.join(vaultValidationRoot(config), 'TEST_MATRIX.md'), lines.join('\n'));
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
  const progressLines = progressLine ? [...parts.progressLines, `- ${updated} - ${progressLine}`] : parts.progressLines;
  const proofLines = proofLine ? [...parts.proofLines, `- ${updated} - ${proofLine}`] : parts.proofLines;
  const isPacket = path.basename(storyPath) === 'overview.md';

  if (isPacket) {
    writeFile(storyPath, renderPacketOverview({
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
    const validationPath = path.join(path.dirname(storyPath), 'validation.md');
    writeFile(validationPath, renderPacketValidation(parts.title, {
      risk: parts.risk,
      inputType: parts.inputType,
      riskFlags: parts.riskFlags,
    }, proofLines));
  } else {
    writeFile(storyPath, renderStory({
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

function traceFiles(root: string): string[] {
  if (!fs.existsSync(root)) {
    return [];
  }
  const files: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        files.push(entryPath);
      }
    }
  }
  return files.sort((left, right) => fs.statSync(right).mtimeMs - fs.statSync(left).mtimeMs);
}

function inferTraceOutcome(summary: string): HarnessOutcome {
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

function requiredTraceTierForRisk(risk: HarnessRisk): TraceQualityTier {
  if (risk === 'high') return 'detailed';
  if (risk === 'medium') return 'standard';
  return 'minimal';
}

function tierRank(tier: TraceQualityTier): number {
  switch (tier) {
    case 'detailed': return 3;
    case 'standard': return 2;
    case 'minimal': return 1;
    case 'incomplete': return 0;
  }
}

function normalizeTraceTier(value?: string): TraceQualityTier {
  return value === 'detailed' || value === 'standard' || value === 'minimal' || value === 'incomplete'
    ? value
    : 'incomplete';
}

function normalizeTraceScoreStatus(value?: string): TraceScoreStatus {
  return value === 'passed' || value === 'failed' || value === 'unscored' ? value : 'unscored';
}

function traceField(content: string, label: string): string | null {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return content.match(new RegExp(`^- ${escaped}:\\s+(.+)$`, 'm'))?.[1]?.trim() || null;
}

function traceSectionItems(content: string, heading: string): string[] {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`## ${escaped}\\r?\\n\\r?\\n([\\s\\S]*?)(?:\\r?\\n## |\\s*$)`));
  return (match?.[1] || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line))
    .map((line) => line.replace(/^-\s+/, '').trim());
}

function parseMissingFields(value: string | null): string[] {
  if (!value || value === 'none' || value === 'not scored yet') return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function normalizeYesNo(value: string | null): boolean {
  return value === 'yes' || value === 'true' || value === 'passed';
}

function traceIdFromPath(filePath: string): string {
  return `trace-${slugify(path.basename(filePath, '.md')).slice(0, 96)}`;
}

function traceRiskFromContent(summary: string, content: string): HarnessRisk {
  const explicit = normalizeRisk(traceField(content, 'Risk lane') || undefined);
  if (traceField(content, 'Risk lane')) return explicit;
  const story = traceField(content, 'Current story');
  return classifyHarnessIntake(story && story !== 'none' ? story : summary).risk;
}

function traceInputTypeFromContent(summary: string, content: string): HarnessInputType {
  const explicit = normalizeInputType(traceField(content, 'Input type') || undefined);
  if (traceField(content, 'Input type')) return explicit;
  const story = traceField(content, 'Current story');
  return classifyHarnessIntake(story && story !== 'none' ? story : summary).inputType;
}

function readTraceRecord(repoRoot: string, config: RepoConfig, filePath: string): HarnessTraceRecord | null {
  const content = readIfExists(filePath);
  if (!content) {
    return null;
  }
  const summary = content.match(/^- Summary:\s+(.+)$/m)?.[1]?.trim()
    || content.match(/^#\s+(.+)$/m)?.[1]?.trim()
    || path.basename(filePath, '.md');
  const outcome = normalizeOutcome(content.match(/^- Outcome:\s+(.+)$/m)?.[1]?.trim());
  const created = content.match(/^- Created:\s+(.+)$/m)?.[1]?.trim() || fs.statSync(filePath).mtime.toISOString();
  const currentStory = content.match(/^- Current story:\s+(.+)$/m)?.[1]?.trim() || null;
  const risk = traceRiskFromContent(summary, content);
  const inputType = traceInputTypeFromContent(summary, content);
  const requiredRaw = traceField(content, 'Required trace tier');
  const requiredTraceTier = requiredRaw ? normalizeTraceTier(requiredRaw) : requiredTraceTierForRisk(risk);
  const scoreStatus = normalizeTraceScoreStatus(traceField(content, 'Score status') || traceField(content, 'Status') || undefined);
  const achievedTraceTier = normalizeTraceTier(traceField(content, 'Achieved trace tier') || traceField(content, 'Achieved tier') || undefined);
  const meetsRequirement = normalizeYesNo(traceField(content, 'Meets requirement'));
  const missingFields = parseMissingFields(traceField(content, 'Missing fields'));
  const relative = toPosix(path.relative(repoTracesRoot(repoRoot), filePath));
  return {
    id: traceField(content, 'Trace id') || traceIdFromPath(filePath),
    summary,
    outcome,
    created,
    risk,
    inputType,
    requiredTraceTier,
    achievedTraceTier,
    scoreStatus,
    meetsRequirement,
    missingFields,
    repoPath: filePath,
    vaultPath: path.join(vaultTracesRoot(config), relative),
    relativeRepoPath: toPosix(path.relative(repoRoot, filePath)),
    currentStory: currentStory === 'none' ? null : currentStory,
  };
}

function normalizeOutcome(value?: string): HarnessOutcome {
  if (value === 'blocked' || value === 'failed' || value === 'partial' || value === 'completed') {
    return value;
  }
  return 'completed';
}

function latestTrace(repoRoot: string, config: RepoConfig): HarnessTraceRecord | null {
  const latest = traceFiles(repoTracesRoot(repoRoot))[0];
  return latest ? readTraceRecord(repoRoot, config, latest) : null;
}

function parseBacklogStatus(heading: string): HarnessBacklogStatus {
  if (/\baccepted\b/i.test(heading)) return 'accepted';
  if (/\bimplemented\b/i.test(heading)) return 'implemented';
  if (/\brejected\b/i.test(heading) || /\bresolved\b/i.test(heading)) return 'rejected';
  return 'proposed';
}

function readBacklogItems(repoRoot: string, config: RepoConfig): HarnessFrictionRecord[] {
  const content = readIfExists(repoBacklogPath(repoRoot)) || '';
  const records: HarnessFrictionRecord[] = [];
  const blocks = content.split(/\r?\n##\s+/).slice(1);
  for (const block of blocks) {
    const [heading, ...lines] = block.split(/\r?\n/);
    if (!heading || heading === 'Open Friction') {
      continue;
    }
    const status = parseBacklogStatus(heading);
    const pain = lines.find((line) => /^-\s+Pain:\s+/.test(line))?.replace(/^-\s+Pain:\s+/, '').trim()
      || lines.find((line) => /^-\s+/.test(line))?.replace(/^-\s+/, '').trim()
      || heading.trim();
    const riskLane = normalizeRisk(lines.find((line) => /^-\s+Risk lane:\s+/.test(line))?.replace(/^-\s+Risk lane:\s+/, '').trim());
    const inputType = normalizeInputType(lines.find((line) => /^-\s+Input type:\s+/.test(line))?.replace(/^-\s+Input type:\s+/, '').trim());
    const currentStory = lines.find((line) => /^-\s+Current story:\s+/.test(line))?.replace(/^-\s+Current story:\s+/, '').trim() || null;
    const currentPlan = lines.find((line) => /^-\s+Current plan:\s+/.test(line))?.replace(/^-\s+Current plan:\s+/, '').trim() || null;
    const linkedTrace = lines.find((line) => /^-\s+Linked trace:\s+/.test(line))?.replace(/^-\s+Linked trace:\s+/, '').trim() || null;
    const expectedImprovement = lines.find((line) => /^-\s+Expected improvement:\s+/.test(line))?.replace(/^-\s+Expected improvement:\s+/, '').trim() || null;
    const actualOutcome = lines.find((line) => /^-\s+Actual outcome:\s+/.test(line))?.replace(/^-\s+Actual outcome:\s+/, '').trim() || null;
    records.push({
      pain,
      status,
      created: heading.split(' - ')[0].trim(),
      riskLane,
      inputType,
      currentStory: currentStory === 'none' ? null : currentStory,
      currentPlan: currentPlan === 'none' ? null : currentPlan,
      linkedTrace: linkedTrace === 'none' ? null : linkedTrace,
      expectedImprovement,
      actualOutcome,
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
        riskLane: 'medium',
        inputType: 'change_request',
        currentStory: null,
        currentPlan: null,
        linkedTrace: null,
        expectedImprovement: null,
        actualOutcome: null,
        repoPath: repoBacklogPath(repoRoot),
        vaultPath: vaultBacklogPath(config),
      });
    }
  }
  return records;
}

function readOpenFriction(repoRoot: string, config: RepoConfig): HarnessFrictionRecord[] {
  return readBacklogItems(repoRoot, config).filter((item) => item.status === 'proposed' || item.status === 'accepted');
}

function getGitStatus(repoRoot: string): string[] {
  try {
    return cp.execFileSync('git', ['status', '--short'], { cwd: repoRoot, encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trimEnd())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function currentPlanPointer(repoRoot: string): string {
  const currentPath = path.join(repoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md');
  const body = readIfExists(currentPath);
  if (!body) {
    return 'none';
  }
  return body.match(/- Plan:\s+(.+)$/m)?.[1]?.trim() || 'none';
}

function findTraceById(repoRoot: string, config: RepoConfig, id?: string): HarnessTraceRecord | null {
  const traces = traceFiles(repoTracesRoot(repoRoot))
    .map((filePath) => readTraceRecord(repoRoot, config, filePath))
    .filter((trace): trace is HarnessTraceRecord => Boolean(trace));
  if (!id) {
    return traces[0] || null;
  }
  return traces.find((trace) => trace.id === id) || null;
}

function verificationLooksReal(value: string | null): boolean {
  if (!value || value === 'none') return false;
  return /\b(test|tests|passed|verified|verification|smoke|build|lint|typecheck|screenshot|suite|npm|go test|cargo test|pytest|vitest|playwright)\b/i.test(value);
}

function filesEvidenceLooksReal(items: string[]): boolean {
  return items.some((item) => item && !/clean or unavailable/i.test(item));
}

function scoreTraceRecord(trace: HarnessTraceRecord, content: string): {
  achieved: TraceQualityTier;
  required: TraceQualityTier;
  meetsRequirement: boolean;
  missingFields: string[];
  nextAction: string;
} {
  const required = requiredTraceTierForRisk(trace.risk);
  const currentPlan = traceField(content, 'Current plan');
  const proofSummary = traceField(content, 'Proof summary');
  const fileItems = traceSectionItems(content, 'Files Changed Or Read');

  const minimalMissing: string[] = [];
  if (!trace.summary || trace.summary === 'Harness Trace') minimalMissing.push('task summary');
  if (!trace.outcome) minimalMissing.push('outcome');

  const standardMissing = [...minimalMissing];
  if (!trace.currentStory) standardMissing.push('current story');
  if (!proofSummary || proofSummary === 'none') standardMissing.push('proof summary');

  const detailedMissing = [...standardMissing];
  if (!currentPlan || currentPlan === 'none') detailedMissing.push('current plan');
  if (!filesEvidenceLooksReal(fileItems)) detailedMissing.push('files changed/read');
  if (!verificationLooksReal(proofSummary)) detailedMissing.push('verification evidence');

  let achieved: TraceQualityTier = 'detailed';
  if (minimalMissing.length > 0) {
    achieved = 'incomplete';
  } else if (standardMissing.length > 0) {
    achieved = 'minimal';
  } else if (detailedMissing.length > 0) {
    achieved = 'standard';
  }

  const missingFields = required === 'minimal'
    ? minimalMissing
    : required === 'standard'
      ? standardMissing
      : detailedMissing;
  const meetsRequirement = tierRank(achieved) >= tierRank(required) && missingFields.length === 0;
  return {
    achieved,
    required,
    meetsRequirement,
    missingFields,
    nextAction: meetsRequirement
      ? 'Trace quality gate passed.'
      : `Improve trace before claiming completion: ${missingFields.join(', ') || 'required quality not met'}.`,
  };
}

function replaceTraceField(content: string, label: string, value: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^- ${escaped}:.*$`, 'm');
  if (pattern.test(content)) {
    return content.replace(pattern, `- ${label}: ${value}`);
  }
  return content.replace(/^# Harness Trace\r?\n\r?\n/, `# Harness Trace\n\n- ${label}: ${value}\n`);
}

function writeTraceScore(trace: HarnessTraceRecord, score: ReturnType<typeof scoreTraceRecord>): void {
  const raw = readIfExists(trace.repoPath);
  if (!raw) {
    throw new Error(`Could not read harness trace: ${trace.repoPath}`);
  }
  const status: TraceScoreStatus = score.meetsRequirement ? 'passed' : 'failed';
  let updated = raw.replace(/\r?\n## Trace Quality Score\r?\n[\s\S]*?(?=\r?\n## |\s*$)/, '');
  updated = replaceTraceField(updated, 'Score status', status);
  updated = replaceTraceField(updated, 'Achieved trace tier', score.achieved);
  updated = replaceTraceField(updated, 'Meets requirement', score.meetsRequirement ? 'yes' : 'no');
  updated = replaceTraceField(updated, 'Missing fields', score.missingFields.length > 0 ? score.missingFields.join(', ') : 'none');
  updated = `${updated.trimEnd()}\n\n## Trace Quality Score\n\n`
    + `- Status: ${status}\n`
    + `- Achieved tier: ${score.achieved}\n`
    + `- Required tier: ${score.required}\n`
    + `- Meets requirement: ${score.meetsRequirement ? 'yes' : 'no'}\n`
    + `- Missing fields: ${score.missingFields.length > 0 ? score.missingFields.join(', ') : 'none'}\n`
    + `- Next action: ${score.nextAction}\n`;
  writeFile(trace.repoPath, updated);
  writeFile(trace.vaultPath, updated);
}

function backlogFilter(items: HarnessFrictionRecord[], filter: 'all' | 'open' | 'closed'): HarnessFrictionRecord[] {
  if (filter === 'open') {
    return items.filter((item) => item.status === 'proposed' || item.status === 'accepted');
  }
  if (filter === 'closed') {
    return items.filter((item) => item.status === 'implemented' || item.status === 'rejected');
  }
  return items;
}

function frictionReason(pain: string): 'proof' | 'context' | 'trace' | 'verification' | 'workflow' {
  const value = pain.toLowerCase();
  if (/\bproof\b|\bevidence\b/.test(value)) return 'proof';
  if (/\bcontext\b|\bmissing information\b|\bunclear\b/.test(value)) return 'context';
  if (/\btrace\b|\blog\b/.test(value)) return 'trace';
  if (/\bverification\b|\btest\b|\bsmoke\b|\bcheck\b/.test(value)) return 'verification';
  return 'workflow';
}

function incrementCount<T extends string>(target: Record<T, number>, key: T): void {
  target[key] = (target[key] || 0) + 1;
}

function observabilityStatus(traces: HarnessTraceRecord[], backlog: HarnessFrictionRecord[]): HarnessObservabilityStatus {
  const latest = traces[0] || null;
  const open = backlogFilter(backlog, 'open');
  const closed = backlogFilter(backlog, 'closed');
  return {
    latestTraceScore: latest
      ? {
        traceId: latest.id,
        status: latest.scoreStatus,
        achieved: latest.achievedTraceTier,
        required: latest.requiredTraceTier,
        meetsRequirement: latest.scoreStatus === 'unscored' ? null : latest.meetsRequirement,
        missingFields: latest.missingFields,
      }
      : {
        traceId: null,
        status: 'none',
        achieved: null,
        required: null,
        meetsRequirement: null,
        missingFields: [],
      },
    failedTraceQualityGates: traces.filter((trace) => trace.scoreStatus === 'failed').length,
    backlogOpen: open.length,
    backlogClosed: closed.length,
  };
}

function requiredHarnessDocs(repoRoot: string, config: RepoConfig): Array<{ label: string; repoPath: string; vaultPath: string }> {
  return [
    ['PRODUCT.md', 'PRODUCT.md'],
    ['HARNESS.md', 'HARNESS.md'],
    ['SYSTEM_MAP.md', 'SYSTEM_MAP.md'],
    ['CONTEXT_RULES.md', 'CONTEXT_RULES.md'],
    ['GLOSSARY.md', 'GLOSSARY.md'],
    ['MATURITY.md', 'MATURITY.md'],
    ['COMPONENTS.md', 'COMPONENTS.md'],
    ['HARNESS_BACKLOG.md', 'HARNESS_BACKLOG.md'],
    ['TRACE_SPEC.md', 'TRACE_SPEC.md'],
  ].map(([label, fileName]) => ({
    label,
    repoPath: path.join(repoProductRoot(repoRoot), fileName),
    vaultPath: path.join(getVaultProductHarnessRoot(config), fileName),
  }));
}

export function checkProductHarnessDocs({ repoRoot, config }: { repoRoot: string; config: RepoConfig }): HarnessDocsHealth {
  const required = requiredHarnessDocs(repoRoot, config);
  const missing = required.flatMap((item) => {
    const misses: string[] = [];
    if (!fs.existsSync(item.repoPath)) misses.push(toPosix(path.relative(repoRoot, item.repoPath)));
    if (!fs.existsSync(item.vaultPath)) misses.push(toPosix(path.relative(config.project_root, item.vaultPath)));
    return misses;
  });
  const traces = traceFiles(repoTracesRoot(repoRoot)).length;
  const stories = readStories(repoRoot, config);
  const friction = readOpenFriction(repoRoot, config);
  const hasProof = stories.some((story) => story.proofCount > 0);
  const maturityStage = traces > 0 && hasProof && friction.length > 0
    ? 'Stage 3 - Adaptive harness'
    : traces > 0 && hasProof
      ? 'Stage 2 - Traceable delivery'
      : stories.length > 0
        ? 'Stage 1 - Basic harness'
        : 'Stage 1 - Basic harness';
  return {
    ok: missing.length === 0,
    missing,
    maturityStage,
    required: required.map((item) => toPosix(path.relative(repoRoot, item.repoPath))),
  };
}

export function ensureProductHarness(repoRoot: string, config: RepoConfig): ProductHarnessStatus {
  ensureHarnessDirectories(repoRoot, config);
  writeHarnessDefaults(repoRoot, config);
  updateValidationMatrix(repoRoot, config);
  mirrorHarnessToVault(repoRoot, config);
  return getProductHarnessStatus({ repoRoot, config });
}

export function getProductHarnessStatus({ repoRoot, config }: { repoRoot: string; config: RepoConfig }): ProductHarnessStatus {
  ensureHarnessDirectories(repoRoot, config);
  const stories = readStories(repoRoot, config);
  const currentStory = currentStoryFromStories(stories);
  const decisionsBody = readIfExists(path.join(repoDecisionsRoot(repoRoot), 'INDEX.md')) || '';
  const decisionCount = (decisionsBody.match(/^##\s+/gm) || []).length;
  const backlog = readBacklogItems(repoRoot, config);
  const openFriction = readOpenFriction(repoRoot, config);
  const traces = traceFiles(repoTracesRoot(repoRoot))
    .map((filePath) => readTraceRecord(repoRoot, config, filePath))
    .filter((trace): trace is HarnessTraceRecord => Boolean(trace));
  const traceCount = traces.length;
  const docsHealth = checkProductHarnessDocs({ repoRoot, config });
  return {
    ok: docsHealth.ok
      && fs.existsSync(path.join(repoProductRoot(repoRoot), 'HARNESS.md'))
      && fs.existsSync(repoBacklogPath(repoRoot))
      && fs.existsSync(repoTracesRoot(repoRoot))
      && fs.existsSync(path.join(vaultStoriesRoot(config), 'INDEX.md'))
      && fs.existsSync(vaultBacklogPath(config))
      && fs.existsSync(vaultTracesRoot(config)),
    repoHarnessRoot: path.join(repoRoot, 'docs'),
    vaultHarnessRoot: getVaultProductHarnessRoot(config),
    docsHealth,
    currentStory,
    latestTrace: traces[0] || null,
    openFriction,
    backlog,
    observability: observabilityStatus(traces, backlog),
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
      inputType: resumed.inputType,
      riskFlags: resumed.riskFlags,
      status: resumed.status,
      storyPath: resumed.repoPath,
      storyRoot: resumed.storyRoot,
      vaultStoryPath: resumed.vaultPath,
      vaultStoryRoot: resumed.vaultStoryRoot,
    };
  }

  const created = getTodayString();
  const updated = getIsoTimestamp();
  const classification = classifyHarnessIntake(title);
  const { storyPath, storyRoot } = storyPathFor(repoRoot, title, classification.risk, created);
  if (classification.risk === 'high') {
    writeFile(storyPath, renderPacketOverview({
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
    writeFile(path.join(storyRoot, 'design.md'), renderPacketDesign(title, classification));
    writeFile(path.join(storyRoot, 'validation.md'), renderPacketValidation(title, classification));
    writeFile(path.join(storyRoot, 'execplan.md'), renderPacketExecPlan(title));
  } else {
    writeFile(storyPath, renderStory({
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
    storyRoot: record.storyRoot,
    vaultStoryPath: record.vaultPath,
    vaultStoryRoot: record.vaultStoryRoot,
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

export function recordHarnessTrace({ repoRoot, config, value }: HarnessCommandOptions): Record<string, unknown> {
  const summary = value?.trim();
  if (!summary) {
    throw new Error('Harness trace requires a short task summary.');
  }
  ensureProductHarness(repoRoot, config);
  const status = getProductHarnessStatus({ repoRoot, config });
  const timestamp = getIsoTimestamp();
  const today = getTodayString();
  const outcome = inferTraceOutcome(summary);
  const classification = status.currentStory
    ? {
      risk: status.currentStory.risk,
      inputType: status.currentStory.inputType,
    }
    : classifyHarnessIntake(summary);
  const requiredTraceTier = requiredTraceTierForRisk(classification.risk);
  const traceId = `trace-${timestampForFile()}-${slugify(summary).slice(0, 48)}`;
  const tracePath = path.join(repoTracesRoot(repoRoot), today, `${timestampForFile()}-${slugify(summary).slice(0, 80)}.md`);
  const relativeTrace = toPosix(path.relative(repoTracesRoot(repoRoot), tracePath));
  const vaultTracePath = path.join(vaultTracesRoot(config), relativeTrace);
  const changedFiles = getGitStatus(repoRoot);
  const proofSummary = status.currentStory?.latestProof || 'none';
  const currentPlan = currentPlanPointer(repoRoot);
  const body = [
    '# Harness Trace',
    '',
    `- Trace id: ${traceId}`,
    `- Created: ${timestamp}`,
    `- Summary: ${summary}`,
    `- Outcome: ${outcome}`,
    `- Risk lane: ${classification.risk}`,
    `- Input type: ${classification.inputType}`,
    `- Required trace tier: ${requiredTraceTier}`,
    '- Score status: unscored',
    '- Achieved trace tier: incomplete',
    '- Meets requirement: no',
    '- Missing fields: not scored yet',
    `- Current story: ${status.currentStory ? status.currentStory.title : 'none'}`,
    `- Current story path: ${status.currentStory ? status.currentStory.relativeRepoPath : 'none'}`,
    `- Current plan: ${currentPlan}`,
    `- Proof status: ${proofSummary === 'none' ? 'missing' : 'present'}`,
    `- Proof summary: ${proofSummary}`,
    '',
    '## Files Changed Or Read',
    '',
    ...(changedFiles.length > 0 ? changedFiles.map((line) => `- ${line}`) : ['- clean or unavailable']),
    '',
    '## Errors Or Friction',
    '',
    ...(status.openFriction.length > 0 ? status.openFriction.slice(0, 5).map((item) => `- ${item.pain}`) : ['- none']),
    '',
    '## Notes',
    '',
    '- This trace is a short Product Harness breadcrumb, not a replacement for tests, daily logs, or Active Plan State.',
    '',
  ].join('\n');
  writeFile(tracePath, body);
  writeFile(vaultTracePath, body);
  mirrorHarnessToVault(repoRoot, config);
  return {
    action: 'trace-recorded',
    traceId,
    outcome,
    tracePath,
    vaultTracePath,
  };
}

export function recordHarnessFriction({ repoRoot, config, value }: HarnessCommandOptions): Record<string, unknown> {
  const pain = value?.trim();
  if (!pain) {
    throw new Error('Harness friction requires a pain point or missing workflow.');
  }
  ensureProductHarness(repoRoot, config);
  const status = getProductHarnessStatus({ repoRoot, config });
  const timestamp = getIsoTimestamp();
  const latest = status.latestTrace;
  const existing = (readIfExists(repoBacklogPath(repoRoot)) || backlogTemplate()).replace(/\n-\s+none yet\s*\n?/, '\n');
  const entry = [
    '',
    `## ${timestamp} - proposed`,
    `- Pain: ${pain}`,
    `- Risk lane: ${status.currentStory?.risk || latest?.risk || 'medium'}`,
    `- Input type: ${status.currentStory?.inputType || latest?.inputType || 'change_request'}`,
    `- Current story: ${status.currentStory ? status.currentStory.title : 'none'}`,
    `- Current plan: ${currentPlanPointer(repoRoot)}`,
    `- Linked trace: ${latest?.id || 'none'}`,
    '- Expected improvement: clarify this friction before it repeats.',
    '- Actual outcome: pending',
    '',
  ].join('\n');
  writeFile(repoBacklogPath(repoRoot), `${existing.trimEnd()}\n${entry}`);
  writeFile(vaultBacklogPath(config), `${existing.trimEnd()}\n${entry}`);
  mirrorHarnessToVault(repoRoot, config);
  return {
    action: 'friction-recorded',
    status: 'proposed',
    backlogPath: repoBacklogPath(repoRoot),
    vaultBacklogPath: vaultBacklogPath(config),
  };
}

export function scoreHarnessTrace({ repoRoot, config, id }: HarnessCommandOptions): Record<string, unknown> {
  ensureProductHarness(repoRoot, config);
  const trace = findTraceById(repoRoot, config, id);
  if (!trace) {
    throw new Error(id ? `No Product Harness trace found with id: ${id}` : 'No Product Harness trace found. Run `agent-bootstrap harness trace "<summary>"` first.');
  }
  const content = readIfExists(trace.repoPath) || '';
  const score = scoreTraceRecord(trace, content);
  writeTraceScore(trace, score);
  mirrorHarnessToVault(repoRoot, config);
  return {
    action: 'trace-scored',
    traceId: trace.id,
    tracePath: trace.repoPath,
    vaultTracePath: trace.vaultPath,
    achieved: score.achieved,
    required: score.required,
    meetsRequirement: score.meetsRequirement,
    missingFields: score.missingFields,
    nextAction: score.nextAction,
  };
}

export function readHarnessBacklog({ repoRoot, config, filter = 'all' }: HarnessCommandOptions): Record<string, unknown> {
  ensureProductHarness(repoRoot, config);
  const items = readBacklogItems(repoRoot, config);
  const filtered = backlogFilter(items, filter);
  return {
    action: 'harness-backlog',
    filter,
    open: backlogFilter(items, 'open').length,
    closed: backlogFilter(items, 'closed').length,
    items: filtered,
  };
}

export function getHarnessFrictionReport({ repoRoot, config }: HarnessCommandOptions): Record<string, unknown> {
  ensureProductHarness(repoRoot, config);
  const items = readOpenFriction(repoRoot, config);
  const byRiskLane: Record<HarnessRisk, number> = { low: 0, medium: 0, high: 0 };
  const byInputType: Record<HarnessInputType, number> = {
    new_spec: 0,
    spec_slice: 0,
    change_request: 0,
    new_initiative: 0,
    maintenance: 0,
    harness_improvement: 0,
  };
  const byReason: Record<'proof' | 'context' | 'trace' | 'verification' | 'workflow', number> = {
    proof: 0,
    context: 0,
    trace: 0,
    verification: 0,
    workflow: 0,
  };
  for (const item of items) {
    incrementCount(byRiskLane, item.riskLane);
    incrementCount(byInputType, item.inputType);
    incrementCount(byReason, frictionReason(item.pain));
  }
  return {
    action: 'harness-friction-report',
    totalOpen: items.length,
    byRiskLane,
    byInputType,
    byReason,
    items: items.slice(0, 10),
  };
}

export function formatProductHarnessContext(status: ProductHarnessStatus): string {
  const lines = [
    '# Product Harness',
    '',
    'Product Harness is not a skill and does not replace Superpowers.',
    'It records feature intent, risk, scope, proof, trace quality, friction, and backlog outcomes while daily logs record what happened today.',
    '',
    `- Stories: ${status.counts.stories}`,
    `- High-risk stories: ${status.counts.highRiskStories}`,
    `- Stories missing proof: ${status.counts.storiesMissingProof}`,
    `- Traces: ${status.counts.traces}`,
    `- Open friction: ${status.counts.openFriction}`,
    `- Backlog open: ${status.observability.backlogOpen}`,
    `- Backlog closed: ${status.observability.backlogClosed}`,
    `- Failed trace quality gates: ${status.observability.failedTraceQualityGates}`,
    `- Docs health: ${status.docsHealth.ok ? 'ok' : 'missing docs'}`,
    `- Maturity: ${status.docsHealth.maturityStage}`,
    '',
    '## Current Story',
  ];
  if (status.currentStory) {
    lines.push(
      `- Title: ${status.currentStory.title}`,
      `- Risk: ${status.currentStory.risk}`,
      `- Input type: ${status.currentStory.inputType}`,
      `- Risk flags: ${status.currentStory.riskFlags.length > 0 ? status.currentStory.riskFlags.join(', ') : 'none'}`,
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

  lines.push('', '## Latest Trace');
  if (status.latestTrace) {
    lines.push(
      `- Trace id: ${status.latestTrace.id}`,
      `- Summary: ${status.latestTrace.summary}`,
      `- Outcome: ${status.latestTrace.outcome}`,
      `- Trace quality: ${status.latestTrace.scoreStatus} (${status.latestTrace.achievedTraceTier}/${status.latestTrace.requiredTraceTier})`,
      `- Meets requirement: ${status.latestTrace.scoreStatus === 'unscored' ? 'not scored' : status.latestTrace.meetsRequirement ? 'yes' : 'no'}`,
      `- Missing fields: ${status.latestTrace.missingFields.length > 0 ? status.latestTrace.missingFields.join(', ') : 'none'}`,
      `- Source: ${status.latestTrace.relativeRepoPath}`,
    );
  } else {
    lines.push('- none');
  }

  lines.push('', '## Open Friction');
  if (status.openFriction.length === 0) {
    lines.push('- none');
  } else {
    lines.push(...status.openFriction.slice(0, 3).map((item) => `- ${item.pain}`));
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

export function getRecentHarnessTraceFiles(repoRoot: string, limit = 4): string[] {
  return traceFiles(repoTracesRoot(repoRoot)).slice(0, limit);
}

export function runHarnessCommand(subcommand: string, options: HarnessCommandOptions): unknown {
  switch (subcommand) {
    case 'status':
      ensureProductHarness(options.repoRoot, options.config);
      return getProductHarnessStatus({ repoRoot: options.repoRoot, config: options.config });
    case 'check':
      ensureHarnessDirectories(options.repoRoot, options.config);
      return {
        action: 'harness-check',
        ...checkProductHarnessDocs({ repoRoot: options.repoRoot, config: options.config }),
      };
    case 'intake':
      return startHarnessIntake(options);
    case 'proof':
      return recordHarnessProof(options);
    case 'decision':
      return recordHarnessDecision(options);
    case 'trace':
      return recordHarnessTrace(options);
    case 'score-trace':
      return scoreHarnessTrace(options);
    case 'friction':
      return recordHarnessFriction(options);
    case 'backlog':
      return readHarnessBacklog(options);
    case 'friction-report':
      return getHarnessFrictionReport(options);
    default:
      throw new Error('Unknown harness command. Use: status, check, intake, proof, decision, trace, score-trace, friction, backlog, friction-report.');
  }
}
