# [0210] NFL step-and-turn: A generative framework for evaluating player movement in American football (arXiv:2603.17866v3)

**Citation:** Nguyen, Q., & Yurko, R. (2026). *NFL step-and-turn: A generative framework for evaluating player movement in American football*. arXiv:2603.17866v3. URL: https://arxiv.org/abs/2603.17866v3 (CMU Department of Statistics & Data Science)
**Ledger completed:** 2026-09-21. **Read:** full text (versioned v3 PDF, https://arxiv.org/pdf/2603.17866v3, 2,098 lines).
**Verdict:** ADAPT — this is the closest paper in the batch to a drop-in GSE tracking-evaluation module: port the Bayesian step-and-turn ghosting engine (ball-carrier random-effects movement models + posterior-predictive hypothetical simulation + ending-yardline valuation) as GSE's "expected yards vs. ghost" player-evaluation metric, replacing any point-estimate ghosting with proper uncertainty propagation.

## 1. Research question
How do you evaluate an NFL ball carrier's observed movement against the distribution of movements that *could reasonably have been made* in the same context — i.e., statistically principled ghosting with uncertainty over the hypotheticals, not just a point prediction of where an average player would be? Applied to RB running plays in weeks 1–9 of the 2022 NFL season (Big Data Bowl 2025 data).

## 2. Dataset / schema
- NFL Big Data Bowl 2025 tracking data: first 9 weeks of the 2022 NFL season, 10 Hz (x, y, speed, acceleration, direction, orientation for all 22 players + ball), event tags (snap, handoff, first contact, tackle, etc.).
- Final sample: **5,400 run plays by RBs across 136 games**. Analysis restricted to the ball-carrier sequence: frames from handoff to tackle/out-of-bounds/touchdown.
- Features (Table 2): ball carrier, defense (11), offense (10 excl. ball carrier) — horizontal yards from target endzone, vertical yards from center, horizontal yards from first-down line, speed, angle of motion relative to ball carrier, relative horizontal/vertical offsets, distance from ball carrier. Anchoring strategy (Horton 2020; Yurko et al. 2020): ball carrier as anchor, other players ordered by Euclidean distance.

## 3. Method / model
- **Step-and-turn representation** (from animal movement literature): each frame's movement = step length s_t (Euclidean distance between successive locations) and turn angle φ_t = b_t − b_{t−1} (change in bearing).
- **Step length model** (2): transformed response s̃_ijt (scaled arcsin of min-max-normalized step length) ~ N(μ^(SL)_ijt, σ²), μ^(SL)_ijt = α^(SL)_0 + X^(SL)_ijt β^(SL) + u_j + v_k; ball-carrier random intercept u_j ~ N(0, τ²_u), defensive-team random intercept v_k ~ N(0, τ²_v); covariates = ball carrier + closest defender features, player counts per direction, and previous-frame step length.
- **Turn angle model** (3): φ_ijt ~ von Mises(μ^(TA)_ijt, κ_ijt); mean via tanh-half link on α^(TA)_0 + X^(TA)_ijt β^(TA) (incl. previous-frame turn angle, capturing directional persistence); concentration log κ_ijt = γ_0 + γ_1 s_ijt + w_j with ball-carrier random intercept w_j ~ N(0, τ²_w) — i.e., step length dictates turn concentration, and players differ in turn-angle variability.
- Fit in **Stan via brms**: 4 chains × 5,000 iterations (2,500 warmup) → 10,000 posterior draws; half-t_3 priors on variance components; R̂ ≈ 1, no ESS issues; prior-sensitivity check in Appendix C.
- **Posterior-predictive simulation** (one step ahead per frame, other 21 players held fixed): draw a *new* player random effect from N(0, τ²) to simulate an "average player" ghost; H = 100 hypothetical steps per frame; each (s, φ) pair converted to a hypothetical location; features recomputed; ending yard line estimated for each.
- **Play value**: end-of-play yard line ℓ̂_ijt = E[L_ijt | X_ijt], estimated with a **CatBoost multinomial classifier** over 1-yard ending-yardline bins (10–110), ℓ̂ = Σ_l l·P(L=l | X) (Eq. 5). Framework is modular — any valuation model can substitute.
- **Evaluation**: δ^(h)_ijt = ℓ̂_ijt − ℓ̂^(h)_ijt (Eq. 6); frame-average δ̄_ijt = (1/H)Σ_h δ^(h)_ijt (Eq. 7) with quantile-based intervals; integrated over a play or time windows.

## 4. Equations & assumptions
- (1) ℓ_ijt = E[L_ijt | X_ijt]. Clean.
- (2) Step-length multilevel Gaussian (transformed response), as in §3. PDF extraction garbled superscripts; structure verified against the prose — flagged as reconstructed notation, not uncertain substance.
- (3) von Mises turn-angle with tanh-half link on mean and log-link on concentration κ conditioned on current step length; player random intercept w_j on κ only. Prose-verified; notation partially reconstructed from garbled extraction.
- (4) Posterior predictive integrals ∫ p(s̃_new | θ)p(θ | D) dθ. Prose-clear.
- (5) ℓ̂_ijt = Σ_{l=10}^{110} l·P(L_ijt = l | X_ijt). Clean.
- (6)–(7) δ^(h)_ijt = ℓ̂_ijt − ℓ̂^(h)_ijt; δ̄_ijt = (1/H)Σ_h δ^(h)_ijt. Clean.
- (8) Yards success rate = (1/H)Σ_h 1(δ^(h)_ijt > 0), averaged over frames. Clean.
- (9) Explosiveness = 1(ℓ̂_ijt > q_0.95(ℓ̂^(h)_ijt)), averaged over frames. Clean.
- Step length formula: s_t = √((x_{t+1}−x_t)² + (y_{t+1}−y_t)²); bearing b_t = atan2(y_{t+1}−y_t, x_{t+1}−x_t); φ_t = b_t − b_{t−1}.
- **Assumptions (flagged)**: other 21 players held fixed during hypothetical simulation — acknowledged in §5 as a simplification ("hypothetical individual movement behavior for a single step, rather than a fully dynamic recreation"); full trajectory simulation would need a tackle-probability termination model and multi-agent movement models, explicitly listed as future work. One-step-ahead ghosting, not trajectory ghosting.

## 5. Features / target
- Inputs: 10 Hz tracking features (Table 2) for ball carrier, closest defender, and player counts per direction.
- Targets: (a) step length / turn angle at next frame (movement models); (b) ending yard line bin (CatBoost valuation); (c) derived: frame-level δ vs. ghost, yards success rate, explosiveness.

## 6. Validation design
- Model choice via posterior predictive checks: Gamma and lognormal step-length models both fail (overestimate density near short steps, underestimate tail); the scaled-arcsin Gaussian wins (Appendix A, Figure 8).
- Face-validity validation of player ratings: Jonathan Taylor ranked least variable turn-angle (matches scouting "straight-ahead runner"); credible intervals at top vs. bottom of the leaderboard do not overlap (discriminative power per Franks et al. 2016).
- Case study: Javonte Williams week-2 play (TEX @ DEN, 17-yard run) — accumulated +11.4 yards vs. hypothetical baseline; at first contact, observed ending yard line above the 95th percentile of the ghost distribution; post-contact peak ≈ +3 yards/frame differential; interval bands widen post-contact.

## 7. Numerical results / baselines
- **Yards success rate** (fraction of frames beating the ghost): top 5 — Josh Jacobs 0.542, Miles Sanders 0.539, Travis Etienne 0.527, Dameon Pierce 0.512, James Robinson 0.507; bottom 5 — Michael Carter 0.446, A.J. Dillon 0.448, Cordarrelle Patterson 0.450, Raheem Mostert 0.453, Christian McCaffrey 0.457 (all ≥70 attempts, weeks 1–9 2022).
- **Explosiveness** (fraction of frames above the ghost's 95th percentile): top 5 — Travis Etienne 0.118, Aaron Jones 0.095, Kenneth Walker 0.093, Miles Sanders 0.092, Antonio Gibson 0.089; bottom 5 — Tyler Allgeier 0.035, Jamaal Williams 0.044, A.J. Dillon 0.050, David Montgomery 0.054, Michael Carter 0.054.
- Movement-profile insight: correlation r = 0.279 between step-length and turn-angle random effects; Taylor = long strides/low turn variability; McCaffrey = short steps/high turn variability.

## 8. Code / data availability
- Code: **https://github.com/qntkhvn/nflstepturn** (stated in paper). Data: NFL Big Data Bowl 2025 on Kaggle (https://www.kaggle.com/competitions/nflbigdatabowl-2025/data). Model code in R (brms/Stan) + CatBoost.

## 9. Leakage & limitations
- No leakage issues identified: simulation is one-step-ahead at observed frames; no future information leaks into the ghost.
- Limitations: (a) fixed-opponent assumption (authors acknowledge); (b) one-step-ahead only, not full-trajectory ghosting; (c) RBs on run plays only — no receivers after catch, QBs, defenders; (d) 2022 weeks 1–9 only (roster/season drift); (e) valuation model (CatBoost ending yard line) is a plug-in, and the δ metric inherits its biases; (f) no comparison against deep imitation-learning ghosting baselines (Le et al. 2017) as a predictive benchmark — only posterior predictive checks vs. Gamma/lognormal.

## 10. GSE overlap
- GSE's map cites Yurko nflWAR/going-deep only as foundations (lines 60, 127) — **no ghosting, no step-and-turn, no movement-profile metrics anywhere in the map**. The trajectory-diffusion work (arXiv:2503.18589, 0205) models full trajectories generatively but does not do hypothetical evaluation of observed plays. This paper is a net-new capability: the only uncertainty-aware ghosting framework in the corpus.

## 11. GSE implementation spec
- **Port as "GSE Ghost Score"**: expected ending yard line vs. an average-player ghost, at every frame of every RB carry (then extend to RAC receivers).
- Implementation path: (1) clone https://github.com/qntkhvn/nflstepturn; (2) re-fit on full 2022–2025 nflverse/BDB tracking with GSE's CatBoost/EP valuation swapped into the modular valuation slot; (3) batch-compute frame-level δ̄, yards success rate, explosiveness per player-week; (4) ship as weekly RB content ("which backs are creating yards the blocking didn't") and as an engine feature for rushing prop markets (the success-rate metric is a per-carry skill signal orthogonal to EPA).
- Effort: re-fit + pipeline ~2 weeks; weekly content table ~2 days after pipeline exists. Requires BDB-scale tracking data (nflverse has 2018+).

## 12. Reproducible test
- Dataset: nflverse 2022 weeks 1–9 RB run plays (replicates the paper's sample); target = reproduce the yards-success-rate leaderboard ordering (Jacobs/Sanders/Etienne top 3) within ±0.02 per player.
- Metric: Spearman correlation ≥ 0.80 between GSE's refit leaderboard and the paper's Table 3 on the same sample; then stability check: refit on weeks 10–17 and require split-half Spearman ≥ 0.60 before the metric ships as a prop feature.

## 13. Acceptance / rejection gate
ADOPT the ghost-score pipeline if the refit reproduces the paper's yards-success-rate leaderboard (Spearman ≥ 0.80 vs. Table 3 on weeks 1–9 2022) **and** shows split-half stability (Spearman ≥ 0.60 between first-half and second-half season refits); otherwise REJECT — an unstable ghost metric is worse than no metric for prop-market use.

## 14. Improvement experiment
The paper's own future work, sharpened for GSE: replace the fixed-opponent assumption with a **joint multi-agent forward simulator** — train the 0205 heteroscedastic diffusion trajectory model as the opponent simulator and the step-and-turn model as the ball-carrier proposal, then terminate simulated trajectories with a learned tackle-probability model (per the paper's §5 checklist). That converts one-step-ahead ghosting into full-trajectory ghosting, which unlocks counterfactual "what if he cut left" content and a strictly stronger valuation signal than frame-level δ.
