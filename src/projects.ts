import path from 'node:path';
import { getIsoTimestamp } from './date';
import { loadRegistry, saveRegistry, type RegistryEntry } from './config';
import { findRepoRoot } from './fs-utils';
import { readRepoConfig } from './context';

export function registerProject(entry: Omit<RegistryEntry, 'updatedAt'>): RegistryEntry {
  const registry = loadRegistry();
  const nextEntry: RegistryEntry = {
    ...entry,
    updatedAt: getIsoTimestamp(),
  };

  const next = registry.filter((item) => item.repoRoot !== entry.repoRoot && item.slug !== entry.slug);
  next.push(nextEntry);
  next.sort((left, right) => left.slug.localeCompare(right.slug));
  saveRegistry(next);
  return nextEntry;
}

export function listProjects(): RegistryEntry[] {
  return loadRegistry();
}

export function showProject(slug?: string, repoRoot?: string): RegistryEntry {
  const registry = loadRegistry();

  if (slug) {
    const entry = registry.find((item) => item.slug === slug);
    if (!entry) {
      throw new Error(`Project "${slug}" is not registered.`);
    }
    return entry;
  }

  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
  const entry = registry.find((item) => item.repoRoot === resolvedRepoRoot);
  if (entry) {
    return entry;
  }

  const config = readRepoConfig(resolvedRepoRoot);
  return {
    slug: config.project_slug,
    projectType: config.project_type,
    repoRoot: resolvedRepoRoot,
    vaultRoot: config.vault_root,
    vaultProjectRoot: config.project_root,
    updatedAt: getIsoTimestamp(),
  };
}
