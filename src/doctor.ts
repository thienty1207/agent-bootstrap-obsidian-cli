import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { loadRegistry } from './config';
import { resolveRepoRoot, readRepoConfig } from './context';

export interface DoctorReport {
  ok: boolean;
  repo: {
    repoRoot: string;
    projectSlug: string;
    projectType: string;
    vaultRoot: string;
    vaultProjectRoot: string;
  };
  checks: Record<string, boolean>;
}

function hasGit(): boolean {
  const result = cp.spawnSync('git', ['--version'], { encoding: 'utf8' });
  return !result.error && result.status === 0;
}

export function runDoctor({ repoRoot }: { repoRoot?: string } = {}): DoctorReport {
  const resolvedRepoRoot = resolveRepoRoot(repoRoot);
  const config = readRepoConfig(resolvedRepoRoot);
  const registry = loadRegistry();

  const checks = {
    vaultConfig: fs.existsSync(path.join(resolvedRepoRoot, 'vault.config.json')),
    agentFile: fs.existsSync(path.join(resolvedRepoRoot, 'AGENT.md')),
    githubTemplate: fs.existsSync(path.join(resolvedRepoRoot, '.github', 'agents'))
      && fs.existsSync(path.join(resolvedRepoRoot, '.github', 'commands')),
    docs: fs.existsSync(path.join(resolvedRepoRoot, 'docs')),
    plans: fs.existsSync(path.join(resolvedRepoRoot, 'plans')),
    gitAvailable: hasGit(),
    registered: registry.some((item) => item.repoRoot === resolvedRepoRoot),
    vaultProject: fs.existsSync(config.project_root),
  };

  return {
    ok: Object.values(checks).every(Boolean),
    repo: {
      repoRoot: resolvedRepoRoot,
      projectSlug: config.project_slug,
      projectType: config.project_type,
      vaultRoot: config.vault_root,
      vaultProjectRoot: config.project_root,
    },
    checks,
  };
}
