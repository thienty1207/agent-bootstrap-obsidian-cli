# Provider Capabilities

Treat provider features as data, not tribal knowledge.

## Core Capability Buckets

- input modalities: text, image, audio, files
- output modes: text, json, schema-constrained output
- live behavior: streaming, resumable streaming, cancellation
- tools: function calling, parallel tools, server-side tools
- scale controls: batch support, caching, context editing, compaction
- reasoning controls: effort, reasoning visibility, token budgeting
- ops signals: usage, latency, cost metadata, request IDs

## Capability Model

A practical capability object should answer:

- Can the provider do this at all?
- If yes, what constraints or degrade rules apply?
- If no, what fallback should the app use?

Example categories:

```json
{
  "streaming": true,
  "tool_calling": true,
  "parallel_tool_calls": false,
  "structured_output": "validated-locally",
  "vision": true,
  "server_side_tools": false,
  "prompt_caching": "provider-specific",
  "reasoning_controls": "partial"
}
```

## Degrade Strategy

Encode expected fallback behavior up front.

- No structured output: generate text, then validate and repair locally.
- No parallel tools: serialize tool execution.
- No native streaming: emit coarse progress events from the server instead.
- No caching: tighten context trimming and reduce repeated prefix size.
- No reasoning controls: remove those flags from normalized requests instead of leaking provider errors upstream.

## Anti-Patterns

- branching on provider name in controllers or job handlers
- letting UI code know one provider streams deltas while another streams blocks
- assuming all providers support the same tool schema rules
- passing raw SDK option objects through the whole app
