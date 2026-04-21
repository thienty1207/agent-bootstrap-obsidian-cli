"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("./config");
const context_1 = require("./context");
const bootstrap_1 = require("./bootstrap");
const memory_1 = require("./memory");
const projects_1 = require("./projects");
const doctor_1 = require("./doctor");
const vault_1 = require("./vault");
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
function handleConfig(rest) {
    const [subcommand, maybePath] = rest;
    if (subcommand === 'set-vault') {
        const resolvedVaultRoot = node_path_1.default.resolve(maybePath || process.cwd());
        const current = (0, config_1.loadConfig)();
        current.vaultRoot = resolvedVaultRoot;
        (0, config_1.saveConfig)(current);
        (0, vault_1.ensureVaultScaffold)(resolvedVaultRoot);
        writeJson({ vaultRoot: resolvedVaultRoot, initialized: true });
        return;
    }
    if (subcommand === 'get') {
        writeJson((0, config_1.loadConfig)());
        return;
    }
    throw new Error('Usage: agent-bootstrap config <set-vault|get> ...');
}
function handleMemory(rest, options) {
    const [mode, content] = rest;
    if (!mode || !content) {
        throw new Error('Usage: agent-bootstrap memory <task|decision|research|note> <content> [--title "..."] [--scope auto|project|global]');
    }
    process.stdout.write(`${(0, memory_1.writeMemory)({
        repoRoot: options['repo-root'],
        mode,
        title: options.title,
        content,
        scope: options.scope,
    })}\n`);
}
function handleProjects(rest, options) {
    const [subcommand, maybeSlug] = rest;
    if (!subcommand || subcommand === 'list') {
        writeJson((0, projects_1.listProjects)());
        return;
    }
    if (subcommand === 'show') {
        writeJson((0, projects_1.showProject)(maybeSlug, options['repo-root']));
        return;
    }
    throw new Error('Usage: agent-bootstrap projects <list|show [slug]>');
}
async function main(argv) {
    const [command, ...tail] = argv;
    if (!command) {
        writeJson((0, bootstrap_1.initProject)({ projectPath: process.cwd() }));
        return;
    }
    if (command === 'config') {
        handleConfig(tail);
        return;
    }
    if (command === 'context') {
        const { options } = parseFlags(tail);
        process.stdout.write(`${(0, context_1.getContext)({ repoRoot: options['repo-root'] })}\n`);
        return;
    }
    if (command === 'memory') {
        const { rest, options } = parseFlags(tail);
        handleMemory(rest, options);
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
    if (command === 'new') {
        const { rest, options } = parseFlags(tail);
        const [projectType, projectPath] = rest;
        if (!projectType) {
            throw new Error('Usage: agent-bootstrap new <web|api|tool|desktop|mobile|fullstack> [path]');
        }
        writeJson((0, bootstrap_1.newProject)({
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
        writeJson((0, doctor_1.runDoctor)({ repoRoot: options['repo-root'] }));
        return;
    }
    if (command === 'update') {
        const { rest } = parseFlags(tail);
        writeJson((0, bootstrap_1.updateProject)({ repoRoot: rest[0] || process.cwd() }));
        return;
    }
    if (command === 'migrate') {
        const { rest, options } = parseFlags(tail);
        writeJson((0, bootstrap_1.migrateProject)({
            repoRoot: rest[0] || process.cwd(),
            slug: options.slug,
            vaultRoot: options['vault-root'],
            projectType: options.type,
        }));
        return;
    }
    if (command === 'sync') {
        const { rest } = parseFlags(tail);
        writeJson((0, bootstrap_1.syncProject)({ repoRoot: rest[0] || process.cwd() }));
        return;
    }
    const { options } = parseFlags(tail);
    writeJson((0, bootstrap_1.initProject)({
        projectPath: command,
        slug: options.slug,
        vaultRoot: options['vault-root'],
        projectType: options.type,
    }));
}
