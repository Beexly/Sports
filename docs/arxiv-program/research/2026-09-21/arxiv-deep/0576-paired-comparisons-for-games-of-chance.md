# [0576] Paired comparisons for games of chance (arXiv:2303.14857v1)

**Citation:** Alex Cowan (2023). *Paired comparisons for games of chance*. arXiv:2303.14857v1. URL: https://arxiv.org/abs/2303.14857v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7444 lines).
**Verdict:** ADAPT — the "luck function" Λ (a β-mixture capping win probability below 1) is the single most portable idea: it fixes Bradley-Terry's systematic overconfidence on heavy favorites, a known failure mode in NFL moneyline calibration. Do not port the discrete-distribution rating machinery wholesale; adapt Λ into GSE's existing Elo/BT probability mapping.

## 1. Research question
Can a Bayesian paired-comparison rating system generalize Glicko by separating "game luck" (Λ, the luck function) from "player inconsistency" (μ, the performance distribution), and does the resulting system — with a luck function that caps win probability below 1 — beat Glicko2 on real data from a luck-heavy game (Duelyst II, online collectible card game)?

## 2. Dataset / schema
- First 1,126,592 ranked matches since Duelyst II launch; two heaviest users P (2162 matches, 95th percentile) and Q (2142 matches, 99.95th percentile) used for rating-change diagnostics.
- Comparison: Glicko2 (τ=0.5, default 1500, RD 200, volatility 0.06 — same as prequel Duelyst 2016–2020) vs the new system at β=0.8 and β=0.9.
- Metric: per-match log loss −log p on the subset where both players' posterior variance < 70² after the Elo-scale reparameterization (557,973–653,660 matches depending on system).

## 3. Method / model
Three models:
- Model 2.1 (match outcomes): L(μ_A,μ_B)=∫∫ Λ(x,y) μ_A(dx) μ_B(dy); Λ is the luck function (Λ(x,y)=1−Λ(y,x)), μ_A, μ_B are performance distributions (Dirac = perfectly consistent player).
- Model 2.11 (belief update): exact Bayesian posterior ν_{A,A>B} ∝ ν_A × expected win prob vs ν_B; draws handled via θ-weighted geometric mixture (Eq. 1). Glicko recovered as Dirac-only priors + normal + Laplace-approximation (Example 2.13); TrueSkill and FIDE as special Λ choices (Examples 2.7–2.8).
- Model 2.16 (player growth): Markov kernel κ on performance measures between matches (Glicko's RD-inflation is κ = Gaussian convolution, Example 2.18); Glicko2's innovation (player-dependent κ) deliberately rejected — it incentivizes intentional losing (Remark 2.19, Pokémon GO volatility farming).
- Duelyst II parameters: Λ(x,y)=(1−β)/2+β/(1+exp(y−x)), β=0.8 (Eq. 2); prior ν_0 = 1001-point discretization of N(0,0.7²) on [−7,7] (Eq. 5); growth kernel κ = Gaussian σ_κ=0.03 (Eq. 6); display scale x↦(400/log10)x+1500 (Eq. 3).
- Algorithms: naive O(n²); FFT-based Õ(n) via R(x)=F(x)−H(x) decomposition + Algorithm 4.3 cumulative-sum trick (the production choice); elementary Laplace CDF/PDF sweep (Algorithms 4.5–4.6) avoiding FFT. Throughput: ~170 matches/sec/vCPU.

## 4. Equations & assumptions
- Luck function (Eq. 2): Λ(x,y)=(1−β)/2+β/(1+e^{y−x}), β=0.8. Interpretation (Example 2.9): with prob 1−β the winner is random; the champion beats both the author and a rock with prob (1+β)/2 each.
- Posterior update (Eq. 7): ρ_{A,A>B}(x) ∝ ρ_A(x) Σ_k ρ_B(x_k) Λ(x,x_k).
- Growth (Eq. 8): ρ̃_A(x) ∝ Σ_k ρ_A(x_k) K(x,x_k).
- Draw posterior (Eq. 1): ν_{A,θ} with L(μ,μ′)^θ L(μ′,μ)^{1−θ} likelihood, θ=1/2.
- Tail pathology at β=1: m′−m → σ²log10/400 as m→−∞ — massive rating changes from ratios of minuscule probabilities; the β<1 constant term fixes this. "Changing β from 1 to 0.99 changes the behaviour much more than from 0.99 to 0.8."
- Assumptions: symmetric zero-sum games (Λ(x,y)=1−Λ(y,x) fails for asymmetric settings like chess colors); Dirac-only beliefs (no within-player inconsistency modeling in production); discrete grid support.

## 5. Features / target
- Features: match outcomes only (win/loss/draw), chronological order.
- Target: posterior strength distribution per player; predictive win probability via Model 2.1.

## 6. Validation design
- Chronological processing of all 1.13M matches under each system; log-loss comparison on the low-variance subset; rating-change-vs-rating-difference diagnostic plots (Figs. 3.1–3.2, 5.1); parameter sensitivity for σ_0² (1 vs 0.7²), grid size n=1000 (doubling changed nothing), M=7.

## 7. Numerical results / baselines
Quoted exactly from the paper:
- "The average log loss was 0.6625 for Glicko2, 0.6613 for β=0.8, and 0.6559 for β=0.9."
- β=0.8 was deployed despite β=0.9's better log loss, for two reasons: (1) "it was much more important to accurately rank the game's top players relative to each other. The choice β=0.8 yields more stable and reliable rankings"; (2) game-design: "harshly penalizing unlucky losses is remarkably frustrating" for players.
- Fig. 5.1: the three systems separate mainly in the tails (wins by the weaker player at large rating differences); Glicko2's loss concentrates there — consistent with the claim that "four widely-used systems based on the Bradley–Terry model all overestimate the performance of very highly rated competitors" (Glickman et al. 2020) and Sonas's 1.54M-game chess finding.
- Posterior variance for the two heavy users: Var(ν_Q) ∈ [52²,62²], Var(ν_P) ∈ [48²,52²] — the system keeps calibrated uncertainty after 2000+ games.

## 8. Code / data availability
Implementation: https://github.com/thealexcowan/blatmmr ("BlatMMR"). Match data: Duelyst II proprietary (not public).

## 9. Leakage & limitations
- The log-loss win is small (0.6625→0.6559, ~1%) and computed on a filtered subset (both variances <70²) — the filter itself depends on each system's own uncertainty estimates, so the comparison set differs across systems (558K vs 654K matches).
- The deployed β=0.8 was chosen by judgment (ranking stability, player psychology), not by the reported metric — the paper's headline comparison is honest about this but it means the "beats Glicko2" claim rests on the β=0.9 variant that was NOT deployed.
- No margin-of-victory, no covariates, no home advantage; the framework notes these extensions (asymmetric Λ) but doesn't implement them.
- Dirac-only production restriction discards the paper's own generality (Example 2.14 shows Dirac-only fails for shared accounts / inconsistent players) — the deployed system can't model a player who's sometimes Alice and sometimes Abi.
- Throughput 170 matches/sec/vCPU is modest; the FFT path needs uniform grids and translation-invariant Λ.

## 10. GSE overlap
Extension, not duplicate. Per existing-research-map.md: GSE inventories Glicko (and paper 0570 read a modified Glicko-2 in depth) and Bradley-Terry, but nothing in the repo uses a luck-capped win-probability link. The BT-overconfidence-on-favorites pathology the paper documents (Glickman et al. 2020; Sonas 1.54M games) directly affects GSE moneyline calibration: a 90% BT win prob for a −1000 favorite is the same tail error. The β-mixture Λ is a new calibration tool; the discrete-posterior machinery is not needed (GSE already has rating systems).

## 11. GSE implementation spec
- Adapt only the luck function: replace GSE's BT/Elo win-probability link p=1/(1+10^{−Δ/400}) with p=(1−β)/2+β/(1+10^{−Δ/400}), β tuned on 2015–2025 nflverse moneylines (paper's β=0.8 is a card-game value; NFL likely needs β≈0.9–0.95 — start grid at {0.8,0.85,0.9,0.95,1.0}).
- Apply at the calibration layer (predicted prob → market prob), not inside the rating update — keeps the engine's existing Elo/Glicko machinery untouched.
- Also apply to the KRC spectral ratings (paper 0574): its BT link π_j/(π_i+π_j) has the same tail pathology.
- Effort: ~half a day (one-line link change + backtest harness).

## 12. Reproducible test
- Dataset: nflverse 2015–2025, engine's pre-game spread-implied or rating-implied win probabilities vs actual outcomes.
- Metric: log-loss and calibration slope in the |p−0.5|>0.35 tail deciles (where the paper says BT fails).
- Baseline: β=1 (standard BT link) — the luck-capped link must win specifically in the heavy-favorite tail.

## 13. Acceptance / rejection gate
- ADOPT the β-capped link if it reduces tail-decile log-loss by ≥0.002 vs β=1 on 2015–2025 pooled AND improves overall log-loss (no overall degradation — the paper's β=0.9 won overall too).
- ADAPT if it wins only in the tail — apply the cap only for |p−0.5|>0.3 (piecewise link), keeping standard BT in the competitive range.
- REJECT if β<1 doesn't beat β=1 on NFL data — the card-game luck structure may not transfer.

## 14. Improvement experiment
- Team-specific β: estimate β per team from historical upset rates (some franchises systematically over/under-perform their rating in blowout spots — e.g., dome teams outdoors). The paper uses one global β; a hierarchical β_team with shrinkage to the global mean could capture "luck profile" heterogeneity. Test on the §13 gate with the hierarchical variant vs global β — if team-level β is stable year-over-year (rank correlation of β_team across seasons >0.3), it's signal; otherwise it's noise and the global cap stands.
