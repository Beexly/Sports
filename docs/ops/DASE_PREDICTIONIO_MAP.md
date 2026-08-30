# PredictionIO DASE map → GSE modules (offline atlas)

**Status:** documentation only — no dual stack, no PredictionIO runtime, no CrewAI/Ollama.  
**Date:** 2026-08-09  
**Law:** maps OFF · gates OFF · free-path ABSENT-only · no invent odds/ROI

## DASE stages → GSE owners

| DASE stage | PredictionIO idea | GSE module (extend, don't fork) | Product surface |
|------------|-------------------|----------------------------------|-----------------|
| **D**ata | Event store + batch import | `packages/data-ingestion`, free-spine adapters, TeamGameLog, Kalshi series | Internal harvest only |
| **A**lgorithm | Train / evaluate models | `packages/prediction-engine` (Elo, Poisson, Dixon–Coles, FPI, ranking-prob) | Offline bake-off + factorBreakdown |
| **S**erving | Query API for scores | `apps/web` board/picks + B2B `/api/v1/signals` | Signal board; gates dark until GREEN |
| **E**valuation | Metrics + A/B | RPCP + proven-path + calibration-metrics cron | Founder ops truth only |

## What we steal (patterns only)

1. **Separation of train vs serve** — GSE already keeps map fit offline; RPCP never auto-applies maps while RES < 0.02.
2. **Evaluation is a first-class engine** — `ranking-power-control.ts` + holdout significance + Spearman are the E stage.
3. **Query API honesty** — B2B signals expose `rankingP` as model signal, never verified ROI while RED.
4. **Batch event → feature join** — process-sport builds independents at slate time; no invent.

## What we refuse

| Idea | Why refuse |
|------|------------|
| Standalone PredictionIO / Spark dual stack | Monorepo law: extend existing modules |
| Auto-deploy winning algorithm to public board | Gates + AUTO_PUBLISH founder-only |
| Serving edge-as-p | Polarity law: edge ≠ P(side) |
| Evaluation via conformal coverage as PROVEN | Coverage ≠ eligibility; RES is the ranking grade |

## MLlib-style metrics (offline)

| Metric | GSE home | Notes |
|--------|----------|-------|
| Brier | `brierDecomposition` | Floor ≤ 0.22 |
| ECE | `expectedCalibrationError` | Floor ≤ 0.05 |
| Murphy RES/REL/UNC | same decomp | Live RES ~0.002 → RED correct |
| Ranking correlation | `spearman-separation` | RPCP score bake-off |
| Group significance | `holdout-significance` | Pause list law |

## Hamilton / Burr patterns (orchestration only)

| Pattern | GSE analogue | Flag |
|---------|--------------|------|
| Declarative DAG of transforms | process-sport → independents → rankingP → draft | Always on (code path) |
| Stateful workflow resume | autonomy operating-kernel + free-spine durable | No external Burr runtime |
| Feature lineage | factorBreakdown + provenance modules | Evidence packs |

## Oddpool / PM ecosystem

See `docs/research/prediction-market-ecosystem-triage-2026-08-09.md` — buckets A/B/C/D.  
Polymarket remains **product hold**; Kalshi = fair-value ranking fuel only.

## Operator next

1. Probe `rankingPower` on `/api/ops/public-surface-truth` after redeploy.
2. If `primaryBottleneck = missing_independent` → more priced trueProb (Kalshi maps + series soft-fail).
3. Never open maps or PROVEN from this doc.
