# [1444] The Calibration-Leverage Tradeoff in Exactly Solvable Win-Probability Models (arXiv:2608.14696)

**Citation:** Devansh Mishra (2026). *The Calibration-Leverage Tradeoff in Exactly Solvable Win-Probability Models*. arXiv:2608.14696v1 [physics.soc-ph]. URL: https://arxiv.org/abs/2608.14696
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 19 pages, converted via pdftotext).
**Verdict:** ADAPT — adopt the two-surface architecture (exact-martingale surface for leverage/WPA attribution, fitted calibrated surface for probability reporting) and the calibration-diagnosis playbook (marginal elimination, permutation decomposition of dependence) for GSE's in-game NFL win-probability layer.

## 1. Research question
Can one win-probability object deliver both exact attribution (leverage, win probability added) and calibrated probabilities? The paper builds an exactly solvable Markov WP model for T20 cricket run chases (backward induction over the acyclic (balls, wickets, runs-required) state graph), uses its martingale property to define leverage and WPA exactly, then diagnoses why that same construction is systematically miscalibrated — and proves the two goals are mutually exclusive within that state description, identifying unmodelled short-range sequential scoring dependence as the mechanism.

## 2. Dataset / schema
Indian Premier League ball-by-ball data, 2008–2026, Cricsheet-derived, restricted to second-innings chases: **1,162 chases, 130,029 legal deliveries**. Schema per delivery: pre-ball state (b = balls remaining, w = wickets in hand, r = runs required), one of eight outcomes o ∈ {0,1,2,3,4,5,6,W}, realized match label y ∈ {0,1}. Data-contract decisions disclosed: extras folded (wide/no-ball adjusts runs without consuming a legal ball), run-outs folded into W, rain-affected matches dropped, monotonicity of (b,w,r) enforced at ingestion. Train/held-out split temporal and fixed: three most recent seasons (2024–2026; 18,010 balls, 164 matches, realized win rate 0.498) held out; remaining 998 innings (112,019 balls) train. Public source (Cricsheet), fully replicable.

## 3. Method / model
Single estimated object: one-ball outcome distribution p_o(s) conditioned on required run rate (RRR = 6r/b, six bins), wickets in hand, innings phase (powerplay/middle/death), with two-level shrinkage (each cell shrinks toward (phase, wickets) parent, which shrinks toward the global distribution, Dirichlet-style pseudo-counts; unseen cells fall back down the hierarchy). WP for every state from one backward sweep over the acyclic transition graph — no iteration, nothing about winning fitted. Scoring-era drift (training 1.344 runs/ball vs held-out 1.598) handled inside the estimation layer with exponential recency weights (half-life h = 0.75 seasons, selected by rolling-origin CV on the three most recent training seasons with a ≥15% effective-sample-size rule — the most aggressive half-life on the improving curve). Baselines: constant base rate, base Markov, RRR Markov, RRR Markov + era, logistic on RRR alone, logistic with engineered features, XGBoost on (b,w,r), XGBoost full features.

## 4. Equations & assumptions
- Recursion: V(s) = Σ_o p_o(s)·V(s'_o) (eq. 1), verified to machine precision (10⁻⁹ on random states). Terminal: r≤0 win; w=0 or b=0 with r>1 loss; (b=0,r=1) tie valued 1/2.
- Martingale consequence: under the model, E[V(next)|s] = V(s); empirically mean signed one-ball WP change over 130,029 balls = +0.00048, near zero in every WP decile.
- Leverage: swing(s) = Σ_o p_o(s)|V(s'_o) − V(s)| (eq. 2, conditional MAD of next-ball WP; baseball's leverage-index absolute-value convention). LI normalized so average real delivery = 1 (reference average 0.0170 WP/ball).
- WPA: ΔV charged to batsman, −ΔV to bowler; zero-sum on every ball (machine precision, enforced by tests); a side's WPA telescopes over an innings to y − V(first ball). De-drifted state-conditionally (mean WPA of balls beginning in same WP bin, width 0.02) to remove the +62.3-win aggregate calibration drift.
- Key assumption: conditional independence of balls given (b,w,r) — load-bearing, later shown to be the calibration failure. No equations invented; all above stated in paper.

## 5. Features / target
Features (estimation): RRR bins (6), wickets in hand, innings phase. Target: chase-outcome label y ∈ {0,1} via the recursion, not fitted directly. Comparator logistic/XGBoost models see (b,w,r), RRR, engineered features, striker's balls-faced count (set-batsman proxy).

## 6. Validation design
Held-out: 2024–2026 seasons (temporal, future-side split), 18,010 balls/164 matches. Metrics: Brier score, log loss, ECE, reliability curves. Honest comparison protocol: because ~120 balls share one innings label, all model comparisons report a **paired, match-clustered bootstrap on the log-loss difference** (whole matches resampled, per-ball differences paired); "significant" = 95% interval excludes zero. Calibration diagnostics (Section 6) computed train-on-train to remove era shift, then confirmed held-out.

## 7. Numerical results / baselines
Quoted exactly (held-out, Table 1):
- constant base rate: Brier 0.2503, log loss 0.6937, ECE 0.0169
- base Markov: 0.2040 / 0.8011 / 0.2235
- RRR Markov: 0.1637 / 0.5313 / 0.1627
- RRR Markov + era (h=0.75): **0.1489 / 0.4741 / 0.1310**
- logistic on RRR alone: **0.1404 / 0.4379 / 0.0773** (beats the full Markov model)
- logistic, engineered: 0.1350 / 0.4157 / 0.0700
- XGBoost (b,w,r): 0.1414 / 0.4374 / 0.0771; XGBoost full: 0.1490 / 0.4607 / 0.0847
- Era adjustment gain: −0.057 nats (CI [−0.079, −0.035]), closes 63% of Brier gap to strongest simple reference.
- Unconstrained XGBoost on identical (b,w,r) beats exact Markov by 0.094 nats (CI [0.026, 0.174]), ECE 0.077 vs 0.163. Adding striker balls-faced: +0.0004 nats (CI [−0.0032, +0.0035]) — decisive null.
- Calibration gap by RRR (train): RRR 0–6: +0.014; 6–8: +0.032; 8–10: −0.071; 10–12: −0.112 (worst; 18%-rated chases won 29%); fading to −0.008 at 22–40. Held-out confirms shape (trough −0.267 at RRR 8–10).
- Marginals: model vs empirical one-ball distribution TV distance ≤ 0.02 at every RRR; p4+p6 shortfall ≤ 0.006 anywhere; wicket-prob shortfall ≤ 0.008.
- Permutation decomposition: innings heterogeneity explains only ~18% (null centre +0.008 vs observed lag-1 +0.044); residual is 3–5-ball sequential scoring persistence (lag-1 excess +0.036, lag-3 +0.021, lag-5 +0.008, null by lag 10–20). Wickets anti-cluster (lag-1 −0.009 vs null [−0.006,+0.005]).
- Block-bootstrap with K=20: mean absolute slice gap 0.0613 → 0.0451, **26% reduction**, replicated 6/6 seeds, saturating at K≈20 (matches decomposition range).
- Leverage results: death-over mean LI 1.59 (final over 2.67); finishers (Pandya 1.40, Dhoni 1.39, Pollard 1.34). Dhoni clutch split: +0.018/ball high-minus-low (CI [+0.004,+0.032]). No adjacent pair in any top-10 leaderboard statistically separable; role contrast decisive (LI +0.69, CI [+0.33,+1.08]).

## 8. Code / data availability
None stated. Data: Cricsheet (public). All methods described in sufficient detail to reimplement.

## 9. Leakage & limitations
- Single league, one innings type (IPL chases); tradeoff demonstrated there, not proven universal. First innings / other sports open.
- The 26% is a floor (block bootstrap breaks dependence at boundaries); full effect unmeasured — a generative dependent model is future work.
- The designed heterogeneity-only control degenerated into a nearest-neighbour replay (TV drift 0.018, 5× block modes); the serial-vs-heterogeneity split rests on the permutation decomposition alone.
- 69-ish pages would be heavy if re-derived; but the method is compact.
- Residual lag-1 autocorrelation +0.037 is an explicit published error bound on the attribution layer.
- Applicability to NFL: cricket chase states are acyclic by construction; NFL game states (score diff, down, distance, time) are also acyclic over time, so the DP construction transfers. NFL-specific note: scoring persistence (hot/cold offensive stretches within a game) is the direct analogue of the 3–5-ball effect and would need the same diagnosis.

## 10. GSE overlap
GSE has fourth-down/in-game WP models (nfl4th, full correction literature — existing-research map Section 1) and calibration work (temperature/Platt/Venn-Abers, grouping loss arXiv 2210.16315). What's NEW here: (a) the exact martingale DP construction with leverage/WPA attribution layer as a *principled alternative* to fitted WP for player/clutch attribution; (b) the calibration–leverage tradeoff itself — Garrett's corpus has no statement that exact attribution and calibrated probability cannot live on the same scoreboard-state object; (c) the permutation-decomposition diagnostic separating sequential momentum from shared heterogeneity (usable on NFL play-by-play); (d) the explicit error-bound publishing discipline for attribution surfaces. Extension, not duplication.

## 11. GSE implementation spec
1. Build exact-martingale WP surface for NFL: state (time remaining, score diff, down, distance, field position, timeouts); estimate one-play transition distribution from nflverse play-by-play with shrinkage; backward induction over the acyclic time graph → V(s) martingale.
2. Leverage layer: swing(s) = E[|ΔV|] per play state; LI normalization; WPA charged per play (offense ΔV, defense −ΔV), state-conditional de-drifting to remove calibration drift.
3. Two-surface deployment: fitted/calibrated surface (logistic/XGBoost on same features) for all *reported* WP numbers and any downstream pick math; exact surface for *attribution* (clutch players, high-leverage moment content) with published error bounds.
4. Calibration diagnostics: reliability by score-diff/time slices; permutation decomposition of play-level residuals within games to separate drive-level momentum from game-level heterogeneity (direct NFL analogue of the cricket analysis).
5. Effort: 3–5 days for the DP surface + attribution layer on nflverse; calibration diagnostics 2 days.

## 12. Reproducible test
Dataset: nflverse play-by-play 2014–2025. Build exact-martingale V and a fitted logistic WP on identical features. Test 1 (calibration): ECE and log loss of both surfaces on held-out 2024–2025 seasons — expect the fitted surface to win (paper's inversion). Test 2 (dependence): permutation decomposition of play-level EPA residuals within games; measure lag-1..10 autocorrelation vs within-game permutation null. Test 3 (attribution): compute LI for all 2024 games; verify top-leverage players are QBs/RBs in tight late-game spots (NFL analogue of finishers).

## 13. Acceptance / rejection gate
ADOPT the two-surface architecture if on nflverse data: (a) exact-martingale WP shows the same over-dispersion signature (fitted surface beats it on ECE by ≥ 0.02 on held-out), AND (b) the permutation decomposition finds significant within-game sequential dependence (lag-1..3 outside the null band), AND (c) leverage rankings separate known roles (late-game closers/clutch QBs) from volume anchors. REJECT if the fitted and exact surfaces are comparably calibrated (difference < 0.01 ECE) or no within-game dependence is found — then the tradeoff does not bite in NFL and a single surface suffices.

## 14. Improvement experiment
The paper prices but does not build the Markov-switching generative dependent model (a hidden hot/cold regime with 3–5-play persistence in NFL terms) — which it notes would recover calibration at the cost of exact attribution. GSE should build it as the *third* surface: a regime-switching play-outcome process whose filtered posterior feeds the reporting surface's probabilities while the exact martingale surface retains attribution. If regime-modelled WP beats the plain fitted surface by ≥0.005 nats held-out (match-clustered CI), the tradeoff becomes a tri-surface stack with strictly better probabilities than the paper's own two-surface resolution.
