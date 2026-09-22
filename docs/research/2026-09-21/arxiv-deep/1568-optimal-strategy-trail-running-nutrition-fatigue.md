# [1568] Optimal strategy for trail running with nutrition and fatigue factors (arXiv:2401.02919)

**Citation:** Bogna Jaszczak, Łukasz Płociniczak (2024). *Optimal strategy for trail running with nutrition and fatigue factors*. arXiv:2401.02919. URL: https://arxiv.org/abs/2401.02919
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

mechanistic fatigue-accumulation ODE (dQ/dt = K·f·v, fatigue ∝ work rate) plus a logistic nutrition-oxidation/recovery model, validated by predicting race finish times within 0.5–13%; portable as the mathematical core of a player workload/fatigue-state feature for GSE's load-management and injury-availability lane.

## 1. Research question
Extend Keller's classical optimal-running model to long-distance trail races by adding terrain (gravity), nutrition (carbohydrate oxidation), and fatigue dynamics, then solve the optimal-control problem (maximize distance in fixed time / minimize time for fixed distance) via Pontryagin's Maximum Principle and validate predicted finish times against real mountain-race results.

## 2. Dataset / schema
Five 2023 Golden Trail World Series races (men's elite results): Zegama Aizkorri Maratón (41.5 km, 2400/2400 m, record 3:36:40), Marathon du Mont-Blanc (43.0 km, 2500/2500 m, 3:35:04), Dolomyths Run (21.0 km, 1800/1800 m, 1:51:36), Pikes Peak Ascent (20.5 km, 2300/0 m, 2:00:20), Mammoth 26k (27.5 km, 1350/1350 m, 1:54:48). Elevation profiles from Strava API .gpx activities, slopes averaged over 100–250 m segments. Carbohydrate-oxidation parameters fitted to experimental data from Jeukendrup et al. [33] (logistic fit R² = 0.9459). Generic elite-male physiological parameters (F, E₀ = 2×10³ m²/s², m = 65 kg, K = 6×10⁻⁵ 1/s, σ̂ = 27 m²/s³).

## 3. Method / model
State ODEs (per unit mass): dv/dt = f − g·sin α − v/τ − c·v² (force balance: propulsion, gravity, internal resistance, quadratic drag); dx/dt = v; dE/dt = σ − f·v + (ζ/m)·N(t) − Q (energy: aerobic supply, work, nutrition, fatigue drain); dQ/dt = K·f·v (fatigue accumulates proportional to work rate, à la Woodside); dN/dt = k·N(1−N/M) logistic exogenous carbohydrate oxidation (M = 2.32×10⁻² g/s, k = 1.353 1/s, N₀ = 2×10⁻³ g/s), closed-form solution N(t) = (1/M + (1/N₀−1/M)e^{−kt})⁻¹. Aerobic supply σ = σ̂·f_d·f_a with duration factor f_d = (940 − T/60)/1000 and altitude factor f_a = 1 − 11.7×10⁻⁹a² − 4.01×10⁻⁶a, and σ = VO₂max/3 (from 20 kJ per liter O₂). Optimal control: maximize ∫v dt subject to dynamics, 0 ≤ f ≤ F, 0 ≤ E ≤ E₀. Hamiltonian with state-constraint penalty η; switching function ψ = ∂H/∂f = ιλ_v − χλ_E v + λ_Q v (linear in f → bang-bang + singular arcs). Theorem 1: optimal = maximal-force subarcs at start and on uphills steeper than α₀, singular subarcs elsewhere; flat-route structure: max-force → interior arc → max-energy boundary arc (E≡1) → interior arc → depleted-energy arc (E≡0). Singular controls: f_int from ψ̈ = 0 (Eq. 29), boundary f_b = (κ + φN − ωQ)/(χv) (Eq. 30). Generalized Legendre–Clebsch condition verified (manifestly satisfied on flat route). Numerics via GEKKO/IPOPT.

## 4. Equations & assumptions
- dv/dt = f − g sin α − v/τ − c v², v(0)=0 (Eq. 3); dx/dt = v, x(0)=0 (Eq. 4).
- dE/dt = σ − fv + (ζ/m)N(t) − Q, E(0)=E₀ (Eq. 5); dQ/dt = Kfv, Q(0)=0 (Eq. 6).
- dN/dt = kN(1−N/M), N(0)=N₀ (Eq. 12); solution Eq. 13.
- σ = VO₂max/3 (Eq. 8); f_d (Eq. 9), f_a (Eq. 10), σ = σ̂ f_d f_a (Eq. 11).
- Nondimensional system Eq. 19 with constants ι=T/τ, β=gT/(Fτ), γ=cTFτ, κ=σT/E₀, χ=F²τT/E₀, φ=ζMT/(mE₀), ω=KF²τT²/E₀ (Table 6: ι=8686.57, β=12718.69, γ=97.97, κ=62.86, χ=70.02, φ=13.91, ω=24.45; γ≪ι,β so drag dropped).
- Hamiltonian Eq. 21; adjoint Eqs. 22–25; transversality Eq. 26; switching function Eq. 27; control structure Eq. 28; f_int Eq. 29; f_b Eq. 30; GLC condition Eq. 33.
- Assumptions: σ constant over race; continuous carbohydrate oxidation (justified if athlete follows intake guidelines + pre-race snack); fatigue ∝ work rate only (no recovery term within race); point-mass runner; smoothed slope profile; generic (not athlete-specific) parameters; dx/dt = v·cos α variant used for .gpx horizontal distances (Eq. 36).

## 5. Features / target
Features: route elevation profile α(x), athlete VO₂max, body mass, race duration/altitude (for f_d, f_a). Target: optimal pacing strategy f*(t)/v*(t) and predicted finish time T for distance D (time-minimization form, Eqs. 34–35). Intermediate states: energy E(t), fatigue Q(t), nutrition N(t).

## 6. Validation design
Out-of-sample-by-construction: model fitted with generic literature parameters (no per-race tuning), predicted finish times compared against independent route records for 5 races of different character (alpine marathons, half-marathon, pure uphill, skyrunning). Optimality proven analytically (Theorem 1 + GLC); numerics (GEKKO/IPOPT) reproduce the proven arc structure. No train/test split in the ML sense — validation is prediction-vs-record on unseen races.

## 7. Numerical results / baselines
Relative finish-time errors: Zegama 0.51% (3:35:34 vs 3:36:40), Mont-Blanc 3.45% (3:42:29 vs 3:35:04), Dolomyths 10.03% (optimistic — loose-rock switchbacks not in elevation profile), Pikes Peak 9.93% (optimistic), Mammoth 26k 13.3% (pessimistic — gravel roads faster than profile suggests). Best accuracy (<5%) on alpine marathons. Key structural finding: optimal strategy ≈ maintain near-constant power; maximal force only at start and steep uphills; final acceleration as energy depletes; fatigue Q(t) nearly linear regardless of course. Baseline: route records (no statistical baseline — this is mechanistic modeling).

## 8. Code / data availability
No code repository stated; numerics via GEKKO/IPOPT (public tools). Elevation from Strava API; race records from ratemytrail; oxidation data from [33]. Reproducible in principle from the equations and tables, but no turnkey code.

## 9. Leakage & limitations
Sport transfer is the main limitation: continuous endurance running ≠ intermittent team sport; the nutrition/recovery logistics and constant-σ assumption don't map to football. No injury outcome — fatigue Q is a performance construct, not an injury predictor. Generic parameters (not athlete-specific VO₂max/mass) cap accuracy; surface type unmodeled (explains the Dolomyths/Mammoth errors); weather unmodeled. No recovery term in dQ/dt (fine within a race, wrong across a season). The model predicts elite-male times; women's application needs re-parameterization (noted by authors).

## 10. GSE overlap
Fills a methodological gap in GSE's workload lane: the corpus critiques workload ratios (1907.05326) and monitors biomarkers (2510.01810), but has no mechanistic fatigue-accumulation model. The dQ/dt = K·(work rate) ODE gives GSE a principled alternative to ad-hoc rolling averages for a cumulative player-fatigue state — accumulates with NGS-derived power proxies (speed × acceleration bursts), decays between games via a recovery term the paper omits but the logistic N(t) machinery suggests how to add.

## 11. GSE implementation spec
Build `gse_fatigue_state.py`: per-player latent fatigue Q updated per play from NGS power proxy P = m·v·a (sprint/acceleration load), dQ/dt = K·P during games/practice, dQ/dt = −ρ·Q between sessions (recovery; ρ fitted). Calibrate K, ρ per position group by fitting Q-trajectories to observed outcomes (missed-practice days, in-game snap declines, soft-tissue injury flags) — mirroring the paper's fit-to-performance-data approach. Serve Q and its 7-day integral as features into GSE's availability/injury-risk model and as a load-management dashboard input (the paper's "uniform power is optimal" result → flag players whose weekly load distribution is spiky vs smooth). Validate by backtesting: does adding Q improve injury-flag AUC over raw rolling-average load features.

## 12. Reproducible test
Backtest on 2023–2024 NFL seasons: fit K, ρ per position group on 2023 (Q-trajectories vs soft-tissue injury designations), then freeze and evaluate on 2024. Pass gate: injury-risk model with Q-features beats the same model with 7/28-day rolling-average load features by ≥2 points of AUC on soft-tissue injuries. Secondary gate: the fitted ρ (recovery rate) must be physiologically plausible (half-life 2–7 days); a ρ implying <1-day or >21-day half-life fails the model as misspecified.

## 13. Acceptance / rejection gate
Accepted (narrowly but genuinely): validated predictive accuracy (0.5–13% finish-time errors across 5 independent races), a mechanistic fatigue ODE directly portable to workload-state modeling, and an explicit parameter-fitting methodology. The sport-transfer limitation is real but the machinery — not the trail-running application — is what GSE adapts. Not a plug-in predictor; a feature-engineering template.

## 14. Improvement experiment
Add the missing recovery term to dQ/dt and a stochastic injury-hazard layer: model soft-tissue injury as a point process with intensity λ(t) = λ₀·exp(γ·Q(t)) (Q = accumulated fatigue state), turning the paper's performance model into an injury-prediction model — the experiment GSE actually needs. Estimate λ₀, γ per position group from NFL injury data; test whether λ(t) anticipates injuries better than ACWR-based hazards (ties back to 1907.05326's critique).
