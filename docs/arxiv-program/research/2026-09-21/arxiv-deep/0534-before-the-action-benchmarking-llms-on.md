# [0534] Before the Action: Benchmarking LLMs on Prospective Hypothesis Discovery (arXiv:2607.15766v1)

**Citation:** Tianyun Zhong, Wangyi Jiang, Wei Wang, et al. (2026). *Before the Action: Benchmarking LLMs on Prospective Hypothesis Discovery*. arXiv:2607.15766v1. URL: https://arxiv.org/abs/2607.15766v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 99072 chars; all sections §1–§6, appendices §7–§14 incl. leaderboards, data-construction protocol, rubrics, annotation details read; references skimmed).
**Verdict:** REJECT — an LLM benchmark-evaluation paper (prospective hypothesis-discovery ranking of chat models) with no sports data, no predictive model, and no statistical method novel to GSE; its one transferable element (pairwise arena + Bradley–Terry–Davidson ranking) duplicates the BT ranking machinery already inventoried in Garrett's corpus.

## 1. Research question
Do frontier LLMs possess "Prospective Hypothesis Discovery" (PHD) — the ability, from a pre-conclusion pile of anomalous observations and fragmented records, to autonomously construct a grounded, discriminative, testable hypothesis space that guides subsequent investigation? The paper defines the task, builds the HypoArena benchmark (988 cases, 6 domains), and evaluates 15 frontier LLMs under the HypoEval protocol.

## 2. Dataset / schema
HypoData: 988 cases across 6 domains — scientific: Biomedical Science (244 cases from Nature Communications, Cell Reports, eLife, NAR, PLOS Biology, PNAS, Science Advances, PubMed Jul 2025–Apr 2026), Machine Learning (218 ICLR 2026 submissions, stratified by accept/reject), Social Science (163 articles, 7 journals, 2025–2026); analytical: Financial Analysis (114; SEC 10-Q + analyst reports, ~3.99 hypothesis–evidence pairs/case), IT Operations (146 post-mortems, ~3.29 H-E pairs/case), Safety Investigation (103 NTSB/CSB reports, ~3.87 H-E pairs/case). Total 2,012 hypothesis–evidence pairs, overall ~3.67 pairs/case. Each case = model-visible "conclusion-free" context (∼3,000 tokens) + held-out reference hypothesis–evidence set (∼1,000 tokens/pair). Built via a Forge–Audit agent loop (forge constructs, audit agent checks leakage/faithfulness/supportability, iterate until pass). Human quality audit (2–3 expert annotators, 3 domains): 92% overall pass (informativeness 95%, openness 100%, completeness 100%, supportiveness 97%).

## 3. Method / model
HypoEval: dual-track evaluation of submitted hypothesis sets. (1) Rubric-based Arena (primary): pairwise LLM-as-judge comparison of two models' hypothesis sets on a shared context; 5-level verdict {A≫B, A>B, A≈B, B>A, B≫A} → win-shares {1.0, 0.75, 0.5, 0.25, 0.0}; position debiasing (both orders judged, averaged, polarity-consistency required); global ranking aggregated by the Bradley–Terry–Davidson model (ties modeled as a distinct epistemic state via tie parameter θ), initialized at 1500. (2) Rubric-based Scoring (diagnostic): absolute 1–5 scores on 6 shared dimensions, aggregated to Q_pair (pair-level: Contextual Grounding, Inferential Insight, Evidential Justification) and Q_set (set-level: Hypothesis-Space Breadth, Directional Distinctness, Analytical Utility). Two generation modes: Baseline (single-pass zero-shot) vs Agent (sequential composition from a 12-skill library of structured analytic techniques — ACH, structured brainstorming, chronology analysis, etc. — adapted from Pherson & Heuer intelligence-analysis methods).

## 4. Equations & assumptions
- PHD task: 𝒞 → ℋ = {(h_i, e_i)}_{i=1..K}; each h_i grounded and verifiable; when K>1 hypotheses must be mutually discriminative.
- Arena mapping: 5-level categorical verdicts → win shares w ∈ {1.0, 0.75, 0.5, 0.25, 0.0}; BTD (Davidson 1970) aggregation with tie parameter θ; baseline rating 1500.
- Rubric formulas: q_i = (g_i + ℓ_i + j_i)/3; Q_pair = (1/K)Σq_i; Q_set = (b+d+u)/3 (b: breadth, d: distinctness, u: utility); singleton set: Q_set = (b+u)/2.
- Assumptions: (a) Retrospective Context Regression can reconstruct a "conclusion-free" context (operational, not exact history); (b) the source-derived reference is one valid answer, not the unique answer; (c) LLM-as-a-judge (seed-2.0-pro) approximates expert preference; (d) pairwise comparison discriminates where absolute scoring compresses.

## 5. Features / target
Target: ranking of 15 LLMs by PHD capability (BTD rating + win rate), plus per-dimension diagnostic profiles (6 rubric dimensions). Domains: Bio, ML, Social, Fin, IT, Safety.

## 6. Validation design
Arena protocol with position debiasing; cross-judge consistency with mimo-v2-pro (Appendix 15); human alignment: 1,500 pairwise comparisons by domain experts, Kendall τ=0.90, Spearman ρ=0.98 vs primary judge (per-domain τ ranges 0.97 Fin → 0.53 Bio, top-tier identical); external validity: ML reference more competitive on accepted ICLR cases (+47 BTD, +0.06 median debiased score, +0.04 win rate); arena vs rubric comparison: per-domain Kendall τ 0.52–0.82, rubric spread <1 point on 1–5 scale (ceiling: 95–98% of scientific-domain assessments ≥4.0). No train/test splits — benchmark/evaluation paper.

## 7. Numerical results / baselines
- Leaderboard (BTD avg / win rate, judge seed-2.0-pro, baseline mode): claude-sonnet-4.6 1654.0 / 71.3%; claude-opus-4.6 1652.7 / 71.4%; gpt-5.4 1631.4 / 70.7%; reference 1590.5 / 57.8%; kimi-k2.6 1582.7 / 58.2%; glm-5.1 1581.9 / 59.1%; deepseek-v4-pro 1535.4 / 46.1%; ... kimi-k2.5 1289.5 / 9.2% (bottom). >360-point spread, clear stratification.
- Agent vs baseline Δ: +88 (kimi-k2.5) to −60 (claude-opus-4.6); Spearman ρ=−0.10 with baseline strength — structured analytic skills are model-dependent, sometimes harmful; failure mode: candidate compression (rich intermediate analysis compressed into narrow final submission).
- Score compression: arena spread 345–490 pts/domain vs rubric <1 point on 1–5 scale — compression ratio 430×–725×.
- Human alignment: Kendall τ=0.90, Spearman ρ=0.98 (1,500 pairwise expert judgments).
- Reference rises 3 positions under rubric scoring in IT/Fin/Social; claude-opus-4.6 falls from top-two arena placement — protocol-dependent ordering.
- Limitations (stated): text-centric only; construction pipeline relies on a single model (gpt-5.4) for Forge; fixed 12-skill library.

## 8. Code / data availability
Code, data, evaluation tools: https://github.com/SKYLENAGE-AI/HypoArena and https://huggingface.co/datasets/HypoArena/HypoData (both stated public).

## 9. Leakage & limitations
Author-stated: text-centric; single-model (gpt-5.4) Forge construction → model-specific bias; judge panel narrow (two judges + human audit); fixed skill library doesn't capture fluid human inquiry; per-domain human–LLM alignment degrades in biomedical (τ=0.53, "interdisciplinary noise"). Evaluation uses LLM-as-judge, whose own PHD ability is unverified in this paper. Transfer limits: zero sports data, zero predictive modeling, zero NFL-transferable statistics; the benchmark evaluates chat models on open-ended reasoning, not anything GSE consumes. The conclusion-free-context reconstruction idea is a data-curation trick for benchmark builders, not a GSE method.

## 10. GSE overlap
No overlap with GSE's substantive research agenda. Garrett's corpus inventories Bradley–Terry (as a ranking/prediction model) — the BTD aggregation here is a repackaging of that same machinery for model ranking, not a new capability. Garrett's program evaluates GSE's engine by P&L and predictive metrics, not by LLM-judge arenas, so the evaluation protocol has no application to the Sports system. No existing corpus work involves LLM benchmarks, hypothesis-discovery evaluation, or arena judging — this paper occupies a different universe. Nothing to dedupe against.

## 11. GSE implementation spec
None — no implementation recommended. The closest conceivable transfer (use BTD pairwise arenas to rank GSE narrative/write-up variants judged by an LLM) would be a marketing-voice tool, not a prediction improvement, and Garrett's standing rules (9.2 human-voice floor, qi-check gate) already cover voice quality without this machinery. Building the HypoData pipeline for GSE would be months of work toward a benchmark Garrett has not asked for. Do not implement.

## 12. Reproducible test
Not applicable — REJECT verdict means no GSE test is specified. (If Garrett ever wanted an LLM-as-judge sanity check on GSE write-ups, the cheap test would be: pair two weekly write-up variants, have a judge pick per the six rubric dimensions, verify Kendall τ against his own preference on 50 pairs ≥0.85 — but this serves the copy lane, not the engine.)

## 13. Acceptance / rejection gate
REJECT. The paper passes no gate into GSE because it offers nothing GSE predicts with: no dataset schema for games, no statistical estimator, no model improvement. It is an LLM-evaluation artifact. The one methodological nugget (arena + BTD for open-ended ranking) is filed as a known-alternative to the existing Bradley–Terry inventory; if Garrett ever commissions LLM-judge evaluation of GSE outputs, this paper is the reference to reopen — not before.

## 14. Improvement experiment
None for GSE — no transfer. Improvement experiment (for the record, if revisited): extend HypoEval to domain-transfer — evaluate whether arena rankings obtained on scientific cases predict rankings on analytical cases, testing whether PHD is a general model capability or domain-specific; the paper's per-domain rankings already hint at protocol×domain interaction (reference 3 positions higher under rubric scoring in some domains) that a cross-domain consistency study would sharpen.
