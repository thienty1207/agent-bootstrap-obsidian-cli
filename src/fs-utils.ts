import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function writeFile(filePath: string, content: string | Buffer): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

export function writeFileIfMissing(filePath: string, content: string | Buffer): void {
  if (fs.existsSync(filePath)) {
    return;
  }

  writeFile(filePath, content);
}

export function readIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new Error(`Could not derive a valid slug from "${value}".`);
  }

  return slug;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function upsertManagedBlock(existingContent: string, newBlock: string): string {
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

export function findRepoRoot(startPath: string): string {
  let current = path.resolve(startPath);

  while (true) {
    if (fs.existsSync(path.join(current, 'vault.config.json'))) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error(`Could not find a bootstrapped repo from ${startPath}. Run agent-bootstrap in the project root first.`);
}

export function copyMissingRecursive(sourcePath: string, targetPath: string): void {
  if (!fs.existsSync(sourcePath)) {
    return;
  }

  const sourceStat = fs.statSync(sourcePath);
  if (sourceStat.isDirectory()) {
    ensureDir(targetPath);
    for (const entry of fs.readdirSync(sourcePath, { withFileTypes: true })) {
      copyMissingRecursive(
        path.join(sourcePath, entry.name),
        path.join(targetPath, entry.name),
      );
    }
    return;
  }

  if (!fs.existsSync(targetPath)) {
    writeFile(targetPath, fs.readFileSync(sourcePath));
  }
}
