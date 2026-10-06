# [1736] Overinference from Weak Signals and Underinference from Strong Signals (arXiv:2109.09871)

**Citation:** Ned Augenblick, Eben Lazarus, Michael Thaler (2021). *Overinference from Weak Signals and Underinference from Strong Signals*. arXiv:2109.09871. URL: https://arxiv.org/abs/2109.09871
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to text, 38,394 words).
**Verdict:** ADAPT — the DGP-agnostic movement-vs-uncertainty-reduction test (E[M] = E[R] under Bayesian updating) plus the empirical finding that sports-betting markets overreact early (weak signals) and underreact late (strong signals), with the NBA crossover at the end of the third quarter, gives GSE a directly implementable in-game mispricing detector; adapt the excess-movement statistic to NFL live odds.

## 1. Research question
Do people (and markets) overreact to weak information and underreact to strong information? The paper formalizes a model where agents know a signal's direction but are insensitive to its strength — updating by an "intermediate" amount — which generates overinference from weak signals and underinference from strong signals. It tests this across four environments: lab experiments (bookbag-and-poker-chips), a naturalistic NBA experiment, sports betting markets, and S&P 500 options markets.

## 2. Dataset / schema
- **Lab:** Studies 1a/1b — 500 participants each, bookbag-and-poker-chips paradigm with a wide range of signal strengths (diagnosticity p from weak to strong); Study 1b varies priors.
- **Naturalistic experiment:** 500 basketball fans, sequences of events over four quarters of hypothetical NBA games; signal strength varied via game situation (early-quarter baskets = weak, late-quarter = strong); win probabilities from the Inpredictable NBA calculator (stats.inpredictable.com/nba/wpCalc.php), cross-checked against the authors' own calculator.
- **Sports betting:** Betfair transaction prices, 2006–2014, five sports (soccer, basketball, baseball, ice hockey, American football); **>5 million transactions across ~260,000 events**; first transaction per minute kept; trades <1% of average transacted amount dropped; in-play only; contract closest to 0.5 prior used.
- **Finance:** S&P 500 index options, daily, ~20-year span; option-implied beliefs about future index value.
- **Simulations:** 1M replications of a random-walk-like game DGP (T=27 periods) for the four updating models.

## 3. Method / model
- Theory: perceived signal strength Ŝ = k·S^β with β ∈ (0,1) (estimated k=0.88, β=0.76 from Study 1a); overinference when S < S* = k^{1/(1−β)}, underinference above.
- **Proposition 2 (Movement and Uncertainty Reduction):** for a Bayesian, expected belief movement M_{t1,t2} = Σ squared belief changes must equal expected uncertainty reduction R_{t1,t2} = drop in perceived variance (u_t(π) = (1−π_t)π_t), *regardless of the DGP*. Excess movement (M − R > 0) = overinference; M − R < 0 = underinference. This yields a DGP-agnostic statistical test of Bayesian updating.
- Empirical: aggregate movement and uncertainty reduction in 24 time windows (each 1/24 of average game length) per sport; compare the two series over game time (signal strength proxied by time to maturity).

## 4. Equations & assumptions
- Perceived strength: Ŝ(ŝ) with E[Ŝ|s] ≥ S ⟺ S ≤ S* ≡ k^{1/(1−β)}; β ≡ σ_S²/(σ_S² + σ_e²) ∈ (0,1); k ≡ exp(β²σ_e²/2)·Ŝ(sd)^{1−β}.
- Uncertainty: u_t(π) ≡ (1−π_t)π_t; uncertainty reduction R from t1 to t2 = u_{t1} − u_{t2} (expected).
- Proposition 2: E_{t1}[M_{t1,t2}] = E_{t1}[R_{t1,t2}] for any DGP under Bayesian updating.
- Excess movement = M − R; test = means test of average excess movement ≠ 0.
- Simulation calibration: T=27 DGP; models: Bayesian, underinference (0.8·S), overinference (1.2·S), paper's model (k=0.88, β=0.76).
- Assumptions: market prices interpretable as average beliefs (valid under log utility/static trading; with speculative trading prices may overreact vs individual beliefs — the authors argue within-environment time-variation comparisons remain directionally informative); signal strength increases monotonically as resolution approaches; the mapping from individual to market beliefs is stable within a game.

## 5. Features / target
Features: time-stamped belief/probability streams (lab answers, experimental win-prob estimates, Betfair implied probabilities, option-implied probabilities); game/event clock time. Target: excess movement statistic (M − R) per time window; the sign pattern (positive early → negative late) is the signature of the over/underinference model. Horizon: within-game/event (24 windows) and within-option-contract (daily to expiry).

## 6. Validation design
- Lab: randomized signal strengths, within-subject updating curves; monotonic perceived-strength check; heterogeneity analysis.
- Naturalistic: randomized game situations across quarters; tests the early-over/late-under prediction within the same sport.
- Markets: observational; 24-window aggregation per sport with 95% CIs; formal statistical tests of movement vs uncertainty reduction; simulation (1M reps) generates the predicted signature under each model for visual/formal comparison.
- Finance: same test on ~20 years of daily option-implied beliefs; time-to-expiry as the signal-strength proxy.

## 7. Numerical results / baselines
- **Sports (all five):** movement > uncertainty reduction early in games; movement drops below uncertainty reduction late — for basketball the crossover is at **the end of the third quarter**, mirroring the experimental Study 2 switch. Four of five sports stay negative after crossing (hockey returns only in the final period).
- **Options:** very little daily uncertainty reduction until a few weeks before expiry, but beliefs move back and forth (positive excess movement); within two weeks of expiry the relationship reverses (movement ≤ uncertainty reduction). Total movement averaged over a contract is too high (excess movement, matching Augenblick & Lazarus 2023).
- **Lab:** robust underinference for strong signals (diagnosticity p ≥ 2/3, consistent with prior literature); overinference for weak signals (novel); average perceived strength rises monotonically with true strength; fitted β = 0.76, k = 0.88.
- **Scale:** >5M transactions / ~260k events (sports); ~20 years daily options; 1M simulation reps; 500 participants per experiment.

## 8. Code / data availability
None stated — no public code or data artifact identified. Betfair data used is the same sample as Augenblick & Rabin (2021).

## 9. Leakage & limitations
- The market test is joint: it tests Bayesian updating *and* the prices-as-beliefs interpretation together; speculative trading can generate excess movement even if individuals are Bayesian (authors acknowledge; Martin & Papadimitriou 2022).
- Signal strength is proxied by time to maturity — a monotone proxy, not a direct measure; any time-varying microstructure confound (e.g., changing trader composition late in games) could mimic the pattern.
- Betfair 2006–2014 data is dated; market structure (APIs, colocation, market-maker participation) has changed substantially.
- American football is included but the paper's figures emphasize basketball; NFL-specific (discrete-down, low-scoring) dynamics may differ.
- No out-of-sample trading test: the paper documents the bias, it does not build a profitable strategy.

## 10. GSE overlap
Existing map: market microstructure lane tracks line movement/steam and CLV; no in-game over/underreaction model exists in the repo (existing-research-map.md). GSE's live-betting and CLV work treats line moves symmetrically; this paper says early moves are systematically *too big* and late moves *too small* — a directional, time-dependent bias with an empirical crossover point. New capability: a clock-aware in-game mispricing signal. Complements ledger 1730 (which gives a variance-scaled surprise score) with a *signed* bias prediction.

## 11. GSE implementation spec
- **In-game excess-movement monitor:** for NFL live markets (spread/moneyline/total implied probs from a live odds feed), compute rolling movement M and uncertainty reduction R in game-clock windows (e.g., per quarter or per 5-minute block); compute excess movement M − R. Early game (Q1–Q2): fade moves (expect reversal — overinference); late game (Q4): follow moves (expect continuation — underinference).
- Calibrate the crossover point on NFL data (the paper's NBA crossover ≈ end of Q3; NFL's discrete scoring may shift it).
- Effort: ~1–2 weeks (live odds ingestion already partially exists per ODDS_VS_STATS.md; the statistic is simple arithmetic + a calibration backtest).

## 12. Reproducible test
Dataset: NFL in-play odds history (any season with sub-quarter resolution; Betfair historical data or a live-odds vendor archive), 2024 season. Metric: excess movement per quarter; then a trading rule — fade Q1–Q2 moves, follow Q4 moves — evaluated on CLV vs the pre-move price. Baseline: no-fade/no-follow (always take the move at face value). Pass if the fade-early/follow-late rule improves CLV by ≥1.5pp over baseline with ≥300 game-quarters.

## 13. Acceptance / rejection gate
ADAPT is confirmed if, on 2024 NFL in-play data, excess movement is significantly positive in Q1–Q2 and significantly negative in Q4 (t-test, p < 0.05), AND the fade-early/follow-late rule beats the baseline on CLV. REJECT the in-game application if the sign pattern does not replicate in NFL data (e.g., excess movement flat across quarters) — then the bias is a basketball/continuous-sport phenomenon and GSE should not trade on it.

## 14. Improvement experiment
Condition the test on score differential: the paper's proxy (time) conflates signal strength with game state. Split NFL game-minutes into high-leverage (score within one possession) vs low-leverage and test whether the over/underinference pattern is stronger in high-leverage minutes — hypothesis: the bias scales with *leverage-weighted* signal strength, not clock time. If confirmed, GSE's live model should weight in-game market signals by leverage, fading low-leverage early moves hardest.

**Verdict:** ADAPT — the movement-vs-uncertainty-reduction test with the early-over/late-under signature (NBA crossover end of Q3; >5M Betfair transactions) gives GSE a clock-aware in-game mispricing detector; replicate the sign pattern on NFL live odds before trading it.
