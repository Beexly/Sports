# BoazBD/Winner-Predictor

**Stars:** 13 | **License:** NONE (no license file) | **Pushed:** 2026-02-25 | **Language:** Python | **Forks:** 1

## 1. Vision
A live, self-updating sports-betting prediction site (aisportbetter.com): scrape odds every 15 minutes, train an LSTM on years of historical odds movement to learn how line shifts reveal true probability, run inference continuously on AWS, and display the +EV opportunities on a GCP-hosted site. The full MLOps loop — scrape → train → infer → serve — as one person's operation.

## 2. The Ask
- Clone, venv, `pip install -r requirements.txt`, `python scraper/main.py` → writes `bets.csv`.
- **The scraper only works from an Israeli IP address** (target site geo-fences) — the data pipeline is region-locked.
- AWS for the always-on backend (scraping, ETL, inference, DB); GCP for the site. Real infra spend, unstated.
- The site's "rigorously developed" claims (LSTM vs Transformers vs traditional ML, hyperparameter optimization, continuous retraining) are asserted in prose — no code, metrics, or backtest tables ship in the repo.

## 3. Constraints
- **No license = study-only.**
- **Alive:** pushed 2026-02-25; the live site exists (or existed) at aisportbetter.com.
- **Soccer/football only; geo-fenced data source** — the pipeline can't even be reproduced from the US without a workaround.
- No verifiable evidence: the repo is the scraper + marketing copy. The model, the training code, and the backtest are all behind the curtain. Trust-me ML.

## 4. GSE lens
- **The ops loop is the lesson and the warning.** Scrape → ETL → train → infer → serve, running continuously, is the end-state GSE's lanes are crawling toward (walk-forward calibration just started; no live ops loop exists). This repo shows what "live" actually costs: always-on infra, a scraper that breaks when the target site changes, geo-fencing, and continuous retraining. GSE should design its calibration/ops loop with those costs named upfront.
- **Its evidence gap is exactly what GSE must not replicate.** Big claims (LSTM beat all benchmarks, strong live performance), zero committed artifacts. Compare cbratkovics/fantasy-football-ai: every figure is a JSON artifact with input hash and commit. GSE's standing rule — completion claims arrive with audit receipts — exists precisely because repos like this one are the norm. When GSE's engine goes live, its proof standard must be the fantasy-football-ai one, not this one.
- **The "learn from odds movement" idea is legitimate:** training on how lines *move* rather than where they sit is a real signal family (market microstructure). GSE's total-signal doctrine (ingest everything) should have "odds-movement features" on the signal-registry backlog — currently the registry has zero producers, so everything is backlog.
- No manufactured gap on modeling: there's no model here to evaluate.

## 5. Verdict
**REBUILD** — no license and no real code to adopt. Rebuild the *ops pattern* (continuous scrape→retrain→serve loop with cost accounting) and add odds-movement features to GSE's signal backlog. Treat all performance claims as unverified.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/BoazBD/Winner-Predictor
- gitdiagram: https://gitdiagram.com/BoazBD/Winner-Predictor
- star-history: https://star-history.com/#BoazBD/Winner-Predictor (13 stars)
- github.dev: https://github.dev/BoazBD/Winner-Predictor
