# Subagent Routing Index

Read this index before dispatching a subagent. Do not recursively load every
agent body. Use Superpowers for workflow, then dispatch one narrow subagent only
when an independent quality gate helps.

## Core Subagents

This kit ships exactly 3 core subagents:

| Task shape | Agent |
| --- | --- |
| General code review, correctness, maintainability, regressions, or architecture fit | `.codex/agents/code-reviewer.toml` |
| Security review, auth, secrets, injection, dependency risk, or vault-sensitive data handling | `.codex/agents/security-auditor.toml` |
| Test strategy, regression coverage, smoke checks, or verification evidence | `.codex/agents/test-engineer.toml` |

## Routing Rules

- Superpowers owns planning, TDD, debugging, implementation flow, review flow, and verification flow.
- Core subagents are gates for independent perspective, not replacements for Superpowers.
- Do not dispatch subagents by default.
- Dispatch only when the task benefits from an isolated review, security, or test perspective.
- Subagents do not invoke other subagents. Composition belongs to the parent agent, command, or user.
- Use repo files, compact context, and vault bridge facts as evidence. Mark unknowns instead of guessing.

<!-- agent-bootstrap:custom-agents:start -->
## Custom Agents

No custom project agents are registered yet.

When adding one, create `.codex/agents/<agent-name>.toml` and replace this line with a precise routing table entry.
<!-- agent-bootstrap:custom-agents:end -->
