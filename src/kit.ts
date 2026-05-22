import fs from 'node:fs';
import path from 'node:path';

let cachedVersion: string | null = null;
let cachedPackageRoot: string | null = null;

const PACKAGE_ROOT_MARKERS = [
  'package.json',
  '.codex',
  'docs',
  'plans',
] as const;

export const MANAGED_REPO_PATHS = [
  'AGENTS.md',
  '.agent-bootstrap-manifest.json',
  '.codex/INDEX.md',
  '.codex/README.md',
  '.codex/config.toml',
  '.codex/agents/INDEX.md',
  '.codex/agents/code-reviewer.toml',
  '.codex/agents/security-auditor.toml',
  '.codex/agents/test-engineer.toml',
  '.codex/commands/plan/brainstorm.md',
  '.codex/skills/INDEX.md',
  '.codex/skills/superpowers/README.md',
  '.codex/skills/frontend-design/SKILL.md',
  '.codex/skills/frontend-design/LICENSE.txt',
  '.codex/skills/vibe-security-scan/SKILL.md',
  '.codex/skills/vibe-security-scan/LICENSE.txt',
  '.codex/skills/vibe-security-scan/references/language-detection.md',
  '.codex/skills/vibe-security-scan/references/data-flow-classification.md',
  '.codex/skills/vibe-security-scan/rules/generic/01-hardcoded-secret.md',
  '.codex/skills/vibe-security-scan/rules/generic/21-command-injection.md',
  '.codex/skills/vibe-security-scan/rules/languages/rust/README.md',
  'docs/vault-memory.md',
  'docs/project-map.md',
  'docs/superpowers/plans/CURRENT.md',
  'docs/superpowers/plans/INDEX.md',
  'docs/product/PRODUCT.md',
  'docs/product/HARNESS.md',
  'docs/stories/INDEX.md',
  'docs/validation/TEST_MATRIX.md',
  'docs/decisions/INDEX.md',
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
