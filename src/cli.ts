import { loadConfig, saveConfig } from './config';
import { getContext } from './context';
import { initProject, newProject, syncProject } from './bootstrap';
import { writeMemory } from './memory';
import { listProjects, showProject } from './projects';
import { runDoctor } from './doctor';

interface ParsedArgs {
  rest: string[];
  options: Record<string, string>;
}

function parseFlags(args: string[]): ParsedArgs {
  const options: Record<string, string> = {};
  const rest: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) {
      rest.push(value);
      continue;
    }

    const flag = value.slice(2);
    const next = args[index + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Missing value for --${flag}`);
    }

    options[flag] = next;
    index += 1;
  }

  return { rest, options };
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function handleConfig(rest: string[]): void {
  const [subcommand, maybePath] = rest;
  if (subcommand === 'set-vault') {
    if (!maybePath) {
      throw new Error('Usage: agent-bootstrap config set-vault <path>');
    }

    const current = loadConfig();
    current.vaultRoot = maybePath;
    saveConfig(current);
    writeJson({ vaultRoot: maybePath });
    return;
  }

  if (subcommand === 'get') {
    writeJson(loadConfig());
    return;
  }

  throw new Error('Usage: agent-bootstrap config <set-vault|get> ...');
}

function handleMemory(rest: string[], options: Record<string, string>): void {
  const [mode, content] = rest;
  if (!mode || !content) {
    throw new Error('Usage: agent-bootstrap memory <task|decision|research|note> <content> [--title "..."]');
  }

  process.stdout.write(`${writeMemory({
    repoRoot: options['repo-root'],
    mode,
    title: options.title,
    content,
  })}\n`);
}

function handleProjects(rest: string[], options: Record<string, string>): void {
  const [subcommand, maybeSlug] = rest;
  if (!subcommand || subcommand === 'list') {
    writeJson(listProjects());
    return;
  }

  if (subcommand === 'show') {
    writeJson(showProject(maybeSlug, options['repo-root']));
    return;
  }

  throw new Error('Usage: agent-bootstrap projects <list|show [slug]>');
}

export async function main(argv: string[]): Promise<void> {
  const [command, ...tail] = argv;

  if (!command) {
    writeJson(initProject({ projectPath: process.cwd() }));
    return;
  }

  if (command === 'config') {
    handleConfig(tail);
    return;
  }

  if (command === 'context') {
    const { options } = parseFlags(tail);
    process.stdout.write(`${getContext({ repoRoot: options['repo-root'] })}\n`);
    return;
  }

  if (command === 'memory') {
    const { rest, options } = parseFlags(tail);
    handleMemory(rest, options);
    return;
  }

  if (command === 'init') {
    const { rest, options } = parseFlags(tail);
    writeJson(initProject({
      projectPath: rest[0] || process.cwd(),
      slug: options.slug,
      vaultRoot: options['vault-root'],
      projectType: options.type,
    }));
    return;
  }

  if (command === 'new') {
    const { rest, options } = parseFlags(tail);
    const [projectType, projectPath] = rest;
    if (!projectType) {
      throw new Error('Usage: agent-bootstrap new <web|api|tool|desktop|mobile|fullstack> [path]');
    }

    writeJson(newProject({
      projectType,
      projectPath: projectPath || process.cwd(),
      slug: options.slug,
      vaultRoot: options['vault-root'],
    }));
    return;
  }

  if (command === 'projects') {
    const { rest, options } = parseFlags(tail);
    handleProjects(rest, options);
    return;
  }

  if (command === 'doctor') {
    const { options } = parseFlags(tail);
    writeJson(runDoctor({ repoRoot: options['repo-root'] }));
    return;
  }

  if (command === 'sync') {
    const { rest } = parseFlags(tail);
    writeJson(syncProject({ repoRoot: rest[0] || process.cwd() }));
    return;
  }

  const { options } = parseFlags(tail);
  writeJson(initProject({
    projectPath: command,
    slug: options.slug,
    vaultRoot: options['vault-root'],
    projectType: options.type,
  }));
}
