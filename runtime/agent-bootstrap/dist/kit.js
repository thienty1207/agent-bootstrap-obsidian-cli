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
    '.agent',
    'docs',
    'plans',
];
exports.MANAGED_REPO_PATHS = [
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
