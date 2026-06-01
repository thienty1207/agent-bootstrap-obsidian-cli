# Trace Spec

Product Harness traces are short execution breadcrumbs written after meaningful work.
Trace Quality Gate checks whether the trace is strong enough for the task risk.

## Quality Tiers

- incomplete: missing summary or outcome.
- minimal: includes task summary and outcome.
- standard: minimal plus current story and proof summary.
- detailed: standard plus current plan, files changed/read, and verification evidence.

## Risk Rules

- Low-risk work requires minimal trace quality.
- Medium-risk work requires standard trace quality.
- High-risk work requires detailed trace quality.
- Auth, permission, payment, security, migration, tenant/RLS, upload, external provider, and data-loss tasks require detailed trace quality.

## Completion Rule

Trace scoring is not a replacement for tests. It is a completion-claim gate: if a medium/high-risk trace fails, the agent must improve the trace or avoid claiming the work is done.
