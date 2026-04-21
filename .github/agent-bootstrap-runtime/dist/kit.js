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
exports.MANAGED_REPO_PATHS = [
    'AGENT.md',
    '.github/agents/planner.md',
    '.github/commands/plan/brainstorm.md',
    'docs/vault-memory.md',
    'docs/project-map.md',
    'plans/templates/feature-implementation-plan.md',
    'scripts/agent-memory.js',
    '.githooks/post-commit',
];
function getPackageRoot() {
    return node_path_1.default.join(__dirname, '..');
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
