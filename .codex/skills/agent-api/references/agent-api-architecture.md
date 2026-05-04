# Agent API Architecture

## Goal

Keep application logic stable while model providers, SDKs, and wire formats change underneath.

## Recommended Layers

```text
Application / Agent Logic
        |
        v
Agent Service or Use-Case Layer
        |
        v
Agent API Contract
        |
        v
Provider Adapter(s)
        |
        v
SDK / HTTP Client / Provider API
```

## Stable Internal Contracts

Define internal types before you write the adapter:

- `AgentRequest`
- `AgentResponse`
- `AgentStreamEvent`
- `ToolSpec`
- `ToolCall`
- `ToolResult`
- `UsageReport`
- `ProviderCapabilities`

The app should depend on these internal contracts, not provider-native types.

## Request Shape

Your internal request should usually cover:

- messages or prompt input
- model profile or intent
- tool definitions
- output schema
- timeout and retry hints
- tracing or correlation IDs
- user or tenant metadata that matters for policy

Provider-specific fields belong in a narrow `provider_overrides` escape hatch if they must exist at all.

## Response Shape

Your internal response should usually expose:

- final text or content blocks
- structured output payload after validation
- tool calls requested by the model
- finish reason
- usage metrics
- raw provider metadata in a debug-only envelope

## Capability-Driven Branching

Do not branch directly on provider name in app logic.

Instead, branch on capabilities such as:

- supports_streaming
- supports_tool_calling
- supports_parallel_tool_calls
- supports_structured_output
- supports_vision
- supports_prompt_caching
- supports_reasoning_controls

This keeps feature policy readable and makes migrations safer.

## What Stays Above The Adapter

- tool execution policy
- approval gates for side effects
- multi-step agent loops
- retries for business operations
- routing between providers
- fallbacks and degrade strategy

## What Stays Inside The Adapter

- auth headers
- endpoint and SDK calls
- provider-specific event parsing
- provider-native request translation
- provider-native response translation
- provider-specific error mapping
