# [1825] LLM-SR: Scientific Equation Discovery via Programming with Large Language Models (arXiv:2404.18400)

**Citation:** Parshin Shojaee, Kazem Meidani, Shashank Gupta, Amir Barati Farimani, Chandan K. Reddy (2024). *LLM-SR: Scientific Equation Discovery via Programming with Large Language Models*. arXiv:2404.18400v3. URL: https://arxiv.org/abs/2404.18400
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

LLM-guided program-skeleton search with experience-buffer islands is the strongest "domain prior + search" architecture for inventing sports metrics; needs adaptation because sports has no textbook equations for the LLM to recall, so the prior must come from analyst prose/descriptions rather than physics knowledge, and LLM memorization (they demonstrate it on Feynman) must be guarded against.

## 1. Research question
Can LLMs' scientific prior knowledge and code-generation ability be combined with off-the-shelf optimizers and evolutionary search to discover scientific equations from data — representing equations as PROGRAMS (arbitrary Python functions) rather than expression trees — and does the LLM prior beat pure search, especially in out-of-domain (OOD) generalization where search methods overfit?

## 2. Dataset / schema
Four custom benchmarks designed to defeat LLM memorization (they demonstrate LLMs recite Feynman equations: <20 iterations to low error + lower Mixtral perplexity on Feynman vs their benchmarks, Figs. 9/11, App. C):
1. **Oscillation 1**: v̇ = F·sin(ωx) − αv³ − βx³ − γxv − x·cos(x)
2. **Oscillation 2**: v̇ = F·sin(ωt) − αv³ − βxv − δx·exp(γx)
3. **E. coli bacterial growth**: dB/dt = f(B,S,T,pH) = f_B(B)·f_S(S)·f_T(T)·f_pH(pH), real experimental microbiology data (multiplicative structure, 4 inputs)
4. **Stress–Strain (materials science)**: real experimental data where empirical modeling dominates.
Each has ID (in-domain) and OOD (extrapolation) test splits. Baselines: gplearn (pop 500, tournament 20, 2M generations), PySR, DSR, uDSR, LMX, FunSearch — all run 2M+ iterations to convergence. LLM-SR: 2.5K iterations with GPT-3.5 or Mixtral-8x7B backbones.

## 3. Method / model
LLM-SR = LLM proposes equation PROGRAM skeletons (Python functions with placeholder params), optimizer fits params, evolutionary loop refines:
- **Skeleton hypothesis**: π_θ (pre-trained LLM) samples programs f with named placeholder parameters; f* = argmax_f E[Score_T(f,D)].
- **Decoupled evaluation**: optimize params via numpy+BFGS (few params) or torch+Adam (many params/differentiable programming); then fitness s = Score_T(f,D) = −MSE(ŷ, y).
- **Experience buffer** (islands model, m islands, from Cranmer 2023 / FunSearch): P_t^i stores (skeleton, score) pairs; a new hypothesis enters island i only if s > s_best^i. Within-island clustering by score signature preserves diversity.
- **Two-stage prompt sampling**: (a) pick island uniformly at random; (b) cluster selection by Boltzmann P_i = exp(s_i/τ_c)/Σ exp(s_i'/τ_c) (favor high scores); (c) individual program sampling P(f_i) ∝ exp(−l̃_i/τ_p) (favor SHORTER programs, normalized length). Sampled programs become in-context demonstrations.
- Iteration: sample k examples → update prompt → LLM generates b skeletons → evaluate → add to buffer. Returns best program f* and score s*.
- Ablations: multi-island vs single island + top-k (islands win ID and OOD); skeleton+optimizer vs LLM-generates-complete-equations (decoupling wins); prior knowledge vs program representation (full combo best); numpy+BFGS vs torch+Adam per problem scale.

## 4. Equations & assumptions
f* = argmax_f E_{d∈D}[Score_T(f,D)]
s = Score_T(f,D) = −MSE(ŷ, y), ŷ = f(x, params*)
P_t^i ← P_t^i ∪ {(f,s): f∈F_t, s=−Score_T(f,D), s > s_best^i}
P_i = exp(s_i/τ_c) / Σ_i' exp(s_i'/τ_c); P(f_i) ∝ exp(−l̃_i/τ_p)
Assumptions: (1) LLM's pretraining contains useful structural priors for the domain; (2) placeholder-parameter decoupling doesn't destroy structure (optimizer can fit any skeleton); (3) program space is searchable via in-context evolution; (4) OOD splits genuinely test extrapolation; (5) baselines converged (2M+ iterations); (6) memorization can be neutralized with novel benchmarks.

## 5. Features / target
Oscillators: inputs (t, x, v), target v̇. E. coli: inputs (B, S, T, pH), target dB/dt. Stress–strain: strain → stress. GSE analog: inputs = per-play/per-game features, target = EPA/drive, win prob, next-season wins.

## 6. Validation design
4 custom benchmarks × ID/OOD splits; metric = Normalized MSE (NMSE), lower better. Baselines: gplearn, PySR, DSR, uDSR (2M+ iterations each), LMX, FunSearch. LLM-SR run with two backbones (GPT-3.5, Mixtral-8x7B), 2.5K iterations. Ablations: island count, sampling strategy, skeleton+optimizer decoupling, prior knowledge, program representation, optimizer choice (numpy+BFGS vs torch+Adam), LMX/FunSearch comparison (Table 4). Memorization control: Feynman vs custom benchmark perplexity/error-curve comparison.

## 7. Numerical results / baselines
- LLM-SR (both backbones) **consistently outperforms all SR baselines on all 4 benchmarks, ID and OOD**, despite 2.5K vs 2M+ iterations (Table 1, NMSE).
- E. coli growth OOD: LLM-SR NMSE **~0.0037** vs all other methods **>1** (i.e., baselines worse than predicting the mean OOD — dramatic generalization gap).
- Discovered equations better recover true symbolic terms than baselines (Fig. 4) AND come with LLM-generated scientific explanations of each term.
- Ablations (Fig. 17, Tables 3–4): multi-island > single-island; skeleton+optimizer decoupling essential; full prior+program combo best; numpy+BFGS best for few-param problems, torch+Adam for large-scale; traditional SR baselines (DSR, uDSR, PySR) still beat LMX/FunSearch, validating the comparison set.
- Honest negative: on Feynman-120 the method solves problems in <20 iterations — evidence of recitation, which is why they built custom benchmarks.

## 8. Code / data availability
Not stated as a repo URL in the extracted text (paper references appendices for implementation; gplearn/PySR links given for baselines). Recorded as: no public code URL confirmed in text.

## 9. Leakage & limitations
- Memorization confound is real and acknowledged — but their perplexity evidence uses only Mixtral/GPT-3.5; stronger future LLMs memorize more, so the "custom benchmark" defense decays over time.
- E. coli's multiplicative structure (dB/dt = product of single-factor functions) is exactly the structure the LLM prior "knows" from microbiology textbooks — the prior may be doing most of the work, not the search. Sports has no such textbook forms.
- LLM API cost/latency: 2.5K iterations × b skeletons of LLM calls — expensive vs free GP search; no cost accounting in the paper.
- No noise-robustness study like PySR's EmpiricalBench; OOD splits are extrapolation, not noise.
- Program representation is maximally expressive — also maximally prone to overfit without the length prior; the l̃_i brevity bias is doing heavy lifting.
- Only 4 benchmarks; stress–strain results less detailed in extraction.

## 10. GSE overlap
New capability. GSE's metric-invention lane currently has no LLM-in-the-loop component. The transferable insight: use an LLM's prior over ANALYST-STYLE reasoning ("efficiency metrics usually normalize by attempts and penalize turnovers") as the proposal distribution, with nflverse data + BFGS as the verifier. The memorization warning is directly relevant: an LLM asked to "invent a QB metric" will recite passer rating — the prompt must forbid known metrics and force novelty, exactly as their custom benchmarks do.

## 11. GSE implementation spec
- Build "GSE-SR": prompt template with (a) problem spec in analyst prose (features, target, no-known-metrics constraint listing passer rating/QBR/EPA as forbidden), (b) evaluation function code (NMSE on nflverse train + OOD future seasons), (c) one seed skeleton. LLM proposes Python skeleton programs with placeholder params; fit with scipy BFGS; score −MSE; islands-model experience buffer (m=4 islands, Boltzmann cluster sampling favoring high score + short programs).
- Backbones: any instruction-tuned LLM (cost-controlled: batch proposals, cache).
- Data: nflverse team-season 2009–2023 (ID), 2024–2025 (OOD). Targets: points/drive, next-season wins.
- Effort: ~3–5 engineer-days + LLM inference budget; all components scriptable.

## 12. Reproducible test
Dataset: nflverse team-season 2009–2023 train/ID, 2024–2025 OOD. Baseline: PySR-only search (same compute budget, NMSE). Challenger: GSE-SR with LLM prior. Metric: OOD NMSE on points/drive and next-season wins.

## 13. Acceptance / rejection gate
ADOPT if GSE-SR's best program achieves ≥20% lower OOD NMSE than the best PySR expression at comparable complexity (≤15 nodes) on the 2024–2025 window AND the program is not a recitation of a known metric (verified by symbolic inspection); REJECT if OOD NMSE is within 10% of PySR or the LLM merely rediscovers passer-rating variants.

## 14. Improvement experiment
"Adversarial prior refresh": after each island converges, prompt the LLM with the current best program and explicitly instruct it to propose a structurally DIFFERENT family (e.g. "no ratios; use only additive terms" or "must include an interaction between pressure rate and air yards"). This combats the premature-convergence failure their island-count ablation identifies, using the LLM's language ability as a diversity operator that GP mutation cannot provide — test whether forced-family-diversity improves OOD NMSE over standard Boltzmann sampling.

---
Lane: symreg_equation_discovery · Block 1822–1841
