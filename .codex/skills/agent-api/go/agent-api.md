# Go Agent API Notes

## Good Fits

- small interfaces for provider contracts
- explicit structs for normalized data
- `context.Context` for cancellation and deadlines
- channels or iterator-like helpers for streams

## Suggested Shapes

```go
type AgentProvider interface {
    Respond(ctx context.Context, req AgentRequest) (AgentResponse, error)
    Stream(ctx context.Context, req AgentRequest) (<-chan AgentEvent, <-chan error)
}
```

If your codebase prefers callbacks over channels, keep that choice inside the provider package and still expose one normalized stream model.

## Practical Advice

- thread `context.Context` through every provider call
- normalize provider errors near the transport boundary
- wrap errors with internal categories, not only provider text
- keep structs stable even if one provider has extra fields
- avoid giant adapter interfaces; keep them focused

## Streaming

- close channels deterministically
- propagate cancellation from `ctx.Done()`
- emit a final usage event if you have late usage metadata

## Common Mistakes

- letting HTTP handlers import provider-specific clients
- encoding provider names into business rules instead of capability flags
- mixing retry loops into every call site
