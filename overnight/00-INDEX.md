# Overnight Operator Index

| File | Contents |
|---|---|
| STATE.md | Current run state and actions taken |
| COORDINATION.md | Active stream claims and branch activity |
| findings/findings.jsonl | All findings in JSONL format |
| metrics/metrics.jsonl | Per-run metrics |
| 06-summary.md | Morning synthesis report |

## Run History

| Run | Date | Status | Leverage | Tests Added | Files Modified |
|---|---|---|---|---|---|
| 1 | 2026-05-25 | completed | 162 | 27 | 4 |

## Cumulative Changes
- DEV_FAKE_ADMIN production guard (auth.ts, middleware.ts, entitlements.ts)
- 27 new passing tests across web + prediction-engine packages
- 0 gate invariants loosened
- 0 migrations or .env files touched
