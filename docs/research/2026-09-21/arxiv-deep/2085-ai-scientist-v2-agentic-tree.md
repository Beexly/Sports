# [2085] The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search (arXiv:2504.08066)

**Citation:** Chris Lu, Cong Lu, Robert Tjarko Lange, Jakob Foerster, Jeff Clune, David Ha (2025). *The AI Scientist-v2: Workshop-Level Automated Scientific Discovery via Agentic Tree Search*. arXiv:2504.08066 (version verified via export API metadata; v1 current). URL: https://arxiv.org/abs/2504.08066
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–5 + Figure 3).
**Verdict:** ADAPT — the progressive agentic tree search with a dedicated Experiment Manager (best-node selection + replication statistics) is the direct upgrade from the v1 linear executor in ledger 2082; adopt the manager + replication discipline, not the full autonomy stack.

## 1. Research question
Can an end-to-end agentic system produce a fully AI-generated manuscript that passes real human peer review — without human-authored code templates — and what architectural changes (agentic tree search, experiment manager, VLM figure feedback) close the gap between v1's linear pipeline and workshop-level quality?

## 2. Dataset / schema
No fixed dataset; the "dataset" is the experimental process itself. Key conceptual shift (Section 3.1): idea generation starts at a higher abstraction level — the system is prompted to formulate a research abstract/grant-proposal-style hypothesis (motivated by the target workshop theme) BEFORE committing to any implementation, unlike v1 which mutated incremental extensions of a seed codebase. Evaluation: three fully autonomous manuscripts submitted to the ICLR 2025 workshop "I Can't Believe It's Not Better" (ICBINB, a negative-results/unexpected-findings venue); human reviewers scored them (pre-arranged with ICLR leadership + IRB approval H24-02652; reviewers told some submissions could be AI-generated and could opt out; accepted manuscript withdrawn post-review by prior agreement).

## 3. Method / model
Upgrades over v1 (Table 1, Section 3):
1. **Template-free start:** no human-authored code templates; the agent generates code from scratch for arbitrary ML domains.
2. **Progressive agentic tree search (Section 3.2.2):** across four experimentation stages, each node = a code checkpoint with an evaluation score; an **Experiment Manager agent** selects the best-performing node after each stage using a dedicated LLM evaluator with explicitly articulated criteria, then branches/refines from it (replacing v1's strict linearity where each refinement built only on the immediately preceding experiment). Inspired by AIDE (Jiang et al. 2025) on MLEBench.
3. **Replication discipline:** after each stage, the manager launches multiple replications of the selected best experiments to report statistics (mean ± std) for figures and results — directly addressing v1's "single-run, possibly unfair comparison" failure mode.
4. **VLM feedback loop:** a vision-language model critiques figure content and aesthetics during experimentation and manuscript review (v1 was text-only).
5. **Submission protocol:** for each selected idea the full pipeline ran multiple times with different random seeds (one manuscript per seed); the single best manuscript (by coherence + scientific quality inspection) was submitted.

## 4. Equations & assumptions
No equations stated (systems paper). Assumptions (explicit): an LLM evaluator with articulated criteria can reliably select best tree nodes; mean±std over replications captures the relevant uncertainty; VLM figure critique transfers to scientific quality; tree search over code checkpoints explores hypothesis space more systematically than linear refinement.

## 5. Features / target
Inputs: workshop theme (extracted from the official website), idea-generation prompt at abstract/grant-proposal level. Outputs: fully autonomous manuscripts. Target metric: human peer-review scores (ICLR workshop scale, /10) and acceptance vs the workshop's average human acceptance threshold.

## 6. Validation design
- Three manuscripts → official ICLR 2025 ICBINB workshop peer review (human reviewers, blind to which were AI-generated during review).
- Pre-registered arrangement: accepted manuscripts withdrawn after review; reviewers informed post-review.
- Internal ablations/inspections of the generated experiments and code (Section 4.2) for limitations (citation hallucinations, methodological rigor gaps).

## 7. Numerical results / baselines
(Exact quotes.)
- One of three manuscripts achieved an **average reviewer score of 6.33/10 (individual scores 6, 6, 7)**, placing it roughly in the **top 45% of submissions**, exceeding the average human acceptance threshold — "the first instance of a fully AI-generated paper successfully navigating a peer review." The other two scored lower and were not accepted.
- The accepted paper investigated explicit compositional regularization (penalizing large deviations between embeddings of successive time steps) on synthetic arithmetic-expression datasets; finding: no significant improvement, occasionally harmful — a genuine negative result fitting the workshop theme.
- Internal inspection: the system "occasionally introduced inaccuracies in citations" (hallucination) and "sometimes lacked the detailed methodological rigor and in-depth analysis typically required for acceptance at leading main conferences" — but sufficed at workshop level.
- Baseline comparison: v1 never attempted real peer review (its reviewer was itself an LLM, NeurIPS scale 2–6, max observed 6.0 ≈ weak accept); v2 is the first to face human reviewers.

## 8. Code / data availability
Open-sourced: https://github.com/SakanaAI/AI-Scientist-v2, including the ICLR 2025 workshop experiment data.

## 9. Leakage & limitations
The authors' own inspection: citation hallucinations persist; methodological rigor below main-conference bar; only 1/3 submissions accepted (workshop-level, negative-results venue — the easiest credible bar); the "best manuscript per seed" selection is a human-in-the-loop step (careful inspection of coherence), so the pipeline is not yet fully hands-off at the submission stage; VLM figure feedback quality is unquantified. For GSE: the Experiment Manager pattern is the portable piece; the autonomy claims do not transfer to a domain where wrong outputs cost money — every "accepted" signal still needs the deterministic numeric gate from ledger 2082.

## 10. GSE overlap
**MOVE-37 FLAG:** v2's Experiment Manager is the missing middle layer of the MOVE-37 loop: between the theorist's hypothesis (DeepSeek) and the execution lab's runs (Motif VM), a manager agent selects best checkpoints, enforces replications with statistics, and decides what survives — a role that today is manual in GSE's backtesting workflow. Existing-map check: no tree-search-over-experiments or experiment-manager machinery in the corpus; the gse-lab scripts are single-run artifacts without replication statistics. **Extension** of ledger 2082's linear executor (v1→v2 upgrade path is explicit). The "grant-proposal-first" idea generation also ports: GSE signal ideas should be stated as falsifiable hypotheses with a pre-registered test before any code runs.

## 11. GSE implementation spec
Upgrade the ledger-2082 executor with v2's two mechanisms:
1. **Experiment Manager agent:** instead of one linear chain of 5 iterations per signal idea, run a small tree — 3 initial implementation variants (different feature constructions of the same hypothesis), each scored by the deterministic evaluator (ΔBrier on 2025 holdout); the manager keeps the best node, branches 2 refinements from it, and at the end launches 3 replications of the winning variant with different random seeds (e.g., bootstrap resamples of the training window) to report mean ± std of ΔBrier. This kills the single-run luck that v1 (and most manual GSE backtests) suffer from.
2. **Hypothesis-first proposals:** the idea generator must emit a structured proposal — hypothesis, predicted direction, falsification condition, exact backtest spec — BEFORE the executor writes code (mirrors the grant-proposal shift). Proposals without a falsification condition are rejected by the manager without running.
3. **Effort:** 2–3 days on top of the 2082 harness (tree bookkeeping + replication runner + proposal schema).

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout. **Protocol:** take the same 10 hand-written signal ideas from ledger 2084's test. Run (a) linear executor (2082-style, single chain, 5 iterations) vs (b) tree-search + Experiment Manager (3 roots × 2 refinements, best-node selection, 3 replications). **Metrics:** number of ideas reaching the promotion gate; and the standard deviation of reported ΔBrier across replications (v2's claim: replication discipline shrinks reported-effect noise). Expect (b) to reject ≥2 ideas that (a) "passes" on a lucky single run.

## 13. Acceptance / rejection gate
**ADOPT the manager + replication discipline if:** (a) ≥80% of signals that pass under the tree+replication protocol still pass on an independent re-run with fresh bootstrap seeds (reproducibility), vs ≤60% for the linear protocol; and (b) the manager's best-node selection agrees with the deterministic evaluator's ranking on ≥90% of stages (the LLM manager is not injecting noise). **REJECT if** replication std of ΔBrier is routinely larger than the effect size (then no single-run or triple-run gate is meaningful and the lane needs more seasons of data first), or the manager overrides the deterministic evaluator's top node >10% of the time without justification in the audit log.

## 14. Improvement experiment
Beyond the paper: make the tree search **budget-adaptive** — the manager allocates more branches to hypotheses whose early nodes show high variance across replications (uncertain but promising) and prunes low-variance losers early, i.e., a bandit-style allocation over the idea portfolio. Hypothesis: fixed trees waste compute on dead ideas; adaptive allocation finds the same winners at ~50% of the backtest compute. Test by replaying 30 nights of logged runs under both allocation rules and comparing winners-found per GPU-hour.
