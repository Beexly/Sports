# 2026-09-18 benchmark sweep: full-table inventory

Sourced tables transcribed verbatim from live X posts during the morning sweep
(2026-09-18, ~09:08–10:05 CDT). Approximate/scatter reads are NOT here; they
live in ../chart-reads/ with approx labels. See AGENTS.md "X Analytics /
Advanced-Metrics Benchmark Sweep (2026-09-18)" for the neutral metric
inventory.

- **cmain7-sf-ros-win-prob.csv** — cmain7, 2026-09-17. Model win probability
  per game, 49ers remaining schedule. Source stated: cmain7's own model.
- **tejfbanalytics-qb-total-epa-week1.csv** — @tejfbanalytics, 2026-09-17.
  Top-10 QB total EPA: EPA/DB, completion%, aDOT, success%, pressure EPA/DB,
  total EPA. Source linked: Sumer Sports.
- **paganetti-backfield-combos-week1.csv** — Ryan Paganetti, 2026-09-17.
  Two-back formation usage 14.3% vs middle-open coverages; runs +0.10 EPA/play
  (97 plays), passes +0.26 (46 plays); 2025 rushing comparisons. Source:
  his play-by-play data (his reply).
- **paganetti-two-back-vs-mof.csv** — Ryan Paganetti, 2026-09-17.
  Personnel/coverage combos vs middle-open. Source: his play-by-play data.
- **paganetti-six-up-week1.csv** — Ryan Paganetti, 2026-09-17. Six-defenders-up
  pre-snap rate by team (32 rows; NYJ 3.5% was captured in the source post,
  see AGENTS.md section).
- **paganetti-middle-third-target-week1.csv** — Ryan Paganetti, 2026-09-17.
  Middle-third target rates vs middle-open/closed.
- **paganetti-play-clock-week1.csv** — Ryan Paganetti, 2026-09-17. Play-clock
  drain by team. (approx read — see caveat in AGENTS.md)
- **paganetti-rush-ypa-regression-week1.csv** — Ryan Paganetti, 2026-09-17.
  Expected rushing YPA regression by team. Source stated: Next Gen Stats.
- **sfdata9ers-negative-run-pct-week1.csv** — @sfdata9ers, 2026-09-17.
  Negative-run percentage by team. Source stated: FTN.
- **sfdata9ers-cost-of-drops-week1.csv** — @sfdata9ers, 2026-09-17. Cost of
  Drops = Air EPA + expected YAC EPA - Actual EPA; drops charted by FTN.
- **sfdata9ers-composite-qb-rankings-week1.csv** — @sfdata9ers, 2026-09-17.
  Weighted QB composite: QBR 0.35, EPA/play 0.25, CPOE 0.15, Bad Throw% 0.10,
  Pressure-to-Sack% 0.10, Air Yards/Rec 0.05. Source stated: PFR.
- **sfdata9ers-tnf-recap-det-buf.csv** — @sfdata9ers, 2026-09-18. Thursday
  night recap, DET at BUF. Source stated: FTN.
- **sfdata9ers-week2-previews.csv** — @sfdata9ers, 2026-09-18. Week 2 matchup
  previews; four team logos unidentified and marked uncertain.
- **sfdata9ers-box-defenders-week1.csv** — @sfdata9ers, 2026-09-17. Box-defender
  distributions vs offensive success rate, Week 1. Source stated: FTN.
- **sfdata9ers-box-defenders-2025.csv** — @sfdata9ers, 2026-09-17. Same, 2025
  season. Source stated: FTN.
- **sfdata9ers-blitz-tendencies-week1.csv** — @sfdata9ers, 2026-09-17. Blitz
  tendency distribution (no/one/two-plus blitzers). Source stated: FTN.
- **sfdata9ers-missed-tackle-rates-week1.csv** — @sfdata9ers, 2026-09-17.
  Missed-tackle rates by team; two team logos unidentified.
- **sfdata9ers-tnf-preview-det-buf.csv** — @sfdata9ers, 2026-09-17. TNF preview,
  DET at BUF. Source stated: FTN.
- **marcus-mosher-big-plays-week1.csv** — @Marcus_Mosher, 2026-09-17. Biggest
  plays by EPA, Week 1. Source: nflverse (nflreadpy).
- **patton-any-a-leaders-week1.csv** — @PattonAnalytics, 2026-09-17. ANY/A
  leaders; preserves source post's duplicate "Drew Lock" entry as displayed
  (likely author typo, not corrected). Source stated: StatRankings.
- **statyx-gibbs-lane-shares-week2.csv / statyx-gibbs-run-path-interaction-week2.csv
  / statyx-gibbs-runner-evidence-week2.csv** — Statyx/@32BeatWriters, 2026-09-17.
  Jahmyr Gibbs rush-path package. Source stated: statyx.io.
- **statyx-cook-lane-shares-week2.csv / statyx-cook-run-path-interaction-week2.csv
  / statyx-cook-runner-evidence-week2.csv** — @statyxio, 2026-09-16. James Cook
  rush-path package (same statyx tool, second instance).
- **statyx-te-targets-week1.csv** — @statyxio, 2026-09-17. TE targets w/
  EPA/target (McBride 13 tgts/35% share/+0.289; Likely 8 tgts/+1.379).
- **statyx-qb-volume-vs-efficiency-week1.csv** — @statyxio, 2026-09-16. Pass
  yards vs EPA/DB (Shough 410 yds/-0.017; Allen 334 yds/+0.454).
- **statyx-def-explosive-pass-allowed-week1.csv** — @statyxio, 2026-09-16.
  Defensive explosive pass % allowed; ONLY ranks 19–32 were capturable from
  the post image (top half cut off).
- **magicsportsguy-buf-cb-assignments-tnf.csv / magicsportsguy-det-wr-alignment-tnf.csv
  / magicsportsguy-wr-man-zone-splits-2025.csv / magicsportsguy-cb-2025-context.csv**
  — @MagicSportsGuy, 2026-09-17. DET-BUF StatRankings matchup report:
  BUF CB alignment/coverage assignments, DET WR alignment, WR man/zone
  splits (TPRR/YPRR/FP-per-RR), 2025 CB context. Source stated: StatRankings.
- **gridironinfo-det-buf-offense-week2.csv** — @GridironInfo_, 2026-09-18.
  18-metric offensive comparison DET | NFL Avg | BUF for the Week 2 TNF game.
  Source stated: nflverse (nflreadr) pbp + FTN charting + Next Gen Stats.
- **gridironinfo-det-buf-epa-breakdown-week2.csv** — @GridironInfo_, 2026-09-18.
  Dropback/designed-run EPA split for both teams. Same source.
- **gridironinfo-det-buf-move-the-chains-week2.csv /
  gridironinfo-det-buf-series-results-week2.csv** — @GridironInfo_, 2026-09-18.
  Down-by-down chain movement and series results for DET/BUF. Same source.
- **gridironinfo-det-buf-biggest-plays.csv** — @GridironInfo_, 2026-09-18.
  Top 3 positive / top 3 negative plays by EPA in DET-BUF. Same source.
- **gridironinfo-det-passing-week2.csv / gridironinfo-det-rushing-week2.csv /
  gridironinfo-det-receiving-week2.csv** — @GridironInfo_, 2026-09-18. Lions
  full boxscore with CPOE, IWP, aDOT, EXP, EPA. Same source. Minor
  discrepancies between this slide and slide 1 (Goff Pass SR% 57 vs 55;
  EPA/DB +0.44 vs +0.41) are as displayed.
- **gridironinfo-buf-passing-week2.csv / gridironinfo-buf-rushing-week2.csv /
  gridironinfo-buf-receiving-week2.csv** — @GridironInfo_, 2026-09-18. Bills
  full boxscore. NOTE: the passing slide displays Allen's CPOE/EPA/EPA-DB with
  negative signs in green-highlighted cells, contradicting slides 1–2;
  transcribed as displayed, apparent chart error flagged.
- **gridironinfo-dropback-outcome-week1.csv** — @GridironInfo_, 2026-09-18.
  Complete/Incomplete/Scramble/Sack/INT % of dropbacks, 32 QBs. Source stated:
  nflverse. NOTE: post text claimed Lawrence "without taking a single sack"
  but the chart shows Lawrence Sack 4.2% — text/chart inconsistency flagged.
- **gridironinfo-air-yards-buckets-week1.csv** — @GridironInfo_, 2026-09-17.
  Pass attempts by air-yard bucket (0-5/6-10/11-20/21+), 32 QBs. Source
  stated: nflverse.
- **gridironinfo-qb-epa-per-play-week1.csv** — @GridironInfo_, 2026-09-17.
  QB EPA-per-dropback leaders, Week 1 (Lawrence +0.79, Dart +0.71). Source
  stated: nflreadpy.
- **gridironinfo-gb-wr-usage-week1.csv / gridironinfo-dal-wr-usage-week1.csv**
  — @GridironInfo_, 2026-09-16/17. Packers and Cowboys WR usage
  (snaps/targets/receptions/yards/success rate). Source stated: nflverse
  (nflreadpy).
- **patton-playcaller-tendencies-week1.csv** — @PattonAnalytics, 2026-09-17.
  "Tendency Rating" composite for 32 play callers via Y-Aware PCA on
  personnel diversification / play sequencing / tendencies; values are
  approximate bar reads. Source stated: StatRankings. Method stated by author
  in reply: correlates well with EPA.
- **fantasypts-similarity-finder-washington.csv** — @FantasyPtsData, 2026-09-16.
  Similarity Finder: Parker Washington (Week 1 2026) vs top 10 historical WR
  season comps with SIM score, FP/G, xFP/G, RTE%, TGT%, TPRR, YPRR, ADOT,
  1st-read%, 1st-downs/route. Source stated: Fantasy Points Data Suite 2.0.
- **fantasypts-bellcow-report-week1.csv** — @FantasyPtsData, 2026-09-16. Each
  RB's share of his team's backfield xFP (32 backs). Source stated: Fantasy
  Points Data Suite 2.0.
- **fantasypts-def-targets-by-position-week1.csv** — @FantasyPtsData, 2026-09-16.
  Defensive targets by position (WR/TE/RB shares); only the text-attributed
  standouts (TB 26% RB share, GB 36% TE share) are exact — the rest were
  approximate stacked-bar reads and were NOT transcribed.

### Evening sweep additions (2026-09-18 PM; window: posts since 10:00 CDT)
- **devyeusuf-separation-score-2ndyear-wr-2026.csv** — @DevyEusuf, 2026-09-18
  6:59 PM CDT. "Separation Score — 2nd-year WRs · 2026 · min 10 routes":
  Sep Score, YPRR, TPRR, Win Rate, Sep Market Share (Sep MS), ADOR, TGT%.
  Source (footer): exported from Fantasy Points Data Suite 2.0.
- **scottbarrett-yprr-elite-2025-26.csv** — @ScottBarrettDFB, 2026-09-18
  6:22 PM CDT. Advanced Receiving table (2025+2026, WR/TE): league avg +
  ranks 1–16 (Nacua 3.84, JSN 3.79, Kincaid 3.54); rows 17+ cut off in the
  screenshot, marked in-file. Source: Fantasy Points Data Suite 2.0.
- **statyx-irving-lane-usage-week2.csv /
  statyx-irving-run-path-interaction-week2.csv /
  statyx-irving-runner-evidence-week2.csv** — @statyxio, 2026-09-18 11:48 AM
  CDT. Bucky Irving vs CLE rush-path package (third instance of the same
  statyx tool after Gibbs and Cook): lane usage + CLE lane ranks, interior/
  left/right run-path interaction, Runner Evidence percentiles (3.88 YAC/att
  76th; 0.63 evaded tackles/att 99th; 62.5% rush success 99th). Source stated:
  statyx.io.
- **benbbaldwin-objective-ratings-v2-2026-09-18.csv** — @benbbaldwin
  (Computer Cowboy), 2026-09-18 12:18 PM CDT. UPDATED "objective ratings"
  composite: "Market-implied win% vs. a league-average team on a neutral
  field" — 32 teams in 5 tiers (LAR 72.8 favorite; Ravens 68.4 … Dolphins
  24.2). Author's description: lines as starting point, then solves for the
  rating that best reproduces chances of winning division/conference/etc.
  Footer: "Blends near-term game lines with division/conference/Super Bowl/
  playoff/#1 seed futures (DraftKings). Date: 2026-09-18". Author confirmed
  in replies the source is DraftKings sportsbook lines/futures.
- **benbbaldwin-remaining-sos-2026-09-18.csv** — @benbbaldwin, 2026-09-18
  12:29 PM CDT. Remaining strength of schedule: site-adjusted average
  remaining-opponent win% vs a league-average team (Cardinals 55.6 hardest …
  Saints 43.4 easiest).
- **cmain7-schedule-adjusted-ev-survivor-week3.csv** — @cmain7, 2026-09-18
  6:07 PM CDT. "Current Entry EV by Week 1 Team Used": schedule-adjusted EV
  per surviving entry vs $1,341 flat equity (Raiders/Cardinals/Jets $1,559 …
  Lions $1,114). No source stated.
- **sfdata9ers-buf-rushing-summary-week2.csv** — @sfdata9ers, 2026-09-18
  3:51 PM CDT. BUF rushing summary vs DET: carries, 1st downs, carry
  distribution, success rate, rush EPA, EPA/rush, most common run direction
  (Allen 11 car/72 yds/2 TD/8 1stD, 0.87 EPA/rush). Historical 2012–2022
  EPA/rush percentile bars noted.
- **sfdata9ers-allen-passing-efficiency-grid-week2.csv** — @sfdata9ers,
  2026-09-18 3:17 PM CDT. Josh Allen passing efficiency grid vs DET (air-yards
  bucket × left/middle/right): comp/att, yards, EPA/att per cell + summary
  (20/31, 248 yds, total EPA 25.4, EPA/play 0.53, CPOE -2.6%). Footer: "Data
  from official NFL play-by-play description."
- **sfdata9ers-allen-career-epa-play-heatmap.csv** — @sfdata9ers, 2026-09-18
  12:35 PM CDT. Josh Allen career EPA/play heatmap, Weeks 1–21 × 2018–2026,
  per-game opponent + EPA/play (min 20 relevant plays); "—" = no game or
  below minimum. Colors = QB EPA/Play percentiles vs NFL average.
- **sfdata9ers-sf-mia-last8-games.csv** — @sfdata9ers, 2026-09-18 12:57 PM
  CDT. SF vs MIA last 8 meetings (2001–2024): season, week, stadium, QBs,
  result. Basic table, retained for the file's stated matchup context.
- **sfdata9ers-playcalling-tendencies-week1.csv** — @sfdata9ers, 2026-09-18
  11:57 AM CDT. Week 1 offensive playcalling tendencies, 32 teams + NFL avg:
  Motion / Screen / Play Action / No Huddle / RPO % of all rush+pass plays.
  Header: "Data: FTN". Author correction in thread: actual motion leader is
  LAC (84.3%), not SF (78.1%) as the post text claimed; tags can co-occur
  (197 times in Week 1) so columns do not sum to 100%.
- **hawkblogger-pressure-rates-generated-allowed-2026.csv** — @hawkblogger,
  2026-09-18 9:22 PM CDT. Pressure rate generated × pressure rate allowed,
  32 teams, ranked table (KC 56.3% generated / 39.4% allowed … MIA 6.5% /
  40.5%). Footer: "hawkblogger.com · Source: FTN charting · 2026 regular
  season".
- **magicsportsguy-nyg-lar-cb-assignments-week1.csv /
  magicsportsguy-nyg-receiver-alignment-week1.csv** — @MagicSportsGuy,
  2026-09-18 12:05 PM CDT. StatRankings AI "Cornerback / Receiver Matchup
  Report" (NYG @ LAR, Week 2): LA coverage assignment map (Watson 80.8% left;
  McDuffie 80.8% right; both 14.7% man / 85.3% zone) and NYG receiver
  alignment (Nabers 79.2% perimeter; Fields 68.4% perimeter; Mooney 58.3%
  slot). Peer-group percentile ranks in parentheses. Source stated:
  StatRankings (Player Alignment+, CB Metrics+ tools).
- **magicsportsguy-mooney-man-zone-splits-2025.csv** — same post/report.
  Darnell Mooney 2025 man/zone splits (CoverageIQ+): routes, target share,
  1st-read%, TPRR, YPRR, FP/RR vs man and zone.
- **magicsportsguy-nyg-lar-cb-2025-context.csv** — same post/report. 2025
  larger-sample context: Watson / McDuffie / Lake routes defended, FP/RR
  allowed, target rate allowed.
- **magicsportsguy-target-distribution-position.csv** — same post/report.
  Team Target Share and Team Target Share Allowed by position (WR/RB/TE),
  offense + defense, NYG and LAR, 2025 vs Week 1 2026 (never blended).
- **magicsportsguy-coverage-shell-splits-2025.csv** — same post/report.
  Coverage shell splits (CoverageIQ+, 2025): Puka Nacua vs Cover 1/3/4 and
  Davante Adams vs Cover 1/3 (routes, target share, 1st-read%, TPRR, YPRR,
  FP/RR with percentile ranks).
- **pff-defensive-grades-single-game-2026.csv** — @PFF, 2026-09-18 12:19 PM
  CDT. "Highest defensive grade in a game this season (min 20 snaps)": Deone
  Walker 93.0 (Week 2), Ventrell Miller 92.4, T.J. Watt 92.3, Dante Trader Jr
  91.8, Vernon Broughton 91.8. Source: PFF's own grades (implied, not
  footered); image was a player photo, not a chart.
- **jmac-bills-target-distribution-week2.csv** — @JMac_FF, 2026-09-18 11:51
  AM CDT (found via TPRR search). Bills target distribution with target share
  + TPRR side-by-side (Kincaid 28.5%/30.7%, Coleman 21.4%/21.4%, Shakir
  21.4%/28.6%, Palmer 10.7%/17.6%); LaPorta row truncated in source, marked
  in-file. No source stated.
- **rjanalytics-lawrence-depth-buckets-week1.csv** — @rjanalytics7002
  (Ryan Joseph), 2026-09-18 10:52 AM CDT (found via CPOE search). Trevor
  Lawrence Week 1 throws by depth bucket: attempts, comp%, average receiver
  separation, average time to throw. Post states Lawrence "led the NFL in
  CPOE in week 1 according to @NextGenStats"; no footer on the table image.

../chart-reads/ (approximate scatter/quadrant reads, not full tables):
- **sfdata9ers-cpoe-vs-ttt-week1.csv** — @sfdata9ers, 2026-09-17. CPOE vs
  time-to-throw scatter; approximate positions. Source stated: Next Gen Stats.
- **paganetti-success-rates-week1.csv** — Ryan Paganetti, 2026-09-17. Offensive
  success rate vs opponent; approximate positions.
- **paganetti-run-consistency-week1.csv** — Ryan Paganetti, 2026-09-17. Run
  consistency scatter; approximate positions.
- **gridironinfo-4man-rush-week1.csv** — @GridironInfo_, 2026-09-17. 4-man rush
  rate vs pressure rate; only named standouts are exact (SF ~28% pressure on
  86% 4-man; PIT ~21% on 92%; JAX ~25% on 55%; MIN ~12% on 15%), the rest are
  approximate quadrant placements. Sources stated: FTN Charting + nflverse PBP.
- **gridironinfo-blitz-epa-week1.csv** — @GridironInfo_, 2026-09-17. Offensive
  vs defensive EPA/play on blitzes (5+ rushers); only named values are exact
  (CIN defense -1.49 EPA/play allowed on blitzes; NYJ offense +0.99 EPA/play
  vs blitz), the rest are approximate quadrant placements. Source stated:
  nflverse (nflreadpy).
- **gridironinfo-int-badthrow-vs-adot-week1.csv** — @GridironInfo_, 2026-09-16.
  INT/Bad Throw ratio vs aDOT scatter; only named outliers are exact (Maye
  ~1.5 ratio at ~6.5 aDOT; Allen ~13.0 aDOT at ~0.0 ratio). Sources stated:
  PFR Advanced Passing + NGS / nflverse (nflreadpy). Definition (verbatim):
  "This ratio shows what share of a QB's bad throws actually turned into a
  pick. Low = getting away with mistakes. High = paying for them."
