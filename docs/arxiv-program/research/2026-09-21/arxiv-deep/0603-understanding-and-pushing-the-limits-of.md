# [0603] Understanding and Pushing the Limits of the Elo Rating Algorithm (arXiv:1910.06081v1)

**Citation:** Szczecinski, L., Djebbi, A. (2019). *Understanding and Pushing the Limits of the Elo Rating Algorithm*. arXiv:1910.06081v1. URL: https://arxiv.org/abs/1910.06081v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5390 lines).
**Verdict:** ADAPT — adopt the paper's principled SG-ML formulation of Elo (scale-invariant K̃, home-field η, correct expected-score/prediction semantics) as GSE's canonical online team-strength rater; set κ=0 since NFL is effectively binary (ties ~0.5%). Do NOT port the draw machinery itself.

## 1. Research question
What probabilistic model is the Elo algorithm actually implementing — especially for draws — and can it be generalized without losing its simplicity? The paper shows Elo is stochastic gradient (SG) applied to maximum-likelihood (ML) estimation under a logistic model; reverse-engineers the implicit draw model (Elo never defined a draw probability); and proposes κ-Elo, a one-parameter (Davidson 1970) generalization where κ tunes the modeled draw frequency, with κ=0 = binary Elo and κ=2 = classical Elo's implicit model.

## 2. Dataset / schema
- English Premier League results + Bet365 odds from football-data.co.uk; M=20 teams, N=380 games per season (home+away round robin), ten seasons 2009–10 through 2018–19.
- Average draw frequency over the ten seasons ≈ 0.25 (EPL-specific; NFL has no draws — games ending tied are ~0.5% of games, treated as binary).
- No train/test split: ratings estimated online in chronological order, evaluated prequentially on the second half of each season (first half = SG burn-in).
- Baseline for comparison: Bet365 implied probabilities (inverse decimal odds, normalized to remove vigorish; Király & Qian 2017 method).

## 3. Method / model
- **Binary model:** Pr{i⋗j|θᵢ,θⱼ} = Φ(θᵢ−θⱼ), Φ logistic CDF Φ(v) = 1/(1+10^{−v/σ}) (eq. 5); FIFA uses σ=600, FIDE σ=400; ratings identified only up to additive origin and σ-scale.
- **Elo = SG-ML:** negative log-likelihood J_n(θ) (eqs. 10–14, convex) minimized by stochastic gradient, one step per game: θ̂_{n+1,i} = θ̂_{n,i} + K[s_i − Φ(Δ_i)] (eqs. 22–25), s_i ∈ {1, 1/2, 0}, K absorbing 1/σ′. Absorbing μ → K gives the classical Elo update.
- **Implicit draw model (Proposition 1):** the s_i = 1/2 convention is exactly SG-ML under Φ_H(v) = Φ²(v), Φ_A(v) = Φ²(−v), Φ_D(v) = 2Φ(v)Φ(−v) (eqs. 28–29; proof via squaring Φ(v)+Φ(−v)=1, eq. 30). Prediction semantics: Pr(win) = Φ²(Δ), Pr(draw) = 2Φ(Δ)Φ(−Δ) (eqs. 40–42). Crucially, the "expected score" E[s_i] = Φ(Δ_i) (eq. 45) is NOT the win probability — using Φ(Δ) as win probability under draws is the paper's central identified confusion.
- **κ-Elo (Davidson 1970):** Φ_κ(v) = 10^{0.5v/σ}/(10^{0.5v/σ}+10^{−0.5v/σ}+κ) (eqs. 47–49), Φ_D(v) = κ√(Φ_H(v)Φ_A(v)); update θ̂_{n+1,i} = θ̂_{n,i} + K[s_i − F_κ(Δ_i)] (eq. 60) with F_κ(v) = (10^{v/2}+κ/2)/(10^{v/2}+10^{−v/2}+κ) (eq. 57). κ=0 recovers binary Elo; κ=2 ≈ classical Elo's implicit model up to scale (eq. 50).
- **Frequency calibration:** p̄_D ≈ κ/(2+κ) (eq. 63); invert to κ̄ ≈ 2p̄_D/(1−p̄_D) (eq. 64). EPL p̄_D ≈ 0.25 → κ̄ ≈ 0.7. Classical κ=2 implicitly assumes p̄_D ≈ 0.5 — false in every competition where Elo is used.
- **Sanity constraint:** requiring Φ_D(0) > Φ_W(0) for equal ratings forces κ ≥ 1 (eqs. 65–66), i.e. the model can only fit p̄_D ≥ 0.33 — a stated limitation; with p̄_D < 1/3 there is unavoidable model mismatch (κ=1 is the recommended compromise).
- **Home-field advantage:** modeled as level shift Φ^{hfa}_·(v) = Φ_·(v+ησ), η ≥ 0 (eq. 67); experiments use η=0.3. **Scale invariance:** K = K̃σ normalization makes predictions σ-independent (experiments: σ=600, K̃=0.125).

## 4. Equations & assumptions
Eqs. 1–70 as in §3; convexity of −log Φ (Tsukida & Gupta 2011); footnote that ML minimum is global but origin-ambiguous. Numerical: σ=600, K̃=0.125, η=0.3, θ_{0,m}=0; Fig. 1 shows learning-phase convergence for 2015 EPL teams. Assumes outcomes conditionally independent given θ; ratings evolve (hence SG tracking, not batch ML); burn-in = first half-season (admittedly arbitrary).

## 5. Features / target
Inputs: game outcomes (H/A/D indicators h_n, a_n, d_n, eq. 1) + scheduling vectors x_n (eq. 9). Features: rating difference Δ_i, HFA shift ησ. Target: rating levels θ (estimation) and outcome probabilities (p̂_{l,H}, p̂_{l,A}, p̂_{l,D}, eq. 68); evaluation target: negative logarithmic score LS̄ over second-half games (eqs. 69–70) + 95% pseudo-credibility intervals (min-length interval containing 95% of per-game scores).

## 6. Validation design
Prequential evaluation per EPL season: run κ-Elo chronologically, score predictions on games N/2+1..N with log-loss; compare across κ ∈ {κ̄, 0.7, 1, 2}, conventional Elo with mismatched prediction (estimate κ=2, predict with κ̌=1, per Lasek et al. 2013), and Bet365 implied probabilities as the market baseline. Second-half evaluation avoids the initialization transient.

## 7. Numerical results / baselines
- **Conservative κ=1 wins:** κ-Elo with κ=1 is within noise of the frequency-matched κ=0.7 across seasons and has slightly tighter pseudo-credibility intervals (better "stability"); it is the paper's recommendation at zero implementation cost.
- **Explicit κ=2 prediction is poor:** using κ=2 for prediction (the honest classical-Elo model) is much worse than the mismatched "Elo + κ̌=1" trick; the mismatched variant is nearly as good as κ-Elo with κ=1 — explaining why legacy Elo works in practice despite the wrong implicit model.
- **Only low-draw seasons benefit from matched κ:** 2013–14 (p̄_D=0.17, κ̄≈0.42) and 2018–19 (κ̄≈0.42): κ̄-Elo beats κ=1 by a visible margin (2013–14: κ=0.7 → LS̄=0.93 (0.17,1.86); κ=1 → 0.96 (0.21,1.82); Elo+κ̌ → 0.95; Bet365 → 0.91 (0.14,1.98)).
- **Table I (10 seasons, η=0.3):** κ-Elo κ=0.7 vs κ=1 vs Elo+κ̌ are near-identical (e.g., 2017–18: 0.99 (0.18,1.78) / 0.99 (0.23,1.78) / 0.99 (0.19,1.86); Bet365 0.97 (0.14,1.91)). "No dramatic change in performance should be expected" — the gain is principled correctness, not predictive leaps.
- NFL translation note: p̄_tie ≈ 0.005 → eq. 64 gives κ̄ ≈ 0.01 ≈ 0 — the entire draw apparatus collapses to binary Elo. The portable results are the SG-ML framing, the E[s_i]=Φ(Δ) vs Pr(win) distinction, and the K̃σ/η parameterization.

## 8. Code / data availability
Not stated (no repo). Data: football-data.co.uk (public). Algorithm is ~5 lines (eq. 60) — trivially reimplementable.

## 9. Leakage & limitations
- **No draws in NFL:** the paper's headline contribution (κ-Elo) is moot for GSE game outcomes; the value is entirely the clean binary-Elo formulation (κ=0) and its calibration theory.
- **Initialization/burn-in:** half-season burn-in is arbitrary; K̃ trades learning speed vs. rating variance (Fig. 1) — SG tracking theory not solved here.
- **Modest predictive gains:** even at its best, κ-Elo only approaches Bet365 log-loss, never beats it; team strength models alone are weak predictors — consistent with GSE's multi-signal engine philosophy.
- **The κ ≥ 1 constraint** means for p̄_D < 1/3 the model is knowingly misspecified; irrelevant for NFL but a caveat for any ternary-outcome port (e.g., soccer content, if ever).
- **No margin-of-victory handling** (unlike Massey/Colley variants or 538's MOV multiplier); no time decay of K.
- Static HFA η per season; no team-specific home effects.

## 10. GSE overlap
**Extension, not duplicate.** The existing-research map shows GSE has objective ratings v2, market-implied team tiers, and spread/ML/ATS engines, but no documented canonical Elo formulation with calibrated prediction semantics — and the map's team-ratings lane would benefit from exactly this: a principled online rater whose outputs are proper probabilities. The paper gives GSE (a) the mathematically correct way to derive win probabilities from Elo ratings in the binary case, (b) scale-invariant step parameterization (K = K̃σ) so rating scales are arbitrary-free, and (c) an HFA-in-levels treatment (ησ shift) cleaner than additive spread adjustments. Lane: team ratings + as a baseline prior for the spread/ML engine.

## 11. GSE implementation spec
- **Canonical GSE Elo:** initialize all 32 NFL teams θ=0; after each game update θ̂_i += K[s_i − Φ(θ̂_i − θ̂_j + ησ·home_i)], with Φ logistic σ=600, K = K̃σ (K̃ ≈ 0.06–0.125, tuned on 2020–2025), ησ home shift (η ≈ 0.1–0.3, tuned), s_i ∈ {1, 0.5, 0} with ties as 0.5 (κ=0 binary model; ties negligible). Output: proper pre-game win probabilities Φ(Δ) — not "expected score" (the paper's eq. 45 warning).
- **Use:** (1) online team-strength prior feeding the spread/ML engine; (2) an Elo-vs-market diagnostic (compare implied Φ(Δ) to market odds — deviations flag games where GSE's signal stack disagrees with market-implied strength); (3) content: weekly "GSE power ratings" derived from a defensible, published method.
- **Extension:** postseason K̃ bump for rating responsiveness; MOV multiplier (à la 538) as a second variant — compare log-loss. Effort: ~1 day.

## 12. Reproducible test
Dataset: 2020–2025 NFL regular seasons (nflverse). Protocol: chronological κ=0 Elo (K̃=0.125, η=0.3 initial) predicting pre-game ML probabilities; metric: prequential log-loss vs. (a) naive Elo with ad hoc K and no HFA, (b) market-implied probabilities (Pinnacle/no-vig). Success: canonical formulation matches or beats naive Elo log-loss AND its probability calibration curve (binned Φ(Δ) vs. observed win rate) is flat within 95% CIs — the paper's core claim is calibration correctness, so calibration is the primary gate. Tune K̃, η on 2020–2022, report on 2023–2025.

## 13. Acceptance / rejection gate
ADAPT if, on the 2023–2025 holdout, the canonical Elo's log-loss ≤ naive Elo's AND the calibration curve shows no bin with |observed − predicted| > 5% at n≥50 games per bin — adopt as GSE's standard online rater. If it loses to naive Elo or miscalibrates, REJECT as redundant (keep only the eq. 45 prediction-semantics correction as a documentation note). The draw/κ machinery is permanently out of scope for NFL unless GSE ever rates soccer.

## 14. Improvement experiment
Couple the canonical Elo with a time-varying K̃_t that scales with information content: K̃_t = K̃_0 × (1 + α·|surprise_{t−1}|), where surprise = |s − Φ(Δ)| from the team's previous game — a heavy-tail-aware SG step that adapts faster after upsets (playoff elimination games, QB injuries) and coasts during chalk stretches. Compare prequential log-loss vs. constant-K̃ on 2023–2025, with a stability guardrail (cap K̃_t ≤ 3K̃_0). Hypothesis: adaptive stepping captures regime changes (e.g., starter injury) weeks earlier than constant-K̃ Elo without the variance blowup of a globally large K — and the update stays a 6-line change to eq. 25.
