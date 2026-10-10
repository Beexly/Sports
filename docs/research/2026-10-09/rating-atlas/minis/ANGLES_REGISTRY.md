# GSE ANGLES REGISTRY — frontier equations with no football weighting yet (2026-10-10)
_Verification live tonight via arXiv API (https pipe; every "unclaimed" checked — prior literature is SOCCER or none). Each entry: the equation, the field it came from, the football translation (the invention), data status, pre-registered kill test, and where it pays (PROPS/PICKS/PARLAY/RANK/BDB). Doctrine: these are MEASURE-tier candidates — none touch μ without beating the close walk-forward. This doc = the "angles nobody invented" ledger, and simultaneously the invention claims (dated)._ 

## A. THE HAWKES-FOOTBALL GAP — self-exciting momentum, done properly [VERIFIED UNCLAIMED]
**The equation.** Multivariate Hawkes intensity for scoring events i∈{TD,FG,safety} by team h/a:
λ_c(t) = μ_c + Σ_{c'} Σ_{t_i < t} α_{cc'} e^{−β_{cc'}(t−t_i)}
where μ_c = base scoring rate, α_{cc'} = excitation of event-type c' on c (does a TD excite the next score? whose?), β = decay speed. Branching ratio n = Σα/β < 1 required for stationarity. Fitted by MLE on play timestamps.
**Why unclaimed**: arXiv tonight = 2 hits, both soccer event data. The brain doc carded Hawkes CONFIRMED-EMPTY for football — this is the paper-and-implementation being born here.
**Football weighting (the invention)**: drive-level events with possession flips; α estimated HOME vs AWAY separately → "momentum asymmetry" = does the crowd refocus the defense (defense excitation spikes after big offense events)? Live re-price: λ(t) feeds the √τ law's drift term (engine_math.live_repricing) — a *state-dependent* drift instead of constant.
**Data**: PBP timestamps (re-pull via data/download_deep.py) — READY post re-download.
**Kill test**: out-of-sample log-loss of next-score-time predictions vs constant-rate Poisson baseline AND vs the live close's implied drift; win → feeds live repricing only. PAYOFF: LIVE (wish #1 lane), 4th-quarter totals.

## B. INVERSE REINFORCEMENT LEARNING ON COACHES — recover the reward they ACTUALLY maximize [VERIFIED UNCLAIMED]
**The equation.** MaxEnt IRL (Ziebart 2008): given coach trajectories (4th-down decisions, 2-pt tries, FGs, clock use), recover reward weights θ s.t. π_coach(a|s) = exp(θᵀφ(s,a)) / Σ_a' exp(θᵀφ(s,a')), where φ(s,a) = [ΔWP, variance, time-cost, score-margin terms]. Estimated by ML gradient: θ* = argmax Σ log π(a_i|s_i; θ).
**Why unclaimed**: arXiv IRL×coach = generic feedback-RL only. nfl4th assumes coaches optimize WP; IRL MEASURES what they actually optimize (risk aversion? possession value? ego?).
**Football weighting**: φ includes our own WP (engine_math.wp_in_game) + situational features (score diff, time, timeouts). The learned θ_gap = ||θ_coach − θ_WP|| per coach = **coach irrationality index** — market prices tendencies, not measured preference structures. Angle: live WP-pricing when an irrational-policy coach faces 4th-and-short (their decision distribution ≠ WP-argmax); totals drift on hot-seat coaches (§5 CONTEXTUAL_LAYER).
**Data**: PBP decisions (re-pull) + coach tenure table — READY post re-pull.
**Kill test**: predict next-season coach decisions better than nfl4th-recommended AND better than market-implied; then simulate WP cost of predicted-decision vs optimal. PAYOFF: PICKS (live), coach props markets.

## C. EXTREME VALUE THEORY FOR PROP TAILS — the longest-X markets are pure EVT [VERIFIED UNCLAIMED]
**The equation.** Peaks-over-threshold: P(max ≤ x) ≈ exp(−[1 + ξ(x−u)/σ]^{−1/ξ}) (GEV), fitted to player-season distributions of *maximum* play length (longest rush/reception/completion). Or GPD for exceedances over u.
**Why unclaimed**: EVT×sports-betting arXiv = 0 tonight. Book pricing of longest-X props = rough Normal quantiles (our DK ladder recon shows the whole curve is Gaussian-fit — but maxima are NOT Gaussian; they're EVT).
**Football weighting (the invention)**: fit GPD per player-position-usage cell from PBP play-lengths; price P(longest ≥ L) properly; compare vs DK's Gaussian-implied ladder prices (we hold the ladders). Systematic tail mispricing = the cleanest prop edge family this doc contains, because the book's own shape assumption is wrong for tail markets.
**Data**: PBP play-lengths + tonight's DK ladders — READY post re-pull + ladders in hand.
**Kill test**: backtest 2023-25 longest-X props (or simulate vs ladder-implied probs): Brier/log-loss of GPD vs book-implied vs Normal. PAYOFF: PROPS (longest-X, anytime-TD long-shot tails).

## D. SCORE-DRIVEN (GAS) TEAM STRENGTH — time-varying ratings with fat-tailed innovations [VERIFIED UNCLAIMED]
**The equation.** GAS(p,q) (Creal-Koopman-Lucas 2013): θ_t = ω + A·s_{t−1} + B·θ_{t−1}, where the "score" s_t = ∂log L(y_t|θ_t)/∂θ_t — the model updates strength by the *likelihood score of the surprise*, with t-distributed innovations handling blowouts without ad-hoc variance floors. For margins: y_t ~ t_ν(μ_team(t), σ²), μ = f(θ_attack − θ_defense + HFA).
**Why unclaimed**: GAS×football arXiv = 0. Kalman (Gaussian, thin tails) is in our stack; GAS is the heavy-tail upgrade — blowouts become information, not outliers to clip.
**Football weighting**: replaces/augments kalman_ratings; θ updates scale with |t|-score → a 30-point loss moves ratings MORE than Kalman would (correctly, since t-tails say 30pts isn't a 6σ shock).
**Data**: historical margins (nfl_games in data pipeline) — READY.
**Kill test**: walk-forward CRPS vs Kalman AND vs Gaussian-close (bar 7.109). Only adoption path = beat the bar. PAYOFF: PICKS (margin/totals), CLV stabilization.

## E. SYNTHETIC CONTROL FOR SINGLE-TEAM REGIME EVENTS [VERIFIED UNCLAIMED]
**The equation.** ATT = (y_1^T − Σ w_j y_j^T) where w solves min ||y_1^pre − Σ w_j y_j^pre||² s.t. w ≥ 0, Σw = 1 — build a weighted placebo "twin" of team i from other teams' trajectories, then the post-event gap (QB injury, OC firing, trade) = causal effect.
**Why unclaimed**: synthetic control × NFL arXiv = 0. Every "how does losing LT affect totals" take is either a regression on pooled data or vibes.
**Football weighting**: unit = team-week; outcome = EPA/margin/total residuals (market-adjusted, from our stack); donor pool = 31 teams × lags. Angle: event-study edge windows — the market re-prices regime changes in 1-2 weeks; SC estimates the true level shift faster → positions on under/over-reaction.
**Data**: margins + residuals (stack) + event flags (injuries corpus) — READY.
**Kill test**: placebo-in-time (fake event dates must show no effect) + pre-period fit RMSE floor. PAYOFF: PICKS (week-level), motivation/context features with honest causal values.

## F. TOPOLOGICAL DATA ANALYSIS ON TRAJECTORIES — movement "shape" as a feature family [VERIFIED UNCLAIMED-with-caveat]
**The equation.** For a drill path γ(t), compute persistent homology of the sublevel-set filtration of the distance-to-path function; H0/H1 persistence diagram D; vectorize by persistence images Π(D) = Σ w_i φ_i(p,q) over pixel grid. Or simpler: turning-function energy = ∫ κ(s)² ds (total squared curvature).
**Why unclaimed**: TDA×player-tracking arXiv = 0 (caveat: sports-TDA exists in biomechanics venues outside arXiv sports-analytics; we searched the arXiv face of it). The cheap version (curvature energy, path efficiency) is implementable stdlib today.
**Football weighting**: combine-drill paths → shape descriptors that separate "smooth COD" from "herky-jerky" at equal split times — the biomechanics scouts argue about, quantified. BDB 2027 angle: persistence-image heatmaps are judge-beautiful (viz = 20% of score) AND novel (football-score unique).
**Data**: BDB combine tracking when released; TODAY: we can prototype on any 10Hz-like path (public drill GPS traces rare — prototype on synthetic + NGS game tracks post-release).
**Kill test (BDB-flavored)**: do shape features add predictive power on rookie EPA *beyond* speed/accel/capital? Walk-forward by draft class. PAYOFF: BDB 2027 (headline candidate), RANK (developmental runway).

## G. DOUBLE MACHINE LEARNING FOR THE CONTEXT FACTORS — debiased coefficients, finally [PROVEN IN SOCCER, OPEN IN NFL]
**The equation.** Chernozhukov et al 2018: cross-fit nuisance models m(X), g(X); θ̂ = Σ (Y−g(X))(T−m(X)) / Σ (T−m(X))² — orthogonalized estimation of treatment effect (rest/travel/short-week/turf) with Neyman-orthogonality so ML nuisance errors don't bias θ̂.
**Why open**: arXiv DML×sports = 2 soccer hits (formations, goals-above-expectation). NFL context effects (our wish #9 rest/travel "tiebreaker only" doctrine) have never been DML'd publicly.
**Football weighting**: T = the context factor (e.g., post-bye, travel-direction, turf), Y = market-adjusted residual (margin − close), X = team strength lags, schedule features. Output: the debiased points-per-context coefficients the doctrine demands — replacing pooled OLS (which absorbed strength confounds).
**Data**: PBP + schedule + our residuals — READY post re-pull.
**Kill test**: coefficient stability across folds + placebo treatments (random fake rest-weeks must yield ≈0). PAYOFF: PICKS (context adjustments with honest error bars), wish #9 done rigorously.

## H. NEURAL ODE TRAJECTORY STATE-ESTIMATION [UNCLAIMED-with-caveat, compute-gated]
**The equation.** dh/dt = f_θ(h(t)) integrated between 10Hz samples; observation y_k = C h(t_k) + ε — continuous-time latent state for movement between/within samples; train by adjoint method.
**Why gated**: arXiv N-ODE×player-tracking = 0, but the family is compute-heavy (Colab/PC lane). Position: BDB Phase-2 exploration only, after kinematic canon (§BDB doc) is banked. The cheap cousin — RTS-smoothed kinematics on 10Hz data — is where we start; N-ODE only if the smooth version shows signal.
**PAYOFF**: BDB (trajectory denoising → cleaner COD features).

## I. ONLINE REGRET-MINIMIZATION FOR BOOK-TRUST WEIGHTS (the line-shopping brain)
**The equation.** Multiplicative weights / Hedge (Freund-Schapire): after each graded snapshot, w_b,t+1 = w_b,t · exp(−η·ℓ_b,t) / Z, where ℓ_b,t = book b's log-loss on that event vs realized close — the *consensus pool* (our opinion_pool) gets book weights that LEARN.
**Why novel here**: not in arXiv under sports; operationally unclaimed for line-shopping stacks. Ties directly into tonight's books_api + CLV ledger + PP/DK/Pinnacle snapshots.
**Kill test**: pooled consensus log-loss with learned weights < equal weights, walk-forward. PAYOFF: PICKS (better μ̂), the "close" itself gets sharper.

## J. POSTERIOR-KELLY (sizing under parameter uncertainty)
**The equation.** E[growth] = ∫ log(1 + f·(b·1{win} − 1{lose})) dΠ(θ) over parameter posterior Π (σ̂ from our DK-table uncertainty, μ̂ from our model) — draw 1,000 (μ,σ) pairs, average log-growth, optimize f. Versus plug-in Kelly, this auto-fractionalizes when the edge is uncertain (the mathematically honest version of "half-Kelly").
**Why unclaimed here**: plug-in Kelly exists everywhere; posterior-integrated Kelly as an operational prop-sizing default isn't in the NFL stack canon (Baker-McHale style results exist in theory venues).
**Data**: props_deep + dk_stat_distributions uncertainty — READY NOW (stdlib MC).
**Kill test**: MC growth curves with parameter noise: posterior-Kelly median growth ≥ plug-in Kelly, with lower ruin rate (kelly2.risk_of_ruin harness). PAYOFF: PROPS/PARLAY sizing doctrine upgrade.

## K. CONFORMAL DRIFT GATE (the abstain engine made rigorous)
**The equation.** Two-sample MMD² between this week's feature distribution and the calibration window's (kernel k): MMD² = 1/m² ΣΣ k(x_i,x_j) + 1/n² ΣΣ k(y_i,y_j) − 2/mn ΣΣ k(x_i,y_j); permutation test p-value → if MMD² exceeds its null-quantile, the week is NOT exchangeable with calibration → abstain floor widens (ties to wish #10 + brain doc's non-exchangeable conformal family).
**Data**: team-state features weekly — READY.
**Kill test**: does the gate improve net CLV by skipping flagged weeks vs betting all? PAYOFF: PICKS (abstain automation), doctrine compliance.

---
## PRIORITY ORDER (payoff ÷ effort ÷ doctrine-risk)
1. **C. EVT prop tails** — book shape assumption provably wrong on longest-X; ladders already in hand. *(today's best)*
2. **J. Posterior-Kelly** — stdlib MC today; upgrades sizing doctrine honestly.
3. **K. Conformal drift gate** — abstain automation; doctrine-native.
4. **A. Hawkes-football** — the born-here paper; live repricing upgrade (needs PBP re-pull).
5. **D. GAS strengths** — drop-in Kalman upgrade; CRPS bar decides.
6. **I. Hedge book-weights** — trivial to wire on snapshot diffs.
7. **G. DML context** — the rigorous wish #9; post re-pull.
8. **E. Synthetic control** — event-study edges.
9. **B. IRL coaches** — biggest wow, biggest build.
10. **F. TDA trajectories** — BDB 2027 headline candidate (viz + novelty).
11. **H. Neural ODE** — Phase-2 BDB exploration.

## DOCUMENTATION CHAIN (everything we've shipped — the all-work ledger)
1. `GSE_HANDOFF_PACK_2026-10-10.md` (234KB single-file for the coding agent) + tarballs in shared/gse/
2. `GSE_REVERSE_ENGINEERING.md` (endpoints, recipes, their-engine recon)
3. `ENGINE_GAP_AUDIT.md` (60 engines: file:line proof; the 51-memo corrected)
4. `REDUNDANCY.md` (fallback chains + 12-bottleneck forecast)
5. `CONTEXTUAL_LAYER.md` (cognitive/contextual atlas + own aging/capital curves + K1-K12 kill registry)
6. `BDB2027_GROUNDWORK.md` (comp spec, CV verdict, feature canon, timeline)
7. This registry + nightly memory checkpoints (2026-10-10.md) + `build_delivery.py` manifest with shas.
