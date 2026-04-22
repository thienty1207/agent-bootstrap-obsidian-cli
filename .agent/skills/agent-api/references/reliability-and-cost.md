# Reliability And Cost

Model integrations fail in slow, expensive, and provider-specific ways. Make those concerns first-class.

## Timeouts

Use separate budgets for:

- network connect timeout
- provider response timeout
- streaming idle timeout
- tool execution timeout
- end-to-end request timeout

One giant timeout hides the real failure mode.

## Retries

Retry only idempotent operations and only for transient failures.

- 429 and transient 5xx: usually retryable
- validation errors: not retryable
- auth errors: not retryable
- caller cancellation: never retry

Always use bounded exponential backoff with jitter.

## Rate Limits

Track rate limits at the integration layer, not scattered across handlers.

- concurrency per provider
- requests per model or route
- tenant-aware throttling when applicable
- fallback routing only if policy allows it

## Usage And Cost Signals

Collect normalized telemetry:

- provider
- model
- input units
- output units
- cached units if relevant
- latency
- retry count
- tool count
- estimated cost

## Context Hygiene

- trim repeated boilerplate
- cache only where the provider and product justify it
- separate stable prefix from per-turn volatile content
- log why context was compacted or truncated

## Failure Mapping

Map provider errors into internal categories:

- auth
- throttled
- invalid-request
- unsupported-feature
- transient-provider
- timeout
- cancelled
- tool-execution

The rest of the app should depend on these categories, not raw HTTP codes alone.
