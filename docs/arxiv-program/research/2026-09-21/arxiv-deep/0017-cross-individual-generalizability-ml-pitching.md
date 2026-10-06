# [0017] Cross-individual generalizability of machine learning models for ball speed prediction in baseball pitching (arXiv:2605.05487)

**Citation:** Ryota Takamido et al. (2026). *Cross-individual generalizability of machine learning models for ball speed prediction in baseball pitching*. arXiv:2605.05487 [cs.HC]. URL: https://arxiv.org/abs/2605.05487
**Ledger completed:** 2026-09-21. **Read:** abstract only — the full text is not accessible through any permitted channel (see §8). Methods, equations, feature definitions, and per-condition results below the abstract are NOT available and are marked "Not stated in paper" where the abstract does not give them.
**Verdict:** BLOCKED — full text genuinely inaccessible. ar5iv renders only the abstract (34 lines, no HTML body); the "View PDF" link redirects to the same abstract page; arXiv HTML fetch failed on two separate attempts. The abstract alone is insufficient for a full-text ledger (no methods, features, model specs, or result tables), so no ADOPT/ADAPT/REJECT verdict can be responsibly assigned. Recommend re-attempt in a later wave.

## 1. Research question
Per the abstract: how well do ML models for baseball pitching ball-speed prediction generalize across individuals (leave-one-subject-out), and how do expertise level and restrictions on spatiotemporal motion information affect that generalizability?

## 2. Dataset / schema
50 pitchers from various competitive levels. Motion data (spatiotemporal) and ball-speed labels. Full schema, sampling, and equipment: Not stated in paper (abstract only).

## 3. Method / model
Model class(es): Not stated in paper (abstract only). Evaluation: leave-one-subject-out cross-validation (cross-individual) vs within-individual evaluation; manipulations of expertise level and of available spatiotemporal motion information (body-segment restrictions).

## 4. Equations & assumptions
No equations available from the abstract. Not stated in paper.

## 5. Features / target
Target: ball speed in baseball pitching. Input: spatiotemporal motion information; body segments analyzed include the trunk and the pivot leg (others not named in the abstract). Feature representation and horizons: Not stated in paper.

## 6. Validation design
Leave-one-subject-out CV across 50 pitchers; within-individual baseline comparison; subgroup analysis by expertise level (Expert vs Intermediate); segment-restricted information conditions. Full design details: Not stated in paper.

## 7. Numerical results / baselines
All from the abstract (quoted exactly):
- Cross-individual evaluation: "R-squared value decreasing from 0.91 to 0.38" (within-individual 0.91 → cross-individual 0.38).
- "The model tended to overestimate the performance of Intermediate pitchers relative to Expert pitchers, with a significant group difference in signed prediction error (p < .05)."
- "The trunk and pivot leg demonstrated relatively high generalization performance, with the pivot leg showing notable generalizability even during the weight-shift initiation phase (R-squared value > 0.25)."
- No model names, no per-segment tables, no error distributions, no sample sizes per expertise group available from the abstract.

## 8. Code / data availability
Access record (all attempts on 2026-09-21):
1. `https://ar5iv.org/html/2605.05487` — renders only the abstract + submission history (34 lines); no HTML body, no PDF content.
2. ar5iv "View PDF" link (`https://ar5iv.org/pdf/2605.05487`) — redirects to the same abstract page; no PDF text.
3. `https://arxiv.org/html/2605.05487v1` — browser fetch failed on two attempts (tool-level failure; terminal).
Code/data: unknown — not stated in the abstract.

## 9. Leakage & limitations
Cannot be assessed from the abstract. The abstract's headline finding (R² 0.91→0.38) is itself a generalization-gap caution: any GSE use of biomechanical prediction models should require leave-one-athlete-out validation, not within-athlete CV — a methodological point that stands even without the full text.

## 10. GSE overlap
Baseball biomechanics is outside every GSE lane; no duplication. The transferable lesson is methodological, not sport-specific: within-individual CV massively overstates real-world performance (0.91 vs 0.38), which is directly relevant to any GSE player-level model (e.g., prop models evaluated on player-held-out vs game-held-out splits). GSE's existing tracking-metrics lane should treat this as a standing validation-design rule.

## 11. GSE implementation spec
No build (BLOCKED). If unblocked in a later wave: extract the segment-restriction protocol and the expertise-bias finding; the actionable GSE analogue is a validation-design rule — require leave-one-player-out (or leave-one-team-out) CV for any player-level prediction model, and report the within-vs-cross gap the way this paper does.

## 12. Reproducible test
Cannot be run: full text, methods, and data are unavailable. The abstract-level claim worth a GSE analogue test once unblocked: take any GSE player-level model, compute within-player vs cross-player CV R², and confirm the gap is reported and budgeted in production expectations.

## 13. Acceptance / rejection gate
BLOCKED decided: no verdict possible. Revisit only when the full text becomes accessible; at that point the key checks are (a) the exact model class and features, (b) the expertise-group sample sizes and the signed-error distributions, and (c) whether the 0.91→0.38 gap survives the authors' segment-restriction conditions.

## 14. Improvement experiment
From the abstract alone, the experiment the field needs (and what GSE should run regardless of this paper): a systematic within-vs-cross-individual gap benchmark across GSE's own player-level models, with the gap reported as a standard model card metric. That experiment does not depend on unblocking this paper.
