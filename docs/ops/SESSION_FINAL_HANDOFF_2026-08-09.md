# SESSION_FINAL_HANDOFF — 2026-08-09 (world-class completion)

## Where to land

- **Branch:** `gse/world-class-completion-2026-08-09`
- **PR:** [#410](https://github.com/Beexly/Sports/pull/410)
- **Contract:** `docs/ops/MASTER_PROMPT_V2.md` (full) · `MASTER_PROMPT_V2_COMPRESSED.md` · V3 compressed still valid
- **Prior merged into branch:** ranking surfaces multi-domain (#409 base)
- **This session:** RPCP + conformal offline + Kalshi expand + **product boards** + **pause apply OFF** + V2 matrix

## Contract laws (hard)

Gates OFF · Maps OFF · Free-path ABSENT-only · No invent · No PROVEN while RED · Polymarket hold · Kalshi fuel only · Extend modules only · `RANKING_PAUSE_APPLY` default OFF

## Probe after deploy

`GET /api/ops/public-surface-truth` (Bearer CRON_SECRET for detail):

- `rankingPower.present` / `primaryBottleneck` / `operatorHint` / `residualOperatorHint`
- `rpcpConformalBridge.computeEnabled` should be **false** in prod
- `productBoards` — STATKING dark; HELM/PICKPILOT design_preview; rankingP required on GSE surfaces
- `rankingPauseApply.applyEnabled` should be **false** unless founder set `RANKING_PAUSE_APPLY=true`
- `law.liveBoardDefault` stays off; founderNextSteps only redeploy/env/Stripe class

## Files of record

| Path | Role |
|------|------|
| `apps/web/lib/calibration/ranking-power-control.ts` | RPCP |
| `apps/web/lib/calibration/rpcp-conformal-bridge.ts` | Offline bridge |
| `apps/web/lib/calibration/ranking-pause-apply.ts` | Pause apply default OFF |
| `apps/web/lib/product/board-surfaces.ts` | STATKING/HELM/PICKPILOT/CLUBHOUSE honesty |
| `apps/web/lib/ops/proven-path-seed.ts` | Surface seed |
| `apps/web/lib/ranking/sort-key.ts` | rankingP sort |
| `apps/web/lib/public/dark-reason.ts` | Quiet + rights + design-preview honesty |
| `packages/ingestion-pipeline/src/kalshi-team-abbr.ts` | Independent maps |
| `docs/ops/MASTER_PROMPT_V2.md` | Full agent contract |
| `docs/ops/WORKING_LOG_2026-08-09_WORLD_CLASS.md` | Evidence log |
| `docs/ops/PRODUCT_BOARD_SURFACES.md` | Product brand map |
| `docs/ops/DASE_PREDICTIONIO_MAP.md` | Multi-avenue atlas |
| `docs/ops/EVIDENCE_PACK_RANKING_TEMPLATE.md` | Governance inventory |

## Live metrics reminder

RES ~0.002 / Brier ~0.275 / ECE ~0.112 → **RED**. Do not open performance publish.
