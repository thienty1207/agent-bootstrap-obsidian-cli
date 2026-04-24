import fs from 'node:fs';
import path from 'node:path';
import { getTodayString } from './date';
import { ensureDir, findRepoRoot, writeFile } from './fs-utils';
import { readRepoConfig, type RepoConfig } from './context';
import {
  appendDailyLog,
  buildMemoryLogMarker,
  createMemoryIndexRecord,
  formatProjectMemoryIndex,
  readProjectMemoryIndex,
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

function normalizeConfidence(confidence?: string): 'high' | 'medium' | 'low' {
  if (confidence === 'high' || confidence === 'medium' || confidence === 'low') {
    return confidence;
  }

  return 'medium';
}

function appendFact(config: RepoConfig, title: string, content: string, source?: string, confidence?: string): string {
  const factsPath = path.join(config.project_root, config.facts_file || 'Facts.md');
  const existing = fs.existsSync(factsPath) ? fs.readFileSync(factsPath, 'utf8') : '# Facts\n';
  const today = getTodayString();
  const entry = [
    '',
    `## ${title}`,
    `- Fact: ${content}`,
    `- Source: ${source?.trim() || 'unspecified'}`,
    `- Confidence: ${normalizeConfidence(confidence)}`,
    `- Last verified: ${today}`,
    '',
  ].join('\n');
  fs.writeFileSync(factsPath, `${existing.trimEnd()}\n${entry}`);

  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'facts',
    item: createMemoryIndexRecord({
      kind: 'fact',
      title,
      preview: content,
      scope: 'project',
      path: factsPath,
      reason: 'stable project fact',
    }),
  });

  appendDailyLog(
    config.vault_root,
    `Fact recorded for \`${config.project_slug}\`: ${title}`,
    buildMemoryLogMarker({ kind: 'fact', projectSlug: config.project_slug, title, scope: 'project' }),
  );

  return factsPath;
}

function appendQuestion(config: RepoConfig, title: string, content: string): string {
  const questionsPath = path.join(config.project_root, config.open_questions_file || 'Open Questions.md');
  const existing = fs.existsSync(questionsPath) ? fs.readFileSync(questionsPath, 'utf8') : '# Open Questions\n';
  const today = getTodayString();
  const entry = `\n## ${title}\n- Created: ${today}\n- [ ] ${content}\n`;
  fs.writeFileSync(questionsPath, `${existing.trimEnd()}\n${entry}`);

  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'questions',
    item: createMemoryIndexRecord({
      kind: 'question',
      title,
      preview: content,
      scope: 'project',
      path: questionsPath,
      reason: 'open question for future verification',
    }),
  });

  appendDailyLog(
    config.vault_root,
    `Open question recorded for \`${config.project_slug}\`: ${title}`,
    buildMemoryLogMarker({ kind: 'question', projectSlug: config.project_slug, title, scope: 'project' }),
  );

  return questionsPath;
}

function appendHandoff(config: RepoConfig, content: string): string {
  const handoffPath = path.join(config.project_root, config.handoff_file || 'Handoff.md');
  const existing = fs.existsSync(handoffPath) ? fs.readFileSync(handoffPath, 'utf8') : '# Handoff\n';
  const today = getTodayString();
  const title = 'Session handoff';
  const entry = `\n## ${today} - ${title}\n${content}\n`;
  fs.writeFileSync(handoffPath, `${existing.trimEnd()}\n${entry}`);

  updateProjectMemoryIndex({
    projectRoot: config.project_root,
    projectSlug: config.project_slug,
    projectType: config.project_type,
    bucket: 'handoffs',
    item: createMemoryIndexRecord({
      kind: 'handoff',
      title,
      preview: content,
      scope: 'project',
      path: handoffPath,
      reason: 'latest session handoff',
    }),
  });

  appendDailyLog(
    config.vault_root,
    `Handoff updated for \`${config.project_slug}\``,
    buildMemoryLogMarker({ kind: 'handoff', projectSlug: config.project_slug, title, scope: 'project' }),
  );

  return handoffPath;
}

function compactSessionMemory(config: RepoConfig): string {
  const summaryPath = path.join(config.project_root, 'Artifacts', 'session-summary.md');
  const index = readProjectMemoryIndex(config.project_root, config.project_slug, config.project_type);
  const summary = [
    '# Session Summary',
    '',
    `- Project: \`${config.project_slug}\``,
    `- Updated: \`${new Date().toISOString()}\``,
    '',
    formatProjectMemoryIndex(index).trimEnd(),
    '',
  ].join('\n');

  writeFile(summaryPath, summary);
  appendDailyLog(
    config.vault_root,
    `Compacted session memory for \`${config.project_slug}\``,
    buildMemoryLogMarker({ kind: 'compact', projectSlug: config.project_slug, title: 'session-summary', scope: 'project' }),
  );

  return summaryPath;
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
  source,
  confidence,
}: {
  repoRoot?: string;
  mode: string;
  title?: string;
  content: string;
  scope?: string;
  source?: string;
  confidence?: string;
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
    case 'fact':
      if (!title) {
        throw new Error('Title is required for fact mode.');
      }
      return appendFact(config, title, content, source, confidence);
    case 'question':
      if (!title) {
        throw new Error('Title is required for question mode.');
      }
      return appendQuestion(config, title, content);
    case 'handoff':
      return appendHandoff(config, content);
    case 'compact':
      return compactSessionMemory(config);
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
