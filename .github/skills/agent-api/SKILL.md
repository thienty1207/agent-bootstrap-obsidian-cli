---
name: agent-api
description: Use when building or refactoring the model-provider integration layer for an AI application or agent system, especially multi-provider adapters, request and response normalization, streaming bridges, tool-calling interfaces, structured-output contracts, retries, rate limits, usage tracking, or provider switching. Skip workflow-only, public product API design, infra, security-only, database-only, or provider-specific SDK lookup tasks.
---

# Agent API

Portable guidance for the backend layer that sits between your application logic and model providers.

This skill is for the **integration boundary**: the code that turns app intents into provider requests and turns provider responses back into stable internal contracts.

## When To Use

- A project needs one app-facing interface over multiple model providers.
- Provider-specific code is leaking into handlers, controllers, jobs, or UI code.
- You need normalized streaming, tool calling, structured output, or usage telemetry.
- You want to swap providers without rewriting business logic.
- You are building an agent backend where orchestration policy should stay above the SDK layer.

## Do Not Use

- Workflow, planning, debugging, or verification discipline: use `superpowers/`.
- Coding style and minimal-edit behavior: use `andrej-karpathy-skills/`.
- Public REST or GraphQL contract design: use `api-designer/`.
- System-wide architecture, ADRs, or service topology: use `architecture-designer/`.
- Auth, input hardening, or security review: use `secure-code-guardian/`.
- Deployment, infrastructure, or runtime operations: use `devops-engineer/` and `monitoring-expert/`.
- Database tuning, SQL design, or query performance: use `database-optimizer/` and `sql-pro/`.
- Broad legacy-system migration outside the provider boundary: use `legacy-modernizer/`.
- Provider-specific SDK signatures, current limits, or latest model names: verify against current official docs before coding.

## Core Pattern

1. Freeze one **app-facing contract** before touching provider code.
2. Model provider capabilities explicitly instead of scattering `if provider == ...` checks.
3. Normalize requests, stream events, tool calls, structured outputs, errors, and usage into internal types.
4. Keep provider adapters thin; keep orchestration policy above them.
5. Test the normalized boundary so providers can be changed safely.

## Reading Guide

- Start with `references/agent-api-architecture.md`.
- Read `references/provider-capabilities.md` before adding provider-specific branches.
- Read `references/streaming-contract.md` for live output or UI updates.
- Read `references/tool-calling.md` when models can request tools or functions.
- Read `references/structured-output.md` when the caller expects machine-validated data.
- Read `references/reliability-and-cost.md` for retries, budgets, usage, and context controls.
- Read `references/provider-migration.md` when replacing or adding a provider.
- Then read the relevant language note:
  - `python/agent-api.md`
  - `typescript/agent-api.md`
  - `go/agent-api.md`
  - `rust/agent-api.md`

## Output Checklist

When using this skill, the resulting design or code should usually include:

- one app-facing request and response contract
- one provider capability model
- one adapter per provider
- one normalized stream event model
- one normalized tool-call model
- one structured-output validation path
- one retry, timeout, and usage policy
- one conformance test surface that is provider-agnostic

## Guardrails

- Never let handlers or business services import provider SDK types directly if the project claims to be multi-provider.
- Never expose raw provider event names to the rest of the app.
- Never trust provider-native JSON or schema mode without local validation.
- Never mix provider switching policy with low-level transport code.
- Never assume capability parity across providers; encode it explicitly.
- Keep vendor-specific escape hatches isolated inside the adapter, not spread across the codebase.

## Source Note

This skill was written for this kit and intentionally rewritten to be provider-agnostic and runtime-agnostic. Its structure was informed by the organization of Anthropic's `claude-api` skill, but this version does not assume Claude-specific runtime commands or provider-only workflows.
