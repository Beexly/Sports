# edge-lab — honest edge measurement harness

Real, runnable machinery for measuring whether GSE picks have an edge. No
simulation, no self-grading. Run the checks yourself:

```bash
node eval/edge-lab/smoke.mjs   # 13 known-answer checks, all PASS
```

## What's here (REAL — verified by smoke.mjs)
- `metrics.mjs` — Brier, log loss, ECE (calibration), implied prob, proportional
  de-vig, and **CLV** (closing line value) on fair probabilities. Every function
  is checked against a hand-computed expected value.
- `sealed-split.mjs` — a season-based train / validation / **sealed-vault** split.
  The 2024 vault throws if you read it more than once — peeking becomes an error,
  not a silent overfit. This is the real version of "sealed 2024 vault."

## What's NOT here yet (the honest gap — needs your data, not more code)
To produce **real NFL numbers** instead of unit checks, two inputs must be wired:
1. **GSE settled picks** with their model probability at bet time
   (already in the DB via the pick lifecycle / `prediction-engine`).
2. **Historical closing lines** — from The Odds API historical endpoint
   ([verified](https://the-odds-api.com/historical-odds-data/): the $30/mo "20K"
   plan includes historical odds; historical calls cost 10× credits). This is the
   "grow from what we have" step — you already pay for the Odds API.

Feed those two in and `meanClv()` / `brierScore()` / `expectedCalibrationError()`
report whether GSE beats the closing line out-of-sample. That number — measured on
the sealed 2024 vault, once — is the real answer to "do we have an edge."

## Why this exists
Built to contrast with status docs that *claim* a backtest. Here the harness runs
and prints PASS/FAIL you can read. Provenance: lead surfaced by external research
(The Odds API historical), **verified** before building (the arXiv "58.5%" claim
from the same batch was checked and found fabricated, so it was discarded).
