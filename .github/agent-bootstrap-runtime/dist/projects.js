"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProject = registerProject;
exports.listProjects = listProjects;
exports.showProject = showProject;
const node_path_1 = __importDefault(require("node:path"));
const date_1 = require("./date");
const config_1 = require("./config");
const fs_utils_1 = require("./fs-utils");
const context_1 = require("./context");
function registerProject(entry) {
    const registry = (0, config_1.loadRegistry)();
    const nextEntry = {
        ...entry,
        updatedAt: (0, date_1.getIsoTimestamp)(),
    };
    const next = registry.filter((item) => item.repoRoot !== entry.repoRoot && item.slug !== entry.slug);
    next.push(nextEntry);
    next.sort((left, right) => left.slug.localeCompare(right.slug));
    (0, config_1.saveRegistry)(next);
    return nextEntry;
}
function listProjects() {
    return (0, config_1.loadRegistry)();
}
function showProject(slug, repoRoot) {
    const registry = (0, config_1.loadRegistry)();
    if (slug) {
        const entry = registry.find((item) => item.slug === slug);
        if (!entry) {
            throw new Error(`Project "${slug}" is not registered.`);
        }
        return entry;
    }
    const resolvedRepoRoot = repoRoot ? node_path_1.default.resolve(repoRoot) : (0, fs_utils_1.findRepoRoot)(process.cwd());
    const entry = registry.find((item) => item.repoRoot === resolvedRepoRoot);
    if (entry) {
        return entry;
    }
    const config = (0, context_1.readRepoConfig)(resolvedRepoRoot);
    return {
        slug: config.project_slug,
        projectType: config.project_type,
        repoRoot: resolvedRepoRoot,
        vaultRoot: config.vault_root,
        vaultProjectRoot: config.project_root,
        updatedAt: (0, date_1.getIsoTimestamp)(),
    };
}
