import path from 'node:path';
import { loadConfig, saveConfig } from './config';
import { initProject, updateProject } from './bootstrap';
import { getContext, readRepoConfig, resolveRepoRoot, type ContextMode } from './context';
import { ensureVaultScaffold } from './vault';
import { runMemoryCommand, runRecall } from './memory-ops';
import { runPlanCommand } from './plan-state';
import { runHarnessCommand } from './product-harness';

const INSTALL_COMMAND = 'npm i -g --force @kakasitink/agent-bootstrap';
const UNINSTALL_COMMAND = 'npm uninstall -g @kakasitink/agent-bootstrap';
const PUBLIC_COMMANDS = 'Public commands: setup, init, update, context, recall, memory, plan, harness. Use --help for quickstart.';

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
      '  agent-bootstrap init [project-path] --type frontend|backend|tool|desktop|mobile|fullstack',
      '',
      'Update kit-managed files in an existing project:',
      '  agent-bootstrap update [project-path]',
      '',
      'Optional AI context for agents:',
        '  agent-bootstrap context',
        '  agent-bootstrap context --compact',
        '  agent-bootstrap context --why',
        '  agent-bootstrap context --full',
        '',
        'Automatic memory recall and maintenance:',
        '  agent-bootstrap recall "<query>" [project-path]',
        '  agent-bootstrap memory status [project-path]',
        '  agent-bootstrap memory import-sessions [project-path]',
        '  agent-bootstrap memory sync-sessions [project-path]',
        '  agent-bootstrap memory export [project-path]',
        '  agent-bootstrap memory backup [project-path]',
        '',
        'Automatic active plan state:',
        '  agent-bootstrap plan status [project-path]',
        '  agent-bootstrap plan start "<title>" [project-path]',
        '  agent-bootstrap plan update "<progress note>" [project-path]',
        '  agent-bootstrap plan complete "<verification summary>" [project-path]',
        '  agent-bootstrap plan interrupt "<last known state>" [project-path]',
        '',
        'Automatic product harness:',
        '  agent-bootstrap harness status [project-path]',
        '  agent-bootstrap harness intake "<feature title>" [project-path]',
        '  agent-bootstrap harness proof "<verification summary>" [project-path]',
        '  agent-bootstrap harness decision "<decision summary>" [project-path]',
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

  if (command === 'update') {
    const { rest } = parseFlags(tail);
    writeJson(updateProject({
      repoRoot: rest[0] || process.cwd(),
    }));
    return;
  }

  if (command === 'context') {
    const contextArgs = parseContextArgs(tail);
    process.stdout.write(`${getContext(contextArgs)}\n`);
    return;
  }

  if (command === 'recall') {
    const { rest, options } = parseFlags(tail);
    const query = rest[0];
    if (!query) {
      throw new Error('Recall requires a query: agent-bootstrap recall "<query>" [project-path]');
    }

    process.stdout.write(`${runRecall({
      query,
      repoRoot: rest[1],
      limit: options.limit ? Number.parseInt(options.limit, 10) : undefined,
    })}\n`);
    return;
  }

  if (command === 'memory') {
    const { rest } = parseFlags(tail);
    const subcommand = rest[0];
    if (!subcommand) {
      throw new Error('Memory requires a subcommand: status, import-sessions, sync-sessions, export, backup.');
    }

    writeJson(runMemoryCommand(subcommand, { repoRoot: rest[1] }));
    return;
  }

  if (command === 'plan') {
    const { rest } = parseFlags(tail);
    const subcommand = rest[0];
    if (!subcommand) {
      throw new Error('Plan requires a subcommand: status, start, update, complete, interrupt.');
    }

    const payload = subcommand === 'status' ? undefined : rest[1];
    const repoRoot = subcommand === 'status' ? rest[1] : rest[2];
    const foundRepoRoot = resolveRepoRoot(repoRoot ? path.resolve(repoRoot) : process.cwd());
    writeJson(runPlanCommand(subcommand, {
      repoRoot: foundRepoRoot,
      config: readRepoConfig(foundRepoRoot),
      titleOrNote: payload,
    }));
    return;
  }

  if (command === 'harness') {
    const { rest } = parseFlags(tail);
    const subcommand = rest[0];
    if (!subcommand) {
      throw new Error('Harness requires a subcommand: status, intake, proof, decision.');
    }

    const payload = subcommand === 'status' ? undefined : rest[1];
    const repoRoot = subcommand === 'status' ? rest[1] : rest[2];
    const foundRepoRoot = resolveRepoRoot(repoRoot ? path.resolve(repoRoot) : process.cwd());
    writeJson(runHarnessCommand(subcommand, {
      repoRoot: foundRepoRoot,
      config: readRepoConfig(foundRepoRoot),
      value: payload,
    }));
    return;
  }

  throw new Error(`Unknown command "${command}". ${PUBLIC_COMMANDS}`);
}
