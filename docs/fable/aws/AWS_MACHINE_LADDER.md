# AWS Machine Ladder

Updated: 2026-07-03

This ladder defines where work runs before AWS is justified.

| Level | Machine | Allowed work | Why it exists | Exit trigger |
| --- | --- | --- | --- | --- |
| 0 | local repo | docs, tests, fixtures, validators | cheapest proof loop | local bottleneck is measured |
| 1 | local scripts | replay, schema validation, mock plans | repeatable local evidence | data volume or runtime exceeds laptop budget |
| 2 | CI runner | no-cost checks on pull request | public reproducibility | CI minutes or secrets become limiting |
| 3 | disposable local container | isolated service simulation | more realistic integration | container test proves service need |
| 4 | read-only AWS discovery | account inventory only | observe current account state | owner approves profile/region |
| 5 | reversible AWS preview | isolated non-production resource | prove AWS fit | owner approves cost and rollback |
| 6 | paid or production-sensitive AWS | blocked by default | only for proven need | second owner confirmation |

## Current Position

GSE/FABLE is at levels 0-2 for this AWS learning bridge.

## Machine Metrics

- local runtime.
- fixture size.
- replay reproducibility.
- CI pass rate.
- estimated AWS monthly cost.
- rollback steps.
- data-rights certainty.

## Rule

Do not climb the ladder because AWS is available. Climb only when a measured local constraint and owner approval justify it.
