# [2087] TextGrad: Automatic "Differentiation" via Text (arXiv:2406.07496)

**Citation:** Reid Pryzant, Dan Iter, Jerry Li, Yin Lee, Chenguang Zhu, Michael Zeng (2024). *TextGrad: Automatic "Differentiation" via Text*. arXiv:2406.07496 (version verified via export API; v1 current). URL: https://arxiv.org/abs/2406.07496
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–3 + Appendices A.3/B).
**Verdict:** ADAPT — textual backprop through a compound prompt→code→evaluation graph is the principled way to optimize GSE's multi-stage agent prompts and signal-construction pipelines; adopt the Variable/backward/TGD abstraction, with a deterministic evaluator as the loss.

## 1. Research question
Neural networks became optimizable at scale once backpropagation made gradient computation turn-key. Can the same be done for compound AI systems (multi-LLM-call pipelines, code, prompts, molecules, treatment plans) — i.e., can an LLM provide textual "gradients" (natural-language criticism of what to change) that backpropagate through a computation graph to improve every upstream component automatically, with PyTorch-like syntax and no per-task tuning?

## 2. Dataset / schema
Five application domains (Section 3), all with the same framework and backward engine:
- **§3.1 Code optimization:** LeetCode Hard dataset (39 problems in their re-extraction; success = passing all hidden tests on the LeetCode platform; GPT-4's reported baseline ≈ 7% completion).
- **§3.2 Solution optimization:** GPQA (Google-Proof QA), MMLU subsets (Machine Learning, College Physics) — test-time refinement of solutions.
- **§3.3 Prompt optimization:** improving prompts for LLM reasoning (minibatch SGD over prompt variables).
- **§3.4 Molecule optimization:** druglikeness + protein binding affinity (in silico).
- **§3.5 Radiotherapy planning:** prostate-cancer treatment plans, high specificity.
Baselines: zero-shot gpt-4o, Reflexion (1 demonstration, 5 iterations), best existing methods per domain.

## 3. Method / model
Core abstraction (Section 2, mirrors PyTorch autograd):
- **Variable:** wraps any value (prompt string, code snippet, molecule SMILES, question) with `requires_grad` flag and a predecessor list. E.g., `Prediction = LLM(Prompt + Question)` (Eq. 1); `Evaluation = LLM(Evaluation Instruction + Prediction)` (Eq. 2).
- **Forward:** an LLM call registers all input variables as predecessors of the response variable.
- **Backward:** a "backward engine" LLM receives a fixed glossary system prompt (Appendix A.3) and the downstream textual gradient, and produces criticism for each predecessor — the textual analogue of ∂L/∂x. Chain rule = passing gradients to predecessors.
- **TGD.step (Eq. 9):** `x_new = TGD.step(x, ∂L/∂x) ≜ LLM("Below are the criticisms on {x}: {∂L/∂x}. Incorporate the criticisms, and produce a new variable.")` — the textual gradient-descent update, domain-independent.
- **Composability:** `textgrad.autograd.Function` with forward/backward, mirroring `torch.autograd.Function`; `tg.sum` for minibatch losses (gradients concatenated through addition, §3.3); same backward engine and prompts across ALL applications — "without modifying the framework."

## 4. Equations & assumptions
Faithful core equations: (1) `Prediction = LLM(Prompt + Question)`; (2) `Evaluation = LLM(Evaluation Instruction + Prediction)`; (9) `x_new = TGD.step(x, ∂L/∂x) ≜ LLM("Below are the criticisms on {x}: {∂L/∂x}. Incorporate the criticisms, and produce a new variable.")`; (15) `Solution Refinement Objective = LLM(Question + Solution + Test-time Instruction)`. Assumptions (explicit): the backward-engine LLM's criticisms point in a loss-descending direction (no convergence proof — it is an analogy, not a theorem); textual gradients compose through the chain rule approximately; the same glossary/backward prompt works across domains.

## 5. Features / target
Inputs: computation graph of Variables (prompts, code, solutions). The "loss" is an LLM-evaluated objective per application (e.g., solution-quality critique for GPQA; hidden-test pass for LeetCode). Targets: completion rate (LeetCode), zero-shot accuracy (GPQA/MMLU), binding affinity/druglikeness (molecules), plan specificity (radiotherapy).

## 6. Validation design
- LeetCode Hard: TextGrad (0 demonstrations, 5 iterations) vs zero-shot gpt-4o vs Reflexion (1 demonstration, 5 iterations); 5 seeds averaged; final eval on hidden LeetCode platform tests. (Caveat, §B: they re-extracted the LeetCodeHard dataset with the authors' pipeline — "likely not the same dataset that was used in the Reflexion paper.")
- GPQA/MMLU: zero-shot baseline vs TextGrad test-time refinement.
- Prompt optimization: stochastic minibatch gradient descent over batches of instances with tg.sum.
- No time-ordered splits (benchmark-based).

## 7. Numerical results / baselines
(Exact quotes.)
- **LeetCode Hard (Table 1, gpt-4o, 5 seeds):** Zero-shot 0.26; Reflexion (1 demo, 5 iters) 0.31±0.012; **TextGrad (0 demos, 5 iters) 0.36±0.018** — a 20% relative gain over the best existing method, with no demonstrations.
- **GPQA:** 51% → **55%** ("to our best knowledge, 55% is the best known result in the GPQA dataset so far").
- **MMLU subsets:** Machine Learning 85.7% → 88.4%; College Physics 91.2% → 95.1%.
- Each TextGrad iteration = 3 gpt-4o calls (evaluate loss, collect gradients, update variable).

## 8. Code / data availability
Framework released (PyTorch-mirroring API: `tg.Variable`, `loss.backward()`, `tg.TextualGradientDescent`); exact repo URL in the published paper.

## 9. Leakage & limitations
No convergence theory — "differentiation" is metaphorical; the backward engine is the same LLM family as the forward system (self-critique bias — the paper's gains could partly be test-time compute, not true gradient signal); the LeetCodeHard re-extraction means the Reflexion comparison is not on identical data (authors disclose this); 3 LLM calls per iteration per variable is expensive at scale; gradients are only as good as the loss — with an LLM-judged loss, the system can hill-climb on the judge's biases (the same evaluator-grounding problem as ledgers 2082–2084). For GSE: never use an LLM-judged loss for signal optimization — the loss must be the deterministic backtest metric, or TextGrad will optimize the judge.

## 10. GSE overlap
**MOVE-37 FLAG:** TextGrad is the optimization-theoretic framing of the whole MOVE-37 loop: the discovery pipeline (idea prompt → code → backtest → numeric loss) IS a computation graph, and "textual gradients" (criticisms of the signal code given the backtest loss) backpropagate to improve the upstream prompt and code jointly. Existing-map check: no prompt-optimization or pipeline-optimization machinery in the corpus; GSE prompts and backtest code are hand-tuned. This is the formal upgrade of the Reflexion micro-loop (2084): instead of one reflection per trial, TextGrad gives per-variable gradients through a multi-stage graph — e.g., simultaneously improving the feature-engineering code AND the idea-generation prompt from one backtest loss. **New capability.**

## 11. GSE implementation spec
Adapt TextGrad to optimize the **signal-discovery pipeline itself**:
1. **Graph:** `SignalCode = LLM(IdeaPrompt + SignalHypothesis)` → `BacktestResult = Executor(SignalCode)` → `Loss = -ΔBrier(BacktestResult)` (deterministic — NOT an LLM judge). Variables with requires_grad: IdeaPrompt, SignalCode.
2. **Backward:** a backward-engine LLM receives the backtest diagnostics (which folds failed, sample sizes, calibration slope — the structured evaluator output from 2084) as the "gradient" on BacktestResult, and produces criticisms for SignalCode ("the wind interaction fails because...") AND for IdeaPrompt ("hypotheses about weather need a minimum-games guard..."). Chain rule = one backward call per edge.
3. **TGD.step:** update SignalCode and IdeaPrompt with the Eq.-9-style prompt ("Below are the criticisms on {x}: {...}. Incorporate the criticisms, and produce a new variable."). 5 iterations max per idea (paper's budget).
4. **Minibatch mode (§3.3 pattern):** for prompt optimization, batch 4 ideas, `tg.sum` their losses, concatenate gradients — improves the IdeaPrompt across ideas, not just one.
5. **Effort:** 2–3 days (Variable/graph wrapper around the 2082/2084 harness; backward-engine prompts).

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout. **Protocol:** fix the IdeaPrompt; take 8 hand-written signal hypotheses. Arm A: Reflexion-style single reflection per trial (2084). Arm B: TextGrad graph with per-variable gradients (SignalCode + IdeaPrompt updated jointly), 5 iterations, 3 seeds. **Metric:** ΔBrier on 2025 holdout per idea; count of ideas clearing 0.002; ALSO track IdeaPrompt improvement: does arm B's updated prompt produce better first-attempt code on a held-out set of 4 new hypotheses (transfer test — the paper's prompt-optimization claim)?

## 13. Acceptance / rejection gate
**ADOPT if:** arm B clears the 0.002 gate on ≥5/8 ideas vs ≤3/8 for arm A, AND the transferred IdeaPrompt improves first-attempt ΔBrier on the 4 held-out hypotheses by ≥0.001 on average (the prompt itself is learning — the TextGrad value-add over Reflexion), AND total LLM calls per idea ≤ 20 (5 iters × ~4 calls; cost-bounded). **REJECT if** arm B ≈ arm A (joint optimization adds nothing over single reflection), or the IdeaPrompt drifts into prompt-bloat (length doubles with no transfer gain — textual gradients overfitting the prompt), or any iteration's "gradient" contradicts the deterministic backtest numbers (backward engine hallucinating — fall back to 2084's simpler reflection).

## 14. Improvement experiment
Beyond the paper: add a **gradient-clip analogue** — cap each TGD.step to changing at most K lines of SignalCode / K tokens of IdeaPrompt per iteration (like gradient clipping/norm constraints in SGD). Hypothesis: unconstrained textual updates cause the oscillation/divergence the paper never analyzes (no convergence theory); clipped steps should reduce the variance of ΔBrier across the 5 iterations and raise the fraction of ideas that monotonically improve. Test by replaying arm B with and without the clip and comparing the iteration-trajectory variance.
