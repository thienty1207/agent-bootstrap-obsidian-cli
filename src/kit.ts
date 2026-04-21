import fs from 'node:fs';
import path from 'node:path';

let cachedVersion: string | null = null;

export const MANAGED_REPO_PATHS = [
  'AGENT.md',
  '.github/agents/planner.md',
  '.github/commands/plan/brainstorm.md',
  'docs/vault-memory.md',
  'docs/project-map.md',
  'plans/templates/feature-implementation-plan.md',
  'scripts/agent-memory.js',
  '.githooks/post-commit',
] as const;

export function getPackageRoot(): string {
  return path.join(__dirname, '..');
}

export function getKitVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  const packageJsonPath = path.join(getPackageRoot(), 'package.json');
  const raw = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(raw) as { version?: string };
  cachedVersion = packageJson.version || '0.0.0';
  return cachedVersion;
}
