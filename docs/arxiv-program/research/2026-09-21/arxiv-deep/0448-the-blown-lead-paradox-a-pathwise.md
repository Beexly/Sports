# [0448] The Blown Lead Paradox: Conditional Laws for the Running Maximum of Binary Doob Martingales (arXiv:2601.18774v4)

**Citation:** Jonathan Pipping-Gamón, Abraham J. Wyner (2026). *The Blown Lead Paradox: Conditional Laws for the Running Maximum of Binary Doob Martingales*. arXiv:2601.18774v4, Department of Statistics, University of Pennsylvania, August 10, 2026. URL: https://arxiv.org/abs/2601.18774v4
**Ledger completed:** 2026-09-21. **Read:** full text (§§1–5, Appendices A–D with all proofs, references; 6,455 text lines).
**Verdict:** ADAPT — exact distributional laws for the running maximum of win-probability martingales, purpose-built as a calibration diagnostic for live in-game win-probability models. GSE's X operation publishes live game coverage with win-probability narratives ("collapse" framing); this paper gives the closed-form benchmark to test whether an eventual loser's peak WP is anomalous or expected under calibration. Adopt as the formal gate for GSE's own in-game WP model.
**Note on title:** the assignment lists this paper as "The Blown Lead Paradox: A Pathwise Calibration Benchmark for Win Probability Forecasts" (an earlier version's title); v4's actual title is as cited above.

## 1. Research question
Motivating case: ESPN's win-probability model assigned the Philadelphia Eagles a peak 78.4% win probability early in the third quarter of Super Bowl LVII (ESPN 2023); the Eagles lost on a last-second field goal, and commentary treated it as an extraordinary "collapse." The paper asks: under a correctly specified (Doob-martingale) forecast process, what is the reference distribution of the path maximum — especially conditional on the team ultimately losing — so that a quoted peak win probability has evidentiary value rather than relying on naive fixed-time intuition (comparing to 1 − 0.784)?

## 2. Dataset / schema
No new dataset is collected in the main text. The paper is purely martingale-theoretic: the "data" are the win-probability paths p_k = E[Y | F_k] for binary terminal outcomes Y ∈ {0,1}. The empirical validation on NFL and NBA data, simulation details, and formal testing procedures (S1.1–S1.3, S2, S3) are in the separate Supplementary Material (Pipping-Gamón & Wyner 2026, arXiv self-citation) — referenced but not present in this cached full text. The only empirical anchor in the main text is the ESPN Super Bowl LVII graphic (accessed 2026-01-22).

## 3. Method / model
Model the live win-probability sequence as the Doob martingale p_k = P(Y=1 | F_k), bounded in [0,1], with p_0 = P(Y=1) ∈ (0,1) and p_N = Y ∈ {0,1}; path maximum M_N = max_{0≤k≤N} p_k and first-passage time τ_x = inf{k ≥ 0 : p_k ≥ x}. Via optional stopping at τ_x ∧ N, the authors derive sharp bounds on the CDF of M_N (unconditional and conditional on Y=0) in discrete time, with explicit correction terms for last-step crossings (P(τ_x = N)) and overshoots (p_{τ_x} − x on {τ_x < N}); under continuous-path regularity these corrections vanish, yielding exact distributional identities. Extensions: the two-player eventual-loser maximum M_λ = sup_t(p_t 1{Y=0} + q_t 1{Y=1}) with q_t = 1 − p_t, and the n-player eventual-winner minimum M_ω = inf_t Σ_i p_t^{(i)} 1{Y^{(i)}=1}. Application sections show how the laws serve as expectation-calibration and diagnostic-validation baselines for head-to-head models and model-based trading strategies (M_loss = sup p_t on losing trades).

## 4. Equations & assumptions
Assumptions: (p_k) is an exact Doob martingale p_k = E[Y | F_k] (in practice a model approximating it — misspecification shows up as empirical deviation from the benchmark); exact identities additionally require path regularity (continuity, or equivalently no terminal-step crossings and no overshoots: P(p_{τ_x} > x, τ_x < N) = 0 and P(τ_x = N) = 0); binary terminal outcomes p_N ∈ {0,1} (no ties); in the two-player extension exactly one team wins; in n-player settings exactly one winner with Σ_i p_t^{(i)} = 1.

Key results, quoted faithfully:
- Discrete-time unconditional (Theorem 1/5): F_{M_N}(x) ≥ 1 − p_0/x for x ∈ [p_0, 1); F_{M_N}(x) = 0 for x < p_0; atom P(M_N = 1) = p_0. Equality iff P(τ_x = N) = 0 and p_{τ_x} = x a.s. on {τ_x < N}.
- Discrete-time conditional (Theorem 2/6): F_{M_N|Y=0}(x) ≥ 1 − (p_0/(1−p_0))·((1−x)/x) for x ∈ [p_0, 1).
- Continuous-path unconditional (Theorem 3/7): F_M(x) = 0 for x < p_0; 1 − p_0/x for x ∈ [p_0, 1); 1 at x = 1; atom P(M = 1) = p_0.
- Continuous-path conditional (Theorem 4/8): F_{M|Y=0}(x) = 1 − (p_0/(1−p_0))·((1−x)/x) for x ∈ [p_0, 1); 0 below p_0; 1 at x = 1. Note: on {Y=0} the process never attains 1 a.s. (if p_t = 1 then Y = 1 a.s.).
- Two-player eventual-loser maximum (eq 1, Appendix C), w.l.o.g. p_0 ≥ 1/2: F_{M_λ}(x) = 0 for 0 ≤ x < 1−p_0; 1 − (1−p_0)/x for 1−p_0 ≤ x < p_0; 2 − 1/x for p_0 ≤ x < 1; 1 at x = 1.
- Symmetric case p_0 = 1/2: F_{M_λ}(x) = 2 − 1/x on [1/2, 1); e.g. P(M_λ ≥ 2/3) = 1/2 — half of all symmetric games should see the eventual loser reach ≥ 67% win probability.
- n-player eventual-winner minimum (eqs 5/14, 8): F_{M_ω}(x) = Σ_{i:x≥p_0^{(i)}} p_0^{(i)} + (x/(1−x))·Σ_{i:x<p_0^{(i)}} (1 − p_0^{(i)}) for x ∈ [0, max_i p_0^{(i)}); symmetric p_0^{(i)} = 1/n: F_{M_ω}(x) = (n−1)x/(1−x) on [0, 1/n); e.g. n = 3: P(M_ω ≤ 0.2) = 1/2.
- Trading diagnostic (eq 9): M_loss on losing trades (Y = 0) obeys the conditional law above; e.g. p_0 = 1/2: P(M_loss ≥ 2/3 | Y = 0) = 1/2.

## 5. Features / target
Inputs ("features"): the win-probability path itself (p_k over the game) and the pre-game prior p_0 for each matchup. Target: the path extreme — the eventual loser's peak win probability M_λ, or (in multi-outcome settings) the eventual winner's trough M_ω. Horizon: full game. No feature engineering is involved — the diagnostic is model-agnostic and applies to any calibrated win-probability path.

## 6. Validation design
Theory-validated, not empirically validated in the main text: proofs via optional stopping (Appendices A–D). The authors state that formal testing procedures, simulation details, and empirical validation on NFL and NBA data live in the Supplementary Material (§4.4, §5.2) — which was not in the cached full text, so those empirical results cannot be reported here. The theoretical claims in the main text are fully proved; the discrete-time equalities are characterized exactly (no overshoot + no terminal-step crossing), so the stated applicability conditions are verifiable rather than assumed.

## 7. Numerical results / baselines
The paper's "results" are exact closed forms rather than fitted estimates:
- Symmetric two-player games: under perfect calibration, P(M_λ ≥ 2/3) = 1/2 — half of all evenly matched games feature the eventual loser reaching at least 67% win probability. The Eagles' 78.4% peak: F_{M_λ}(0.784) = 2 − 1/0.784 ≈ 0.7245, so P(M_λ ≥ 0.784) ≈ 0.2755 — a peak that high is mildly unusual but far from extraordinary under correct calibration.
- Symmetric three-player games: P(M_ω ≤ 0.2) = 1/2 — half of winners dipped to ≤ 20% win probability at some point.
- Losing trades with p_0 = 1/2: P(M_loss ≥ 2/3 | Y = 0) = 1/2.
- Baselines improved upon: classical Doob/Ville maximal inequalities and Ville-type bounds, which control only the upper tail — this paper replaces tail bounds with full distributions.

## 8. Code / data availability
None stated for the main text. The ESPN 2023 win-probability graphic is cited (accessed 2026-01-22). Simulations and NFL/NBA empirical diagnostics are in the supplement (not cached here). No code repository is named in the main text.

## 9. Leakage & limitations
- The headline identities require exact Doob-martingale structure (p_k = E[Y | F_k]) — real win-probability models are estimates, and the authors explicitly say deviations from the martingale property manifest as empirical-vs-theoretical discrepancies. This is a feature (it's a diagnostic), but it means the benchmark cannot distinguish miscalibration from non-martingale dynamics without further structure.
- Exactness requires continuous paths; with coarse update schedules or jumps (NFL win probability often updates play-by-play with large discrete jumps — e.g., a pick-six can move WP 30+ points), the discrete bounds are inequalities that may be loose. The paper quantifies the gap via the overshoot/terminal-crossing corrections, but gives no bound on how large they can be in practice.
- Binary terminal outcomes only — no ties (relevant for NFL: ~1% of games), no continuous outcomes; extensions listed as future work.
- The NFL/NBA empirical validation claimed in §4.4/§5.2 is in the supplement, not verified in this read — the practical tightness of the discrete-time bounds on real football WP paths is unconfirmed from the main text.
- The symmetric-case shockers (P = 1/2) hold for pre-game p_0 exactly 1/2; NFL games are rarely exactly symmetric, and the asymmetric piecewise form must be used with the estimated p_0 — small p_0 error propagates through the kink at x = p_0.

## 10. GSE overlap
Extension, not duplicate. The existing-research-map's "Standouts already absorbed" lists iWinRNFL (1704.00197, in-game WP modeling) and the LRD calibration dashboard (2207.13770), and notes that live spread/total probability surfaces are thin — so GSE's corpus covers building in-game win-probability models but has no pathwise calibration benchmark for them. This paper is the missing diagnostic: it gives the exact reference law against which any GSE in-game WP path can be tested. Complements (rather than duplicates) the calibration tooling, and directly supports the X operation's live-game coverage by formalizing when a "collapse" narrative is statistically warranted.

## 11. GSE implementation spec
Build a pathwise calibration monitor for GSE's in-game win-probability model:
1. Data: GSE's in-game WP paths (or nflverse-derived WP, e.g. from nflfastR's wp columns) for 2022–2025 NFL games, with pre-game WP p_0 per game (de-vigged market or model prior) and final outcomes.
2. Per game, compute the eventual loser's peak WP M_λ and record p_0. (Use the designated-team convention; swap labels so p_0 ≥ 1/2 w.l.o.g. per the paper.)
3. Compare the empirical CDF of M_λ against the theoretical piecewise law F_{M_λ}(x) (with per-game p_0 entering the 1−p_0 and p_0 kink points — stratify games into pre-game favorite tiers: |p_0 − 0.5| < 0.05, 0.05–0.15, > 0.15) via KS tests and binned exceedance rates at x ∈ {2/3, 3/4, 0.8, 0.9}.
4. Because NFL WP updates are coarse (play-by-play jumps), use the discrete-time inequality form as the primary benchmark and report overshoot diagnostics (fraction of games where the first passage overshoots x by > 5 points) to quantify looseness.
5. Wire into the weekly model-monitoring dashboard: flag weeks where empirical P(M_λ ≥ 2/3) deviates from the tier-averaged theoretical value by more than the KS critical value. Effort: ~2–3 days; inputs already exist if the in-game WP model is live.

## 12. Reproducible test
Dataset: 2023–2024 NFL regular seasons (544 games). Baseline: a naive fixed-time check — the fraction of games where the eventual loser's pre-game-to-loss logic flags "collapse" (e.g., peak WP ≥ 75% treated as anomalous, the naive broadcast intuition). Metric: KS statistic between the empirical M_λ CDF (stratified by pre-game favorite tier) and the paper's theoretical CDF; plus empirical exceedance rates at 2/3 and 3/4 vs theoretical P(M_λ ≥ 2/3) = 1/2 for the near-symmetric tier. Test: in the near-symmetric tier (|p_0 − 0.5| < 0.05, pre-game p_0 from de-vigged moneyline), the empirical exceedance P(M_λ ≥ 2/3) must fall within the 95% binomial CI of 1/2 for GSE's WP model to pass calibration; if it passes, the monitor is adopted as the standing gate for live-WP model updates.

## 13. Acceptance / rejection gate
ADOPT the pathwise calibration monitor as the standing diagnostic for GSE's in-game WP model iff on 2023–2024 data the KS statistic between empirical and theoretical M_λ CDFs is non-significant at α = 0.05 in at least two of the three pre-game tiers, AND the overshoot diagnostic shows first-passage overshoot > 5 WP points in fewer than 25% of games (so the discrete-time bounds are practically tight). REJECT as a hard gate (keep as descriptive context only) if the KS test fails in ≥ 2 tiers or overshoot is pervasive — either outcome still validates the paper's editorial point: collapse narratives in GSE's live coverage must reference the benchmark, never naive fixed-time probabilities. Gate fixed before running.

## 14. Improvement experiment
Go beyond the paper: extend the diagnostic to GSE's live spread/total probability surfaces (the map notes these are thin — §10's "In-play / live NFL spread & total modeling" gap). The paper covers binary outcomes only; build the analogous pathwise benchmark for a ternary outcome (favorite covers / push / underdog covers) by modeling the cover-probability martingale and deriving the conditional maximum law for the "eventual non-cover" path — testing whether the discrete-time overshoot corrections stay small on real NFL cover-probability paths. If the ternary extension validates, GSE gets a first-mover calibration diagnostic for live spread markets that the paper's binary framework doesn't cover.
