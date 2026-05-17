"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("./config");
const bootstrap_1 = require("./bootstrap");
const context_1 = require("./context");
const vault_1 = require("./vault");
const memory_ops_1 = require("./memory-ops");
const INSTALL_COMMAND = 'npm i -g --force @kakasitink/agent-bootstrap';
const UNINSTALL_COMMAND = 'npm uninstall -g @kakasitink/agent-bootstrap';
const PUBLIC_COMMANDS = 'Public commands: setup, init, update, context, recall, memory. Use --help for quickstart.';
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
function parseContextArgs(args) {
    let repoRoot;
    let mode = 'compact';
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
function writeJson(value) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}
function setupVault(maybePath) {
    const resolvedVaultRoot = node_path_1.default.resolve(maybePath || process.cwd());
    const current = (0, config_1.loadConfig)();
    current.vaultRoot = resolvedVaultRoot;
    (0, config_1.saveConfig)(current);
    (0, vault_1.ensureVaultScaffold)(resolvedVaultRoot);
    writeJson({ vaultRoot: resolvedVaultRoot, initialized: true });
}
function writeHelp() {
    process.stdout.write([
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
        '  agent-bootstrap memory sync-sessions [project-path]',
        '  agent-bootstrap memory export [project-path]',
        '  agent-bootstrap memory backup [project-path]',
        '',
        'Remove the CLI if you no longer need it:',
        `  ${UNINSTALL_COMMAND}`,
    ].join('\n'));
    process.stdout.write('\n');
}
async function main(argv) {
    const [command, ...tail] = argv;
    if (!command) {
        writeJson((0, bootstrap_1.initProject)({ projectPath: process.cwd() }));
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
        writeJson((0, bootstrap_1.initProject)({
            projectPath: rest[0] || process.cwd(),
            slug: options.slug,
            vaultRoot: options['vault-root'],
            projectType: options.type,
        }));
        return;
    }
    if (command === 'update') {
        const { rest } = parseFlags(tail);
        writeJson((0, bootstrap_1.updateProject)({
            repoRoot: rest[0] || process.cwd(),
        }));
        return;
    }
    if (command === 'context') {
        const contextArgs = parseContextArgs(tail);
        process.stdout.write(`${(0, context_1.getContext)(contextArgs)}\n`);
        return;
    }
    if (command === 'recall') {
        const { rest, options } = parseFlags(tail);
        const query = rest[0];
        if (!query) {
            throw new Error('Recall requires a query: agent-bootstrap recall "<query>" [project-path]');
        }
        process.stdout.write(`${(0, memory_ops_1.runRecall)({
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
            throw new Error('Memory requires a subcommand: status, sync-sessions, export, backup.');
        }
        writeJson((0, memory_ops_1.runMemoryCommand)(subcommand, { repoRoot: rest[1] }));
        return;
    }
    throw new Error(`Unknown command "${command}". ${PUBLIC_COMMANDS}`);
}
