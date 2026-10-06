# V8 — Pro-Bettor Model Process Checklist

Ordered process for shipping a sports prediction model. Every step is mandatory.
A model that skips a step does not ship.

---

## 1. Beatable market

- Identify the market (spread, moneyline, total, player props).
- Confirm the market has historical closing lines available for evaluation.
- Document why the market is believed beatable (sharp disagreement, slow line, structural edge). Do not proceed on hope.
- Record the market's typical hold / vig. If no-vig fair price cannot be computed, stop.

## 2. Data inventory

- List every candidate source: play-by-play, tracking, depth charts, injuries, weather, market.
- For each source record: as-of availability, refresh cadence, missingness rate, license/terms.
- Mark each field as `pre-kickoff` or `post-kickoff`. Post-kickoff fields may NEVER enter features.
- Missing values stay `null`. No silent imputation. Document any planned imputation and its fit window.

## 3. Leakage review

- Run V1 leakage anti-pattern probes (`src/eval/leakage-antipatterns.ts`):
  - Future-Elo contamination probe.
  - Current-week snap-share probe.
  - Sign-convention probe.
- Any probe failure blocks the build. Fix the feature, do not waive the probe.
- Chronological split only (V7 `chronologicalSplit`). Random splits are forbidden.
- Confirm every feature is computable from data available at prediction time.

## 4. Preregister

- Declare the target variable and evaluation metric before looking at holdout results.
- Lock the model architecture and hyperparameters.
- Lock the training window and the holdout window.
- Write the thesis statement: what edge is claimed, which features carry it, known limitations.
- Use V5 `validateSubmission` / `writeSubmissionCsv` for the model-output contract.

## 5. Walk-forward vs closing line

- Evaluate walk-forward (W2 `walkForwardSeasons` / closing-line-benchmark).
- Compare model probabilities against the no-vig closing line.
- Report Brier, log-loss, and closing-line value (CLV) on a sealed holdout.
- Run W1 calibration gates. Isotonic calibration applies only if it improves holdout Brier.
- If the model cannot beat the closing line on holdout, the honest answer is a negative result.

## 6. Honest-negative writeup

- When the edge is not demonstrated, write the negative result. Do not:
  - Re-run with different windows until something sticks.
  - Drop the holdout and evaluate on training data.
  - Silently change the target or metric after seeing results.
- Record: what was tested, the numbers, why it failed, what would change the answer.
- The negative result is a deliverable. Ship it.

## 7. Ship criteria

A model ships only when ALL of the following hold:

| Criterion | Gate |
|---|---|
| Leakage probes | 0 failures |
| Holdout Brier | Better than market baseline |
| Holdout log-loss | Better than market baseline |
| Calibration | Passes W1 gates |
| Closing-line value | Positive on sealed holdout |
| Thesis block | Present in V5 submission |
| Known limitations | Stated explicitly |
| No `any`, no fake data, no imputed finals | Verified |
| Reproducible | Seeded, deterministic under V4 replay |

If any criterion fails: the model does not ship. Write the negative result (step 6) and stop.

---

## Process integrity

- External ingestion is env-gated, no-store, fail-closed.
- No secrets in code or commits.
- Every shipped model has a V5 CSV submission on record with thesis and training window.
- Closing lines are the ground truth for skill measurement. Do not beat the close with metrics alone.
