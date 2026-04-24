# End-to-End Kit V3 Lifecycle Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the TypeScript kit so existing repos can be upgraded safely, new repos get stronger type-aware orientation docs, and diagnostics become actionable instead of binary.

**Architecture:** Keep the current one-command bootstrap flow intact, then add a thin lifecycle layer on top of it: `update` for repo-local managed assets, `migrate` for legacy repos, richer repo metadata via `kit_version`, and `doctor` reports that list missing paths plus repair commands. Reuse the existing bootstrap pipeline instead of creating a second template system.

**Tech Stack:** TypeScript, Node.js, built-in `node:test`, plain Node runtime for packaged CLI

---

### Task 1: Define the lifecycle expansion

**Files:**
- Create: `plans/2026-04-21-kit-v3-lifecycle-plan.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Lock the command additions**

Add these lifecycle commands to the documented CLI surface:

- `agent-bootstrap update`
- `agent-bootstrap migrate [path] --type <type>`

- [ ] **Step 2: Lock the metadata additions**

Document that generated repos should now contain:

- `kit_version` in `vault.config.json`
- `docs/project-map.md` as a generated type-aware orientation doc

### Task 2: Drive the lifecycle work by failing tests

**Files:**
- Modify: `test/cli.test.js`

- [ ] **Step 1: Add a failing test for generated kit metadata**
- [ ] **Step 2: Add a failing test for `update` restoring managed files without clobbering `README.md`**
- [ ] **Step 3: Add a failing test for `migrate` upgrading legacy `AGENTS.md` layouts**
- [ ] **Step 4: Add a failing test for actionable `doctor` output**

### Task 3: Implement reusable kit metadata and templates

**Files:**
- Create: `src/kit.ts`
- Modify: `src/templates.ts`
- Modify: `src/context.ts`

- [ ] **Step 1: Add a shared source for kit version and required managed repo paths**
- [ ] **Step 2: Generate `docs/project-map.md` from project type**
- [ ] **Step 3: Include `project-map` in both global and repo-local context loaders**

### Task 4: Extend bootstrap into a lifecycle engine

**Files:**
- Modify: `src/bootstrap.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Refactor bootstrap to support action-aware reports**
- [ ] **Step 2: Add `update` for repo-local asset refresh**
- [ ] **Step 3: Add `migrate` for legacy repo upgrade while preserving existing `README.md`**
- [ ] **Step 4: Persist `kit_version` in generated repo config**

### Task 5: Make diagnostics actionable

**Files:**
- Modify: `src/doctor.ts`

- [ ] **Step 1: Check for missing managed repo files, vault files, runtime, and hooks**
- [ ] **Step 2: Return missing path lists and suggested commands**
- [ ] **Step 3: Include the current kit version in doctor output**

### Task 6: Verify end-to-end

**Files:**
- Modify: `test/cli.test.js`

- [ ] **Step 1: Run `npm test`**
- [ ] **Step 2: Run a packaged smoke install and verify `migrate`, `update`, and `doctor` through the installed CLI**
