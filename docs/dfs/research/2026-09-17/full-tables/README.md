# Full tables — round-2/round-3 X sweep documentation (2026-09-17)

Complete transcribed tables from the 21-post X sweep, documented in the
Sports repository. Values transcribed from the posts' charts as displayed.

## Sources and methods (as stated in the posts)

| File | Source account | Data source stated | Method as stated |
|---|---|---|---|
| survivor-future-value-week2.csv | @cmain7 (Cody Main, Establish The Run) | not stated | Optimize rest-of-season with each team available, then with that team removed; normalized 0-100. Built for the Splash World Champ survivor contest (not Circa). Does not account for power-ranking movement or injuries. |
| qb-read-progression-week1.csv | @sfdata9ers (via @DonAtkinsonNFL quote-post) | FTN | % of all throws, min 15 relevant plays. Designated receiver* = screens, shovel passes, jet sweeps, forward tosses, etc. |
| hb-pass-protectors-week1.csv | @hawkblogger (HB Analytics) | Sumer Sports play-by-play charting | "Pressure rate grade — Blended — 2026 through Week 1, with 2025 counted at 83% and fading out by Week 6. Filters: OT, OG, C, 150+ reps." Grade = pressure-rate movement on a typical rep vs an average blocker facing the same rushers; wins vs top rushers count more; rusher grades solved simultaneously; double teams handled separately; small samples pulled to average. Full method at stats.hawkblogger.com. Negative = good. |
| hb-pass-rushers-week1.csv | @hawkblogger (HB Analytics) | Sumer Sports play-by-play charting | Same method; filters EDGE, IDL, 150+ reps. Positive = good. |
| penalty-yard-leaders-week1.csv | @sfdata9ers | not stated | Accepted penalties only (declined/offsetting excluded). Teams read from chart logos; some marked uncertain. |
| dynatyze-qb-cmp-leaders-week1.csv | @DynatyzeFF | Dynatyze's own scoring | "Every row clears 6+ dropbacks. 32 qualified rows in this cut." FPTS columns are Dynatyze's own fantasy scoring. |
| sumerpass-wr-leaderboard-week1.csv | @SumerSports | Sumer Sports own charting | SūmerPass filters: WR, Season 2026, Week ALL REGULAR SEASON, min routes run 1, team ALL. Sorted by target share desc. Last updated 2026-09-09 11:39 PM EST. |
| snap-weighted-age-offense-week1.csv | @sfdata9ers | not stated | Snap-weighted age; age as of Week 1 2026. Team abbrevs read from chart logos. Replies on the post dispute the KC defense figure (transcribed as displayed). |
| snap-weighted-age-defense-week1.csv | @sfdata9ers | not stated | Same as offense. |
| passer-rating-allowed-week1.csv | @MagicSportsGuy (StatRankings) | statrankings.com | Week 1, coverage-liability framing. Values displayed with "+" prefix; baseline not stated in the post. |
| recovery-chart-week2.csv | @jmthrivept (Jeff Mueller, PT/DPT, FantasyPts injury analyst) | own historical injury tracking | Per-player: status badge, injury detail, historical averages with sample sizes, estimated % chance to play Wk2-Wk6, PPG pre-injury → PPG first 2 games back. Updated Thu Sep 17, heading into Week 2. |
| defensive-epa-motion-at-snap-week1.csv | @RyanPaganetti (ESPN) | not stated on graphic read | Scatter of motion-at-snap pass EPA/play allowed (x) vs run EPA/play allowed (y). League avg lines: pass +0.01, run +0.00. Values are approximate reads from dot positions; all 32 team labels visible. |
| qb-aggressiveness-by-team-week1.csv | @GridironInfo_ | Next Gen Stats; footer "Data: nflverse (nflreadpy) | 2026-09-15" | NGS aggressiveness = "percentage of pass attempts where a defender was within 1 yard or less of the intended receiver at the time of the completion or incompletion" (definition quoted from the account's thread reply). |

## Additional documented items (no numeric table in the source post)

- @DevyEusuf / @FantasyPtsData: Trey McBride and Isaiah Likely were top 2 among TEs (min 10 routes) in Separation Market Share, and top 2 (min 20 routes) in target share, first-read target share, PPR fantasy points, expected fantasy points, slot % on routes. No numeric values given in the post text. campus2canton chart: "Experience Adjusted Rec Yds Per Team Pass Att" — x-axis "Year out of High School" (1-5), y-axis "Rec Yds Per Team Pass Att" (0-2+); dotted trendline "Avg of TEs with a Top 12 NFL Season"; Likely (blue) and McBride (orange) at years 1-4. Figure @JerrickBackous; data @_TanHo / @CFB_Data via @cfbfastR.
- @MagicSportsGuy: PROE+ = "Pass Rate Over Expectation + Neutral Pace" composite team metric, paywalled at statrankings.com/nfl/advanced/teams/passing/pass-rate-over-expected-plus. 1st Read % splits described as "unique StatRankings calc (not public elsewhere)".
- @statyxio: free NFL Data Lab (statyx.io); metrics named: EPA/DB, CPOE, Success %, aDOT, Sack %.
- @BobbyBruce_NFL (account not verified): DIY database with Team Snapshot, Weekly Team Card, Player Snapshot (WR); columns include TPRR, Broken Tkl/G, trend-vs-last-week indicators; auto-generated copy-ready snapshots.
- @joe307bad (account not verified): DIY dashboard topspin.blog/dashboard/pb2381/2026-27-nfl-dashboard; percentile badges per tab, composite Score of three most important stats per position group; QB top 5: Lawrence 100.00, Dart 94.62, C. Williams 91.40, Allen 90.32, Jackson 80.65.
- @ScottBarrettDFB amplifying @Shauncore's review of NFL data products (PFF, Sumer, FTN, FantasyPts); FantasyPts Data Suite 2.0 features: draggable/reorderable + custom columns, multi-year season selections, coach and play-caller pages with leaderboards, filterable/splittable infographics.
- @TheHonestNFL: film/scheme study, "3-2 Jet Stallion" triangle spacing from 3x1 for Jaxson Dart — play-name identification, not a metric.
- @ProGridSports: "Week 2 Matchups" schedule-history infographics (last 10, all-time record, wins by decade/month, kickoff time, network, streak).
