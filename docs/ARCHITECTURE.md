# AgentOps Eval Studio Architecture

AgentOps Eval Studio demonstrates an agent engineering loop with explicit state, tool contracts, code-level guardrails, output validation, and replayable traces.

## Agent Loop

```text
observe goal
  -> classify policy risk
  -> retrieve memory
  -> inspect signals
  -> compose dry-run plan
  -> review grounding and approvals
  -> draft human handoff
  -> persist trace
```

## Core Modules

| Path | Responsibility |
| --- | --- |
| `server/agent/loop.js` | Agent state machine and trace lifecycle |
| `server/agent/policies.js` | Guardrails and tool-output validators |
| `server/agent/tools.js` | Narrow tool contracts and dry-run implementations |
| `server/agent/memory.js` | Local policy memory retrieval |
| `eval/scenarios.test.js` | Scenario evaluation suite |
| `src/App.jsx` | Trace inspection and run console |

## Safety Model

- Blocked requests stop before tool execution.
- External writes are represented as dry-run handoff objects.
- Every tool output is validated before the loop continues.
- Human approval is required when policy or signal risk is non-low.
- Trace JSON is generated locally and ignored by Git.

## Evaluation Model

The included scenario suite checks:

- Safe advisory goals complete with dry-run controls.
- Destructive requests are blocked before tools run.
- Migration and deployment plans require review.
- No scenario performs external writes.
