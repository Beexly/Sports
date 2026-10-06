# [0861] WorldCupArena: Fine-Grained Evaluation of Language Models and Deep-Research Agents on Football Forecasting (arXiv:2607.18084)

**Citation:** Wang, Z., Gui, T., Rao, J., Di, S., Tang, Y., & Liang, D. (2026). *WorldCupArena: Fine-Grained Evaluation of Language Models and Deep-Research Agents on Football Forecasting*. arXiv:2607.18084 [cs.AI, cs.CL, cs.LG]. URL: https://arxiv.org/abs/2607.18084
**Full-text source:** local cache /tmp/arxiv750-cache/fulltext/2607.18084.txt (55,235 bytes, complete paper incl. Appendix A implementation details). Cross-checked against https://arxiv.org/abs/2607.18084.
**Ledger completed:** 2026-09-21. **Read:** full text.
**Verdict:** ADAPT — not a prediction method but a benchmark whose *evaluation machinery* is directly useful: the Scoreline partial-credit metric (eq. 1) is a better engine-evaluation score than raw accuracy, the availability-aware aggregation handles missing truth gracefully, and the lock-predictions-before-deadline/score-after protocol is the template for GSE's own public-pick verification. The leaderboard numbers themselves are not actionable.

## Citation / full-text source
SJTU/UCL/McGill team, July 2026 (WorldCupArena 2026 conference). Code, prompts, predictions, scoring: https://github.com/wzk1015/WorldCupArena. Note on provenance: the paper evaluates 13 systems (Claude Opus 4.7, GPT-5.4, Gemini 3.1 Pro, DeepSeek V4, Kimi K2.6, …) on all 104 matches of the 2026 FIFA World Cup with champion Spain — model names and the completed-tournament framing postdate verifiable records, so treat the leaderboard as reported-by-authors; the durable value is the metric and protocol design, not the specific scores.

## Research question
Do LLMs and deep-research agents actually forecast better than markets and fans when forced to predict *before* kickoff — and does result accuracy hide differences in detailed predictions (score, players, events, statistics, competition outcome)? Six RQs: detailed-vs-result differences, exact vs close scores, whether web search helps, full-competition prediction, LLM vs market/fan baselines, in-play updating.

## Dataset / schema
- All **104 matches** of the 2026 FIFA World Cup: 72 group, 16 Round-of-32, 8 Round-of-16, 4 quarterfinals, 2 semifinals, 3rd-place playoff, final. Champion: Spain; final: Spain–Argentina.
- 13 systems: 9 with fixed evidence package (S1), 3 self-directed search (S2), 1 deep-research agent; coverage 58–104 valid predictions per system (minimum-coverage rule: ≥52).
- Per match, each system submits JSON: 1X2 probabilities, predicted score, players/lineups, events, match statistics, competition predictions, plus a written rationale (unscored).
- Baselines: **Polymarket** (last price in [T−24h, T), 104 fixtures), **BetVictor** via Sportmonks pre-match odds (104), **human fans** (152-user internal group, 94 matches).
- In-play exploratory track: **2,957 checkpoints** over 100 matches, median wall-clock gap **6.8 min** (IQR 6.2–12.4); 3 models polled during matches.

## Method
- **Temporal protocol:** predictions locked **24h before kickoff**; evidence snapshot hash frozen; a prediction containing post-deadline information is excluded as "leaked." Failed/invalid runs reduce coverage rather than scoring as errors.
- **Five evaluation layers** (Table 1): T1 result+score (layer weight **0.40**), T2 players/lineups (0.20), T3 events (0.15), T4 tactics/statistics (0.15), T5 competition (0.10). Task weights e.g. T1: 1X2 0.35, exact 0.20, scoreline 0.30, goal diff 0.10, qualification 0.05.
- **Availability-aware aggregation:** S_A = Σ_{j∈A} w_j S_j / Σ_{j∈A} w_j over *available* components only (eq. 2) — "none happened" ≠ "no data"; missing truth is excluded, never zero-filled.
- **Fixed contrast calibration** for display: C(R) = 100·(σ((R−50)/5) − σ(−10))/(σ(10) − σ(−10)) (eq. 3) — monotonic, preserves ranking and 0/100 endpoints; turns raw 44/47 into 23.15/35.43.
- **T5 competition score:** T5_complete = (0.25G + 0.35(0.7A + 0.3M) + 0.20H)/0.80 (eq. 4), G = Kendall τ group order, A/M = round-weighted (1,2,4,8,16) advancement/exact-pairing, H = 100 if champion correct.

## Equations / math / assumptions
- **Scoreline partial-credit (eq. 1):** S_score = 45·I_r + 25[1 − e_d/5]_+ + 20[1 − e_t/6]_+ + 10[1 − e_team/8]_+, where I_r = correct result class, e_d = goal-difference error, e_t = total-goals error, e_team = team-wise goals error. Exact = 100; result class worth 45/100.
- 3-way **Brier score** for probability calibration; Jaccard/F1/nDCG for players (rank-weighted); matched-MAE/event-F1 for events (Hungarian matching, Kuhn 1955); **sMAPE** for count statistics.
- Assumption: a good forecast's details should be mutually consistent (predicted score ↔ scorers ↔ statistics); the written rationale is published for inspection but unscored — "only claims that can be checked against the match record are graded."

## Features / target
- Targets: 1X2 outcome, exact score, score closeness, lineups/scorers/events/stats, group order, bracket, champion. This is an evaluation paper — features are whatever each system used internally.

## Validation
- Leaderboard over 104 matches; models ranked only with ≥52 valid predictions; shared-match comparisons where possible; leaderboard recomputed as matches complete (dynamic benchmark — "evaluate future models without using outcomes that are already known").
- Difficulty stratification (Table 5): balanced (p_max ≤ 0.50), heavy favorite (p_max ≥ 0.65), knockout, low-scoring (≤1 goal).

## Exact results with baselines
**Table 2 (all 104 matches; N varies by coverage):**
| System | Setting | N | Composite | Result acc | Exact | Scoreline |
|---|---|---|---|---|---|---|
| Claude Opus 4.7 (Thinking) | S1 | 95 | **33.76** | 68.4% | 15.8% | 63.16 |
| Claude Opus 4.7 (Thinking+Search) | S2 | 58 | 31.26 | **70.7%** | **17.2%** | **68.49** |
| GPT-5.4 | S1 | 102 | 29.91 | 65.7% | 11.8% | 56.05 |
| GLM-5.1 | S1 | 103 | 28.59 | 68.0% | 13.6% | 62.27 |
| Polymarket | – | 104 | – | 65.4% | 8.7% | – |
| BetVictor | – | 104 | – | 68.3% | 16.3% | 53.35 |
| Human fans | – | 94 | – | 69.7% | 15.6% | 53.40 |

- **RQ5 (LLM vs baselines):** best LLM beats human fans by only **+1.0pp** on result accuracy (70.7 vs 69.7), BetVictor by +2.4pp, Polymarket by +5.3pp; exact-score +0.9pp over BetVictor (17.2 vs 16.3). But **Scoreline: +15.14 display points** over BetVictor (68.49 vs 53.35) and +15.09 over fans — the LLM edge is *near-miss calibration*, not hit rate.
- **RQ3 (search):** on shared matches, adding search changed composite by **−0.26** (Claude, N=50), **−4.26** (GPT-5.4, N=95), **−1.03** (Gemini, N=82) — no reliable gain; commercial products, not controlled model comparisons.
- **RQ1/RQ2:** result accuracy 58.6–70.7% but exact scores only **10.3–17.2%**; no system leads all five layers (Claude leads T1/T2, Claude-search T3, Gemini Deep Research T4).
- **RQ4:** 4 systems predicted champion Spain; only the 2 Claude configs also got the exact Spain–Argentina final (T5 88.3/87.4 vs 39.1–49.0 for champion-missers).
- **Consensus failures (Table 6):** all 13 systems missed Spain–Cape Verde 0–0, Netherlands–Japan 2–2, France–England 4–6 (3rd-place).
- **Stratification:** heavy-favorite matches 75.5% result acc vs balanced 55.4%; low-scoring 57.7%.
- **In-play (Table 4):** result acc 61–90 min: **74.4–75.8%**; after an observed goal, accuracy jumps **+11.9 to +22.0pp** (adaptation to observed state, not anticipation).

## Code / data availability
Full open source: https://github.com/wzk1015/WorldCupArena (code, prompts, predictions, scoring). Reusable for future leagues/cups.

## Leakage
- Strong anti-leakage design: 24h prediction lock, snapshot hashes, leaked runs excluded, in-play kept off the main leaderboard. Appendix A.5 honestly notes search-source timestamps are imperfect and need manual review.

## Limitations
- Leaderboard numbers concern 2026 models/events that cannot be independently verified from here — use the *methods*, not the scores.
- Only 104 matches (one tournament); no confidence intervals on system differences; comparisons across systems with different coverage are "descriptive rather than paired."
- S1-vs-S2 compares commercial products, not architectures — the "search doesn't help" finding may reflect product quality, not search itself.
- Scoreline display calibration (eq. 3) stretches mid-range differences for readability — the 15.14-point gap is in *display* units, not accuracy points; don't misread it as a 15pp accuracy gain.

## GSE overlap vs existing-research-map
- No method overlap with anything in the corpus — the first benchmark-design read. Complements the repo's calibration stack (Brier, ECE, LRD): the paper *uses* 3-way Brier and argues for pairing it with accuracy, which matches GSE's multi-metric doctrine.
- Directly relevant to GSE's operating rule "every pick public, every result posted": the lock-before-deadline/score-after protocol is the formal version of GSE's verification promise, and the minimum-coverage rule (≥50% of most-complete system) is a good policy for GSE's own public record.
- The "result accuracy hides differences" finding supports evaluating GSE's engine on more than hit rate — CLV, calibration, and near-miss quality.

## Implementation spec (GSE adaptation)
1. **Adopt the Scoreline metric** (eq. 1) for GSE's internal engine evaluation on moneyline/1X2-style markets: score each prediction 0–100 with 45 points for the correct outcome class and the remainder for margin/total closeness. Report alongside Brier and CLV.
2. **Adopt availability-aware aggregation** (eq. 2): when grading props or cross-sport slates with missing official stats, exclude unavailable fields instead of zero-filling.
3. **Adopt the verification protocol:** every public GSE pick gets a locked timestamp (pre-kickoff), a frozen input snapshot, and post-game grading — formalizing the existing "every result posted" rule; publish the grading code.
4. **Do NOT adopt:** the display calibration (eq. 3) for external reporting — report raw scores to avoid stretching; the 5-layer taxonomy as-is (adapt layers to NFL: result, score, player props, game script/stats, season futures).

## Reproducible test
1. Clone the repo; re-run the scoring scripts on the published predictions to verify the Table 2 numbers reproduce.
2. Port the Scoreline metric to 1 NFL season of GSE engine moneyline predictions; check that Scoreline ranks model variants differently than raw accuracy (the paper's RQ1 claim) — if it doesn't discriminate, it adds no value over Brier.
3. Run the lock/score protocol on 4 weeks of GSE public picks and confirm the pipeline catches at least the failure modes in Appendix A.4 (invalid/leaked/skipped).

## Numeric gate
**Best LLM 70.7% result accuracy vs human fans 69.7% (+1.0pp) and BetVictor 68.3% (+2.4pp); Scoreline 68.49 vs 53.35 (+15.14 display points).** The gate for GSE: the Scoreline metric must change model-variant rankings vs raw accuracy on GSE's own data (reproducing the paper's RQ1), or it's decorative.

## Improvement experiment
Extend the Scoreline idea to spread/total markets: replace the goal-based error terms with spread-error and total-error terms (e_d → |predicted margin − actual margin| scaled by key numbers; e_t → total error), keeping the 45-point outcome-class anchor. Validate that the adapted metric correlates with realized CLV better than raw ATS hit rate does — if near-miss quality predicts CLV, it becomes a training objective, not just an evaluation metric.

## Verdict
**ADAPT.** The paper's contribution to GSE is its evaluation machinery — the Scoreline partial-credit formula, availability-aware aggregation, and the lock-predictions/score-after verification protocol — all directly portable to how GSE grades its own engine and public picks. The specific 2026 leaderboard is unverifiable from here and should not be cited as evidence about model capabilities.
