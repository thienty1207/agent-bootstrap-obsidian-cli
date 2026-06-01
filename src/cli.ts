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
  options: Record<string, string | boolean>;
}

function parseFlags(args: string[]): ParsedArgs {
  const options: Record<string, string | boolean> = {};
  const rest: string[] = [];
  const booleanFlags = new Set(['open', 'closed']);

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (!value.startsWith('--')) {
      rest.push(value);
      continue;
    }

    const flag = value.slice(2);
    if (booleanFlags.has(flag)) {
      options[flag] = true;
      continue;
    }
    const next = args[index + 1];
    if (next === undefined || next.startsWith('--')) {
      throw new Error(`Missing value for --${flag}`);
    }

    options[flag] = next;
    index += 1;
  }

  return { rest, options };
}

function optionString(options: Record<string, string | boolean>, key: string): string | undefined {
  return typeof options[key] === 'string' ? options[key] as string : undefined;
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
        '  agent-bootstrap memory index [project-path]',
        '  agent-bootstrap memory compact [project-path]',
        '  agent-bootstrap memory promote-global "<summary>" [project-path]',
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
        '  agent-bootstrap harness check [project-path]',
        '  agent-bootstrap harness intake "<feature title>" [project-path]',
        '  agent-bootstrap harness proof "<verification summary>" [project-path]',
        '  agent-bootstrap harness decision "<decision summary>" [project-path]',
        '  agent-bootstrap harness trace "<summary>" [project-path]',
        '  agent-bootstrap harness score-trace [project-path]',
        '  agent-bootstrap harness score-trace --id <trace-id> [project-path]',
        '  agent-bootstrap harness friction "<pain or missing workflow>" [project-path]',
        '  agent-bootstrap harness backlog [project-path]',
        '  agent-bootstrap harness backlog --open [project-path]',
        '  agent-bootstrap harness backlog --closed [project-path]',
        '  agent-bootstrap harness friction-report [project-path]',
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
      slug: optionString(options, 'slug'),
      vaultRoot: optionString(options, 'vault-root'),
      projectType: optionString(options, 'type'),
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
      limit: typeof options.limit === 'string' ? Number.parseInt(options.limit, 10) : undefined,
    })}\n`);
    return;
  }

  if (command === 'memory') {
    const { rest } = parseFlags(tail);
    const subcommand = rest[0];
    if (!subcommand) {
      throw new Error('Memory requires a subcommand: status, index, compact, promote-global, import-sessions, sync-sessions, export, backup.');
    }

    const value = subcommand === 'promote-global' ? rest[1] : undefined;
    const repoRoot = subcommand === 'promote-global' ? rest[2] : rest[1];
    writeJson(runMemoryCommand(subcommand, { repoRoot, value }));
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
    const { rest, options } = parseFlags(tail);
    const subcommand = rest[0];
    if (!subcommand) {
      throw new Error('Harness requires a subcommand: status, check, intake, proof, decision, trace, score-trace, friction, backlog, friction-report.');
    }

    const noPayload = new Set(['status', 'check', 'score-trace', 'backlog', 'friction-report']);
    const payload = noPayload.has(subcommand) ? undefined : rest[1];
    const repoRoot = noPayload.has(subcommand) ? rest[1] : rest[2];
    const foundRepoRoot = resolveRepoRoot(repoRoot ? path.resolve(repoRoot) : process.cwd());
    writeJson(runHarnessCommand(subcommand, {
      repoRoot: foundRepoRoot,
      config: readRepoConfig(foundRepoRoot),
      value: payload,
      id: optionString(options, 'id'),
      filter: options.open ? 'open' : options.closed ? 'closed' : 'all',
    }));
    return;
  }

  throw new Error(`Unknown command "${command}". ${PUBLIC_COMMANDS}`);
}
