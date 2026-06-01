"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MANAGED_REPO_PATHS = void 0;
exports.getPackageRoot = getPackageRoot;
exports.getKitVersion = getKitVersion;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
let cachedVersion = null;
let cachedPackageRoot = null;
const PACKAGE_ROOT_MARKERS = [
    'package.json',
    '.codex',
    'docs',
    'plans',
];
exports.MANAGED_REPO_PATHS = [
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
    'docs/product/HARNESS_BACKLOG.md',
    'docs/product/TRACE_SPEC.md',
    'docs/product/SYSTEM_MAP.md',
    'docs/product/CONTEXT_RULES.md',
    'docs/product/GLOSSARY.md',
    'docs/product/MATURITY.md',
    'docs/product/COMPONENTS.md',
    'docs/product/traces/README.md',
    'docs/stories/INDEX.md',
    'docs/validation/TEST_MATRIX.md',
    'docs/decisions/INDEX.md',
    'plans/templates/feature-implementation-plan.md',
    'scripts/agent-memory.js',
    '.githooks/post-commit',
];
function getPackageRoot() {
    if (cachedPackageRoot) {
        return cachedPackageRoot;
    }
    let current = node_path_1.default.resolve(__dirname);
    while (true) {
        if (PACKAGE_ROOT_MARKERS.every((entry) => node_fs_1.default.existsSync(node_path_1.default.join(current, entry)))) {
            cachedPackageRoot = current;
            return current;
        }
        const parent = node_path_1.default.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    throw new Error(`Could not locate the packaged agent-bootstrap assets from ${__dirname}.`);
}
function getKitVersion() {
    if (cachedVersion) {
        return cachedVersion;
    }
    const packageJsonPath = node_path_1.default.join(getPackageRoot(), 'package.json');
    const raw = node_fs_1.default.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(raw);
    cachedVersion = packageJson.version || '0.0.0';
    return cachedVersion;
}
