# [1310] LLM-SoccerArena: Benchmarking LLMs on Real-World Predictions in Sports (arXiv:2607.24573)

**Citation:** Schröder, J., Schweisthal, J., Müller, O., Weinmann, M. & Feuerriegel, S. (2026). *LLM-SoccerArena: Benchmarking LLMs on Real-World Predictions in Sports*. arXiv:2607.24573. URL: https://arxiv.org/abs/2607.24573
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — prospective LLM-forecasting protocol with Brier-scored, calibration-checked, web-search-annotated evaluation; directly adaptable as GSE's LLM-vs-engine forecast benchmark and evidence-synthesis module.

## 1. Research question
Can large language models forecast real-world sports outcomes before they are known, and what matters more — the model, web search access, prompting strategy, or forecast horizon? The paper introduces LLM-SoccerArena, a prospective live benchmark protocol that registers unresolved sports events, records timestamped schema-validated LLM forecasts before outcomes are known, and evaluates them factorially (model × information access × prompting × horizon).

## 2. Dataset / schema
2026 FIFA World Cup: all 104 matches among 48 teams + 15 tournament questions (12 group winners, 4 semifinalists, champion, top scorer's team). Design: 104 matches × 7 LLMs × 3 horizons × 2 access conditions × 2 prompting strategies = 8,736 match forecasts; 15 × 7 × 2 × 2 = 420 tournament forecasts. Per-forecast records: exact prompt, model version (OpenRouter endpoint ID), raw response, parsed forecast (H/D/A probability vector, mean goals, most-likely scoreline, self-reported confidence, generated rationale/"evidence"), observed tool use, latency, token use, cost, scheduled + actual timestamps. Public dataset: https://github.com/jonas-srd/world_cup_LLM_rank/blob/main/data/worldcup2026-full-prediction-dataset-2026-07-21.csv.

## 3. Method / model
Prospective benchmark protocol in four steps: (1) event registration of unresolved matches/questions with resolution rules; (2) cron-scheduled forecast collection at T−24h and T−2h before kickoff plus stage opening via OpenRouter, prompts deliberately minimal (competition, teams, venue, kickoff, structure only — no curated form/injuries/odds); (3) deterministic schema validation with one repair call for invalid responses; (4) outcome resolution only after forecasts are archived, then evaluation. Factorial analysis: 10,000 two-sided sign-flip permutations on within-match metric differences with Holm correction. Models tested: GPT-5.5, Claude Opus 4.8, Gemini 3.1 Pro Preview, Grok 4.3, DeepSeek V4 Pro, Qwen 3.7 Max, Mistral Large 2512.

## 4. Equations & assumptions
- Match forecast: p_i = (p_i,H, p_i,D, p_i,A) ∈ Δ₂ (simplex)
- Brier: BS_i = Σ_c (p_i,c − y_i,c)²; log loss: LL_i = −log p_i,Yi
- Tournament k-set questions: marginal probabilities ρ_q,j ∈ [0,1] with Σ_j ρ_q,j = k_q
- Advancement probabilities for knockout matches: a_i,H + a_i,A = 1 (separate from 90-min H/D/A)
- Assumptions: minimal prompts test reasoning, not data plumbing; web search retrieval traces reveal information synthesis; self-reported confidence is usable as a relative (not absolute) signal; frozen snapshots make releases reproducible.

## 5. Features / target
Inputs: basic event metadata only (competition/teams/venue/kickoff/knockout status); web search optionally enabled (open-book vs closed-book). Target: 90-minute H/D/A outcome probabilities, mean goals, most-likely scoreline, advancement probabilities (knockout), self-reported confidence, generated rationale. Horizons: stage opening, T−24h, T−2h.

## 6. Validation design
Fully prospective: forecasts timestamped before outcomes known. Metrics: Brier score (primary), log loss, modal H/D/A accuracy, exact-score accuracy, Kicktipp-style Scoring System (5 exact / 2 goal-difference / 1 tendency). Baselines: de-vigged closing bookmaker odds; pairwise model comparisons; equal-weight ensemble vs members. Significance via sign-flip permutations with Holm correction. 95% CIs via match bootstrap.

## 7. Numerical results / baselines
- T−24h complete-panel Brier: Gemini 0.506 [0.433, 0.587] … Mistral 0.546 [0.493, 0.604]; NO pairwise model comparison significant after Holm (smallest adjusted p = 0.055, GPT vs Mistral)
- Open-book T–2h vs de-vigged closing market: Gemini Brier 0.497 vs market 0.498 — essentially market-equal
- Open-book improvement: Brier 0.535 → 0.512; paired closed−open Δ = 0.0228, 95% CI [0.0044, 0.0403], Holm p = 0.045 (4.3% reduction) — web access is the biggest lever, model choice is small
- Horizon: T−24h vs T−2h open-book Δ = 0.0021 Brier — forecasting closer adds almost nothing
- Forecast diversity: mean pairwise correlation of H/D/A probabilities = 0.943; mean Jensen–Shannon divergence = 0.0044; equal-weight ensemble improves average member by only 0.0047 Brier
- Search used in only 84.5% of open-book forecasts (model-specific 48.4%–100%); open-book adds ~22,306 input tokens, ~885 output tokens, +3.92s latency, +$0.110 per forecast
- Prompt order: score-first vs probabilistic Δ = −0.0008, CI [−0.0044, 0.0029], Holm p = 0.693 (no effect); probabilistic prompting yields +3.98 pp more draw scorelines
- Evidence analysis (1,456 rationales, GLM 5.2 annotator + blinded human audit of 196): open-book mentions recent form +68.0 pp, odds +60.2 pp, injuries/lineups +53.0 pp; generic unsupported claims −18.1 pp
- Calibration: broadly diagonal but some probability ranges deviate; within-cell confidence ranking: highest-confidence group Brier 0.423 vs lowest 0.620; modal accuracy 73.1% vs 49.8% — confidence is informative but NOT calibrated

## 8. Code / data availability
Platform: https://www.llm-soccerarena.com/ (MIT license). Code: https://github.com/jonas-srd/world_cup_LLM_rank/tree/main. Dataset CSV linked above.

## 9. Leakage & limitations
Paper submitted 2026-07-27, after the 2026 World Cup final — the "prospective" claim rests on the authors' own timestamped archive, which readers cannot independently verify was truly pre-registration; only one tournament (104 matches) — small sample, no league coverage yet; the fictional-sounding model names (GPT-5.5, Claude Opus 4.8, Gemini 3.1 Pro, DeepSeek V4, Qwen 3.7) indicate the case study is hypothetical/futuristic or the models are anonymized stand-ins, weakening direct model-to-model conclusions; evidence annotation used an LLM annotator (GLM 5.2), circular but audited; rationales ≠ private reasoning; no NFL or US-sports validation; cost/tokens are API-specific.

## 10. GSE overlap
New capability: GSE's LLM/NLP lane has no prospective LLM-vs-engine forecast benchmark and no calibrated evidence-synthesis protocol. Directly relevant to GSE's standing calibration mandate — the paper's Brier-scored, calibration-checked evaluation protocol and its finding that LLM ensembles are highly redundant (corr 0.943) argue against naïve LLM averaging and for a single well-prompted forecaster with web access. Extension, not duplicate: applies their protocol to NFL games as an additional evaluator alongside GSE's engine.

## 11. GSE implementation spec
Build: a prospective NFL benchmark harness — for each week, register upcoming games, prompt one or two LLMs with minimal game metadata at T−24h and T−2h, record timestamped probability vectors over {home, away} + expected scores + self-reported confidence + retrieved evidence, validate schemas, archive before kickoff, resolve after games, and score Brier/log loss vs GSE engine probabilities vs market odds. Use the evidence-category taxonomy (odds, form, injuries/lineups, rankings, tactics) on rationales. Effort: ~1 week scaffold + weekly run cost of cents per forecast; reuses paper's open-source evaluation code as reference.

## 12. Reproducible test
Run the harness over one NFL season's games with two LLMs and GSE's engine; primary metric: mean Brier on {home win, away win} probabilities vs engine vs closing market consensus; gate on whether open-book LLM forecasts beat closed-book by ≥0.02 Brier (replicating the paper's 0.0228 effect) and whether the LLM adds incremental value to a linear opinion pool with the engine.

## 13. Acceptance / rejection gate
ADOPT the harness if (a) the open-vs-closed book effect replicates at ≥0.02 Brier on NFL games AND (b) an LLM+engine opinion pool improves mean Brier over the engine alone by ≥0.005 on the test season. REJECT as an engine input if neither; keep only as a QA/benchmark tool.

## 14. Improvement experiment
Feed the LLM the GSE engine's feature summary as an evidence block (an "engine-informed" condition alongside open/closed-book) to test whether LLM synthesis can add value on top of the model's numbers — directly testing the paper's claim that web access, not model choice, is the dominant lever.
