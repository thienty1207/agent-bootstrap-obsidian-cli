"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDir = ensureDir;
exports.writeFile = writeFile;
exports.writeFileIfMissing = writeFileIfMissing;
exports.readIfExists = readIfExists;
exports.slugify = slugify;
exports.escapeRegExp = escapeRegExp;
exports.upsertManagedBlock = upsertManagedBlock;
exports.findRepoRoot = findRepoRoot;
exports.copyMissingRecursive = copyMissingRecursive;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
function ensureDir(dirPath) {
    node_fs_1.default.mkdirSync(dirPath, { recursive: true });
}
function writeFile(filePath, content) {
    ensureDir(node_path_1.default.dirname(filePath));
    node_fs_1.default.writeFileSync(filePath, content);
}
function writeFileIfMissing(filePath, content) {
    if (node_fs_1.default.existsSync(filePath)) {
        return;
    }
    writeFile(filePath, content);
}
function readIfExists(filePath) {
    if (!node_fs_1.default.existsSync(filePath)) {
        return null;
    }
    return node_fs_1.default.readFileSync(filePath, 'utf8');
}
function slugify(value) {
    const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    if (!slug) {
        throw new Error(`Could not derive a valid slug from "${value}".`);
    }
    return slug;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function upsertManagedBlock(existingContent, newBlock) {
    const start = '<!-- agent-bootstrap:start -->';
    const end = '<!-- agent-bootstrap:end -->';
    const wrappedBlock = `${start}\n${newBlock.trimEnd()}\n${end}`;
    if (!existingContent) {
        return `${wrappedBlock}\n`;
    }
    const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
    if (pattern.test(existingContent)) {
        return existingContent.replace(pattern, wrappedBlock);
    }
    const trimmed = existingContent.trimEnd();
    return `${trimmed}\n\n${wrappedBlock}\n`;
}
function findRepoRoot(startPath) {
    let current = node_path_1.default.resolve(startPath);
    while (true) {
        if (node_fs_1.default.existsSync(node_path_1.default.join(current, 'vault.config.json'))) {
            return current;
        }
        const parent = node_path_1.default.dirname(current);
        if (parent === current) {
            break;
        }
        current = parent;
    }
    throw new Error(`Could not find a bootstrapped repo from ${startPath}. Run agent-bootstrap in the project root first.`);
}
function copyMissingRecursive(sourcePath, targetPath) {
    if (!node_fs_1.default.existsSync(sourcePath)) {
        return;
    }
    const sourceStat = node_fs_1.default.statSync(sourcePath);
    if (sourceStat.isDirectory()) {
        ensureDir(targetPath);
        for (const entry of node_fs_1.default.readdirSync(sourcePath, { withFileTypes: true })) {
            copyMissingRecursive(node_path_1.default.join(sourcePath, entry.name), node_path_1.default.join(targetPath, entry.name));
        }
        return;
    }
    if (!node_fs_1.default.existsSync(targetPath)) {
        writeFile(targetPath, node_fs_1.default.readFileSync(sourcePath));
    }
}
