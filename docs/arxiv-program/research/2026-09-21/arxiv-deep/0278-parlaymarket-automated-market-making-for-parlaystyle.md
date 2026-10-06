# [0278] ParlayMarket: Automated Market Making for Parlay-style Joint Contracts (arXiv:2603.22596)

**Citation:** Ranvir Rana, Viraj Nadkarni, Niusha Moshrefi, Pramod Viswanath (Kaleidoscope Blockchain, Princeton University, 2026). *ParlayMarket: Automated Market Making for Parlay-style Joint Contracts*. arXiv:2603.22596. URL: https://arxiv.org/abs/2603.22596
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 8,501 lines, sequential, including §7 conclusion/limitations, all 22 references, Appendix A RFQ details, Appendix B proofs, Appendix C replay pipeline, and conversion footer).
**Verdict:** ADAPT — GSE is not a market maker, so the AMM mechanism itself does not transfer. What transfers is the paper's core statistical machinery: a pairwise exponential-family (Ising) model that produces **coherent joint probabilities over correlated events in O(M²) state**, plus the insight that parlay-style order flow is a direct signal for learning dependence. For GSE this unlocks (a) coherent same-game-parlay edge detection against sportsbook SGP prices, (b) portfolio-level risk for correlated multi-pick slates (probability all legs hit, joint drawdown), and (c) inferring market-implied correlations from public parlay handle. The existing corpus has no joint-dependence modeling of correlated bets — this fills that gap.

## 1. Research question
Can an automated market maker support parlay-style joint contracts (2^M possible outcomes over M binary events) within a unified liquidity pool, with coherent pricing across base and joint contracts, bounded loss, and online learning of dependence — without exponential state or capital? The authors answer yes via **ParlayMarket**: represent the joint distribution with a pairwise exponential-family (Ising) model, price every contract as a marginal of that model, and update parameters online from trade flow (including shadow trades that propagate information across markets).

## 2. Dataset / schema
- **Synthetic:** M ∈ {4,…,9} correlated binary assets from a Gaussian score model (ρ = 0.3); N_M = 2^M − 1 parlay markets traded uniformly; informed + noise traders (noise fraction α); 100 independent runs; step sizes η_h = η_J = 0.2.
- **Empirical RFQ audit:** Kalshi combo/parlay RFQ quotes (sample from 2026-02-03, 16 days): 220,746 native trades; spreads on 999 base markets (5.12¢) vs. 549 combo markets (11.89¢); 33 near-independent two-leg combos (NBA × ATP tennis) with best-quote comparisons.
- **Historical replay:** Kalshi NBA slate 2026-03-07 — 732 base markets across 6 games, 5,918 listed combo tickers (2–10 legs), 3,710 candle updates + 5,436 executed parlay trades replayed chronologically; one Ising model per game cluster, loopy belief propagation, learning rates η_θ = 0.1, η_W = 0.01, LMSR liquidity b = 10,000; fee-bias correction via complement rule + inclusion–exclusion.
- **Schema:** binary events X_i ∈ {0,1}; contracts f_S(x) = ∏_{i∈S} x_i (eq. 1); prices p_S(φ) = E_{P_φ}[f_S(x)] (eq. 2).

## 3. Method / model
- **Belief state:** Ising model P_φ(x) ∝ exp(Σ_i θ_i x_i + Σ_{i<j} W_ij x_i x_j) (eq. 11) — the maximum-entropy distribution matching first and second moments; O(M²) sufficient statistics (E[X_i], E[X_iX_j]); prices via belief propagation.
- **Update:** each trade on market m treated as cross-entropy error; SGD on the composite pseudo-likelihood ℒ(φ) = Σ_i λ_i CE(p_i*,p_i^φ) + Σ_{i<j} λ_ij CE(p_ij*,p_ij^φ) (eq. 12): φ_{t+1} = φ_t − η∇_φ CE(p_m*, p_m^{φ_t}) (eq. 13). **Shadow trades**: internal bookkeeping entries on related markets after each real trade, propagating information without separate capital.
- **Trader model (§3.2):** correlated arithmetic Brownian scores dS_i = σ_i dW_i, Cov(dW_i,dW_j) = ρ_ij dt (eq. 3); informed traders submit exact conditional probabilities (univariate Φ for base, multivariate-normal orthant probabilities for parlays); noise traders observe S̃ = S + ε; noise fraction α.
- **Design objectives (§3.4):** Property 1 liquidity consistency (comparable price impact across contracts, eq. 4); Property 2 bounded loss E[L_T] = o(2^M), ideally O(M) (eq. 5), VaR_0.95 likewise (eq. 7); Property 3 information aggregation D_KL(P*‖P_{φ_T}) ≤ ε for T = O(n) (eq. 8).
- **Baselines analyzed (§4):** RFQ protocol (trilemma: at most two of liquidity consistency / information aggregation / bounded loss); independence AMM q_ind = ∏p̂_i (eq. 10) — unbounded loss under correlation, cannot learn dependence.

## 4. Equations & assumptions
Equations (numbers as in paper):
- **(1)** f_S(x) = ∏_{i∈S} x_i. **(2)** p_S(φ) = E_{x∼P_φ}[f_S(x)].
- **(3)** dS_i(t) = σ_i dW_i(t), Cov(dW_i,dW_j) = ρ_ij dt; S_T|S_t ∼ N(S_t, Σ), Σ_ij = ρ_ijσ_iσ_j(T−t); X_i = 1[S_i(T) > K_i].
- **(11)** P_φ(x) ∝ exp(Σ_i θ_i x_i + Σ_{i<j} W_ij x_i x_j).
- **(12)** ℒ(φ) = Σ_i λ_i CE(p_i*,p_i^φ) + Σ_{i<j} λ_ij CE(p_ij*,p_ij^φ); **(13)** φ_{t+1} = φ_t − η∇_φ CE(p_m*, p_m^{φ_t}).
- **(14)** μ_eff ≥ μ + Σ_{k≥3}Σ_{S∈S_k} λ_S μ_S (parlay curvature boost).
- **Theorem 1:** E‖φ_t − φ*‖² ≤ (1−2ημ)^t‖φ*‖² + ησ²/(2μ), η ≤ 1/(2L); with η=0.2, μ≈1/4, contraction 0.9/round (~22 rounds for 10× reduction).
- **Proposition 1:** ℒ is μ-strongly convex on Φ_B; at φ=0, μ=3/16 (interaction), Λ=1/4 (bias), κ=4/3.
- **Lemma 1:** b·KL(p_S*‖p_S^φ) ≤ (bΛ_S/2)‖φ−φ*‖² (loss quadratic in parameter error).
- **Proposition 2:** E[L_T] ≤ L_transient + T·L_ss,round; L_transient = O(bρ²M²/η), L_ss,round = O(bη); mean per-market loss ℓ̄_M = O(bη/2^M) — halves per added market.
- **Proposition 3:** higher-order parlays raise μ_eff, accelerate convergence, tighten cumulative regret to O(log T); interaction-weight curvature gain O(ρ^{−2}) at small ρ.
- Assumptions: binary events; pairwise (Ising) family adequate (higher-order dependence treated as misspecification floor); traded contracts pre-expressed in coherent binary form (§7 limitation — mutually exclusive outcomes need a structural preprocessing layer); informed-trader flow sufficient to identify interactions (without parlay flow the Ising model is the *worst* non-oracle performer, §6.2).

## 5. Features / target
- Inputs: trade stream (market id, direction/size or target price), candle mid-prices for field initialization (θ_i = logit(median p_it), W_ij = 0).
- Targets: posted prices p_S^φ for all N_M contracts; learned (θ, W); LP portfolio PnL/Sharpe in replay.

## 6. Validation design
- **Synthetic (§6.1):** complete-parlay loss scaling M=4..9, ρ=0.3, 100 runs; baselines: true oracle, independent LMSR, pairwise oracle, Gaussian oracle. Metrics: mean per-market LMSR loss ℓ_M, CVaR_95, price MAE convergence (Fig. 5).
- **Ablation (§6.2):** same but informed traders restricted to base markets only — model ranking completely reverses.
- **Noise robustness (§6.3):** α ∈ [0,1], M=9 extrapolated from M∈{3,4,5}.
- **RFQ audit (§4.1, App. A):** spread comparison; Fréchet-bound violation test on 33 near-independent combos (13/33 = 39% violate P(A∩B) ≤ min(P(A),P(B))); quote-aggregation gain (0.19¢).
- **Historical replay (§6.4, App. C):** two execution settings (full-market emulation vs. standalone MM); market-competitive filter; strategies: Kalshi execution, independence, standalone MM (θ_corr), full AMM; metrics: accepted trades, MM win rate, net PnL, Sharpe.

## 7. Numerical results / baselines
- **Loss scaling (Table 3, Fig. 4):** per-market loss halves per added base market (ℓ_{M+1}/ℓ_M ≈ 0.49–0.50); ℓ_M·2^M ≈ 0.15 constant for M=4..9 — aggregate loss flat, polynomial not exponential. ParlayMarket is the only non-oracle model whose loss decays with M; at M=9 the independent LMSR, pairwise oracle, Gaussian oracle reach ≈2.24, 0.66, 0.93 per round.
- **Parlay necessity (§6.2, Fig. 6):** without parlay flow the ranking reverses — ParlayMarket has the *highest* non-oracle loss while independent LMSR/oracles cluster at ≈0.02–0.06. Parlays are the primary information channel for dependence learning, not just extra products.
- **Noise (§6.3, Fig. 7):** ParlayMarket remains the best non-oracle model across all α; break-even crossed only at high noise fractions.
- **RFQ audit:** combo spreads 11.89¢ vs. 5.12¢ base (Table 1); 39% of near-independent combo quotes violate the Fréchet upper bound — some by 5.7× (Table 6); aggregating 4.5 quotes/maker tightens spreads by only 0.19¢ (Table 7).
- **Kalshi replay (Table 4):** standalone MM (θ_corr): 3,973 accepted trades, 86.8% win, $113,984.58 PnL, **Sharpe 1.0049** — best risk-adjusted non-native strategy; Kalshi execution: 5,436 trades, $244,190.77, Sharpe 0.7151; full AMM: $158,577.66, Sharpe 0.7062. Fee-bias correction essential (without it parlay loss flat, revenue lower).
- **LP backtest (Table 2):** native execution 220,746 trades, 82.0% win, $591,485.31 PnL, 52.35% ROI, Sharpe 0.2177; independence baseline 144,545 trades, $347,782.44, 45.34%, 0.1831.

## 8. Code / data availability
- No public code/data release stated in the paper; Kalshi data via Kalshi; methods reference Paradigm's pm-AMM [19]. Theoretical results are fully specified (algorithms + proofs in Appendix B).

## 9. Leakage & limitations
- **Pairwise ceiling:** the Ising family cannot represent higher-order dependence; convergence is to the best pairwise approximation (I-projection), with a misspecification floor the paper does not quantify empirically.
- **Parlay-flow dependence:** without joint-contract flow the model is worse than independence — GSE cannot assume the mechanism learns correlations from marginal data alone.
- **Structural preprocessing required (§7):** contracts must be pre-expressed as coherent binaries; mutually exclusive outcomes (∑X_i = 1) need a separate structural layer — directly relevant to NFL (win/loss, cover/no-cover are exclusive).
- **Replay scope:** one NBA slate (2026-03-07), 16-day RFQ sample; the standalone-MM edge is risk-adjusted, not absolute PnL (Kalshi execution earned more dollars).
- **Sportsbook SGPs are RFQ-like:** the paper's RFQ trilemma and 39% Fréchet-violation finding describe exactly how retail sportsbook same-game parlays are priced — wide spreads, incoherent joint pricing, no dependence modeling.
- For GSE: NFL legs are not binary-incoherent-free (spreads have pushes; totals have pushes; player props correlate through game script); the Ising mapping needs the §7 structural layer for these.

## 10. GSE overlap
- **Fills a corpus gap:** the existing map has Bradley–Terry, Elo/Glicko/TrueSkill, market-implied ratings, and CLV — all marginal/single-outcome machinery. Nothing in the corpus models **joint dependence across correlated bets**. This is the first paper giving GSE a principled joint-probability layer.
- **Directly adjacent to paper 6 (0274):** that paper benchmarks model probabilities against Polymarket; this paper supplies the joint-distribution machinery to price the multi-leg structures (parlays/SGPs) those markets and sportsbooks actually sell.
- **Complements paper 9 (0277):** OO-EPC/FL-GLM give better marginal q; ParlayMarket's Ising layer turns better marginals into coherent joint probabilities — the two compose.
- The Kalshi RFQ findings (incoherent combo pricing, 39% Fréchet violations) mirror retail sportsbook SGP pricing, which GSE already tracks in its market-microstructure notes — this paper explains *why* those mispricings exist and how to exploit them.

## 11. GSE implementation spec
- **SGP edge detector:** for each slate, build the Ising joint model over the game's binary legs (spread cover, total over, key player props binarized); initialize fields from GSE's marginal probabilities (θ_i = logit(p_i), W = 0); price every sportsbook SGP coherently via belief propagation; flag SGPs where the book's price exceeds the coherent joint probability beyond the paper's fee-bias correction — the 39% Fréchet-violation rate on Kalshi suggests retail SGP mispricing is common enough to be a real edge source.
- **Correlated-slate portfolio risk:** before publishing multi-pick slates/parlays, compute the joint hit probability and joint drawdown distribution from the Ising model instead of multiplying marginals (the independence fallacy the paper proves is loss-unbounded). Use it to size SGP/parlay stakes and to cap same-game correlated exposure.
- **Market-implied correlation inference:** invert the paper's learning direction — use observed SGP price deviations from independence-implied prices to back out the market's implied pairwise correlations (W_ij), and compare against GSE's own dependence estimates; persistent gaps are either GSE edge or model error, adjudicated by backtest.
- **Structural layer first (§7):** implement the mutually-exclusive-outcome normalization (win/loss, cover/push/no-cover) before fitting any joint model.
- **Effort estimate:** 2–3 weeks for the SGP pricer + portfolio risk module (Ising fitting via the paper's SGD or standard logistic-regression structure learning [18]); belief propagation is off-the-shelf.

## 12. Reproducible test
- **Dataset:** one full NFL season of SGP offerings (legs, book SGP prices, outcomes) for a single sportsbook + GSE marginal probabilities for each leg.
- **Protocol:** (a) compute independence-implied joint prices (∏p_i) and Ising coherent prices; (b) test Fréchet-bound violations in book SGP prices (paper's Table 6 protocol); (c) backtest: bet the coherent-model edge (book price > model joint prob + margin) with flat stakes; metric: ROI, Sharpe, and calibration of joint probabilities.
- **Baselines:** independence pricing; the sportsbook's own SGP price as the null.

## 13. Acceptance / rejection gate
- **Adopt the Ising SGP pricer** if, on the backtest season: (a) book SGP prices violate Fréchet bounds or deviate from coherent joint prices at a rate comparable to the paper's Kalshi findings; (b) the coherent-edge betting rule is profitable after a realistic fee/spread haircut with positive Sharpe; (c) joint-probability calibration (binned predicted vs. realized joint-hit rate) passes a Hosmer–Lemeshow-style check.
- **Reject** if SGP deviations from coherent prices are small (the book already prices dependence well) or the edge backtest is flat/negative — then the independence approximation is adequate and the joint machinery is unnecessary complexity. Also reject if the W_ij estimates are unstable week-over-week (dependence not learnable at GSE's data scale — the paper's §6.2 warning).

## 14. Improvement experiment
The paper learns W_ij from parlay *trade flow*; GSE has no trade flow but has something the paper lacks — **game-script-conditioned dependence**. Run an experiment fitting the Ising interactions conditionally on game state: W_ij estimated separately for (a) all games pooled vs. (b) stratified by expected game script (high-total vs. low-total games, large vs. small spreads). The hypothesis is that player-prop/spread/total correlations are regime-dependent (e.g., QB passing props correlate positively with opponent spread-covering in shootouts, negatively in defensive games), so a script-conditioned Ising model prices SGPs more accurately than the pooled model. Test on the backtest season: compare log-loss of joint outcomes and edge-betting ROI between pooled-W and script-conditioned-W. If the conditioned model wins significantly, GSE gets a dependence model tuned to football structure that a generic market-making paper could never build; if not, the pooled model stands and dependence is effectively stationary.
