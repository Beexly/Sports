# Ledger 1814 — Model Quality in Football: Quantifying the Quality of an Expected Threat Model

## 1. Citation and explicit full-text-read statement

- **arXiv:** 2604.21087
- **Title:** Model quality in football: Quantifying the quality of an Expected Threat model
- **Authors:** Koen van Arem, Jakob Söhl, Mirjam Bruinsma (AFC Ajax), Geurt Jongbloed (TU Delft)
- **Full-text-read statement:** I read the complete paper full text (abstract, xT Markov-chain framework, value-iteration algorithm with Proposition 1 geometric convergence bound, statistical-error decomposition with Propositions 2–4 concentration bounds, Theorem 1 combined bound, simulation study with 104,000 estimated models and the lognormal error model with OLS fit, acceptable-error calibration via expert consultation and quartile-misassignment simulations, three rules of thumb with worked examples, Euro 2020 midfielder application, discussion, proofs, and references) from the extracted text at `/tmp/wave4b-dfs2/txt/2604.21087.txt` (HTML saved to `/tmp/wave4b-dfs2/papers/2604.21087.html`). Raw paper text remains in `/tmp`; nothing was committed to the repo.

## 2. Research question

Expected Threat (xT) models are widely used but their *estimation error* as a function of grid resolution (game states K) and training size (n) is unquantified — so practitioners can't tell whether their model's player ratings are trustworthy. What is the distribution of the xT model error, what error level breaks scouting decisions, and what rules of thumb guarantee a valid model?

## 3. Method/model

- **Theory:** xT satisfies x = s + T·x (s = goal-given-shot vector, T = transition matrix); value iteration converges geometrically (Proposition 1: error after m iterations ≤ γᵐ/(1−γ)·‖x⁽⁰⁾−x⁽¹⁾‖∞).
- **Statistical error:** split into estimation error of s and T with Hoeffding-based concentration bounds (Propositions 3–4): ‖ŝ−s‖∞ = O(√(log K/n)), ‖T̂−T‖∞ = O(K√(log K/n)); combined in Theorem 1.
- **Simulation:** treat xT models trained on ~4M StatsBomb open-data events (5 leagues) as ground truth; resample possession chains, refit, measure model error = ‖x̂−x‖∞; 104,000 fitted models across K × n grid.
- **Acceptable error:** expert consultation → acceptable if < 10% of players misassigned a quartile (≤ 1 quartile shift) with 90% probability; calibrated by simulating 10,000 models per n on 47 Ligue 1 center-forwards.

## 4. Mathematics, equations, assumptions

- Model error measured in **ℓ∞ norm**: max over states of |x̂(s) − x(s)| — worst single-state error, interpretable as a margin of error per game state.
- Fitted lognormal model: log(error) = c + α·log K + β·log n + ε; OLS estimates: **c = −2.0916, α = 1.0100, β = −1.0267** (R² = 0.864), residual variance 0.1782.
- So: error ≈ LogNormal(−2.0916 + 1.01·log K − 1.0267·log n, 0.1782) — much better than the worst-case O(K√(log K/n)) theory bound.
- **Maximal acceptable error: 0.0192** (1.92 percentage points per state).
- **Assumptions:** (a) resampled "ground truth" models are error-free (they aren't — limitation); (b) visits to states are i.i.d. within state (Markov assumption); (c) uniform-ish state visitation for the theory bound.

## 5. Dataset/schema

- **StatsBomb open data**: ~4M events (≈ 6.5 league-seasons) across Premier League, Ligue 1, Serie A, La Liga, Bundesliga; filtered to passes, dribbles, errors, clearances, shots.
- Sample sizes n: 100K–4M; grids K: several (roughly proportional to 12×8 pitch ratio).
- Acceptable-error calibration: 47 Ligue 1 center-forwards (2015/16, ≥ 300 min), 10,000 resampled models per n, 130,000 (error, misassignment) samples.

## 6. Features and target

- **Features:** training size n, game-state count K.
- **Target:** model error ‖x̂−x‖∞ (distribution) and the binary "acceptable for scouting" decision.

## 7. Validation design

- Bootstrap-style: ground-truth model → simulate chains → refit → measure error; 1,000 replications per (K, n) cell; filter cells with bimodal error (missing shots in high-xT states).
- Lognormal fit assessed by R² (0.864), residual homoscedasticity, and QQ plot (heavy left tail → slightly conservative rules).
- Rules of thumb validated by worked examples (existing-model check; grid selection; data-size requirement).

## 8. Exact results and baselines with numbers

- Lognormal parameters: c = **−2.0916** (SE 0.017), α = **1.0100** (SE 0.002), β = **−1.0267** (SE 0.003); R² = **0.864**; residual variance **0.1782**.
- Maximal acceptable model error: **0.0192**.
- Worked checks: the classic Singh (2019) xT model (12×8 grid, ~1 PL season) has P(error < 0.0192) = **0.2209** — likely *not* valid for scouting.
- Rule of thumb: with n = 2.4M (4 seasons), select **K = 192 (16×12 grid)** — the most flexible grid with P(error < 0.0192) ≥ 0.90.
- For a 24×18 grid, required n ≈ **3,348,000** (~5.4 seasons).
- Euro 2020 application: midfielder xT-created/90 ranged **0.055–0.336**; Q4: Havertz, Sabitzer, Damsgaard, Müller.

## 9. Code/data availability

- Code: GitHub (URL in paper; computations on DelftBlue supercomputer).
- Data: StatsBomb open data (public).

## 10. Leakage and limitations

- The "ground truth" models are themselves estimates from 4M events — the error distribution and the 0.0192 threshold may both be slightly overestimated.
- ℓ∞ norm is conservative: a single bad state (usually a rarely-visited high-xT state with zero observed shots) dominates; the filter for bimodal cells is ad hoc.
- Uniform-visitation assumption in the theory doesn't hold (high-threat states are rare — which is exactly why goal-probability estimation error dominates, per the paper's own scatterplots: corr(error, ŝ-error) high, transition-error correlation lower).
- Single-expert-consultation basis for the 10%/90% acceptability criterion.

## 11. GSE overlap

- This is GSE's **model-quality discipline** for any possession-value / EPV-style model: before trusting a field-value surface for player ratings or prop pricing, compute its (K, n)-implied error distribution and check P(error < threshold) ≥ 0.90.
- Directly applicable to GSE's NFL expected-points surfaces (down/distance/field-position grids) and NBA shot-value surfaces: the lognormal error law gives a sample-size rule for grid resolution.
- The "goal-probability estimation dominates transition error" finding tells GSE to spend modeling budget on the scoring-probability head, not the transition matrix.

## 12. Implementation specification

1. **Inputs:** GSE's event data; a candidate EPV/xT-style model with K states trained on n events.
2. **Bootstrap:** treat the fitted model as ground truth → simulate possession chains → refit → record ℓ∞ error; ≥ 500 replications.
3. **Fit** log(error) = c + α log K + β log n; compute P(error < 0.0192) for the production (K, n).
4. **Gate:** only publish player ratings from the model if P(error < threshold) ≥ 0.90; otherwise coarsen the grid or gather more data (use the paper's two selection rules).
5. **Monitor:** track the bimodal-error failure mode (states with zero observed shots but high value) as a data-quality alarm.

## 13. Reproducible test

- Replicate on StatsBomb open data: require fitted α ∈ [0.9, 1.1], β ∈ [−1.15, −0.9], R² ≥ 0.8.
- Apply to one GSE EPV surface: confirm the bootstrap error distribution is approximately lognormal (QQ check) and that the 0.0192-style threshold (rescaled to the sport's scoring scale) gates at least one currently-used grid as invalid — proving the gate has teeth.

## 14. Numeric acceptance/rejection gate and improvement experiment

- **Gate (ADAPT):** 104,000-model simulation with R² = 0.864 lognormal fit, calibrated acceptability threshold 0.0192, and actionable rules (K = 192 at n = 2.4M; n ≈ 3.35M for 24×18). Accept as ADAPT (not ADOPT: ground-truth circularity, single-expert threshold).
- **Improvement experiment:** replace empirical-mean estimation of s with an xG-model-informed shrinkage estimator (the paper's own suggested improvement) and re-run the bootstrap. Success = fitted α or |β| reduced by ≥ 10% (slower error growth) or P(error < 0.0192) ≥ 0.90 achieved at n = 1.5M for K = 192 (vs. current 2.4M requirement).

**Verdict:** ADAPT — Lognormal model-error law and acceptability-gated rules of thumb for possession-value models; adopt the bootstrap error-quantification protocol and the P(error < threshold) ≥ 0.90 publication gate for GSE's EPV/field-value surfaces, with xG-informed shrinkage of scoring probabilities as the improvement path.
