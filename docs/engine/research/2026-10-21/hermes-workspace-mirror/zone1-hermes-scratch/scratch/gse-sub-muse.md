GSE SUB-SCOUT REPORT — coach / fourth-down / timeout-challenge / nutrition
Model pin: Muse Spark 1.3
Scope: read-only, no edits, no commits, no Firecrawl, no secrets
Repos:
- C:/Users/Garrett/Sports/.worktrees/calib-boundary
- C:/Users/Garrett/gse-competitive-intel/gse-competitive-intel

METHOD
- content searches for: coach | head_coach | fourth.?down | 4th.?down | go.?for.?it | timeout | challenge | nutrition | calorie | protein | hydration | meal | diet
- exact-match follow-ups for: timeout.?rate | challenge.?rate | replay.?challenge | head.?coach | coach_?id | coachName | go_wp | posteam_timeouts_remaining
- read files listed below. Did not invent rates.

FINDINGS — REAL ON-DISK SOURCES

1) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/prediction-engine/src/signals/situational/fourth-down-coaching-aggressiveness.ts
- Measurement: head-coach 4th-down elasticity calculator. Inputs fourthDownGoRateOverExpected and redZoneFourthDownGoRate; outputs aggressivenessTier (ANALYTICS_AGGRESSIVE / BALANCED_MODERATE / CONSERVATIVE_PUNT_FIRST), expectedGoProbabilityOnFourthAndShort (league 0.48 + over-expected, clamped 0.15-0.92), gameTotalPointsElasticity (+1.65 aggressive / -1.20 conservative, +0.45 if trailing 7+ in Q4), winProbabilityOptimizationBonus, driveContinuationMultiplier. Header cites 74% vs 48% go rate and +1.85 to +2.40 EPA as literature priors, not a measured series in this file.
- Coach-tied: yes by name (coachName: string input), but no coach table or ID join on disk observed.
- Game-date-tied: no. Only scoreDifferential + quarter (1-5). No game_id / season / date field.
- Home-relative vote: no. Single-coach output only; caller would have to difference home vs away.
- Honest abstain: abstain if fourthDownGoRateOverExpected or redZoneFourthDownGoRate is absent/unparseable; abstain if coachName is unknown/changed mid-season; abstain on 4th-and-long where the 4th-and-short goProb does not apply.

2) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/prediction-engine/src/signals/situational/coaching-tendencies.ts
- Measurement: (a) baseline + adjusted run probability with run-after-pass alternation delta (+0.19 on 2nd-and-8+ after incomplete pass, +0.12 / +0.06 elsewhere); (b) fourthDownGoForItEdgeEv from Wharton-style actual-vs-perceived conversion gap x coachAggression; (c) lateHalfScoringAdjustmentRoad = -1.65 constant when isRoadTeam and halfSecondsRemaining <= 120 (Yale road-timeout-burnout prior).
- Coach-tied: partially. coachAggressivenessScore 0.0-1.0 is a free input, not a coach identity and not joined to a coach file.
- Game-date-tied: no date. Game-state only (down, distance, halfSecondsRemaining, isRoadTeam).
- Home-relative vote: only the road-timeout term is home-relative by construction (road penalty implies home edge); run-prob and 4th-down EV are single-possession, not home-minus-away.
- Honest abstain: abstain if coachAggressivenessScore is unknown (default 0.50 is a prior, not a measurement); abstain on the -1.65 road term unless halfSecondsRemaining is present and <=120; abstain if down/distance missing.

3) C:/Users/Garrett/Sports/.worktrees/calib-boundary/scripts/situational-edges.py
- Measurement: team-level fourth-down GO RATE from nflverse play-by-play: (pass+run)/(pass+run+punt+field_goal) on down==4. Walk-forward 2025 correlations vs home_win; week-3 2026 blend of finished-2025 prior + weeks 1-2. Writes data/gse-dataset/current/week3-situational.jsonl rows with home_go_rate, away_go_rate, go_rate_edge = home - away, coaching_signed = clipped signed edge.
- Coach-tied: no. Team-week grain only. No coach name/ID.
- Game-date-tied: yes. season + week + game_id (2025 walk-forward by week; 2026 week 3 output per game_id).
- Home-relative vote: yes. go_rate_edge and coaching_signed are home-minus-away by construction. This is the only observed coach-family number already in home-relative form.
- Honest abstain: abstain if either team has <4 fourth-down plays in the walk-forward window; abstain if home_go_rate or away_go_rate is null; abstain if 2025 walk-forward |r| <= 0.03 (family stays dark, number kept on row but coaching_signed = null); abstain if input CSVs (/tmp/pbp_2025.csv.gz, /tmp/pbp_2026.csv in script) are absent. Script ROOT is hardcoded to /tmp/Sports, so paths must be remapped before trusting any output here.

4) C:/Users/Garrett/Sports/.worktrees/calib-boundary/scripts/overnight/measure-coaching.mjs
- Measurement: per-game mean go_wp from data/gse-dataset/fourth-down.jsonl joined to home_win from data/gse-dataset/games.jsonl. OLS fitted on seasons <=2024, scored on 2025 holdout; reports n, r, slope, se. Family = coaching, grain = fourth-down go rate, mean go_wp per game.
- Coach-tied: no. Game grain, no coach field in the join observed.
- Game-date-tied: yes. game_id + season (train 1999..2024 intersect 2018..2024 availability, holdout 2025).
- Home-relative vote: indirect. Outcome is home_win; feature is game-mean go_wp, not home-minus-away. Could vote only via the fitted slope, not as a direct edge.
- Honest abstain: abstain on null/non-finite go_wp (excluded and counted, never zero-filled); abstain on games with zero usable go values or unmatched game_id; abstain if holdout fit is degenerate (n<3 or sxx==0); abstain per part-selector honesty gate if |r|/|slope| do not clear se. Prior stored row cited in header: |r|=0.014, never passed f1. Data files fourth-down.jsonl / games.jsonl were referenced by this script; contents were not opened in this run.

5) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/feature-store/src/metrics/fourth-down-grid-2309.ts
- Measurement: 4th-down state grid (yardline bin x yards-to-go) with empirical transitions p-hat(s'|s,a) from GridPlay rows (yardline, yardsToGo, down 3|4, isGo, nextYardline, reward) plus value iteration V(s)=max_a[r+gamma*sum pV]. GO rows use 4th-down goes + 3rd-down augmentation; kick rows skipped.
- Coach-tied: no. No coach field.
- Game-date-tied: no. No game_id/season/date.
- Home-relative vote: no. League-state values only.
- Honest abstain: abstain always for voting until the acceptance gate clears: full pre-registered NFL study with tau-hat + bootstrapped uncertainty + coach-level heterogeneity + performance asymmetry. Live gate GSE_COACH_RISK_ENABLED = false in this file.

6) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts + packages/prediction-engine/src/expected-metrics/win-probability.ts
- Measurement: timeouts REMAINING counts per play (posteam_timeouts_remaining, defteam_timeouts_remaining) carried into WpPlay.posteamTimeouts / defteamTimeouts; win-probability.ts computes timeoutDifferential = posteam - defteam as a WP feature. This is situational clock state, not a timeout rate or challenge rate.
- Coach-tied: no.
- Game-date-tied: yes. game_id + play_id + season (REG only, sorted by play_id within game).
- Home-relative vote: no as stored (possession-framed differential, not home-minus-away). Could be reframed home-vs-away only at a chosen game state.
- Honest abstain: abstain on any play where either timeout count is non-finite (row is WP-ineligible); abstain on tie games (result==0, whole game excluded from WP); abstain if posteam is empty or not home/away. No challenge-rate or replay-overturn column observed in the 40-column allowlist.

7) C:/Users/Garrett/Sports/.worktrees/calib-boundary/apps/web/lib/calibration/2109-12990v1-decision-quality-error.ts
- Measurement: Decision Quality Error (DQE) harness. DecisionType = fourth-down | two-point | timeout | challenge. Per occurrence DQE = max(wpOptimal - wpActual, 0); teamSeasonDQE = mean; dqeByType splits by type; treeValue/treeMyopicDisagreement give 2-3 ply expected-WP valuation.
- Coach-tied: no. Team + season grain (team: string, season: number). No coach name/ID.
- Game-date-tied: no. Season aggregate only, no game_id/date.
- Home-relative vote: no. Team-season means; caller would difference teams.
- Honest abstain: abstain if decisions array is empty (returns 0, not a measurement); abstain if propensity overlap trimming removes the sample (propensity outside [0.05,0.95]); abstain unless gate clears: cross-season stability r>=0.3 AND delta-R2>=0.02 over EPA/luck baseline on 2022-2024. No input data file observed; offseason report metric, not wired to publish.

8) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/prediction-engine/src/injuries/2011-11691-fourth-down-att-matching.ts
- Measurement: causal ATT harness for aggressive 4th-down decisions (stratifiedATT, IPW ATT/ATE, permutation p, Rosenbaum Gamma bound, SMD balance, overlap check). Header lists covariates including timeouts remaining, coach identity, yardline, score, time, spread/total, weather — but code takes only generic numeric arrays, no nflverse join, no coach table.
- Coach-tied: named in prose only. No coach field in any function signature.
- Game-date-tied: no.
- Home-relative vote: no.
- Honest abstain: abstain always for voting. ENABLED=false. Gate NOT EVALUATED (requires |standardized bias|<0.2, |t|>2 with sign stable ex-FG, Gamma>=1.5). Adjacent test uses synthetic data only.

9) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/prediction-engine/src/experimental/2109-06625v1-off-policy-coach-rl.ts
- Measurement: off-policy RL / OPE math only (CQL penalty, Bellman MSE, self-normalized IS, ESS, doubly-robust, lower-bound diagnostic). Prose describes behavior policy = historical coach decisions nflverse 2009-2024, reward = delta-WP, but no data loader or coach series in file.
- Coach-tied: prose only. No.
- Game-date-tied: no.
- Honest abstain: abstain always. ENABLED=false, gate NOT EVALUATED (needs >=0.5 wins/season on held-out OPE with ESS>50% and interpretable policy).

10) C:/Users/Garrett/Sports/.worktrees/calib-boundary/packages/prediction-engine/src/experimental/2103-04349v1-irl-situational-decisions.ts
- Measurement: IRL math only (featureExpectations, maxEntIrlStep, irlMargin, softPolicy). Prose defines 4th-down MDP {go, punt, FG} and {run, pass}, expert = winning/top-EPA drives. No trajectory file, no team/coach join.
- Coach-tied: no. Game-date-tied: no.
- Honest abstain: abstain always. ENABLED=false, gate NOT EVALUATED (must recover known reward on synthetic truth, weights off bounds, expert-definition sensitivity).

11) Timeout / challenge RATE files
- ABSENT as a measured rate. Observed timeout mentions are: (a) counts-remaining WP features above; (b) -1.65 road-timeout constant in coaching-tendencies.ts; (c) DQE type labels timeout/challenge with no data; (d) research note docs/arxiv-program/research/2026-09-21/arxiv-deep/1684-timeout-stopping-opposing-run-nba.md (NBA timeout paper, not an NFL rate series — title observed via search, body not opened); (e) docs/math/GSE_EXPECTED_POINTS.md and winprob/monotone-resource-table.ts mention timeouts as clock state (search hits, not a rate table). No file holding timeout-burn rate, challenge success rate, or overturn rate by coach/team/game was found.
- Honest abstain: abstain on any timeout/challenge vote; no denominator (opportunities) and no numerator (burns/wins) exists on disk.

12) Competitive-intel repo (C:/Users/Garrett/gse-competitive-intel/gse-competitive-intel)
- Coach content is prose/inventory only, not a votable series: README.md, fantasyguru/browser-captures.md, fantasyguru/content-previews-and-tools.md, fantasyguru/dossier.html, fantasyguru/FANTASYGURU-DOSSIER.md, fantasyguru/inventory-master.csv, fantasyguru/inventory-nfl.csv, fantasyguru/METHODOLOGY-SMASH-BURR-SOLDS.md, fantasyguru/PACKAGE-README.md, fantasyguru/nfl_scheme_defense.py, fantasyguru/parse_sitemaps.py, fantasyguru/workflow-digest.md.
- Fourth-down / timeout / challenge-rate / nutrition searches in this repo returned 0 files.
- No home-relative number can be built from these without inventing one. Abstain.

NUTRITION
- NUTRITION ABSENT.
- No per-player or per-team calorie, macro, hydration, sleep, mass, or intake series exists on disk as a votable file.
- What does exist is weight + prose + honest dark flags, not data:
  a) C:/Users/Garrett/Sports/.worktrees/calib-boundary/apps/web/lib/human-performance/environment.ts — DEFAULT_FACTOR_WEIGHTS.nutritionDietician = 0.08, but header and loadEnvironmentScore note state NFLPA factors (training staff/room, weight room, nutrition, strength coaches, facility, travel, coaching continuity) are PRIOR-MANUAL and ABSENT until a manually-curated attributed NFLPA snapshot is entered behind the founder gate. Live score uses only surfaceQuality + climateContext from NFL_VENUE_ENV.
  b) C:/Users/Garrett/Sports/.worktrees/calib-boundary/docs/reasoning/gap-board-2026-09-26.md — bio_nutrition 0.04, state: no rows. Quote: No sleep, mass, hydration, or intake file exists in the tree. Injury text is availability, not nutrition. Also: Nutrition, cognition, social anxiety: not in the repository. A weight without a row is a lie.
  c) C:/Users/Garrett/Sports/.worktrees/calib-boundary/docs/reasoning/competitive-intel-intake-2026-09-26.md — Nutrition. No per-player series. A position-average calorie prior from a GSSI guide would be a constant on every lineman. It does not separate two teams. bio_nutrition stays dark. (observed via search snippet)
  d) C:/Users/Garrett/Sports/.worktrees/calib-boundary/docs/research/2026-09-27/total-signal-wiring-spec.md — No nutrition / psychology / cognitive ingestion of any kind. (observed via search snippet)
  e) C:/Users/Garrett/Sports/.worktrees/calib-boundary/reports/rd/black-label-2026/HUMAN_PERFORMANCE_SIMULATION_PRIORS_LAYER.md — lists nutritionDietician / nutrition among prior-layer factors with trainingRoom, strengthCoaches, coachingStability etc. (search hit lines 113, 260; body not opened — priors, not a measured intake file).
  f) C:/Users/Garrett/Sports/.worktrees/calib-boundary/docs/arxiv-program/research/MASTER-PAPER-INDEX.md + ledger-tracker-750.jsonl — arXiv 2401.02919 Optimal strategy for trail running with nutrition and fatigue factors, verdict ADAPT, lane causal_injury. A paper index entry, not an NFL nutrition measurement.
- No diet, no calorie, no fourth-down rate invented. Per task instruction, do not treat hydration plumbing (apps/web/app/api/gse/v1/hydration/*, packages/stats-api/src/hydration/*, hydration.test.ts) as nutrition — those are data-hydration routes, false-positive search hits.

PATHS CHECKED (exact)
Sports worktree:
- packages/prediction-engine/src/signals/situational/fourth-down-coaching-aggressiveness.ts (read, 77 lines)
- packages/prediction-engine/src/signals/situational/coaching-tendencies.ts (read, 105 lines)
- packages/feature-store/src/metrics/fourth-down-grid-2309.ts (read, 108 lines)
- packages/feature-store/src/metrics/fourth-down-grid-2309.test.ts (search hit, not opened)
- packages/prediction-engine/src/injuries/2011-11691-fourth-down-att-matching.ts (read, 161 lines)
- packages/prediction-engine/src/injuries/2011-11691-fourth-down-att-matching.test.ts (search hit, not opened)
- packages/prediction-engine/src/experimental/2109-06625v1-off-policy-coach-rl.ts (read, 79 lines)
- packages/prediction-engine/src/experimental/2103-04349v1-irl-situational-decisions.ts (read, 54 lines)
- packages/prediction-engine/src/expected-metrics/nflverse-pbp-mapper.ts (read, 642 lines)
- packages/prediction-engine/src/expected-metrics/win-probability.ts (timeout lines via search, body not fully opened)
- packages/prediction-engine/src/expected-metrics/__tests__/nflverse-pbp-mapper.test.ts (search hit lines 51-52, not opened)
- packages/prediction-engine/src/expected-metrics/__tests__/win-probability.test.ts (search hit, not opened)
- packages/prediction-engine/src/winprob/monotone-resource-table.ts (search hit, not opened)
- apps/web/lib/calibration/2109-12990v1-decision-quality-error.ts (read, 101 lines)
- apps/web/lib/calibration/2109-12990v1-decision-quality-error.test.ts (search hit, not opened)
- apps/web/lib/human-performance/environment.ts (read, 172 lines)
- reports/rd/black-label-2026/HUMAN_PERFORMANCE_SIMULATION_PRIORS_LAYER.md (search hit lines 113/260, body not opened)
- scripts/situational-edges.py (read, 260 lines)
- scripts/overnight/measure-coaching.mjs (read, 181 lines)
- scripts/overnight/scan-features.mjs, build-feature-catalog.mjs, verify-shape.mjs, verify-files.mjs (search hits, not opened)
- data/reasoning/feature-catalog.jsonl, ingestion-gates.jsonl, dark-candidates.jsonl, grain-inventory.jsonl, overnight-loop.jsonl (search hits, not opened)
- data/gse-dataset/current/week3-situational.jsonl, week3-engine-readings.jsonl, week3-context.jsonl (search hits; week3-engine-readings nutrition lines observed via snippet, bodies not fully opened)
- data/gse-dataset/fourth-down.jsonl + games.jsonl (referenced by measure-coaching.mjs; directory listing attempted, contents not opened)
- docs/reasoning/gap-board-2026-09-26.md (read, 23 lines)
- docs/reasoning/week3-engine-readings.md, overnight-agent-prompt-2026-09-26.md, competitive-intel-intake-2026-09-26.md, cli-inventory-20260926.md, situational-edges.md (search hits/snippets, not fully opened except snippets)
- docs/research/2026-09-27/total-signal-wiring-spec.md, docs/research/2026-09-28/orchestration/rankings-program.md (search snippets only)
- docs/arxiv-program/research/MASTER-PAPER-INDEX.md, docs/arxiv-program/research/2026-09-21/arxiv-deep/1684-timeout-stopping-opposing-run-nba.md, 2401.02919 trail-running-nutrition entries (search hits, bodies not opened)
- docs/math/GSE_EXPECTED_POINTS.md, docs/gates/GATE-SPECS.md, docs/SIGNAL_COVERAGE_LAW5_AUDIT.md (search hits, not opened)
- packages/data-ingestion/src/2203-08489v2-team-ratings.ts, packages/ingestion-pipeline/src/signals-bridge.ts, apps/web/lib/news/rss.ts, apps/web/lib/fantasy/scheme.ts (coach-name search hits, not opened — no fourth-down/timeout/nutrition rate asserted from them)
Competitive-intel repo:
- README.md; fantasyguru/browser-captures.md, content-previews-and-tools.md, dossier.html, FANTASYGURU-DOSSIER.md, inventory-master.csv, inventory-nfl.csv, METHODOLOGY-SMASH-BURR-SOLDS.md, PACKAGE-README.md, nfl_scheme_defense.py, parse_sitemaps.py, workflow-digest.md (coach search hits, bodies not opened; zero hits for fourth-down/timeout/challenge-rate/nutrition patterns)

BOTTOM LINE
- Usable today as home-relative without invention: only the team-level fourth-down go-rate edge from situational-edges.py output (go_rate_edge / coaching_signed per game_id), gated on >=4 plays per team and 2025 walk-forward |r|>0.03. Team grain, not coach grain.
- Everything else coach/fourth-down/timeout/challenge on disk is either a calculator awaiting inputs, a gated harness (ENABLED=false / NOT EVALUATED), possession-framed clock state, or a season mean — none vote home-relative by themselves.
- Timeout rate: ABSENT. Challenge rate: ABSENT. Nutrition: NUTRITION ABSENT.
