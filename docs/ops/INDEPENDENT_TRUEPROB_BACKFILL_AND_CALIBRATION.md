# Independent trueProb backfill + calibration interpretation

## Goal

PROVEN path is blocked by ranking power, not sample size:

| Metric | Live (approx) | Floor / target |
|---|---|---|
| Settled n | ≥100 (met) | 100 |
| Brier | ~0.275 | ≤ 0.22 |
| ECE | ~0.112 | ≤ 0.05 |
| Murphy RES | ~0.002 | raise via independent ranking |
| independent_trueProb coverage | **0% historical** | ≫ 0% |

`missing_independent` is the primary ranking-power bottleneck. Without priced
`independentEdge.trueProb` on settled rows, the bake-off cannot score
`independent_trueProb` / `blend_indep_conf` kinds — only confidence-echo.

## What backfill does

Cron: `GET /api/cron/backfill-independent-trueprob`

Also runs a bounded batch at the start of `calibration-metrics`.

For each settled published non-seed WIN/LOSS MONEYLINE pick **missing**
`factorBreakdown.independentEdge.trueProb`:

1. Rebuild independents (Kalshi / FPI / ClubElo / Poisson / Elo) for the game.
2. Map trueProb to the **published selection side**.
3. Merge into `factorBreakdown.independentEdge` only.

### Never rewritten

- selection, line, result, settledAt  
- confidence, pickGrade, tier  
- rankingP / rankingSource (audit trail of what was published)

### Integrity law

- No invent: empty independents → skip  
- No PERFORMANCE_STATS / PROVEN flip  
- Labeled retrospective enrichment for calibration only  

## How calibration metrics use it

`extractProvenPathProbs` (apps/web/lib/calibration/proven-path-rows.ts):

```
pIndependent = independentEdge.trueProb
  else rankingP if rankingSource === "independent_trueProb"
```

Live eligibility p (`live-calibration-p.ts`):

1. marketFairProb (book de-vig)  
2. independent trueProb  
3. MONEYLINE confidence/100 (provisional)  
4. SPREAD/TOTAL without fair p → **excluded**

### Interpreting the report

| Field | Meaning |
|---|---|
| Brier | Mean squared error of p vs outcome. Lower better. Floor 0.22. |
| ECE | Calibration gap \|mean p − observed rate\|. Floor 0.05. |
| Murphy REL | Reliability (calibration error component). Lower better. |
| Murphy RES | Resolution (ranking power). Higher better. Maps do **not** raise RES. |
| separation | mean p\|win − mean p\|loss. Must be **positive** for ranking polarity. |
| consecutiveGreen | GREEN streak toward publish (need K=3). |
| independentCount | Settled rows with pIndependent priced. |

### What does **not** get you PROVEN

- Sample size alone  
- Isotonic / Platt maps (cut REL only; RES stays flat)  
- Claiming ROI while eligibility RED  
- Using confidence-echo rankingP as independent  

### Path after backfill

1. Backfill raises independent coverage on settled MONEYLINE.  
2. Re-run calibration-metrics.  
3. If separation > 0 and Brier/ECE under floors → GREEN ticks.  
4. After streak K=3 + publish policy → PERFORMANCE_STATS may open (founder).  

## Odds-insert visibility

Market kill-switch uses last `IngestionRun` with `status=SUCCESS` **and**
`oddsInserted > 0`. Quiet board / empty provider SUCCESS with `oddsInserted=0`
must **not** reset that clock (honest).

Dual path:

- `THE_ODDS_API_KEY` (aliases) and/or Rundown (`THERUNDOWN_API` etc.)  
- Rundown now fetches a **7-day** event window  
- `refresh-odds` / `processSport` surface `oddsInserted`, `provider`, `eventsCount`, `note`  
- `public-surface-truth.oddsInserting` shows dualPath key presence + last zero-odds SUCCESS  

Signal board does **not** require oddsInserted>0 (slate-fresh kill switch).
