# AgentOps Eval Studio

[![CI](https://github.com/rrg1225/agentops-eval-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/rrg1225/agentops-eval-studio/actions/workflows/ci.yml)
![Agent](https://img.shields.io/badge/AI-Agent%20Engineering-1D3557)
![Evaluation](https://img.shields.io/badge/Evals-Trace%20Replay-2A9D8F)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![License](https://img.shields.io/badge/License-MIT-green)

AgentOps Eval Studio is an AI agent engineering workspace for deterministic tool orchestration, code-level guardrails, trace inspection, and scenario evaluation. It is built to show the parts that separate a real agent system from a chat demo: permissions, policy checks, memory retrieval, output validation, audit traces, and regression tests.

## Highlights

- Deterministic observe -> decide -> act -> validate -> handoff loop.
- Tool registry with `read`, `review`, and `write-dry-run` permission classes.
- Policy classifier that blocks destructive or approval-bypass instructions before tool use.
- Local memory retrieval for policy/runbook grounding.
- Signal inspection and plan review before handoff generation.
- Trace persistence under `traces/` for local replay and debugging.
- React UI for running goals, viewing quality gates, and inspecting trace events.
- API tests plus scenario eval suite in CI.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The API defaults to `http://localhost:4420`.

## Scripts

```bash
npm test      # API tests plus scenario evals
npm run eval  # deterministic scenario suite
npm run build # production React bundle
npm run start # serve API and built frontend
```

## API

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Service health and run mode |
| `GET` | `/api/tools` | Tool catalog and permission classes |
| `GET` | `/api/metrics/runtime` | Runtime request counters |
| `GET` | `/api/metrics/scorecard` | Operational readiness score and checks |
| `POST` | `/api/runs` | Execute a dry-run agent run and persist trace |

## Quality Gates

- `npm test` verifies API contracts, blocked requests, dry-run quality, and eval scenarios.
- `npm run eval` replays realistic safe, blocked, and review-required goals.
- GitHub Actions runs tests and build on pull requests and `main`.
- Architecture notes live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## License

MIT

## Enterprise Readiness

This repository now includes contribution guidelines, a security policy, operational runbook notes, PR review gates, and automated readiness checks. See [docs/ENTERPRISE_READINESS.md](docs/ENTERPRISE_READINESS.md) and [docs/OPERATIONS.md](docs/OPERATIONS.md).
