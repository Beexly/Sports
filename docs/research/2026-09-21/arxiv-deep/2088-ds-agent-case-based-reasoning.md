# [2088] DS-Agent: Automated Data Science by Empowering Large Language Models with Case-Based Reasoning (arXiv:2402.17453)

**Citation:** Siyuan Guo, Cheng Deng, Ying Wen, Hechang Chen, Yi Chang, Jun Wang (2024). *DS-Agent: Automated Data Science by Empowering Large Language Models with Case-Based Reasoning*. arXiv:2402.17453 (version verified via export API; v5 current). URL: https://arxiv.org/abs/2402.17453
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–4).
**Verdict:** ADAPT — case-based reasoning (retrieve → reuse → revise → retain) over a bank of past GSE experiments is the retrieval substrate the discovery loop's memory layer needs; the two-stage (development/deployment) design maps to nightly discovery vs. cheap weekly re-runs.

## 1. Research question
LLM agents fail at automated data science because they generate "unreasonable experiment plans" — they lack grounded planning knowledge. Can classical case-based reasoning (CBR) over expert Kaggle solutions structure an automatic iteration pipeline (retrieve → reuse → revise → retain) that grounds planning, improves consistently with feedback, and then transfers cheaply to new tasks in a low-resource deployment stage?

## 2. Dataset / schema
- **Case bank:** technical reports of winning teams + top-ranked public-leaderboard code from several recently completed Kaggle competitions (text, time-series, tabular modalities); reports cleaned to core insights, code summarized to textual insights via GPT-3.5.
- **Evaluation tasks:** 30 data-science tasks — 12 development tasks (iterative pipeline) + 18 deployment tasks (single-shot code generation). Each task = (description τ, D_train, D_valid, D_test, metric M). Baselines: ResearchAgent and others with GPT-3.5/GPT-4/Mixtral-8x7b.
- Metrics: task success rate, one-pass rate, mean rank / best rank of the built model vs baselines on task-specific metrics (5 repetitive trials).

## 3. Method / model
CBR-based LLM formalization (Section 2): retriever p_R (distribution over the case bank given task τ and feedback l), LLM p_LLM (generates solution y given τ, l, retrieved case c), evaluator p_E (produces feedback l from y). Iteration t: p_CBR(y^t|τ) marginalizes over retrieved-and-revised cases; differs from RAG by the revise + retain steps (RAG only retrieves/reuses once).
- **Development stage:** (1) Retrieve: top-k cases by embedding similarity; (2) **ReviseRank:** LLM re-ranks cases as "[2]>[1]>[3]..." conditioned on last iteration's execution feedback (p_RR(c|τ, l^{t-1})) — dynamic case adjustment without retriever fine-tuning; (3) Planner reuses the top case to write an experiment plan; (4) execute, get feedback l^t; (5) loop; (6) **Retain:** best solution added to the case bank (flexible learning without backprop).
- **Deployment stage:** simplified CBR — retrieve past successful development-stage solutions, reuse with minor adaptation, single pass, no iteration. Designed for weak LLMs: knowledge transfer via a similar case in context.

## 4. Equations & assumptions
Faithful formalization: iteration-t solution distribution p_CBR(y^t|τ); feedback distribution p_E(l^t|τ) = Σ_{y^t} p_CBR(y^t|τ) p_E(l^t|y^t,τ); ReviseRank utility p_RR(c|τ,l^{t-1}) = p_LLM(c|c_1,...,c_k,τ,l^{t-1}). Assumptions: Kaggle expert insights transfer to new tasks; LLM-estimated case utility correlates with true utility; retaining best solutions monotonically improves the bank; deployment tasks share the development distribution.

## 5. Features / target
Inputs: task description + datasets; retrieved human-insight cases. Target: trained ML model maximizing the task metric M on D_test; reported as success rate / one-pass rate / rank vs baselines.

## 6. Validation design
- 12 development tasks × 5 trials: success rate by task type (tabular/text/time-series), mean/best rank vs baselines (Table 1), iteration-scaling curve (Figure 1b), ablation of CBR components (Table 2).
- 18 deployment tasks: one-pass rate across LLM backbones (GPT-4/3.5/Mixtral), vs best baseline.
- Cost per run tracked (GPT-3.5/GPT-4, standard vs low-resource).

## 7. Numerical results / baselines
(Exact quotes.)
- **Development:** DS-Agent + GPT-4: **100% success rate** over all 12 tasks; best performance in 9/12 tasks; DS-Agent + GPT-3.5 second-best overall, "consistently surpasses ResearchAgent with GPT-4 in all tasks" (ResearchAgent + GPT-3.5 "almost fails in every type of task").
- **Deployment:** one-pass rate 85% (GPT-3.5) / 99% (GPT-4) over 18 tasks vs best baseline 56% / 60%; Mixtral-8x7b-Instruct lifted from **6% → 31%** by the simplified CBR (a 36% average one-pass-rate improvement across alternative LLMs, per the abstract).
- **Iteration scaling:** average best mean rank improves monotonically with iteration steps (Figure 1b).
- **Cost:** $1.60/run (GPT-4) / $0.06 (GPT-3.5) development; $0.135 / $0.0045 in low-resource deployment.
- Tabular tasks easiest (mostly sklearn calls); time-series/text harder.

## 8. Code / data availability
Data and code open-sourced: https://github.com/guosyjlu/DS-Agent.

## 9. Leakage & limitations
Kaggle case bank may overlap pretraining data (memorization vs reasoning unmeasured); deployment-stage transfer assumes same task distribution (untested on distribution shift); the ReviseRank LLM re-ranker is itself uncalibrated (no reported ranking accuracy); mean-rank metrics hide per-task variance; tabular-task ease inflates headline numbers. For GSE: the "case bank" must be GSE's own verified experiments (not Kaggle), or the agent will retrieve patterns that don't transfer to sports betting; and the retain step needs the deterministic gate — retaining a lucky backtest poisons the bank (the paper retains by validation metric, which in betting must be the holdout gate, not in-sample fit).

## 10. GSE overlap
**MOVE-37 FLAG:** DS-Agent's CBR cycle is the memory discipline for the MOVE-37 execution lab: every backtest the lab runs becomes a retained case (hypothesis + code + feedback + outcome); future discovery retrieves and revises those cases instead of starting cold. Existing-map check: no case-based retrieval over past experiments exists — the corpus has static reports, and the gse-lab scripts carry no feedback/outcome annotations. The development/deployment two-stage split also ports: nightly "development" (expensive, iterative discovery) vs. weekly "deployment" (cheap re-generation of the current best pipeline, e.g., re-fitting the production model with a small LLM). **New capability**; formalizes the memory layer that ledgers 2082–2087 all assume but none specify.

## 11. GSE implementation spec
Build a **GSE case bank** as the memory substrate for the discovery loop:
1. **Case schema (SQLite):** (case_id, hypothesis_text, feature_code, backtest_spec, feedback_log (the 2084 reflections), dev_score (2025-holdout ΔBrier), stage3_score (locked-season), retained_flag, embedding). Seed with the 5 hand-verified baseline signals + every future discovery-loop attempt (including failures — cf. DGM stepping stones, 2086).
2. **Development stage (nightly):** idea generator retrieves top-k cases by embedding similarity to the new hypothesis; ReviseRank step: an LLM re-ranks cases conditioned on the last night's feedback ("case 3's wind-guard failed on small samples — demote weather cases with <40 games"); planner writes the experiment plan reusing the top case; executor runs; retain if it passes the Stage-2 gate.
3. **Deployment stage (weekly, cheap):** retrieve the current best production-pipeline case and regenerate the weekly model-fit code with minor adaptation — runnable on a small/cheap model (the paper's Mixtral 6%→31% result is the precedent for using weak models with good cases).
4. **Effort:** 2 days (schema + retriever + ReviseRank prompt + retain logic) on top of the 2082 harness.

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout. **Protocol:** (a) build the case bank from 20 hand-logged past GSE-style experiments (10 successes, 10 failures with feedback notes); (b) run the discovery loop on 10 new signal hypotheses with CBR retrieval vs without (cold start). **Metrics:** gate-pass rate within a 5-iteration budget; mean iterations-to-pass; and the deployment test — regenerate the production spread-model fit script from the best case using a small model, measuring one-pass success (code runs, reproduces baseline Brier within 1e-4).

## 13. Acceptance / rejection gate
**ADOPT if:** CBR arm passes ≥6/10 hypotheses within budget vs ≤3/10 cold-start; ReviseRank demonstrably demotes at least one misleading case per night on average (the dynamic adjustment is doing work, not just embedding retrieval); deployment-stage regeneration succeeds one-pass ≥80% of weeks over 8 weeks with the small model. **REJECT if** cold-start matches within 1 hypothesis (retrieval adds nothing — bank too small or embeddings uninformative), or retained cases show score decay on re-run (bank poisoning — the retain criterion is too lax), or ReviseRank rankings are uncorrelated with next-iteration outcomes (the LLM can't estimate case utility → drop ReviseRank, keep static retrieval).

## 14. Improvement experiment
Beyond the paper: add **counter-case retrieval** — for each retrieved success case, also retrieve the most similar FAILED case and inject its feedback ("this similar idea failed because of X") into the planner prompt. Hypothesis: negative cases prevent repeating known failure modes faster than positive cases guide success (the paper only retrieves successes). Test: 10 hypotheses, planner with success-only vs success+counter cases, measuring wasted iterations on already-known failure modes.
