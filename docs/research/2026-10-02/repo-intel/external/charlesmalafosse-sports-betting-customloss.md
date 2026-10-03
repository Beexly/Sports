# charlesmalafosse/sports-betting-customloss

**Stars:** 96 | **License:** MIT | **Pushed:** 2021-11-15 | **Language:** Jupyter Notebook | **Forks:** 27

## 1. Vision
Fix the objective function, not the model: a Keras/TensorFlow custom loss that trains the classifier on *bets' potential profit* instead of raw accuracy — because a model that's right 55% of the time on short odds can lose money while one that's right 45% on long odds prints. Built for the author's BetSentiment.com operation.

## 2. The Ask
- Python, Keras on TensorFlow; a Jupyter notebook.
- A tiny dataset: 200 English Premier League games (Aug–Dec 2018) with team names, BetFair bookmaker odds, and a Twitter-sentiment score (30M tweets analyzed, per the author).
- The Medium article for the actual explanation; the repo is the code companion.

## 3. Constraints
- **MIT — adoptable.**
- **Effectively abandoned:** pushed 2021-11-15, single notebook, no maintenance. BetSentiment.com (the commercial user) is the real product; this is the demo.
- Dataset is microscopic (200 games, one league, one half-season) — the loss idea is demonstrated, not proven.
- Soccer/EPL framing; the loss math itself is sport-agnostic.

## 4. GSE lens
- **This is the sharpest single methodological idea in the betting-model set for GSE's lanes:** GSE's models (and its nascent calibration work) optimize predictive accuracy — but Garrett's lanes are *betting* lanes (props, picks, DFS ROI). A model trained on accuracy can be perfectly calibrated and still unprofitable if it can't find price. The custom-loss idea — train on expected profit, not log-loss — belongs in GSE's training-mission thinking, especially for the shadow-only props lane that needs honest model-prob sourcing before it can go live.
- **It pairs directly with the walk-forward calibration now starting:** when GSE calibrates on 2022–2025 + 2026 W1–4, the question "calibrated *for what objective*?" is open. This repo is the argument for a profit-weighted objective alongside Brier/log-loss.
- Honest limit: 200 games proves nothing; GSE must validate the idea on its own walk-forward frames, not trust the notebook.

## 5. Verdict
**REBUILD** — MIT would allow adoption, but there's almost nothing to adopt (one notebook, 200 games). Rebuild the *idea* — profit-weighted loss functions — inside GSE's own training/calibration stack and test it walk-forward.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/charlesmalafosse/sports-betting-customloss
- gitdiagram: https://gitdiagram.com/charlesmalafosse/sports-betting-customloss
- star-history: https://star-history.com/#charlesmalafosse/sports-betting-customloss (96 stars)
- github.dev: https://github.dev/charlesmalafosse/sports-betting-customloss
