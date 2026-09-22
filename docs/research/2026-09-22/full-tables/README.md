# README — full-tables for 2026-09-22 AM sweep (window: posts after ~22:30 CDT 2026-09-21)
#
# Format: one CSV per chart/table image found in-window, verbatim transcription
# of the values captured in the sweep report. PARTIAL = only the rows/values
# the report captured. URLs are the X status posts the tables came from.
#
# AM sweep (one read-only browser task, 21 primary + 6 secondary accounts,
# home feed, keyword searches EPA/TPRR/aggressiveness/pass rush win rate/CPOE;
# no rate-limiting, no CAPTCHAs, no interactions)
#
# gridironinfo-gamerecap-nyg-lar-week2-overall-offense.csv — @GridironInfo_,
#   7:55 AM CDT Tue — "Game Recap: New York Giants at Los Angeles Rams Week 2,
#   NYG 6 – LA 28", OVERALL OFFENSE (metric | NYG | LA | NFL Avg). Footer
#   (verbatim): "Data: nflverse (nflready) ptp + FTN charting + Next Gen Stats
#   | aDOT excludes throwaways | 9YOE shown only where NGS charted the back |
#   2026-09-22". NOTE: "9YOE" is a new metric label surfacing here; no
#   definition given by the author.
#   https://x.com/GridironInfo_/status/2102381196353155545
# gridironinfo-gamerecap-nyg-lar-week2-drives-situations.csv — same post,
#   DRIVES & SITUATIONS table (metric | NYG | LA | NFL Avg).
#   https://x.com/GridironInfo_/status/2102381196353155545
# gridironinfo-gamerecap-nyg-lar-week2-passing.csv — same post, PASSING table.
#   Columns as labeled: player, team (game context), comp, att, yds, td,
#   air_yds_att, adot, ay_att, yoe9 (new label, undefined), off_tgt_pct,
#   pressured_pct, epa_att. Winston row: TD and all rate columns not given.
#   https://x.com/GridironInfo_/status/2102381196353155545
# gridironinfo-gamerecap-nyg-lar-week2-rushing.csv — same post, RUSHING table.
#   Adams/Nacua teams not given in the report; left blank. Kyren Williams:
#   3.6 yds before contact, -0.1 after contact.
#   https://x.com/GridironInfo_/status/2102381196353155545
# gridironinfo-gamerecap-nyg-lar-week2-receiving.csv — same post, RECEIVING
#   table. Team column omitted: the report's rows do not state teams.
#   https://x.com/GridironInfo_/status/2102381196353155545
# gridironinfo-playoff-probabilities-after-week2-partial.csv — @GridironInfo_,
#   ~9:20 AM CDT Tue — "Playoff Probabilities after Week 2". Chart: 1
#   SEED/DIVISION / DIVISION / WILD CARD odds splits. split_1/2/3 map to
#   those labels. Footer: "Data: Kalshi". PARTIAL: only the splits the
#   report captured (AFC full splits for top 8; NFC only pinned leaders
#   SF 76%, PHI 73%, SEA 73%, LAR 72%).
#   https://x.com/GridironInfo_/status/2102395519083421847
# gridironinfo-avg-drive-start-position-week2-partial.csv — @GridironInfo_,
#   9:17 AM CDT Tue — "Average drive start position". Footer: "Data: nflverse
#   (nflfastR) | 2026-09-22". PARTIAL: top 5 + bottom 2 only.
#   https://x.com/GridironInfo_/status/2102401808672952568
# gridironinfo-series-results-week2-partial.csv — @GridironInfo_, 9:12 AM CDT
#   Tue — "Series Results" (stacked bars TD / FIRST DOWN / FG / PUNT / TO %).
#   Footer: "Data: nflverse (nflreadpy) | 2026-09-22". PARTIAL: 7 sample rows.
#   https://x.com/GridironInfo_/status/2102400551220641812
# gridironinfo-first-downs-by-down-week2-partial.csv — @GridironInfo_,
#   ~9:07 AM CDT Tue — "When did they move the chains" (% of first downs on
#   1st/2nd/3rd/4th down / no conversion). Footer: "Data: nflverse
#   (nflreadpy) | 2026-09-22". PARTIAL: 3 sample rows (BUF, SF, DET).
#   https://x.com/GridironInfo_/status/2102398285201736124
# pff-most-20plus-yd-passes-without-completion-week2.csv — @PFF, ~8:55 AM CDT
#   Tue — "Most 20+ yard passes this season without a completion". Full 5-row
#   list as posted: Aaron Rodgers 0-9, Jameis Winston 0-4, Cooper Rush 0-2,
#   Cam Ward 0-1, Kyler Murray 0-1.
#   https://x.com/PFF/status/2102387133537464774
# samhoppen-proe-leaders-week2-partial.csv — @SamHoppen, 9:14 AM CDT Tue —
#   "Pass rate over expectation leaders and weekly trends" (actual vs expected
#   pass rate; expected based on nflfastR's model; PROE of 0% = black line).
#   Footer: "Figure: @SamHoppen | Data: @nflfastR". PARTIAL: 9 teams named
#   in the report only.
#   https://x.com/SamHoppen/status/2102401113915838525
# samhoppen-epa-per-drive-tiers-week2-partial.csv — @SamHoppen, 8:47 AM CDT
#   Tue — "EPA per drive team tiers" (Offensive EPA/Drive vs Defensive
#   EPA/Drive, diagonals = net tiers, kneeldown drives excluded). Footer:
#   "Figure: @SamHoppen | Data: @nflfastR". PARTIAL: 4 standouts named in
#   the report only.
#   https://x.com/SamHoppen/status/2102394414328865279
# samhoppen-explosive-play-rates-week2-partial.csv — @SamHoppen, 8:31 AM CDT
#   Tue — "Offensive and defensive explosive play rates" (Run = 10+ yards,
#   Pass = 20+ yards; rank in parentheses). Columns: Team | Total | Rushing |
#   Passing. Footer: "Table: @SamHoppen | Data: nflfastR". PARTIAL: top 5 +
#   bottom 3 rows. NOTE: the bottom 3 rows (DAL 3.0% (32), PIT 3.9% (31),
#   CLE 3.9% (30)) are ambiguous in the pass report — offense vs defense
#   table unclear — recorded verbatim; defensive table was posted but not
#   read in detail.
#   https://x.com/SamHoppen/status/2102390271975805305
# benbbaldwin-objective-power-ratings-week2.csv — @benbbaldwin, ~8:55 AM CDT
#   Tue — "WEEK 2 NFL OBJECTIVE POWER RATINGS": "NFL Team Tiers —
#   Market-implied win% vs. a league-average team on a neutral field." FULL
#   32-team table with tiers. Footer: "Blends near-term game lines with
#   division/conference/Super Bowl/playoff/#1 seed futures (Kalshi). Date:
#   2026-09-22".
#   https://x.com/benbbaldwin/status/2102385539286716556
# ryanj-heath-plays-run-while-trailing-2026-partial.csv — @RyanJ_Heath,
#   ~9:25 AM CDT Tue — "Highest percentage of plays run while trailing in
#   2026". PARTIAL: 5 highest + 4 lowest given in the report.
#   https://x.com/RyanJ_Heath/status/2102402679603363867
# ryanj-heath-backfield-xfp-week1-week2.csv — @RyanJ_Heath, ~11:30 PM CDT Mon
#   — "Most backfield XFP" (Expected Fantasy Points, backfield only). Week 1
#   top 5 + Week 2 top 5. Post text: "Two very different CHI scripts, but
#   ranked top-5 both games @FantasyPtsData".
#   https://x.com/RyanJ_Heath/status/2102240180958900722
# sumersports-aaron-donald-return-week2.csv — @SumerSports, ~11:30 PM CDT Mon
#   — Aaron Donald return tracking data cut: 32 defensive snaps, 27.8%
#   pass-rush win rate, 2 run stops, 1 pressure, 1 TFL. Data: SumerSports'
#   own tracking (promotes SumerPass).
#   https://x.com/SumerSports/status/2102244559879393437
