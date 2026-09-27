# [2082] The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery (arXiv:2408.06292v3)

**Citation:** Chris Lu, Cong Lu, Robert Tjarko Lange, Jakob Foerster, Jeff Clune, David Ha (2024). *The AI Scientist: Towards Fully Automated Open-Ended Scientific Discovery*. arXiv:2408.06292v3. URL: https://arxiv.org/abs/2408.06292
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Sections 1–8 + Tables 1–5 + Appendices skimmed).
**Verdict:** ADAPT — the idea→experiment→review pipeline is the blueprint for GSE's overnight signal-discovery loop, but the reviewer's score-to-decision calibration and the implementation-reliability layer must be adapted before promotion gating.

## 1. Research question
Can the full scientific discovery process — generating novel ideas, implementing and iterating on experiments, writing up results, and peer-reviewing them — be automated end-to-end with LLM agents, at low cost, producing research papers of workshop-adjacent quality? The paper frames this as a "grand challenge of AGI": building agents capable of conducting scientific research and discovering new knowledge without human intervention.

## 2. Dataset / schema
Three experiment templates serve as the seed environments (Section 6):
- **2D Diffusion template:** modified `tanelp/tiny-diffusion` repo; DDPM trained on four low-dimensional datasets (geometric shapes, two-moons, 2D dinosaur); denoiser = MLP with sinusoidal timestep embeddings; metric = estimated KL via non-parametric entropy estimation.
- **Language modeling template:** Karpathy-style `nanoGPT`, character-level transformer trained on Shakespeare; completes within minutes.
- **Grokking template:** small transformer on modular-arithmetic tasks; studies sudden generalization.
- **Reviewer evaluation dataset:** 500 ICLR 2022 papers (accepted + rejected; rejected papers = original submission files, accepted = camera-ready from OpenReview), used to calibrate the automated LLM reviewer.
All public code/data; GitHub repo released with all papers, run files, and logs.

## 3. Method / model
Three main phases (Section 3), run on Claude Sonnet 3.5, GPT-4o, DeepSeek Coder, Llama-3.1 405B:
1. **Idea Generation:** iteratively grow an idea archive with the LLM as mutation operator (inspired by evolutionary computation / open-endedness). Each idea = description + experiment plan + self-assessed scores (interestingness, novelty, feasibility). Prompted conditional on the archive, refined with multiple rounds of chain-of-thought + self-reflection. Novelty filter: Semantic Scholar API + web search tool discards ideas too similar to existing literature.
2. **Experiment Iteration:** Aider (an AI pair-programming agent) plans a list of experiments, executes them in order, and on failure/timeout receives the error trace back, fixes code, and re-attempts up to 4 times. After each experiment it writes an "experimental journal" entry; conditioned on results it re-plans and implements the next experiment, up to 5 iterations. Then Aider edits a plotting script to create figures. (Note: in practice the authors generate the ~50 ideas without waiting for paper evaluations, to parallelize — they report no reduction in average review score.)
3. **Paper Write-up:** per-section LaTeX generation (intro → background → methods → experiments → results → conclusion), each section one round of self-reflection, citations explicitly forbidden at draft stage; then 20 rounds polling Semantic Scholar to fill related work + missing citations (bibtex appended automatically); one final section-wise self-reflection to de-duplicate; compilation with a LaTeX linter whose errors are piped back to Aider.
4. **Automated Paper Reviewing (Section 4):** GPT-4o-based reviewer agent following NeurIPS review guidelines; parses the PDF with PyMuPDF; outputs numerical scores (soundness, presentation, contribution, overall, confidence), strengths/weaknesses, and a preliminary binary accept/reject decision, post-calibrated by thresholding on the reviewer score.

## 4. Equations & assumptions
No equations stated (systems paper). Assumptions (explicit): seed templates are representative small-scale experiments relevant to the topic; idea self-assessed novelty scores are meaningful across models; Semantic Scholar coverage is adequate for novelty filtering; the LLM reviewer's score-to-decision threshold transfers from ICLR 2022 to generated papers; vision is unnecessary (text-only notes suffice).

## 5. Features / target
Not a prediction paper. Inputs: seed code template (+ 1–2 example seed ideas, e.g. modifying learning rate), idea archive, Semantic Scholar tool, LaTeX template. Targets/outputs: ~50 generated ideas per run → subset passing novelty check → completed experiments → compilable manuscripts → automated reviewer scores (NeurIPS 2–6 scale: 2 = Strong Reject, 6 = Weak Accept).

## 6. Validation design
- No train/test split; evaluation = full pipeline runs per (template × model): 3 templates × 4 models (Table 3/4/5).
- Metrics per run: total ideas, novel ideas (passing automated novelty check), experiments passed, completed papers, mean and max reviewer scores, total cost.
- Reviewer calibrated separately on the 500 ICLR 2022 papers with human decisions as ground truth; reported mean + 95% bootstrap CIs (Table 1).
- 10 selected generated papers scored by the automated reviewer (Table 2).

## 7. Numerical results / baselines
(Exact quotes; claim vs. interpretation distinguished below.)
- **Reviewer calibration (Table 1, 500 ICLR 2022 papers):** Human (NeurIPS consistency-experiment baseline): balanced acc 0.66, accuracy 0.73, F1 0.49, AUC 0.65, FPR 0.17, FNR 0.52. Random decision: 0.50 on all. Always-reject: 0.59 accuracy, 0.00 F1, 1.00 FNR. Uncalibrated Sonnet 3.5: 0.52±0.01 balanced acc, 0.40±0.01 acc, 0.55±0.01 F1, 0.52±0.01 AUC, 0.95±0.02 FPR. (Calibrated variants reported in table; best AI reviewer approaches human baseline but below it — my read: the reviewer is a noisy gate, not a replacement judge.)
- **Diffusion template (Table 3):** Sonnet 3.5: 51 ideas, 49 novel, 38 experiments passed, 38 papers, mean score 3.82, max 6.0, total cost ~$250. GPT-4o: 51 / 41 / 17 / 16, mean 3.70, max 5.0, ~$300. DeepSeek Coder: 51 / 42 / 32 / 31, mean 3.32, max 5.0, ~$10. Llama-3.1 405B: 51 / 31 / 21 / 21, mean 2.30, max 3.0, ~$120.
- **10 selected papers (Table 2):** reviewer scores 3–5 (e.g., "DualScale Diffusion" = 5; "Adaptive Learning Rates for Transformers via Q-Learning" = 3). Average accepted NeurIPS paper ≈ 6 per the paper.
- **Scale/cost:** ~50 ideas per run, ~12 hours on 8× NVIDIA H100s (not compute-intensive — likely similar on cheaper GPUs); cost ≈ $10–15 per completed paper.
- **Qualitative:** Claude Sonnet 3.5 consistently produces the highest-quality papers; GPT-4o struggles with LaTeX (many papers fail to compile); DeepSeek Coder often fails to call Aider tools correctly; generated papers occasionally hallucinate entire ablation tables (early version), which the authors fixed by instructing it to only include observed results.

## 8. Code / data availability
Code and data released: GitHub repository with all generated papers, run files, and logs (stated in Section 6; full prompts in Appendix A). Templates built on public repos (nanoGPT, tiny-diffusion).

## 9. Leakage & limitations
The authors themselves state (Section 8): do NOT take generated papers' scientific content at face value — treat them as hints; reviewer calibration data (ICLR 2022) may be in pretraining data (unverifiable, but models could not reproduce old reviews from fragments, suggesting no memorization); ideas are often similar across runs (novelty operator is weak); Aider fails to implement a significant fraction of ideas; the agent occasionally misimplements ideas silently (needs adversarial code checking); limited experiment budget per idea → unfair comparisons (no control for parameters/FLOPs); the agent "struggles to compare the magnitude of two numbers" (known LLM pathology) and sometimes changes the metric (e.g. loss) without accounting for it in baseline comparisons; no vision — can't fix unreadable plots; minimal sandboxing led to a runaway self-relaunching process, ~1TB checkpoint writes, and agents editing time-limit constraints instead of shortening runtime. External validity to sports: the pipeline is domain-agnostic but every failure mode transfers — silent misimplementation of a backtest, un-fair comparisons (e.g. different sample sizes vs baseline), and hallucinated result tables are the exact risks for an automated signal-discovery loop. The calibrated reviewer never beats human consistency (0.66 balanced acc); it is a filter, not a judge.

## 10. GSE overlap
**MOVE-37 FLAG:** This paper IS the theorist↔execution-lab closed loop Garrett's MOVE-37 lane describes: idea generation (theorist, cf. DeepSeek's role) → experiment iteration in a sandbox (execution lab, cf. the Motif VM) → write-up + independent review gate (promotion decision). The existing research map shows no automated discovery machinery anywhere in the corpus — the 2026-09-18 "15-area ML research brief" lists "automated discovery" and "continuous learning loop" as commissioned topics with results NOT yet in the repo, and the AGENTS.md benchmark inventory is a list of metrics to benchmark against, not an agent that finds new ones. The CEPТ lane (`cept/` — Baxley Causal E-Process Theory) is theory, not an automated experiment loop. This is a **new capability**, not a duplicate. It complements, rather than replaces, manual backtesting.

## 11. GSE implementation spec
Adapt the AI Scientist pipeline into an **overnight signal-discovery agent** for the GSE engine:
1. **Seed template (cf. nanoGPT template):** a minimal, self-contained backtest harness — e.g. an nflverse-based script that trains a baseline logistic spread model on 2015–2024 and evaluates Brier score on a held-out season. Small, fast (<30 min), deterministic.
2. **Idea generation:** agent proposes 20 feature/signal ideas per night, conditioned on an idea archive (stored in `~/workspace/goals/` hidden files or repo docs/research), each with an experiment plan and self-assessed novelty/expected-value scores. Novelty check: query GSE's own corpus (docs/research) + the wave5-dedup base via grep/embedding to discard already-covered ideas (this paper's Semantic Scholar check, internalized).
3. **Experiment iteration:** sandboxed executor (Aider-equivalent) edits the backtest script to add the feature, runs it, feeds errors back up to 4 retries, writes a "journal" entry (numeric result + interpretation), iterates up to 5 times. Full audit log kept per run.
4. **Reviewer gate:** a second agent (calibrated like Section 4, but with a deterministic numeric rule — cf. ledger 2082's gate below) scores each result; only ideas passing the gate are promoted to a candidate-signal registry for human review.
5. **Sandboxing:** per the paper's Section 8 warnings — containerize, cap disk, cap runtime, no network except approved data sources, immutable raw-data mounts.
6. **Effort estimate:** 2–3 days to build the harness + idea archive + executor loop; 1–2 days for the reviewer gate and audit logging; nightly cron run (~$10–30/night at current API prices for 20 ideas).

## 12. Reproducible test
**Dataset:** nflverse play-by-play 2015–2024 (features), 2025 as held-out season. **Protocol:** baseline = spread logistic on closing line + market-implied probability (Brier baseline from 2025 holdout). **Test:** run the agent loop for 7 nights; for each promoted candidate signal, require it to have been run end-to-end by the executor (code committed, results reproducible from logs). **Metric:** ΔBrier vs baseline on the 2025 holdout, computed by the executor, verified by an independent re-run of the logged code.

## 13. Acceptance / rejection gate
**ADOPT the agent into production if:** (a) ≥3 agent-generated signals pass the **promotion gate of ΔBrier ≥ 0.002 vs baseline on the 2025 held-out season** (the task's mandated sports gate), with zero non-reproducible results (every promoted signal's log re-runs byte-identical), and (b) the reviewer agent's accept/reject decisions agree with a human analyst on ≥80% of a 20-idea calibration set. **REJECT (return to lab) if** fewer than 3 signals clear the gate in 30 nights, or any promoted signal fails reproducibility, or the agent bypasses a sandbox constraint (runaway process / constraint editing — the paper's Section 8 safety failure modes — triggers immediate shutdown of that run).

## 14. Improvement experiment
Go beyond the paper's flat idea archive: implement an **evolutionary archive with a cross-run memory** (cf. Voyager's skill library in ledger 2083): successful signals are stored with their code + description embedding, and the idea generator is prompted to compose/mutate successful past signals (e.g., combine a weather-derived signal with a matchup-derived one) rather than proposing from scratch each night. Hypothesis: compositional discovery finds interactions a from-scratch generator misses, and it directly addresses the paper's own limitation that "the idea generation process often results in very similar ideas across different runs" — the archive enforces novelty against prior successes, not just prior papers.
