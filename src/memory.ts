import fs from 'node:fs';
import path from 'node:path';
import { getTodayString } from './date';
import { ensureDir, findRepoRoot, writeFile } from './fs-utils';
import { readRepoConfig, type RepoConfig } from './context';
import {
  appendDailyLog,
  buildMemoryLogMarker,
  createMemoryIndexRecord,
  resolveRoutingDecision,
  updateProjectMemoryIndex,
} from './vault';

function appendTask(config: RepoConfig, content: string): string {
  const tasksPath = path.join(config.project_root, config.tasks_file);
  const existing = fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, 'utf8') : '# Tasks\n';
  fs.writeFileSync(tasksPath, `${existing.trimEnd()}\n\n- [ ] ${content}\n`);

  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'tasks',
    item: createMemoryIndexRecord({
      kind: 'task',
      title: content,
      preview: content,
      scope: 'project',
      path: tasksPath,
      reason: 'tasks are always project-scoped',
    }),
  });

  appendDailyLog(
    config.vault_root,
    `Task updated for \`${config.project_slug}\`: ${content}`,
    buildMemoryLogMarker({ kind: 'task', projectSlug: config.project_slug, title: content, scope: 'project' }),
  );

  return tasksPath;
}

function appendDecision(config: RepoConfig, title: string, content: string): string {
  const decisionsPath = path.join(config.project_root, config.decisions_file);
  const existing = fs.existsSync(decisionsPath) ? fs.readFileSync(decisionsPath, 'utf8') : '# Decisions\n';
  const today = getTodayString();
  const entry = `\n## ${today} - ${title}\n- Context: agent-bootstrap CLI memory command\n- Decision: ${content}\n`;
  fs.writeFileSync(decisionsPath, `${existing.trimEnd()}\n${entry}`);

  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'decisions',
    item: createMemoryIndexRecord({
      kind: 'decision',
      title,
      preview: content,
      scope: 'project',
      path: decisionsPath,
      reason: 'decisions are always project-scoped',
    }),
  });

  appendDailyLog(
    config.vault_root,
    `Decision recorded for \`${config.project_slug}\`: ${title}`,
    buildMemoryLogMarker({ kind: 'decision', projectSlug: config.project_slug, title, scope: 'project' }),
  );

  return decisionsPath;
}

function createScopedNote({
  config,
  repoRoot,
  noteType,
  title,
  content,
  scope,
}: {
  config: RepoConfig;
  repoRoot: string;
  noteType: 'research' | 'note';
  title: string;
  content: string;
  scope?: string;
}): string {
  const routing = resolveRoutingDecision({
    scope,
    mode: noteType,
    title,
    content,
    projectSlug: config.project_slug,
    repoName: path.basename(repoRoot),
  });
  const baseRoot = routing.scope === 'global' ? config.vault_root : config.project_root;
  const directory = noteType === 'research'
    ? (routing.scope === 'global' ? 'Research' : config.research_dir)
    : (routing.scope === 'global' ? 'Notes' : config.notes_dir);
  const targetDir = path.join(baseRoot, directory);
  ensureDir(targetDir);
  const today = getTodayString();
  const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim();
  const notePath = path.join(targetDir, `${today} ${safeTitle}.md`);
  const projectValue = routing.scope === 'global' ? '' : config.project_slug;
  const tags = noteType === 'research' ? '  - research' : '  - note';

  writeFile(
    notePath,
    `---\ntype: ${noteType}\nscope: ${routing.scope}\nscope_reason: ${routing.reason}\nproject: ${projectValue}\nproject_type: ${config.project_type}\ncreated: ${today}\nupdated: ${today}\nstatus: draft\ntags:\n${tags}\n---\n\n# ${title}\n\n## Links\n- Vault: [[Init]]\n- ${routing.scope === 'global' ? 'Global hub' : 'Project'}: ${routing.scope === 'global' ? '[[Research/README|Research]]' : '[[README]]'}\n\n${content}\n`,
  );

  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: noteType === 'research' ? 'research' : 'notes',
    item: createMemoryIndexRecord({
      kind: noteType,
      title,
      preview: content,
      scope: routing.scope,
      path: notePath,
      reason: routing.reason,
    }),
  });

  appendDailyLog(
    config.vault_root,
    `${noteType === 'research' ? 'Research' : 'Note'} captured [${routing.scope}] for \`${config.project_slug}\`: ${title}`,
    buildMemoryLogMarker({ kind: noteType, projectSlug: config.project_slug, title, scope: routing.scope }),
  );

  return notePath;
}

export function writeMemory({
  repoRoot,
  mode,
  title,
  content,
  scope,
}: {
  repoRoot?: string;
  mode: string;
  title?: string;
  content: string;
  scope?: string;
}): string {
  const resolvedRepoRoot = repoRoot ? path.resolve(repoRoot) : findRepoRoot(process.cwd());
  const config = readRepoConfig(resolvedRepoRoot);

  switch (mode) {
    case 'task':
      return appendTask(config, content);
    case 'decision':
      if (!title) {
        throw new Error('Title is required for decision mode.');
      }
      return appendDecision(config, title, content);
    case 'research':
    case 'note':
      if (!title) {
        throw new Error(`Title is required for ${mode} mode.`);
      }
      return createScopedNote({ config, repoRoot: resolvedRepoRoot, noteType: mode, title, content, scope });
    default:
      throw new Error(`Unsupported memory mode: ${mode}`);
  }
}
