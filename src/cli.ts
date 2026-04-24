import path from 'node:path';
import { loadConfig, saveConfig } from './config';
import { initProject } from './bootstrap';
import { getContext, type ContextMode } from './context';
import { ensureVaultScaffold } from './vault';

const INSTALL_COMMAND = 'npm i -g --force @tytybill123/agent-bootstrap';
const UNINSTALL_COMMAND = 'npm uninstall -g @tytybill123/agent-bootstrap';
const PUBLIC_COMMANDS = 'Public commands: setup, init, context. Use --help for quickstart.';

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

function parseContextArgs(args: string[]): {
  repoRoot?: string;
  mode: ContextMode;
  includeWhy: boolean;
} {
  let repoRoot: string | undefined;
  let mode: ContextMode = 'compact';
  let includeWhy = false;

  for (const value of args) {
    if (value === '--compact') {
      mode = 'compact';
      continue;
    }

    if (value === '--full') {
      mode = 'full';
      continue;
    }

    if (value === '--why') {
      includeWhy = true;
      continue;
    }

    if (value.startsWith('--')) {
      throw new Error(`Unknown context option: ${value}`);
    }

    if (repoRoot) {
      throw new Error('Context accepts at most one repo path.');
    }

    repoRoot = value;
  }

  return { repoRoot, mode, includeWhy };
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function setupVault(maybePath?: string): void {
  const resolvedVaultRoot = path.resolve(maybePath || process.cwd());
  const current = loadConfig();
  current.vaultRoot = resolvedVaultRoot;
  saveConfig(current);
  ensureVaultScaffold(resolvedVaultRoot);
  writeJson({ vaultRoot: resolvedVaultRoot, initialized: true });
}

function writeHelp(): void {
  process.stdout.write(
    [
      'Agent Bootstrap Quickstart',
      '',
      'Install or update the CLI:',
      `  ${INSTALL_COMMAND}`,
      '',
      'Set up your Obsidian vault once on each machine:',
      '  agent-bootstrap setup [vault-path]',
      '',
        'Initialize a project in the current folder or at an explicit path:',
        '  agent-bootstrap init [project-path]',
        '',
        'Optional AI context for agents:',
        '  agent-bootstrap context',
        '  agent-bootstrap context --compact',
        '  agent-bootstrap context --why',
        '  agent-bootstrap context --full',
        '',
        'Remove the CLI if you no longer need it:',
        `  ${UNINSTALL_COMMAND}`,
      ].join('\n'),
  );
  process.stdout.write('\n');
}

export async function main(argv: string[]): Promise<void> {
  const [command, ...tail] = argv;

  if (!command) {
    writeJson(initProject({ projectPath: process.cwd() }));
    return;
  }

  if (command === 'setup') {
    setupVault(tail[0]);
    return;
  }

  if (command === '--help' || command === '-h') {
    writeHelp();
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

  if (command === 'context') {
    const contextArgs = parseContextArgs(tail);
    process.stdout.write(`${getContext(contextArgs)}\n`);
    return;
  }

  throw new Error(`Unknown command "${command}". ${PUBLIC_COMMANDS}`);
}
