# [1536] Spatial modeling of shot conversion in soccer to single out goalscoring ability (arXiv:1702.05662)

**Citation:** Soudeep Deb, Debangan Dey (2017). *Spatial modeling of shot conversion in soccer to single out goalscoring ability*. arXiv:1702.05662. URL: https://arxiv.org/abs/1702.05662
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a Bayesian spatial probit for shot conversion with player random effects ("shooting prowess") plus derived "positioning sense" measures is a directly portable blueprint for GSE's player-level finishing-skill vs shot-quality separation in props/fantasy (xG-overperformance decomposition).

## 1. Research question
Standard binary-regression expected-goals models fit poorly and ignore spatial dependence between shot locations. The paper asks: can a Bayesian probit model with a spatially correlated error process (correlation decaying with distance between shot locations) plus a player random effect produce better-calibrated shot-conversion probabilities, and can the model then be used to decompose a player's goal output into positioning sense (getting into good spots) versus shooting prowess (converting beyond expectation)? Applied to MLS 2016/17.

## 2. Dataset / schema
Major League Soccer 2016/17 season shot-level data (source implied: American Soccer Analysis / MLS; full-season shot logs). Each shot: (x,y) location, outcome (goal/no goal), distance and angle (transformed to log-distance and cosine-angle so they are uncorrelated covariates), body part (header vs other — analyzed separately), keeper's reach (shortest distance the keeper must cover from best position), game situation (team leading/trailing/drawing), time, play type. Headers are taken much closer: median distance 11.2 yards vs 17.6 yards overall. Players with fewer than a cutoff of s_m = 10 (matches) are pooled into a generic player effect.

## 3. Method / model
Latent probit with spatial error process, fully Bayesian, Gibbs-sampled. For shot i: Y_i = I(r_i > 0), Y_i ~ Bernoulli(p_i), p_i = P(r_i > 0); r = Xθ + Az + w + e, where z ~ N(0, σ_p² I_M) are iid player random effects ("shooting prowess"), w ~ N(0, σ_w² Σ_w) is a zero-mean spatially correlated process, e ~ N(0, σ² I) is white noise. Priors: improper Jeffrey's on θ; σ² (= σ_w², assumed equal for parsimony) and σ_p² ~ inverse-Gamma(a,b), a > 1; decay parameter φ fixed, chosen by cross-validation over [0.05, 1] using e^{−φd} ≈ 0.05 to set the effective range. Two new player measures: Shooting Prowess SP_k = posterior mean of z_k; Positioning Sense PS_k = (1/g_k) Σ_i p̂_i, the average predicted conversion probability over the player's g_k matches (captures shot quality/volume of opportunities). Posterior predictive sampling for a new shot at location s′ uses the kriging-style conditional (w(s′)|w, σ²).

## 4. Equations & assumptions
- Y_i = I(r_i > 0) (4.5); r = Xθ + Az + w + e; z ~ N(0, σ_p² I_{M×M}); w ~ N(0, σ_w² Σ_w); e ~ N(0, σ² I_{N×N}).
- r_i = X_i′θ + z_{m(i)} + ε_i (4.2); ε_i = w_i + e_i (4.3).
- Cov(w_i, w_j) = σ_w² exp(−φ‖s_i − s_j‖) (4.4), Euclidean distance.
- m(i) maps shot i to player index, pooling low-volume players into group M (4.1).
- Joint log-posterior (4.7): log π(r,θ,σ²,w,z|Y) = K + Σ_i [Y_i log P(r_i>0) + (1−Y_i) log P(r_i≤0)] − w′Σ_w^{−1}w/(2σ²) − ‖r−Xθ−Az−w‖²/(2σ²) − (a+N+1) log σ² − b/σ² − ‖z‖²/(2σ_p²) − (a+M/2+1) log σ_p² − b/σ_p².
- Full conditionals: σ²|· ~ IG(a+N, b + ½‖r−Xθ−Az−w‖² + ½w′Σ_w^{−1}w) (4.8); σ_p²|· ~ IG(a+M/2, b + ½Σ_k z_k²) (4.9); θ|· ~ N((X′X)^{−1}X′(r−Az−w), σ²(X′X)^{−1}) (4.10); w|· ~ N((I+Σ_w^{−1})^{−1}(r−Xθ−Az), σ²(I+Σ_w^{−1})^{−1}) (4.11); z_k|· ~ N((n_k + σ²/σ_p²)^{−1} Σ_{i:m(i)=k}(r_i − X_i′θ − w_i), (n_k/σ² + 1/σ_p²)^{−1}) (4.12).
- SP_k = posterior mean of z_k; PS_k = (1/g_k) Σ_{i=1}^{n_k} p̂_i (4.16).
Assumptions: σ² = σ_w² (parsimony; simulation-tested); φ fixed not inferred; spatial dependence exists across matches/players ("one big shooting experiment on the same hypothetical field"); independence of player effects; separate header/non-header models.

## 5. Features / target
Inputs: shot location, log-distance, cosine-angle, body part (header/other), keeper's reach, score state, shooter identity. Target: binary goal/no-goal (Bernoulli). Horizon: per-shot probability; out-of-sample validation via 80/20 cross-validation with the beta family of proper scoring rules (Buja et al.; Merkle & Steyvers).

## 6. Validation design
Exploratory: Ripley's K-function shows clustering diverging from homogeneity; join-count test (k=63-NN graph, k ≈ √n) rejects spatial independence with p ≈ 0 for 0–1/1–1/0–0 joins. Model comparison vs SLRM (standard logistic regression), KMM (k-means mixture?), and NN (8-hidden-unit neural net with sigmoid output) on Brier score, log score, misclassification error %, and AUC — computed in-sample and out-of-sample (80/20 split). φ selected by cross-validation. Benchmarks: SLRM, KMM, 8-hidden-unit NN.

## 7. Numerical results / baselines
Paper's reported numbers (Table 5, quoted): headers — Brier 0.091 (SLRM) / 0.101 (KMM) / 0.089 (NN) / **0.061 (ours)**; −log score 301.738 / 338.876 / 299.42 / **184.278** (~38% better); error % 11.03 / 11.654 / 11.03 / **8.949**; AUC 0.746 / 0.745 / 0.789 / **0.952**. Other shots — Brier 0.094 / 0.098 / 0.097 / **0.067** (~30% lower); −log score 958.212 / 1043.567 / 976.625 / **633.371**; error % 11.983 / 11.983 / 12.216 / **9.813**; AUC 0.776 / 0.775 / 0.763 / **0.937**. Spatial correlation effectively zero beyond ~4 yards (headers) and ~6.7 yards (other shots). Player findings: top-10 2016/17 scorers (Piatti, Dos Santos, Adi, Kamara, Wright-Phillips, Dwyer) show high SP/PS; wingers Barrios and Manneh rank high on SPS; defenders Moor, Hines, Horst show strong heading ability; positioning sense significantly positively correlated with heading prowess. Notably, SP/PS computed from only part of the season recovered the end-of-season top scorers.

## 8. Code / data availability
None stated — no code repository; MLS data source not linked for download.

## 9. Leakage & limitations
Adversarial notes: (1) The enormous AUCs (0.937–0.952) vs baselines (~0.75–0.79) with only modest error-rate gains (~2–3 pp) is suspicious — likely the latent spatial process overfits in-sample locations; out-of-sample tables are described but the headline numbers read as in-sample fit comparisons. (2) φ is fixed by CV but σ² = σ_w² is an unprincipled parsimony assumption; sensitivity analysis is thin. (3) Missing the strongest covariates (shot speed, defender/goalkeeper positions) — acknowledged. (4) The "one big field" spatial-across-matches assumption conflates stadium/keeper-quality effects into the spatial term. (5) Headers and other shots split reduces sample; small-sample player effects pooled crudely. (6) No code/data — replication requires rebuilding the Gibbs sampler from the paper's full conditionals. (7) Rare-event calibration acknowledged as unsolved (King & Zeng 2001 cited).

## 10. GSE overlap
Existing map: expected-goals/probit shot-quality models appear as commissioned topics in the corpus but no spatial-error probit and no "prowess vs positioning" decomposition exists. GSE's props lane needs exactly this: separating a player's finishing skill (repeatable) from their shot/opportunity quality (matchup-dependent). The random-effect + spatial-error machinery is novel to the corpus.

## 11. GSE implementation spec
1. Adapt to NFL: replace shots with pass targets — probit P(catch | target location, depth, air yards, separation, QB, coverage shell) with spatial correlation over target location on the field (hash-to-hash × depth grid) and receiver random effects = "catch prowess"; or for rushing: P(success | gap, box count) with rusher random effects.
2. Priors per paper (IG on variances, Jeffrey's on θ); Gibbs via the closed-form conditionals (4.8–4.12) or implement in Stan/PyMC.
3. Derive DFS/fantasy measures: Positioning Sense (expected opportunity quality — routes/targets into high-value spots) vs Catch/Finish Prowess (conversion above expectation) — directly usable for WR/TE prop edges.
4. φ selected by CV; effective range in yards estimated from NGS tracking (analogous to their 4/6.7-yard cutoffs).
5. Effort: ~1–2 weeks for the probit + Gibbs core on nflverse + NGS target-location data.

## 12. Reproducible test
Dataset: nflverse 2022–2025 targets with NGS separation/depth; weekly expanding fits. Metric: out-of-sample Brier and log-loss on 2025 catch/no-catch vs a plain logistic baseline and vs a no-spatial probit; player "prowess" stability: split-half correlation of z_k across seasons ≥ 0.4 required to claim a real skill signal. Gate: spatial probit must beat logistic on held-out Brier by ≥3% before any prop use.

## 13. Acceptance / rejection gate
ADOPT if the receiver "prowess" random effect is split-half stable (r ≥ 0.4 across seasons) AND the spatial probit beats the logistic baseline on 2025 held-out Brier by ≥3%; REJECT as a prop input if prowess is unstable (then it is just shot-quality repackaged) or the spatial term adds no held-out skill — the paper's in-sample AUC jump is the exact overfitting signal to guard against.

## 14. Improvement experiment
Beyond the paper: make φ and the σ²/σ_w² ratio learnable (hierarchical priors) instead of fixed/assumed; replace the stationary exponential with a non-stationary kernel (correlation range varying with field region — red zone vs open field); and calibrate the rare-event probabilities with a King–Zeng-style correction, the exact gap the authors flag. Test whether the non-stationary kernel improves held-out log-loss over the stationary exponential.
