# Airkid29/TruthMarket

**Stars:** 1 | **License:** MIT | **Pushed:** 2026-04-21 | **Language:** Python | **Forks:** 0

## 1. Vision
A "sophisticated sports prediction engine" (the README's words) that pulls live Polymarket odds and flags mispricings against a weighted model: 50% Elo, 30% historical titles, 20% recent form. Signals are BET AGAINST / FOLLOW / HOLD at ±5pp divergence, served through a Flask dashboard with sparklines and confidence gauges.

## 2. The Ask
- Python 3.8+, `pip install flask requests` — that's the whole dependency list.
- Polymarket's Gamma API (public, no auth) for live market data.
- Hardcoded event slugs for World Cup 2026, NBA Championship 2026, UCL 2025-26; hardcoded Elo/historical/form data in `data.py`.
- Run `python main.py`, then `python app.py` for the dashboard.

## 3. Constraints
- **MIT — adoptable**, but there's little worth adopting.
- **1 star, pushed 2026-04-21, brand new and unproven.** No backtest, no track record, no evaluation of the signals.
- **No NFL coverage** — World Cup, NBA, UCL only.
- The 50/30/20 weights are asserted, not derived — no tuning, no validation, no sensitivity analysis. "Explainable AI" here means "we show you the arbitrary weights."

## 4. GSE lens
- **The model-vs-market divergence monitor is a real lane GSE lacks** — but this implementation is too crude to learn from beyond the concept. A fixed ±5pp threshold on hand-set weights will generate signals; it won't generate *calibrated* signals. GSE's walk-forward calibration (just started) is the grown-up version of this idea, and it should stay that way.
- **Its honesty gap is instructive:** no backtest section, no "future enhancements" beyond a wishlist ("Machine Learning: Neural networks for probability estimation"). Compare with cbratkovics/fantasy-football-ai's evaluation-first posture — the contrast is the lesson. GSE must never ship a TruthMarket-shaped artifact: confident signals, no receipts.
- No other gap: the dashboard is commodity Flask, the data is hardcoded.

## 5. Verdict
**IGNORE** — crude hand-weighted model, no NFL, no backtest, 1 star; the divergence-monitor concept is better covered by polymarket_gambot's dossier.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/Airkid29/TruthMarket
- gitdiagram: https://gitdiagram.com/Airkid29/TruthMarket
- star-history: https://star-history.com/#Airkid29/TruthMarket (1 star)
- github.dev: https://github.dev/Airkid29/TruthMarket
