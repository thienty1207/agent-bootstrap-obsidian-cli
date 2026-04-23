import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, writeFile } from './fs-utils';

export type ScaffoldEntryStatus = 'managed' | 'preserved';

interface ScaffoldManifestEntry {
  syncedHash: string;
  status: ScaffoldEntryStatus;
}

interface ScaffoldManifest {
  version: 1;
  entries: Record<string, ScaffoldManifestEntry>;
}

export interface SyncSeededScaffoldOptions {
  sourceRoot: string;
  targetRoot: string;
  manifestPath: string;
  seedPaths: string[];
}

function toPortablePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function hashFile(filePath: string): string {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readManifest(manifestPath: string): ScaffoldManifest {
  if (!fs.existsSync(manifestPath)) {
    return { version: 1, entries: {} };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ScaffoldManifest;
    return {
      version: 1,
      entries: parsed.entries || {},
    };
  } catch {
    return { version: 1, entries: {} };
  }
}

function listFiles(root: string, current: string = root): string[] {
  if (!fs.existsSync(current)) {
    return [];
  }

  const currentStat = fs.statSync(current);
  if (currentStat.isFile()) {
    return [toPortablePath(path.relative(root, current))];
  }

  return fs.readdirSync(current, { withFileTypes: true })
    .flatMap((entry) => listFiles(root, path.join(current, entry.name)))
    .sort();
}

export function syncSeededScaffold({
  sourceRoot,
  targetRoot,
  manifestPath,
  seedPaths,
}: SyncSeededScaffoldOptions): void {
  const manifest = readManifest(manifestPath);
  const nextManifest: ScaffoldManifest = {
    version: 1,
    entries: { ...manifest.entries },
  };

  for (const seedPath of seedPaths) {
    const sourceBase = path.join(sourceRoot, seedPath);
    for (const relativeFile of listFiles(sourceBase)) {
      const portablePath = toPortablePath(path.join(seedPath, relativeFile));
      const sourceFile = path.join(sourceBase, relativeFile);
      const targetFile = path.join(targetRoot, portablePath);
      const sourceHash = hashFile(sourceFile);

      if (!fs.existsSync(targetFile)) {
        writeFile(targetFile, fs.readFileSync(sourceFile));
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
          writeFile(targetFile, fs.readFileSync(sourceFile));
        }
        nextManifest.entries[portablePath] = { syncedHash: sourceHash, status: 'managed' };
        continue;
      }

      nextManifest.entries[portablePath] = { syncedHash: targetHash, status: 'preserved' };
    }
  }

  ensureDir(path.dirname(manifestPath));
  fs.writeFileSync(manifestPath, JSON.stringify(nextManifest, null, 2));
}
