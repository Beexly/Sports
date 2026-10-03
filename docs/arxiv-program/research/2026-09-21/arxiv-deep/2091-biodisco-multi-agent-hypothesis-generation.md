# [2091] BioDisco: Multi-agent hypothesis generation with dual-mode evidence, iterative feedback and temporal evaluation (arXiv:2508.01285)

**Citation:** Yujing Ke et al. (2025). *BioDisco: Multi-agent hypothesis generation with dual-mode evidence, iterative feedback and temporal evaluation*. arXiv:2508.01285 (version verified via export API; v2 current). URL: https://arxiv.org/abs/2508.01285
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Abstract + Sections 1–4 + evaluation sections).
**Verdict:** ADAPT — the dual-mode evidence grounding (structured knowledge graph + literature retrieval) plus the Critic/Reviewer refinement loop and temporal "future discovery" evaluation are the missing rigor pieces for GSE hypothesis generation; the Bradley–Terry paired-comparison protocol ports directly to judging competing signal hypotheses.

## 1. Research question
Automated hypothesis generation struggles with grounded novelty, iterative refinement, and rigorous evaluation of future-discovery potential. Can a multi-agent framework that (a) grounds hypotheses in dual-mode evidence (biomedical knowledge graphs + automated literature retrieval), (b) refines them through an internal scoring/feedback loop (Scientist → Critic → Reviewer agents), and (c) validates via temporal evaluation (predicting post-cutoff discoveries) plus Bradley–Terry paired comparisons, generate hypotheses with superior novelty and significance vs existing agentic architectures?

## 2. Dataset / schema
- **Evidence sources:** biomedical knowledge graphs + automated literature retrieval (PubMed-style); agents supply keyword sets per invocation (background: keywords only; evaluation: hypothesis included; revision: hypothesis + low-score feedback).
- **Evaluation:** (1) temporal evaluation on two held-out datasets of "future" discoveries — can the system, with only pre-cutoff data/literature, generate hypotheses implying relationships discovered after the cutoff (the Sybrandt et al. rediscovery paradigm); (2) human expert evaluation with a structured questionnaire (novelty/verifiability/significance/relevance rubric, Figure 8); (3) model-based ablation via Bradley–Terry paired comparisons accounting for ties (Davidson 1970 extension fitted separately, similar results; ties treated as half-wins) and order effects.
- Baselines: ablated configurations "representative of existing agentic architectures."

## 3. Method / model
Pipeline (Figure 1), overseen by a planner:
1. **Explorer/Background agents** search literature and query the knowledge graph for articles/subgraphs relevant to the user topic.
2. **Scientist agent** integrates both evidence modes into initial hypotheses.
3. **Critic** scores each hypothesis on novelty, verifiability, relevance, significance (following Qi et al. 2024), with numerical scores + strengths/weaknesses comments.
4. **Reviewer agent** diagnoses specific deficiencies (low novelty, weak evidence) and prescribes targeted refinement strategies: deeper KG queries via Explorer, refined literature search via Background agent, or revisiting original background for topic alignment.
5. **Decision module** monitors Critic scores across rounds; collects hypotheses exceeding a predefined threshold; discards or presents to the user with supporting evidence.
Packaged as a pip tool (pypi.org/project/biodisco; github.com/yujingke/BioDisco), "runnable with just a few lines of code."

## 4. Equations & assumptions
No equations stated in the extracted sections (Bradley–Terry model referenced for paired comparisons; Davidson 1970 tie extension fitted). Assumptions: KG + literature coverage suffices for grounded novelty; Critic scores (LLM-judged) proxy true hypothesis quality; temporal rediscovery predicts future-discovery ability; paired LLM comparisons with order-effect controls are unbiased enough for ablations.

## 5. Features / target
Inputs: user-specified research topic; dual-mode evidence. Targets: scored hypotheses; evaluation targets = temporal rediscovery accuracy (binary classification of entity-pair relations by a classifier agent — "high precision and recall," Table 1), human-expert scores, Bradley–Terry win rates vs ablations.

## 6. Validation design
- Temporal: pre-cutoff evidence only → predict post-cutoff discoveries (two held-out datasets).
- Human: expert questionnaire on CVD + immunology cases (Tables 8–9 show initial→refined hypothesis examples).
- Ablation: Bradley–Terry with ties/order effects comparing full system vs ablated configurations.
- No train/test ML splits (generative evaluation design).

## 7. Numerical results / baselines
(Exact quotes; the paper reports qualitative superiority with model-based statistics rather than headline accuracy numbers in the sections read.)
- "Our evaluations demonstrate superior novelty and significance over ablated configurations representative of existing agentic architectures."
- Temporal evaluation: "assesses the system's capacity for genuine discovery, by determining if it is able to predict discoveries made after a certain time cutoff, with access only to data and literature before it"; the classifier agent on generated hypotheses "achieved high precision and recall, indicating that the hypotheses generated by BioDisco contain accurate and discernible relational signals" (Table 1).
- Bradley–Terry: ties as half-wins; Davidson (1970) tie-explicit extension "yielded very similar results (not presented here)."

## 8. Code / data availability
Package: https://pypi.org/project/biodisco; Code: https://github.com/yujingke/BioDisco.

## 9. Leakage & limitations
The temporal evaluation is the anti-leakage design, but KG/literature snapshots must be strictly pre-cutoff or the test is void (the paper asserts this; snapshot discipline details matter); Critic scores are LLM-judged — the same judge-bias problem as other lanes (no human-score correlation reported in sections read); "high precision and recall" is unquantified in the extracted text; biomedical transfer to sports is analogical, not demonstrated. For GSE: the Critic must be the deterministic backtest gate, not an LLM judge, or the refinement loop optimizes judge-pleasing hypotheses.

## 10. GSE overlap
**MOVE-37 FLAG:** BioDisco's three contributions map to three gaps in the MOVE-37 loop: (1) dual-mode evidence grounding → GSE hypotheses should be grounded in BOTH structured data (nflverse/FTN charting = the "knowledge graph") AND the literature corpus (docs/research + the wave5-dedup base = "literature retrieval") before code runs — today the idea generator has no evidence-grounding step; (2) the Critic/Reviewer refinement loop → a structured pre-execution review of each hypothesis (the 2085 "grant-proposal" check, made multi-agent); (3) temporal evaluation → the "future discovery" test is EXACTLY the walk-forward/held-out-season discipline: a signal only counts if it would have been discovered using pre-cutoff data. The Bradley–Terry protocol ports to comparing competing signal hypotheses pairwise by backtest margin. Existing-map check: no evidence-grounded hypothesis generation or paired-comparison judging in the corpus. **New capability** (rigor layer for the idea stage).

## 11. GSE implementation spec
Add a **pre-execution evidence + review stage** to the discovery loop (runs before the 2082 executor):
1. **Dual-mode grounding:** for each proposed hypothesis, (a) structured check — query nflverse/FTN for the relevant base rates (e.g., "divisional unders hit 54% 2015–2024" — the KG analogue); (b) literature check — grep/embedding-search docs/research + wave5-dedup base for prior coverage (the novelty filter from 2082, made evidential).
2. **Critic agent:** scores the grounded hypothesis on novelty, verifiability (is there enough data to test it?), relevance (does it target a thin lane or a real edge?), significance (what's the plausible effect size?) — with the deterministic backtest as the final arbiter, not the Critic's score.
3. **Reviewer agent:** prescribes refinement (narrow the hypothesis, add a guard condition, expand the sample) or kills it before any compute is spent.
4. **Bradley–Terry judging:** weekly, pairwise-compare that week's candidate signals by holdout ΔBrier margin; maintain ratings to prioritize which signals get Stage-3 locked-season validation first.
5. **Effort:** 2 days (grounding queries + Critic/Reviewer prompts + BT rating table).

## 12. Reproducible test
**Dataset:** nflverse 2015–2024 + 2025 holdout. **Protocol:** 20 hypotheses; arm A = direct to executor (2082-style); arm B = BioDisco-style grounding + Critic/Reviewer pre-screen, only passing hypotheses go to the executor. **Metrics:** gate-pass rate per hypothesis; compute wasted on hypotheses the Reviewer would have killed (backtest CPU-hours); and a temporal-rediscovery sanity check — withhold 2024–2025 data, ask the system to "rediscover" 3 known GSE edges (e.g., turnover-luck regression, wind effects) from pre-2024 evidence alone.

## 13. Acceptance / rejection gate
**ADOPT if:** arm B's gate-pass rate ≥ arm A's while using ≤60% of the backtest compute (the pre-screen kills losers cheaply), the temporal-rediscovery check recovers ≥2/3 known edges (grounding works), and Bradley–Terry ratings after 4 weeks rank-order signals consistently with their eventual Stage-3 outcomes (Spearman ≥ 0.6 — the judging protocol is predictive). **REJECT if** the Critic/Reviewer kills >40% of hypotheses that would have passed the gate (the screen is too conservative — it's destroying discovery), or rediscovery fails (evidence grounding is theater), or BT ratings are uncorrelated with outcomes (pairwise judging adds noise).

## 14. Improvement experiment
Beyond the paper: make the Critic **calibrated** — track each Critic score dimension against eventual backtest outcomes and fit a calibration map (like the 2082 reviewer calibration on ICLR papers, but here: Critic novelty/verifiability/relevance/significance scores → P(gate pass)). Hypothesis: a calibrated Critic becomes a cheap pre-filter whose expected-value ranking beats the raw threshold rule, and its calibration curve reveals which score dimensions actually predict betting-signal success (my bet: verifiability dominates novelty). Test over 8 weeks of logged hypotheses.
