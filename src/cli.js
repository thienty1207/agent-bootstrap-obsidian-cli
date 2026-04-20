const { loadConfig, saveConfig } = require('./config');
const { initProject } = require('./bootstrap');
const { getContext } = require('./context');
const { writeMemory } = require('./memory');

function parseFlags(args) {
  const options = {};
  const rest = [];

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

function handleConfig(rest) {
  const [subcommand, maybePath] = rest;
  if (subcommand === 'set-vault') {
    if (!maybePath) {
      throw new Error('Usage: agent-bootstrap config set-vault <path>');
    }

    const current = loadConfig();
    current.vaultRoot = maybePath;
    saveConfig(current);
    return JSON.stringify({ vaultRoot: maybePath }, null, 2);
  }

  if (subcommand === 'get') {
    return JSON.stringify(loadConfig(), null, 2);
  }

  throw new Error('Usage: agent-bootstrap config <set-vault|get> ...');
}

function handleMemory(rest, options) {
  const [mode, content] = rest;
  if (!mode || !content) {
    throw new Error('Usage: agent-bootstrap memory <task|decision|research|note> <content> [--title "..."]');
  }

  return writeMemory({
    repoRoot: options['repo-root'],
    mode,
    title: options.title,
    content
  });
}

async function main(argv) {
  const [command, ...tail] = argv;

  if (!command) {
    const result = initProject({ projectPath: process.cwd() });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (command === 'config') {
    process.stdout.write(`${handleConfig(tail)}\n`);
    return;
  }

  if (command === 'context') {
    const { options } = parseFlags(tail);
    process.stdout.write(`${getContext({ repoRoot: options['repo-root'] })}\n`);
    return;
  }

  if (command === 'memory') {
    const { rest, options } = parseFlags(tail);
    process.stdout.write(`${handleMemory(rest, options)}\n`);
    return;
  }

  if (command === 'init') {
    const { rest, options } = parseFlags(tail);
    const result = initProject({
      projectPath: rest[0] || process.cwd(),
      slug: options.slug,
      vaultRoot: options['vault-root']
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const { options } = parseFlags(tail);
  const result = initProject({
    projectPath: command,
    slug: options.slug,
    vaultRoot: options['vault-root']
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

module.exports = {
  main
};
