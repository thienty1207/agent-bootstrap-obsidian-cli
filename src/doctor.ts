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
    [config.research_dir, path.join(config.project_root, config.research_dir)],
    [config.notes_dir, path.join(config.project_root, config.notes_dir)],
  ]
    .filter(([, absolutePath]) => !fs.existsSync(absolutePath))
    .map(([relativePath]) => relativePath);

  const checks = {
    vaultConfig: fs.existsSync(path.join(resolvedRepoRoot, 'vault.config.json')),
    agentFile: fs.existsSync(path.join(resolvedRepoRoot, 'AGENT.md')),
    githubTemplate: fs.existsSync(path.join(resolvedRepoRoot, '.github', 'agents', 'planner.md'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.github', 'commands', 'plan', 'brainstorm.md')),
    docs: fs.existsSync(path.join(resolvedRepoRoot, 'docs')),
    plans: fs.existsSync(path.join(resolvedRepoRoot, 'plans')),
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
    suggestedCommands.push('agent-bootstrap sync');
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
