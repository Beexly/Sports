# edge-lab — honest edge measurement harness

Real, runnable machinery for measuring whether GSE picks have an edge. No
simulation, no self-grading. Run the checks yourself:

```bash
node eval/edge-lab/smoke.mjs            # 13 metric checks, all PASS
node eval/edge-lab/clv-report.smoke.mjs # 7 CLV-aggregation checks, all PASS
```

## Get your REAL CLV track record (the actual number)

Your schema already grades CLV at settlement (`Pick.clvValue`, `Pick.clvVerdict`),
so the real edge number is a straight read from the DB — no Odds API backfill
needed for picks that already settled. In your environment (with `DATABASE_URL`):

```bash
npx tsx eval/edge-lab/run-clv-report.ts
```

It prints mean CLV, beat-close rate, and (only if a real `modelProb` exists)
Brier/ECE — per season and overall — over settled, non-bootstrap, graded picks.
If there are none yet, it says so honestly. **It never fabricates a number.**

## Files
- `metrics.mjs` — Brier, log loss, ECE, implied prob, proportional de-vig, CLV.
  Every function checked against a hand-computed value in `smoke.mjs`.
- `sealed-split.mjs` — season train/val/**sealed-vault** split; the 2024 vault
  throws on a second read so peeking is an error, not a silent overfit.
- `clv-report.mjs` — pure aggregation of graded picks → CLV track record, with
  honest sample-adequacy gating (PROVEN rung = n ≥ 100) and a refusal to compute
  Brier/ECE without a real `modelProb`.
- `run-clv-report.ts` — the DB runner (Prisma `@sports/db`) that feeds real rows
  into `clv-report.mjs`.

## Honest status
- The **machinery is real and verified here** (20 checks pass).
- The **live CLV number** comes from `run-clv-report.ts` against your DB. Pre-launch
  the honest result is likely "insufficient sample (n < 100)" — that is the truth,
  and the track record grows as live picks settle.
- A **2024 historical backtest** (picks that never existed in 2024) additionally
  requires retro-generating picks on historical odds — that's the separate Odds API
  historical step ([verified $30/mo plan includes historical odds](https://the-odds-api.com/historical-odds-data/)).

## Provenance
Built from the one **verified** lead in external research (Odds API historical).
The arXiv "XGBoost 58.5% NFL" claim from the same batch was checked, found
fabricated (the paper is a survey, not that result), and discarded.
