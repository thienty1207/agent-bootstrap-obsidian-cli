# Rust Agent API Notes

## Good Fits

- traits for provider contracts
- enums for normalized events and error kinds
- typed request and response structs
- async streams for live output

## Suggested Shapes

```rust
pub trait AgentProvider {
    fn respond(&self, request: AgentRequest) -> impl Future<Output = Result<AgentResponse, AgentError>>;
    fn stream(&self, request: AgentRequest) -> impl Stream<Item = Result<AgentEvent, AgentError>>;
}
```

If the project needs object safety or boxed trait objects, keep that concern local to the integration layer.

## Practical Advice

- use explicit enums for finish reasons and error categories
- isolate provider serialization and deserialization behind adapter modules
- validate structured output before constructing domain types
- keep provider capability flags in typed structs, not stringly-typed maps

## Streaming

- normalize provider chunks into one `AgentEvent` enum
- keep cancellation tied to task or request lifetime
- avoid leaking transport-specific frame types outside the adapter

## Common Mistakes

- making the rest of the app generic over provider SDK response types
- packing every optional provider feature into the top-level app contract
- trusting provider-native JSON without `serde`-level validation
