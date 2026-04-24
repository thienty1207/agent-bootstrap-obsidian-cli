# Unknowns Gate

Use this rule whenever the task depends on a fact that is not directly visible in repo files, `agent-bootstrap context --compact`, or a cited external source.

## Rule
- Do not convert assumptions into facts.
- Record unresolved assumptions in `Open Questions.md`.
- Write to `Facts.md` only when the fact has a source and confidence level.
- Prefer one short question or a narrow verification command over broad context expansion.

## Output
- Known: cite the file, command output, or source.
- Unknown: add or preserve an `Open Questions.md` item.
- Blocked: state the missing evidence and the smallest next check.
