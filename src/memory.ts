import fs from 'node:fs';
import path from 'node:path';
import { getTodayString } from './date';
import { ensureDir, findRepoRoot, writeFile } from './fs-utils';
import { readRepoConfig, type RepoConfig } from './context';

function appendTask(config: RepoConfig, content: string): string {
  const tasksPath = path.join(config.project_root, config.tasks_file);
  const existing = fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, 'utf8') : '# Tasks\n';
  fs.writeFileSync(tasksPath, `${existing.trimEnd()}\n\n- [ ] ${content}\n`);
  return tasksPath;
}

function appendDecision(config: RepoConfig, title: string, content: string): string {
  const decisionsPath = path.join(config.project_root, config.decisions_file);
  const existing = fs.existsSync(decisionsPath) ? fs.readFileSync(decisionsPath, 'utf8') : '# Decisions\n';
  const today = getTodayString();
  const entry = `\n## ${today} - ${title}\n- Context: agent-bootstrap CLI memory command\n- Decision: ${content}\n`;
  fs.writeFileSync(decisionsPath, `${existing.trimEnd()}\n${entry}`);
  return decisionsPath;
}

function createNote(config: RepoConfig, noteType: 'research' | 'note', title: string, content: string): string {
  const directory = noteType === 'research' ? config.research_dir : config.notes_dir;
  const targetDir = path.join(config.project_root, directory);
  ensureDir(targetDir);
  const today = getTodayString();
  const safeTitle = title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-').replace(/\s+/g, ' ').trim();
  const notePath = path.join(targetDir, `${today} ${safeTitle}.md`);
  writeFile(
    notePath,
    `---\ntype: ${noteType}\nproject: ${config.project_slug}\nproject_type: ${config.project_type}\ncreated: ${today}\n---\n\n# ${title}\n\n${content}\n`,
  );
  return notePath;
}

export function writeMemory({
  repoRoot,
  mode,
  title,
  content,
}: {
  repoRoot?: string;
  mode: string;
  title?: string;
  content: string;
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
      return createNote(config, mode, title, content);
    default:
      throw new Error(`Unsupported memory mode: ${mode}`);
  }
}
