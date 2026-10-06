# 2026-09-20 benchmark sweep: full-table inventory

Sourced tables transcribed verbatim from live X posts during the morning sweep
(2026-09-20, ~09:08–09:45 CDT). Window: posts after 2026-09-19 ~21:40 CDT
(end of the 2026-09-19 PM sweep). See AGENTS.md "X ANALYTICS SWEEP 2026-09-20 AM"
for the neutral metric inventory. PM sweep entries below (window: posts after
2026-09-20 ~09:40 CDT); see AGENTS.md "X ANALYTICS SWEEP 2026-09-20 PM".

- **raritosfootball-team-nota-del-1-al-10-week2.csv** — @RaritosFootball
  (Raritos del Football), 2026-09-20 7:23 AM CDT. "Una nota del 1 al 10"
  composite team rating (EPA + success rate + pressure summarized into one
  1–10 figure), with ATAQUE and DEFENSA sub-ratings; all 32 teams. Source's
  comma decimals converted to period decimals. Extended columns (EPA,
  success rate, EPA allowed, pressure rate) transcribed from the site's
  public stats table for ranks 11–32 only; ranks 1–10 rating columns come
  from the post image (top 10 shown). Data as stated: SūmerLive
  (SumerSports) vía "Cuaderno de Temporada NFL";
  https://raritosdelfootball.com/nfl/estadisticas/ (public, ungated).
- **raritosfootball-qb-ratings-top10-week2.csv** — @RaritosFootball,
  2026-09-20 7:23 AM CDT. QB position tab, top 10 as shown in the post image
  (NOTA | DROPBACKS | EPA/DROPBACK | ÉXITO EN DROPBACK % | PASES AL OBJETIVO %
  | PRESIONES → SACK %): Geno Smith 9.3 ... Caleb Williams 7.0. This is the
  10-row image read, not the full 1,396-player table on the site.
- **magicsportsguy-personnel-usage-new-ocs-2026vs2025.csv** — @MagicSportsGuy
  (Kevin Adams / StatRankings), 2026-09-19 10:39 PM CDT. 11 / 12 / 21
  personnel usage rates, 2026 season-to-date vs 2025, for the 21 teams with
  new offensive coordinators (63 rows): TEAM | OC | '25 % | '26 % | +/- (pp).
  Team names attributed from team logos in the charts (charts print only OC
  surnames). League averages as stated: 11: 57.7%, 12: 21.9%, 21: 7.8%.
  Footer: statrankings.com. No definition or caveats stated by the author.
- **thunderdandfs-wr-coverage-upgrades-week2.csv** — @ThunderDanDFS
  (Thunder Dan Palyo, @RotoBaller), 2026-09-20 8:36 AM CDT. "WR Coverage
  Upgrades" (labeled "NEW THIS WEEK!"): 50 WRs + TEs projected for coverage
  upgrades vs their Week 2 opponent — 2025 baseline YPPR crossed with
  projected opponent coverage splits (OPP MAN% / ZONE% / 1-High / 2-High)
  to a PROJ YPPR (projected yards per route run); Difference = PROJ − 2025.
  Coverage blend as stated: 80% 2025 data + 20% Week 1. Injured and TNF
  players excluded. Data source not stated (author's own model).

## PM sweep (2026-09-20, ~21:08–21:22 CDT) — window: posts after ~09:40 CDT

- **sfdata9ers-game-recap-bal-no-week2.csv** — @sfdata9ers,
  2026-09-20 6:13 PM CDT. "Game Recap" card: BAL 17 vs NO 24, Week 2 2026;
  15 metrics (EPA/Play, Success Rate, EPA/Dropback, EPA/Rush, ST EPA/Play,
  Yards/Play, Explosive Play Rate, 3rd Down Efficiency, Points/Redzone Trip,
  Turnover Rate, Penalties, YAC %, Avg Starting Position, Time of Possession,
  % Game Time Favored) with historical percentile per cell and inline metric
  definitions ("% Game Time Favored = Vegas win probability").
  Verbatim post text: "BAL posted a 16.6% higher success rate than NO and
  still lost - marking the second-largest net success-rate upset since 2022."
  No data source stated (footer: "Cell colors according to historical
  percentiles"; @sfdata9ers watermark).
- **sfdata9ers-game-recaps-early-window-week2.csv** — @sfdata9ers,
  2026-09-20 6:16 PM CDT. "Game Recaps (Early Window)", Week 2 2026:
  8 early-window games, two rows per game (Team | score | EPA/Play |
  Success Rate | Special Teams EPA | Explosive Play Rate | Turnover Rate |
  Penalties n/yds). No data source stated.
- **coverageiq-defense-card-ravens-coverage-splits-2025.csv**,
  **coverageiq-defense-card-ravens-alignment-allowed-2025.csv**,
  **coverageiq-defense-card-ravens-summary-2025.csv** — @MagicSportsGuy,
  2026-09-20 9:49 AM CDT. coverageIQ+ (StatRankings) new feature: clicking a
  WR's opponent/matchup icon opens that opponent's "Defense Card" — per-team
  pass-defense dossier. Example shown: Baltimore Ravens, "pass defense vs WR ·
  2025 · 655 coverage snaps". Tables: Coverage Splits (Zone/Single high/
  Two high/Man/Blitz × Snap Rate, FP/Route, Y/Route, TGT/G, REC/G, Catch %,
  TGT Rate, Passer RTG, Y/Att, TDS; rank of 32; "—" = not displayed), Alignment
  Allowed (Left/Slot/Right/Perimeter × Targets, TGT Rate, Receptions,
  FP/Route), and summary (header rates, Fantasy Allowed to WRs, Target Share
  Allowed by position). Data source: none stated in post or image. Header
  Defense Card publicly visible at
  https://statrankings.com/nfl/coverage/team/bal; detail sections gated
  behind statrankings+ (not accessed).
- **ngreenberg-fourth-down-goforit-pct-estimates-2002-2026.csv** —
  @ngreenberg (Neil Greenberg), 2026-09-20 7:22 PM CDT. "Aggressiveness on
  fourth downs in the NFL": "% of fourth downs that featured a pass or rush
  play", GoForIt% for Weeks 1–2 of each season 2002–2026. Values are VISUAL
  ESTIMATES from the line chart (no tabular values published by the author).
  2026 Weeks 1–2 ≈ 16% (down from ≈ 21% in 2025); 2025 ≈ 20.5%; 2013 ≈ 9%
  (series low); 2009 ≈ 14.5% (first spike). Data source stated in footer:
  "Source: TruMedia · Created with Datawrapper". Author's framing: "Small-sample
  blip or new normal?" TruMedia's sports-data surface is not publicly
  accessible (trumedia.com is an unrelated business); no endpoint identified.
- **samhoppen-waterfall-game-recap-min-chi-week2.csv** — @SamHoppen,
  2026-09-20 8:51 PM CDT. "Waterfall game recap" charts: per game, two
  waterfall charts — "Win probability added by various game facets" and
  "Total EPA by various game facets" — attributing to ten facets: Pass Off,
  Run Off, Pass Def, Run Def, Takeaways, Giveaways, Off Pen, Def Pen,
  Special Teams, Other. Values shown: MIN 9 @ CHI 3, Week 2 (both teams,
  both facets). Chart footer: "Figure: @SamHoppen | Data: nflfastR". Full
  chart set for all Week 2 games at samhoppen.substack.com (paywall status
  not verified). Note: the ten-facet EPA/WPA split itself was inventoried
  2026-09-18; the new element is this per-game waterfall chart family.
- **hawkblogger-qb-epa-play-leaderboard-week2-partial.csv** — @hawkblogger,
  2026-09-20 8:58 PM CDT. QB EPA/play leaderboard screenshot (qualifier
  "min 50 dropbacks"): Player | GP | Snaps | Total EPA | EPA/Play. PARTIAL:
  image cut off at row 7 (Caleb Williams) and at the 7th column ("Su…").
  Purdy 0.51, Drew Lock 0.44, Allen 0.39, Prescott 0.34, B. Young 0.27,
  Lawrence 0.23, C. Williams 0.22. Data source: none stated.
