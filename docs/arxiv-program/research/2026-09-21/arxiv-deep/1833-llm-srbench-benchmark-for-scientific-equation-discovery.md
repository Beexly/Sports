# [1833] LLM-SRBench: A New Benchmark for Scientific Equation Discovery with Large Language Models (arXiv:2504.10415)

**Citation:** Parshin Shojaee, Ngoc-Hieu Nguyen, Kazem Meidani, Amir Barati Farimani, Khoa D. Doan, Chandan K. Reddy (2025). *LLM-SRBench: A New Benchmark for Scientific Equation Discovery with Large Language Models*. arXiv:2504.10415v2. URL: https://arxiv.org/abs/2504.10415
**Note:** full text read was v1 (2025-04-14); v2 posted 2026-09-22 with the same abstract headline claims (239 problems, 31.5% symbolic accuracy) per the arXiv API.
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

The only memorization-proof SR benchmark (239 problems across chemistry/biology/physics/materials; LSR-Transform defeats recitation, LSR-Synth demands data-driven reasoning), with a damning headline (best system 31.5% symbolic accuracy) and an OOD test protocol GSE should copy for metric validation; needs adaptation since it's a benchmark, not a method — GSE's use is evaluative, plus a sports analog (LSR-Transform-style obfuscation) must be built.

## 1. Research question
Existing SR benchmarks (Feynman, etc.) use famous equations that LLMs have memorized, inflating scores. Can we build a 239-problem benchmark across four scientific domains that (a) transforms known physical models into unfamiliar mathematical representations (LSR-Transform) and (b) introduces synthetic discovery-driven problems with novel terms (LSR-Synth), and do current LLM-based methods actually discover — or merely recite?

## 2. Dataset / schema
239 problems: **LSR-Transform** (111 problems: known models rewritten in less common mathematical forms) + **LSR-Synth** (128 synthetic problems with novel terms, validated for physical feasibility via numerical solvers). Domains: chemistry 36, biology 24, physics 43, material science 25. Each task = scientific context + numerical data. LSR-Synth includes held-out OOD test sets. Metrics: data fidelity (Acc_τ, NMSE), symbolic accuracy, computational efficiency. Code: https://github.com/deep-symbolic-mathematics/llm-srbench

## 3. Method / model
Benchmark construction, not a method. Key design decisions: (1) memorization diagnosis — error-curve analysis of plain LLM sampling on 100 Feynman problems vs bench problems: sharp drops + low symbolic error on Feynman = recitation; gradual curves on LSR-Transform/Synth = genuine search (Fig. 1); (2) complexity controlled by expression-tree node count, showing LSR-Transform harder than Feynman even at matched node counts; (3) OOD test generation for synthetic problems. Methods evaluated: DataBlind (direct prompting, no data), LLM-SR, LaSR, with GPT-4o-mini / GPT-3.5-turbo / Llama-3.1-8B backbones.

## 4. Equations & assumptions
Metrics: symbolic accuracy (exact-structure match rate), Acc_τ, NMSE, OOD NMSE.
Assumptions: (1) transformed representations genuinely block memorization; (2) synthetic problems are physically feasible (solver-validated); (3) node count is an adequate complexity control; (4) symbolic accuracy is the right "discovery" criterion (vs numeric fit).

## 5. Features / target
Benchmark tasks across four domains. GSE analog: sports-metric discovery tasks.

## 6. Validation design
Evaluate each method × backbone on both categories; compare ID vs OOD NMSE; compare LSR-Transform vs Feynman at matched complexity; ablate DataBlind to isolate the value of data.

## 7. Numerical results / baselines
- **Best system: ~31.5% symbolic accuracy** (LLM-SR + GPT-4o-mini on LSR-Transform).
- LSR-Transform: LaSR leads numerical accuracy (Acc_0.1, NMSE); LLM-SR+GPT-4o-mini leads symbolic accuracy (~31%). On LSR-Synth materials the advantage inverts: LaSR better symbolic, LLM-SR better numeric — different strategies suit different problems.
- DataBlind (no data) performs poorly → data is necessary, priors insufficient.
- GPT-4o-mini and Llama-3.1-8B consistently beat GPT-3.5-turbo — smaller/less-opinionated models explore better.
- LSR-Synth harder than LSR-Transform → transforming known problems ≠ solving novel ones.
- OOD: all methods degrade ID→OOD; LLM-SR lowest NMSE in both; ID–OOD gap larger in chemistry/biology than physics/materials.
- Memorization evidence: Feynman problems solved with sharp error drops (recitation); LSR-Transform problems substantially harder at matched node counts, including the simplest [0–15]-node band.

## 8. Code / data availability
https://github.com/deep-symbolic-mathematics/llm-srbench (CC BY 4.0).

## 9. Leakage & limitations
- Benchmark authors overlap with LLM-SR authors (Shojaee/Reddy) — method-benchmark co-design risk; LLM-SR winning symbolic accuracy on their own benchmark needs independent confirmation.
- Symbolic accuracy is binary and harsh; near-miss equations score zero — undervalues partial discovery.
- LSR-Synth "physical feasibility" via numerical solvers is asserted, not detailed.
- No classical (non-LLM) baselines like PySR reported in extracted results — LLM-only leaderboard.
- 239 problems is small for a benchmark; domain balance uneven (materials 25 vs physics 43).

## 10. GSE overlap
Directly governs how GSE should evaluate its metric-invention program: (1) adopt symbolic-accuracy + OOD-NMSE as the two-axis scorecard for any GSE-SR equation; (2) the memorization warning applies to GSE — an LLM proposing "EPA-like" formulas may be reciting sports-analytics literature, not discovering; (3) the smaller-models-explore-better finding suggests Llama-3.1-8B over GPT-4-class for GSE-SR generation. New capability (evaluation harness); no existing GSE SR benchmark.

## 11. GSE implementation spec
- Build "GSE-SRBench-sports": ~30 discovery tasks from nflverse where ground truth is KNOWN but obfuscated (LSR-Transform style: e.g. rewrite EPA in algebraically equivalent but unfamiliar form; hide variable names) + ~20 synthetic tasks with injected novel terms and known ground truth.
- Evaluate GSE-SR variants with symbolic accuracy + OOD (future-season) NMSE; require DataBlind-style control (prompt-only baseline) to prove data adds value.
- Effort: ~3 days to build the bench; reusable thereafter.

## 12. Reproducible test
Dataset: the public llm-srbench repo (111+128 problems). Baselines: run GSE's SR stack on the physics subset; compare symbolic accuracy vs the paper's LLM-SR+GPT-4o-mini (~31.5%) to calibrate whether GSE-SR is competitive with published SOTA.

## 13. Acceptance / rejection gate
ADOPT the bench as GSE's SR evaluation standard if a pilot (10 sports tasks) shows it discriminates between SR variants (≥10pp symbolic-accuracy spread between best and worst variant); REJECT as overkill if all variants score within noise — but keep the OOD-NMSE protocol regardless.

## 14. Improvement experiment
"Obfuscation audit of GSE-SR": take 10 equations GSE-SR previously 'discovered' from nflverse, algebraically transform them (expand, factor, substitute composite variables) and hide variable names, then re-run discovery. If the system re-discovers the transformed forms, it's discovering; if it only finds the textbook forms, it's reciting — the exact memorization test this paper ran on Feynman, applied to sports analytics canon.

---
Lane: symreg_equation_discovery · Block 1822–1841
