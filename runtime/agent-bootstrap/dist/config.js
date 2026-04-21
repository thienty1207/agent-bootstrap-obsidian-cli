"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigDir = getConfigDir;
exports.getConfigPath = getConfigPath;
exports.getRegistryPath = getRegistryPath;
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.loadRegistry = loadRegistry;
exports.saveRegistry = saveRegistry;
exports.resolveVaultRoot = resolveVaultRoot;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const fs_utils_1 = require("./fs-utils");
function getConfigDir() {
    return process.env.AGENT_BOOTSTRAP_CONFIG_HOME || node_path_1.default.join(node_os_1.default.homedir(), '.agent-bootstrap');
}
function getConfigPath() {
    return node_path_1.default.join(getConfigDir(), 'config.json');
}
function getRegistryPath() {
    return node_path_1.default.join(getConfigDir(), 'projects.json');
}
function loadConfig() {
    const configPath = getConfigPath();
    if (!node_fs_1.default.existsSync(configPath)) {
        return {};
    }
    return JSON.parse(node_fs_1.default.readFileSync(configPath, 'utf8'));
}
function saveConfig(nextConfig) {
    (0, fs_utils_1.ensureDir)(getConfigDir());
    node_fs_1.default.writeFileSync(getConfigPath(), JSON.stringify(nextConfig, null, 2));
}
function loadRegistry() {
    const registryPath = getRegistryPath();
    if (!node_fs_1.default.existsSync(registryPath)) {
        return [];
    }
    return JSON.parse(node_fs_1.default.readFileSync(registryPath, 'utf8'));
}
function saveRegistry(entries) {
    (0, fs_utils_1.ensureDir)(getConfigDir());
    node_fs_1.default.writeFileSync(getRegistryPath(), JSON.stringify(entries, null, 2));
}
function resolveVaultRoot(explicitVaultRoot) {
    if (explicitVaultRoot) {
        return node_path_1.default.resolve(explicitVaultRoot);
    }
    if (process.env.AGENT_BOOTSTRAP_VAULT_ROOT) {
        return node_path_1.default.resolve(process.env.AGENT_BOOTSTRAP_VAULT_ROOT);
    }
    const config = loadConfig();
    if (config.vaultRoot) {
        return node_path_1.default.resolve(config.vaultRoot);
    }
    throw new Error('No vault root configured. Run "agent-bootstrap config set-vault [path]" first.');
}
