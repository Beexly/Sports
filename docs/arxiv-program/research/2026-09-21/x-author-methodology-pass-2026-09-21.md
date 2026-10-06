# X Author Methodology Pass — 2026-09-21 (evening)

Read-only timeline research on the 9 benchmark authors: recurring metrics, exact formulas/definitions (verbatim where public), data sources, chart footers, and public code/data trails. No likes, replies, reposts, follows, DMs, or form submissions. No paywall/login bypass.

## @acccountstat (Stat Acccount, 13.9K followers)
- Recurring: Drop Rate vs Contested Catch Rate; Top 10 CBs by Yards/Coverage Snap; RB Elusiveness; WR Receiving Efficiency; Yards x EPA; QB Pass Accuracy.
- **Method (verbatim, Aug 30 2025):** "Rates are averaged across 4 sources: @PFF @SumerSports @SportsInfo_SIS @FTNFantasy" — simple arithmetic averaging across sources.
- **(verbatim, Sep 10 2025):** "Most charts are just data straight from the source. Nothing complicated. For this chart, completion probability is a mix of next gen stats and nflreadr models. Accurate throw % is an average of catchable throw and on target throw % from sports info solutions... No stats I post are fake, but these ones are 'made up' in the sense that I combined different stats and sources to improve reliability from a small 1 week sample size"
- Does NOT chart his own data. No code/repo/methodology write-up found.

## @scottbarrettdfb (Scott Barrett, 116.9K followers)
- xFP (popularized at PFF 2017): fantasypointsdata.com describes it as "XFP from a model over the play's own context, recombined through whichever scoring system you pick." Exact model undisclosed.
- **Depth-adjusted YPT over expectation (verbatim):** "Expected Yards per Target (based on depth of target on each individual target) vs. Actual YPT" → Actual YPT − Expected YPT. Min 30 targets on seasonal boards.
- **Weighted Opportunity:** RB targets vs carries weighting — "Over the past 3 seasons, a RB target has been worth, on average, 2.52 times more than a carry" (full PPR).
- Pressure Rate Over Expectation (team OL rankings). YPRR charts. Data: FantasyPoints in-house charting ("eight unique charting processes"). Formulas behind login.

## @sfdata9ers (9,565 followers)
- Weekly "QB Performances" table: columns Total QBR, EPA/Play, CPOE, SR, Time to Throw, aDOT, YAC%, QB Rating.
- **Header (verbatim):** "pre-MNF | Season: 2026 | Min. 20 rel. plays & 15 pass attempts | Ordered by Total QBR"
- **Footer (verbatim):** "Colors according to historical percentiles" (percentile computation undisclosed).
- **CPOE source (verbatim reply):** "I use the official @NextGenStats numbers for this one. rbsdm has their own CPOE model I assume"
- Total QBR on ESPN 0–100 scale; provider unstated. EPA/Play source undisclosed. Also posts PGWE (Post-Game Win Expectancy).

## @pff (1.5M followers)
- **Grading definition (verbatim, Sep 15 2026):** "What the PFF grade measures is the part of the play the QB actually controls — the read, the decision, the throw. Not the result that lands in the box score."
- WAR (Wins Above Replacement), Big Time Throw rate, Carry Share. Full grading/WAR formulas undisclosed (PFF PRO).

## @hawkblogger (Brian Nemhauser, 62.2K followers)
- **Escape Rate (verbatim, Sep 4 2026):** "It's a metric that captures how good offenses are at avoiding obvious passing situations. These are the offenses that are most QB and pass protection friendly." Data: @SumerSports. Exact construction undisclosed.
- HB Power Rankings: automated/formula-based, weekly; formula lives in the hawkblogger.com write-up ("I'm not a big fan of opinion-driven rankings. The numbers are the numbers").

## @ff_marvine (Marvin Elequin, 13.6K followers)
- Weekly xFP & Opportunity Report (thefantasyfootballers.com).
- **(verbatim):** "Expected Fantasy Points (or xFP): The average (or expected) fantasy value of a player's opportunitie[s]…" / "Fantasy Points Over Expected (FPOE): The difference between a player's actual fantasy production and [expected]" / "xFP is by far the more stable and predictive metric. However, it is not a ranking system."
- Series primer with model detail exists (URL not captured this pass). WOPR = 1.5 × Target Share + 0.7 × Air Yards Share (formula per brief; not found verbatim — treat as approximate).

## @ihartitz (Ian Hartitz, 236.1K followers)
- Relays TruMedia charts (pre-snap shift/motion, play-action %); does NOT build them himself (verbatim: "idk why they break it up that way but it's just play-a[ction percentage on dropbacks]"). No methodology disclosed. No code/data links.

## @joea_nfl (Joe, 11K followers)
- Manual film charting; weekly "FINAL Week N Charts". Taxonomy: throw grades elite/great/solid/routine/bad/interceptable; play rows (sacks, no-fault sacks, throw-aways, runs, pocket moves, fumbles); metrics rows (accuracy %, accuracy+ %, +/− play %, Cheap Play %, PGP, letter grades).
- **PGP (verbatim, Nov 1 2024):** "The PGP algorithm was designed to, in theory, grant the perfectly average starter a 0.00. Over these hundreds of games, the average PGP is 0.14. The algo seems to be working. I grade on a bell curve. Average Starters are a C (2.0 GPA). The average game grade is 1.96."
- **League baselines (verbatim, Nov 26 2023):** "League average Negative Play rate: 29.1%. … League average positive play rate: 23.5%"
- Undisclosed: per-grade rubric, accuracy %/accuracy+ % formulas, Cheap Play % definition, PGP algorithm details.
- Public assets: free Patreon posts (2022) with grading legend (anchored to most-average NFL QB, e.g. Colt McCoy) + spreadsheet of every game graded + season composites + blank template; 10,000 snaps graded for 2023.

## @gridironinfo_ (3,632 followers, joined Jul 2026)
- Recurring: Playoff Probabilities series (preseason + weekly in-season), unit rankings, NGS Aggressiveness charts.
- Playoff-probability methodology (simulation vs formula) undisclosed. No code/data links.

## Gaps remaining
@sfdata9ers percentile math + EPA source; @joea_nfl newer columns (Accuracy+, Cheap Play %, PGP algo); @gridironinfo_ full trail; Barrett PROE formula + current xFP deltas; @acccountstat averaging weights; SumerSports reproducible formulas (commercial).
