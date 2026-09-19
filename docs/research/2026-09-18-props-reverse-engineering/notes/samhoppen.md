# @SamHoppen — source notes (read 2026-09-18, index)

- Primary data: nflfastR/nflverse PBP — confirmed foundation via nflverse docs:
  - https://github.com/nflverse — nflfastR cleans PBP, applies EPA and WPA models; data releases CSV/Parquet/RDS/QS.
  - https://cran.r-project.org/web/packages/nflfastR/nflfastR.pdf — fields epa, wp, wpa, vegas_wp, vegas_wpa.
  - https://ftp.openbsd.dk/pub/mirrors/pub/cran/web/packages/nflfastR/nflfastR.pdf — calculate_win_probability() inputs: possession, score differential, clock, spread, down, distance, yard line, timeouts, second-half kickoff indicator.
  - https://www.degruyterbrill.com/document/doi/10.1515/jqas-2018-0010/html — EPA/WPA = ending-state value minus starting-state value (public formal definition).
- Hoppen's own processing style: https://www.4for4.com/2021/w8/hoppen-conclusions-week-8-insights-and-analysis — "neutral script" filter = outside 2-minute warning, offensive WP 20%–80%; shows his nflfastR-style PBP processing but not the 10-facet chart code.
- Ten facets (from prompt): Pass Off, Run Off, Pass Def, Run Def, Takeaways, Giveaways, Off Pen, Def Pen, Special Teams, Other.
- Inferred computation: orient each play's epa/wpa to the selected team (offense as-is when team possesses; negate for opponent; handle ST carefully); assign mutually exclusive facet with precedence turnover > penalty > pass/run > ST > other (exact precedence unconfirmed); sum team-oriented EPA and WPA per facet. WPA sums to ≈ final WP − initial WP if each play assigned exactly once. Total EPA additive over all plays.
- No public repo/code found for the exact chart. Exact categorization rules = inferred; must label as such.
