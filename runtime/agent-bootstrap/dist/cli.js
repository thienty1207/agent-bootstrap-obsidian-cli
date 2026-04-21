"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("./config");
const bootstrap_1 = require("./bootstrap");
const vault_1 = require("./vault");
const INSTALL_COMMAND = 'npm i -g --force @tytybill123/agent-bootstrap';
const UNINSTALL_COMMAND = 'npm uninstall -g @tytybill123/agent-bootstrap';
const PUBLIC_COMMANDS = 'Public commands: setup, init. Use --help for quickstart.';
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
    throw new Error(`Unknown command "${command}". ${PUBLIC_COMMANDS}`);
}
