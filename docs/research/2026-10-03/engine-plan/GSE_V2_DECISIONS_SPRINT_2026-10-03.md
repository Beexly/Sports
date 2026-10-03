# GSE v2 binding decisions + sprint clock (2026-10-03)

This doc supersedes conflicting text in the other plan docs.
Two outside red teams (gpt-6.1-sol via OpenCode Zen, Nemotron-3-Ultra via the NVIDIA API) reviewed the plan. Their raw reviews are committed beside this file. Every valid finding is resolved below into one binding rule. Findings that were wrong were rejected, with the reason recorded.

Nothing waits weeks. Every lane runs in parallel on a clock measured in hours, against the live 2026 season. Speed comes from parallel lanes and contracts fixed in advance, not from skipping the gate.

## 1. Sprint clock (all lanes parallel; times are CT)

| When | Deliverable (each one a PR or a committed artifact) |
|---|---|
| Sat 10/03 tonight | Gate harness 3a merged: today's tested scripts ported to `intelligence/gate/` with the single decision function (§2.1). PIT-starter fix 25b: pre-game QB from depth chart + injury vintage. Re-run QB family and record the corrected number. Pre-publication health gate and kill switch (§2.9). |
| Sun 10/04 by 10:00 | W4 v0 live. Refresh injuries, inactives, weather, odds. Mint full-slate p + reasoning trace for all 15 W4 games from the frozen v0 artifact (market offset + QB + Elo residual + injury; weights from the committed walk-forward). Publish the full slate. A play is published only where §2.1 passes; at v0 expect few or none. |
| Sun 10/04 15:00–23:30 | Mint again at inactives (T−90) for each window. Grade each window as it ends. |
| Mon 10/05 | Replay infra (Lane 1) on CPU, all seasons, all game markets. Bivariate score-distribution engine v1: ML, spread, total, team totals, halves read off one distribution. Availability model v1 with starter probabilities and replacement-adjusted value. derive closing_lines (20a). |
| Tue 10/06 | Grade W4 after MNF. Gate receipts for availability v1 and score-distribution v1. Props opportunity chain v1 (snaps → routes/targets/carries → efficiency) for receptions, receiving/rushing/passing yards, anytime TD. Every prop market capture on (20f). |
| Wed 10/07 | Coverage-matchup encoder (participation coverage + routes + NGS separation). Travel/body-clock, altitude, officials, special-teams, turnover-luck families (compute-only, hours each). DFS projections + ownership + stacks v1. |
| Thu 10/08 before TNF | W5 v1 champion = whatever the gate promoted by Wed 23:59. Mint TNF. From here every week runs the same cycle; NFL refits weekly with new games, MLB/NCAAF refit daily. |
| Continuous from Sat | Forward archive (ESPN predictor, Kalshi, injuries, news, weather, odds), text event extraction, CV watcher deploy + formation task, Madden source search (5-day time box). |

## 2. Binding rules (each resolves a red-team finding)

2.1 One decision function, used by every lane:
- A family or model is PROMOTED when its paired game-block bootstrap 95% CI on Δ log loss (vs the current champion, same eligible rows, same mint time) is below 0, the block-aware placebo fraction is ≤ 0.10, and it survives BH-FDR q ≤ 0.10 across that week's tests.
- A play is PUBLISHED when the lower CI bound of |p − q_exec| exceeds the vig at an executable quote.
- Everything else is wired and logged at weight 0.
- Placebo draws grow adaptively (200 → 2,000) when a result sits near the threshold.

2.2 Market at decision time:
- Every mint stores the executable quote (book, line, both sides, timestamp, de-vig method).
- The baseline is the market-only forecast at the same information time.
- The close stays a separate reference line.

2.3 Bitemporal data:
- Every row carries event_time, observed_at (first known to GSE live) and archival_vintage (for backfills).
- Backfilled history is flagged archival and never counts as live-known.
- There is one tested function, `latest_known_as_of(entity, t)`.
- Post-play columns enter pre-play inputs only through an explicit allowlist.

2.4 Eligible universe and dependence:
- Forecasts are stored for every eligible game and target, including abstentions.
- Uncertainty is clustered by game (paired block bootstrap).
- Props and repeated mints are not counted as independent games; receipts report n_games and n_rows separately.

2.5 Nested chronological selection:
- Outer folds by season; inner folds tune.
- An immutable trial ledger at `intelligence/gate/ledger/` records every experiment, including failures and searches. Relabelling a failed family needs a new estimand.

2.6 Reasoner interface (one choice):
- The LLM is an evidence/event extractor and trace writer. It never outputs p.
- The numeric pricer turns events into p.
- RL on log loss is deferred until there is prospective evidence of lift.
- LLM-dependent forecasts are evaluated prospectively only (2026 live), because published cutoffs cannot be verified.

2.7 Trace grading:
- Traces are graded on factual support, timestamp validity, entity correctness and entailment, never on whether the outcome went the cited way.
- Predictive value is measured by ablation.

2.8 Line movement:
- Post-mint movement at sharp books is a diagnostic.
- It becomes an auxiliary loss only if that improves outcome scoring on untouched data.
- Pre-mint movement is an input family.

2.9 Production safety:
- A pre-publication health gate checks feed freshness, coverage, entity resolution, odds freshness, artifact checksum and model version.
- On failure the system publishes the timestamp-matched baseline, or abstains. A kill switch and rollback exist.
- Free GPU is never on the publish path.

2.10 Refit cadence:
- Ingest continuously.
- NFL refits and promotes weekly, after the slate grades.
- MLB and NCAAF refit daily.
- Nothing refits on nights with no new outcomes.

2.11 Calibration:
- Calibrate distribution parameters (not each market separately), then recheck all derived markets for coherence.
- Beta/isotonic calibration is fitted only inside inner folds.

2.12 Settlement ontology:
- One versioned target dictionary covers ties, pushes, voids, inactive-player prop rules, OT and stat corrections (provisional vs final).
- It lives in a new engine ledger and never touches frozen production picks.

2.13 PR rule:
- One bounded deliverable per PR.
- Escalation: when the kit does not cover something, propose the smallest contract change in the PR, tag the owner, and continue with independent work. Never stop all work.

2.14 Receipts bind data:
- Each receipt includes dataset hashes, split IDs, preprocessing version, tuning history, prediction-file hash and outcome version, plus the git SHA.

2.15 Ownership (one owner each):
- Gate = Lane 3a, at `intelligence/gate/`; family lanes produce their own receipts with it.
- Watch/CV = Lane 16; Lane 15 is folded in.
- Text/travel/officials/crowd/contracts families come from one manifest, `intelligence/families/MANIFEST.json`, owned by Lane 28; Lanes 13 and 19 add rows there.
- Knowledge graph = Lane 27 (Lane 20e removed).
- Shared files (registry, migrations, crons, flags) = one integration owner, who merges in order.

2.16 Firecrawl budget:
- ≤ 1,000 credits per week.
- Injuries at 4 points per week = 20; rosters twice weekly = 320; league news daily = 35; team news on Wed and Fri = 320; projections weekly = 35.
- ESPN, Kalshi, Open-Meteo and nflverse are free and carry the rest.

2.17 Forward-only families:
- ESPN predictor, Kalshi prices and live social are marked FWD_ONLY and graded on 2026 W5+ only.
- Kalshi has no player props; game/spread/total only.

2.18 CV scope for this sprint:
- One measurable task first: pre-snap formation and personnel, labelled by nflverse participation on held-out games, with visibility/abstain flags.
- Routes for every receiver come later.
- Live in-game WP + live odds feed is the CV payoff lane.

2.19 Madden:
- 5-day time box to find a source with recorded terms; week N−1 rating vintage only.
- Fallback: concept clustering on participation routes × formation.

2.20 External leaderboards:
- Kept as the intelligence chart for generality.
- Entry happens after sports grading is reproducible (target: after W6). Not on the W4/W5 critical path.

## 3. New items adopted from the red teams (added to lanes)

- Availability model with starter probabilities and replacement-adjusted value: the top accuracy build for W5 (Lane 25b + Lane 3 family). Scenario-average over lineups; QB × OL interaction only.
- Bivariate score-distribution engine, game-level first (Lane 21 phase 1, CPU). Drive simulator is phase 2.
- Diagnostic ladder before pretraining: market → independent baseline → regularized residual → hierarchical/dynamic (empirical-Bayes offense/defense/QB with time decay) → shallow CatBoost → pretrained encoders. Each step reports Δ and cost. Encoders are trained per outer fold (no pretraining leakage).
- Props opportunity chain: team plays → pass/run → player share → efficiency. Each stage is graded separately. NGBoost-style distributional heads for continuous stats.
- Inactives source: ESPN summary first (free), nfl-com second. Archived with vintage.
- Sharp-book tags on odds_line_snapshots; CLV at sharp books only.
- Weather: forecast archived at mint; actuals archived post-game (Open-Meteo historical) to separate forecast error.
- Event-level dedup across news/ESPN/beat/social/market, so one announcement counts once.
- Canonical market identity: selection, threshold, period, OT, settlement terms.
- Rule-era features and recent-era validation (kickoff rule changes, OT rules).
- Join-accuracy audit (not only match rate) for every entity crosswalk.
- Local replay store: DuckDB + Parquet on the laptop, so replays never scan Neon.
- Bounded external resources to check rights for and use: Kaggle Big Data Bowl 2021/2023/2025 tracking (coverage/pass-rush/pre-snap feature proofs), nfl4th (4th-down aggressiveness), CatBoost, NGBoost, beta calibration, GLiNER + e5-small for cheap extraction/retrieval, NOAA ISD actuals.

## 4. Rejected (with reason)

- 'Joint model gives ~500k independent calibration rows / beats market on 10+ markets': rejected. Targets share game outcomes; n_games is the effective unit (§2.4). The joint model is still adopted for coherence and multi-target estimation.
- 'Partition the signals table per family now': rejected for now. Volume is ~120k rows; idempotent per-family upsert keys are enough. Revisit above 10M rows.
- Paper descriptions in the NVIDIA review for 2410.09068, 2601.07980 and 1810.08032 do not match the repo module names (2601.07980 is a self-exciting event-dynamics module). Treat arXiv IDs as pointers, not receipts; verify each module before use.
- 'Lane 0 must wait for the gate': rejected as stated. Lane 0 publishes a frozen, already walk-forward-tested v0 artifact, and plays only pass the §2.1 publish rule. The gate harness lands tonight, before Sunday's mint.
- 'External leaderboards are a distraction': partially rejected. They remain the generality chart, sequenced after W6 (§2.20).

## 5. Grok 4.7

The Grok 4.7 red-team call (xai-oauth through hermes chat) was started with the same query. Its output is appended here when it returns. It was not done at commit time.
