# [0415] Characterizing the spatial structure of defensive skill in professional basketball (arXiv:1405.0231v3)

**Citation:** Alexander Franks, Andrew Miller, Luke Bornn, and Kirk Goldsberry (2015). *Characterizing the spatial structure of defensive skill in professional basketball*. arXiv:1405.0231v3. URL: https://arxiv.org/abs/1405.0231v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5135 lines).
**Verdict:** ADAPT — port the two big ideas to NFL coverage analysis: (1) HMM-based inference of defender→receiver assignment from tracking data, and (2) decomposing a defender's effect into shot/target *frequency* suppression versus *efficiency* suppression, which the paper shows are nearly uncorrelated skills.

## 1. Research question
Can defensive skill in basketball be decomposed spatially — i.e., do defenders differ in *where* they suppress opponent shot attempts (frequency) versus *how well* opponents shoot when defended by them (efficiency) — and can those effects be attributed to individual defenders from optical tracking data?

## 2. Dataset / schema
- 2013–14 NBA optical player-tracking data at 25 frames/second (proprietary).
- Frequency model: nearly 150,000 shooter–region observations. Efficiency model: approximately 115,000 possessions leading to a shot.
- Schema per frame: X/Y positions of all 10 players + ball; derived: defender canonical location, inferred defender–offensive-player matchup, shot region, defender distance at shot.
- Access: proprietary; no public release stated.

## 3. Method / model
- Defender assignment: hidden Markov model mapping each defender to the offensive player he is guarding each frame. Defender's canonical location modeled as μ_{tk} = γ_o O_{tk} + γ_b B_t + γ_h H (weighted combination of guarded offender position, ball position, hoop position; weights sum to 1). Fit by EM across 100 games: Γ̂ = (0.62 ± 0.02, 0.11 ± 0.01, 0.27 ± 0.02); transition parameter ρ ranges 0.96–0.99 across games. A simplified 0.73 O_{tk} + 0.27 H variant is also discussed (the paper notes 0.62/(0.27+0.62) ≈ 0.70).
- Court discretization: log-Gaussian Cox process (LGCP) for spatial shot intensity + non-negative matrix factorization → 6 spatial bases; residual basis discarded, first 5 used downstream.
- Frequency model: multinomial over (shooter, region) outcomes; predictors = offensive player propensity + defender time-share in region.
- Efficiency model: logistic regression for make probability; predictors = shooter + defender + shot region + defender distance; shrinkage toward defender-type means (CAR-style spatial/type shrinkage).
- Inference: MCMC; model comparison by 10-fold cross-validated log-likelihood.

## 4. Equations & assumptions
- Defender canonical location: μ_{tk} = γ_o O_{tk} + γ_b B_t + γ_h H, with γ_o + γ_b + γ_h = 1.
- Fitted: μ_{tk} ≈ 0.62 O_{tk} + 0.11 B_t + 0.27 H (paper's EM estimate).
- Assumptions: (a) each defender guards exactly one offensive player at a time (HMM state); (b) defender positioning is a convex combination of offender/ball/hoop; (c) homogeneous transition parameter ρ across games/players; (d) geometric (memoryless) matchup durations; (e) five NMF bases capture the relevant spatial structure; (f) defender effects are additive and separable into frequency vs efficiency components.

## 5. Features / target
- Frequency model target: which shooter shoots from which region (multinomial). Features: offensive player baseline propensity, defender time-share per region.
- Efficiency model target: make/miss (binary). Features: shooter identity, defender identity, shot region (NMF basis), defender distance at shot release.

## 6. Validation design
- 10-fold cross-validation on out-of-sample log-likelihood for four model variants: (i) full offense+defense with defender-type shrinkage, (ii) common-shrinkage (no defender types), (iii) offense-only, (iv) offense-only with no spatial component. No chronological or cross-season validation.

## 7. Numerical results / baselines
- 10-fold CV log-likelihoods, full vs no-shrinkage vs no-defense vs no-spatial (paper's Table): shooter −25,474.93 vs −25,571.41 vs −25,725.17 vs −26,342.83; basis −25,682.16 vs −25,740.27 vs −25,809.14 (N/A for no-spatial); full −41,461.74 vs −41,646.81 vs −41,904.48; efficiency −3,202.09 vs −3,221.44 vs −3,239.12 vs −3,270.99. Paper's claim: "Incorporating defensive information, spatial information and player type clearly yields the best predictive models."
- Headline substantive finding: frequency suppression and efficiency suppression are distinct skills — Roy Hibbert ranks 1st and 4th in paint efficiency suppression but 161st in both paint frequency bases; Dwight Howard ranks 11th/2nd in paint frequency suppression but 50th/117th in efficiency. A rim protector who deters shots is not the same as one who contests them well.

## 8. Code / data availability
None stated in the extracted text. Tracking data proprietary.

## 9. Leakage & limitations
- Team-scheme confounding: defender "effects" absorb coaching scheme (e.g., a center looks like a great frequency-suppressor because his team funnels drivers to him). No team/scheme random effects.
- Homogeneous ρ and geometric durations are strong simplifications of real matchup dynamics (switches, helps, doubles).
- No out-of-season validation — defender rankings could be single-season noise; no stability analysis reported.
- The HMM forces one-to-one matchup assignment; help defense and double-teams are not explicitly modeled (they leak into the canonical-location weights).
- Proprietary data; the full pipeline cannot be replicated publicly.
- External validity to NFL: the frequency/efficiency decomposition maps directly to coverage (targets allowed vs completion suppressed), but NFL matchup assignment is complicated by zone coverage where "who guards whom" is ill-defined — the HMM needs a zone-aware extension.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's corpus has unit matchups, EPA/play, and success-rate splits, but no defender-assignment inference from tracking data and no frequency-vs-efficiency decomposition for coverage defenders. STRAIN (arXiv:2305.10262) covers pass-rush tracking, not coverage responsibility. This is a **new capability**: inferring who covers whom from NGS tracking and splitting CB/safety value into target-avoidance vs target-suppression — directly relevant to GSE's prop and matchup products.

## 11. GSE implementation spec
- Data: NGS player tracking 2022–2025 (10 Hz), all defensive snaps; join nflverse for targets/completions/EPA.
- Feature engineering: per-frame defender–receiver assignment via HMM (man-coverage frames); zone-coverage frames handled by a zone-responsibility variant (defender's canonical location vs route stems); field discretized via NMF on target-location intensity (the paper's LGCP+NMF port).
- Models: (a) frequency — multinomial over targeted receiver × field zone given coverage defender time-share; (b) efficiency — logistic completion/EPA model with receiver + defender + zone + separation-at-throw; shrinkage toward defender archetype means.
- Training: fit per season; 10-fold CV log-likelihood comparison vs no-defender baselines (replicating the paper's validation).
- Serving: batch weekly CB/safety leaderboards (frequency effect, efficiency effect); matchup features for GSE WR/CB prop models.
- Estimated effort: 3–4 weeks for a single engineer (HMM assignment is the hard part).

## 12. Reproducible test
- Dataset: CBs with ≥300 coverage snaps in 2023–2024 (NGS + nflverse).
- Procedure: estimate frequency and efficiency effects on 2023; correlate with 2024 re-estimates (stability); predict 2024 second-half EPA allowed per target.
- Metric: half-to-half correlation of each component; out-of-sample R² for EPA/target.
- Baseline to beat: raw passer-rating-allowed / raw target rate (the conventional stats the paper's decomposition should beat).

## 13. Acceptance / rejection gate
ADOPT the frequency/efficiency decomposition for GSE coverage grades IF each component shows half-to-half correlation r ≥ 0.35 on 2023–2024 CBs AND the two-component model improves out-of-sample EPA-per-target prediction R² by ≥ 0.02 over the passer-rating-allowed baseline; otherwise REJECT as single-season noise. Gate fixed before running.

## 14. Improvement experiment
Add explicit team-scheme random effects and route-type conditioning to the efficiency model — the paper's biggest confound is scheme, and NFL route data (go, slant, crosser) lets us estimate defender effects *within* route type. Test whether route-conditioned defender effects are more stable across seasons (higher year-to-year r) than the paper's unconditional version; if so, this becomes the GSE matchup-grade foundation.
