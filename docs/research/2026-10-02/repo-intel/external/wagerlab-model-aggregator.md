# wagerlab/model-aggregator

**Stars:** 24 | **License:** NONE (no license file) | **Pushed:** 2021-05-12 | **Language:** JavaScript | **Forks:** 6

## 1. Vision
Turn 50+ public prediction models into one ranked pick list: scrape ThePredictionTracker for every model's predicted spread per game, then combine them *correctly* — not by naive averaging, but by z-scoring each model's spread-vs-line deltas against that model's own historical variance, then averaging the standardized scores. A model 3 points off the line means more from a low-variance model than a high-variance one.

## 2. The Ask
- Node; `npm run nfl` / `ncaaf` / `nba` / `ncaab`.
- **Total dependence on ThePredictionTracker.com** for the 50+ models' picks — "without ThePredictionTracker.com, building this would be considerably more complicated."
- Nothing else: no keys, no feeds, no training.

## 3. Constraints
- **No license = study-only.** Cannot copy.
- **Maintenance:** pushed 2021-05-12 — stale 5+ years. ThePredictionTracker's site format has likely drifted; the scraper may be broken.
- Single point of failure on a third-party site the author doesn't control.
- Naive in one dimension the author admits: it standardizes *spread error variance* but doesn't weight models by demonstrated skill — a consistently bad model counts as much as a good one after normalization.

## 4. GSE lens
- **The z-score-per-model normalization is directly relevant to Garrett's research standard.** His 2026-09-30 directive: fantasy/research answers built from *consensus across multiple outlets*, not one opinion. This repo is the beginning of a consensus engine — but its flaw is instructive: normalizing without skill-weighting treats all models equally. GSE's consensus layer should do what this doesn't: track each source's historical Brier/log-loss and weight by demonstrated skill. That's the improvement path, and it's a real one.
- **It exposes that GSE has no consensus/aggregation layer at all.** The engine ingests signals (eventually), but there's no designed mechanism for combining *external* model outputs (Vegas lines, public models, expert picks) into the prediction. The total-signal doctrine says ingest everything; this is the "combine" half that's missing.
- Honest limit: the repo is stale and its data source is borrowed. The idea ports; the code doesn't.

## 5. Verdict
**REBUILD** — no license and a dead scraper rule out adoption. Rebuild the method with the fix the author never made: per-model z-scoring *plus* skill-based weighting, as GSE's consensus/aggregation layer over external outlets.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/wagerlab/model-aggregator
- gitdiagram: https://gitdiagram.com/wagerlab/model-aggregator
- star-history: https://star-history.com/#wagerlab/model-aggregator (24 stars)
- github.dev: https://github.dev/wagerlab/model-aggregator
