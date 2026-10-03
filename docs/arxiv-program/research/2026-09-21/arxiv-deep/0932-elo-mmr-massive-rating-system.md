# [0932] An Elo-like System for Massive Multiplayer Competitions (arXiv:2101.00400)

## Citation / full-text source

- arXiv:2101.00400 — full text: https://arxiv.org/pdf/2101.00400
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Aram Ebtekar, Paul Liu (2021). *An Elo-like System for Massive Multiplayer Competitions*. arXiv:2101.00400 [cs.GT]. URL: https://arxiv.org/abs/2101.00400
**Ledger completed:** 2026-09-21. **Read:** full text (cached arXiv HTML, complete).

## 1. Research question
How to build a Bayesian rating system for competitions with thousands of ranked participants (programming contests, obstacle races) that is (a) accurate, (b) fast at massive scale, (c) incentive-aligned (no reward for intentional underperformance), and (d) human-interpretable — with all properties rigorously proved, unlike TrueSkill (unproven) or Codeforces/TopCoder (ad hoc, exploitable)?

## 2. Dataset / schema
Four datasets, mined from each source's inception to 2020-10-12, plus open-source code and data at https://github.com/EbTech/EloR/:
- **Codeforces:** 1087 contests, avg 2999 participants/contest; platform has 850K+ users, 300K+ rated. Ranked by contest points.
- **TopCoder:** 2023 contests, avg 403 participants; 1.4M total users. 75-minute, 3-problem rounds.
- **Reddit SubredditSimulator:** top-1000 most-upvoted threads; bots as competitors, avg 20/thread.
- **Synthetic:** 10K players, Gaussian generative model; initial skills mean 1500 variance 300; performance variance 200; per-round skill increments variance 35; 50 rounds, all players compete every round.
- Players with <5 total contests excluded from metrics (authors note this reduced their method's measured advantage).

## 3. Method / model
**Elo-MMR** (Massive, Monotonic, Robust): principled approximation of a TrueSkill-like Bayesian model in the |P_t| → ∞ limit, where Doob's consistency theorem lets performances be treated as observed.
- **Phase 1 (performance estimation):** estimate each player's round performance as the unique zero of Q_i(p) = Σ_{j≻i} l_j(p) + Σ_{j∼i} d_j(p) + Σ_{j≺i} v_j(p) (Theorem 3.3), weighting wins/losses/ties by opponent-strength functions. Solved by binary search / Illinois / Newton.
- **Phase 2 (belief update):** MAP of posterior ∝ Gaussian prior × per-round logistic factors, i.e., minimize L(s) = L_2((s−p_0)/β_0) + Σ_k L_R((s−p_k)/β_k), L_2(x) = x²/2, L_R(x) = 2 ln(cosh(πx/√12)). This yields a robust weighted average with weights w_k (eq. 7) that vanish for extreme performances.
- **Skill evolution:** Elo-MMR(ρ) pseudodiffusion — continuous transfer/decay of factor weights with κ = (1 + γ_t²/σ_{t−1}²)^{-1}, w_0^new = κw_0 + (κ−κ^{1+ρ})Σw_k, w_k^new = κ^{1+ρ}w_k. ρ∈(0,∞) provably satisfies six properties (Theorem 4.1). Gaussian-only variant is Elo-MMχ (no robustness).
- **Optimizations:** adaptive opponent subsampling (O(1/ε²) nearest-rated opponents suffice), history compression (old logistic factors → moment-matched Gaussians), embarrassingly parallel (O(1) memory overhead per thread).

## 4. Equations & assumptions
- Joint: Pr(S,P,E) = ∏_i Pr(S_{i,0}) ∏_{i,t} Pr(S_{i,t}|S_{i,t−1}) ∏_{i,t} Pr(P_{i,t}|S_{i,t}) ∏_t Pr(E_t|P_{:,t}) ...(1)
- Rating: μ_{i,t} := argmax_s π_{i,t}(s)·Pr(P_{i,t}|S_{i,t}=s) ...(3); prior π_{i,t}(s) := Pr(S_{i,t}=s|P_{i,<t}) ...(2)
- l_i(p) = d/dp ln(1−F_i(p)) = −f_i(p)/(1−F_i(p)); d_i(p) = f'_i(p)/f_i(p); v_i(p) = f_i(p)/F_i(p); l_i < 0 < v_i; Lemma 3.2: all strictly decreasing, l_i < d_i < v_i.
- Logistic special case: Q_i(p) = Σ_{j⪰i} −F_j(p)/δ̄_j + Σ_{j⪯i} (1−F_j(p))/δ̄_j; tie = win + loss (since d_j = l_j + v_j); δ̄_j = √3/π·δ_j; F_j(x) = 1/(1+e^{−(x−μ^π_j)/δ̄_j}).
- Robust average: μ_t = Σ_k w_k p_k / Σ_k w_k; w_0 = 1/β_0²; w_k = π/((μ_t−p_k)β_k√3)·tanh((μ_t−p_k)π/(β_k√12)) ...(7). w_k → 1/β_k² for typical performances, → π²/6× larger as |μ_t−p_k|→0, → 0 as |μ_t−p_k|→∞.
- Uncertainty: 1/σ_t² = Σ_{k∈{0}∪H_t} 1/β_k² ...(8); with fractional multiplicities: 1/σ_t² = Σ w_k, w_k = ω_k/β_k².
- Robustness bounds (Theorem 5.7): π/(β_t√3)·(1/β_0² + π²/6·Σ_{k∈H_{t−1}} ω_k/β_k²)^{−1} ≤ Δ± ≤ πβ_0²/(β_t√3), where Δ+ = lim_{p_t→+∞} μ_t−μ_{t−1}.
- Runtime: O(Σ_i(|P|+|H_i|) log log 1/ε) per round; with optimizations O(|P|/ε² · log log 1/ε); O(1/ε²) opponents for ε-precision.
- Metrics: pair_inversion(i,t) = #correctly predicted matchups/(|P_t|−1) × 100%; rank_deviation(i,t) = |actual_rank − predicted_rank|/(|P_t|−1) × 100%.
- Assumptions stated: performances deviations i.i.d., independent of skills; log-concave densities (Gaussian, logistic); |P_t| large; ties as exact-equal performances; β, γ, ρ domain hyperparameters; diffusion variance γ_t² ∝ time or constant-per-participation.

## 5. Features / target
Target: contest rank → implied pairwise win/loss/tie sets (E^L_{i,t}, E^W_{i,t}). No feature engineering; the model is pure rating dynamics on rankings.

## 6. Validation design
Grid search per (algorithm, dataset, metric) on the first 10% of each dataset; test on remaining 90%. Metrics: pair-inversion and rank-deviation, aggregated over all contestant-rounds. Baselines: Codeforces, TopCoder, and improved TrueSkill (Nikolenko et al. 2010) systems, all hand-coded in Rust with Rayon. Run on a 2.0 GHz 24-core Skylake, 24 GB RAM.

## 7. Numerical results / baselines
**Predictive accuracy (Table 2; bold = best):**
- Codeforces pair-inv: Codeforces 78.3%, TopCoder 78.5%, TrueSkill 61.7%, Elo-MMχ 78.5%, **Elo-MMR(ρ) 78.6%**; rank-dev: CF 14.9%, TC 15.1%, TS 25.4%, χ 14.8%, **ρ 14.7%**.
- TopCoder pair-inv: CF 72.6%, TC 72.3%, TS 68.7%, χ 73.0%, **ρ 73.1%**; rank-dev: CF 18.5%, TC 18.7%, TS 20.9%, χ 18.3%, **ρ 18.2%**.
- Reddit pair-inv: all 61.4–61.6% (tie); rank-dev: TrueSkill 27.2% marginally best, ρ 27.3%.
- Synthetic pair-inv: all 81.3–81.7% (essentially tied); rank-dev χ/ρ 12.8% best.
**Runtime, whole dataset in seconds (Table 3):** Codeforces — CF 212.9, TC 72.5, TS 67.2, χ 31.4, ρ 35.4 (χ ≈ 6.8× faster than the Codeforces production system); TopCoder — CF 9.60, TC 4.25, TS 16.8, χ 7.00, ρ 7.52; Reddit — CF 1.19, TC 1.14, TS 0.44, χ 1.14, ρ 1.42; Synthetic — CF 3.26, TC 1.00, TS 2.93, χ 0.81, ρ 0.85.
- Abstract's "entire Codeforces database of over 300K rated users and 1000 contests in well under a minute, beating the existing Codeforces system by an order of magnitude" vs Table 3's 35.4 s vs 212.9 s (6×, not 10×) — directionally consistent, magnitude slightly overstated. ρ∈[0,1] all gave very similar results in practice.
- TrueSkill collapsed on large rank counts (61.7% pair-inv on Codeforces vs 78.6%); authors note TrueSkill ≈ Elo-MMR when distinct ranks < ~60.

## 8. Code / data availability
Full open source: https://github.com/EbTech/EloR/ — all rating systems, datasets, and processing. Rust implementations.

## 9. Leakage
Chronological train/test split (first 10% tune, last 90% test) avoids lookahead. One subtlety: performance estimation in Phase 1 uses all opponents' prior ratings, which are themselves functions of past rounds only — no future leakage. Excluding <5-contest players may bias metrics toward established players.

## Limitations
- Designed for massive ranked fields; team competitions explicitly left as future work ("generalizing this approach remains an open challenge").
- Synthetic experiment confirms the model mostly on its home turf (all algorithms ≈ tied there).
- The 10× speedup claim vs the tabled 6×; Reddit dataset is a toy.
- β (performance scale), γ (diffusion), ρ (momentum) are domain hyperparameters with no NFL-tuned values.
- No uncertainty calibration of the ratings as probabilities — ratings are MAP point estimates; σ_t is an uncertainty proxy, not a calibrated probability.
- TrueSkill baseline used an "improved" third-party implementation; the poor TrueSkill result may partly reflect implementation, not the algorithm.

## 10. GSE overlap vs existing-research-map
- Repo inventories Elo, Glicko (mentioned), TrueSkill (mentioned), Bradley-Terry, Massey/Sagarin/Colley, nfelo — but no robust/heavy-tailed rating system and no pseudodiffusion time-decay has been read or built. This fills that hole.
- Connects to 0930 (this wave): the logistic heavy-tail performance model is the rating-system analogue of a luck model — extreme single-game performances get down-weighted automatically.
- Not duplicative of 1701.05976 (nested AR(1) state-space) — different mechanism (robust MAP + provable diffusion vs Kalman-style filtering).

## 11. Implementation spec (GSE adaptation)
- **Robust NFL team ratings (Elo-MMχ at team level, as the paper suggests):** treat each week as a "round" with 32 teams ranked by margin-of-victory vs spread (or by EPA/play differential) rather than binary W/L. Use the logistic performance model so a single 40-point blowout cannot move a rating more than the Theorem 5.7 bound. Steps: (1) build weekly team performance scores p_{i,t} = standardized (margin − spread) or EPA/play differential; (2) run Elo-MMR(ρ) updates weekly with γ scaled to offseason/preseason gaps (larger γ across season boundaries); (3) grid-search β, γ, ρ on 2015–2021, test 2022–2025.
- **Volatility caution:** the paper's documented Glicko-2/TopCoder volatility-farming exploit (intentional underperformance to amplify future gains) is a direct warning for any engine component that scales updates by recent variance — e.g., "hot team" momentum multipliers. Audit the engine for volatility-scaled updates.
- **Uncertainty propagation:** carry σ_t forward as the team-strength uncertainty into the calibration layer (replaces ad-hoc prior widths).
- Effort: 3–5 days using the open-source Rust/Python code as reference; port the logistic update (Algorithm 3) to the engine's Python stack.

## 12. Reproducible test
Dataset: nflverse 2015–2025, weekly team margin vs closing spread. Build Elo-MMR(ρ) team ratings (logistic) vs standard Elo (logistic regression on W/L, k=32) vs Glicko-style. Metric: log-loss of implied win probabilities on next-week games, walk-forward (tune 2015–2021, test 2022–2025). Baseline to beat: standard Elo log-loss. Success: Elo-MMR improves log-loss by ≥0.01 on 2022–2025 AND shows smaller week-over-week rating swings after blowout games (|margin−spread| > 21) than Elo — the robustness property, quantified as ≥30% smaller mean absolute rating change on those games.

## 13. Numeric gate
ADAPT confirmed if, on the 2022–2025 walk-forward test, Elo-MMR(ρ) team ratings achieve log-loss ≥0.01 better than baseline Elo with identical features AND reduce post-blowout rating swings by ≥30%. Reject if neither holds — the paper's machinery adds nothing over Elo for 32-team weekly binary outcomes.

## 14. Improvement experiment
The paper's pseudodiffusion uses a single global γ; make γ team- and context-dependent: larger γ for teams with new QBs/coaches (structural breaks), smaller γ for stable rosters. This is a hierarchical extension the paper does not attempt. Hypothesis: context-aware γ improves early-season (weeks 1–6) log-loss by ≥0.02 vs constant γ, because structural-break teams are exactly where static diffusion misprices uncertainty. Test on 2018–2025 seasons with a pre-registered "new QB or head coach" indicator.

## 15. Verdict

**ADAPT** — Elo-MMR's robust logistic-performance rating (bounded per-game rating changes, smaller caps for consistent teams) and its provable pseudodiffusion time-decay are directly adaptable to NFL team-strength ratings that must not overreact to single blowouts. The paper also documents the Glicko-2/TopCoder volatility-farming exploit (Pokemon Go) as a caution for any volatility-weighted engine component.
