# 1169 From Proper Scoring Rules to Max-Min Optimal Forecast Aggregation (arXiv:2102.07081)

**Citation:** Eric Neyman, Tim Roughgarden (2023). *From Proper Scoring Rules to Max-Min Optimal Forecast Aggregation*. arXiv:2102.07081v2. URL: https://arxiv.org/abs/2102.07081
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v2, theory paper, via arxiv.org/pdf). Author note: the paper header names Eric Neyman and Tim Roughgarden; pre-reading notes naming different authors were superseded by the PDF itself.
**Verdict:** ADOPT

Match the pooling operator to the scoring rule GSE optimizes (Theorem: quadratic↔linear pooling, logarithmic↔log pooling), and learn ensemble weights online with online gradient descent on the concave weight-score (Theorem 5.3: O(√T) regret vs the best mixture in hindsight). This is the theoretical foundation for GSE's entire aggregation lane — it resolves "which pool + how to weight" in one framework.

## 1. Research question
Is there a principled correspondence between proper scoring rules (for incentive-compatible forecast elicitation) and opinion pooling methods (for forecast aggregation)? The paper defines quasi-arithmetic (QA) pooling w.r.t. a scoring rule's exposure function and justifies it four ways: it recovers linear/log pooling for the quadratic/log rules; it is max-min optimal for a sub-contracting aggregator; it makes the aggregator's score concave in expert weights (enabling no-regret online weight learning); and the QA class is axiomatically characterized.

## 2. Dataset / schema
Theory paper — no dataset, no experiments. Illustrative examples: hurricane landfall (three weather models: 10%, 25%, 70%); extreme-weather low-probability example (informed model 0.1% vs uninformed 20%); election-forecasting models (FiveThirtyEight, The Economist).

## 3. Method / model
- Savage representation (Prop. 3.1, eq. 2): s(p;j) = G(p) + ⟨g(p), δ_j − p⟩, G strictly convex expected-reward function, g its gradient (the "exposure function").
- QA pooling (Def. 3.6): given forecasts p_1..p_m, weights w_i summing to 1, the QA pool p* is the unique p* with Σw_i g(p_i) a subgradient of G at p*; equivalently (eq. 3) p* = argmin_x Σw_i D_G(x ∥ p_i) — minimizes the weighted average Bregman divergence to the experts' forecasts. Computable by convex optimization (ellipsoid method with oracle access to g).
- Quadratic rule: g_quad(x) = (2x_1,...,2x_n) → QA pool = linear pool Σw_i p_i. Log rule: g_log(x) = (ln x_1+1,...,ln x_n+1) → QA pool = logarithmic (geometric) pool p*(j) = c Π_i p_i(j)^{w_i}.
- Convex exposure (Def. 3.11): range of g on the forecast domain D is convex — lets one write g(p*) = Σw_i g(p_i) (eq. 4). Quadratic, logarithmic, and all binary-outcome proper rules have it.

## 4. Equations & assumptions
- Properness: Σ_j p(j)s(p;j) ≥ Σ_j p(j)s(x;j), equality iff x=p. Preserved under positive affine transforms.
- s_quad(p;j) = 2p(j) − Σ_k p(k)²; s_log(p;j) = ln p(j).
- Savage: s(p;j) = G(p) + ⟨g(p), δ_j − p⟩; G_quad(p) = Σ_j p(j)²; G_log(p) = Σ_j p(j) ln p(j).
- Bregman: D_G(p∥q) = G(p) − G(q) − ⟨g(q), p−q⟩ ≥ 0; D_G(x∥q) strictly convex in x; interpretation: expected reward lost reporting q when belief is p.
- Max-min (Thm. 4.1): u(p;j) = s(p;j) − Σw_i s(p_i;j); min_j u(p;j) uniquely maximized at p* = QA pool; min over j achieved simultaneously for all j with p*_j>0; min = Σw_i D_G(p*∥p_i) ≥ 0 (strict unless all positively-weighted reports equal).
- Concavity (Thm. 5.1): WS_j(w) = s(QA pool of p_i with weights w; j) is concave in w for every j — fails for linear or logarithmic pooling under a mismatched scoring rule (explicit counterexamples given).
- No-regret (Thm. 5.3): online gradient descent (Algorithm B.3) on weights achieves regret ≤ 3√m·M·√T vs the best weight vector in hindsight, where M bounds ∥g∥_2; s bounded with convex exposure; adversarial forecasts and outcomes.
- Axioms (Thm. 6.6, n=2): a pooling operator is QA-pooling w.r.t. some g iff it satisfies weight additivity, commutativity, associativity, continuity, idempotence, monotonicity (Kolmogorov/Nagumo generalization to weighted vector-valued means).

## 5. Features / target
Inputs: m expert forecasts (probability distributions over n outcomes), non-negative weights summing to 1. Target: the aggregate distribution p*. Theoretical targets: the regret bound, the axiomatic characterization, the max-min profit.

## 6. Validation design
No empirical validation — proofs. Theorem 4.1 (max-min) holds unconditionally; Theorems 5.1/5.3 require convex exposure; Theorem 6.6 covers n=2 (n>2 needs convex exposure). Supporting empirical citations: linear pooling is the most used in practice [RG10]; logarithmic pooling often outperforms linear empirically [Sat+14b].

## 7. Numerical results / baselines
No experiments; the quantitative results are the bounds and identities:
- Regret bound: ≤ 3√m·M·√T against the best mixture in hindsight (not just the best expert) — an ambitious comparator.
- QA profit guarantee (Thm. 4.1): min_j u(p*;j) = Σw_i D_G(p*∥p_i) ≥ 0, equal across all outcomes with p*_j>0.
- Worked contrast: informed model 0.1% vs uninformed 20% with equal weights → linear pooling ≈10% (failure mode: ill-informed forecast drowns out informed low-probability), logarithmic pooling ≈1.6%.
- Scoring-rule-as-value-judgment: quadratic rule's reward-difference scales linearly in the report (even precision preference across [0,1]); logarithmic rule's difference moves slowly mid-range and fast at extremes (preference for precision near 0 and 1); Fig. 1 example: reporting 70% gives reward-difference 0.8 under quadratic, 0.61 under log (scaled by 2 ln 2).
- Axiom count: 6 axioms exactly characterize the QA class for n=2 (Def. 6.5 → Thm. 6.6).
- Appendix D (scoring-rule family, full-text EOF read): (i) Prop. D.1 — for binary outcomes (n=2), EVERY proper scoring rule has convex exposure, so all QA theorems apply as-is to GSE's binary win/loss predictions regardless of rule choice. (ii) Tsallis family = coordinate-wise power means: quadratic (γ=2) → arithmetic mean (linear pool); γ=3 → coordinate-wise root-mean-square; log rule as γ=1 → geometric mean (log pool); G(p)=−Σ ln p_j (γ=0) → harmonic mean; Tsallis γ>2 loses convex exposure for n>2. (iii) Spherical scoring (α=2) QA pooling has a geometric form: scale each forecast onto the unit sphere → take the weighted average in R^n → shift in the +1_n direction back to the unit sphere → renormalize coordinates to sum to 1. (iv) OGD gradient bound used for the regret proof: ‖∇L_t(w)‖_2 ≤ √(2m)·M with M a bound on ‖g‖_2; weights projected back onto the simplex each step (Algorithm B.3).

## 8. Code / data availability
No code or data (theory). Algorithm B.3 (online gradient descent on weights) is specified in the appendix and implementable from the description.

## 9. Leakage & limitations
- Theory only; the regret bound's M = bound on ∥g∥_2 can be large near the simplex boundary for the log rule (unbounded near 0/1 — the theorem requires s bounded).
- QA pooling assumes forecasts lie in the forecast domain D (excludes e.g. (1,0) vs (0,1) under the log rule — "adding positive and negative infinity").
- The max-min (sub-contracting) interpretation assumes the aggregator can literally pay experts proportionally to s — motivational, not a GSE mechanism.
- The n>2 axiomatization needs convex exposure; characterization is exact only for n=2.

## 10. GSE overlap
Direct hit on GSE's core unanswered question — which aggregation operator and how to set weights. 1162 used peer-assessment selection; 1166/1168 used fixed means/blends. No other paper gives (a) a principled rule for choosing linear vs logarithmic pooling, or (b) a no-regret online weight-learning scheme with a bound against the best mixture. This is the foundation the whole ensemble lane should be rebuilt on.

## 11. GSE implementation spec
1. Operator–scoring-rule match (immediate): evaluate component models with log loss → aggregate with logarithmic (geometric) pooling; evaluate with Brier → linear pooling. Never mix (Remark 5.2: concavity fails under mismatch). GSE's primary metric is log loss → default to log pooling for the ensemble.
2. Online weight learning (~1–2 days): implement Algorithm B.3 — online gradient descent on the simplex of model weights, loss = −(log score of the QA pool) per week; weights warm-started at equal. Track realized regret vs the best fixed mixture in hindsight each season.
3. Max-min sanity check: the QA pool guarantees the aggregator's worst-case profit is outcome-independent; use Σw_i D_G(p*∥p_i) per game as a "disagreement dividend" diagnostic — games with large values are where aggregation adds the most over picking one model.

## 12. Reproducible test
Dataset: 2024–2025 NFL seasons, component-model probabilities per game. (a) Operator match test: compare full-season log-loss of log-pool vs linear-pool ensembles (equal weights); expectation: log-pool wins on log loss, linear-pool wins on Brier — the paper's correspondence. (b) OGD weights: run online gradient descent on weights week-by-week (2025), compare cumulative log-loss vs equal-weight log pool and vs best-fixed-mixture-in-hindsight; verify the regret grows sublinearly (≈√T) and the OGD ensemble beats equal weights. Time-ordered: weights at week t use only weeks <t.

## 13. Acceptance / rejection gate
ADOPT log pooling as GSE's default ensemble operator if it beats linear pooling on 2025 full-season log loss, and ADOPT OGD-learned weights if the OGD ensemble beats equal weights on 2025 log loss with realized regret vs best-hindsight-mixture consistent with O(√T). REJECT fixed equal weighting if OGD's learned weights concentrate (>0.5 on one model) while beating equal weights — equal weighting is then provably leaving money on the table under the paper's own framework.

## 14. Improvement experiment
Beyond the paper: the paper's concavity result is per-game; GSE games are not i.i.d. (weather, injuries, market regimes). Extend OGD with a contextual weight vector — weights as a function of game context features (market disagreement, week number, weather) via online convex optimization over a linear weight model, which preserves concavity in the parameters (composition of concave WS_j with linear weight map stays concave). If the contextual OGD beats context-free OGD on 2025 log loss, GSE gets regime-aware aggregation weights — a direct extension the paper's framework supports but doesn't construct.
