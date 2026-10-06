# [1448] G-Elo: Generalization of the Elo algorithm by modeling the discretized Margin of Victory (arXiv:2010.11187)

**Citation:** Leszek Szczecinski (2022). *G-Elo: Generalization of the Elo algorithm by modeling the discretized Margin of Victory*. arXiv:2010.11187v3 [stat.ME]. URL: https://arxiv.org/abs/2010.11187
**Ledger completed:** 2026-09-21. **Read:** full text (PDF; abstract, sections 1–5, Tables 1–3, Figure 1, all references — read via pdftotext).
**Verdict:** ADAPT — (a) implement G-Elo as GSE's online probabilistic rating with margin-of-victory baked into the model rather than into a heuristic K-factor: discretize the point differential into ordinal categories, fit an Adjacent Categories (AC) model, and get Elo-identical updates θ ← θ + K̃σ(ỹ − G(z)) where only the score and expected score are redefined — binary Elo (J=1) and Elo-Davidson (J=2) fall out as special cases; (b) adopt the closed-form frequency-based coefficient estimation (Eqs. 43–46: η, α, δ from category frequencies) — it generalized *better* than full ML optimization in the paper's tests and is fully transparent; (c) for NFL use the 7-category discretization with Δ′=5, Δ″=10: on 2014/15–2018/19 NFL data it beat Elo-Davidson on all three metrics (LS 0.6224 vs 0.6304, RPS 0.2166 vs 0.2200, accuracy 0.6656 vs 0.6375); (d) pair with [1449]'s Laplacian-variance machinery for uncertainty on the ratings and [1447]'s LS as the batch baseline.

## Research question
How can margin of victory (MOV) be incorporated into an Elo-style rating algorithm inside a formal probabilistic model — keeping Elo's one-line, interpretable update — instead of the usual heuristic of making the K-factor depend on MOV (Hvattum & Arntzen 2010, FiveThirtyEight, Kovalchik 2020) or fitting a rigid Gaussian/Skellam distribution to the raw differential?

## Method
Three steps:
1. **Discretize MOV.** The point differential d_t is binned into J+1 ordinal categories, e.g. J=4: {d_t < −Δ} ≡ strong away win (y=0), {−Δ ≤ d_t < 0} ≡ weak away win (y=1), {d_t = 0} ≡ draw (y=2), {0 < d_t ≤ Δ} ≡ weak home win (y=3), {d_t > Δ} ≡ strong home win (y=4); J=6 adds two more bands with thresholds Δ′, Δ″. Discretization is sport-specific and robust to outliers (rare blowouts are lumped).
2. **Adjacent Categories (AC) model.** Pr{Y_t = h | z_t} ∝ 10^{α_h + δ_h z_t/σ} (Eq. 8), normalized to a multinomial logistic (Eq. 11), with symmetry constraints α_h = α_{J−h}, δ_h = −δ_{J−h} (Eq. 12). The AC model generalizes Bradley-Terry (J=1) and Davidson (J=2) — the models already known to underpin Elo — and is chosen over the cumulative-link model precisely because it yields Elo-style updates.
3. **Stochastic-gradient ML.** Maximizing the log-likelihood of the observed category via SG gives the G-Elo updates θ_{t+1,i} ← θ_{t,i} + K̃σ(ỹ_t − G(z_t)) (Eqs. 22–23, 25) — exactly Elo's form (Eq. 1), with redefined score ỹ_t = δ̃_{y_t} ∈ [0,1] (Eqs. 18–19) and expected score G(z) (Eq. 20); E[Ỹ_t|z_t] = G(z_t) (Eq. 24). Home-field advantage enters as θ ← θ + ησ (Eq. 29).

**Coefficient estimation** — two routes: (i) ML optimization over (α, δ, η) with per-season team skills (Eq. 30); (ii) closed-form frequency estimation: from category frequencies f_h (Eq. 31) get ξ = √(f_0 f_J), η = (1/2)log10(f_H/f_A) (Eqs. 43–44), α_h = (1/2)log10(f_h f_{J−h}) − log10 ξ (Eq. 45), δ_h = (1/(2η))log10(f_h/f_{J−h}) (Eq. 46). For J=2 this reduces to the Elo-Davidson coefficients η = (1/2)log10(f_H/f_A), κ = 10^{α_1} with α_1 = log10(f_D/√(f_H f_A)) (Eqs. 47–48) — and exposes that plain Elo's implicit κ=2 assumes ~50% draws, "clearly unrealistic in most sports."

## Equations
- AC model: Pr{Y_t=h|z_t} = 10^{α_h+δ_h z_t/σ} / Σ_l 10^{α_l+δ_l z_t/σ} (Eq. 11)
- G-Elo update: θ_{t+1,i} ← θ_{t,i} + K̃σ(ỹ − G(z)) (Eq. 25); score ỹ_t = δ̃_{y_t} (Eq. 18); expected score G(z) (Eq. 20)
- Elo as special case: J=1 → G(z) = 10^{z/σ}/(10^{z/σ}+10^{−z/σ}) (Eq. 26); J=2 → Elo-Davidson G(z) (Eq. 27)
- Frequency estimators: ξ = √(f_0 f_J) (43); η = (1/2)log10(f_J/f_0) (44); α_h = (1/2)log10(f_h f_{J−h}) − log10 ξ (45); δ_h = (1/(2η))log10(f_h/f_{J−h}) (46)
- Metrics: log score LS (Eqs. 52, 55), Ranked Probability Score RPS (Eqs. 53, 56), accuracy AC (Eqs. 54, 57), evaluated on second half of each test season (τ = T/2 burn-in)

## Datasets
EPL association football and NFL American football, ten seasons 2009/10–2018/19 (EPL: M=20, T=380 games/season, from Football-data.co.uk; NFL: M=32, T=256 games/season, from Pro Football Reference). First five seasons = training (coefficients + K̃ calibration), last five = test. EPL thresholds Δ ∈ {1,2,3}, NFL Δ ∈ {5,10,15}; 7-category variants (Δ′=1, Δ″=2 EPL; Δ′=5, Δ″=10 NFL). Category frequencies in Table 1 (NFL draw frequency f_D = 0.001 — practically binary).

## Exact results / baselines
Table 3 (test seasons, ternary A/D/H prediction, metrics averaged over second half of seasons):
- **NFL:** Elo-Davidson (J=2): LS 0.6304, RPS 0.2200, AC 0.6375 → G-Elo J=6 (freq.): **LS 0.6224, RPS 0.2166, AC 0.6656**. The +2.8pp accuracy gain over Elo-Davidson comes largely from NFL games being practically binary (draw freq 0.001), so dropping the draw modeling removes error. Non-algorithmic frequency baseline: LS 0.6881, AC 0.5594.
- **EPL:** Elo-Davidson: LS 0.9740, RPS 0.2006, AC 0.5442 → G-Elo J=6: LS 0.9679, RPS 0.1987, AC 0.5389. Small but consistent log-score/RPS gains; accuracy roughly flat.
- **Frequency vs optimization:** the closed-form frequency estimators generalized slightly *better* than the ML-optimized coefficients on test data — the paper conjectures optimization overfits while frequency averaging regularizes.
- **K̃ calibration:** K̃ chosen to minimize log score on training data also minimized it on test data (Figure 1) — the train/test transfer is clean.
- Figure 1 also plots Bet365-implied probabilities as a reference line; the paper notes "beating the bookmakers' prediction by a couple of percent may be sufficient to ensure the monetary gains" (fn. 14).

## Leakage assessment
Clean: strict season-blocked train/test split; coefficients and K̃ from training seasons only; metrics averaged over the second half of test seasons after SG burn-in (τ = T/2). No in-sample scoring. One caveat for GSE: within-season skill drift is handled only implicitly via SG, not modeled (author flags random-walk extensions as future work).

## GSE overlap / corpus position
- Same author as [1446] (Szczecinski, ordinal paired-comparison models, 2608.23859) — read as a pair: [1446] is the ordinal-regression theory, [1448] is the online rating algorithm built on the same Adjacent Categories machinery. Different papers, complementary adaptations.
- Vs [1449] (least squares, 2401.07018): G-Elo is the probabilistic online alternative to batch LS; LS assumes Gaussian differentials, G-Elo discretizes and stays robust to blowouts.
- Vs [1447] (LS ratings, 2201.05249): G-Elo is the model-based MOV answer to the same "use the differential" question — run both, compare on the same backtest.
- Supersedes heuristic K(MOV) scaling (Kovalchik 2020, FiveThirtyEight): this paper gives the principled version of that heuristic with identical update cost.
- Directly relevant to GSE's Elo lane: it shows plain Elo's ternary score (0, 0.5, 1) is only correct under a 50%-draw assumption, and gives the sport-calibrated fix.

## Implementation plan (GSE)
1. Implement G-Elo in the ratings module: 7-category NFL discretization {d<−10}, {−10≤d<−5}, {−5≤d<0}, {d=0}, {0<d≤5}, {5<d≤10}, {d>10}; estimate (α, δ, η) from the last 5 NFL seasons via Eqs. 43–46; calibrate K̃ by grid search on log-loss of implied ternary probabilities on training seasons.
2. Convert G-Elo skills to win probabilities via the AC model (Eqs. 49–51) for the moneyline head, and map skill difference → expected margin for the spread head (monotone link fit on training data).
3. Run G-Elo alongside current Elo and [1447]'s LS in the weekly diagnostics: log-loss, RPS, accuracy, ranking-violation rate.
4. Use the frequency-estimation formulas as a quarterly recalibration job (cheap, transparent, no optimizer).

## Reproducible test
Backtest on NFL 2019–2023: fit coefficients on rolling 5-season windows, run G-Elo online through each season, compute log-loss of moneyline-implied win probs and MAE of spread predictions vs GSE's current Elo; walk-forward, no peeking.

## Numeric gate
G-Elo must beat GSE's current Elo-Davidson-equivalent on NFL 2019–2023 backtest: log-loss improvement ΔLS ≥ 0.005 AND accuracy ≥ baseline + 1pp. If it fails, keep the frequency-based coefficient formulas as the calibration method for the existing Elo and drop the AC update.

## Improvement experiment
Two extensions the paper explicitly leaves open: (i) season-specific coefficient refit ("if prediction is the main goal, further improvements may be sought by adjusting the coefficients using data from the season being evaluated") — test rolling in-season refit of (α, δ, η) vs fixed preseason coefficients; (ii) team-specific step sizes K̃_i (fast movers vs stable teams) — test whether per-team K̃ beats global K̃ on second-half-season log-loss. Also: 9-category discretization (Δ″=14, key number 10/14 in NFL scoring) to test whether finer tail bins add signal.
