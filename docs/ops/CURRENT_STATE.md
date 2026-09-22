# CURRENT_STATE

Updated: **2026-09-21** (pointer). Measured live calibration board:
[CALIBRATION_STATUS.md](CALIBRATION_STATUS.md). Ops SoT: [CANONICAL.md](CANONICAL.md).
Work queue: [AGENT_LEDGER.md](AGENT_LEDGER.md) · plan [LAST_PLAN_2026-09-15.md](LAST_PLAN_2026-09-15.md).

**MODEL_VERSION:** v5.2.7 (frozen). Do not claim PROVEN. Do not flip gates.

## Law (do not violate)

LIVE_BOARD=off · PERFORMANCE_STATS_ENABLED=off · PUBLIC_PICKS per live truth surface ·
FORCE_NO_BET_IF_STALE=true required before treating public surface as safe ·
oddsApiRequired=false on free path · refuse-default · CPA blocked · no auto-publish · no auto-bet ·
CALIBRATION_ADJUSTMENTS_ENABLED off · CALIBRATION_AUTO_PUBLISH false ·
MODEL_VERSION **v5.2.7** · ranking polarity: never edge-as-p · free-path ABSENT-only for books

## Snapshot (remesure on the truth surface — do not invent)

| Metric | Last written here | Notes |
|---|---|---|
| Eligibility | see truth surface | floors in publish checklist |
| Brier / ECE live sample | market 0.234 / 0.017 (n=1270 paired) | CALIBRATION_STATUS.md §1.2 |
| Shrink w=0.10 | matches market Brier/ECE | display-p candidate; L11 still required |
| CLV flags | clvPositive never true | grader defect — see calibration status §1.3 |
| Settlement | HEALTHY (historical) | remesure |
| Money path | ready (historical) | remesure |

Previous detailed 2026-08-10 snapshot lives in git history of this file.
