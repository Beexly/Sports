# [2168] Knowledge Integration for Physics-informed Symbolic Regression Using Pre-trained Large Language Models (arXiv:2509.03036)

**Citation:** Bilge Taskin, Wenxiong Xie, Teddy Lazebnik (2026). *Knowledge Integration for Physics-informed Symbolic Regression Using Pre-trained Large Language Models*. arXiv:2509.03036. URL: https://arxiv.org/abs/2509.03036
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — puts a frozen LLM inside the SR *loss function* as a domain-knowledge judge (dimensional consistency, simplicity, physical realism), scoring each candidate equation; consistently improves ground-truth recovery and noise robustness across 3 SR engines × 3 LLMs. This is the missing constraint layer for GSE's PySR pipelines.

## 1. Research question
Physics-informed SR usually requires hand-crafted constraints, specialized formulations, and expert feature engineering. Can a pre-trained LLM — frozen, prompted, temperature 0 — be embedded directly in the SR search loop (not as pre/post-processing) as an automatic domain-knowledge judge, scoring each candidate equation so the optimizer balances data fit, simplicity, and physical plausibility?

## 2. Dataset / schema
In-silico physics, N=500 experiments each, 5 sampled initial-condition parameters (mass 0.1–10 kg, length 0.01–0.5 m, displacement 1–100 m, drag 0–1 kg/s, time up to √(2h/g)), 1% Gaussian noise (SNR ≈ 40 dB), SI units:
- **Dropping ball:** v = √(2gh) (Eq. 2).
- **Simple harmonic motion:** x(t) = A·cos(√(k/m)·t + φ) (Eq. 3).
- **Damped EM wave:** E(t) = E₀·e^(−αt/2)·cos(kx − ωt) (Eq. 4).
Noise robustness study: 1–5% noise added separately to features, target, or both. Data + code: https://github.com/bilgesi/SR-LLM-Integration.

## 3. Method / model
Composite loss (Eq. 1): **L = w₁·e + w₂·s + w₃·c**, wᵢ ∈ [0,1], Σwᵢ=1; e = MSE of candidate equation on data, s = expression-tree node count, c = LLM plausibility score. Prompt (verbatim in paper) asks the LLM to return ONLY a Python list [dim_corr, simp, sim, "feedback"]: dim_corr = dimensional consistency 0→1, simp = simplicity 0→1, sim = physical realism 0→1, with 3 few-shot examples (correct kinematics → [0.95, 0.80, 0.92]; E=m+c units mismatch → [0.05, 0.70, 0.15]; sin(sin(x)) needless nesting → [0.90, 0.10, 0.40]). Final: c := 1 − (c₁+c₂+c₃)/3. LLMs: Mistral 7B, Llama 2 7B, Falcon 7B (local, temperature 0). SR engines: DEAP-GP, gplearn, PySR (pop 100, 50 generations, operators +−×÷ exp log sin cos; PySR Huber loss + complexity penalty; DEAP crossover 0.6, mutation 0.05, tournament 3, max depth 8; early stopping < 0.1% improvement over 3 gens). 27 LLM×SR×scenario configs + baselines. Novel structural metric: **expression tree score = 1 − d(e₁,e₂)** with recursive tree distance handling commutativity.

## 4. Equations & assumptions
- Loss: L = w₁e + w₂s + w₃c (Eq. 1); c := 1 − (c₁+c₂+c₃)/3.
- Ground truths: v = √(2gh) (2); x(t)=A·cos(√(k/m)·t+φ) (3); E(t)=E₀e^(−αt/2)cos(kx−ωt) (4).
- Expression tree distance: recursive root-to-leaf, commutative operators take min(direct, cross); tree score = 1 − d.
- Assumptions: LLM scores are reliable/calibrated enough to guide optimization; temperature-0 outputs deterministic; prompt design generalizes across models; zero-shot (no fine-tuning).

## 5. Features / target
Inputs: 5 sampled physical parameters + time; targets: noisy v, x(t), E(t). LLM judge sees equation string + optional context (variable descriptions, experiment description, ground-truth formula — 8 prompt variants A–H).

## 6. Validation design
Three experiment types: (1) benchmarking — 27 configs vs no-LLM baselines, metrics MAE/MSE/R²/tree score; (2) prompt ablation — 8 prompt variants A (no context) … H (B+C+D kitchen sink) to isolate knowledge-type effects; (3) noise robustness — 5 noise levels × 3 noise placements (features/target/both). Note: prompt variants D/F/G/H disclose the ground-truth formula to the LLM — included deliberately to test "alignment bias."

## 7. Numerical results / baselines
- **Consistent improvement:** every LLM–SR pair beat its no-LLM baseline on all three scenarios (Table 2). Best overall: **Mistral + PySR** — e.g. EM wave: MAE 0.030, MSE 0.003, R² 0.99, tree score **1.00** vs PySR baseline MAE 0.150, R² 0.88, tree 0.79. SHM: Mistral+PySR MAE 0.060, R² 0.97, tree 1.00 vs baseline MAE 0.170.
- **Prompt matters:** richer prompts strictly better (Table 3); Prompt E (variable descriptions + experiment description, NO ground truth) achieved tree score **1.00 across all 9 LLM×SR combos** — exact ground-truth recovery without answer leakage. Prompt A (no context) still beat baseline.
- **Noise robustness:** LLM integration degrades gracefully — e.g. DEAP tree score 0.93 → 0.82 (1% → 5% noise) vs baselines collapsing to 0.40–0.60 under combined noise at 5% (Table 4). PySR strongest throughout.
- LLM ranking: Mistral > Llama 2 > Falcon; SR ranking: PySR > DEAP > gplearn.

## 8. Code / data availability
Code + data: https://github.com/bilgesi/SR-LLM-Integration. LLMs: public 7B checkpoints. No proprietary data.

## 9. Leakage & limitations
Adversarial notes: (a) Prompt variants D/F/G/H literally give the LLM the ground-truth formula — the tree-score-1.00 cells there are circular, though the headline Prompt E result (no GT) is clean. (b) LLM score quality was never human-expert-validated — gains could partly reflect the LLM penalizing tree length (a second simplicity term) rather than genuine physical reasoning. (c) Only simple closed-form ground truths; no chaotic/multi-scale systems. (d) Occasional invalid LLM outputs required prompt revisions and inflated training time — the judge adds latency per generation. (e) Weights w₁,w₂,w₃ selection is undocumented. (f) GSE adaptation risk: an LLM judging "football realism" inherits the model's priors about football, which may be stale or wrong — the judge needs domain-specific few-shot anchors, not zero-shot sports intuition.

## 10. GSE overlap
GSE's PySR pipelines (ledger 2166's planned MDL replacement, ledger 2162's SymTorch distillation, the engine's neural-component equation discovery) are all *unconstrained* beyond MSE + parsimony — they can and do return expressions that fit training data but violate domain sense (probabilities outside [0,1], negative yardage terms, dimensionally absurd composites). This paper supplies exactly the missing third loss term: an LLM judge scoring dimensional consistency, simplicity, and *football realism* for each candidate equation. No GSE pipeline currently has any semantic/domain-validity term in its SR loop.

## 11. GSE implementation spec
1. Add an LLM-judge term to GSE's PySR loss: L = w₁·MSE + w₂·complexity + w₃·c_LLM, with c_LLM = 1 − mean(scores) over three prompted criteria: (i) **bound-consistency** — win-prob equations must be structurally capable of [0,1] outputs (flag sigmoid-free linear extrapolation past 0/1); (ii) **football realism** — penalize terms like "rest_days² × humidity" composites, reward known-structure terms (home field, rest advantage, EPA margin); (iii) **simplicity**.
2. Prompt design: role + 3 few-shot sports examples mirroring the paper (e.g. correct: win_prob = sigmoid(0.5·epa_margin + 2.5); mismatch: points = epa − temperature; needless nesting: sin(sin(rest_days))). Temperature 0, strict list-only output; parse failures fall back to neutral score 0.5.
3. Judge model: a small local LLM (Mistral-class 7B) to keep per-generation cost near zero; cache scores by equation string to avoid re-scoring identical candidates.
4. Apply first to the engine's win-probability equation discovery runs (2025 season data), then to points-total equations.

## 12. Reproducible test
A/B on 2025 NFL: PySR win-prob discovery with vs without the LLM term (same seed/pop/generations). Metrics: validation MAE/Brier (must not degrade) + **domain-validity rate** = fraction of Pareto-front equations passing an independent rule checker (bounded [0,1] on 2015–2024 inputs, no negative predicted points, monotonic in EPA margin). Compare also vs ledger 2166's MDL-only ranking.

## 13. Acceptance / rejection gate
**ADOPT if:** LLM-term runs achieve ≥ 80% domain-validity on the Pareto front (vs ≤ 50% without) AND validation Brier degrades by ≤ 5% relative to the no-LLM baseline AND per-generation wall-clock overhead < 2× (caching works). **REJECT if:** domain-validity gain < 20 points, or Brier degrades > 5%, or > 10% of LLM scores are unparseable (judge unreliable — the paper's own noted failure mode). Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **two-judge adversarial scoring** — the paper uses one LLM as a single judge with no verification (its own limitation (b)). For GSE, run a second small LLM as a *critic* that sees only the first judge's [dim_corr, simp, sim, feedback] and the equation, and flags scores that look like length-penalties masquerading as physics judgment. Keep only equations where judge and critic agree within 0.2 on all three sub-scores. This converts the paper's unverified-judge weakness into a consensus filter, and the disagreement rate itself becomes a measurable confidence signal for which discovered equations GSE should actually publish.
