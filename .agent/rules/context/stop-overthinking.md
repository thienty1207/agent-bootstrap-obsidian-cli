# Stop Overthinking

Use this rule when context expansion starts to outgrow the actual task.

## Rule
- Maximum 3 context expansion steps before acting or asking for the missing fact.
- If the task touches one file, read that file, its nearest test, and one caller or callee before editing.
- Prefer `agent-bootstrap context --why` over manually scanning folders.
- Use `agent-bootstrap context --full` only when daily history or full session state changes the answer.

## Stop Signals
- You are rereading the same docs without finding new evidence.
- You are opening broad folders instead of routed indexes.
- The remaining uncertainty belongs in `Open Questions.md`, not in more speculation.
