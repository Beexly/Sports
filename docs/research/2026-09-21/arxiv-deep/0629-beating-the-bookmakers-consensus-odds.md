# 0629 Beating the Bookmakers with Consensus Odds (arXiv:1710.02824v2)

**Citation:** Kaunitz, L., Zhong, S., & Kreiner, J. *Beating the bookmakers with their own odds: a quantitative strategy based on the wisdom of crowds* (arXiv:1710.02824v2). URL: https://arxiv.org/abs/1710.02824
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, https://arxiv.org/pdf/1710.02824v2 — the ar5iv HTML carried only the abstract).
**Verdict:** ADAPT — the consensus-odds + max-price positive-EV rule is the cleanest published template for GSE's line-shopping/CLV framework; the 9.9% realistic-simulation return comes with a p=0.089 asterisk and a stale-odds/selection-bias warning the authors state honestly.

## 1. Research question
Can a bettor systematically profit by treating the bookmakers' *consensus* odds as the true probability (wisdom of crowds) and betting only when some individual bookmaker offers a price above the consensus fair value — and does the edge survive realistic execution frictions and real-money betting?

## 2. Dataset / schema
- **Historical odds: 479,440 games, 818 leagues/divisions, 32 bookmakers, January 2005 – June 2015.**
- Strategy data: closing odds and 1–5-hour pre-game odds snapshots.
- Live deployment: a real-time dashboard (odds aggregator) feeding paper trading then real-money betting.
- Access: odds data from a commercial aggregator (not named as downloadable); strategy code at **https://github.com/Lisandro79/BeatTheBookie** (stated in the paper).

## 3. Method / model
- **Consensus probability = inverse of the mean odds** across bookmakers (the "wisdom of crowds" fair price).
- **Betting rule:** bet when the **maximum offered odds** across books exceed the consensus-implied fair value, with a small adjustment **α = 0.05** (a margin/edge threshold).
- Evaluation ladder: (1) closing-odds simulation; (2) realistic 1–5-hour pre-game simulation (executable prices); (3) paper trading on live dashboard odds; (4) real-money betting with actual accounts.

## 4. Equations & assumptions
No formal equations beyond the rule's arithmetic: fair probability p = 1/mean(odds); bet the book argmax offering odds o_max where 1/o_max < p·(1−α)-style edge condition (α=0.05 adjustment as stated). Assumptions: the consensus (mean) odds are an unbiased estimate of true probability; the maximum odds are actually obtainable at the quoted size; bookmaker margins are symmetric enough that the mean inverts cleanly.

## 5. Features / target
- Inputs: per-game cross-bookmaker odds panel (mean odds, max odds).
- Target: binary bet/no-bet per game; outcome = realized result for P&L.
- No predictive modeling — the "model" is the consensus itself.

## 6. Validation design
- Closing-odds simulation (best-case, 56,435 bets) vs. **random bettor baseline** (38.9% accuracy, −3.32% return).
- Realistic simulation on 1–5-hour odds (31,074 games → 6,994 bets) vs. random baseline (38.4%, 0.2%).
- Paper trading: 407 bets on live dashboard odds. Real betting: 265 bets with real money.
- Combined live sample: 672 bets vs. a random-bettor comparison (**p = 0.089** — marginal significance, authors' own test).

## 7. Numerical results / baselines
- Closing simulation: **56,435 bets, 44.4% accuracy, 3.5% return** (random: 38.9%, −3.32%).
- Realistic 1–5h simulation: **31,074 games, 6,994 bets, 47.6% accuracy, 9.9% return** (random: 38.4%, 0.2%).
- Paper trading: **407 bets, 44.4% accuracy, 5.5% return**.
- Real betting: **265 bets, ~47% accuracy, $957.50 profit, 8.5% return**.
- Combined paper+real: **672 bets, 45.5% accuracy, $2,086 profit, 6.2% return; random comparison p = 0.089**.
- Frictions (authors' own): **~30% of dashboard odds were stale** (unbettable); **bookmaker limits introduced nonrandom selection bias** (the bets that survived to execution were not a random subset of the signals).

## 8. Code / data availability
Code/data/model: **https://github.com/Lisandro79/BeatTheBookie** (stated). Odds data itself via commercial aggregator (not open).

## 9. Leakage & limitations
- **p = 0.089** on the combined live sample: the real-money evidence is suggestive, not statistically significant at conventional levels. The 9.9% realistic-simulation return is the strongest number but it's still a simulation.
- ~30% stale odds means nearly a third of paper signals were phantom; the live returns are computed on the executable subset, which the bookmaker limits then selected non-randomly — the executed sample is biased toward accounts/limits that tolerated the bettor, i.e., toward softer books, which flatters the return.
- Consensus = mean odds inverts the *average* margin; if the bookmaker panel is skewed (a few sharp books, many followers), the mean is not the wisdom of crowds but the wisdom of the followers.
- α = 0.05 is asserted, not optimized; no sensitivity analysis shown.
- 2005–2015 data: pre-modern odds-screen era; today's markets are faster and the stale-odds problem the authors hit would likely be worse, not better, for a scraper-speed operation.
- For GSE: this is a *line-shopping* edge, not a *prediction* edge — it monetizes market dispersion, which requires multi-book execution infrastructure Garrett doesn't currently run.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. Direct overlap: **2026-09-17 props-consensus/** (Bills–Lions TNF projection methods, market captures) — GSE already builds consensus numbers for props. The prediction-market triage covers Polymarket/Kalshi tooling. This paper is an **extension**: it turns GSE's existing consensus work into a *decision rule* (bet max-price vs. consensus) with a published validation ladder (simulation → realistic simulation → paper trading → real money) that GSE's consensus lane currently lacks. Not duplicative.

## 11. GSE implementation spec
- Data: multi-book odds feeds (Garrett's OddsPapi/API Vault accounts) for NFL sides/totals/props — capture mean odds and max odds per market at 1–5h before kickoff.
- Build: nightly consensus engine — invert mean odds to fair probabilities, flag markets where max odds imply positive EV beyond an α margin (start α=0.05, tune on backtest); log every signal with the full odds panel for the validation ladder.
- Execution: paper-trade the signals for a full season (the paper's ladder step 3) before any real-money consideration; track stale-quote rate and limit/selection effects explicitly.
- Effort: ~1 week for the consensus+signal engine on existing odds feeds; the paper-trading harness is the ongoing cost.

## 12. Reproducible test
Dataset: 2023–2024 NFL odds panels (multi-book, timestamped) + realized outcomes. Protocol: apply the consensus/max-odds rule with α=0.05 on 1–5h pre-game snapshots; baseline: random bettor at the same bet frequency and a closing-line-value (CLV) benchmark. Metric: ROI and CLV per bet; success = positive ROI with CLV > 0 (the paper's mechanism predicts the edge shows up as CLV first).

## 13. Acceptance / rejection gate
ADOPT the consensus/max-price rule as a live signal iff on the 2023–2024 backtest it delivers ROI ≥ 2% over ≥ 500 signals with positive mean CLV. If ROI ≤ 0 or CLV ≤ 0, reject — the dispersion edge doesn't exist in current NFL markets. Paper-trade for one full season before any staking. Gate set before running the test.

## 14. Improvement experiment
Weight the consensus by bookmaker *sharpness* (past CLV performance) instead of a simple mean — a "sharp-weighted consensus." Why it might win: the paper's mean-odds consensus treats Pinnacle and a soft recreational book as equals; weighting by demonstrated sharpness moves the "fair price" toward the books that actually predict, which both sharpens the EV estimate and makes the max-odds rule fire on genuinely mispriced soft lines rather than on sharp-book disagreements.
