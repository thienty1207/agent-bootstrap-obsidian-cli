# TypeScript Agent API Notes

## Good Fits

- interfaces for provider contracts
- discriminated unions for stream events and errors
- `AsyncIterable<AgentEvent>` for streaming
- `AbortSignal` for cancellation

## Suggested Shapes

```ts
export interface AgentProvider {
  respond(request: AgentRequest): Promise<AgentResponse>;
  stream(request: AgentRequest, signal?: AbortSignal): AsyncIterable<AgentEvent>;
}
```

Use narrow internal types for:

- `AgentRequest`
- `AgentResponse`
- `AgentEvent`
- `ToolCall`
- `UsageReport`

## Practical Advice

- keep provider translation in adapter classes
- model events as discriminated unions instead of loose objects
- normalize finish reasons before returning them
- validate structured output before casting it to app types
- isolate fetch or SDK client construction from business services

## Streaming

- prefer `AsyncIterable` over leaking provider event emitters
- map provider chunk formats into one event union
- wire cancellation through `AbortController`

## Common Mistakes

- exposing raw SSE chunk shapes to the UI
- spreading provider option bags through multiple layers
- trusting "JSON mode" without local validation
