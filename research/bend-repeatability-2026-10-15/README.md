# Bend Score Repeatability Measurement (WO-3, Deliverable 1)

Executes Grok's WO-3 design for the missing repeatability leg of the
Bend Score (CBS). Transfer already clears (+0.99 POE/100, 95% CI
0.45–1.53; nested LODO 5.7% OOS gain; perm p=0.015). Repeatability was
never measured. This build measures it — or proves, with numbers,
exactly how far the available data is from being able to.

## Files

- `bend_reps.py` — rep extraction. The centripetal-acceleration series
  is a line-for-line port of the StevanHRG implementation's CODE
  (`bend-stevanhrg/src/features.py::centripetal`): heading from the x/y
  path via `unwrap(arctan2(gradient(y), gradient(x)))`, omega =
  |dheading/dt| at 10 Hz, ac = s·omega with the implementation's
  3-frame moving-average smoothing; rep value = ac_max (peak), the
  implementation's own reduction (`final_metric.py`).
- `icc.py` — ICC(2,1) (Shrout & Fleiss case 2, absolute agreement,
  single measure) + parametric-bootstrap 95% CI (B=2000) from the
  fitted ANOVA variance components; split-half + Spearman–Brown;
  reps-needed table.
- `run_measurement.py` — inventory + extraction + the design's
  pre-registered verdict logic; writes `results.json`.
- `tests/test_icc_synthetic.py` — estimator proof on synthetic ground
  truth. **This suite gates every real-data number below.**

## Design mapping (WO-3 → code)

| Design element | Implementation |
|---|---|
| Rep = bend segment per StevanHRG's own rules | Route A: one combine arc-drill attempt (the implementation's native unit; drills = `final_metric.py`'s ARC list). Route B: in-game segment from the same ac series with the design's segmentation numbers (75th-pct of player-game ac, ≥3-frame onset, ≥0.4 s min duration, ≥0.5 s below-threshold separation, 1 s snap/whistle edge guards, no missing frames). |
| Primary estimator | ICC(2,1) on per-athlete means from independent occasions (two game-half means, Route B; attempt halves, Route A). Decision uses the ICC only. |
| Secondary | Split-half correlation, Spearman–Brown corrected. Recorded; never overrides the ICC. |
| Decision-grade | ≥30 athletes × ≥4 games, ≥200 events. PASS ≥0.70 / SHADOW 0.50–0.70 / FAIL <0.50. Below 20 athletes or 100 events → no number entered, gate UNDERPOWERED. |

Code-vs-prose ruling (recorded per build instructions): the design
text gives the segmentation numbers with "e.g." and the vendor
implementation contains no game-tracking segmenter. Where the code
speaks (ac formula, smoothing, peak reduction, drill set) the code
governs. Where the code is silent (segmentation thresholds), the
design's numbers govern. Noted in `bend_reps.py`, not hidden.

CI-method ruling: the textbook Shrout–Fleiss F interval was implemented
first and rejected in validation — coverage 0.81–0.93 on synthetic
ground truth (n=80, k=2). The shipped CI is the parametric bootstrap
from fitted variance components (coverage ~0.90–0.95 in the same suite;
point-estimate recovery |bias| < 0.02 at ICC 0.3/0.6/0.85).

## Verdict (2026-10-15 run — see results.json)

**UNDERPOWERED — data dependency unmet, with numbers.** Route A's
`combine_tracking.csv` (BDB 2027 competition file, Kaggle-only) exists
nowhere on this machine: 0 athletes, 0 reps. Route B's only in-game
tracking is the chasko-winners samples: 2 single-game samples (25 plays
each); the segmenter runs end-to-end on them, but 0 athletes have ≥2
games, so no test-retest ICC is computable and, per the design's
failure-mode rule, no reliability number is entered. Exact shortfall
vs decision-grade: 30 athletes × ≥4 games and ≥200 qualifying events
(see results.json for the extracted event counts).

What closes it: the BDB 2027 `combine_tracking.csv` (Route A) or
multi-game BDB tracking for ≥30 DL athletes (Route B). The moment
either lands, `run_measurement.py` produces the ICC + CI with zero
code changes.

## Run

```
python3 -m pytest tests/ -q          # estimator proof (must pass first)
python3 run_measurement.py --out results.json
```
