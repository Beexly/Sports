# [1370] Learning Performance of Prediction Markets with Kelly Bettors (arXiv:1201.6655v1)

**Citation:** Beygelzimer, A., Langford, J., & Pennock, D. (2012). *Learning Performance of Prediction Markets with Kelly Bettors*. arXiv:1201.6655v1 [cs.AI]. Short version in Proc. AAMAS 2012. URL: https://arxiv.org/abs/1201.6655
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 9 pages incl. discussion and references, complete).
**Verdict:** ADAPT — the fractional-Kelly-as-confidence-weighting identity (eq. 3: λ-fractional Kelly ≡ full Kelly with belief λp + (1−λ)p_m, with λ = t/(t+t₀) under a Beta prior) is the first principled half-Kelly rule in the corpus, and the wealth-weighted market price (Thm 1) plus the worst-case log-regret bound (Thm 3) give GSE a rigorous way to treat the consensus line as a Bayesian aggregate of Kelly bettors.

## 1. Research question
If every trader in a prediction market bets according to the Kelly criterion, how does the market price compare to the *best* trader's belief (not just the average), and what does fractional Kelly betting — widely used in practice for ad-hoc reasons — actually mean? (Secs. 1, 6)

## 2. Dataset / schema
Simulations (no real market data). Set-up: 100 agents, initial wealth w_i = 1/100, beliefs p_i ~ Uniform(0,1); binary event repeated over T = 150 periods with true probability π = 0.5 (full-Kelly experiment, Fig. 1) or π = 0.5 with Kelly fraction λ = 0.2 (fractional experiment, Figs. 2–3). Competitive-equilibrium market: auctioneer clears supply = demand at price p_m, agents are price takers.

## 3. Method / model
- Kelly demand in prediction-market form: optimal shares q*(p_m) = (w/p_m)·(p − p_m)/(1 − p_m) (eq. 1), maximizing expected log utility p·ln((1−p_m)q + w) + (1−p)·ln(−p_m·q + w).
- Competitive equilibrium: Σ_i q_i* = 0 ⇒ market price; two derivations (payout balance, log-utility maximization).
- Wealth dynamics tracked across rounds; regret measured in log loss: L = Σ_t [I(y_t=1)·log(1/p_t) + I(y_t=0)·log(1/(1−p_t))].
- Fractional-Kelly agents: invest λf* (λ < 1); algebra shows equivalence to full Kelly with shrunk belief.

## 4. Equations & assumptions
- **Kelly fraction (odds form):** f* = (b·p − (1−p))/b; prediction-market form f* = (p − p_m)/(1 − p_m); trade q* = f*·w/p_m (buy if q* > 0, sell/short if q* < 0).
- **Thm 1 (Market Pricing):** p_m = Σ_i w_i·p_i — the market price is the *wealth-weighted average* of agents' beliefs.
- **Prop 2:** with log-utility agents, the competitive equilibrium price equals eq. (2).
- **Thm 3 (worst-case log regret):** L ≤ min_i L_i + ln(1/w_i) for *all* prediction sequences and *all* outcome sequences, even adversarial — the market is at most ln(1/w_i) worse in log loss than the best participant.
- **Bayesian wealth update:** after outcome y, agent i's wealth ∝ posterior P(i|y) = p_i·w_i/Σ_j p_j·w_j — Kelly bettors redistribute wealth *exactly* according to Bayes' law.
- **Collective Bayesianity:** the market price tracks the observed frequency as if updating a Beta distribution (Fig. 1b: wealth vs belief fits Beta(10+1, 5+1) after 10/15 successes essentially perfectly); holds regardless of outcome order.
- **Fractional Kelly identity:** λ-fractional Kelly ≡ full Kelly with revised belief p_0 = λp + (1−λ)p_m (eq. 3) — a confidence-weighted mix of own belief and market belief; Bayesian justification λ = t/(t+t_0) where the agent has seen t trials and the market t_0 (Beta prior).
- **Thm 4 (fractional pricing):** p_m = (Σ_i λ_i·w_i·p_i)/(Σ_l λ_l·w_l) (eq. 4) — confidence-and-wealth-weighted average; a λ-fractional Kelly agent of wealth w bets exactly like a full-Kelly agent of wealth λw.
- **Discounted frequency:** fractional-Kelly markets converge to d_n = Σ_t γ^{n−t}1_{E(t)} / Σ_t γ^{n−t} (eq. 5); γ = 0.96 fits the λ = 0.2 simulation closely (Fig. 2).
- **Learning λ (§9):** experts-algorithm update of λ (increase when right, decrease when wrong) guarantees not doing much worse than the market or than full Kelly on one's own prior; regret bound implies allocating weight 0.5 to market caps worst-case wealth loss at half.
- Assumptions: price-taking agents; competitive equilibrium exists; no transaction costs; Kelly bettors only (non-Kelly agents' effects analyzed qualitatively in §10).

## 5. Features / target
Simulation inputs: agent beliefs p_i, wealths w_i, Kelly fractions λ_i, true frequency π. Targets: market price path p_m(t), wealth distribution, log-loss regret.

## 6. Validation design
No train/test — theorem + simulation. Fig. 1 (full Kelly): price tracks observed frequency over 150 periods; wealth histogram matches the Beta posterior. Fig. 2 (λ = 0.2): price is more volatile than frequency but matches discounted frequency with γ = 0.96. Fig. 3: wealth stays more dispersed than Beta(69+1, 81+1). No real-market validation.

## 7. Numerical results / baselines
- 100 full-Kelly agents, π = 0.5: market price tracks observed frequency "extremely closely" over 150 periods; Beta fit "essentially perfect."
- 100 λ = 0.2 agents: price converges to discounted frequency (γ = 0.96 hand-tuned) rather than raw frequency.
- Baseline note: in the ProbabilitySports contest, 99.7% of participants were beaten by the unweighted average predictor — cited as motivation for weighting the market heavily.

## 8. Code / data availability
None stated (simulations described but not released).

## 9. Leakage & limitations
- Price-taker + competitive-equilibrium assumptions are strong; the authors themselves note the no-trade-theorem tension (a fully rational agent sets λ = 0).
- Simulations use uniform random beliefs and a stationary π = 0.5 — far from real market belief distributions.
- γ = 0.96 in the discounted-frequency fit is hand-tuned, not estimated.
- Real prediction markets have non-Kelly participants; §10's analysis of that case is qualitative.

## 10. GSE overlap
Complements, not duplicates: no other corpus ledger connects Kelly betting to *market aggregation* — the wealth-weighted price (Thm 1), the regret bound (Thm 3), and especially the fractional-Kelly-as-confidence-weighting identity (eq. 3, λ = t/(t+t_0)) are all new. Ledger 0171 covers practical fractional Kelly but with ad-hoc justification; this paper supplies the missing theory.

## 11. GSE implementation spec
1. **Principled half-Kelly (the adapt):** replace the ad-hoc fractional-Kelly haircut with λ = t/(t + t_0) (eq. 3's Beta-prior justification): t = GSE's effective independent observations behind a pick's probability (calibration sample size), t_0 = the market's effective observations (estimate from line stability/volume). A pick backed by 200 engine games against a market reflecting ~800 observations gets λ = 0.2 — the theory, not a rule of thumb.
2. **Experts-algorithm λ learning:** maintain a per-market-type λ_t updated by the §9 experts rule (raise λ when the engine beats the closing line, lower it when it doesn't); guarantees bounded regret vs both the market and full Kelly.
3. **Consensus line as Bayesian aggregate:** treat the consensus/closing line as the wealth-weighted Kelly aggregate (Thm 1) — i.e., as the market's posterior — and use disagreement between GSE's p and p_m as the edge signal, with the Thm 3 regret bound as the worst-case justification for fading the market only when disagreement exceeds ln(1/w)-style tolerance.
4. Data: engine calibration history (for t), line-stability metrics (for t_0), closing lines. Effort: medium — a λ-estimation module feeding the sizing step.

## 12. Reproducible test
Dataset: GSE engine's 2024–2025 NFL picks with closing lines and the engine's calibration sample sizes. Compute λ_i = t_i/(t_i + t_0) per pick; backtest λ-scaled Kelly vs fixed 1/2-Kelly vs full Kelly on realized log-wealth growth and max drawdown. Separately backtest the experts-algorithm λ_t adaptation vs static λ. Backtest window: full 2024 + 2025 seasons.

## 13. Acceptance / rejection gate
ADOPT principled λ if it matches or beats fixed 1/2-Kelly log-wealth growth with lower max drawdown; REJECT if t_0 cannot be estimated stably (line-stability proxy varies > 2× across sportsbooks for the same game → fall back to the experts-algorithm λ_t only).

## 14. Improvement experiment
Combine with ledger 1369: weight the unpopularity premium by λ (confidence) so that faded-public-side stakes scale with GSE's relative information (t vs t_0); test whether the λ-weighted premium beats the unweighted premium on CLV and realized growth.
