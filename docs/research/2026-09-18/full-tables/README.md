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
