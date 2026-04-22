# Structured Output

Prefer schema-first design. Treat model output as untrusted until validated locally.

## Baseline Strategy

1. Define the schema in application code.
2. Ask the model for output that fits that schema.
3. Parse and validate locally.
4. Only then pass the result to business logic.

## Important Rules

- Native provider schema mode is a transport optimization, not a trust boundary.
- Keep validation local even if the provider claims strict JSON output.
- Separate parsing failures from business-rule failures.
- Limit repair loops; one repair attempt is usually enough.

## Recommended Result States

- `valid`
- `invalid-retryable`
- `invalid-terminal`

This keeps callers from guessing what happened.

## Good Internal Shape

```text
StructuredOutputResult<T> =
  valid(data: T, raw: provider_payload)
  invalid(errors: ValidationError[], raw: provider_payload)
```

## Anti-Patterns

- deserializing straight into domain objects with no validation layer
- storing raw provider JSON as if it were already trusted state
- mixing schema repair logic into controllers
