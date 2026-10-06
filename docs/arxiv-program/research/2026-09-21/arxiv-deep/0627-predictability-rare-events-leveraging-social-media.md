# 0627 On Predictability of Rare Events Leveraging Social Media (arXiv:1502.05886v1)

**Citation:** Liu, X., & Ferrara, E. *On predictability of rare events leveraging social media: a machine learning perspective* (arXiv:1502.05886v1; PLOS ONE 2015). URL: https://arxiv.org/abs/1502.05886
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — pre-game fan-sentiment divergence as a contrarian upset feature is worth an NFL pilot (X/Reddit mood in the 6 hours before kickoff); the 8.57% marginal profit rests on 56 games and in-sample cross-validation, so the only honest next step is a strict out-of-sample test.

## 1. Research question
Do Twitter conversations carry a "wisdom of the crowd" signal that predicts *unlikely* soccer outcomes (upsets) — the games where bookmaker odds are hardest to set correctly — and can that signal beat the rigorous baseline of the bookmakers' own odds?

## 2. Dataset / schema
- **FIFA dataset:** 2014 FIFA World Cup, 64 games; Twitter gardenhose (10% sample) from Indiana University, June 12 – July 13, 2014; keyword-filtered by FIFA abbreviations, team names, and hashtags.
- **Live-monitoring dataset:** full Twitter stream, real-time collection, **October 25 – November 26, 2014**, covering EPL, Serie A, La Liga, Bundesliga, and the 2014 UEFA Champions League.
- Per game: tweets from the **6 hours before kickoff**, split by supporter group (both teams separately); sentiment/mood scored per group.
- **56 potential-upset games** total (25 World Cup + 31 live-monitoring) after filtering by the upset-score threshold.
- Access: Twitter gardenhose (historical academic access); the paper's tweet corpora are not re-released.

## 3. Method / model
- Define the **potential upset score PU(g) = (Omax − 1)/(Omin − 1)** (relative likelihood of most-likely vs. least-likely outcome); games with **PU(g) > θ, θ = 5** (results consistent for 3 ≤ θ ≤ 5) are "potential upsets". Realized upset score U(g) defined analogously for the outcome that materialized.
- Feature vector **P(g)**: discrete representation of the average mood of each team's supporters over the 6 pre-game hours (12 time windows tested; sentiment via lexicon scoring — the paper's §3).
- Classifier: **Gaussian Naive Bayes** (best among the scikit-learn classifiers tried; the authors stress the goal was feasibility, not classifier optimization).
- Task: discriminate games whose outcome is the expected (low-odds) result from those that become upsets (high-odds outcome).

## 4. Equations & assumptions
- **PU(g) = (O^g_max − 1)/(O^g_min − 1)**; **U(g) = (O^g − 1)/(O^g_min − 1)**. (Paper equations; reproduced faithfully.)
- Betting evaluation: **marginal profit P = (r − b)/b**, r = total payoff, b = total staked. (Paper equation 3.)
- Assumptions: supporter-group tweet assignment is accurate; lexicon sentiment proxies true fan mood; the 6-hour window captures pre-game information without leaking in-game events; bookmaker odds are the correct "expected outcome" baseline.

## 5. Features / target
- Inputs: per-team supporter mood time series (6h pre-game, discretized) → feature vector P(g).
- Target: binary — did the game end in an upset (U(g) > θ) or the expected result?
- 25 World Cup + 31 live potential upsets as the labeled set.

## 6. Validation design
- **Stratified 3-fold cross-validation** on the 56 potential-upset games (FIFA and live sets evaluated separately).
- Baseline: a **reshuffled-odds random model** (≈50% accuracy/AUROC — confirms the signal is real, not a class artifact).
- Economic evaluation: **100 rounds** of betting simulation — stratified 3-fold CV each round, $1 per test-set game: predict "no upset" → $1 on the favorite; predict "upset" → $0.50 on underdog win + $0.50 on draw. Compared against four fixed strategies (always favorite / always anti-favorite / always underdog / always tie).

## 7. Numerical results / baselines
- World Cup (25 games): **accuracy 0.7898, precision 0.8512, recall 0.5431, F1 0.6631, AUROC 0.7286**.
- Live-monitoring (31 games): **accuracy 0.8363, precision 0.5833, recall 0.6667, F1 0.6190, AUROC 0.7887**.
- Random reshuffle: ≈50% on both metrics (signal confirmed).
- Betting simulation: **average marginal profit 8.57%**; odds-reshuffled control **8.43%** (not an artifact of a peculiar odds distribution). All four fixed baseline strategies **lose money** (the safest, always-tie, still loses).
- U-test on sentiment scores significant at **p < 0.0001** across time windows (paper's Tables 2–3).

## 8. Code / data availability
None stated. Twitter gardenhose data (academic access); no repository or corpus link.

## 9. Leakage & limitations
- **N = 56 games.** Everything — the classifier, the 8.57% profit, the AUROC — is estimated on 56 potential upsets. The confidence interval around that profit is wide, and 100 rounds of CV on the same 56 games do not create new data.
- Cross-validation is *within* the 56-game set: the classifier is tuned and evaluated on the same small pool (the authors are candid that classifier choice was not the point, but the profit number inherits the optimism).
- 2014 Twitter: bot activity, organized fan campaigns, and the gardenhose 10% sample all distort "supporter mood" in ways the paper doesn't quantify.
- Sentiment lexicons on football slang/irony are noisy; supporter-group assignment by keyword is approximate.
- Bookmaker margins and stake limits ignored: an 8.57% *marginal* profit on $1/game paper bets is not a realizable ROI after vig and limits.
- External validity to the NFL: soccer draws create the three-outcome structure the betting strategy exploits (the $0.50/$0.50 underdog+draw split); the NFL has no draws to hedge with, so the strategy needs redesigning, not just porting.

## 10. GSE overlap
Cites /home/hatch/workspace/arxiv-sweep/existing-research-map.md. The map shows **no NLP/sentiment lane** anywhere in the corpus — no social-media features, no fan-sentiment signals, nothing in the 15-area ML brief covering text. This is a **new capability** (NLP lane). Nearest conceptual neighbor: the "wisdom of the crowd" idea behind consensus odds (ledger 0629), but from fans rather than books.

## 11. GSE implementation spec
- Data: X/Twitter and Reddit NFL team-community posts in the 6 hours before kickoff (2022–2025 seasons); label team-specific mood with a modern sentiment model (not a 2014 lexicon); build the PU(g) analog from moneyline odds — NFL "potential upsets" = games with moneyline odds ratio above threshold θ (tune θ on 2022–2023).
- Build: per-game feature vector of home/away fan mood divergence (the paper's P(g) analog); Gaussian NB or gradient boosting to predict upset vs. expected result; betting rule adapted to two outcomes (no-draw): predict upset → small stake on underdog moneyline, else pass.
- Effort: ~1–2 weeks (social-media collection pipeline is the bulk; the classifier is trivial).

## 12. Reproducible test
Dataset: 2024 NFL season — pre-game fan sentiment (X/Reddit, 6h window) + closing moneylines + realized outcomes. Protocol: train the mood-divergence classifier on 2022–2023, lock it, evaluate on 2024 (strictly out-of-sample — fixing the paper's in-sample CV weakness). Baselines: always-favorite and the engine's own upset picks. Metric: AUROC on upset classification + marginal profit of the adapted betting rule at flat $1 stakes.

## 13. Acceptance / rejection gate
ADOPT the sentiment feature iff on the locked 2024 out-of-sample test it achieves AUROC ≥ 0.60 on upset classification AND the adapted betting rule shows positive marginal profit. If AUROC < 0.55 or profit ≤ 0, reject: the paper's signal does not survive honest out-of-sample validation on NFL data. Gate set before running the test.

## 14. Improvement experiment
Replace raw sentiment with **sentiment *divergence*** (away-fan optimism minus home-fan optimism, normalized by volume) interacted with line movement in the same 6-hour window. Why it might win: the paper uses each side's mood as independent features; the contrarian hypothesis is specifically about *disagreement* — when away fans are euphoric while the line hasn't moved, the market may be missing something; when both fanbases agree with the line, there's no signal. Divergence × line-stickiness isolates the mispricing cases.
