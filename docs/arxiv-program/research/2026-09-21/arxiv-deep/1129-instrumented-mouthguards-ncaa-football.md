# [1129] Instrumented Mouthguards for Head Acceleration Events in NCAA Football (arXiv:2502.14710)

**Citation:** Authors (2025). *Instrumented Mouthguards in NCAA Football*. arXiv:2502.14710v1. URL: https://arxiv.org/abs/2502.14710
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the position- and side-of-ball-stratified head-acceleration-event (HAE) incidence rates give GSE concrete collision-exposure priors for player-availability and performance-degradation modeling, with the study's small-sample and device-filtering limits kept explicit.

## 1. Research question
What is the per-player-game incidence of true-positive head acceleration events (HAEs) in NCAA Division I football, measured by instrumented mouthguards, stratified by offense/defense and position, at multiple peak linear acceleration (PLA) and peak angular acceleration (PAA) thresholds?

## 2. Dataset / schema
- 35 NCAA Division I male players, 2022 Mountain West season, single team.
- 71 player-games across 4 games; 64 eligible player-games after the ≥90% wear-time criterion.
- 1,101 triggered events → 828 true-positive HAEs after video adjudication.
- Schema: per-event PLA (g) and PAA (rad/s²) at head center of gravity, side of ball (offense/defense), position group, wear-time fraction, video-adjudication label (true positive / false positive under three FP definitions).
- Device pipeline is proprietary (see §9). No practice data, no direction/pulse-duration features.

## 3. Method / model
- Instrumented mouthguards; trigger threshold >8g on any axis; recording/analysis threshold 5g PLA and 400 rad/s² PAA at head center of gravity.
- Video review of all triggered events to adjudicate true vs false positives (three FP definitions reported).
- Incidence computed as HAEs per player-game, stratified by side of ball and by PLA/PAA thresholds.

## 4. Equations & assumptions
No equations stated. Assumptions: the mouthguard's head-center-of-gravity transformation is valid; video adjudication is ground truth for true positives; the ≥90% wear criterion adequately controls exposure mismeasurement; 4 games are representative of a season's collision profile.

## 5. Features / target
Features: PLA, PAA, side of ball, position group, wear time. Target: HAE incidence per player-game at thresholds {>10g, >30g PLA} × {>1.0, >2.0 krad/s² PAA}; device sensitivity and PPV.

## 6. Validation design
- Video adjudication of all 1,101 triggered events (device sensitivity 0.89, 95% CI 0.86–0.92).
- Three false-positive definitions yielding PPV 0.98 / 0.93 / 0.76 — the wide range is itself a finding about definition sensitivity (see §9).
- No train/test split (measurement study, not prediction).

## 7. Numerical results / baselines
- Sensitivity 0.89 (95% CI 0.86–0.92). PPV: 0.98, 0.93, or 0.76 depending on FP definition.
- HAE incidence per player-game, >10g PLA: defense 11.2, offense 11.3. >30g PLA: defense 1.6, offense 2.6. >1.0 krad/s² PAA: defense 5.5, offense 6.9. >2.0 krad/s² PAA: defense 0.9, offense 1.4.
- Offense shows higher high-magnitude incidence than defense at every threshold above the lowest — a real, counterintuitive asymmetry (ball carriers absorbing tackles vs tacklers initiating them).
- These are exact paper values; no baselines (first-of-kind measurement for this device/protocol).

## 8. Code / data availability
None stated (proprietary device filtering pipeline; video data not public).

## 9. Leakage & limitations
- Small and uneven: 35 players, 4 games, one team, one conference, one season — position-level samples are tiny and the offense/defense asymmetry could be team-scheme-specific.
- Proprietary filtering pipeline: the trigger/recording thresholds interact with the vendor's undisclosed preprocessing, so the 0.89 sensitivity and PPV range are device-pipeline-specific, not universal HAE truth.
- PPV swings from 0.98 to 0.76 across FP definitions — any downstream use must pick a definition and carry its uncertainty.
- No practice data (understates weekly exposure), no impact direction or pulse duration (limits biomechanical modeling), no injury outcomes linked (exposure ≠ injury probability — the paper does not claim a concussion link).
- External validity to NFL: college game speed/schemes differ; NFL players are bigger and faster.

## 10. GSE overlap
Extension of existing work. The existing-research map's NGS taxonomy (2026-09-21) includes collision/impact-related tracking families, and the 2026-09-17 gse-lab work covers pressure/contact splits — but repo greps show no head-impact-exposure or concussion-protocol modeling. The 2026-09-18 props-reverse-engineering lane covers player availability indirectly. This paper supplies the missing quantitative exposure priors: how often players at each position/side actually experience high-magnitude head loading per game.

## 11. GSE implementation spec
- Build a position × side-of-ball exposure prior table from the paper's incidence rates (e.g., offensive skill players: 2.6 >30g events/game, 1.4 >2.0 krad/s² events/game), with the FP-definition uncertainty band (0.76–0.98 PPV) as an explicit error bar.
- Use as a feature family in player-availability models: cumulative seasonal exposure estimate = Σ per-game rates × games played, entered alongside injury-report status and practice participation.
- Second use: performance-degradation priors — test whether skill-position players with high imputed exposure show second-half efficiency decay (YAC, broken tackles) in nflverse data.
- Effort: 2–3 days for the prior table + exposure features; availability-model integration is a separate project.

## 12. Reproducible test
Dataset: nflverse play-by-play + injury reports 2022–2025. Metric: does adding the paper-derived cumulative-exposure feature improve out-of-sample log-loss of a next-week player-absence (DNP/inactive) model vs the same model with only injury-report + practice features? Baseline to beat: injury-report-only model; require ≥0.003 log-loss improvement on a 2025 holdout AND a monotone exposure→absence relationship (no sign flips across position groups).

## 13. Acceptance / rejection gate
ADAPT the exposure priors if: the exposure feature improves DNP log-loss by ≥0.003 on the 2025 holdout with monotone direction across position groups. REJECT any direct injury-probability claim — the paper measures exposure, not concussion risk; GSE must never present per-game HAE rates as per-game injury probabilities.

## 14. Improvement experiment
Link exposure to performance, not just availability: regress second-half offensive efficiency (EPA/play, success rate) on imputed cumulative exposure within player-seasons, controlling for opponent strength and game script. Hypothesis: the offense-side high-magnitude asymmetry (2.6 >30g events/game) predicts measurable late-season degradation for high-contact positions (RB/WR/TE), which would turn a measurement study into a live fantasy/pick edge.
