# [0207] Simulation-Based Optimisation of Batting Order and Bowling Plans in T20 Cricket (arXiv:2604.13861v2)

**Citation:** Ganesh, T. V. (2026). *Simulation-Based Optimisation of Batting Order and Bowling Plans in T20 Cricket: A Markov Decision Process Framework with Dual Case Studies*. arXiv:2604.13861v2. URL: https://arxiv.org/abs/2604.13861v2 (* submitted to the Journal of Quantitative Analysis in Sports, April 2026; single author)
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf/2604.13861, then-current = v2, 1,366 lines; headline claims spot-verified 2026-09-21 against explicit https://arxiv.org/pdf/2604.13861v2 — MI +4.1 pp, GT +5.2 pp, 50,000 sims, SE ≈ 0.22% all confirmed).
**Verdict:** ADAPT — reject the cricket application, port the framework: an MDP with phase/situation-specific empirical outcome profiles, James–Stein shrinkage toward population priors for sparse cells, and Monte Carlo search that optimizes win probability directly (not expected points) is the exact recipe for an NFL in-game decision engine (4th-down, 2-point, timeout, kickoff decisions) and a quantitative "coach decision audit" content lane for GSE.

## 1. Research question
Can a unified MDP framework that optimizes batting order and bowling plans directly in terms of win/defend probability — rather than expected runs — audit and improve real in-match T20 decisions? The core hypothesis: decisions that look reasonable under aggregate statistics are measurably costly under phase-specific outcome profiles, and simulation-based search can quantify the cost in win-probability points.

## 2. Dataset / schema
- 1,161 IPL matches (seasons 2008–2025), ball-by-ball from Cricsheet.org (CC Attribution) via the author's yorkr R package.
- 273,735 delivery records; ~264,800 legal balls after excluding wides/no-balls.
- Both target case-study matches (KKR–MI 29 Mar 2026; GT–PBKS 31 Mar 2026) excluded from estimation to prevent lookahead bias.
- Phase assignment by 0-indexed over number: Powerplay overs 0–5 (fielding restrictions), Middle 6–14 (spin-friendly), Death 15–19 (explosive). In-over ball position not used.

## 3. Method / model
- **MDP:** state s = (r, b, w) — runs remaining, legal balls remaining (120 in T20), wickets in hand. Outcome set Ω = {W, 0, 1, 2, 3, 4, 6} (5-run all-run-five omitted, <0.1% of deliveries; Markov property asserted: future depends only on s). Win-probability value function W^π(r,b,w) and defend-probability D^π(r,b,w) with symmetric Bellman equations; exact complements W + D = 1 at shared states (no draws in T20). Strike rotation enforced (odd runs or over end swap strike; ~50-point SR differentials between death specialists and tail are consequential).
- **Profile engine:** per-player, per-phase outcome distributions with Laplace smoothing (α = 1), then James–Stein shrinkage blending individual estimates toward the phase population average with data-adaptive weight λ (n_min = 50 deliveries, ≈8 overs; λ = 0 at n = 0 → pure population prior; λ → 1 as n → ∞).
- **Monte Carlo:** vectorized NumPy, N = 50,000 trajectories/config, SE ≤ 0.22% (binomial), ≈0.15 s/config on commodity Apple M-series; fast pass N_fast = 5,000 (≈15 ms) during SA search; top candidates re-evaluated at N_refine = 30,000.
- **Batting search:** exhaustive enumeration of all n! orderings of remaining batsmen (n ≤ 6), two-pass: 3,000 sims screening → top-10 at 20,000 sims.
- **Bowling search:** simulated annealing (8,000 steps, Metropolis acceptance, linear cooling T0 = 0.05 → 1e-6), feasibility constraints: per-bowler quota ≤ remaining overs (4 − bowled) and no consecutive overs; neighbors respect both constraints.

## 4. Equations & assumptions
- Bellman (batting): W^π(r,b,w) = Σ_{o∈Ω} p^π_{striker}(o) · W^π(T(s,o)) with terminal W = 1 if r ≤ 0, 0 if b = 0 or w = 0 and r > 0. (Superscript/subscript indices garbled in PDF extraction; structure confirmed by the expanded form and text.)
- Blended profile: p̃ = λ·p̂ + (1−λ)·p̄ with λ data-adaptive, λ = 0 at n = 0, λ → 1 as n → ∞, n_min = 50. (Exact λ formula's fraction was unreadable in extraction; the standard n/(n+n_min) form is the obvious reading but is flagged as reconstruction, not a paper quote.)
- Metropolis: A(Δ,T) = 1 if Δ > 0 else exp(Δ/T), Δ = D̂(π′) − D̂(π).
- z-score for the 5.2 pp bowling gap: z = 0.052/(√2 × 0.00187) ≈ 19.7.
- Assumptions: ball-by-ball independence given phase and player identities (no momentum — author admits); static historical profiles (no form/fatigue/pitch/opponent — author admits, suggests exponential decay/Bayesian updating as future work); opponent-agnostic profiles (no matchup tensor); bowling plan precommitted at intervention point, not adaptive (author admits; full adaptive policy would inflate state by a factor of ∏(quota+1)).

## 5. Features / target
- Features: phase (PP/MI/DE), current match state (r, b, w), player identity.
- Targets: win probability (batting order) and defend probability (bowling plan), evaluated at the intervention state.

## 6. Validation design
- Two real-match audits: KKR vs MI (29 Mar 2026, Wankhede; MI chasing 221, intervention at over 12, Sharma out for 72 off 40, state 148/1, 73 needed off 44, RR 9.95) — both batting and bowling auditable from the same state; GT vs PBKS (31 Mar 2026; GT defending 162, PBKS 83/2 at 9.3, 80 needed off 60, RR 8.00).
- Simulation SE reported; bowling-gap z ≈ 19.7, far beyond significance. No out-of-sample predictive validation of profiles (no held-out matches); the case studies are contemporaneous 2026 IPL matches not in the training window, which is partial temporal validation.

## 7. Numerical results / baselines
- **Case 1 (MI batting):** optimal order SA Yadav → Naman Dhir → Tilak Varma → HH Pandya gives 56.5% win; actual (Tilak Varma → HH Pandya → Naman Dhir) 52.4%, rank 5 of 6; worst order 50.0%. **Gain +4.1 pp.** Sending SA Yadav at position 3 was correct (Middle SR 143.8, dismissal prob 0.035, lowest of pool); the error was burying Naman Dhir (Death SR 204, +18 over any alternative) at position 6 where he faced 2 balls — 5 extra death balls ≈ +0.92 expected runs.
- **Case 2 (GT bowling):** optimal plan 44.3% defend vs actual 39.1%. **Gain +5.2 pp.** Three structural errors: Rashid Khan (Death ER 8.40, Middle 6.58) deployed in Middle over 11 where his margin was 0.49 RPO instead of Death where it was 1.39 RPO; M. Prasidh Krishna (Death ER 9.79, worst of the attack) bowled 4 overs incl. 2 death overs; Mohammed Siraj (2-over quota, competitive both phases) unused.
- MI batsman Death SRs: Rickelton 156.4, Yadav 181.3, Varma 185.5, Pandya 171.6, Dhir 203.9. GT bowler ERs: Rashid 6.58/8.40 (MI/DE), Sundar 7.07/9.61, Siraj 7.35/9.55, Rabada 7.35/9.36, Krishna 7.47/9.79, Ashok Sharma = population average (0 historical deliveries).
- Compute: full SA run incl. profile estimation under 5 minutes on commodity hardware; MC SE < 0.22% at N = 50,000 distinguishes ≥1 pp differences at SNR ≥ 4.5.

## 8. Code / data availability
Code: https://github.com/tvganesh/T20-MDPoptimisation. Data: Cricsheet.org (CC Attribution). Python 3.11, NumPy 1.26, pandas 2.1, matplotlib 3.8.

## 9. Leakage & limitations
- Target matches excluded (good), but case-study matches are 2026 IPL while estimation window is 2008–2025 — temporal gap is fine; however profiles are equal-weighted over 18 seasons, so 2008-era players pollute priors for 2026 decisions (author admits, unaddressed).
- Ashok Sharma (zero historical deliveries) collapses to the population average — the SA then trusts a league-average estimate as if it were data; the shrinkage handles variance but the paper reports no sensitivity of the optimum to the population-prior choice.
- No held-out predictive check of the profile engine itself (e.g., does Ŵ predict actual outcomes on 2026 matches?). The two case studies validate decision audit, not forecast skill.
- Author's own limitations: static profiles, opponent-agnostic, precommitted (non-adaptive) plans, i.i.d. balls (no momentum/HMM).
- Equations' exact symbols (blend-weight fraction, Bellman subscripts) were unreadable in PDF extraction and are flagged as reconstructed above.

## 10. GSE overlap
- GSE's corpus has no simulation-based decision-optimization work and no WP-optimal in-game decision engine (the existing-research map shows metric catalogs, ratings, charting — not decision support). The James–Stein phase-shrinkage idea partially overlaps standard empirical-Bayes thinking in GSE calibration work but is not duplicated.
- The "expected runs ≠ win probability" thesis directly parallels a known NFL trap GSE should formalize: EPA-optimal ≠ WP-optimal late in games.

## 11. GSE implementation spec
- Port to NFL: state s = (score differential, time remaining, down, distance, field position, timeouts remaining). "Phases" become game-script situations (early, neutral, late-and-close, garbage); outcome distributions per (down, distance, field-position bucket) estimated from nflverse 2020–2025 with James–Stein shrinkage toward league averages (n_min scaled up for football's smaller sample).
- Deliverables: (a) WP-optimal 4th-down / 2-point / timeout decision engine with MC evaluation, (b) weekly "coach decision audit" content (quantify each week's most costly decisions in WP points, like the +4.1/+5.2 pp audits here), (c) pregame situational edges (e.g., which coaches are phase-agnostic in 4th-down aggression — a direct analog of the paper's core finding).
- Effort: profile engine ~1 week (nflverse play-by-play is richer than ball-by-ball); MC + SA port ~1 week; audit content pipeline ~1 week. Constraint analog: roster/situation feasibility (e.g., no "consecutive" artifacts needed; instead enforce timeout inventory and down/distance legality).

## 12. Reproducible test
- Dataset: nflverse play-by-play 2020–2025 (public), 2026 season held out.
- Metric: out-of-sample Brier score / log-loss of WP estimates from shrunk situation profiles vs raw MLE and vs a commercial WP baseline on held-out 2026 drives; plus calibration of the audit (do flagged "costly" decisions actually predict lower win rates?).
- Baseline to beat: raw-MLE situation WP; target ≥5% Brier improvement from shrinkage.

## 13. Acceptance / rejection gate
ADAPT the framework if the NFL port's James–Stein-shrunk situation profiles beat raw MLE on held-out 2026 drives with ≥5% lower Brier score AND a 200-play audit sample shows ≥80% agreement between the engine's 4th-down recommendations and a published benchmark (e.g., the 4th-down bot / nflverse WP model); reject the port and keep only the "expected points ≠ win probability" editorial thesis if either condition fails.

## 14. Improvement experiment
Beyond the paper (which the author lists as limitations): make the bowling-plan analog adaptive — solve the full NFL policy π: (score, time, down, distance, timeouts) → decision rather than precommitting at an intervention point, using the same vectorized MC engine; and replace static equal-weighted history with exponential-decay weighting over recent seasons plus within-game Bayesian updating of situation profiles (the author's suggested fix, untested). For GSE, the adaptive policy is the actual product (live in-game recommendations), while the precommitted audit is the content layer — run both off one engine.
