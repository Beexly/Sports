# [0566] FIVB ranking: Misstep in the right direction (arXiv:2408.01603)

**Citation:** Tenni, S., Gomes de Pinho Zanco, D., & Szczecinski, L. (2024). *FIVB ranking: Misstep in the right direction*. arXiv:2408.01603. URL: https://arxiv.org/abs/2408.01603
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7655 lines).
**Verdict:** ADAPT — the paper's real product is an evaluation methodology for rating algorithms (reverse-engineer the implicit loss, optimize auxiliary parameters against proper log-loss, test whether match-importance weights help), and its three empirical verdicts transfer directly to GSE's Elo/SG updates: (1) hand-set "numerical scores" are suboptimal and easy to fix analytically; (2) match-importance weights are counterproductive; (3) adding HFA costs nothing and gains ~1% on home matches. Plus an ordinal margin-of-victory extension worth testing for NFL games.

## 1. Research question
Is the FIVB (volleyball, adopted 2020) ranking — the first official sports ranking built on an explicit probabilistic model (cumulative-link ordinal model) for six-level outcomes (3-0, 3-1, 3-2, 2-3, 1-3, 0-3) — statistically sound? The authors cast it as statistical inference, derive the implicit loss its SGD update actually minimizes, and optimize its parameters (thresholds c, numerical scores r, match weights ξ, HFA η) analytically and numerically.

## 2. Dataset / schema
Men's national-team volleyball, 2021-01-01 through 2023-12 (no matches after Oct 2023): M=102 teams, T=1151 matches — 761 neutral, 390 home-venue. Excluded: 67 matches with unexplained tiny increments {0,0.01}, 33 with 0.0 increments, and forfeits (Denmark Jan 2021, Uzbekistan/Pakistan Jul 2023, Mongolia Aug 2023). Table 3 counts per outcome on neutral: 3-0:203.5 / 3-1:117.5 / 3-2:59.5 / 2-3:59.5 / 1-3:117.5 / 0-3:203.5; home: 3-0:135 / 3-1:64 / 3-2:29 / 2-3:33 / 1-3:45 / 0-3:84. Data + code: https://github.com/brbalab/FIVB. Note: the FIVB end-of-year rule (−50 points for teams with no matches that year) is NOT modeled (footnote 14).

## 3. Method / model
Cumulative-link ordinal probit: Pr{Y_t=y|θ,x_t} = P_y(z_t), z_t = x_tᵀθ (+η h_t for home team). The FIVB update is a stochastic-gradient (SG) algorithm minimizing an implicit loss ℓ^FIVB_y(z;r) parameterized by "numerical scores" r attributed to the six ordinal outcomes (r^FIVB = {2.0,1.5,1.0,−1.0,−1.5,−2.0}), plus match-importance weights ξ_v by match category (MWF in FIVB's notation, Table 1) and adaptation step μ=0.01 (WR value update, Eq. 20). Lemma 1: the implicit loss is convex in z. Model identification via leave-one-out cross-validation optimized with ALO: averaged log-loss metrics U (all), U^ntr (neutral), U^hfa (home) (Eqs. 36–38); V(p)=e^{−U(p)} is the geometric mean of predicted outcome probabilities. Real-time ranking evaluated with SG online metrics Ū, Ū^ntr, Ū^hfa (Eqs. 54–56) and average Spearman ρ̄ vs official ranking (Eq. 58). Appendices: A — full notation mapping (WRS/WRS1/2, SSV, EMR, MWF, Δ); B — ALO steepest-descent gradient of U(p) (Eqs. 61–66).

## 4. Equations & assumptions
- Ordinal CL model: Pr{Y_t=y|θ,x_t} = P_y(z_t), z_t = x_tᵀθ — Eqs. (1–2), (16); symmetric thresholds c^FIVB=(−1.06, −0.394, 0, 0.394, 1.06) — Eq. (18); scheduling vector x_t with x_{i_t,t}=1, x_{j_t,t}=−1 — Eq. (3); HFA as home-team skill boost: ℓ^loss_{y_t,h_t}(z_t)=ℓ^loss_{y_t}(z_t+h_tη) — Eq. (13); match-importance weighting: ℓ^loss_{y_t,v_t}(z_t)=ξ_{v_t}ℓ^loss_{y_t}(z_t) — Eq. (14), with ξ_0≡1 w.l.o.g.
- Official FIVB update: θ_{t+1}=θ_t − μsξ_{v_t}x_t g^FIVB_{y_t}(z_t/s), μ=0.01, s=125 (Eq. 20); g^FIVB_y(z)=ř(z)−r^FIVB_y (Eq. 21), ř(z)=E_{Y|z}[r^FIVB_Y]=Σ_y r^FIVB_y P^FIVB_y(z) the expected numerical score (Eq. 22), rewritten as Σ_{y=0}^{L−2}(r^FIVB_y−r^FIVB_{y+1})Φ(z+c^FIVB_y)+r^FIVB_{L−1} (Eq. 23); ř(0)=0 by symmetry. FIVB notation (App. A): WRS↔θ_{m,t}, SSV↔r_y, EMR↔ř(z), MWF=10ξ_{v_t}, Δ=8(WRS1−WRS2)/1000, s=1000/8=125; WR points = −10ξ_{v_t}g^FIVB_{y_t}(z_t/s), WR value update ↔ Eq. (60).
- Implicit loss via integration: ℓ^FIVB_y(z)=∫_{−∞}^z g^FIVB_y(u)du = Σ_{l=0}^{L−2}(r^FIVB_l−r^FIVB_{l+1})ψ(z+c^FIVB_l) + (r^FIVB_{L−1}−r^FIVB_y)z + Const (Eqs. 29–31), ψ(z)=Φ(z)z+𝒩(z).

- Interpretation of V(p): U=1.4 → V≈24.7% vs uniform 16.7% (U=1.79) over 6 outcomes; V≈1−U for small U.
- Appendix B (6711–7460): ALO gradient of U(p) via steepest descent (Eqs. 61–69, Petersen & Pedersen Eq. 40 for ∂H^{−1}, implicit function theorem Eqs. 70–73 à la Lorraine et al. 2019), Newton alternative (Eq. 74); implemented with JAX/JAXopt automatic implicit differentiation.
- Official description (FIVB 2024): WRS1←WRS1+WR points (Eq. 59); end-of-year rule θ_{m,t}←θ_{m,t}−50 for teams with no matches that year (discourages match avoidance; not modeled).
- Analytical scores: match implicit-loss slope to log-loss at z_0=0 — Eq. (46): r̃_y(c)=r̃_0·Φ(c_0)(𝒩(c_y)−𝒩(c_{y−1}))/[𝒩(c_0)(Φ(c_y)−Φ(c_{y−1}))]; with c^FIVB and r̃_0=2.0: r̃=(2.0, 0.89, 0.25, −0.25, −0.89, −2.0) — Eqs. (47–49).
- Numerical optimization of (r,η) via Eq. (50); weights via Eq. (52); LOO-ALO approximation ẑ_{t,\t}=ẑ_t+ℓ̇a_t/(1−ℓ̈a_t), a_t=x_tᵀĤ⁻¹x_t — Eq. (39).
- Assumptions: skills Gaussian prior ρ(θ)=(1/2)γ‖θ‖²; z mostly near z_0=0 (zero-mean Gaussian, justifying matching at z_0); HFA is an additive home-team skill boost; SG with small μ converges (Lemma 1 + convexity).

## 5. Features / target
No features — skill parameters θ per team inferred from ordinal outcomes. Target: real-time team ranking (sorted skills). Validation target: predictive log-loss of match outcomes.

## 6. Validation design
Analytical: derive implicit loss, match it to log-loss, optimize thresholds via Eq. (42) and numerical scores via Eqs. (46)/(50). Numerical: cross-validation optimization of (r,η,ξ) on FIVB matches; real-time SG ranking comparison (Table 4) over cases A–F varying (loss, c, r, ξ, η, μ).

## 7. Numerical results / baselines
- Thresholds c^FIVB fit well; re-optimized thresholds + HFA η≈0.2 (rounded from η̂) improve home-match validation V from ≈25.8% to ≈26.8% (~1 percentage point); neutral matches unaffected.
- FIVB numerical scores r^FIVB are inadequate: numerically optimized r̂ (Eq. 51) is non-monotonic — (2.0, ≈0.9, ≈−0.1, ≈0.1, ≈−0.9, −2.0) — while the analytically calculated r̃ (Eq. 46) is monotonic and performs identically to r̂; both negligibly worse than the true log-score. Suggested rounded values: r̃_1=1.0, r̃_2=0.25.
- Match-importance weights ξ^FIVB are detrimental to prediction; optimized weights end up near-equal (ξ̂_v∈(0.9,1.5) for γ<0.5).
- Real-time SG (Table 4, Ū/Ū^ntr/Ū^hfa/ρ̄, μ̂ optimized per case via Eq. 57): A (official, μ=0.01): 1.52/1.51/1.53/0.94 → with μ̂=0.03: 1.49/1.49/1.49/0.89. B (η=0.2): 1.48/1.49/1.47/0.89. C (r̃, μ̂=0.04): 1.47/1.48/1.45/0.88. D (ξ≡1, μ̂=0.10): 1.48/1.49/1.45/0.87. E (r̃, ξ≡1, η=0.2, μ̂=0.10): 1.47/1.48/1.44/0.88. F (true log-score ℓ, ξ≡1, η=0.2, μ̂=0.20): 1.46/1.48/1.43/0.85. Even case A gives ρ̄=0.94<1 because forfeited matches were discarded. FIVB's μ=0.01 is 3–4× too small (interpreted via Szczecinski & Tihon 2023 as over-optimistic posterior variance); removing weights requires explicitly larger steps since weighting acts as a variable step size.
- Top-7 reorder example (Table 5): POL/USA/JPN stay top-3 across A/E/F; positions 4–7 shuffle.

## 8. Code / data availability
https://github.com/brbalab/FIVB — code and data to reproduce all results.

## 9. Leakage & limitations
Adversarial notes: (a) the ~1% HFA gain is on home matches only and the authors admit it may explain why FIVB skipped it — the gain is real but small; (b) improvements are measured on the same 2021–2023 FIVB match pool used for parameter optimization (cross-validation within one league, one era — no temporal holdout reported); (c) the non-monotonic r̂ is an artifact of fitting the implicit loss shape, not a meaningful "value" of a 3-2 win — the paper says so explicitly; (d) the exact log-score (case F) is "numerically complex" to implement, which is why the FIVB proxy exists — its wins are partly from optimizing μ jointly; (e) no time-varying skills are modeled (listed as future work: Fahrmeir/Glickman/Knorr-Held style); (f) volleyball only — the ordinal structure does the heavy lifting, so the FIVB-specific parameter values don't transfer to binary sports.

## 10. GSE overlap
Extension. The corpus has Elo coverage but nothing that reverse-engineers a ranking algorithm's implicit loss, optimizes auxiliary update parameters against proper log-loss, or tests match-importance weights. The methodology (Sects. 2.5/3) is a new capability; the empirical verdicts (weights hurt, HFA helps slightly, adaptation step was 3–4× too small) are directly checkable on GSE's own Elo.

## 11. GSE implementation spec
1. Reverse-engineer GSE's Elo/SG update into its implicit loss (paper's Sect. 2.5 method), then run the paper's audit: (a) fit HFA η on 2015–2025 NFL (expect ~the paper's small-but-free gain); (b) test whether GSE's playoff/prestige game weights improve held-out log-loss vs equal weights — the paper's verdict predicts they won't; (c) check whether GSE's K (adaptation step) is set too small by the paper's argmin-Ū(μ) procedure. 2. Ordinal MOV extension: replace binary win/loss with a cumulative-link ordinal model over margin buckets (e.g., win ≥14, 7–13, 1–6, tie, loss 1–6, 7–13, ≥14) and fit numerical scores analytically via Eq. (46) — this is the volleyball six-level idea applied to NFL score margins, extracting blowout signal the binary model discards. Effort: ~1 week for the audit; ~2 weeks for the ordinal-MOV prototype.

## 12. Reproducible test
Dataset: NFL games 2015–2025 (nflverse): binary result, margin, home/away, game importance tags. Protocol: (a) fit HFA and per-category weights by minimizing held-out log-loss (time-blocked CV, season folds); (b) fit the ordinal MOV model and compare held-out log-loss of game outcomes vs binary Elo. Baselines: GSE's current Elo with current weights. Metric: season-blocked average log-loss of win probability; Spearman ρ̄ vs GSE's ranking to measure disruption.

## 13. Acceptance / rejection gate
Adopt the audit's recommendations if, on season-blocked CV, equal weights beat GSE's current weights on log-loss (then drop/dampen the weights, as FIVB should) AND the ordinal-MOV model beats binary Elo on win-probability log-loss by ≥0.005 — then margin information earns its keep. Reject the ordinal extension if it only matches binary Elo: the paper's own result shows proxy losses ≈ log-loss, and a more complex model needs a clear win to justify itself.

## 14. Improvement experiment
The paper leaves time-varying skills as future work; GSE already has dynamic strength. Combine the two: a score-driven dynamic CL ordinal model (Holý-style AR(1) strength dynamics from paper 0565 fused with this paper's ordinal MOV likelihood) — the dynamic component absorbs the form swings the static FIVB model misses, while the ordinal likelihood uses margin information. Test on 2015–2025 whether the dynamic-ordinal model beats both static-ordinal and dynamic-binary on season-blocked log-loss; this fuses the two strongest ideas from this batch into one GSE-native model.
