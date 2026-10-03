# [0591] An Elo-type rating model for players and teams of variable strength (arXiv:2109.15046v2)

**Citation:** Düring, B., Fischer, M. & Wolfram, M.-T. (2021). *An Elo-type rating model for players and teams of variable strength*. arXiv:2109.15046v2. URL: https://arxiv.org/abs/2109.15046v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 8,659 lines).
**Verdict:** ADAPT — adopt the variance-corrected Elo update (the Jensen/Jensen-like K term in Eq. 6) and the σ-dependent rating-shrinkage insight for GSE's Elo lane; reject the full kinetic mean-field machinery (PDEs, theorems) as overkill for 32 NFL teams.

## 1. Research question
Can the kinetic (Junca–Jabin) continuous-time Elo model be generalized to teams whose underlying strength is not constant but a random variable — fluctuating due to lineup changes, player selection, or form — and, after formally deriving the corresponding mean-field Fokker–Planck equation, under what conditions do ratings still converge to the teams' mean strength?

## 2. Dataset / schema
No real sports dataset. Two synthetic microscopic simulation setups, football-inspired: N=200 teams × M=23 players, m=11 players drawn per lineup, team mean strengths θ_i shifted to [0,10]. Setup (R1): all teams θ_i ≈ 5 with player-strength spread increasing in i (ρ_1k = 5/11 constant; ρ_200k ∈ [0,10]/11) — constant mean, rising variance. Setup (R2): mean team strength rising from ≈4 to ≈10 across the first 198 teams with constant variance (σ=1), plus two outlier teams Germany (θ=10) and Brazil (θ=9, higher variance) motivated by 2014 FIFA World Cup results (goalimpact.com data). A third experiment: N=500 players, θ_n uniform in [4,10], per-step draws from N(θ_n, σ), ν ∈ {1, 0.1, 0.01}, 10⁶ time-steps at Δt=0.1, 25 collisions/step, 50 realisations. All simulation-only; no public corpus.

## 3. Method / model
Microscopic: the classic Elo pairwise update R_i^* = R_i + γ(S_ij − b(R_i − R_j)), R_j^* = R_j + γ(−S_ij − b(R_j − R_i)) with b(z) = tanh(νz) (C³, odd, monotone, bounded, Lipschitz), γ the adjustment speed, and S_ij ∈ {−1,1} the game outcome with ⟨S_ij⟩ = ⟨b(ρ_i − ρ_j)⟩ (the paper's innovation: strength ρ replaced by a random variable λ_ρ per lineup, mean θ = ⟨λ_ρ⟩, variance σ² = Var[λ_ρ]). Direct Monte Carlo via Bird's scheme. Macroscopic: formal mean-field derivation (Boltzmann-type equation → grazing-collision/Fokker–Planck limit γ→0) for the team distribution f(t,θ,σ,r); existence/uniqueness theorems (Thm 1–2), moment analysis (second r-moment strictly decreasing), and a relative-energy argument giving exponential convergence ℰ(t) → 0 in the homogeneous-variance case. Finite-difference numerics (Towers/Godunov-type upwind scheme) on the PDE.

## 4. Equations & assumptions
Microscopic update (Eq. 1): R_i^* = R_i + γ(S_ij − b(R_i − R_j)); R_j^* = R_j + γ(−S_ij − b(R_j − R_i)).
Expected outcome (Eq. 4): ⟨S_ij⟩ = ⟨b(λ_{ρ_i} − λ_{ρ_j})⟩.
Taylor (Jensen) correction — the paper's core formula (Eq. 6): ⟨S_ij⟩ ≈ b(θ_i − θ_j) + ½ b''(θ_i − θ_j)(σ_i² + σ_j²) =: b(θ_i−θ_j) + K(θ_i−θ_j, σ_i, σ_j), where K is odd in its first argument and even in the other two.
Outcome variance (Eq. 7): Var[S_ij] ≈ (b'(θ_i − θ_j))²(σ_i² + σ_j²).
Fokker–Planck (Eq. 9): ∂_t f(t,θ,σ,r) + ∂_r(a[f] f(t,θ,σ,r)) = 0 with a[f] = ∫ w(r−r')[b(θ−θ') + ½ b''(θ−θ')(σ²+σ'²) − b(r−r')] f(t,θ',σ',r') dθ'dσ'dr'.
Homogeneous-σ reduction (Eqs. 17–18): same with σ constant and a[f] = ∫ w(r−r')[b(θ−θ') + σ²b''(θ−θ') − b(r−r')] f dθ'dr'.
Convergence theorem (Thm 3): under (B) + (B'): b + σ²b'' monotonically increasing, ℰ(t) = ∫(r−θ)² f drdθ satisfies ℰ(t) ≤ ℰ(0) exp(−2 w_min (L + σ²L₂) t). For b(z)=tanh(νz), (B') holds when 1 + ν²σ²(4 − 6 sech(zν)²) > 0.
Assumptions stated: (A1) compactly supported C¹ initial data with given moments (mean rating/strength zero, ∫σ f = 1, ∫σ² f = C_{σ²}); (A2) even C²∩L^∞ interaction kernel w (e.g., w(r−r') = e^{log2/(1+(r−r')²)} − 1 or indicator {|r−r'| ≤ c}); independence of lineup draws between the two teams; all-play-all (w≡1) in the proofs.

## 5. Features / target
Features: per-team mean strength θ_i, performance variance σ_i² (lineup/injury-driven), current rating r_i; pairing kernel w(r−r'). Target: rating updates r_i^* and the long-run question of whether r → θ. In simulation terms: team identities, player-strength vectors, random lineup draws, game outcomes S_ij.

## 6. Validation design
No real-data validation; the "experiments" are Monte Carlo simulations of the microscopic model vs. finite-difference solutions of the macroscopic PDE (agreement checks, Figs. 4–5). Compared across ν ∈ {1, 0.1, 0.01} and σ values to test the convergence theorems. Baselines: none — the paper is a theory paper; the original Junca–Jabin constant-strength model is the implicit reference.

## 7. Numerical results / baselines
- Setup (R1), 2×10⁶ time-steps, Δt=0.1, 25 matches/step, averaged over 50 realisations: stationary distribution clusters at (θ,R)=(5,5); systematic bias — teams with θ<5 consistently under-perform and θ>5 over-perform relative to the rating (the Jensen term bends the stationary relation away from θ=R).
- Setup (R2): the 198 constant-variance teams converge to a steady state with slope steeper than θ=R; Germany and Brazil are clear outliers, both under-performing relative to strength.
- Macroscopic PDE at t=5 (domain [0,10]×[0,10]×[0,1], Δt=10⁻⁵, Δr=Δθ=Δσ=5×10⁻², ν=1): ratings converge toward mean strength only for θ ∈ [6,8], blurred outside; larger σ → less accurate ratings, all teams rated ≈7 regardless of θ (the mean); weaker teams over-perform, stronger under-perform in expectation.
- ν sensitivity (σ=2, N=500, θ uniform [4,10]): ν=1 → all ratings collapse to ≈7 (horizontal line, convergence to θ lost); ν=0.1 or 0.01 → recovers the desired diagonal θ=r, but ν=0.01 converges much more slowly. Conclusion: ν must be chosen small enough (chess's ν ≈ 1/400 is the cited practical example) to satisfy (B') and keep ratings tracking mean strength.
- No predictive metrics, no real-data numbers; all quantitative claims are about simulated stationary distributions and convergence rates.

## 8. Code / data availability
None stated (no repository, no data links). Algorithms described: Bird's Monte Carlo scheme for the microscopic model; a Towers-generalized Godunov finite-difference scheme for the PDE.

## 9. Leakage & limitations
- Zero real-data validation: every "result" is a simulation of the authors' own model, so the paper cannot distinguish its mechanism from any other variance-aware rating scheme on predictive grounds.
- Mean-field limit assumes N→∞ teams and all-play-all (w≡1) — the NFL has exactly 32 teams and a structured, non-random schedule, so the convergence theorems do not apply literally.
- The microscopic finding that ν must be tiny (≤0.1 in their units) to avoid rating collapse is scale-dependent; mapping it to a real Elo scale requires recalibration, which the paper does not do.
- The σ² correction enters through b'', which for the logistic/tanh saturates: for large rating gaps the correction vanishes, and for the NFL's typical scale the effect size is unquantified.
- Open modeling question (authors' own): whether performance fluctuations belong in ρ (this paper), in the outcome S_ij, or as a diffusion term on θ — the paper does not resolve which is empirically right.
- External validity: the variance-drag insight is generic, but the specific collapse threshold is an artifact of the chosen units and all-play-all assumption.

## 10. GSE overlap
Extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1 master metrics list), the repo inventories Elo, nfelo/nfelounits, dynamic Elo, Glicko/TrueSkill (mentioned), and state-space team strength — but nothing with a performance-variance correction to the update rule. The Jensen term K = ½b''(Δθ)(σ_i²+σ_j²) and the qualitative law "high-σ teams get rated toward the middle; weak teams over-perform / strong teams under-perform" are new, directly implementable extensions of GSE's existing Elo lane. The kinetic PDE/theorem machinery is beyond GSE's needs (32 teams, not a mean field).

## 11. GSE implementation spec
Build a variance-aware Elo for NFL on nflverse (2015–2025). Per-team performance variance σ_i²(w) estimated weekly from: (a) trailing 8-week variance of team EPA/play, (b) injury load (starters out / snap-weighted WAR lost), (c) QB-change indicator. Update rule: standard Elo with expected score E = b(θ_i−θ_j) + ½b''(θ_i−θ_j)(σ_i²+σ_j²) using b(z)=tanh(νz), ν calibrated to NFL scale (start from FiveThirtyEight NFL Elo scale and shrink per the paper's (B')-style diagnostic). Effect: injury-hit/high-variance teams' ratings shrink toward the mean automatically. Serve weekly alongside the existing Elo; emit per-team σ as a feature to the engine. Effort: ~1 engineer-week (data plumbing from nflverse + injury reports, update-rule change, backtest harness).

## 12. Reproducible test
Dataset: nflverse regular-season games 2019–2025, time-ordered rolling weekly refit. Metric: log-loss on win/loss outcomes. Baselines: (a) standard fixed-K Elo, (b) nfelo-style Elo if available in repo, (c) market (de-vigged moneyline). Primary test: variance-corrected Elo vs. (a) overall. Secondary: stratify by team-week σ (top-quartile σ weeks) where the paper predicts the largest correction. Ablation: zero-out the K term but keep per-team σ as a multiplicative K-factor dampener.

## 13. Acceptance / rejection gate
Adopt if variance-corrected Elo beats standard Elo log-loss by ≥0.5% overall on 2019–2025 rolling AND by ≥1.5% on top-quartile-σ team-weeks, with no weekly refit instability (max week-to-week rating swing ≤ 2× the baseline's). Reject if the overall gain is below threshold — the correction adds complexity without payoff.

## 14. Improvement experiment
Learn σ_i² as a latent parameter rather than a proxy: a hierarchical model where each team's performance variance is inferred from the squared Elo residuals (Glicko-style, but for outcome variance rather than rating uncertainty), then compare inferred-σ vs. injury-proxy-σ in the K term. If inferred σ explains more of the weak-overperform/strong-underperform bias the paper documents, promote it to the primary specification and publish the per-team σ series as a "consistency rating" — a new GSE metric the paper's framework implies but doesn't build.
