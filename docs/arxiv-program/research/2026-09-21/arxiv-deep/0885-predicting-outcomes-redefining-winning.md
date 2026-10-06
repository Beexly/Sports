# [0885] Predicting outcomes for games of skill by redefining what it means to win (arXiv:1802.00527v1)

**Citation:** J. Scott Moreland, Matthew C. Superdock (2018). *Predicting outcomes for games of skill by redefining what it means to win*. arXiv:1802.00527v1 [stat.ME]. URL: https://arxiv.org/abs/1802.00527v1
**Full-text source:** local PDF extract /tmp/arxiv750-r12/r-1802.00527v1.pdf, read in full.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — one Elo rating per handicap threshold produces a full spread CDF and total distribution from a single rating system (melo); the offseason-regression numbers (spreads 60%, totals 70%, home field 54 Elo points on 2009–2017 NFL) are directly reusable priors for GSE's margin models. Slightly worse than Vegas is the honest baseline, not a failure.
**Replacement context:** Fresh-search replacement (query: `arXiv margin of victory rating model NBA NFL score-based prediction 2025`) for an assigned duplicate already in done-ids.txt (assigned-duplicate skip, not a REJECT). Verified genuinely absent from done-ids.txt, all phase-2 assignments, both ledger trackers, existing ledgers, and all wave reports on 2026-09-21.

## Citation / full-text source
Authors: J. Scott Moreland (Duke Physics), Matthew C. Superdock (CMU Mathematical Sciences). arXiv v1 dated 2018-02-01. Method paper with NFL application; ships the `melo` package.

## Research question
Can the Elo framework be extended from win/loss to the full margin-of-victory distribution — i.e., can a rating system output P(team beats spread s) for every s, and the total-points distribution, instead of just a win probability?

## Dataset / schema
- NFL games, 2009–2017 seasons (scores, spreads implied by the threshold ratings).
- Schema: date, home/away teams, final scores; closing Vegas lines used as the comparison baseline.
- Access: public scores; Vegas lines as quoted in the paper.

## Method
- For each handicap threshold h (e.g., −14, −13.5, …, +13.5, +14), define a binary outcome "team beats handicap h" and maintain a **separate Elo rating per threshold**.
- The collection of threshold ratings traces out the full CDF of the margin of victory: P(margin > h) from the h-threshold Elo pair.
- Same construction for totals: per-threshold Elo on "total exceeds t".
- Offseason regression: ratings regress toward the mean between seasons (spreads 60%, totals 70% retained); home field estimated at 54 Elo points.
- Inference is the standard Elo update applied independently per threshold.

## Equations / math / assumptions
- Per-threshold Elo: R_i(h) updated by K·(1_{margin_i > h} − E_h), with E_h = logistic((R_i(h) − R_j(h) + HFA)/s).
- Spread CDF: F(h) = P(margin ≤ h) reconstructed from the threshold win probabilities; quantiles read off directly.
- Assumptions: threshold outcomes are conditionally independent given the latent margin distribution (technically inconsistent across thresholds — the paper acknowledges the CDF need not be perfectly monotone); margin distribution is stationary within season; home field is a constant additive shift.

## Features / target
- Features: per-threshold Elo ratings, home-field indicator.
- Target: full margin-of-victory distribution; derived — spread cover probability at any line, total over/under probability at any number.

## Validation
- Walk-forward across 2009–2017 NFL: per-threshold Elos updated sequentially; spread CDF evaluated against realized margins and against Vegas closing lines.
- Reported as comparable to but slightly worse than Vegas (exact MAE table absent from the paper — noted as a gap).

## Exact results with baselines
- Offseason regression: spreads retain 60%, totals retain 70% of prior-season rating; home field 54 Elo points.
- Performance: "comparable but slightly worse than Vegas" (paper's characterization; no exact MAE table printed).
- The method produces full spread/total distributions; the paper demonstrates the CDF construction on the NFL sample.

## Code / data availability
Package: github.com/morelandjs/melo (stated in paper).

## Leakage
- Threshold Elos are fit on the same games used to evaluate the CDF — the evaluation is walk-forward, but the offseason-regression percentages and HFA constant are tuned on the full sample.
- Cross-threshold inconsistency: independent per-threshold Elos can imply non-monotone CDFs; the paper does not fully resolve this.

## Limitations
- Slightly worse than Vegas with no exact error table — the performance claim is qualitative.
- Independent thresholds are statistically incoherent (non-monotone CDF possible); a joint model would be preferable.
- NFL-only; no test on NBA/other leagues. No calibration analysis of the CDF tails (the part that matters for betting).

## GSE overlap vs existing-research-map
Existing-research-map.md inventories Elo (nfelo/nfelounits) as catalog entries "mentioned, not deeply researched"; no margin-distribution Elo paper exists in the corpus. The map's gap list includes live spread/total modeling thinness. This paper is the corpus's only spread-CDF-from-Elo construction — novel, and directly in the odds_market lane (spread and total probabilities are the product).

## Implementation spec (GSE adaptation)
- **What to build:** a GSE margin-distribution service: per-threshold Elos (or a smoothed joint version via isotonic regression across thresholds) for NFL spreads and totals, updated walk-forward; serve P(cover | line) and P(over | total) for any line, with the CDF enabling fair-price computation for alternative lines and teasers.
- **Fix the incoherence:** replace independent thresholds with a single latent margin model (ordered-logit on the margin) initialized from the melo thresholds — keeps the CDF idea, restores monotonicity.
- **Priors to reuse:** offseason regression 60% (spreads) / 70% (totals), HFA 54 Elo points as starting values, re-fit on current data.
- **Effort:** 1–2 weeks including the ordered-logit upgrade.

## Reproducible test
- Clone github.com/morelandjs/melo; run walk-forward on 2015–2024 NFL (nflverse scores); compare spread-CDF Brier/log score vs GSE's current margin model and vs Pinnacle closing lines.

## Numeric gate
- ADAPT confirmed if the melo spread CDF's log score on 2024 NFL is within 0.01 of GSE's current margin model AND the ordered-logit-smoothed version beats raw melo on tail calibration (extreme-spread buckets). If melo underperforms GSE's model by more, the offseason-regression priors still stand as adopted constants.

## Improvement experiment
- **Teaser pricing:** use the full spread CDF to price 6-point teasers (Wong teasers through key numbers) vs market prices; test whether CDF-implied teaser edges beat random selection on CLV over a season. Success: positive mean CLV on Wong-teaser candidates.

## Verdict
**ADAPT** — The per-threshold Elo → spread-CDF construction is the cheapest known route to full margin distributions, and the offseason-regression/HFA numbers are usable priors today. The "slightly worse than Vegas" is honest calibration of expectations; the teaser-pricing experiment is where the edge would actually live.
