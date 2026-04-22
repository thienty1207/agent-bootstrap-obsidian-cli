# Tool Calling

Tool calling should feel the same to the application no matter which provider the model sits behind.

## Internal Tool Schema

At minimum, keep:

- `name`
- `description`
- `input_schema`
- `strict`
- `side_effect_level`

The app should register tools once in this internal schema, then let adapters translate it.

## Execution Boundary

Keep a clean split:

- The adapter translates tool definitions and parses tool-call requests.
- The orchestration layer decides whether tools may run.
- The tool runner executes tools and returns normalized results.

## Required Safety Rules

- Validate tool arguments locally before execution.
- Require approval gates for destructive tools.
- Log tool name, latency, and outcome.
- Cap loop depth so the model cannot call tools forever.
- Preserve the mapping between tool call ID and tool result.

## Parallelism

Model providers vary here. Treat parallel calls as a capability flag.

- If supported, the orchestration layer may fan out safe read-only tools.
- If unsupported, serialize tool execution without changing the app contract.

## Tool Results

Use one normalized result shape:

- `ok`
- `content`
- `error`
- `attachments`
- `usage`

Never make the rest of the app parse provider-native tool result wire formats.
