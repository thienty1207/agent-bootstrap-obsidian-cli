# End-to-End Kit V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the current bootstrap utility into a TypeScript-based end-to-end project kit that still installs as `agent-bootstrap`, bootstraps project types in one command, and supports registry, diagnostics, and sync flows.

**Architecture:** Keep the current bootstrap behavior as the product core, but move the implementation to TypeScript with a built `dist/` runtime. Introduce a small machine-local registry, typed project metadata, and operational commands (`new`, `projects`, `doctor`, `sync`) while preserving the single-command bootstrap workflow.

**Tech Stack:** TypeScript, Node.js, built-in `node:test`, plain Node runtime for packaged CLI

---

### Task 1: Plan the command surface and target file layout

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Create: `plans/2026-04-21-kit-v2-implementation-plan.md`

- [ ] **Step 1: Define the command surface in the plan and docs**

Document the target command set:

- `agent-bootstrap`
- `agent-bootstrap init`
- `agent-bootstrap new <type> [path]`
- `agent-bootstrap config set-vault [path]`
- `agent-bootstrap config get`
- `agent-bootstrap projects list`
- `agent-bootstrap projects show [slug]`
- `agent-bootstrap doctor`
- `agent-bootstrap sync`
- `agent-bootstrap context`
- `agent-bootstrap memory <mode> ...`

- [ ] **Step 2: Document the new package structure**

Capture the intended structure:

- `src/*.ts` source
- `dist/*.js` compiled runtime
- `bin/agent-bootstrap.js` thin loader
- root `.github/`, `docs/`, `plans/` as reusable template assets
- machine-local config in `~/.agent-bootstrap/config.json`
- machine-local registry in `~/.agent-bootstrap/projects.json`

- [ ] **Step 3: Keep the one-command principle explicit**

State clearly that `agent-bootstrap` with no arguments must remain the default one-command bootstrap path for the current folder.

### Task 2: Write failing tests for the new runtime and command surface

**Files:**
- Modify: `test/cli.test.js`

- [ ] **Step 1: Add a failing test for `new <type> <path>`**

Test requirements:

- `agent-bootstrap new web <path>` bootstraps the target path
- generated `vault.config.json` contains `project_type: "web"`
- root `AGENTS.md` mentions the project type

- [ ] **Step 2: Add a failing test for the machine-local registry**

Test requirements:

- after bootstrap, `projects list` returns the new project
- registry entry includes slug, repo path, vault project path, and project type

- [ ] **Step 3: Add a failing test for `doctor`**

Test requirements:

- `doctor` in a bootstrapped repo reports configured vault root
- `doctor` confirms the repo has `AGENTS.md`, `vault.config.json`, `.github`, `docs`, `plans`

- [ ] **Step 4: Add a failing test for `sync`**

Test requirements:

- if a generated file like `docs/system-architecture.md` is deleted from a bootstrapped repo
- `agent-bootstrap sync` restores it

- [ ] **Step 5: Add a failing test that the package runs from built output**

Test requirements:

- tests and smoke flows should execute through the built CLI path, not source-only JS

### Task 3: Migrate the CLI implementation from JavaScript to TypeScript

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json`
- Modify: `bin/agent-bootstrap.js`
- Create: `src/bootstrap.ts`
- Create: `src/cli.ts`
- Create: `src/config.ts`
- Create: `src/context.ts`
- Create: `src/date.ts`
- Create: `src/fs-utils.ts`
- Create: `src/memory.ts`
- Create: `src/templates.ts`
- Create: `src/projects.ts`
- Create: `src/doctor.ts`
- Delete: `src/bootstrap.js`
- Delete: `src/cli.js`
- Delete: `src/config.js`
- Delete: `src/context.js`
- Delete: `src/date.js`
- Delete: `src/fs-utils.js`
- Delete: `src/memory.js`
- Delete: `src/templates.js`

- [ ] **Step 1: Add TypeScript build tooling**

Implement:

- `typescript` dev dependency
- `build` script with `tsc`
- `test` script that builds before running `node --test`
- package `files` including `dist/`

- [ ] **Step 2: Port the current modules to TypeScript**

Keep behavior equivalent first:

- config resolution
- bootstrap
- context
- memory write-back
- template generation

- [ ] **Step 3: Point the CLI bin at built output**

`bin/agent-bootstrap.js` should require `../dist/cli.js`.

### Task 4: Add typed project kits and richer bootstrap metadata

**Files:**
- Modify: `src/bootstrap.ts`
- Modify: `src/templates.ts`
- Modify: `src/context.ts`

- [ ] **Step 1: Define supported project types**

Add a typed set:

- `web`
- `api`
- `tool`
- `desktop`
- `mobile`
- `fullstack`

- [ ] **Step 2: Store project type in generated repo config**

`vault.config.json` must include `project_type`.

- [ ] **Step 3: Seed type-aware instructions**

Generated `AGENTS.md` should include:

- project type
- which docs to read first
- which parts of `.github/` matter most for that type
- the write-back contract to the vault

### Task 5: Add machine-local project registry support

**Files:**
- Create: `src/projects.ts`
- Modify: `src/config.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Add registry path helpers**

Implement `~/.agent-bootstrap/projects.json`.

- [ ] **Step 2: Register projects on bootstrap**

Each entry should contain:

- `slug`
- `projectType`
- `repoRoot`
- `vaultRoot`
- `vaultProjectRoot`
- `updatedAt`

- [ ] **Step 3: Add `projects list` and `projects show`**

Output JSON for predictable scripting.

### Task 6: Add diagnostics and resynchronization commands

**Files:**
- Create: `src/doctor.ts`
- Modify: `src/bootstrap.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Implement `doctor`**

Check:

- vault configuration exists
- repo bootstrap markers exist
- repo template directories exist
- git availability
- current repo registration status

- [ ] **Step 2: Implement `sync`**

Re-apply missing generated assets without clobbering existing user-authored files like `README.md`.

- [ ] **Step 3: Keep bootstrap idempotent**

Repeated runs should not create duplicate state.

### Task 7: Update docs and package behavior for end users

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update install and usage docs**

Show:

- TypeScript build-backed CLI
- one-command bootstrap
- `new`, `projects`, `doctor`, and `sync`

- [ ] **Step 2: Document the kit model**

Explain that root `.github/`, `docs/`, and `plans/` are the template source for generated projects.

### Task 8: Verify the full flow end-to-end

**Files:**
- Modify: `test/cli.test.js`

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 2: Run a packaged install smoke test**

Run a temporary `npm install -g . --prefix <temp>` flow and verify:

- `agent-bootstrap new web <temp-repo>` works
- generated repo contains one root `AGENTS.md`
- generated repo contains `.github/`, `docs/`, `plans/`
- `projects list` includes the repo
- `doctor` returns healthy checks
- `sync` restores a deleted generated file

- [ ] **Step 3: Commit only after verification**

Use a single commit for the v2 foundation after all verification is green.
