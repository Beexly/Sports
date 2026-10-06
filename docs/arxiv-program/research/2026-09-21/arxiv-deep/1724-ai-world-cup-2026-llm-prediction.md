# 1724 AI World Cup 2026: benchmarking large language models for end-to-end football tournament prediction (arXiv:2608.03416v1)

**Citation:** Jonaid Shianifar, Iias Faiud (2026). *AI World Cup 2026: Benchmarking Large Language Models for End-to-End Football Tournament Prediction*. AI World Cup Project. arXiv:2608.03416v1. URL: https://arxiv.org/abs/2608.03416v1
**Ledger completed:** 2026-09-22. **Read:** full text (PDF, 18 pages, all sections, tables 1–2, figures, appendices A1–A3).
**Verdict:** ADOPT — the prospective, single-snapshot, common-schema tournament-forecasting protocol with transparent additive scoring and stage-decomposition audit is directly adoptable for GSE's NFL season/playoff forecasting evaluation, and its scoring-design critique (knockout r=0.986 drives the ranking; confidence uncorrelated with accuracy) is a mandatory read before GSE designs any composite leaderboard.

## 1. Research question

Does forecasting an entire tournament test something different from predicting matches one at a time? Ten LLM assistants made a single pre-tournament forecast of the full 2026 FIFA World Cup (48 teams, 104 matches) under identical conditions — same snapshot, prompt, JSON schema, scoring code — and the paper asks: which models win, where the leaderboard separation comes from (group vs knockout), whether match-level accuracy agrees with tournament-level score, and whether self-reported confidence means anything.

## 2. Dataset / schema

- One frozen tournament snapshot (prompt + team data) issued to all models pre-tournament; predictions collected manually via consumer interfaces (not APIs), raw responses preserved.
- Ten submissions from seven providers: GPT-5.5 Thinking, GPT-5.5, Qwen 3.7, Gemini, DeepSeek, Claude Sonnet 4.6, Mistral Medium 3.5, Perplexity, Perplexity Pro, Grok.
- Output schema per model: per-match (score, outcome, winner, confidence, reasoning) for 72 group matches; full group rankings; complete knockout bracket; champion/runner-up/third/fourth; individual awards.
- Ground truth: all 104 matches played; Spain beat Argentina 1–0 in the final.

## 3. Method / model

- Additive points scoring, fully specified: per group match S_m = 5·I_exact + 3·I_outcome + 2·I_winner + I_GD (max 11, 9 for exact draws); per group S_g = 5·I_winner + 5·I_top2 + 3·N_qual + 2·N_rank; knockout S_progression = 2·C_R32 + 4·C_R16 + 6·C_QF + 8·C_SF + 12·C_Final (cumulative stage membership); S_placing = 20·I_champion + 10·I_runner-up + 8·I_third + 5·I_fourth. Total = group matches + standings + knockout.
- Audit: stage decomposition, accuracy counts, confidence-vs-accuracy analysis, result provenance checks (monotonic ranks, accuracy fractions mapping to counts), frozen to commit f83ea90.
- Related-work comparison with three contemporaneous 2026 World Cup LLM benchmarks and a v2 roadmap (proper scoring rules, transparent leaderboard, separation of search-enabled systems).

## 4. Equations & assumptions

- Scoring equations (1)–(12) as above; all bonuses cumulative.
- Correlation analysis: Pearson r between component scores and totals (n=10, descriptive).
- Assumptions: consumer-interface responses reflect the named model configuration (labels retained as submitted; serving configs may drift); the single snapshot is fair across models despite different knowledge cutoffs; additive points approximate "forecasting skill" (the paper itself critiques this).

## 5. Features / target

- Input (to models): the frozen pre-tournament snapshot + common prompt.
- Output: the full structured forecast described in §2.
- Evaluation targets: total score, component scores (GS/ST/KO), outcome accuracy, exact-score accuracy, mean confidence, predicted champion.

## 6. Validation design

- Prospective design: predictions recorded before the event — no contamination possible, unlike static QA benchmarks.
- Independent audit of the leaderboard: stage decomposition (Figure 1), normalized profiles (Figure 2), rank trajectories as components are added (Figure 3), group accuracy counts (Table 2), confidence analysis (Figures 4–5).
- Comparison against three contemporaneous benchmarks for external context.

## 7. Numerical results / baselines

- Final: GPT-5.5 Thinking 744 (GS 254 / ST 248 / KO 242), GPT-5.5 717 (261/264/192), Gemini 699 (259/248/192), Qwen 3.7 687 (270/221/196), DeepSeek 599, Claude Sonnet 4.6 591, Mistral 568, Perplexity 552, Perplexity Pro 530 (KO 0), Grok 496 (KO 0).
- Knockout SD 88.65 vs group-match 8.65 and standings 12.20 — knockout creates essentially all separation: corr(total, KO) r = 0.986 (Spearman 0.945); corr(total, group-match) r = 0.055; corr(total, standings) r = −0.103.
- Match-level accuracy gives a different winner: Claude Sonnet 4.6 best group outcome accuracy 63.89% (46/72) but 6th overall; GPT-5.5 Thinking (the champion) only 58.33% (42/72). Exact-score accuracy 6.94–13.89% across models.
- Only GPT-5.5 Thinking picked Spain (champion); champion picks: Brazil 4, France 3, Argentina 2, Spain 1.
- Self-reported confidence uncorrelated with outcome accuracy (r = −0.060) and total score (r = −0.067) — confidence is noise.
- Perplexity Pro ranked 1st on group-match points, 1st after standings, then 9th overall (0 knockout points) — the scoring design, not forecasting skill alone, determined the final order.

## 8. Code / data availability

- Benchmark materials, raw responses, and scoring code released (frozen to commit f83ea90, per the paper). The most reproducible evaluation paper in the wave alongside SportR.

## 9. Leakage & limitations

- n=10 submissions: all correlations are descriptive; the r=0.986 knockout dominance partly reflects the scoring weights chosen by the organizers (knockout points have the largest range by design).
- Models via consumer interfaces: no control over temperature, system prompts, or silent config changes; labels are "submitted configurations," not fixed model versions.
- Path dependence: one early bracket error cascades (Perplexity Pro's 270 group-match points → 0 knockout points) — the composite score punishes bracket inconsistency more than match-level ignorance.
- Points-based scoring instead of proper scoring rules (Brier/log) — the paper acknowledges proper rules would reward honest uncertainty; the chosen scheme rewards confident exactness.

## 10. GSE overlap

- GSE evaluates season-long and playoff forecasting (win totals, playoff brackets, Super Bowl probabilities) — this paper is the methodological template: single pre-season snapshot, common schema, transparent additive scoring, stage-decomposition audit.
- The scoring-design critique is directly applicable to GSE's internal model leaderboards: if one component dominates variance, the leaderboard ranks that component, not overall skill.
- The confidence finding (r ≈ −0.06) is a warning for any GSE product surface that displays model confidence — uncalibrated self-reported confidence is noise.
- Prospective design avoids the contamination problem GSE faces when backtesting LLMs on historical seasons the models may have memorized.
- Dedup clean against the 1,093-ID set.

## 11. GSE implementation spec

- Build `gse/eval/tournament_protocol.py` implementing the paper's protocol for the NFL: (1) freeze a pre-season snapshot (rosters, lines, depth charts as of cutdown day) issued identically to every model under evaluation; (2) require a common JSON schema: per-game (score, outcome, confidence) for all 272 regular-season games, division rankings, full 14-team playoff bracket, Super Bowl champion; (3) score additively with GSE-chosen weights mirroring the paper's structure (game points + standings points + playoff-progression points + placing bonuses); (4) audit with stage decomposition and rank-trajectory plots before publishing any leaderboard.
- Run it prospectively each season: predictions locked before Week 1, scored after the Super Bowl. Keep a frozen, versioned record (the paper's commit-freeze discipline).

## 12. Reproducible test

- Pilot on the 2025 NFL season retrospectively (as a dry run, acknowledging contamination risk for LLMs with 2025 knowledge): run 3+ GSE model configurations through the protocol; success criteria: the pipeline executes end-to-end (schema validation, scoring, audit plots) without manual fixes; stage-decomposition audit identifies which component drives the ranking; confidence-vs-accuracy correlation is computed and reported. The 2026 season then runs prospectively for real.

## 13. Acceptance / rejection gate

ADOPT the protocol (frozen snapshot + common schema + additive scoring + audit) — it is the rare evaluation paper whose method transfers wholesale. Two mandatory modifications from the paper's own critique: (1) add a proper scoring rule (Brier/log-loss) alongside the points leaderboard and report both — the paper admits points reward confident exactness over honest uncertainty; GSE's leaderboard must not conflate the two; (2) normalize component variances before ranking or report component ranks separately — the paper proves an unnormalized composite ranks the highest-variance component (r=0.986). REJECT any GSE leaderboard that displays model self-reported confidence without calibration evidence (paper: r ≈ −0.06, i.e., noise).

## 14. Improvement experiment

Implement the paper's own v2 roadmap items it did not have time for. (1) Proper-score leaderboard: score the same NFL forecasts with Brier/log-loss and compare the ranking against the points ranking — if they disagree (the paper predicts they will), publish which models are "confidently wrong" vs "honestly uncertain"; this is the experiment the paper explicitly recommends. (2) Bracket-consistency bonus: the paper's path-dependence punishes single errors cascaded through brackets — test a scoring variant that rewards marginal round-probabilities (probability each team reaches each round) instead of a single deterministic bracket, and measure whether it changes the winner; this separates "good probabilistic forecaster" from "lucky bracket." (3) Search-enabled separation: the paper flags it as future work — run GSE's protocol with and without live-search access for the same model and quantify the search premium on long-horizon forecasting.
