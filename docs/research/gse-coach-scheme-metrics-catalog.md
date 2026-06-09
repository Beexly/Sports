# GSE Coach/Scheme Metrics Catalog

Generated: 2026-06-09

## Free/Public-Data Metrics

These can be built from nflverse play-by-play and supporting public tables.

| Metric | Side | Situation grain | Why it matters |
| --- | --- | --- | --- |
| Run/pass split | Offense | Overall, neutral, score-state | Base tendency, but only useful after game-state filtering. |
| Early-down neutral pass rate | Offense | 1st/2nd down, neutral win probability/score/time | Better signal than raw pass rate because garbage time is reduced. |
| Third-down pass/rush rate | Offense | Short, medium, long | Shows how a caller handles leverage. |
| Red-zone pass/rush rate | Offense | Inside 20, inside 10 | Translates to TD equity and player role. |
| Two-minute pass/rush rate | Offense | Half-end/game-end | Identifies tempo and comeback shape. |
| Leading/trailing split | Offense | Score margin buckets | Separates philosophy from scoreboard necessity. |
| EPA/play by run/pass | Offense/Defense | Situation buckets | Measures efficiency of the choice, not just frequency. |
| Success rate by run/pass | Offense/Defense | Situation buckets | Stabilizes better than raw yardage. |
| Explosive play rate | Offense/Defense | Run/pass, field zone | Important for totals, DFS ceilings, and matchup volatility. |
| Air yards per attempt | Offense/Defense | QB/team/coach episode | Separates horizontal passing from downfield aggression. |
| No-huddle rate | Offense | Neutral, trailing, two-minute | Tempo and volume signal. |
| Shotgun rate | Offense | Down/distance | Formation proxy available in public play-by-play. |
| Fourth-down aggressiveness | Head coach/offense | Field position, win probability, yards to go | Coach tendency with direct betting and fantasy impact. |
| Pace/seconds per play | Offense | Neutral/trailing/leading | Volume projection and live-slate signal. |
| Penalty-adjusted drive kill rate | Offense/Defense | Drive, down | Coaching discipline proxy, but noisy. |
| First-read concentration proxy | Offense | Target share by position/player | Useful fantasy signal, but not true read progression. |
| RB/TE/WR target share | Offense | Personnel inferred from player positions | Role and scheme-fit signal. |

## Charting/Licensed-Data Metrics

These require FTN charting, PFF, Sports Info Solutions, NFL Pro, Next Gen Stats, or another approved source/license.

| Metric | Side | Data dependency | Why it matters |
| --- | --- | --- | --- |
| Personnel grouping rate | Offense/Defense | Charting | 11/12/21 personnel and nickel/dime response drive role projections. |
| Motion rate | Offense | Charting/NGS | Core modern offensive identity and coverage stressor. |
| Play-action rate | Offense | Charting/PBP if available | Separates run-action systems from pure dropback systems. |
| RPO rate | Offense | Charting | Not reliably inferable from public PBP. |
| Formation family | Offense | Charting | Condensed/wide, bunch, empty, pistol, under-center detail. |
| Run concept family | Offense | Charting | Outside zone, duo, gap, power, counter, pin-pull. |
| Coverage shell | Defense | Charting/NGS | Single-high/two-high, man/zone, cloud/quarters. |
| Blitz rate | Defense | Charting/PFR/NGS | Aggression and protection matchup signal. |
| Pressure rate by rush count | Defense | Charting/NGS | True pass-rush quality and scheme pressure. |
| Box count/light box rate | Defense | Charting/NGS | Run-game matchup and explosive-run risk. |
| Front family | Defense | Charting/manual | 3-4/4-3 is too crude, but still useful as a public label. |
| Man/zone split | Defense | Charting | WR/TE matchup and QB performance split. |
| Match coverage indicators | Defense | Charting/manual | Advanced defensive scheme, not public PBP. |

## Derived Coach Metrics

| Metric | Role | Calculation | Guardrail |
| --- | --- | --- | --- |
| Play-caller confidence | HC/OC/DC | Source-confirmed caller plus title/press/beat corroboration | Must be explicit; titles are not enough. |
| Scheme continuity score | Staff/team | Prior staff overlap, coordinator holdover, playbook family | Do not overrate continuity after QB/OL turnover. |
| Roster fit score | Staff/team | Scheme tendencies vs current roster strengths | Needs transparent input weights. |
| Opponent-adjusted tendency | Staff/team | Raw tendency adjusted by opposing defense strength and game state | Requires stable opponent baselines. |
| Volatility score | Staff/team | New caller, small sample, roster churn, unclear role | Should gate public confidence. |
| Coach-speak delta | Staff/team | Press conference claims vs historical tendency | Founder-only until corroborated. |
