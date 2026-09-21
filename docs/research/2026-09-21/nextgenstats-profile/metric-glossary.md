# @NextGenStats — metric glossary + what GSE can learn (2026-09-21 pass)

**Standing rule:** NGS data is proprietary NFL tracking data. We do NOT copy or republish their numbers as our own. This file documents the metric taxonomy, graphic formats, and methodological learnings so GSE can build equivalents from public tracking proxies (nflverse, FTN charting, etc.).

## Distinct metrics seen across 48 posts (Sep 20 → Apr 25, 2026)

Key finding: **no graphic in this pass printed an explicit metric definition or methodology footnote.** Legends define visual encodings only. Definitions below are inferred from usage in post text — labeled as such, not as NGS-stated definitions.

1. **Missed tackles forced (MTF)** — stat box on Carry Charts (Walker 15, Gibbs 12). No printed definition.
2. **Rushing yards over expected (RYOE)** — stat box on Carry Charts (+101 Walker, +21 Gibbs). No printed definition.
3. **Completion percentage over expected (CPOE)** — stat box on Pass Charts (+16.7% Purdy, +10.9% Dart, 55.3% Allen). No printed definition.
4. **EPA per dropback** — stat box on Pass Charts (Mahomes +0.25). No printed definition.
5. **Pressures / Pressure rate (%)** — stat box on Pass Rush Charts (9 (30.0%), 8 (44.4%), 8 (30.8%)). No printed definition.
6. **Get-off (seconds)** — stat box on Pass Rush Charts (0.70 Van Ness, 0.69 Hendrickson). Inferred from usage: time from snap to first pass-rush movement.
7. **Blitz rate** — stat box (Cashman 40.9%) and post text (% of dropbacks blitzed). No printed definition.
8. **Quick pressures** — defined in post text ONLY: "under 2.5 seconds" (Cashman 7 quick pressures; Van Ness 5). This is the closest thing to a printed definition in the whole pass.
9. **Time to pressure** — post text ("Cashman averaged 1.88 seconds to pressure"). No printed definition.
10. **Top speed (mph)** — post text throughout (21.21 Walker, 20.80/20.35 Williams, 20.43 Milroe, 16.88 Kelce, 20.09 Sadiq, 19.70 JSN). No printed definition.
11. **YAC / YAC over expected** — post text (+32 Kelce, +33 Flowers, +35 JSN). No printed definitions.
12. **Air yards / air distance** — post text (44-yard Purdy completion, 57.2-yard Jefferson air distance, 39.0-yard Kupp). No printed definition.
13. **Target separation (yards)** — post text (1.0 yard, Kupp). No printed definition.
14. **Completion probability** — post text (19.8% Kupp reception). No printed definition.
15. **Win probability added (WP added)** — post text (+28.5%, JSN). No printed definition.
16. **Success rate** — stat box on Carry Chart (Allen 78.6%). No printed definition.
17. **Receiving yards over expected (RECYOE)** — stat box on Route Chart (+46 JSN). No printed definition.
18. **NGS overall draft score** — 0-100 scale; axis labels printed: "< AVG" / "AVERAGE" / "GOOD" / "ELITE" (50/60/75/90/100). No formula.
19. **NGS athleticism score** — 0-100 scale (Bears 83 average; 76+ for each of first six picks). No formula.
20. **Route classification** — Mike Evans' "34 touchdown receptions on go/fade routes since 2018" implies a route taxonomy; 2026's "Route Classification 2.0" (see below) is its successor.
21. **Motion at snap %** — "49ers featured motion at the snap on 65.6% of plays" (highest of Shanahan era). Player-level: Juszczyk in motion at snap on 17 of 33 snaps.
22. **Under-center splits** — "Walker gained 148 of his 173 rushing yards on under center runs."
23. **On/off-field splits** — "When Hendrickson was on the field: 58.6% pressure rate... Without him: 20.0%."
24. **Coverage matchup tables** — per-defender: coverage matchups, receptions-targets, yards, TDs, man coverage %.
25. **Yards after missed tackles (team)** — "Broncos missed 28 tackles, allowing 247 yards after missed tackles."
26. **Chip blocks faced** — "Garrett faced a league-high 139 chip blocks" (2025).
27. **Quick pressures (career)** — "218 quick pressures over the last five seasons" (Garrett).

## Recurring graphic formats (templates we can mirror with public data)

1. **Pass Chart** — field-view pass-location map. Always: player / season+opponent / #+position / team; legend COMPLETE (green), TOUCHDOWN (blue), INCOMPLETE (white), INTERCEPTION (red), LOS (blue line), yard markers; stat boxes COMP/ATT, YARDS, TD-INT + one efficiency metric (CPOE or EPA/dropback).
2. **Carry Chart** — field-view carry-path map. Always: player / matchup / #+position / team; legend TACKLED FOR LOSS (red), 0-5 YDS GAINED (yellow), 5+ YDS GAINED/TD (green), TOUCHDOWN (blue target), LOS (blue line), FUMBLE LOST (red target); stat boxes CARRIES, YARDS, TD + one metric (MTF, RYOE, or SUCCESS RATE).
3. **Route Chart** — field-view route map. Always: player / matchup / #+position / team; legend INCOMPLETE ROUTE (gray), ROUTE (white), AFTER CATCH (green), TOUCHDOWN (blue target), LOS (blue line); stat boxes TARGETS-REC, YARDS, TD, RECYOE.
4. **Pass Rush Chart** — pass-rush path map. Always: player / matchup / #+position / team; legend NO PRESSURE (gray), PRESSURE (green), SACK (blue circle), LOS (blue line); stat boxes PASS RUSHES, PRESSURES (%), SACKS + GET OFF (seconds) or BLITZ RATE.
5. **Coverage comparison table** — one instance: "BY COVERAGE DEFENDER" (GONZALEZ vs ALL OTHERS): coverage matchups, receptions-targets, yards, TDs, man coverage %; footer takeaway line.
6. **AWS/NFL Draft infographics** — bar-chart rankings of NGS overall/athleticism draft scores; axis labeled < AVG / AVERAGE / GOOD / ELITE; plus the 32-team "Projected First-Round Big Boards" infographic (NFL IQ, powered by AWS).

## New 2026 metrics announced (Sep 8 post, link card, no graphic)
"• Run Scheme Classification • Run Blocking Matchups & Metrics • Route Classification 2.0" — watch for these in the product (pro.nfl.com) and future posts; they are the 2026 additions to the public NGS suite.

## Narrative patterns (content lessons, not data)
- Benchmark framing: "most since at least 2018/2016", "first in NFL history", "Nth player since last season" — every stat ships with a historical anchor.
- Situational splits carry the insight: blitz vs. not, under center, on/off field, man vs zone, by coverage defender.
- Video posts pair one tracking number (top speed, YAC over expected) with the clip.
- Quote-tweet commentary on @NFLPlus/@NFL_Researcher/@RapSheet posts extends reach without new graphics.
- pro.nfl.com and NFL Pro are the recurring product surfaces; NFL IQ (powered by AWS) is the draft-season surface.

## GSE applications (recorded, not decided)
- Mirror the four chart templates with nflverse/FTN-charting data: pass-location maps + CPOE/EPA, carry-path maps + RYOE/MTF, route maps + RECYOE, rush-arc maps + pressure/get-off.
- Adopt quick-pressure (<2.5s) as the rush-win quality split; get-off and time-to-pressure as edge-eval inputs.
- Adopt the situational-split discipline: blitz-rate splits, under-center splits, on/off-field splits, per-defender coverage tables — these are the formats that make tracking data predictive for props/DFS.
- Watch for Run Scheme Classification and Route Classification 2.0 outputs to reverse-engineer the taxonomy.
