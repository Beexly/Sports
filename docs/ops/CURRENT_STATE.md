# CURRENT_STATE

Updated: 2026-08-09 (world-class completion branch)

**MAIN HEAD (repo):** `0e74160` — Kalshi CFB/MLS/La Liga maps (#408)  
**Active ship branch:** `gse/world-class-completion-2026-08-09` (RPCP + ranking surfaces + multi-domain)  
**SoT:** Production `/api/health` + `/api/ops/public-surface-truth` + this file

## Law (do not violate)

LIVE_BOARD=off · PUBLIC_PICKS_ENABLED=off · PERFORMANCE_STATS_ENABLED=off · PUBLISH_LEDGER=off  
oddsApiRequired=false on free path · refuse-default · CPA blocked · no auto-publish · no auto-bet  
CALIBRATION_ADJUSTMENTS_ENABLED off · CALIBRATION_AUTO_PUBLISH false  
MODEL_VERSION v5.2.2 · ranking polarity: never edge-as-p

## Live class (do not invent better numbers)

Brier ~0.275 · ECE ~0.112 · Murphy RES ~0.002 → eligibility **RED** (correct).  
Maps fix REL not RES. Path: independents → rankingP → selective/pause → re-measure.

## This session ship

| Item | Module |
|------|--------|
| Ranking Power Control Plane | `lib/calibration/ranking-power-control.ts` |
| Conformal bridge offline | `lib/calibration/rpcp-conformal-bridge.ts` |
| rankingP surfaces + dark-reason + B2B | sort-key / dark-reason / v1/signals |
| Kalshi CBB + CFB G5 expand | `kalshi-team-abbr.ts` |
| DASE / evidence / WORKING_LOG | `docs/ops/*` |

## Founder only

1. Merge PR → Redeploy Production to main HEAD  
2. Env free-lane / Stripe if incomplete  
3. Do **not** flip public gates or maps  

## Do not

- Redeploy unreviewed HEAD without green CI  
- Force-settle DISPUTED scores  
- Claim PROVEN or publish performance while RED  
- Treat conformal coverage as eligibility

## D0 update (autonomous merge)

- **PR #410 MERGED** to main at `96785c8` (2026-08-09).
- Second-pass polish landed before merge (`f5e07bcb`): typecheck clean, RPCP suite green.
- **Remaining founder:** Vercel Production Redeploy if auto-deploy blocked by commit-author verify; optional Stripe/free-lane env.
- **Still do not flip gates/maps/RANKING_PAUSE_APPLY.**

