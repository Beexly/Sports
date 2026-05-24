# Overnight Operator — Output Index

| File | Description |
|---|---|
| `STATE.md` | Current run state, mode, active streams |
| `COORDINATION.md` | Stream claims and file locks |
| `BLOCKED_NEED_G.md` | Human decision gates (Next.js upgrade) |
| `findings/findings.jsonl` | All findings with evidence and disprove gates |
| `metrics/metrics.jsonl` | Per-run performance metrics |
| `dashboard.html` | Visual summary — open in browser |
| `06-summary.md` | Morning synthesis report |

## Run History

| Run | Date | Status | Key Actions |
|---|---|---|---|
| 1 | 2026-05-24 | completed | npm install, prisma generate, CI permissions fix, security audit workflow, prepare script |

## Current Baseline

- Tests: **1578 / 1578 passing**
- TypeScript: **0 errors**
- ESLint: **0 warnings**
- Guardrails: **all green**
- Security: **14 HIGH CVEs in next@14 — blocked on upgrade decision**
