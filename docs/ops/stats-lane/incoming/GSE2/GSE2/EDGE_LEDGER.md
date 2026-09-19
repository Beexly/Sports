# EDGE LEDGER — NFL Inefficiency Perspectives (R02)

## 5 Quoted Evidence Lines (file:line) — Perspective Switch

1. NFL_BETTING_EDGES.md:146 — "Simon (2024, Management Science): betting lines 'overreact' — showing significant negatively autocorrelated changes."
2. docs/nfl-osint-props-research.md:102 — "Sportsbooks typically adjust prop lines after these releases. Scraping the official page at/just-after the 4pm ET cutoff can yield stale lines."
3. NFL-coaching-tendencies-prop-edges.md:43 — "4th-and-5: Coaches' subjective estimate ≈ 33–37%; Actual base rate = 42.7% (43.7% for evenly-matched teams after selection-bias adjustment — Wharton Sports Analytics, 2024)."
4. NFL_BETTING_REPOS_CODE_DEEP_DIVE.md:38 — "NEGATIVE_CORRELATIONS: (rushing_yards,passing_yards). detect_correlations groups same-game props + Monte Carlo drawdown."
5. docs/nfl-osint-props-research.md:283 — "Weekly Injuries: 4-hour cache, updates tied to game day: Sun game → available Fri 9pm ET."

## 3-5 Cited Angles (R02)
- Edge A (Prop correlation mispricing): NFL_BETTING_EDGES.md:10-57 + NFL_BETTING_REPOS_CODE_DEEP_DIVE.md:38
- Edge B (Injury-report timing / stale lines): docs/nfl-osint-props-research.md:102-114
- Edge C (4th-down conservatism gap): NFL-coaching-tendencies-prop-edges.md:32-54
- Edge D (Negative autocorrelation / false steam): NFL_BETTING_EDGES.md:136-178
- Edge E (Cross-book divergence / CLV): NFL_BETTING_EDGES.md:81-93 (Costa 2025 quadratic HFA)

CONTINUE THE ARMY queued.

## R81 20k-ft Blind Spots (5 concrete gaps — file:line verified)
6. handoff/H1_RESEARCH_2026-08-23.md:15 — "Repo only ingests offensive NFLVerse data. Def + ST data available free." (forgotten sport/failure mode: defensive + special teams never ingested).
7. NFL_BETTING_EDGES.md:24 — live-caught receiver-under-3.5 edge documented; live-betting kill-switch missing (forgotten market: live/spreads).
8. NFL_depth_chart_snap_count_edges.md:228 — special-teams goal-line snap-share indicator exists but no DFS/live line adapter consumes it (under-leveraged data we already have; overfit toy: DFS optimizer ignores ST).
9. nfl_altitude_research.md:107 — weather drives >40%→<25% KO TB rate change; adversarial snow-game case never in backtest (missing adversarial case; missing kill-switch for weather-driven prop adjustments).
10. NFL_BETTING_EDGES.md:44 — OR-Tools DFS optimizer referenced but no SWARM_RECOVERY.md entry records its kill-switch or failure mode (missing doc; missing kill-switch).
CONTINUE THE ARMY queued.
