import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { loadRegistry } from './config';
import { resolveRepoRoot, readRepoConfig } from './context';
import { getKitVersion, MANAGED_REPO_PATHS } from './kit';

export interface DoctorReport {
  ok: boolean;
  repo: {
    repoRoot: string;
    projectSlug: string;
    projectType: string;
    vaultRoot: string;
    vaultProjectRoot: string;
    kitVersion: string;
  };
  checks: Record<string, boolean>;
  missing: {
    repoPaths: string[];
    vaultPaths: string[];
  };
  suggestedCommands: string[];
}

function hasGit(): boolean {
  const result = cp.spawnSync('git', ['--version'], { encoding: 'utf8' });
  return !result.error && result.status === 0;
}

export function runDoctor({ repoRoot }: { repoRoot?: string } = {}): DoctorReport {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const config = readRepoConfig(resolvedRepoRoot);
  const registry = loadRegistry();
  const currentKitVersion = getKitVersion();
  const registered = registry.some((item) => item.repoRoot === resolvedRepoRoot);
  const missingRepoPaths = MANAGED_REPO_PATHS.filter((relativePath) => (
    !fs.existsSync(path.join(resolvedRepoRoot, relativePath))
  ));
  const missingVaultPaths = [
    ['README.md', path.join(config.project_root, 'README.md')],
    [config.tasks_file, path.join(config.project_root, config.tasks_file)],
    [config.decisions_file, path.join(config.project_root, config.decisions_file)],
    [config.facts_file || 'Facts.md', path.join(config.project_root, config.facts_file || 'Facts.md')],
    [config.open_questions_file || 'Open Questions.md', path.join(config.project_root, config.open_questions_file || 'Open Questions.md')],
    [config.handoff_file || 'Handoff.md', path.join(config.project_root, config.handoff_file || 'Handoff.md')],
    [config.research_dir, path.join(config.project_root, config.research_dir)],
    [config.notes_dir, path.join(config.project_root, config.notes_dir)],
    ['Plans/CURRENT.md', path.join(config.project_root, 'Plans', 'CURRENT.md')],
    ['Plans/INDEX.md', path.join(config.project_root, 'Plans', 'INDEX.md')],
    ['ProductHarness/HARNESS.md', path.join(config.project_root, 'ProductHarness', 'HARNESS.md')],
    ['ProductHarness/HARNESS_BACKLOG.md', path.join(config.project_root, 'ProductHarness', 'HARNESS_BACKLOG.md')],
    ['ProductHarness/TRACE_SPEC.md', path.join(config.project_root, 'ProductHarness', 'TRACE_SPEC.md')],
    ['ProductHarness/SYSTEM_MAP.md', path.join(config.project_root, 'ProductHarness', 'SYSTEM_MAP.md')],
    ['ProductHarness/CONTEXT_RULES.md', path.join(config.project_root, 'ProductHarness', 'CONTEXT_RULES.md')],
    ['ProductHarness/GLOSSARY.md', path.join(config.project_root, 'ProductHarness', 'GLOSSARY.md')],
    ['ProductHarness/MATURITY.md', path.join(config.project_root, 'ProductHarness', 'MATURITY.md')],
    ['ProductHarness/COMPONENTS.md', path.join(config.project_root, 'ProductHarness', 'COMPONENTS.md')],
    ['ProductHarness/Traces', path.join(config.project_root, 'ProductHarness', 'Traces')],
    ['ProductHarness/Stories/INDEX.md', path.join(config.project_root, 'ProductHarness', 'Stories', 'INDEX.md')],
  ]
    .filter(([, absolutePath]) => !fs.existsSync(absolutePath))
    .map(([relativePath]) => relativePath);

  const checks = {
    vaultConfig: fs.existsSync(path.join(resolvedRepoRoot, 'vault.config.json')),
    agentFile: fs.existsSync(path.join(resolvedRepoRoot, 'AGENTS.md')),
    agentWorkspace: fs.existsSync(path.join(resolvedRepoRoot, '.codex', 'config.toml'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.codex', 'agents', 'INDEX.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.codex', 'agents', 'code-reviewer.toml'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.codex', 'agents', 'security-auditor.toml'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.codex', 'agents', 'test-engineer.toml'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.codex', 'commands', 'plan', 'brainstorm.md')),
    docs: fs.existsSync(path.join(resolvedRepoRoot, 'docs')),
    plans: fs.existsSync(path.join(resolvedRepoRoot, 'plans')),
    planState: fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'superpowers', 'plans', 'CURRENT.md'))
      && fs.existsSync(path.join(config.project_root, 'Plans', 'CURRENT.md')),
    productHarness: fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'HARNESS.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'HARNESS_BACKLOG.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'TRACE_SPEC.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'SYSTEM_MAP.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'CONTEXT_RULES.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'GLOSSARY.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'MATURITY.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'COMPONENTS.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'product', 'traces'))
      && fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'stories', 'INDEX.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'HARNESS.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'HARNESS_BACKLOG.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'TRACE_SPEC.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'SYSTEM_MAP.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'CONTEXT_RULES.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'GLOSSARY.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'MATURITY.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'COMPONENTS.md'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'Traces'))
      && fs.existsSync(path.join(config.project_root, 'ProductHarness', 'Stories', 'INDEX.md')),
    gitAvailable: hasGit(),
    registered,
    vaultProject: fs.existsSync(config.project_root),
    runtimeScript: fs.existsSync(path.join(resolvedRepoRoot, 'scripts', 'agent-memory.js')),
    hookFile: fs.existsSync(path.join(resolvedRepoRoot, '.githooks', 'post-commit')),
    projectMap: fs.existsSync(path.join(resolvedRepoRoot, 'docs', 'project-map.md')),
    projectReadme: fs.existsSync(path.join(config.project_root, 'README.md')),
    projectTasks: fs.existsSync(path.join(config.project_root, config.tasks_file)),
    projectDecisions: fs.existsSync(path.join(config.project_root, config.decisions_file)),
  };

  const suggestedCommands: string[] = [];

  if (missingRepoPaths.length > 0 || config.kit_version !== currentKitVersion) {
    suggestedCommands.push('agent-bootstrap update');
  }

  if (missingVaultPaths.length > 0 || !registered) {
    if (!suggestedCommands.includes('agent-bootstrap init')) {
      suggestedCommands.push('agent-bootstrap init');
    }
  }

  return {
    ok: Object.values(checks).every(Boolean),
    repo: {
      repoRoot: resolvedRepoRoot,
      projectSlug: config.project_slug,
      projectType: config.project_type,
      vaultRoot: config.vault_root,
      vaultProjectRoot: config.project_root,
      kitVersion: config.kit_version || currentKitVersion,
    },
    checks,
    missing: {
      repoPaths: [...missingRepoPaths],
      vaultPaths: [...missingVaultPaths],
    },
    suggestedCommands,
  };
}
