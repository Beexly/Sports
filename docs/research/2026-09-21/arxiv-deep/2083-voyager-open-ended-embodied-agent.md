# [2083] Voyager: An Open-Ended Embodied Agent with Large Language Models (arXiv:2305.16291v2)

**Citation:** Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, Anima Anandkumar (2023). *Voyager: An Open-Ended Embodied Agent with Large Language Models*. arXiv:2305.16291v2. URL: https://arxiv.org/abs/2305.16291
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Sections 1–4 + Appendix B.3 ablation details).
**Verdict:** ADAPT — the automatic-curriculum + skill-library + self-verification triad adapts directly into a lifelong "signal library" for the GSE discovery loop; ablations quantify exactly which component matters most.

## 1. Research question
Can an LLM-powered agent perform open-ended lifelong learning in a complex environment — continuously exploring, acquiring diverse reusable skills, and making novel discoveries — without any human intervention? Minecraft (via MineDojo/Mineflayer) is the testbed: the overarching goal is "discovering as many diverse things as possible."

## 2. Dataset / schema
Environment: Minecraft simulation built on MineDojo + Mineflayer JavaScript APIs (control-primitive APIs). No fixed dataset; evaluation = live exploration episodes measured by unique items discovered, distance traveled, and tech-tree milestones unlocked (wooden/stone/iron/diamond levels). Baselines re-implemented: ReAct, Reflexion (built on ReAct, given execution errors + the self-verification module), AutoGPT (GPT-4 task decomposition, ReAct-style subgoal execution, given agent states/environment feedback/execution errors but no skill library, no self-verification, no automatic curriculum). Code/action space: executable JavaScript programs.

## 3. Method / model
Three modules (Section 2), using gpt-4-0314 + gpt-3.5-turbo-0301 + text-embedding-ada-002; all temperatures 0 except the curriculum (0.1 for diversity):
1. **Automatic curriculum (2.1):** GPT-4 proposes the next task conditioned on exploration progress + agent state (biome, inventory, health, etc.), pursuing "discovering as many diverse things as possible" — an in-context form of novelty search. Tasks escalate in complexity as the agent succeeds.
2. **Skill library (2.2):** every successfully self-verified action program (e.g. `craftStoneShovel()`, `combatZombieWithSword()`) is stored in a vector database keyed by the GPT-3.5 embedding of its program description; the program itself is the value. On a new task, GPT-3.5 generates a plan, and the top-5 relevant skills are retrieved by embedding similarity to plan + environment feedback. Complex skills compose simpler ones.
3. **Iterative prompting mechanism (2.3):** three feedback types per round — (a) environment feedback (observations such as inventory/nearby creatures), (b) execution errors from the code interpreter, (c) **self-verification**: a separate GPT-4 critic judges from agent state + task whether the program succeeded, and if not, gives a critique with a completion suggestion (more comprehensive than self-reflection: checks success AND reflects on mistakes). Loop: generate → execute → feed back → refine, until self-verification passes, then commit to the skill library and query the curriculum. If stuck after 4 rounds, the curriculum is queried for another task.

## 4. Equations & assumptions
No equations stated (systems paper). Assumptions (explicit): GPT-4's code-generation ability is the necessary substrate (ablation shows GPT-3.5 cannot substitute); text-only state observations suffice; embedding similarity retrieves relevant skills; the self-verification critic's judgment correlates with true task success; 4 rounds of stuckness is a reliable give-up signal.

## 5. Features / target
Not a prediction paper. Inputs: agent state (inventory, biome, health, nearby entities), curriculum-proposed task, retrieved skills (top-5), error traces. Target/output: verified executable skill programs; evaluation targets = unique items discovered within N prompting iterations, distance traveled, tech-tree milestones unlocked, plus generalization (apply the library in a new world to solve novel tasks within 50 iterations).

## 6. Validation design
- Head-to-head exploration runs: Voyager vs ReAct vs Reflexion vs AutoGPT, counting unique items within 160 prompting iterations; tech-tree milestone unlock speed (prompting iterations to wooden/stone/iron/diamond).
- **Generalization test (Section 3.4):** skill library built in one world, then all agents tested on novel tasks in a new Minecraft world with a 50-iteration budget (Table 2, Fig. 8).
- **Ablations (6 design choices, Fig. 9, Appendix B.3):** automatic curriculum (vs random / manually designed), skill library (removed), environment feedback, execution errors, self-verification (removed), GPT-4→GPT-3.5 for code generation.

## 7. Numerical results / baselines
(Exact quotes.)
- **Exploration (Section 3.3, Fig. 1):** Voyager discovers 63 unique items within 160 prompting iterations — 3.3× more novel items than counterparts; travels 2.3× longer distances; unlocks wooden tech level 15.3× faster (prompting iterations), stone 8.5× faster, iron 6.4× faster than baselines; Voyager is the ONLY method to unlock the diamond level (Table 1).
- **Generalization (Table 2, Fig. 8):** Voyager consistently solves all novel tasks in the new world; baselines solve none within 50 prompting iterations. Strikingly, giving Voyager's skill library to AutoGPT also boosts AutoGPT — the library is a "plug-and-play asset."
- **Ablations (Fig. 9, key findings):** replacing the automatic curriculum with a random one drops discovered item count by **93%**; a manually designed curriculum also falls short of the automatic one. Voyager without the skill library plateaus in later stages. **Self-verification is the most important feedback type — removing it drops discovered item count by 73%.** GPT-4 obtains 5.7× more unique items than GPT-3.5 for code generation.
- **Cost note (Section 4):** GPT-4 is 15× more expensive than GPT-3.5, but the code-generation quantum leap is non-substitutable.

## 8. Code / data availability
Full prompts in Appendix A; environment details in Appendix B.1. Code release stated via the project page (standard for this paper; exact URL in the published version).

## 9. Leakage & limitations
No lookahead issue (live environment), but: success is judged by the agent's own self-verification critic — a self-graded metric with no ground-truth oracle, so "63 unique items" and tech-tree claims inherit the critic's error rate (the paper does not report critic precision/recall); Minecraft's deterministic-ish environment flatters iterative debugging vs stochastic domains; GPT-4 cost is 15× GPT-3.5 and the whole system depends on that specific capability jump (weaker models: -5.7× items); no visual perception (text-only at the time). External validity to sports: self-verification works here because task success is checkable from state; for signal discovery, "success" must be a hard numeric backtest (otherwise the critic can rubber-stamp). The 4-round give-up rule is a good anti-stuck mechanism to copy.

## 10. GSE overlap
**MOVE-37 FLAG:** Voyager's triad maps onto the MOVE-37 lane one-to-one: automatic curriculum = the theorist proposing progressively harder research directions (a discovery schedule DeepSeek or the idea-generator emits); skill library = the execution lab's accumulating, retrieval-indexed codebase of verified signal implementations; self-verification = the independent numeric gate before anything enters the library. Existing research map check: no skill-library / lifelong-learning machinery exists in the corpus — the gse-lab scripts (29 CSVs, 15 metric families) are static artifacts, not a growing retrievable library; the 2026-09-18 ML brief's "continuous learning loop" topic has no results in the repo. **New capability.** The compositional-skill insight (complex skills built on simpler ones) is exactly how GSE features compose (e.g., matchup-adjusted EPA built on raw EPA + charting splits) — but today that composition lives in analysts' heads and one-off scripts, not in a queryable library.

## 11. GSE implementation spec
Adapt Voyager into a **lifelong signal library** layered on the ledger-2082 discovery loop:
1. **Skill library schema:** vector DB (e.g. Chroma/SQLite-vec) keyed by embedding of a natural-language description of each verified signal; value = the executable backtest code + its 2025-holdout metrics + the journal entry. Every entry passes the Section 13 gate of ledger 2082 before insertion (the self-verification module, made deterministic: the "critic" is a script that re-runs the code and checks ΔBrier ≥ 0.002).
2. **Automatic curriculum for signals:** nightly prompt that reviews the library's coverage (thin lanes: weather, special teams, referee crews, per the map's inventory) and proposes the next discovery task of appropriate difficulty — e.g., "find a signal in the special-teams lane," escalating to "compose a special-teams signal with a weather interaction" once base skills exist.
3. **Iterative prompting:** the executor loop from ledger 2082 with the three feedback types: backtest output (environment feedback), tracebacks (execution errors), deterministic re-run gate (self-verification). Give up after 4 stuck rounds and move to the next curriculum task (copy the paper's rule).
4. **Retrieval at idea time:** top-5 related signals injected into the idea generator's prompt so new proposals compose existing verified code instead of reinventing it.
5. **Effort:** 3–5 days (vector store + retrieval plumbing on top of the 2082 harness); nightly cron.

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout (same as 2082). **Protocol:** seed the library with 5 hand-verified baseline signals (Elo, closing-line residual, rest differential, turnover-luck regression, wind interaction). Run the curriculum loop for 14 nights with and without the skill library (ablation, mirroring the paper's Fig. 9 design). **Metrics:** number of NEW verified signals clearing the ΔBrier ≥ 0.002 gate; with-library arm should produce ≥2× the no-library arm and show no plateau (the paper's signature result).

## 13. Acceptance / rejection gate
**ADOPT if:** the with-library arm discovers ≥4 new gate-passing signals in 14 nights (vs ≤2 in the no-library arm), the deterministic verifier rejects ≥95% of curriculum tasks that fail re-run (self-verification precision, mirroring the paper's −73% finding that the verifier is the load-bearing component), and library retrieval (top-5) is cited in ≥50% of successful proposals (composition is happening). **REJECT the library design if** no-library arm matches within 25%, or verifier precision < 90% (self-graded success is rubber-stamping), or the curriculum proposes duplicate/covered tasks >30% of the time (the 2082 novelty check then needs strengthening first).

## 14. Improvement experiment
Beyond the paper: add a **skill-graph with dependency edges** (signal B's code imports signal A's output) and let the curriculum explicitly propose "gap" tasks — lanes where the graph has no nodes (e.g., no referee-crew node). Hypothesis: graph-aware curricula avoid the paper's own plateau failure (Voyager without a library plateaus; a library without coverage-awareness plateaus differently — it over-explores dense lanes). Test by comparing coverage-entropy of the discovered-signal distribution with and without graph-aware tasking over 30 nights.
