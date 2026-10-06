# [0578] Stochastic analysis of the Elo rating algorithm in round-robin tournaments (arXiv:2212.12015v2)

**Citation:** Daniel Gomes de Pinho Zanco, Leszek Szczecinski, Eduardo Vinicius Kuhn, Rui Seara (2022/2023). *Stochastic analysis of the Elo rating algorithm in round-robin tournaments*. Digital Signal Processing. arXiv:2212.12015v2. URL: https://arxiv.org/abs/2212.12015v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7124 lines, incl. Appendices A–B derivations).
**Verdict:** ADAPT — the first closed-form theory for Elo's step size: an optimal K-factor formula β_{o,k} (Eq. 71), a convergence time constant τ1 (Eq. 59), and a hard improvement bound β<2v (Eq. 69). GSE should replace heuristic K-factor choices with these. Validated on 10 seasons of real league data, not just simulation.

## 1. Research question
Can the Elo update — treated as stochastic gradient descent on a logistic loss — be analyzed with adaptive-filter theory to yield closed-form expressions for the evolution of skill estimates, their mean-square deviation, and the mean loss, plus principled design rules for the step size β (Elo's only hyperparameter)?

## 2. Dataset / schema
- Theory: round-robin tournament, M teams, K games; scheduling vectors uniform over home/away pairings; true skills θ* ~ N(0, vI).
- Real data: Italian volleyball SuperLega, 10 seasons 2009/10–2018/19 (pandemic seasons excluded), M=12–15 teams, K=132–210 games/season, regular season only. Per-season estimates: η̂ (HFA) 0.06–0.77, v̂ (skill variance) 1.2–3.7 (Table 2).
- Step sizes tested: β=0.1 (FIFA/FIDE range), β=0.87 (optimal via Eq. 71 at k=K/4, averaged over seasons), β=2.49 (improvement-bound threshold via Eq. 67).

## 3. Method / model
- Bradley-Terry model Pr{y_k=1|θ}=σ(x_kᵀθ+η) with scheduling vector x_k (±1 entries); Elo = SGD: θ_{k+1}=θ_k+β[y_k−σ(x_kᵀθ_k+η)]x_k (Eq. 9).
- Second-order Taylor expansion of the loss around θ* converts the transcendental update into a linear adaptive-filter recursion (Eq. 21) with g_k=y_k−σ(x_kᵀθ*+η) and h_k=ℒ(x_kᵀθ*+η).
- Laplace approximation (Appendix A) gives h̄=¼(v+1)^{-1/2}exp(−η²/[4(v+1)]) (Eq. 30), h̄² (Eq. 41), and the loss lower bound ℓ̄_min (Eq. 55).

## 4. Equations & assumptions
- Mean skill (Eq. 33): E[θ_{k,m}]=(1−α1^k)θ*_m, α1=1−2βh̄/(M−1); time constant τ1≈(M−1)/(2βh̄) (Eq. 59).
- MSD (Eq. 48): d̄_k=α2^k(d̄_0−d̄_∞)+d̄_∞, α2=1−4β(h̄−βh̄²)/(M−1) (Eq. 47), d̄_∞=βh̄(M−1)/[2(h̄−βh̄²)] (Eq. 50); τ2≈(M−1)/[4β(h̄−βh̄²)] (Eq. 60).
- Bias–variance split (Eqs. 52–53): b̄_k=α1^{2k}d̄_0, ω̄_k=(α2^k−α1^{2k})d̄_0+(1−α2^k)d̄_∞.
- Improvement-over-initialization bound (Eqs. 67–69): 0<β<[(1−1/M)/(2v)+h̄²/h̄]^{−1}, rule of thumb β<2v.
- Optimal step size (Eq. 71): β_{o,k}≈½[(1−1/M)/(2v)+h̄²/h̄+2h̄²(k−1)/(M−1)]^{−1}; for small v, β_{o,k}≈v.
- Loss: ℓ̄_k≈ℓ̄_min+ℓ̄_ex,k, ℓ̄_ex,k=h̄ d̄_k/(M−1) (Eqs. 55–57); v_th=2ln2≈1.4 separates high/low skill-spread regimes (Eq. 62).
- Assumptions: random uniform scheduling (approximating deterministic round-robin), exact BT data-generating process, Gaussian θ* with known v, quadratic approximation of the loss, ergodicity for H→h̄R.

## 5. Features / target
- Features: game outcomes y_k∈{0,1}, scheduling vectors, HFA η.
- Target: closed-form trajectories of E[θ_k], MSD d̄_k, and mean loss ℓ̄_k; design rules for β.

## 6. Validation design
- Three experiments on SuperLega: (Ex.1) MSD/loss trajectories at β∈{0.1,0.87,2.49} vs theory (Fig. 6); (Ex.2) end-of-season MSD/loss vs β∈(0.01,4) (Fig. 7); (Ex.3) per-season skill trajectories and MSD for four seasons with per-season β_{o,k}∈{0.939,0.998,0.93,1.09} (Fig. 8). η̂ and v̂ estimated per season via small-step SGD over multiple epochs; seasons truncated to K=132.

## 7. Numerical results / baselines
- Theory matches simulated MSD/loss in transient and steady state across all β values (Fig. 6); β=0.87 (optimal) converges within the season while β=0.1 (FIFA/FIDE scale) does not.
- End-of-season MSD/loss vs β (Fig. 7): model tracks experiment over β∈(0.01,4); β beyond the improvement bound inflates both MSD and loss sharply — "such values of β should not be used."
- Per-season per-team skill trajectories follow the theory's mean curve (Fig. 8).
- Practical numbers: with v̂≈1.2–3.7 the optimal β_{o,k}≈0.93–1.09 (in the paper's natural-logistic units; divide by s′=400/ln10≈173.7 to compare with Elo-scale K — i.e., K_opt ≈ 160–190 Elo points, much larger than the FIFA range β′∈[0.02,0.23]·s′ after the same scaling, which the paper shows under-converges within a season).

## 8. Code / data availability
Experiment code: https://github.com/dangpzanco/elo-rating. SuperLega results scraped from FlashScore (archive.ph mirror cited); no bundled dataset.

## 9. Leakage & limitations
- The uniform-random-scheduling assumption is false for the NFL (divisional structure, unbalanced schedules, HFA confounded with team quality) — the autocorrelation matrix R (Eq. 14) is the weakest link for GSE transfer.
- θ* is assumed fixed within a season; no player-evolution kernel (contrast paper 0576's Model 2.16) — injuries/trades break the static-θ* premise.
- The quadratic (second-order Taylor) approximation around the unknown θ* degrades for large β and early k (large estimation error) — exactly the regime where the optimal-β guidance matters most.
- η̂ and v̂ are estimated with the same SGD machinery the theory analyzes (small step, many epochs) — mild circularity in the validation.
- Binary outcomes only; no draws, no margin of victory (authors suggest G-Elo extensions as future work).
- The β_{o,k} formula needs v, which must itself be estimated — the paper does this but gives no uncertainty propagation for v̂ into β_{o,k}.

## 10. GSE overlap
Direct extension of GSE's existing Elo core (existing-research-map.md: Elo is inventoried; paper 0570 covered a modified Glicko-2). Nothing in the repo gives a principled K-factor: GSE's K is heuristic. This paper supplies three things GSE lacks: (a) a closed-form optimal step size as a function of games played and estimated skill variance, (b) a convergence time constant to set preseason burn-in windows instead of folklore ("30 games"), and (c) an upper bound (β<2v) that flags over-aggressive K values. The round-robin scheduling assumption must be relaxed for the NFL, but the β_{o,k} and τ1 formulas depend on the schedule only through R's trace structure, which can be recomputed for the NFL schedule.

## 11. GSE implementation spec
- Add a K-factor scheduler to the engine's Elo module: K_k = s′·β_{o,k} with β_{o,k} from Eq. 71, v̂ estimated each offseason from the prior season's final rating spread (sample variance of ratings), M=32, k = games played so far. Large K early (fast convergence), decaying as the season progresses — the paper's key practical prescription.
- Recompute R for the NFL schedule (replace uniform Eq. 14 with the empirical matchup-frequency matrix) and re-derive τ1; use τ1 to define the preseason burn-in: ratings before k≈3τ1 games are flagged provisional.
- Sanity gate: enforce K_k < 2v̂·s′ (Eq. 69) as a hard cap.
- Effort: ~1 day (one scheduler function + v̂ estimator + backtest).

## 12. Reproducible test
- Dataset: nflverse 2015–2025, engine's current Elo vs the scheduled-K Elo, walk-forward: at each week, both systems' pre-game win probabilities vs outcomes.
- Metrics: log-loss and Brier score, full season and first-6-weeks split (where the scheduler's fast early convergence should win).
- Baseline: current fixed-K Elo.

## 13. Acceptance / rejection gate
- ADOPT the scheduled K if it beats fixed-K on pooled 2015–2025 log-loss by ≥0.001 AND wins the first-6-weeks split (early-season adaptivity is the mechanism; a win only late-season is suspect).
- ADAPT if it wins early-season only — use the scheduler for weeks 1–6, fixed K thereafter.
- REJECT if no improvement — the NFL's non-round-robin schedule may break the R assumption beyond what the trace approximation tolerates.

## 14. Improvement experiment
- Combine with paper 0576: run the scheduled-K Elo under the luck-capped link p=(1−β_luck)/2+β_luck·σ(·). The two papers attack orthogonal weaknesses (0578: step-size dynamics; 0576: tail calibration). Test the 2×2 (fixed/scheduled K × standard/capped link) on the §12 protocol — if the interaction is super-additive in the heavy-favorite tail (scheduled K converges fast early, capped link prevents tail overconfidence), ship both; if the gains are redundant, keep the cheaper one (the link change).
