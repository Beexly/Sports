# [0468] Optimal Team Economic Decisions in Counter-Strike (arXiv:2109.12990v1)

**Citation:** Xenopoulos, P., Coelho, B., Silva, C. (2021). *Optimal Team Economic Decisions in Counter-Strike: An Application of Game-Theoretic Models*. arXiv:2109.12990v1. URL: https://arxiv.org/abs/2109.12990v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1048 lines).
**Verdict:** ADAPT — the game-level win-probability model is CSGO-specific, but the OSE (optimal-spending-error) decision-quality metric and the "value of a decision = win-probability delta under optimal vs actual choice" template transfer directly to NFL coaching decisions (4th downs, timeouts, challenges).

## 1. Research question
In Counter-Strike: Global Offensive, teams make round-by-round equipment-spending ("buy") decisions under a constrained economy. Can a game-level win-probability model value those decisions — identifying which buy types are optimal in each game state, how much win probability suboptimal buys cost, and which teams make the best economic decisions (the OSE metric)?

## 2. Dataset / schema
- **6,538 professional/semi-professional CSGO demofiles** from HLTV.org, April 1, 2020 – April 20, 2021.
- **Splits (time-ordered):** train April–September 2020 (3,308 games); validation October–November 2020 (1,108); test December 1, 2020 – April 20, 2021 (2,122).
- **Schema per game:** round-start team scores, score differential, equipment values, team money, spending decisions, buy types (Eco / Low Buy / Half Buy / Hero Low Buy / Hero Half Buy / Full Buy), map; target = game outcome (CT win / T win / draw).
- Access: HLTV demofiles are public; the parsed dataset is not released in the paper.

## 3. Method / model
- **Game-level win probability:** multiclass (CT win / T win / draw) models from round-start state: logistic regression baseline (scores only), XGBoost (Hyperopt-tuned), and a 2-layer ReLU neural network with dropout and softmax output; trained per-map and with one-hot-encoded (OHE) map features; early stopping (patience 10).
- **Decision valuation:** for each observed game state, substitute each buy type counterfactually into the win-probability model; the "optimal" buy is the argmax; the cost of the actual decision is the win-probability delta.
- **OSE (Optimal Spending Error):** per team, the paper prints OSE_T = Σ_r (W_{T,r} − O_{T,r})² (Eq. 2) — a sum of squared gaps between actual-decision and optimal-decision win probabilities — though the prose describes it as a mean-squared error (formula/prose mismatch noted).
- **Generalization test:** held-out-map experiment — models trained on more maps' data (fine-tuned) vs prior per-map models.

## 4. Equations & assumptions
Paper's equations: weighted log-loss for model comparison (Eq. 1); OSE_T = Σ_r (W_{T,r} − O_{T,r})² over rounds r for team T, where W is the win probability under the actual buy and O under the optimal buy (Eq. 2, printed as a sum though described as a mean). Buy-type economy thresholds define the six buy categories. Stated assumptions: the win-probability model is correctly specified enough that counterfactual buy substitution is meaningful (the paper's weakest assumption — see §9); team strength is captured by the included features (no explicit team-strength model); rounds are conditionally independent given the round-start state; the test-period meta is stable enough for the time-ordered split to be fair.

## 5. Features / target
- **Inputs:** round-start scores, score differential, equipment value, team money, spending/buy decisions, map (per-map or OHE).
- **Target:** game outcome — CT win, T win, or draw (multiclass).
- Horizon: full-game outcome predicted from each round-start state.

## 6. Validation design
- Time-ordered train/validation/test splits (no shuffling across the meta timeline).
- Model comparison by weighted log-loss, per map and overall.
- Decision analysis on the test set: optimal-buy tables by game state, cost of suboptimal buys, team OSE rankings.
- Held-out-map generalization: compare models with more cross-map data (fine-tuned) against per-map specialists on unseen maps.
- Correlation of team OSE with observed round win rate and HLTV world ranking as a sanity check.

## 7. Numerical results / baselines
Paper's Table 2 (weighted log-loss, exact): logistic regression 0.793; XGBoost 0.739; neural network 0.736; OHE-map XGBoost 0.730; OHE-map NN 0.732. (Lower is better; the OHE-map XGBoost wins.)
Buy-type analysis (exact): observed round win rates — Eco 3%, Low Buy 27%, Half Buy 34%, Hero Low Buy 25%, Hero Half Buy 48%, Full Buy 59%. CT eco rounds: the predicted-optimal buy was low/half buy in over 90% of cases, with ~3% average lost win probability per suboptimal eco. Second round after losing the pistol: actual T buys were 27% eco / 10% low / 63% half vs optimal 0% / 0% / 100%; actual CT buys 6% / 3% / 91% vs optimal 4% / 0% / 96%.
Team decision quality: OSE correlates with round win rate at r = −0.45 (better decisions → more wins). Held-out-map experiment: more-data (fine-tuned) models matched or beat prior per-map models on 6 of 7 maps. All numbers are the paper's claims.

## 8. Code / data availability
None stated for this paper (demo parsing builds on the authors' 2020 CSGO parser; HLTV demofiles are independently public).

## 9. Leakage & limitations
- **Counterfactual validity (fatal for causal claims):** substituting buy types into an associational win-probability model is not a causal estimate — buy decisions correlate with team strength, opponent strength, and unobserved game state. The "optimal" buy may just be the buy good teams choose. No overlap/ignorability argument is made; off-support extrapolation (e.g., forcing full buys with no money) is unguarded.
- **OSE formula/prose mismatch:** Eq. 2 prints a sum while the text calls it a mean — replication ambiguity for the headline metric.
- **Confounded team ranking:** OSE's correlation with HLTV rank (r = −0.45 with round win rate) may reflect competition tier rather than decision quality — better teams face different game states.
- **Pro/semi-pro only:** no evidence the buy valuations hold at other skill levels; CSGO economy specifics don't transfer.
- **Buy-type imbalance:** rare buy types (Hero variants) have thin support for the counterfactual estimates.
- **Meta stability:** the time-ordered split assumes the game meta is stable across 2020–2021; patch changes could invalidate it.
- External validity to NFL: the economy mechanic is CSGO-specific; only the *methodological template* (decision valuation via win-probability deltas + a decision-quality error metric) transfers.

## 10. GSE overlap
Per `existing-research-map.md`, GSE already has deep win-probability foundations (nflWAR 1802.00998, EP-as-probability-vector, iWinRNFL 1704.00197, 4th-down WP models with the full correction literature, WPA waterfalls). A game-level WP model per se is therefore **duplicative**. What is **new** is the *decision-valuation template*: value each coaching decision by the win-probability delta between the actual and optimal choice, and aggregate into a team-level decision-quality metric (OSE-analog). The repo has 4th-down go-for-it estimates (ngreenberg 2002–2026) but no systematic "decision quality" metric across decision types. This paper is an **extension** supplying that template — with its causal flaws flagged as the thing GSE must fix.

## 11. GSE implementation spec
- **Data:** nflverse play-by-play 2020–2025 + a win-probability model (existing nfl4th-style WP or GSE's own).
- **Adaptation (fixing the paper's causal flaw):** restrict counterfactual substitution to game states with **overlap** — only evaluate decisions where both the actual and candidate choices are observed with adequate support (propensity-trimmed). Decision types: 4th-down go/kick, 2-point conversions, timeout usage, challenges. For each, compute the WP delta (optimal − actual) per occurrence and aggregate to a team-season "Decision Quality Error" (DQE, the OSE analog — defined explicitly as a mean, fixing the paper's sum/mean ambiguity).
- **Serving:** offseason coaching-decision report + weekly "decision cost" tracker; feeds the edge-sheet narrative ("coaching decisions cost Team X ~Y wins").
- **Effort:** 2–3 engineer-weeks (WP model exists; work is the overlap-trimmed counterfactual harness + DQE aggregation).

## 12. Reproducible test
On 2022–2024 NFL seasons: implement the overlap-trimmed DQE for 4th-down decisions only. Compute per-team-season DQE and test two things: (a) **stability** — correlation of team DQE across consecutive seasons (a decision-skill metric should be stickier than luck; target r ≥ 0.3); (b) **predictive validity** — does DQE add explained variance to next-season win total over EPA/play + turnover luck in a regression (target: significant positive coefficient, ΔR² ≥ 0.02). Baseline: the untrimmed (paper-style) version, which should show worse stability — demonstrating the causal fix matters.

## 13. Acceptance / rejection gate
**Adopt** the DQE metric into the coaching-decision product iff the trimmed version achieves cross-season stability r ≥ 0.3 AND adds ΔR² ≥ 0.02 to next-season wins over the EPA/luck baseline on 2022–2024 data. **Reject** (keep decision analysis descriptive, not metricized) if DQE is unstable (r < 0.2) or adds nothing — in which case the paper's OSE-style aggregation doesn't survive the overlap trimming, and per-decision WP deltas remain a narrative tool only.

## 14. Improvement experiment
Go beyond the paper's single-decision substitution: model **decision sequences** — a 4th-down go decision changes the downstream game state, which the paper's round-independent substitution ignores. Implement a lightweight game-tree (2–3 plies: decision → outcome distribution → next decision point) and value decisions by full expected-WP rather than myopic round-WP. Test whether tree-valued 4th-down decisions disagree with myopic WP-delta valuations in ≥10% of cases and whether the tree version has better cross-season stability — if so, GSE's DQE supersedes the paper's OSE methodologically, not just in domain.
