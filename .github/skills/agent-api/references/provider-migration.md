# Provider Migration

Migrate providers by freezing the app contract first, not by rewriting the app around the new SDK.

## Migration Path

1. Freeze the current internal contract.
2. Write conformance tests against that contract.
3. Add the new provider adapter behind the same interface.
4. Record capability gaps and explicit degrade rules.
5. Run shadow traffic or replay tests if possible.
6. Cut over by configuration, not by touching business logic.

## Conformance Tests

A useful provider-agnostic suite checks:

- text response path
- streaming path
- tool-calling path
- structured-output validation path
- timeout and retry behavior
- error mapping
- usage accounting

## Capability Gap Table

Capture differences explicitly:

- feature missing entirely
- feature available with weaker guarantees
- feature available but with different limits
- feature available only through an escape hatch

## Cutover Rule

Do not declare migration complete until:

- app-level tests still pass
- normalized telemetry is intact
- operator runbooks still make sense
- feature gaps are either accepted or hidden behind degrade logic
