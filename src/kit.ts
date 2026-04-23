import fs from 'node:fs';
import path from 'node:path';

let cachedVersion: string | null = null;
let cachedPackageRoot: string | null = null;

const PACKAGE_ROOT_MARKERS = [
  'package.json',
  '.agent',
  'docs',
  'plans',
] as const;

export const MANAGED_REPO_PATHS = [
  'AGENT.md',
  '.agent-bootstrap-manifest.json',
  '.agent/README.md',
  '.agent/agents/planner.md',
  '.agent/commands/plan/brainstorm.md',
  'docs/vault-memory.md',
  'docs/project-map.md',
  'plans/templates/feature-implementation-plan.md',
  'scripts/agent-memory.js',
  '.githooks/post-commit',
] as const;

export function getPackageRoot(): string {
  if (cachedPackageRoot) {
    return cachedPackageRoot;
  }

  let current = path.resolve(__dirname);

  while (true) {
    if (PACKAGE_ROOT_MARKERS.every((entry) => fs.existsSync(path.join(current, entry)))) {
      cachedPackageRoot = current;
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error(`Could not locate the packaged agent-bootstrap assets from ${__dirname}.`);
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
