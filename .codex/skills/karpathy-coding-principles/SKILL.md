---
name: karpathy-coding-principles
description: Use when implementing, debugging, reviewing, or refactoring non-trivial code where simple design, explicit assumptions, surgical edits, and fresh verification matter.
---

# Karpathy Coding Principles

Use this as a compact coding mindset overlay. It does not replace Superpowers:
load Superpowers first when the task needs planning, TDD, debugging, review, or
verification workflow.

## Principles

1. Think before coding. State assumptions that affect the implementation. If a
   fork has real consequences, surface it instead of silently choosing.
2. Keep it simple. Prefer the smallest change that solves the request. Do not add
   speculative abstractions, toggles, or helper layers.
3. Edit surgically. Touch files that trace to the request. Leave unrelated
   cleanup for a separate change.
4. Verify against the goal. Use the smallest useful test, build, or smoke check.
   If evidence is missing, say what remains unknown.

## Use With Superpowers

- Superpowers decides the workflow.
- This skill keeps the implementation small, direct, and evidence-backed.
- Domain skills provide subject matter only after the workflow and coding
  discipline are clear.

## Red Flags

- The patch grows a framework where a function would do.
- The answer relies on a guessed repo fact.
- Tests only prove mocks, not behavior.
- The change fixes nearby style while leaving the requested behavior unverified.
