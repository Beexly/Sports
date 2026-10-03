# [1311] Simultaneous Estimation of Ballpark Effects and Team Defense Using Total Bases Residuals (arXiv:2603.21163v2) — PROVISIONAL NUMBER, pending coordinator confirmation

**Citation:** Wu, J.-J., Yan, T.-L., & Chen, T.-L. (2026). *Simultaneous Estimation of Ballpark Effects and Team Defense Using Total Bases Residuals*. arXiv:2603.21163v2 [stat.AP]. URL: https://arxiv.org/abs/2603.21163
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — joint weighted-least-squares estimation of ballpark effects and team defense from Statcast total-bases residuals, with a standardized uncertainty index and validation showing the estimates beat official park factors on home–away consistency; the venue-vs-team decomposition recipe ports directly to NFL stadium-effect modeling. (Replacement for REJECT 1101. Ledger number 1311 is provisional: 1306–1308 are assigned to wave3-reader-02's ledgers; coordinator confirmation requested.)

## 1. Research question
Can ballpark effects and team defensive quality be estimated simultaneously — disentangling the two confounded factors — from batted-ball outcomes, and do the resulting estimates improve on official MLB park factors?

## 2. Dataset / schema
Statcast batted-ball data, 2015–2024. Each batted ball carries exit velocity (EV), launch angle (LA), observed total bases, ballpark, and fielding team.

## 3. Method / model
Two stages: (1) compute Total Bases Residuals (TBR) = observed total bases − expected total bases conditional on exit velocity and launch angle, isolating the variation not explained by quality of contact; (2) regress TBR on ballpark and defensive-team indicators in a weighted least-squares regression, estimating both effects simultaneously. The ballpark coefficient (β̃_park) is the TBR-based ballpark effect; the defense coefficient (β̃_def) is termed Defensive Bases Saved (DBS), both on the per-batted-ball TBR scale. A standardized index is defined for interpreting effect magnitudes with uncertainty intervals.

## 4. Equations & assumptions
- TBR: `R_i = TB_i − μ_g(i)`, where μ_g(i) is expected total bases given the batted ball's EV/LA group.
- WLS: TBR ~ ballpark indicators + defensive-team indicators (weighted).
- Assumptions: EV/LA fully capture quality of contact; ballpark and defense effects are additive and separable on the TBR scale; weights correctly handle heteroskedasticity across batted-ball types.

## 5. Features / target
Features: ballpark indicator, defensive team indicator. Target: total-bases residual per batted ball.

## 6. Validation design
Home–away consistency check: when the TBR-based ballpark estimates differ from official MLB park factors, the home–away scoring patterns of teams and their opponents are more consistent with the new estimates — an external validity test. DBS is benchmarked against established defensive metrics (OAA, Def) via correlation.

## 7. Numerical results / baselines
- Average 95% interval half-widths: 19.97 standardized points for park factors, 30.84 for defense.
- DBS correlates with Outs Above Average (OAA) at 0.5327 on average, vs 0.4409 with the Def metric — DBS tracks the Statcast gold standard more closely.
- Home–away pattern consistency favors the TBR-based estimates over official MLB park factors where they disagree.

## 8. Code / data availability
Code available on GitHub. Data: Statcast (public via Baseball Savant).

## 9. Leakage & limitations
No leakage: effects are estimated within-season from completed batted balls. Limitations: additivity assumption (park × defense interactions ignored); EV/LA measurement error; weighting scheme choices affect intervals; MLB-specific.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 11 (non-NFL sports depth, MLB Statcast-era) and Gap 8's stadium half (wind × stadium geometry × scoring): the repo has "travel/altitude (no verified coefficient)" and stadium wind as inventoried-but-thin areas. The venue-vs-personnel decomposition method is the transferable asset — no joint venue/team-effect estimation paper exists in the corpus. No duplicate.

## 11. GSE implementation spec
1. Port the TBR recipe to NFL: define an expected-points residual per play conditional on pre-play expectation (down/distance/field position), then jointly estimate stadium effects and team unit effects via WLS.
2. Build a GSE "Stadium Factor" index on the standardized scale with 95% intervals, mirroring the paper's interpretability design.
3. Validate against the same home–away consistency test: where GSE stadium factors disagree with market-implied venue adjustments, check which better explains home–away splits.

## 12. Reproducible test
Replicate on one Statcast season: confirm DBS–OAA correlation ≈ 0.53 exceeds DBS–Def ≈ 0.44 and interval half-widths land near 20/31 points; then run the NFL port on one season of play-by-play and verify the stadium-factor ranking is stable across season halves.

## 13. Acceptance / rejection gate
ADAPT: simultaneous venue/personnel decomposition with honest uncertainty intervals and an external home–away validity check is a first-class methodology GSE can reuse for stadium effects.

## 14. Improvement experiment
Add park × team interaction terms with hierarchical shrinkage; extend to a dynamic (season-evolving) state-space version of the WLS; apply the same residual-decomposition to NFL kicking (stadium wind × kicker skill).
