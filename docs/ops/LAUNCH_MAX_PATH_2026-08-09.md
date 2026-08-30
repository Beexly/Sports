# Launch max path — 2026-08-09 (integrity-safe)

## Live truth
- PUBLIC_PICKS already ON (`canExposePublicPicks: true`)
- Board surface: **signal** (auto when odds stale)
- PERFORMANCE_STATS / maps / PROVEN: **OFF** while eligibility RED (Brier 0.275 / ECE 0.112 / RES 0.002) — correct
- Market odds last insert: Jul 25 — market board stays dark without invent
- Finish-line unlock: **generate-signal-slate** cron (independents only)

## What opens the product NOW
1. Cron `GET /api/cron/generate-signal-slate` every 2h (vercel.json) — model signals from Kalshi/FPI/ClubElo/Poisson/Elo
2. Signal board kill switch = slate-fresh (published picks), not book odds
3. Free tools (6), methodology, B2B experimental, contests, checkout remain open
4. Free-spine health cron already scheduled — re-probe multi-source

## Do NOT flip while RED
- PERFORMANCE_STATS / PERFORMANCE_STATS_ENABLED
- CALIBRATION_ADJUSTMENTS_ENABLED / AUTO_PUBLISH
- STATS_PUBLIC without rights memo
- RANKING_PAUSE_APPLY until RES re-measure after independents settle

## Optional founder env (maximize, not invent)
- THE_ODDS_API_KEY — market board / edge labels
- CONTENT_FREE_LANE_ENABLED + Cerebras — podcast/newsletter free lane
- AUTONOMY_EXECUTE=true — planner re-probes free-spine (no gate flips)

## Integrity
No invent odds/ROI. No PROVEN copy. rankingP = sort key. Conformal ≠ eligibility.
