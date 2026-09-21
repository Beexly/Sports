# [0326] Commanding the Foul Shot: A New Ensemble of Free Throw Metrics (arXiv:2512.08824v2)

**Citation:** Jake McGrath, Amanda Glazer, Vanna Bushong, Michelle Nguyen, Kirk Goldsberry (2026). *Commanding the Foul Shot: A New Ensemble of Free Throw Metrics*. arXiv:2512.08824v2. URL: https://arxiv.org/abs/2512.08824v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 641 lines).
**Verdict:** ADAPT — the metric concept (accuracy + precision "command" that beats binary outcomes in small samples) and the launch-consistency/physics-robustness stack port cleanly to **NFL placekicking evaluation** (the football analog of a closed, undefended task); adapt by replacing rim geometry with goalpost geometry, adding wind/drag to the 2D projectile model, and sourcing kick trajectories from NGS ball tracking. Do not adopt for basketball (outside GSE scope).

## 1. Research question
Can free-throw shooting skill be measured more informatively than binary make/miss percentage, using in-game 3D ball tracking? The authors (a) define **command** — a quality-of-attempt metric combining accuracy and precision of in-rim landing location; (b) show it predicts future shooting better than past shooting percentage, especially in small samples; (c) define launch-consistency ("touch") metrics and link them to command; (d) build a 2D physics model mapping launch conditions to outcomes and identifying error-robust ("safe") launch regions.

## 2. Dataset / schema
NBA regular-season free throws from Sony Hawk-Eye optical tracking (3D poses of players + ball at 60 Hz), 2024–2025 season only — the 2023–2024 data was judged substantially noisier and discarded. Pipeline: 101,679 attempts (both seasons) → 49,562 (2024–25 only) → 49,412 after removing outliers > 4 SD from the mean in launch position/angle/velocity/landing (intentional misses + false readings, e.g. "hundreds of MPH or negative angles") → **21,964 attempts across 72 players** with ≥ 200 attempts. Per-attempt: launch velocity v0, launch angle θ0, 3D launch position, in-rim landing location (deviation from bullseye = 2 inches behind rim center, per Marty 2018). Players anonymized per data-use agreement. Data/code: proprietary (Hawk-Eye, NBA agreement) — **not shared**.

## 3. Method / model
(a) **Command**: per player, inaccuracy µ = mean landing distance from bullseye; variability σ = shot-to-shot SD of landing distance; C = 1/(1 + µ² + σ²) ∈ [0,1]. Rewards accurate (on the bullseye) and precise (tightly clustered) shooters; distinguishes equal-FT% players (Figure 4: two 86–87% shooters at the 95th vs 48th command percentile).
(b) **Touch (launch consistency)**: per-player SD of launch velocity/angle/3D position → z-scored against league (Eq. 2); consistency r^p_i = 100% − Normalized(z^p_i) (Eq. 3); overall touch R^p = 100% − Normalized(z^p_θ + z^p_v) (Eq. 4) — launch *position* excluded because velocity/angle adjustments can compensate for small positional errors.
(c) **Physics model**: 2D projectile, no drag/Magnus (estimated < 6% of ball weight at v=12 MPH, ω=2 rev/s); maps (v0, θ0) at fixed release (x0, z0) → rim-crossing position xf; outcome bands: swish / rim-contact / complete miss (Figure 8, evaluated at Player A (18.4, 9.6) ft and Player B (18.5, 8.4) ft release positions).
(d) **Error suppression**: perturb each (v0, θ0) by player-empirical δv0, δθ0; compute induced shift in xf ("launch error propagation", Figure 9); dark bands = error-suppressing launch regions. (e) **Shot optimization**: loss L = ½(xf − xg)² with xg = 5 1/12 ft (bullseye distance from baseline); gradient descent on (v0, θ0) to find the perfect-swish launch (Figure 10) — proposed as real-time practice feedback.

## 4. Equations & assumptions
Paper's stated equations, copied faithfully:

(1) C = 1 / (1 + µ² + σ²).

(2) z^p_i = (σ^p_i − µ_σi) / σ_σi.

(3) r^p_i = 100% − Normalized(z^p_i).

(4) R^p = 100% − Normalized(z^p_θ + z^p_v).

(5) xf = x0 − v0x Δt; (6) Δz = v0z Δt − ½gΔt²; (7) xf = x0 − v0 cosθ [sinθ + √(v0² sin²θ − 2gΔz)] / g, with zf = 10 ft.

(8) L = ½(xf − xg)².

Stated assumptions: (a) 2D trajectory (no left-right drift — justified as FTs show minimal lateral deviation); (b) drag and Magnus negligible (< 6% of ball weight); (c) bullseye = 2 in behind rim center is the optimal entry point (from Marty 2018); (d) position excluded from touch because velocity/angle compensate; (e) empirical per-player SDs are the right perturbation scales for error-suppression analysis; (f) command reliable for N ≳ 50 attempts; (g) FT as a "closed task without defensive interference" — the result the authors explicitly say may not extend to field goals under defensive pressure.

## 5. Features / target
Features: per-attempt launch velocity, launch angle, 3D launch position, in-rim landing location (all from Hawk-Eye 60 Hz tracking). Targets: player-level command, consistency percentiles, touch; model outputs: predicted rim-crossing position and outcome band per (v0, θ0).

## 6. Validation design
(a) Split-half predictive validity: season split at Nov 15, 2024; players with ≥ 50 attempts each half; Pearson r of early→late for FT% vs command. (b) Correlational: touch vs command (r), component consistencies vs command. (c) Case study: 7 players spanning touch/command/FT% percentiles (staircase, Figure 6); Table 2 top/bottom-10 command players with consistency percentiles. (d) Physics model: qualitative overlay of empirical makes/misses on predicted outcome bands (Figure 8) — no quantitative fit metric reported. No out-of-sample prediction of makes from launch conditions; no comparison against alternative functional forms of command.

## 7. Numerical results / baselines
All numbers quoted from the paper (paper's claims):
- League-average launch: velocity 14.74 ± 0.33 MPH; angle 48.66 ± 2.99°; height 8.89 ± 0.42 ft.
- Predictive validity: early FT% → late FT% r = 0.61; early command → late FT% **r = 0.67**.
- Touch → command: r = 0.65; velocity consistency → command r = 0.73; angle r = 0.35; position r = 0.17 (weakest, as designed).
- Example: two players both 86–87% FT% sit at 95th vs 48th command percentile.
- Perturbation scales: Player A δθ0 = 1.74°, δv0 = 0.28 MPH; Player B δθ0 = 1.11°, δv0 = 0.24 MPH; perturbations shift xf by up to ~1 ft.
- Optimal bands: swish band widest ~45–50° launch; narrows beyond > 55° or < 40°; error-suppression dark bands ~46° (A) / ~50° (B); higher velocity amplifies error propagation (xf ∝ v0²; angle enters via locally-flat sinθ·cosθ near 45°).
- Reliability floor: command stable for N ≳ 50 attempts; tracking noise biases command in very small samples (unlike FT%).

## 8. Code / data availability
Neither shared. Hawk-Eye tracking under NBA data-use agreement; players anonymized; 2023–24 season withheld from analysis due to noise/recalibration. Nothing independently reproducible.

## 9. Leakage & limitations
- **Tracking-noise sensitivity**: command inherits measurement error; 2023–24 data unusable — the metric's advantage over FT% depends on tracking quality GSE cannot verify for NGS kick data until tested.
- **No quantitative model validation**: the physics outcome bands are validated by eyeball overlay (Figure 8), not by a reported classification metric.
- **2D + no drag/Magnus**: fine for indoor FTs; **invalid for NFL kicks**, where wind and air resistance dominate — the physics port must be 3D with drag/wind (explicitly flagged in §11).
- **Closed-task scope**: authors state the framework may not extend to contested field goals; NFL kicks are closed (snap/hold) but weather- and rush-influenced — closer to FTs than to jump shots, but not identical.
- **Anonymized players**: no external cross-check of the Table 2 claims possible.
- Basketball-only; GSE's sports are football — the sport itself does not transfer, only the metric pattern.

## 10. GSE overlap
Existing-research-map check: the corpus covers NFL passing, rushing, coverage, EPA/WPA, tracking-based models, and betting-market research. **No kicking-specialist analytics lane exists** — no kicker command/consistency metric, no launch-physics model for kicks, no small-sample kicker stabilization method. The 2026-09-21 NGS glossary work covers tracking metrics generally, but nothing like an accuracy+precision quality-of-attempt metric for kickers. The paper's "some makes are better than others" intuition maps exactly onto placekicking (a dead-center make vs a doinker off the upright are both 3 points; a shanked miss vs a 60-yard crossbar miss are both 0). **Verdict: new-capability extension** into the unfilled kicking-evaluation lane.

## 11. GSE implementation spec
Build a **Kicker Command** module:
- **Data**: NGS ball-tracking kick trajectories (FG/XP attempts, 2022–2025); per-kick: launch velocity, launch angle, launch position, and upright-crossing location (deviation from goalpost-center target — the kicking analog of the bullseye).
- **Metric**: C_kicker = 1/(1 + µ² + σ²) with µ, σ over crossing-location deviation; report alongside raw FG% to identify "unlucky-good" vs "lucky" kickers (e.g., a kicker hitting everything dead-center but missing long attempts vs one squeaking balls inside the upright).
- **Touch port**: per-kicker SDs of launch velocity/angle → z-scored consistency; test correlation with command exactly as in §4 of the paper.
- **Physics port (required changes)**: 3D projectile **with quadratic drag and wind vector** (non-negotiable — the paper's drag-free 2D model fails outdoors); map (v0, θ0, wind) → crossbar-plane position; compute error-suppression bands per kicker to flag kickers operating outside their robust region (coaching/development angle + "kicker due for positive regression" content).
- **Product uses**: (1) kicker rankings/projections for DFS + season-long (kick scoring is high-variance; a stabilized skill metric is a genuine edge); (2) "kicker command" content series (differentiated GSE metric); (3) engine input: kicker true-skill estimate for game-total / kicking-prop markets.
- **Effort**: ~1 engineer-week for the metric + validation; physics model 1–2 weeks (drag/wind calibration).

## 12. Reproducible test
Dataset: nflverse play-by-play (kick distances/outcomes, 2015–2025) + NGS kick-trajectory tracking where available; if NGS trajectories are unavailable, approximate with kick distance + outcome + weather. Protocol: compute kicker command on first-half-season kicks (min. 10 attempts — test the paper's N ≳ 50 reliability claim at NFL sample sizes); predict second-half FG% (distance-adjusted, logistic regression with distance controls). Metric: Pearson r / incremental pseudo-R² of first-half command vs first-half raw FG% in predicting second-half FG%. Baseline to beat: raw first-half FG% (the paper's 0.61-analog). Expect the command advantage to be *larger* in the NFL than the NBA because kicker samples are much smaller (the paper's core small-sample argument).

## 13. Acceptance / rejection gate
**Adopt** if first-half kicker command predicts second-half distance-adjusted FG% with statistically significantly higher correlation than first-half raw FG% (p < 0.05, paired bootstrap), OR if command identifies ≥ 3 kickers/year whose raw FG% misstates true skill by > 5 percentage points vs distance-expected (actionable content/betting signal). **Reject** if command adds nothing over distance-adjusted FG% — then kick outcomes are too weather/rush-noisy for a tracking-quality metric to stabilize, and the lane stays closed.

## 14. Improvement experiment
Beyond the paper: (a) the paper stops at description — turn the error-suppression map into a **prescriptive intervention test**: identify kickers whose typical launch sits outside their robust band, then test whether in-season launch adjustments (detectable in tracking) move them into the band and improve command — the paper proposes this feedback loop (Figure 10) but never tests it; (b) add the missing **environmental model**: wind speed/direction + temperature + altitude as covariates in the physics model, and decompose command into kicker-skill vs conditions-luck (dome vs open-air splits) — directly answers the bettor's question the paper's indoor setting never faces; (c) extend to **kickoffs** (hang time + landing spot command) for the new kickoff-format era, where return-coverage value makes kickoff placement a first-order special-teams skill.
