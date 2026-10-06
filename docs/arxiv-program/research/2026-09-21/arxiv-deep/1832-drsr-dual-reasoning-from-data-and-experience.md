# [1832] DrSR: LLM based Scientific Equation Discovery with Dual Reasoning from Data and Experience (arXiv:2506.04282)

**Citation:** Runxiang Wang, Boxiao Wang, Kai Li, Yifan Zhang, Jian Cheng (2025). *DrSR: LLM based Scientific Equation Discovery with Dual Reasoning from Data and Experience*. arXiv:2506.04282v1. URL: https://arxiv.org/abs/2506.04282
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

The dual-reasoning upgrade to LLM-SR (data-aware insight module + inductive idea-extraction library) fixes the two concrete failure modes of LLM-guided SR: prior-only proposals that ignore the data, and repeated invalid expressions; the residual-driven insight update is directly portable to GSE's metric-invention loop; needs adaptation to sports (no textbook priors) and cost control (three LLM calls per iteration).

## 1. Research question
LLM-SR over-relies on LLM internal priors and never really looks at the data, and it has no reflective mechanism — so it repeats invalid expressions (syntax errors, numerical overflow, variable mismatches). Can two reasoning modules — (a) data-aware insight (LLM analyzes raw data structure: monotonicity, nonlinearity, correlations, residuals) and (b) inductive idea extraction (LLM reflects on success/failure to distill reusable strategies into an idea library) — substantially improve valid-equation rate, accuracy, generalization, and convergence speed?

## 2. Dataset / schema
Six interdisciplinary benchmarks: Oscillation 1, Oscillation 2 (same nonlinear oscillators as LLM-SR 1825), E. coli growth, Stress–Strain (materials), LSR-Transform-2Avg, LSR-Synth-CRK0 (chemistry). Backbones: Mixtral-8x7B-Instruct-v0.1, LLaMA3.1-8B-Instruct. Baselines: gplearn ("GPlern"), PySR, DSR, uDSR, LLM-SR (Mixtral + Llama3.1), LaSR (Mixtral + Llama3.1). Metrics: ACC_τ = fraction of test points with relative error ≤ τ (τ=0.001 or 0.1 per benchmark), and NMSE = Σ(f−y)²/Σ(y−ȳ)².

## 3. Method / model
Three role-specific LLM modules sharing one backbone:
- **π_data (data-aware insight)**: uniform-sample 100 (x,y) pairs → initial insight D_0 (monotonicity, nonlinearity, correlations). On each new best f*, compute residuals res_{t,i} = y_i − f*(x_i), build augmented D_t = {(x_i, y_i, res_{t,i})}, resample 100, generate refined insight D_new (local monotonicity changes, nonlinear interactions like products/ratios, finer correlations). Insights evolve coarse→fine as search proceeds.
- **π_main (equation generation)**: LLM-SR-style skeleton generation, but conditioned on the data insight D and the idea library I: p_LLM(f | D, I) — a "cognitively enriched prior" replacing LLM-SR's static p_LLM(f). Bayesian reinterpretation: objective adds adaptive cognitive variables D (data insight) and I (idea library).
- **π_idea (inductive idea extraction)**: categorize each evaluated candidate as Positive (beats reference) / Negative / Invalid (syntax error, numerical fault, variable mismatch); prompt LLM to reflect and distill structured "ideas" (generation strategies); store in dynamic Idea Library L, reused in future prompts.
Closed loop: generate → evaluate → update insights + ideas → generate better.

## 4. Equations & assumptions
res_{t,i} = y_i − f*(x_i); D_t = {(x_i, y_i, res_{t,i})}
ACC_τ = (1/N_test) Σ 1(|f(x_i)−y_i|/|y_i| ≤ τ); NMSE = Σ(f−y)²/Σ(y−ȳ)²
Bayesian view: p_LLM(f|D,I) replaces p_LLM(f); p_LLM(D,I) models knowledge evolution.
Assumptions: (1) LLM can extract genuine structural insight from 100 raw samples (not hallucinate); (2) residual patterns reveal unmodeled interactions; (3) categorized reflection transfers across iterations; (4) three LLM calls/iteration affordable; (5) ACC_τ/NMSE capture discovery quality.

## 5. Features / target
Same six benchmarks as features/targets above. GSE analog: nflverse features → metric targets, with π_data reading residual structure.

## 6. Validation design
Six benchmarks × (ACC_τ, NMSE); baselines gplearn/PySR/DSR/uDSR/LLM-SR/LaSR with two backbones where applicable; ablation on Oscillation 2 (Mixtral): remove data-aware insight vs remove idea extraction (Sec. 5.5).

## 7. Numerical results / baselines
DrSR dominates Table 1 across all six benchmarks and both metrics (selected, Acc↑ / NMSE↓):
- Oscillation 1: DrSR-Mixtral **83.92% / 3.14e-7** vs LLM-SR-Mixtral 5.9% / 1e-4, PySR 3.80% / 3e-4, uDSR 1.78% / 2e-4, DSR 0.42%.
- Oscillation 2: DrSR-Mixtral **99.94% / 1.80e-12** vs LLM-SR 7.62% / 4.59e-5, PySR 7.02% / 2e-4.
- E. coli: DrSR-Mixtral 5.12% / 0.0195 vs LLM-SR 2.08% / 0.2282 (all methods struggle; DrSR best).
- Stress–Strain: DrSR-Mixtral 88.28% / 0.0156 vs LLM-SR 68.10% / 0.0530, PySR 70.60% / 0.0347.
- LSR-Transform-2Avg: DrSR-Mixtral 92.51% / 0.0055; LSR-Synth-CRK0: 95.20% / 8.87e-8.
- DrSR-Llama3.1 also strong (Oscillation 1: 77.98% / 5.40e-7) — backbone-robust.
- Ablation (Sec. 5.5): both components contribute on Oscillation 2.

## 8. Code / data availability
None stated in extracted text. Recorded as: no public repo URL confirmed in text.

## 9. Leakage & limitations
- Same four benchmarks as LLM-SR (1825) plus two chemistry sets — benchmark overlap with the method's design lineage; no truly novel held-out domain.
- Three LLM calls per iteration (π_data, π_main, π_idea) — expensive; no cost/latency accounting.
- 100-sample insight window may miss rare-but-important structure (e.g. red-zone plays are ~15% of data).
- LLM "insights" are unverified prose — could be plausible-sounding noise that biases generation; no faithfulness check.
- Idea library could accumulate spurious strategies; no forgetting/pruning mechanism described.
- E. coli remains hard for everyone (5.12% best) — real noisy biological data still defeats these methods, a caution for sports.

## 10. GSE overlap
Direct upgrade path for the GSE-SR design in 1825: add π_data (residual-driven insight) and π_idea (idea library) around the existing propose→BFGS→score loop. The residual-augmentation trick (D_t with residuals) is the most portable idea: it focuses the LLM on exactly what the current best metric fails to explain. New capability; no existing GSE reflection loop.

## 11. GSE implementation spec
- Extend GSE-SR (1825): after each island's best program, compute residuals on train, sample 100 (features, target, residual) triples, prompt π_data for structural insight ("which features correlate with large residuals? any monotonicity flips?"); maintain an idea library (JSONL) of distilled strategies from positive/negative/invalid programs; condition π_main prompts on both.
- Guardrail: cap LLM calls (e.g. insight update only on new best, idea extraction batched every 10 iterations).
- Data: nflverse team-season; target points/drive. Effort: +2 days on top of 1825's build.

## 12. Reproducible test
Dataset: nflverse team-season 2009–2023 train, 2024–2025 OOD. Baselines: (a) plain GSE-SR (1825, no dual reasoning), (b) GSE-SR + π_data only, (c) full DrSR-style. Metric: OOD NMSE + valid-program rate.

## 13. Acceptance / rejection gate
ADOPT dual reasoning if full DrSR-style beats plain GSE-SR by ≥15% OOD NMSE on 2024–2025 AND valid-program rate ≥90% (vs whatever plain achieves); REJECT if the insight/idea modules add cost without ≥15% gain, or if π_data insights are judged vacuous on blind review (sample 20 insights, analyst rates actionable vs generic).

## 14. Improvement experiment
"Analyst-in-the-loop insight audit": present π_data's structured insights to a human analyst (Garrett) weekly as a standalone artifact — "what the machine thinks it's learning about football." This turns the module into a discovery communication channel: even when the equations disappoint, the insights (e.g. "pressure rate residuals spike in dome games") may surface real football hypotheses. Measure: count of insights per month that survive into published GSE content.

---
Lane: symreg_equation_discovery · Block 1822–1841
