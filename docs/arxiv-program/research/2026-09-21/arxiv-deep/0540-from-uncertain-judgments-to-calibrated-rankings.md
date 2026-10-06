# [0540] From Uncertain Judgments to Calibrated Rankings: Conformal Elo Estimation for LLM Evaluation (arXiv:2606.13221v2)

**Citation:** Kargi, B. & Salinas, D. (2026). *From Uncertain Judgments to Calibrated Rankings: Conformal Elo Estimation for LLM Evaluation*. arXiv:2606.13221v2. URL: https://arxiv.org/abs/2606.13221v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 6420 lines).
**Verdict:** ADAPT — domain is LLM leaderboards, but the two mechanisms (calibrated soft targets in Bradley–Terry via a fitted score→probability map; split-conformal intervals on Elo ratings with normalized residuals) port directly to GSE's NFL team-rating and margin models.

## 1. Research question
LLM-as-a-judge leaderboards (e.g., LMArena) collapse each judge's per-battle *score difference* into hard win/tie/loss labels for Bradley–Terry Elo fitting, producing Elo scales that are mis-scaled relative to human-derived ratings (ranks are fine, distances are wrong), and conformal intervals that are too wide to be useful. The paper asks: (1) at the *local* level, does replacing hard labels with calibrated soft preference probabilities from the judge's score differences fix the Elo scale? (2) at the *global* level, can split conformal prediction on LLM–human Elo residuals produce honest, tight model-level intervals? Answer: yes to both — Soft-Elo cuts Elo MAE 39–73% and conformal widths 39–70% at matched 90% coverage.

## 2. Dataset / schema
- **LMArena 100K** (main): multilingual subset of Chatbot Arena human battles; ~58% English, remainder in 12 languages (Chinese, Japanese, Vietnamese, German, …); human preference labels y*_{ij}(x) ∈ {0, 0.5, 1}; M = 55 models.
- **Judge annotations:** 8 judges (DeepSeek-V3.2, Qwen3.5-27B, Gemma4-E4B, Gemma4-26B-A4B, Qwen3-32B, Llama-3.3-70B, GPT-OSS-20B, GPT-OSS-120B); ~25,000 candidate battle rows annotated per judge; ~900 model appearances per model per judge. Judge gives scalar score s(x) per battle = average over 6 criteria (adherence, helpfulness, factuality, completeness, clarity, fluency, each 1–10) of the per-criterion score differences, averaged over swapped presentation order; if the score sign flips between orderings, the battle is recorded as a tie.
- **Replication corpora:** LMArena 140K (newer Arena-style model pool) and ComparIA (French-language votes — distribution-shift stress test).
- **Access:** public — LMArena 100K/140K via HuggingFace; ComparIA votes on HuggingFace; judge annotations derived by authors (Appendix L licensing); code at https://github.com/kargibora/SoftElo.

## 3. Method / model
**Hard-Elo (status-quo baseline).** BT model: θ̂ = argmax_θ Σ_{(i,j,x)∈B} [y_{ij}(x) log σ(θ_i − θ_j) + (1 − y_{ij}(x)) log(1 − σ(θ_i − θ_j))] − λ‖θ‖², with y ∈ {0, 0.5, 1} (ties split into two weight-0.5 rows), λ = 0.01. Elo_i = 1500 + (400/ln 10)·θ_i. Evaluation: leave-one-model-out — hold out model m, fit BT on LLM-scored battles vs anchors, compare to human Elo.

**Soft-Elo (paper's method).** Keeps the BT model fixed; replaces each hard target with a calibrated soft target:
- Soft target: ỹ(x) = P[B ≺ A | x] = σ(β·s(x)) ∈ (0, 1), with temperature β > 0.
- β fitted per fold by MLE on *human non-tie battles between models other than the held-out model*: β*_m = argmax_β Σ_{(i,j,x)∈B*_{−m}} [y*_{ij}(x) log σ(β·s(x)) + (1 − y*_{ij}(x)) log(1 − σ(β·s(x)))]; cross-fold mean β* reported; per-judge fold std ≤ 0.005 (remarkably stable). Human ties excluded from calibration (binary preference map).
- The same BT objective is then fit with ỹ(x) on all judge-scored battles of the held-out model, including near-ties. Elo conversion unchanged.

**Global conformal intervals.** Split conformal on LLM–human Elo residuals: ε_i = Elo_LLM,i − Elo_Human,i; normalized nonconformity S_i = |ε_i| / ŜE_i where ŜE_i is the bootstrap SE of Elo_LLM,i across 20 within-model battle subsamples (captures sampling noise, not systematic bias). Interval for new model: C = [Elo_LLM,n+1 − q̂·ŜE_{n+1}, Elo_LLM,n+1 + q̂·ŜE_{n+1}], with q̂ = the ⌈(1−α)(n+1)⌉-th smallest calibration score. Retrospective evaluation: 5 random splits of the 55 models into 27 calibration / 28 test; 90% nominal coverage.

## 4. Equations & assumptions
- BT objective (Eq. 1): θ̂ = argmax_θ Σ_{(i,j,x)∈B} [y_{ij}(x) log σ(θ_i − θ_j) + (1 − y_{ij}(x)) log(1 − σ(θ_i − θ_j))] − λ‖θ‖², y ∈ {0, 0.5, 1}, λ = 0.01.
- Elo scale: Elo_i = 1500 + (400/ln 10)·θ_i.
- Residual: ε_i = Elo_LLM,i − Elo_Human,i (Eq. 2).
- Nonconformity: S_i = |ε_i| / ŜE_i (Eq. 3).
- Conformal interval: C = [Elo_LLM,n+1 − q̂·ŜE_{n+1}, Elo_LLM,n+1 + q̂·ŜE_{n+1}] (Eq. 4); q̂ = ⌈(1−α)(n+1)⌉-th smallest of {S_i}.
- Soft target: ỹ(x) = P[B ≺ A | x] = σ(β·s(x)) ∈ (0, 1) (Eq. 5).
- Temperature MLE (Eq. 6): β*_m = argmax_β Σ_{(i,j,x)∈B*_{−m}} [y*_{ij}(x) log σ(β·s(x)) + (1 − y*_{ij}(x)) log(1 − σ(β·s(x)))].
- Eval metrics: Cohen's κ (battle agreement), Spearman ρ vs human leaderboard (rank fidelity), held-out Elo MAE (scale fidelity); accuracy-within / interval coverage at nominal 90%.
- **Stated assumptions:** (1) exchangeability of calibration and future-model nonconformity scores (authors flag this — prompt/model-family/temporal shifts violate it; Appendix J); (2) the conformal guarantee is *marginal*, not conditional per model; (3) β fit on non-tie human battles transfers to all judge-scored battles including near-ties; (4) bootstrap SE captures only resampling noise, not structural bias of the Elo ruler (deliberate — bias is left in the residuals for conformal to cover); (5) the target of inference is the fitted *human leaderboard Elo*, an observable, not latent skill.

## 5. Features / target
- **Inputs:** per-battle judge score difference s(x) (scalar, position-swap-averaged, from 6 rubric criteria) plus the battle graph (which models, which instructions); at global level, each model's fitted LLM-Elo and its bootstrap SE.
- **Targets:** local — binary human preference on non-tie battles (for β calibration); global — human Elo rating of each model (for residuals/conformal).
- **Horizon:** static per-model Elo estimate + interval.

## 6. Validation design
- **Leave-one-model-out** held-out Elo estimation over 55 models; β calibrated within-fold with no human label involving the held-out model (no leakage by construction).
- **Baselines:** Hard-Elo (hard ternary labels in same BT pipeline) — the current leaderboard standard; ablations on battle budget (sample efficiency curves), tie inclusion in β (Appendix C: fitting β with ties included, β_all/β_non-tie ≈ 0.56, raises MAE ~a reported amount), β sensitivity.
- **Metrics:** held-out Elo MAE, Spearman Δρ, ECE of the score→probability map, conformal empirical coverage and median width (5 random 27/28 splits per judge).
- **External validation:** LMArena 140K replication; ComparIA French stress test; cross-language analysis (Appendix E); per-judge temperature stability (fold std ≤ 0.005).

## 7. Numerical results / baselines
- **Hard-Elo diagnostics (Table 1):** battle agreement κ = 0.147–0.231 (low); Spearman ρ = 0.868–0.976 (rank largely recovered — even worst-κ judge Llama-3.3-70B gets ρ = 0.868); held-out Elo MAE = 27.5–63.4 Elo (worst: DeepSeek-V3.2 at 63.4; best: Qwen3-32B at 27.5). "Good rankings, bad ruler."
- **Root cause ( §4.2):** top-quartile vs top-quartile battles have median |s| ≈ 0.61 vs ≈ 1.54 for top-vs-bottom-quartile — Hard-Elo treats both as identical unit wins. Judge–human agreement rises monotonically with |s|: ~53% (near chance) at small |s| → 85% at |s| > 4 (Fig. 3).
- **Residual structure ( §4.3):** Hard-Elo signed residual ε correlates with human Elo at Pearson +0.49 to +0.90 per judge — weak models underestimated (negative residuals), strong models overestimated (positive); the ruler is stretched.
- **β calibration (Fig. 3b, Qwen3-32B):** uncalibrated σ(s) ECE = 0.14; fitted σ(β*·s) ECE = 0.03. β* ∈ [0.36, 0.60] across judges (DeepSeek-V3.2 0.36 … Qwen3.5-27B 0.60); fold std ≤ 0.005.
- **Soft-Elo Elo gains (Table 2):** MAE reduction 39–73% per judge; cross-judge mean MAE 45.9 → **17.9** Elo (best: Qwen3.5-27B 46.0 → 13.6, −70%; DeepSeek-V3.2 63.4 → 17.1, −73%; smallest gain Qwen3-32B 27.5 → 16.7, −39%). Spearman change Δρ between −0.011 and +0.014 (table: −0.011 min; text says −0.009 — quoting table values) — order preserved. Residual strength-ramp flattened (Fig. 4b). Sample efficiency: Soft-Elo beats Hard-Elo at every annotation budget, largest gap in small-data regime.
- **Conformal intervals (Table 3, 90% nominal):** Hard-Elo median widths 131.9–261.0 Elo, coverage 88.6–97.9%; Soft-Elo median widths 74.4–143.1 Elo (e.g., DeepSeek-V3.2: 261.0 → 78.0; Qwen3.5-27B: 212.2 → 74.4), coverage 92.1–96.4%. Width reduction 39–70% with coverage near nominal. (Two rows show non-monotonic: Llama-3.3-70B Soft width 132.6, Gemma4-E4B 143.1 — weakest-signal judges retain wider intervals.)
- **Replication (Appendix D, Table 4):** LMArena 140K — MAE reduction 45–79% (e.g., Gemma4-E4B 88.0 → 18.8, −79%; GPT-OSS-120B 53.7 → 24.0, −55%), rank unchanged. ComparIA (French) — MAE still reduced for all judges (20–70%), but the two Qwen judges lose rank correlation (ρ 0.845→0.660 and 0.808→0.577) with β* collapsing to 0.13–0.14: when the score-difference–agreement curve is flat, low β* is a diagnostic warning against trusting soft targets.
- Anecdote of judge fragility (intro): Gemini-2.5 win rate on Arena-Hard swings 79.0% ± 2% → 49.1% ± 2.5% by judge choice (2nd → 8th place).

## 8. Code / data availability
- Code: https://github.com/kargibora/SoftElo (stated). Data: LMArena 100K/140K on HuggingFace; ComparIA votes on HuggingFace; judge annotations generated by authors (Appendix L covers licensing).

## 9. Leakage & limitations
- **Conformal guarantee is marginal and exchangeability-dependent** — the authors are explicit (Appendix J): a new model from a shifted population (new architecture family, new prompt distribution, temporal drift) violates exchangeability, and the 90% guarantee no longer holds. For GSE: a 2026 season with rule/schedule shifts breaks the same way.
- **The β diagnostic can fail silently under shift:** on ComparIA, Qwen β* = 0.13–0.14 signaled a flat score–agreement curve and soft targets *damaged* the ranking. Without monitoring the agreement-vs-|s| curve, the "improvement" can over-compress the leaderboard.
- **Soft-Elo models only the uncertainty in the score difference** — not epistemic uncertainty, hallucinated scores, or judge instability (stated limitation).
- **Bootstrap SE deliberately excludes structural bias**, so intervals cover systematic bias via q̂ — but q̂ is a single global quantile applied to every model, so per-model interval asymmetry/heteroscedasticity is not captured.
- **External validity to NFL:** LLM-judge biases have no direct analogue; but the *methodological* transfer (soft targets in BT, conformal Elo intervals) is direct. The BT Elo scale here is affine-arbitrary (only differences meaningful) — NFL spread models have an absolute scale (points), which changes what "scale fidelity" means.
- **No live deployment test:** conformal intervals are evaluated retrospectively (LOO over the 55-model pool), not prospectively on future models.

## 10. GSE overlap
Per the existing-research map: **Elo, Bradley-Terry, Plackett-Luce, Dixon-Coles** are already inventoried (26-metric catalog; ledger 0004 = Bradley-Terry/Elo unification). **Conformal prediction** is covered at the win-probability level (2208.08598 conformal WP; CQR; mondrian/cross-conformal in the ML brief). What is **new here**: (a) fitting BT with *calibrated soft targets* from a fitted score→probability temperature instead of hard W/L labels — GSE's rating machinery uses hard game outcomes only; (b) **split-conformal intervals on the rating itself** with normalized nonconformity scores (S_i = |ε_i|/SE_i) — GSE's conformal work is on WP outputs, not on team-strength ratings; (c) the diagnostic that "good rank, bad ruler" — scale miscalibration invisible to rank metrics — and its fix via local uncertainty propagation. Verdict: **extension** — upgrades existing GSE rating/conformal machinery rather than duplicating it. The related idea of margin-aware BT fitting (using point differential as soft labels) is *not* in the corpus, so this is also a **new capability** candidate for the margin model.

## 11. GSE implementation spec
1. **Margin-calibrated soft targets for BT/Elo team ratings.** Current GSE rating machinery (per the map: Elo, BT, nfelo) fits hard win/loss. Port: fit temperature β via MLE mapping *point-margin* m to win probability σ(β·m) on training games; then fit BT with soft target ỹ = σ(β*·m) per game instead of {0,1}. This down-weights nail-biters and up-weights blowouts in the rating scale, correcting the "stretched ruler" (which in NFL terms: ratings over-react to close wins vs market-implied strength). Data: nflverse game results 1999–2025. Effort: ~2–3 days (BT refit + temperature MLE + LOO-season validation).
2. **Split-conformal intervals on team power ratings.** Wrap GSE's end-of-week team rating with a 90% interval: calibration pool = prior seasons' ratings, ε_i = rating_i(season s) − market-implied rating (de-vigged closing-spread-derived); S_i = |ε_i|/bootstrap-SE_i; interval for current week. Serves as uncertainty band on the published edge sheet and as an input to Kelly/decision sizing. Data: nflverse + closing lines (OddsPapi). Effort: ~1–2 days.
3. **Diagnostic gate:** monitor the agreement-vs-margin curve (paper's Fig. 3/7): if the calibrated margin→P(win) map flattens (β* → small), e.g., in playoff or backup-QB regimes, flag soft targets as untrustworthy — exactly the paper's β* warning diagnostic ported to regimes.

## 12. Reproducible test
- **Dataset:** nflverse 2015–2024 regular seasons; ratings fit on weeks 1–17 each season; human/market ground truth = de-vigged closing spread-implied rating differential (or, alternatively, next-season out-of-sample ATS prediction error as the "ruler" check).
- **Baseline:** Hard-Elo analogue — BT with binary win/loss targets (λ = 0.01, same Elo conversion).
- **Protocol:** leave-one-season-out: fit β* on other seasons' margins, fit soft-target BT on all other seasons, predict held-out season; measure held-out "Elo MAE" vs the market-implied rating, and Spearman ρ of team ordering.
- **Conformal add-on:** same protocol; 90% nominal intervals from prior seasons' calibration pool; report empirical coverage + median width.

## 13. Acceptance / rejection gate
- **Adopt** if soft-target BT reduces held-out-season Elo-vs-market MAE by ≥ 10% relative (averaged over the 10 leave-one-season-out folds) with Δρ ≥ −0.01, AND conformal intervals achieve empirical coverage within [85%, 95%] at 90% nominal with median width ≤ 80% of the hard-target variant's width. **Reject otherwise.** Stated before running; no test-window peeking.

## 14. Improvement experiment
Go beyond the paper's *single global* temperature: fit **regime-dependent temperatures** β*(regime) — e.g., separate β for divisional games, playoff games, and games with backup QBs — and separate conformal quantiles per regime (Mondrian-style), since the paper shows the score→agreement curve (and thus β*) collapses under distribution shift. Hypothesis: regime-conditioned soft targets keep the scale-fidelity gains in the playoffs where the global β* mis-calibrates, and regime-conditioned conformal quantiles restore conditional (not just marginal) coverage. Evaluate with the §13 gate applied per-regime vs the global baseline.
