import fs from 'node:fs';
import path from 'node:path';
import { getTodayString } from './date';
import { ensureDir, findRepoRoot, writeFile } from './fs-utils';
import { readRepoConfig, type RepoConfig } from './context';
import { appendDailyLog, resolveScope } from './vault';

function appendTask(config: RepoConfig, content: string): string {
  const tasksPath = path.join(config.project_root, config.tasks_file);
  const existing = fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, 'utf8') : '# Tasks\n';
  fs.writeFileSync(tasksPath, `${existing.trimEnd()}\n\n- [ ] ${content}\n`);
  appendDailyLog(config.vault_root, `Task updated for \`${config.project_slug}\`: ${content}`);
  return tasksPath;
}

function appendDecision(config: RepoConfig, title: string, content: string): string {
  const decisionsPath = path.join(config.project_root, config.decisions_file);
  const existing = fs.existsSync(decisionsPath) ? fs.readFileSync(decisionsPath, 'utf8') : '# Decisions\n';
  const today = getTodayString();
  const entry = `\n## ${today} - ${title}\n- Context: agent-bootstrap CLI memory command\n- Decision: ${content}\n`;
  fs.writeFileSync(decisionsPath, `${existing.trimEnd()}\n${entry}`);
  appendDailyLog(config.vault_root, `Decision recorded for \`${config.project_slug}\`: ${title}`);
  return decisionsPath;
}

function createScopedNote({
  config,
  noteType,
  title,
  content,
  scope,
}: {
  config: RepoConfig;
  noteType: 'research' | 'note';
  title: string;
  content: string;
  scope?: string;
}): string {
  const resolvedScope = resolveScope({ scope, mode: noteType, title, content });
  const baseRoot = resolvedScope === 'global' ? config.vault_root : config.project_root;
  const directory = noteType === 'research'
    ? (resolvedScope === 'global' ? 'Research' : config.research_dir)
    : (resolvedScope === 'global' ? 'Notes' : config.notes_dir);
  const targetDir = path.join(baseRoot, directory);
  ensureDir(targetDir);
  const today = getTodayString();
  const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim();
  const notePath = path.join(targetDir, `${today} ${safeTitle}.md`);
  const projectValue = resolvedScope === 'global' ? '' : config.project_slug;
  const tags = noteType === 'research' ? '  - research' : '  - note';

  writeFile(
    notePath,
    `---\ntype: ${noteType}\nscope: ${resolvedScope}\nproject: ${projectValue}\nproject_type: ${config.project_type}\ncreated: ${today}\nupdated: ${today}\nstatus: draft\ntags:\n${tags}\n---\n\n# ${title}\n\n${content}\n`,
  );

  appendDailyLog(
    config.vault_root,
    `${noteType === 'research' ? 'Research' : 'Note'} captured [${resolvedScope}] for \`${config.project_slug}\`: ${title}`,
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
      return createScopedNote({ config, noteType: mode, title, content, scope });
    default:
      throw new Error(`Unsupported memory mode: ${mode}`);
  }
}
