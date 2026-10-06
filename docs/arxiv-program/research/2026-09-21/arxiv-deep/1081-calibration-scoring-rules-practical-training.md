# 1081 — Calibration Scoring Rules for Practical Prediction Training

## Citation / full-text source

- arXiv:1808.07501v2 — full text: https://arxiv.org/pdf/1808.07501
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1808.07501v2
- **Full-text URL**: https://arxiv.org/pdf/1808.07501v2 (read in full; cached text 73,754 bytes, read cover to cover including all equations, user-testing notes, parameter choices, and references)
- **Authors**: Spencer Greenberg
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: none (assigned paper, not rejected)
- **Reason for ADAPT**: The paper's core contribution — a "Practical" scoring-rule transform that preserves properness while making scores human-interpretable (0 points = random guess, positive iff correct, bounded losses, capped confidence) — is exactly what GSE's analyst-facing calibration needs: a forecaster leaderboard and calibration-training loop for GSE's own analysts/cappers that rewards honest, well-calibrated confidence without the log score's unbounded blowups that destroy user trust. The two prediction-interval rules (Distance and Order-of-Magnitude) are directly applicable to GSE analyst range forecasts on game totals and scores. The method is tuning-light (s_max=10, p_max=0.99, δ=0.4 fixed by user testing) and the math is fully specified.
- **Read depth**: FULL READ: motivation and five desirable scoring-rule properties, seven intuitive properties, properness of quadratic/Brier/log/spherical scores, convex-function construction of proper scores, prediction-interval proper-score setup (linear rule eq. 7, log rule eq. 8, their drawbacks), Choice Prediction framing, Practical rule derivation with properness proof, log-rule specialization and binary simplification, Distance and Order-of-Magnitude interval rules with the five gained properties, δ-expansion and s_min capping, parameter choices, conclusion, references.
- **Wave**: wave2-reader-20
- **GSE overlap**: No scoring-rule/leaderboard-calibration ledger in the corpus. Related: calibration methods (ENIR 1074, Venn-Abers, temperature scaling) are model-calibration, not forecaster-scoring; this is the human layer of the calibration stack — new capability, not duplicate.

## Research question

How can proper scoring rules be transformed so they stay proper while becoming human-interpretable for forecaster training — 0 points for a random guess, positive iff correct, bounded losses?

## Summary

Proper scoring rules incentivize honest probabilistic beliefs, but raw log/quadratic scores are hostile in real training systems: unbounded losses let one bad forecast destroy a user's score, 0 points never means "no information," and sign doesn't track correctness. The paper enumerates desirable properties for practical calibration training and introduces a "Practical" transform S*(p,c) = S_max·(S(p,c)−S(p_rand,c))/(S(p_max,1)−S(p_rand,1)) (eq. 9), proved proper whenever S is proper on [p_rand,p_max]. Applied to the log rule with s_max=10, p_max=0.99, it yields: 0 points for a random guess, positive points iff correct, capped maximum loss s_min=−57.26893683880667, and max 10 points for a correct 99% forecast. For prediction intervals, the paper derives two bounded, continuous rules — Distance (eq. with r,s,t scaled by c=100) and Order-of-Magnitude (log-scaled, c=ln(100)) — that fix five defects of the standard linear/log interval rules (arbitrary blowups, incomparable β levels, no "no information" zero, sign/correctness mismatch, no credit for centrality) at the cost of properness, which the author explicitly trades off, plus a δ=0.4 interval-expansion trick so boundary hits score positive and an s_min floor capping losses.

## Method, math, and equations

- Proper rule characterization: S proper iff expected score E_q[S(q,ω)] is maximized at q=p (believed = reported); quadratic (Brier) and log rules proper; constructed from any convex function via Gneiting–Raftery (2007) / Selten (1998).
- Linear interval rule (eq. 7): S(x,L,U) = d − ((1−β)/2)((U−L)/c) − penalty proportional to (L−x)/c or (x−U)/c when x∉[L,U]; strictly proper.
- Log interval rule (eq. 8): replaces widths with log(U/L)/c — unit invariant; breaks for zero/negative quantities.
- Practical transform (eq. 9): S*(p,c) = S_max/(S(p_max,1)−S(p_rand,1)) · {S(p,1)−S(p_rand,1) if c=1; S(p,0)−S(p_rand,0) if c=0}. Properness proof: E[q-score] = pS*(q,1)+(1−p)S*(1−q,0); only the q-dependent term pS(q,1)+(1−p)S(1−q,0) matters, maximized at q=p by S's properness. Valid on [p_rand,p_max] with UI clamping outside.
- Log specialization: S(p,c) = s_max/(log p_max − log p_rand)·{log p − log p_rand, correct; log(1−p)−log(1−p_rand), incorrect}; base-independent; binary case reduces to linear transform of log score.
- Distance rule S⁰_dist (and S⁰_mag with log-ratios): piecewise, {−2r/(1−β) − (r/(1+r))s, x<L; 4s_max(rt/s²)(1−s/(1+s)), L≤x≤U; −2t/(1−β) − (t/(1+t))s, x>U}, r=(L−x)/c, s=(U−L)/c, t=(x−U)/c. Gained: max s_max at interval center (arithmetic/geometric mean), 0 at boundaries and as s→∞, continuity, monotonic in centrality. Not proper.
- Final rules: S_dist(x,L,U) = S⁰_dist(x,L−δ,U+δ) floored at s_min; S_mag with (L(1−δ),U(1+δ)).
- Parameters: s_max=10, p_max=0.99 (min 0.01), s_min = −((10·log(99/50))/log(50)) = −57.26893683880667, δ=0.4, c=100 (distance) / c=ln(100)=4.60517 (magnitude).

## Datasets

No formal dataset. Evidence is user-testing of the author's calibration-training program ("in our testing," "in user testing seemed preferable") — sample sizes, protocols, and statistics are not reported. Figure 4 plots the Practical score over binary probabilities {0.01…1.00}. This is a methods/UX paper; treat all "users prefer" claims as anecdotal.

## GSE application and implementation spec

1. **Forecaster leaderboard**: apply the Practical log rule (s_max=10, p_max=0.99, s_min=−57.26893683880667) to GSE analyst game-pick confidence reports (spread/ML/total picks with stated % confidence). Zero = random guess; sign = right/wrong — instantly legible on X.
2. **Range forecasts**: use S_dist (c=100 points) for analyst predicted-score ranges on totals; S_mag for season-long totals (e.g., team win totals spanning orders of magnitude).
3. **Calibration training**: port the paper's training-program framing internally — analysts submit confidence + interval, get scored, and the Practical rule's properness guarantees honest reporting is optimal while bounded losses keep buy-in.
4. Effort: ~1 week (the formulas are closed-form; the work is UI/DB plumbing for analyst submissions).

## Leakage

- Properness of S* holds only if forecasters never want probabilities outside [p_rand,p_max] — the UI clamp is load-bearing; a forecaster with genuine >99% beliefs is scored as if at 99%, a distortion the paper acknowledges but doesn't quantify.
- The Distance/Magnitude interval rules are admittedly improper — the paper accepts this for UX, but GSE must not present them as truth-eliciting; strategic forecasters could game the centrality bonus.
- User-testing claims are anecdotal (no N, no protocol) — the parameter choices (δ=0.4, c=100) are the author's taste, not validated optima.

## Limitations

- Single author, no peer review (arXiv only); references are thin (Garrabrant 2018 blog post, Gneiting & Raftery 2007, Selten 1998).
- No empirical validation on any dataset — zero numbers comparing Practical vs raw scores on real forecasters.
- The s_min value −57.26893683880667 is calibrated to binary true/false questions only; its "consistency across prediction types" is asserted, not derived.
- Order-of-Magnitude rule undefined for zero/negative quantities (same as log interval rule).
- Assumes forecasters' beliefs are actually probabilities; no treatment of Knightian uncertainty or abstention.

## GSE overlap

Model-calibration ledgers (1074 ENIR, Venn-Abers, temperature scaling) calibrate models, not humans. No forecaster-scoring or analyst-leaderboard ledger exists; the existing-research map has no scoring-rule entry. **New capability**: the human layer of the calibration stack — analyst confidence tracking with a proper, bounded, interpretable rule.

## Implementation difficulty

Low. All formulas are closed-form; the only engineering is a submission/scoring UI and a database of analyst forecasts. The risk is social (analyst buy-in), not technical.

## Reproducible test

Backtest on GSE's 2024 analyst-pick archive (or engine picks with archived confidence if analyst data is thin): score every pick with the Practical log rule and with the raw log score; compute Spearman rank correlation between the two forecaster rankings and the worst single-pick loss under each rule. Baseline to beat: raw log score.

## Numeric gate

**0.95** — adopt the Practical rule for the analyst leaderboard only if it preserves the raw-log-score forecaster ranking (Spearman rank correlation ≥ 0.95) while capping the worst single-forecast loss at the paper's s_min (−57.27) instead of the log rule's unbounded blowups: same truth, no trust-destroying outliers. If rank correlation < 0.95, the transform is distorting skill and the raw rule stays.

## Improvement experiment

Fix the paper's two admitted weaknesses jointly: run the first real experiment — A/B test the Practical rule vs raw log score on GSE analysts over a season, measuring (a) rank correlation with log score, (b) calibration of reported confidences (reliability diagrams, ECE of analysts), and (c) retention (do analysts keep submitting under each rule?). Then tune δ and c empirically instead of taking the author's anecdotal 0.4/100 — e.g., choose δ to maximize forecaster retention subject to rank-correlation ≥ 0.95.

## Verdict

**ADAPT** — The Practical scoring-rule transform (eq. 9, proved proper) plus the bounded Distance/Order-of-Magnitude interval rules give GSE a ready-made, human-legible forecaster-scoring layer: 0 = random guess, sign = right/wrong, losses capped, 10-point max — exactly the calibration-training UX the paper user-tested and exactly what GSE's analyst leaderboard needs. Implement on analyst pick-confidence and range forecasts; gate on Spearman ≥ 0.95 vs raw log score with capped losses.
