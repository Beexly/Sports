# Session 2 extract — full leverage map (integrity)

Structured extract of research waves in Session 2. Every row is either **SHIPPED**,
**OPERATOR**, or **HARD NON-GOAL**. No soft deferrals.

## Extract integrity

| Field | Rule |
|-------|------|
| Finding | One concrete claim |
| Source wave | Research prompt that produced it |
| Code / doc path | Where it lives now |
| Status | SHIPPED · OPERATOR · HARD NON-GOAL |
| Gate | What blocks live product use |

---

## Wave A — GEPA / DSPy skill optimization

| Finding | Source | Path | Status | Gate |
|---------|--------|------|--------|------|
| Metric returns `Prediction(score, feedback)` | GEPA metric contract | `scripts/dspy-gse/gse_metric.mjs` → `gse_metric` | SHIPPED | offline only |
| Reflection LM temperature **1.0** | GEPA reflection ×2 | `gepa_config.json` `reflection_lm.temperature` | SHIPPED | assert in `dspy:gse` |
| Task LM temperature **0** | GEPA stability | `gepa_config.json` `task_lm.temperature` | SHIPPED | assert in `dspy:gse` |
| Default `auto="light"` | Cost / budget | `gepa_config.json` `auto` | SHIPPED | MIPROv2 not default |
| MIPROv2 not default | Second optimizer pass | `gepa_config.json` `not_default.MIPROv2` | SHIPPED (doc) | only after light plateaus |
| Fixtures → Examples train/val | Promote goldens | `promote.mjs` → `data/examples.json` | SHIPPED | — |
| Named metric `gse_metric` | DSPy GSE opt | `gse_metric.mjs` | SHIPPED | — |
| Calibration domain goldens | Session 2 deepen | `goldens.json` cal-* | SHIPPED | — |
| Skill pack for GEPA | agent DX | `docs/agent-skills/dspy-gepa/SKILL.md` | SHIPPED | — |

## Wave B — Next 50 repos (rank-adjusted)

| Finding | Source | Path | Status | Gate |
|---------|--------|------|--------|------|
| Ranked next-50 adoption table | Wave 2 research | `docs/ops/ORBIT_NEXT_50.md` | SHIPPED | — |
| promptfoo already wired | #1 adopt | `eval/promptfoo` · `eval:prompts` | SHIPPED | — |
| agentskills SKILL.md standard | #6 | `docs/agent-skills/*` | SHIPPED | — |
| calibre CIR pattern | #7 | `centeredIsotonicCalibration` | SHIPPED | R&D gate |
| dspy GEPA pattern | #41 | `scripts/dspy-gse` | SHIPPED | offline |
| Multica / GPL agent OS | #ignore | `DEFER_90_DAYS.md` | HARD NON-GOAL | counsel+founder |
| GPU foundation train | cost | `DEFER_90_DAYS.md` | HARD NON-GOAL | — |

## Wave C — Calibration methodology

| Finding | Source | Path | Status | Gate |
|---------|--------|------|--------|------|
| CIR preserves ranking vs PAVA plateaus | CenteredIsotonic | `centeredIsotonicCalibration` | SHIPPED | `CALIBRATION_ADJUSTMENTS_ENABLED` |
| Distinct-count diagnostic | CIR benefit | `countDistinctPredictions` | SHIPPED | R&D |
| Time-ordered hold-out only | deepen calibration | `timeHoldoutSplit` | SHIPPED | never random split |
| Calibration paradox (+EV slice) | value-bet / mperi | `selectedSliceEce` | SHIPPED | report both ECE |
| Shin de-vig before fair p | Shin wave | `shinDevig` | SHIPPED | offline + edge path |
| Offline pipeline no DB | implement | `npm run calibration:offline` | SHIPPED | synthetic fixture |
| Do not wire live without gate | law | live scoring | HARD NON-GOAL until gate | founder MODEL_VERSION |

## Wave D — Kelly sizing with CIR

| Finding | Source | Path | Status | Gate |
|---------|--------|------|--------|------|
| Fractional κ ≈ 0.25–0.30 | Kelly deepen | `KELLY_FRACTION=0.25` · edge-lab λ=0.3 | SHIPPED | never κ=1 |
| Full Kelly forbidden | ruin path | `DEFER_90_DAYS.md` | HARD NON-GOAL | — |
| James–Stein edge haircut | portfolio | `jamesSteinShrink` | SHIPPED | export barrel |
| Ledoit–Wolf corr haircut (no Σ⁻¹) | portfolio | `ledoitWolfShrinkCovariance` | SHIPPED | export barrel |
| CLV deflator self-disarm (~50) | portfolio | `clvDeflator` | SHIPPED | export barrel |
| Portfolio composition | implement portfolio Kelly | `portfolioKellyStakes` | SHIPPED | **barrel export Session 2** |
| CIR → Kelly bridge | CIR+Kelly research | `sizeAfterCalibration` | SHIPPED | R&D |
| Never report sizing as CLV | house style | module headers + docs | SHIPPED | copy scan |

## Wave E — Agent DX / money path (process capital carry-in)

| Finding | Source | Path | Status | Gate |
|---------|--------|------|--------|------|
| Free path only when key ABSENT | free-path law | settle-picks cron | SHIPPED | **OPERATOR blank key** |
| Stripe expired + idempotency | money in | webhook route | SHIPPED | **OPERATOR dashboard** |
| Outbox lease + claimVersion | do not rewrite | existing | SHIPPED | never rebuild |
| Skills pack | agent DX | `docs/agent-skills/*` | SHIPPED | — |
| agent-eval $0 fixtures | eval | `npm run agent:eval` | SHIPPED | expand per wave |
| MODEL_PRIMARY / MODEL_CHEAP | inference cost | `model-router.ts` | SHIPPED | env |
| export settled picks | own labels | `export:settled-picks` | SHIPPED | needs DATABASE_URL |
| Polymarket feature work | compliance | polymarket-hold skill | HARD NON-GOAL | counsel |
| Credits claims | money out | `CREDITS.md` | OPERATOR | portals |

## Commands (integrity smoke)

```bash
npm run dspy:gse              # Examples + gse_metric + gepa_config
npm run calibration:offline   # hold-out + CIR + paradox + CLV gate
npm run agent:eval            # fixture predicates
npm run orbit:map             # dspy + calibration offline + agent-eval
```

## Package surfaces (import)

```ts
import {
  centeredIsotonicCalibration,
  timeHoldoutSplit,
  selectedSliceEce,
  sizeAfterCalibration,
  portfolioKellyStakes,
  clvDeflator,
  shinDevig,
} from "@sports/prediction-engine";
```
