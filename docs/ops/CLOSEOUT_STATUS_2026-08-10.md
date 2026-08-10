# Close-out status — 2026-08-10 (autonomous)

## Live (after v5.2.5 path)

| Surface | Status |
|---|---|
| Market clock | GREEN (ESPN free tertiary; Rundown 429 secondary) |
| Odds dualPath | Odds API key still ABSENT — set `THE_ODDS_API_KEY` for denser books |
| Independent coverage | ~65% ML/SPREAD eligible |
| Eligibility Brier | RED ~0.25 (target ≤0.22) |
| Eligibility ECE | RED ~0.05–0.06 (target ≤0.05) |
| Eligibility Murphy RES | **~0.01** (was 0.002) — real lift |
| Ranking projected RES | **path viable** with pause + selective |
| PERFORMANCE_STATS / maps / AUTO_PUBLISH | **OFF** |
| RANKING_PAUSE_APPLY | **OFF** (advisory pause only) |
| Money rails | Stripe secret + webhook + 6 price slots configured |
| Waitlist | Public open |
| Founder Checkout | **External** — one real smoke still required |

## Engineering shipped this arc

1. ESPN free odds tertiary + multi-day horizon  
2. MLB StatsAPI standings + nflverse EPA → independent blend (v5.2.3)  
3. forceReprice backfill for settled trueProb  
4. RES unlock: independent-first live p; kill fake marketFairProb=0.5 (v5.2.4)  
5. Sharpness-weighted blend + discrimination stretch  
6. Dual-objective selective (RES under Brier cap); live blend 0.7/0.3 (v5.2.5)  

## Do not flip

- PERFORMANCE_STATS, maps apply, AUTO_PUBLISH, RANKING_PAUSE_APPLY  
- Do not invent PROVEN while floors RED  

## Highest remaining levers

1. **Brier ↓** on published set — softer stretch + blend already landing; more independent-priced settles under selective δ  
2. **RANKING_PAUSE_APPLY=true** when founder ready (MLB ML/SPREAD dead) — projected RES already clears 0.02  
3. **THE_ODDS_API_KEY** in Production for denser books  
4. **One Checkout smoke** (founder)  
5. Keep force-reprice + calibration-metrics as settles accumulate → chase GREEN×3  

## Honest posture

Signal board live + money rails configured + integrity gates holding.  
Not yet: defensible PROVEN / full market board / closed revenue loop.
