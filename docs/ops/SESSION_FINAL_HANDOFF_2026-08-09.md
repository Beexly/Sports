# SESSION_FINAL_HANDOFF — 2026-08-09 (world-class completion)

## Where to land

- **Branch:** `gse/world-class-completion-2026-08-09`
- **Prior merged into branch:** ranking surfaces multi-domain (#409 base)
- **New this session:** RPCP + conformal bridge offline + Kalshi CBB/CFB expand + DASE/evidence docs

## Contract laws (hard)

Gates OFF · Maps OFF · Free-path ABSENT-only · No invent · No PROVEN while RED · Polymarket hold · Kalshi fuel only · Extend modules only

## Probe after deploy

`GET /api/ops/public-surface-truth` (Bearer CRON_SECRET for detail):

- `rankingPower.present` / `primaryBottleneck` / `operatorHint` / `residualOperatorHint`
- `rpcpConformalBridge.computeEnabled` should be **false** in prod
- `law.liveBoardDefault` stays off; founderNextSteps only redeploy/env/Stripe class

## Files of record

| Path | Role |
|------|------|
| `apps/web/lib/calibration/ranking-power-control.ts` | RPCP |
| `apps/web/lib/calibration/rpcp-conformal-bridge.ts` | Offline bridge |
| `apps/web/lib/ops/proven-path-seed.ts` | Surface seed |
| `apps/web/lib/ranking/sort-key.ts` | rankingP sort |
| `apps/web/lib/public/dark-reason.ts` | Quiet honesty |
| `packages/ingestion-pipeline/src/kalshi-team-abbr.ts` | Independent maps |
| `docs/ops/WORKING_LOG_2026-08-09_WORLD_CLASS.md` | Evidence log |
| `docs/ops/DASE_PREDICTIONIO_MAP.md` | Multi-avenue atlas |
| `docs/ops/EVIDENCE_PACK_RANKING_TEMPLATE.md` | Governance inventory |

## Live metrics reminder

RES ~0.002 / Brier ~0.275 / ECE ~0.112 → **RED**. Do not open performance publish.
