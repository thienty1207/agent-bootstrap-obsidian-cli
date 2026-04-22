# Python Agent API Notes

## Good Fits

- `Protocol` or abstract base classes for provider interfaces
- `dataclass` or validated DTOs for normalized requests and responses
- `AsyncIterator` for streaming
- `asyncio.timeout()` or equivalent around provider calls

## Suggested Shapes

```python
class AgentProvider(Protocol):
    async def respond(self, request: AgentRequest) -> AgentResponse: ...
    async def stream(self, request: AgentRequest) -> AsyncIterator[AgentEvent]: ...
```

Keep provider SDK objects inside the adapter implementation, not in the protocol.

## Practical Advice

- prefer async adapters if the app already has async boundaries
- keep request translation in one method
- keep response normalization in one method
- convert provider exceptions into internal error categories immediately
- validate structured outputs before returning typed data

## Streaming

- surface one `AsyncIterator[AgentEvent]`
- stop iteration cleanly on cancellation
- emit usage late if the provider sends it late

## Common Mistakes

- returning raw SDK response objects to service code
- letting provider-specific retry logic leak into callers
- mixing schema validation with controller code
