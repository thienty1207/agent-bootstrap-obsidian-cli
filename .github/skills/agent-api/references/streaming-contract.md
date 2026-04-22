# Streaming Contract

Normalize streaming early. Do not let provider event names escape into the rest of the system.

## Recommended Internal Events

- `response-start`
- `content-delta`
- `content-complete`
- `tool-call-start`
- `tool-call-delta`
- `tool-call-complete`
- `usage`
- `response-complete`
- `error`

## Rules

- Every stream should have a stable response ID.
- Every event should be attributable to one response ID and one provider.
- Content deltas should be append-only.
- Tool-call deltas should build toward a validated final payload.
- Usage can arrive late; your contract should allow that.
- Cancellation must flow from caller to provider transport.

## What To Hide

Hide these details inside the adapter:

- SSE field names
- websocket frame shapes
- chunk vs block vs message naming
- provider-specific finish reasons
- provider-native event ordering oddities

## Backpressure

If the consumer is slower than the provider:

- buffer with a hard ceiling
- cancel when the consumer disconnects
- avoid unbounded in-memory accumulation
- persist only the normalized events you actually need

## UI Contract

If a frontend or client listens to the stream, emit one normalized event schema from your backend. Do not make every client understand every provider.
