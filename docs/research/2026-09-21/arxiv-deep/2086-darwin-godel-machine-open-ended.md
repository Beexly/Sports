# [2086] Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents (arXiv:2505.22954)

**Citation:** Jenny Zhang, Shengran Hu, Cong Lu, Robert Tjarko Lange, Jeff Clune (2025). *Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents*. arXiv:2505.22954 (version verified via export API; v3 current). URL: https://arxiv.org/abs/2505.22954
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–5, Figures 1–4).
**Verdict:** ADAPT — the archive-of-stepping-stones + parent-selection + staged-evaluation design is the long-horizon memory the GSE discovery loop needs; the self-modifying-agent machinery itself is overkill for GSE, but the archive mechanics port directly.

## 1. Research question
Can the Gödel machine's dream — an AI that provably improves itself — be realized empirically: a system that iteratively rewrites its own code (thereby improving its own ability to self-modify), validates each change on coding benchmarks, and sustains open-ended improvement without human-designed search spaces? The DGM targets coding agents built on frozen foundation models, where better benchmark performance is assumed to indicate better self-modification ability.

## 2. Dataset / schema
- **SWE-bench Verified** (human-filtered solvable subset of SWE-bench; Python, multi-file repo tasks).
- **Polyglot** (multi-language: C++, Rust, Python; primarily single-file implementation; evaluated pass@1 — stricter than the leaderboard's pass@2).
- Initial agent: FM + Bash tool + whole-file edit/view tool; single prompt specifying repo location, problem statement, testing framework.
- Self-modification FM: Claude 3.5 Sonnet (New); evaluation FM: Claude 3.5 Sonnet (New) for SWE-bench, o3-mini for Polyglot. 80 iterations (one new agent each), 2 parallel for SWE-bench, 4 for Polyglot.

## 3. Method / model
The DGM alternates self-modification and evaluation phases (Section 3, pseudocode in A.4):
1. **Archive:** initialized with one agent; accumulates ALL generated variants (not just the best) — "stepping stones," including interesting-but-suboptimal solutions.
2. **Parent selection (A.2):** roughly proportional to each agent's performance score AND the number of its children with codebase-editing functionality (rewards lineages that stay modifiable).
3. **Self-modification (A.3):** the selected parent analyzes its own benchmark evaluation logs, proposes the next feature as a problem statement, then implements it into its own codebase → new agent.
4. **Staged evaluation (4.2):** cheap-to-expensive — first 10 tasks (verify codebase-editing ability; non-editing agents discarded and never archived); then 50 tasks (SWE-bench-verified-mini / random Polyglot subset); if >40% on the 60-task subset AND top-2 in archive → 200 tasks (SWE-bench). This mirrors the "evaluate more when more confident" principle.
5. **Open-endedness guard:** the archive/parent-selection machinery itself is fixed (not self-modifiable) — a deliberate scope limit.
6. **Safety:** sandboxed execution, strict time limits, human oversight, traceable lineage of every modification.

## 4. Equations & assumptions
No equations stated (systems paper; pseudocode in Appendix A.4). Assumptions (explicit): benchmark performance proxies self-improvement ability; frozen FMs suffice (no FM retraining); Python is Turing-complete enough for arbitrary self-modification; empirical validation substitutes for the Gödel machine's proof requirement; >40% staged-evaluation threshold is a reliable promotion signal given LLM stochasticity.

## 5. Features / target
Inputs: parent agent codebase + its benchmark evaluation logs. Output: child agent codebase. Target: % tasks solved on SWE-bench Verified / Polyglot; transfer across FMs (o3-mini, Claude 3.7 Sonnet) and across languages (Python-trained → other languages).

## 6. Validation design
- 80-iteration runs on each benchmark; staged subsets (10 → 50/60 → 200 tasks).
- Two ablations (Section 4.3): **DGM w/o self-improve** (meta-agent fixed as the initial agent — replicates ADAS); **DGM w/o open-ended exploration** (no archive; always modify the latest functional self).
- External baselines: checked open-source SoTA on SWE-bench; Aider on Polyglot; same subsets, dotted lines in Figure 2.
- Transfer tests: swap FM at evaluation; train-on-Python → evaluate on other languages.

## 7. Numerical results / baselines
(Exact quotes.)
- **SWE-bench:** 20.0% → **50.0%** over 80 iterations; best DGM agent comparable to the checked open-source SoTA (still below closed-source SoTA).
- **Polyglot:** 14.2% → **30.7%** on the full benchmark (subset trajectory 14.0% → 38.0%); discovered agent "far surpasses Aider" despite starting below it.
- **Ablations (Figure 2):** both DGM w/o self-improve and DGM w/o open-ended exploration underperform the full DGM — "both components are essential for continual self-improvement." Key qualitative finding (Figure 3): "many paths to innovation traverse lower-performing nodes" — the final best agent's lineage includes two performance dips; key innovations (e.g., node 24) trigger explosions of follow-on innovations built on them.
- **Discovered improvements:** finer-grained edit tool (line-level view, string-replacement editing instead of whole-file), multi-attempt workflows, peer-review selection among candidate solutions, conditioning on previous attempts.
- **Transfer:** FM swap (Claude 3.5→3.7/o3-mini) preserves gains (e.g., 19.0%→59.5% with Claude 3.7 Sonnet on SWE-bench/200 tasks); Python-trained agent transfers to unseen languages "comparable to the DGM trained on all languages and substantially outperforms both the initial agent and Aider."
- **Cost:** a single SWE-bench run ≈ 2 weeks + "significant API costs" (B.1).

## 8. Code / data availability
All code open-sourced: https://github.com/jennyzzt/dgm.

## 9. Leakage & limitations
SWE-bench is "likely included in the training sets of FMs" (authors' own caveat — Polyglot added partly as the cleaner benchmark); staged subsets are small (10/50/60 tasks) so promotion decisions are noisy despite the 40% heuristic; 2-week/API-cost runs limit iteration; open-endedness machinery is hand-fixed (not itself evolved); still below closed-source SoTA. For GSE: the direct analogue of benchmark contamination is backtest overfitting — an archive that rewards benchmark score will hill-climb on the holdout if the holdout is reused (the paper's staged evaluation on the SAME benchmark subsets has exactly this flavor; GSE must keep a truly locked final season).

## 10. GSE overlap
**MOVE-37 FLAG:** The DGM is the strongest published precedent for the MOVE-37 thesis — a self-improving loop where the system rewrites its own discovery machinery and validates empirically. For GSE the portable insight is narrower but high-value: keep an **archive of ALL tried signals (not just winners)**, select parents by performance × modifiability, and use staged evaluation (cheap sanity backtest → full backtest → locked-season validation). Existing-map check: no evolutionary/open-ended archive exists in the corpus; the gse-lab artifacts are winner-only snapshots. The DGM's "stepping stones" finding — breakthroughs traverse lower-performing nodes — argues against GSE's implicit hill-climbing (keep only what beats the current best). **New capability** (archive mechanics + staged evaluation); complements ledgers 2082–2085.

## 11. GSE implementation spec
Adapt the DGM's archive + staged evaluation into the discovery loop (2082/2085):
1. **Signal archive (SQLite):** every attempted signal — code, hypothesis, evaluator scores at each stage, parent id, "interestingness" note (the self-reflection from 2084). Never delete losers; they are stepping stones.
2. **Parent selection for composition:** when the idea generator proposes a "compose/mutate" idea, sample parents with probability ∝ (gate margin) × (number of successful children) — the paper's A.2 rule, translated: prefer signals that were productive parents even if not the current best.
3. **Staged evaluation:** Stage 0 — 10-game smoke test (does the feature compute without NaNs/leakage on a tiny slice?); Stage 1 — full 2015–2024 backtest (cheap, in-sample-ish); Stage 2 — 2025 holdout ΔBrier gate (only if Stage 1 passes a lenient screen, e.g. ΔBrier > 0 on train); Stage 3 — locked final validation on a NEVER-touched season (e.g., 2014 or a quarantined 2026 slice) before production. This directly ports the 10→50→200 staging and answers the contamination worry.
4. **Effort:** 2 days (archive schema + parent sampler + stage runner) on top of the 2082/2085 harness.

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout + locked 2014 season. **Protocol:** run the discovery loop for 30 nights in two arms: (a) winner-only memory (keep top-5 signals, always mutate the best — the paper's "w/o open-ended exploration" arm), (b) full DGM-style archive with parent sampling. **Metrics:** count of Stage-3-passing signals; mean Stage-3 ΔBrier; and the "stepping-stone rate": fraction of final winners whose lineage includes a Stage-2 failure (the paper's signature finding).

## 13. Acceptance / rejection gate
**ADOPT the archive + staging if:** arm (b) produces ≥2× the Stage-3-passing signals of arm (a) over 30 nights, ≥1 winner has a failed node in its lineage (stepping stones are real, not just theory), and Stage-0/1 screening discards ≥70% of ideas before the expensive Stage-2 holdout (staging is saving compute). **REJECT if** arm (b) ≈ arm (a) within 25% (archive adds nothing), or any Stage-3 winner fails when re-run from its archived code (lineage not reproducible), or Stage-2 scores degrade when the holdout is swapped (2014↔2025) by more than the effect size (the loop is hill-climbing on a specific holdout — the paper's contamination failure mode).

## 14. Improvement experiment
Beyond the paper: make parent selection **multi-objective** — score parents by (gate margin, novelty vs archive embedding, lineage productivity) with an explicit diversity bonus (MAP-Elites style grid over signal families: matchup, weather, rest, market-microstructure...). Hypothesis: the paper's performance-proportional sampling still under-explores thin lanes; a quality-diversity archive fills the GSE thin lanes (special teams, referees) the curriculum (2083) wants to target. Test: compare lane-coverage entropy of winners after 30 nights, QD-archive vs performance-proportional.
