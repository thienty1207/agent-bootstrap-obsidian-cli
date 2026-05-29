# Context Rules

AI agents should load the smallest reliable context slice first.

## Startup Order

1. `agent-bootstrap context --compact`
2. `agent-bootstrap plan status` when implementation state matters
3. `agent-bootstrap harness status` and `agent-bootstrap harness check` for medium/high-risk work
4. `agent-bootstrap recall "<query>"` only when compact context is insufficient

## Memory Firewall

- Prefer current project memory.
- Use approved global memory only when it matches the task.
- Treat cross-project memory as reference, not truth, unless the query explicitly matches it.
- Do not load full story, trace, session, or daily history unless full context is requested.
