const fs = require('node:fs');
const path = require('node:path');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function readIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
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
  const start = '<!-- vault-memory-bridge:start -->';
  const end = '<!-- vault-memory-bridge:end -->';
  const wrappedBlock = `${start}\n${newBlock.trimEnd()}\n${end}`;

  if (!existingContent) {
    return wrappedBlock;
  }

  const pattern = new RegExp(`${escapeRegExp(start)}[\\s\\S]*?${escapeRegExp(end)}`);
  if (pattern.test(existingContent)) {
    return existingContent.replace(pattern, wrappedBlock);
  }

  const trimmed = existingContent.trimEnd();
  return `${trimmed}\n\n${wrappedBlock}\n`;
}

function findRepoRoot(startPath) {
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

module.exports = {
  ensureDir,
  writeFile,
  readIfExists,
  slugify,
  upsertManagedBlock,
  findRepoRoot,
  escapeRegExp
};
