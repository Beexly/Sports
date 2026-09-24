# 1086 — Forecast Evaluation of Quantiles, Prediction Intervals, and other Set-Valued Functionals

## Citation / full-text source

- arXiv:1910.07912v2 — full text: https://arxiv.org/pdf/1910.07912
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1910.07912v2
- **Full-text URL**: https://arxiv.org/pdf/1910.07912v2 (read in full; cached text 196,047 bytes / 1,639 wrapped lines: full framework §§2–3 incl. Theorem 3.7, prediction intervals §4 incl. Theorems 4.2/4.16 and Prop. 4.20, Vorob'ev quantiles §5, literature review §6, Appendix A fixed-endpoint specs, Appendix B injectivity, Appendix C proofs)
- **Authors**: Tobias Fissler, Rafael Frongillo, Jana Hlavinová, Birgit Rudloff
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: none (assigned paper, not rejected)
- **Reason for ADAPT**: GSE publishes prediction intervals everywhere — spread intervals, total intervals, DFS player-stat projections ("90% interval: 18–24 points"), and any engine-variant comparison on those intervals is currently ad hoc (coverage plus width heuristics). This paper gives the rigorous evaluation discipline: (1) the class of α-prediction intervals is *exhaustively elicitable* (Theorem 4.2) with an explicit integral scoring function (4.6) and a mixture representation in elementary scores (4.8) — i.e., GSE can compare engines' interval forecasts with a *consistent* scoring rule rather than inventing coverage-plus-width penalties; (2) the elementary scores admit Murphy diagrams (Ehm et al. 2016): plot score difference across the whole parameter grid u∈U, so variant selection is robust to the arbitrary choice of score — a variant whose Murphy curve dominates everywhere wins under *every* consistent scoring function; (3) a hard governance result: the *shortest* α-prediction interval (α∈(0,1)) is not elicitable in *either* sense (Theorem 4.16 — the first non-degenerate example of a set-valued functional elicitable nowhere), so "report the tightest calibrated interval" is not a legitimate target for analysts or engine losses; (4) quantile endpoints *are* elicitable via pinball loss, and fixed-endpoint/midpoint-constant specs are elicitable (Appendix A) — so the sound interval target is quantile-endpoint intervals, not shortest intervals. Vorob'ev quantiles (exhaustively elicitable, §5) extend the same machinery to set-valued forecasts like player-pool or injury-risk regions.
- **Read depth**: FULL READ: selective vs exhaustive definitions 2.1–2.2, CxLS properties (3.1–3.3), Theorem 3.5, main mutual-exclusivity result Theorem 3.7 with examples 3.8 (i)–(vii), specifications (3.10–3.13 incl. the lower-quantile non-elicitability), prediction-interval notation and Γ_α (4.1), Theorem 4.2 (i)–(iii) with score (4.6) and proof (4.7), elementary scores and mixture representation (4.8), non-injectivity Prop. 4.4, proper-subset Lemma 4.6, Corollary 4.7, endpoint/midpoint specs (4.9–4.12), shortest intervals SI_1 (4.13–4.14) and the negative Theorem 4.16 with full proofs plus selective identifiability Prop. 4.20, Vorob'ev quantiles (5.2–5.7) with scores (5.2)–(5.5), literature review §6, Appendices A (A.1–A.4), B (B.2–B.4), C (proofs of 4.2(iii), 4.10, 4.12, 4.15).
- **Wave**: wave2-reader-20
- **GSE overlap**: No interval-evaluation ledger exists; 1083 (univariate scores), 1084 (IDR), 1085 (multivariate energy) all evaluate distributions, not the intervals GSE actually publishes. This is the interval-forecast evaluation protocol. **New capability**: consistent exhaustive scoring of prediction intervals + Murphy-diagram variant comparison + shortest-interval prohibition.

## Research question

For set-valued prediction targets, which functionals can be elicited by a single reported set (selective) versus the whole set (exhaustive) — and is the shortest prediction interval elicitable?

## Summary

Set-valued functionals admit two forecast modes: *selective* (report one element of the correct set) and *exhaustive* (report the whole set). Theorem 3.7: for functionals with the proper-subset property, the two modes are mutually exclusive — quantiles are selectively elicitable, hence never exhaustively elicitable. The class I_α of α-prediction intervals is exhaustively elicitable (Theorem 4.2) via the integral score S_exh(A,y)=αμ(A)−μ(((−∞,y]×[y,∞))∩A) (4.6), whose normalized form (4.8) is a mixture of elementary scores S_u, enabling Murphy diagrams u↦S_u(A,y). Impossibility results: the shortest α-interval SI_α (α∈(0,1)) fails both senses (Theorem 4.16); specifications like the lower quantile fail (Prop. 3.13); endpoint/midpoint specified by an identifiable functional fail smoothly (Props. 4.10/4.12); fixed-constant endpoints/midpoints are fine (Appendix A). Vorob'ev quantiles of random sets are exhaustively elicitable with elementary-score representation (Theorem 5.5).

## Method, math, and equations

- Selective consistency (2.3) vs exhaustive consistency (2.4); strict variants; selective CxLS* (Def. 3.1), Prop. 3.3 necessity; Theorem 3.5 non-exhaustive-elicitability; Theorem 3.7 mutual exclusivity.
- Specifications (3.10–3.13); Γ_α(F)(a)=q⁻_{α+F(a−)}(F) (4.4) shortest-interval endpoint map; I_α(F) (4.3).
- Theorem 4.2 scores (4.6)–(4.8); S_μ=(1−α)μ(((−∞,y]×[y,∞))∖A)+αμ(A∖((−∞,y]×[y,∞))); elementary S_u.
- Theorem 4.16 uniform-mixture continuity argument; Prop. 4.20 function-valued selective identification (4.12).
- Vorob'ev: V_α(u,Y)=1_Y(u)−α (Prop. 5.3); S̃_α=αμ(X)−μ(Y∩X) (5.2); elementary S_{α,u}=α1_{X∖Y}(u)+(1−α)1_{Y∖X}(u) (5.4); mixture S_{α,π} (5.5); order-sensitivity Prop. 5.7.

## Datasets

None — pure theory; constructive uniform-mixture counterexamples in Theorem 4.16 proof (G_1,G_2,G_3 on [0,1],[1,2],[3,1+2/α]).

## GSE application and implementation spec

1. **Primary adaptation**: replace GSE's ad-hoc interval evaluation (coverage + width heuristics) with the exhaustive consistent score (4.8) for all published prediction intervals — game-total 90% PIs, spread PIs, DFS player-stat PIs. Score every engine variant's intervals with S_μ (μ = uniform over the endpoint grid U) and rank variants by mean score.
2. **Murphy diagrams**: for each engine comparison, plot mean elementary-score difference Δ(u)=S̄_u(A)−S̄_u(B) over a 100-point grid of u∈U (Remark 4.3). Promote a variant only on dominance, not on a single arbitrary score — score-choice-robust selection.
3. **Governance rule from Theorem 4.16**: remove any "shortest calibrated interval" target from analyst/engine objectives — it is not elicitable in either sense, so no honest score can incentivize it; replace with quantile-endpoint intervals (elicitable via Prop. 4.9 pinball sums) or fixed-midpoint specs (Appendix A).
4. **Vorob'ev extension**: use S_{α,u} (5.4) to score set-valued forecasts such as "player pool with ≥α probability of covering," or injury-risk body regions — symmetric difference in measure is the α=1/2 case.
5. Effort: 3–4 days (scoring functions + Murphy-diagram tooling over backtest intervals).

## Leakage

- Theorem 3.7 means quantile forecasts (selectively elicitable) can never be scored in exhaustive mode and interval sets can never be scored selectively — mixing the two modes invalidates comparisons; GSE's interval backtests must use (4.8), never pinball on endpoints alone (endpoint pinball scores the *quantile specification*, Prop. 4.9, a different functional).
- Coverage-only evaluation (V_sel=1{y∈[x_1,x_2]}−α) is an identification function, not a score — it cannot rank intervals; the paper's §6.1 notes the common conflation.
- SI_α non-elicitability (4.16) extends to minimal-volume prediction *regions* (Remark 4.19) — the prohibition covers GSE's multivariate "tightest region" ideas too.
- The α=1 case (Proposition 4.13) is a narrow exception leaning on infinite scores — do not generalize "shortest is fine" from it.

## Limitations

- No empirical validation anywhere in the paper; all results are theoretical — the GSE test must supply the evidence.
- The mixture measure μ is left free; in practice the elementary-score grid must be chosen and the Murphy diagram's informativeness depends on grid coverage of U.
- Strict consistency needs the M_{α,inc} regularity (singleton quantiles); NFL totals are discrete-ish (integer scores) — in discrete settings uniqueness fails and strictness degrades, though consistency survives.
- Vorob'ev strict elicitability needs closure/interior regularity (Theorem 5.5(iii)) that GSE's set forecasts may not satisfy.
- Multivariate extension is only sketched (Remark 4.19, §5) — GSE's joint-interval needs would push past the paper.

## GSE overlap

No prior interval-evaluation ledger. Complements 1083 (univariate proper scores), 1084 (IDR produces intervals), 1085 (multivariate energy). **New capability**: consistent scoring + Murphy-diagram selection for published prediction intervals; shortest-interval prohibition; set-forecast scoring via Vorob'ev machinery.

## Implementation difficulty

Low. Scores (4.8) and (5.4) are simple integrals/indicator differences; the work is building the Murphy-diagram grid tooling and re-scoring historical engine intervals.

## Reproducible test

Backtest two GSE engine variants' 90% game-total prediction intervals over the 2024 NFL season. (a) Score each variant with the normalized exhaustive score S_μ (4.8), μ uniform over a 100-point (a,b) endpoint grid; compare means with the DM test. (b) Plot Murphy diagrams of mean elementary-score differences Δ(u) over the same grid. (c) Sanity check: verify a deliberately gamed "shortest interval" baseline (narrowest calibrated interval per game) cannot be separated from honest intervals under any single consistent score — demonstrating Theorem 4.16's practical bite.

## Numeric gate

**95** — a challenger engine's intervals displace the incumbent's only if its Murphy curve lies at or below the incumbent's on **at least 95 of the 100 elementary-score grid points** (strict dominance robust to score choice). Fewer than 95 → no promotion. This is the single operationalization of "winning under every consistent scoring function" (lower mean S_μ follows automatically from dominance under the uniform measure μ).

## Improvement experiment

Theorem 4.2 leaves μ free. Test whether a data-adaptive μ — concentrated on the endpoint region where GSE's historical outcomes concentrate (fitted from 3 seasons of game totals) — yields higher DM-test power for distinguishing engine variants than uniform μ. If the adaptive-μ Murphy diagram separates variants with fewer games (e.g., significant at N=40 vs N=60 for uniform), adopt adaptive μ as GSE's standard S_μ measure; publish the grid so comparisons stay reproducible.

## Verdict

**ADAPT** — Score GSE's published prediction intervals with the consistent exhaustive score (4.8), select engine variants by Murphy-diagram dominance (≥95/100 grid points + DM significance), and retire any "shortest interval" target: Theorem 4.16 proves it cannot be honestly incentivized in either elicitation mode.
