# [1359] Manipulation in Prediction Markets: An Agent-based Modeling Experiment (arXiv:2601.20452v1)

**Citation:** Smart, B., Mark, E., Bastian, A., & Waugh, J. (2026). *Manipulation in Prediction Markets: An Agent-based Modeling Experiment*. arXiv:2601.20452v1 [econ.GN]. URL: https://arxiv.org/abs/2601.20452
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 26 pages incl. appendices, complete).
**Verdict:** ADAPT — the agent-based whale-manipulation model with its clean steady-state result (price distortion δ_S = ρΔ_S: distortion = whale's capital share × whale's valuation bias) and the ~40% capital threshold for meaningful distortion gives GSE a quantitative framework for two things it currently lacks: (1) detecting whale-distorted lines to avoid betting into manipulation, and (2) a fade-the-whale signal when distortion is identifiable; the election-market setting transfers to sportsbook/prediction-market line moves with re-parameterization.

## 1. Research question
Under what conditions can a highly resourced, biased minority — a "whale" — distort a prediction market's price, how large and persistent is the distortion, and how do herding, stubbornness, and learning rates among ordinary bettors amplify or dampen it? The authors build an open-source agent-based model (ABM) of a prediction market, derive steady-state and stability results, and run whale-injection experiments. (Secs. 1–3)

## 2. Dataset / schema
No empirical market data — simulation experiments on a stylized data-informed election outcome η_t. Baseline parameter set (Sec. 3.1.2): 100 betting agents with high expertise (0.95); homogeneous herding weights h_i ∈ {0, 0.25, 0.5, 0.75, 1} swept; single whale with fixed valuation above the true outcome, capital share ρ_w varied in 0.1 increments (whale budget ≈ 100·ρ_w/(1−ρ_w) × average non-whale budget). Model explored via a graphical user interface; source open on GitHub (Sec. 8.1, fn. 2).

## 3. Method / model
- **Agents** (Sec. 2): heterogeneous expertise (precision of noisy private signals about η_t), variable risk aversion, budget constraints, stubbornness (resistance to updating), bias (systematic valuation offset), and herding propensity h_i (weight placed on the market price vs private valuation).
- **Belief/market dynamics:** expected value update E[V̄_{t+1} − η_{t+1} | V_{i,t}, η_t] = w_i(1−h_i)s_i(V_{i,t} − η_t) + h_i·δ_t, where δ_t = m_t − η_t is the market-price error and w_i, s_i are expertise/learning weights; price aggregates agent valuations by budget-weighted influence.
- **Whale injection:** a single agent with large budget share ρ_w and fixed biased valuation W enters; experiments measure induced price error and its persistence under varying herding.
- **Theory:** steady-state analysis (m_{S+1} = m_S) yielding the distortion formula; AR(2) stability analysis of the error dynamics δ_{t+1} = (1−α)δ_t + α(V̄_t − η_t) (Sec. 8.1, eq. 11 context).

## 4. Equations & assumptions
- Steady state with δ_S := m_S − η_S (price error) and Δ_S := W − η_S (whale's valuation bias): **δ_S = ρΔ_S** (eq. 11) — steady-state price distortion equals the whale's share of market capital times its bias.
- Error dynamics as AR(2): δ_t expressed via δ_{t−1}, δ_{t−2} with coefficients in learning rate α, expertise weights w_i, herding h_i, stubbornness s_i (Sec. 8.1, eqs. 1250–1266); stability/oscillation conditions derived from the AR(2) characteristic roots.
- Belief update: E[V̄_{t+1}−η_{t+1} | V_{i,t}, η_t] = w_i(1−h_i)s_i(V_{i,t}−η_t) + h_iδ_t.
- Assumptions: single binary-outcome market; whale valuation fixed (non-adaptive); non-whale agents learn with fixed rates; market price = budget-weighted aggregate of valuations; no order-book microstructure or limits-to-arbitrage beyond budgets; election-style outcome process.

## 5. Features / target
Simulation study. "Inputs": agent population parameters (expertise distribution, herding weights, stubbornness, risk aversion, budgets), whale capital share ρ_w and bias Δ_S. "Outputs": market-price error trajectory δ_t, steady-state distortion, duration of distortion, stability classification.

## 6. Validation design
Computational experiments, not empirical validation: sweep ρ_w in 0.1 increments and h_i over {0, 0.25, 0.5, 0.75, 1}; measure induced price error (Fig. 3). Theory (steady state + AR(2)) corroborates the simulation patterns. No real prediction-market data (e.g., Polymarket) is used to calibrate or test the model — the election outcome is "data-informed" but stylized.

## 7. Numerical results / baselines
- **Whales need about 40% of total market capital (ρ_w ≈ 0.4) to induce meaningful error into market prices** under the stated parameter set (100 agents, expertise 0.95); below that, the market is resilient — "prediction markets exhibit meaningful resilience to manipulation by biased agents."
- Distortion magnitude scales with whale capital share (per δ_S = ρΔ_S); distortion *duration* increases with non-whale herding intensity and slow learning — herding agents propagate the whale's pressure instead of correcting it.
- With zero herding, the market "quickly adjusts to counteract the price pressure of whale bettors"; with high herding, biased-whale deviations are temporarily sustained.
- Minimum-budget threshold for inducing error varies across parameter sets (not a universal 40% — it is conditional on the expertise/herding configuration).

## 8. Code / data availability
Open source, available on GitHub: https://github.com/ebbam/power_prediction/ (model + graphical user interface for exploring dynamics). No empirical datasets.

## 9. Leakage & limitations
- No calibration to real markets: the 40% threshold is conditional on an arbitrary parameter set (100 homogeneous high-expertise agents); real sportsbook/prediction markets have very different participant structure, and the paper does not test robustness of the threshold across plausible calibrations.
- Whale is non-adaptive (fixed biased valuation) — real manipulators adapt to the market's response; the model likely understates sophisticated manipulation and overstates naive-whale persistence.
- Single-market, single-outcome setting: no cross-market arbitrageurs who would attack the distortion in real multi-book environments.
- Budget-weighted price formation is assumed, not derived from an order book; market-maker inventory dynamics are absent.
- The ABM has many free parameters (expertise, stubbornness, herding, risk aversion, learning rates) with no identification strategy from observable data.

## 10. GSE overlap
Garrett's corpus covers market microstructure and CLV (existing-research-map.md) but nothing on manipulation/whale-distortion modeling — no agent-based market-manipulation entries. GSE consumes sportsbook and prediction-market (Polymarket/Kalshi) prices as signals, and currently has no framework for asking "is this line move information or manipulation?" This is new defensive capability, complementary to the CLV work: CLV measures whether GSE beats the close; this measures whether the close itself was distorted.

## 11. GSE implementation spec
- **Whale-distortion detector:** re-parameterize the ABM for a sports betting market (agents = sharps/recreational/steam-chasers with heterogeneous expertise; whale = syndicate/steam group); calibrate herding/learning parameters from historical line-movement data (Pinnacle steam moves as the observable). For each significant line move, estimate the implied whale capital share ρ̂ and bias Δ̂ via the δ_S = ρΔ_S relation; flag moves where implied distortion exceeds a threshold as "likely manipulated — do not bet into."
- **Fade-the-whale signal:** when a flagged distortion is detected and the whale's position is identifiable (e.g., one-sided steam with no news), take the opposite side at the distorted price, sized by the estimated distortion magnitude — the model's own mean-reversion result (markets correct whale pressure absent herding) is the theoretical basis.
- **GSE-as-whale audit:** run GSE's own pick-release flow through the model to estimate how much GSE's public picks distort the markets it bets into (follower herding = h_i); use it to optimize release timing/sizing.
- Effort: 2–4 weeks to port the ABM, calibrate to line-movement data, and build the detector; the authors' GUI + code shortens this substantially.

## 12. Reproducible test
Dataset: Pinnacle (or a US book) opening→closing line history for one NFL season + GSE's pick log. Identify the largest 5% of line moves; for each, compute whether the move reversed (correction) or persisted through close. Test: do moves flagged by the calibrated detector as whale-driven reverse significantly more often than unflagged moves of the same size? Metric: reversal rate differential; gate on statistical significance (p < 0.05) with ≥3 points of reversal-rate gap.

## 13. Acceptance / rejection gate
ADAPT the detector if whale-flagged line moves reverse at a rate ≥10 points higher than size-matched unflagged moves on a full season of data AND the fade-the-whale paper portfolio is profitable after vig; otherwise REJECT the manipulation framing and treat all line moves as information (keep the existing CLV-based approach).

## 14. Improvement experiment
Make the whale adaptive: extend the ABM so the whale optimizes its bias trajectory Δ_t against the market's learning dynamics (a Stackelberg game: whale leads, crowd follows) instead of holding a fixed valuation — then solve for the optimal manipulation strategy and its detectability signature; test whether real flagged line moves match the optimal-manipulation signature better than the naive fixed-bias signature, which would both improve detection and quantify how much edge sophisticated manipulators extract.
