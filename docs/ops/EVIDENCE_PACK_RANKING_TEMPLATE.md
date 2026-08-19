# Evidence pack template — ranking / calibration (inventory only)

**Not** a declaration of conformity, CE mark, or PROVEN claim.  
Assembler: `apps/web/lib/governance/evidence-pack.ts` (disclaimer load-bearing).

## Suggested items for ranking RES program

| id | control | artifactPath | nist | euTheme |
|----|---------|--------------|------|---------|
| rpcp-module | Ranking Power Control Plane | `apps/web/lib/calibration/ranking-power-control.ts` | AU-6 | transparency |
| polarity-rows | Independent load honesty | `apps/web/lib/calibration/proven-path-rows.ts` | SI-10 | accuracy |
| bakeoff-kinds | Score kinds never edge-as-p | `apps/web/lib/calibration/proven-path-engine.ts` | SI-10 | accuracy |
| conformal-bridge | Coverage ≠ eligibility | `apps/web/lib/calibration/rpcp-conformal-bridge.ts` | AU-2 | transparency |
| maps-off | Adjustments default off | `docs/ops/CALIBRATION_MAP_APPLY_MATRIX.md` | CM-3 | human oversight |
| gates-off | Public picks/stats dark | `docs/ops/GATE_OPENING_RUNBOOK.md` | AC-3 | human oversight |
| free-path | ABSENT-only odds | `docs/ops/ODDS_FREE_DUAL_PATH_HONESTY.md` | SI-12 | accuracy |
| kalshi-maps | Fair-value fuel maps | `packages/ingestion-pipeline/src/kalshi-team-abbr.ts` | SI-10 | accuracy |
| b2b-signals | rankingP on signals API | `apps/web/app/api/v1/signals/route.ts` | AU-2 | transparency |
| dark-reason | Quiet ≠ outage honesty | `apps/web/lib/public/dark-reason.ts` | AU-2 | transparency |
| floors | Brier/ECE/RES floors | `docs/ops/MURPHY_RES_AND_BRIER_MIN.md` | SI-10 | accuracy |
| dase-map | DASE→GSE module map | `docs/ops/DASE_PREDICTIONIO_MAP.md` | PL-2 | accountability |

## Export

```bash
# From repo root — inventory only
npx tsx scripts/governance/export-evidence-pack.ts
```

Fill real artifact digests at export time; do not invent settled metrics or ROI.
