"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncSeededScaffold = syncSeededScaffold;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const fs_utils_1 = require("./fs-utils");
function toPortablePath(filePath) {
    return filePath.split(node_path_1.default.sep).join('/');
}
function hashFile(filePath) {
    return node_crypto_1.default.createHash('sha256').update(node_fs_1.default.readFileSync(filePath)).digest('hex');
}
function readManifest(manifestPath) {
    if (!node_fs_1.default.existsSync(manifestPath)) {
        return { version: 1, entries: {} };
    }
    try {
        const parsed = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf8'));
        return {
            version: 1,
            entries: parsed.entries || {},
        };
    }
    catch {
        return { version: 1, entries: {} };
    }
}
function listFiles(root, current = root) {
    if (!node_fs_1.default.existsSync(current)) {
        return [];
    }
    const currentStat = node_fs_1.default.statSync(current);
    if (currentStat.isFile()) {
        return [toPortablePath(node_path_1.default.relative(root, current))];
    }
    return node_fs_1.default.readdirSync(current, { withFileTypes: true })
        .flatMap((entry) => listFiles(root, node_path_1.default.join(current, entry.name)))
        .sort();
}
function syncSeededScaffold({ sourceRoot, targetRoot, manifestPath, seedPaths, }) {
    const manifest = readManifest(manifestPath);
    const nextManifest = {
        version: 1,
        entries: { ...manifest.entries },
    };
    for (const seedPath of seedPaths) {
        const sourceBase = node_path_1.default.join(sourceRoot, seedPath);
        for (const relativeFile of listFiles(sourceBase)) {
            const portablePath = toPortablePath(node_path_1.default.join(seedPath, relativeFile));
            const sourceFile = node_path_1.default.join(sourceBase, relativeFile);
            const targetFile = node_path_1.default.join(targetRoot, portablePath);
            const sourceHash = hashFile(sourceFile);
            if (!node_fs_1.default.existsSync(targetFile)) {
                (0, fs_utils_1.writeFile)(targetFile, node_fs_1.default.readFileSync(sourceFile));
                nextManifest.entries[portablePath] = { syncedHash: sourceHash, status: 'managed' };
                continue;
            }
            const targetHash = hashFile(targetFile);
            const previous = manifest.entries[portablePath];
            if (!previous) {
                nextManifest.entries[portablePath] = targetHash === sourceHash
                    ? { syncedHash: sourceHash, status: 'managed' }
                    : { syncedHash: targetHash, status: 'preserved' };
                continue;
            }
            if (previous.status === 'managed' && targetHash === previous.syncedHash) {
                if (targetHash !== sourceHash) {
                    (0, fs_utils_1.writeFile)(targetFile, node_fs_1.default.readFileSync(sourceFile));
                }
                nextManifest.entries[portablePath] = { syncedHash: sourceHash, status: 'managed' };
                continue;
            }
            nextManifest.entries[portablePath] = { syncedHash: targetHash, status: 'preserved' };
        }
    }
    (0, fs_utils_1.ensureDir)(node_path_1.default.dirname(manifestPath));
    node_fs_1.default.writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 2));
}
