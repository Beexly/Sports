# 1057 — The uncertainty of a tournament draw: Insights from the Champions League

## Citation / full-text source

- arXiv:2507.15320v5 — full text: https://arxiv.org/pdf/2507.15320
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2507.15320v5
- **Full-text URL**: https://arxiv.org/pdf/2507.15320v5
- **Authors**: László Csató, András Gyimesi, Dries Goossens, Karel Devriesere, Roel Lambers, Frits Spieksma
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1309.2627v1 ("Weighted quantile regression for longitudinal data") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion. From the deduped candidate pool, 2507.15320v5 was selected because (a) it defines a rigorous, computable measure of draw uncertainty with bootstrap confidence intervals, (b) it disentangles format effects from seeding-accuracy effects, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2507.15320` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v5 PDF text via pdftotext: 33 pages — abstract, draw-uncertainty definition (SD of qualification probabilities across random draws), 1,000 random draws × 1,000 outcome simulations methodology, independent Poisson outcomes from Elo expectancy, bootstrap CIs, old-vs-new format results, the perfect-seeding decomposition, integer-program appendix, all appendix figures, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

How much does the random tournament draw change a team's qualification chances — and how much of that draw effect is the format itself versus inaccurate seeding?

## Summary

How much does the *draw* — the random assignment of groups/fixtures — change a team's chances? The paper defines team-level **draw uncertainty** as the standard deviation of qualification probability across random draws, estimated by 1,000 random draws × 1,000 outcome simulations each, with independent Poisson outcomes derived from Elo expectancy and bootstrap confidence intervals.

Findings for the Champions League: the new format reduced draw uncertainty by **53% on average** for 2024/25 — but the decomposition is the real insight. Most of the reduction comes from **robustness to inaccurate UEFA seeding**; under perfect Elo seeding with no playoffs, the new format's pure advantage is much smaller. In other words: **the old format's problem wasn't the format, it was bad seeding.** Core GSE lesson: **draw uncertainty is a first-class component of futures pricing uncertainty** — and when GSE decomposes why a team's outright price moved after a draw, seeding-error vs format-effect attribution changes the story.

## Method

- Estimation: D = 1,000 random draws; each draw's qualification probabilities from 1,000 outcome simulations (independent Poisson, Elo-derived expectancies).

- Bootstrap confidence intervals on the SD estimates.

- Decomposition: re-run under perfect (Elo) seeding and no playoffs to isolate the pure format effect.

- Appendix: integer program for draw generation under constraints.

## Equations / assumptions

- Draw uncertainty for team \(i\): \(\text{SD}_i = \sqrt{\frac{1}{D}\sum_{d=1}^{D}(q_{id} - \bar{q}_i)^2}\), where \(q_{id}\) is team i's qualification probability under draw \(d\).

## Features / target

Inputs: tournament field (2024/25 UCL teams); Elo ratings as strength inputs; a random draw (group/fixture assignment); format (old vs new).

Target: per-team qualification probability under each draw; the derived metric is draw uncertainty \(\text{SD}_i\), the standard deviation of qualification probability across draws.

## Validation

D = 1,000 random draws; each draw's qualification probabilities from 1,000 outcome simulations (independent Poisson, Elo-derived expectancies) — a 1,000 × 1,000 design.

Bootstrap confidence intervals on the SD estimates.

Decomposition check: re-run under perfect (Elo) seeding with no playoffs to isolate the pure format effect.

## Exact results / baselines

The new format reduced draw uncertainty by 53% on average for 2024/25.

Decomposition: most of the reduction comes from robustness to inaccurate UEFA seeding; under perfect Elo seeding with no playoffs, the new format's pure advantage is much smaller.

Baselines: the old group format (comparator for the 53% reduction); the perfect-seeding counterfactual (isolates format vs seeding effects).

## Code / data

Not stated in the paper.

## Dataset / schema

- UEFA Champions League 2024/25 teams; Elo ratings as strength inputs.
- Simulated: 1,000 draws × 1,000 outcome replications.

## Implementation (GSE adaptation)

1. **Draw-uncertainty decomposition in futures**: GSE's outright prices embed draw luck. **Implementation**: for each priced tournament, compute per-team draw uncertainty (SD of qualification/outright probability across simulated draws) and report it alongside the price — a team whose 8% outright is ±4pp draw-driven is a different bet than one whose 8% is ±1pp.
2. **Seeding-error attribution**: replicate the paper's decomposition — reprice futures under perfect-seeding draws vs actual-seeding draws. The gap quantifies how much of a team's price is seeding noise, which is actionable when seeding pots are announced.
3. **Draw-reaction content**: the 53%-reduction result and the seeding-vs-format decomposition are ready-made draw-reaction analysis for GSE's content (who gained/lost from the draw, and why).

**Implementation difficulty** (folded in from the original standalone section):

Medium. The draw simulator + outcome simulator + bootstrap pipeline is real compute (1M outcome sims per analysis), but it runs offline before tournaments.

## Leakage

- Elo inputs are pre-tournament; draws simulated ex ante — no leakage.
- Bootstrap CIs correctly reflect simulation uncertainty.

## Limitations

- Independent Poisson outcomes — ignores score correlation and tactical matchup effects.
- Elo as the "true" strength for the perfect-seeding counterfactual is itself an estimate.
- UCL-specific; draw-constraint structures differ by competition.

## GSE overlap

None in the tracked corpus. The map has no draw-uncertainty quantification anywhere; futures pricing in the corpus treats the draw as fixed background. **Decomposing futures uncertainty into draw luck vs team strength is novel for the corpus** and complements ledger 1055's monotonicity audit.

## Reproducible test

- Reimplement the draw-uncertainty estimator for the 2024/25 UCL field; verify the new format's average SD is ≈53% below the old format's, and that the perfect-seeding counterfactual shrinks the gap substantially.
- Bootstrap CI coverage check on a subset of teams.

## Numeric gate

**ADAPT iff draw uncertainty is material for GSE's markets: compute per-team draw-uncertainty SDs for the next priced tournament; if the median team's SD exceeds ~15% of its mean outright probability, draw uncertainty is a first-class pricing input and the decomposition ships;** if draw luck is negligible next to strength uncertainty, keep it as content only.

## Improvement experiment

(1) Extend from qualification probability to outright-win probability and each-way/place markets; (2) replace independent Poisson with GSE's own outcome model (including the stakeless adjustments from ledger 1053); (3) build a live draw-reaction tool: input the actual draw, output winners/losers with seeding-error attribution. Success criterion: the tool's draw-reaction notes beat a naive strength-only reaction on engagement and correctly flag at least one mispriced post-draw future.

## Verdict

**ADAPT** — Draw uncertainty (SD of qualification probability across draws) is a missing component of GSE's futures pricing: the new UCL format cut it 53%, mostly via seeding robustness. Adapt the estimator plus the seeding-error decomposition into the futures pipeline and the draw-reaction content workflow.
