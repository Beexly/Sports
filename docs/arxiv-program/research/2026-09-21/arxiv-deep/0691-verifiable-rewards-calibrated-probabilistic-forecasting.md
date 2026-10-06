# [0691] Verifiable Rewards for Calibrated Probabilistic Forecasting (arXiv:2607.00164v1)

**Citation:** Sadanand Singh, Allam Reddy, Manan Chopra (2026). *Verifiable Rewards for Calibrated Probabilistic Forecasting*. arXiv:2607.00164v1. URL: https://arxiv.org/abs/2607.00164v1
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2607.00164.txt`, ar5iv-converted HTML text; complete paper §§1–7 plus appendices A–D read in full).
**Verdict:** ADAPT — the empirical-rate-as-teacher calibration trick and the "converging estimators = information ceiling" diagnostic transfer directly to GSE's probability calibration; the RLVR/LLM machinery itself does not (GSE is not training LLM forecasters).

## 1. Research question
Can reinforcement learning with verifiable rewards (RLVR) train a calibrated probabilistic forecaster under aleatoric uncertainty — where the output is a probability and the label is a single stochastic outcome — and what makes it fail? Testbed: NFL in-game win probability, with the betting market as the reference ceiling.

## 2. Dataset / schema
- NFL regular-season play-by-play, 2015–2024 seasons, public nflfastR data. Each play = one example: state (score margin, quarter + time remaining, down & distance, field position, team in possession, public pregame point spread) → outcome (did possession team win?).
- Splits disjoint by season: train 2015–2022 = 40,246 states; selection 2023 = 5,241; test 2024 = 5,185. No game in two splits. Prompt contains the pregame spread only; live market win probability withheld from model AND reward, used only at evaluation. Audit (§App D): market probability verified absent from all 40,246 training prompts.
- Empirical-rate teacher p̂(x): training plays binned by score margin (14 bins, edges ±1, ±4, ±7, ±10, ±14, ±21), time remaining (7 bins, edges 2, 5, 10, 15, 30, 45 min), pregame spread (9 bins, edges ±0.5, ±3, ±7, ±10); bin value = fraction of training plays possession team won; sparse bins shrunk toward coarser parents hierarchically: (w + M·p̂_parent)/(n + M) with pseudocount M=25, applied from global rate downward. Test plays read the target from the training-season table only — no test outcome enters its own target. Coarse teacher on 2024: Brier 0.143 vs market 0.136. Adding field position + down did not improve it (2023: 0.1534/0.0099 vs coarse 0.1532/0.0117).

## 3. Method / model
Base: Qwen2.5-7B-Instruct, no supervised fine-tuning. Group-relative policy optimization (TRL + vLLM rollouts, single NVIDIA L40S 48GB), LoRA rank 16 / α=32 / dropout 0.05, bfloat16. 250 steps, 20-step warmup, 8 completions/state at temperature 0.9, token-level loss, single on-policy update per step, 16 micro-batch gradient accumulation, reward scaling ON, TRL vLLM importance-sampling correction disabled. Checkpoint selected by Brier on full 2023 split, reported on 2024.
Two variants: (a) direct model — emits probability in ≤48 tokens, lr 2×10⁻⁵, KL coefficient 0.01; (b) masked-CoT — up to 640 tokens of reasoning, gradient masked to the final "Probability: NN%" answer span only, lr 3×10⁻⁵, KL coefficient 0 (KL on concentrated answer-span tokens overflows). Reward: r = 1 − (p − p̂(x))².

## 4. Equations & assumptions
- Brier: (p − y)², strictly proper; minimized in expectation uniquely by the true conditional rate η(x) = Pr(win|x).
- Reward (Eq. 1): r = 1 − (p − p̂(x))² (rate target). Naive alternative: r = 1 − (p − y)² (realized outcome).
- Empirical-Bayes bucket: p̂ = (w + M·p̂_parent)/(n + M), M = 25.
- Murphy decomposition of Brier into reliability (calibration), resolution (sharpness), uncertainty (base rate).
- Metrics: ECE and MCE over 10 equal-width bins; paired bootstrap over plays (10⁴ resamples).
- Assumptions: season-disjoint splits remove leakage; market = near-ceiling reference (market sees live in-game info the public state lacks); pregame spread is public and pre-kickoff-fixed.

## 5. Features / target
- Inputs: score margin, quarter/time remaining, down & distance, field position, team in possession, public pregame spread.
- Target for reward: state-conditioned empirical win rate p̂(x) (not the realized outcome). Model output: single probability. Evaluation against realized 2024 outcomes and market probabilities.

## 6. Validation design
Season-disjoint train/select/test; checkpoint selection on 2023, all reported numbers on 2024 (n=5,185 plays). Baselines: untrained Qwen2.5-7B (direct and CoT prompts), zero-shot DeepSeek-V4 via API, the empirical-rate teacher p̂, nflverse win-probability model, GBM on full feature set, betting market (Štrumbelj 2014 odds→probability conversion). Paired bootstrap CIs over plays; fixed n=128 in-training held-out sample for ablations; blinded-judge protocol for reasoning consistency (250 plays, quotes, audit of every flag).

## 7. Numerical results / baselines
- Held-out 2024 (n=5,185): Direct RLVR Brier **0.1443** [0.1394, 0.1491], ECE **0.0292**, MCE 0.0596, acc 0.784, resolution 0.1058. Masked-CoT: 0.1522 [0.1466, 0.1577], ECE 0.0293, MCE 0.0684, acc 0.777. DeepSeek-V4 zero-shot: 0.1438 [0.1392, 0.1483], ECE 0.0430, acc 0.790. Teacher p̂: 0.1432 [0.1384, 0.1480], ECE 0.0437. Market: **0.1355** [0.1307, 0.1403], ECE 0.0273, MCE 0.0824, acc 0.799, resolution 0.1148. Base Qwen direct: 0.2057/0.0569; base CoT: 0.1681/0.0687. nflverse WP: 0.1562/0.0188; GBM all features: 0.1584/0.0260.
- Paired differences: Direct−Masked = −0.0079* [−0.0101, −0.0057]; Direct−Market = +0.0088* [0.0068, 0.0107]; Direct−DeepSeek-V4 = +0.0005 [−0.0019, 0.0028] (not significant). All three static estimators (direct, DeepSeek-V4, teacher) converge ≈0.143–0.144 and trail the market by the same 0.008 — the gap is resolution/information, not calibration.
- Reward-target ablation (Table 1, in-training n=128): realized outcome → Brier 0.166, ECE 0.10; ½y+½p̂ blend → 0.181/0.121 (worse on both); empirical rate → **0.154/0.050**.
- Full-completion CoT training (same reward): Brier 0.25→0.34, ECE 0.19→0.30 — decalibration driven by gradient on reasoning tokens, not the reward.
- Blinded judge: inconsistent completions fall 22.4% (base) → 4.4% (masked); full-completion RL leaves base rate unchanged; masked prompt alone (no training) = 6.8%.
- Direct model is better calibrated than its own teacher: ECE 0.029 vs 0.044 (policy smooths the bucketed target).
- Code: https://github.com/jasper-research/nfl-rlvr-release; data + adapters: https://doi.org/10.5281/zenodo.21082572.

## 8. Code / data availability
Code, prepared data, per-play predictions, trained adapters publicly available (links above). All reported numbers recomputed from released per-play predictions by a deterministic script — reproducible without a GPU.

## 9. Leakage & limitations
- Method works "only where the public state already carries most of the predictive signal, and where outcomes are dense and resolved quickly enough to estimate a reliable empirical rate; sparse or long-horizon events would weaken both the reward and the comparison against a market" (authors' own §7 caveat).
- Teacher ceiling: a model trained on p̂ can never be better calibrated than p̂'s information content (they get smoothness gains only).
- Blinded judge is an LLM with audited flags; some subjectivity remains in "probability follows from reasoning."
- Base model is non-thinking Qwen2.5-7B; results may not generalize to reasoning-first models.
- External validity to GSE: GSE trains tabular/statistical models, not LLM forecasters with RLVR — the RL machinery is not directly reusable. The transferable parts are the calibration teacher and the diagnostic.

## 10. GSE overlap
Existing-research map: calibration work exists in the corpus (CQR for prediction intervals per MEMORY — the 2026-09-21 conformal audit caught the cqr.ts coverage bug), but nothing on empirical-rate teachers for probability calibration or the convergence-as-ceiling diagnostic. New extension, not duplicate. GSE already tracks Brier/log-loss and compares against market odds (The Odds API account), which is exactly the infrastructure this paper's diagnostic needs.

## 11. GSE implementation spec
1. Build an empirical-rate teacher table on GSE's historical pick outcomes: bucket by (model probability decile, days-to-kickoff bin, spread bin, sport/league), hierarchical empirical-Bayes backoff (M=25 pseudocounts) toward parent/coarser buckets — mirrors Appendix A exactly, no LLM needed.
2. Replace/augment GSE's probability calibration (Platt/isotonic on raw model outputs) with calibration against the empirical-rate teacher: fit the calibrator mapping to minimize squared error vs p̂(x) rather than vs binary outcomes — this removes the Bernoulli noise that makes per-pick Brier-gradient calibration unstable, exactly the paper's finding (0.050 vs 0.10 ECE in ablation).
3. Ceiling diagnostic: run GSE engine, a simple tabular baseline, and the empirical-rate teacher on the same backtest window; if all three converge on the same Brier while trailing the closing line by a fixed gap, the residual is live-market information (injuries, steam) — stop spending model capacity there and instead buy/ingest the information (injury feeds, line-movement features).
4. Reasoning-consistency analog: when GSE drafts analyst-style write-ups, evaluate write-ups with a blinded judge for "does the stated pick follow from the analysis" — the 22.4%→4.4% result suggests masked training objectives, but for GSE this is a QC metric, not a training change.
Effort: ~2–4 days (teacher table + calibrator refit + convergence diagnostic script; no GPU).

## 12. Reproducible test
Dataset: GSE `picks` table (Neon Postgres, 3,411 engine picks, model v5.2.7) — needs pick probabilities, outcomes, timestamps, spreads. Build the empirical-rate teacher on picks through 2026-08-01; test on picks after 2026-08-01. Fit (a) isotonic calibration on raw probabilities vs outcomes, (b) isotonic vs teacher rates. Metric: ECE (10 bins) and Brier on the test window. Baseline to beat: (a).

## 13. Acceptance / rejection gate
ADAPT if calibrator (b) reduces test-window ECE by ≥20% relative vs (a) with Brier no worse than (a) within 0.002; reject if ECE improvement is <20% relative or Brier degrades by >0.002 (smoothing the teacher must not cost sharpness).

## 14. Improvement experiment
The paper's teacher is a fixed coarse table. Replace it with a learned rate model: gradient-boosted regression of outcomes on (model probability, spread, days-to-kickoff, market move since open) trained with the same hierarchical shrinkage, then distill GSE's published probabilities toward it. Test whether the learned teacher raises the ceiling — i.e., whether the engine + learned-teacher Brier closes any of the 0.008-style gap to the closing line — and attribute any closure to the new features (especially line movement, the "live information" the paper identifies as the market's edge).
