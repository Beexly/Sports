# [0223] Temporal Dynamics of Goal Scoring in Soccer (arXiv:2501.18606v1)

**Citation:** Ayana, G. et al. (2025). *Temporal Dynamics of Goal Scoring in Soccer*. arXiv:2501.18606v1. URL: https://arxiv.org/abs/2501.18606
**Ledger completed:** 2026-09-21. **Read:** full text (local file), entire text including appendix.
**Verdict:** ADAPT — the uniform-rate null-model methodology (Eq. 1, 6M-game simulation, same-team vs opposing-team split) ports directly to NFL scoring events for testing within-game burstiness, a live total/spread modeling input; the soccer-specific timing findings themselves do not transfer.

## 1. Research question
Is there a random (uniform) distribution of when goals are scored in soccer? Using event-level data from 3,433 matches across 21 leagues/competitions, the authors test whether goal timing deviates from a uniform-rate null model, whether inter-goal times show dependence, and whether the team that just scored is more likely to score the next goal (burstiness).

## 2. Dataset / schema
StatsBomb open event data: 3,433 matches across 21 leagues/competitions (FIFA World Cup, African Cup of Nations, Premier League, 1. Bundesliga, La Liga, Serie A, Champions League, MLS, NWSL, and others), spanning various seasons. Three partitions: events (one JSON per match; array of timestamped events; 20 attributes per event — timestamp, event type, players involved; 34 event types, most common "Ball Receipt", "Shot", "Pass"; "Shot" events carry start/end location, xG, outcome), lineups (per-player ID, name, nickname, jersey number, country/nationality), matches (league/competition and season per match ID). Access: public, https://github.com/statsbomb/open-data. Authors note the sample is biased toward what StatsBomb makes public and may not represent all professional soccer.

## 3. Method / model
Null-model construction, not a fitted ML model:
1. Compute the average goals-per-minute rate Ḡ = (1/N) Σ_i (G_i / T_i), where G_i, T_i, N are goals, duration in minutes of match i, and number of matches (Eq. 1).
2. Simulate 6,000,000 games with goals scored at rate Ḡ, game lengths set to the average game length T̄; each simulated goal randomly assigned to one of the two teams.
3. Compare observed goal-timing histogram vs null (χ² test); compare inter-goal time distribution (games with ≥2 goals) vs null via exponential-decay fit and χ² test; split inter-goal times by same-team vs opposing-team scorer; compare time remaining when the last goal is scored vs null.

## 4. Equations & assumptions
- Ḡ = (1/N) Σ_{i=1}^N (G_i / T_i) (Eq. 1) — the only equation. No other equations stated.
- Assumptions: goal scoring is a uniform-rate process under the null; simulated game lengths fixed at the average length T̄; simulated goals assigned 50/50 to teams; simulated null games use the pooled average rate rather than team-strength-conditioned rates. "No equations stated" otherwise — none invented.

## 5. Features / target
No feature engineering or target variable — this is descriptive temporal analysis. Measured quantities: minute-of-match goal counts (relative frequency per minute), time intervals between consecutive goals, same-team vs opposing-team next-goal intervals, time remaining in match when the last goal is scored.

## 6. Validation design
No train/validation/test splits (no model trained). Validation is statistical hypothesis testing against the simulated null: χ² tests for goal-timing uniformity, for inter-goal time distribution, and visual comparison of same-team vs opposing-team decay curves. Findings are framed as deviations from the null, not as a predictive model. Baselines: the 6M-game uniform-rate simulation only.

## 7. Numerical results / baselines
Exact numbers as stated:
- 3,433 matches, 21 leagues/competitions; 6,000,000 simulated null games.
- Goal timing: frequency increases as the match progresses, r ≈ 0.438, p ≈ 7.13×10⁻⁶; χ² ≈ 288.62, p = 3.72×10⁻²¹ (significant deviation from uniform). Early minutes of each half show fewer-than-expected goals; a dip occurs between minutes 45 and 50 (halftime restart); frequency drops sharply after the average match length.
- Inter-goal times: exponential decay in both observed and null data; χ² ≈ 0.044, p = 1 — the observed distribution is fully explained by the null; clustering of goals shortly after a previous goal is due to time-dependent constraints (average rate), not mentality/cadence shifts.
- Same-team vs opposing-team: same team scores the next goal more often than the opposing team across all intervals (bursty behavior); at short intervals (0 to ~30 minutes) there is a large gap between observed and null for same-team scoring — same team more likely than expected immediately after scoring, opposing team less likely than expected.
- Last goal of match: observed time remaining closely follows the null except at the shortest intervals — teams are more likely than expected to score the last goal closer to the end of the match.

## 8. Code / data availability
Data: StatsBomb open data, https://github.com/statsbomb/open-data. Code: "Code to reproduce the analyses in this work will be available upon publication" — no link stated.

## 9. Leakage & limitations
- No model, so no leakage in the ML sense; but the null model ignores team-strength heterogeneity — the authors acknowledge that better teams scoring more in general partly explains same-team burstiness, and the null could be improved by biasing per-team scoring probabilities.
- Sample bias acknowledged: only leagues StatsBomb makes public; not necessarily representative.
- The headline "burstiness" finding is partially confounded by skill differentials; the paper does not disentangle hot-streak/momentum mechanisms from team quality.
- No per-minute possession or game-state controls; no substitution-timing analysis despite hypothesizing it.
- Soccer-specific: low-scoring, continuous clock, no drive structure — none of the timing findings transfer to football directly.

## 10. GSE overlap
GSE's corpus covers Poisson scoring models and state-space scoring dynamics (per existing-research-map.md) — the base-rate/null scoring-rate machinery overlaps. What is NOT in the corpus: a within-game burstiness/momentum test splitting consecutive scores by same-team vs opponent, and the time-varying scoring-intensity curve as a live-modeling input. Live spread/total modeling is a thin lane, so the transferable piece is new capability, not duplication.

## 11. GSE implementation spec
Replicate the null-model methodology on NFL scoring events:
1. Pull nflverse play-by-play 2020–2025; define scoring events (TD, FG, safety) with game-clock timestamps.
2. Compute the pooled scoring rate per minute of game time (excluding halftime) and simulate ~1M null games at that rate with 50/50 team assignment.
3. Test (a) scoring intensity vs uniform across game time (χ², same as the paper), (b) inter-score time distribution vs null, (c) same-team vs opponent next-score curves — the key burstiness test, which in the NFL has a real mechanism (short fields, kickoff returns, onside kicks) rather than just skill heterogeneity.
4. Condition the null on team strength (pregame spread-implied scoring rates) to address the paper's acknowledged confound — an improvement over the original.
Estimated effort: half a day.

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2024 (train the null rates), 2025 season (test). Metric: χ² divergence of observed same-team vs opponent next-score interval distributions from the team-strength-conditioned null; plus a live-modeling check: does a burstiness-adjusted in-game scoring intensity improve second-half total prediction log-loss vs the base-rate Poisson model on 2025 games. Baselines: (1) uniform-rate null, (2) GSE's existing Poisson scoring model.

## 13. Acceptance / rejection gate
Adopt if the same-team burstiness effect survives team-strength conditioning — i.e., observed same-team next-score rate in the first 5 minutes after a score exceeds the conditioned null by ≥ 15% relative with χ² p < 0.01 — AND the burstiness-adjusted live intensity improves 2025 second-half total log-loss by ≥ 0.01 nats over the base Poisson model. Reject otherwise; in particular reject if the effect collapses once team strength is conditioned out (mirroring the paper's own null-model caveat).

## 14. Improvement experiment
Go beyond the paper by conditioning on game state, which the paper never does: compute burstiness as a function of score differential and time remaining (e.g., is same-team burstiness stronger when trailing, consistent with the "Can Losing Lead to Winning?" motivational-surge hypothesis the paper cites?). If trailing-team burstiness is real, build a score-differential × clock interaction term into the live total model — a genuinely new input the paper's pooled analysis cannot produce.
