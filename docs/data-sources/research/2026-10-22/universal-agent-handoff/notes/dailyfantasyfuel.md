# Daily Fantasy Fuel — server-rendered DFS projections (no API at all)

Worth stating plainly: this one has **no JSON API**. The projections are in the HTML, inside a
`<table>` whose rows carry `class="projections-listing" data-week="7" data-start_date="2026-10-25"`.
Parsing the rendered DOM is the whole technique.

- `GET https://www.dailyfantasyfuel.com/nfl/projections/draftkings` — 200, 1.67 MB.
- 405 rows matched on the `FPTS` marker; 341 parsed cleanly into
  `extracted_data/dailyfantasyfuel_nfl_projections_2026-10-22.csv` with name, position, salary,
  projected FPTS, their VALUE multiplier and matchup.
- Top of board: Gibbs RB $9,800 / 26.5 FPTS / 2.7x vs GB; Puka Nacua WR $8,400 / 24.4 / 2.9x.
- 64 rows lost where the name/position markup did not match the regex — a parser tightening job,
  not a data limitation.

## Why it matters
Daily fantasy projections were the one metric family the KB had no source for (Sleeper gives stat
lines, not DK-salary-shaped projections with a value multiple). This fills it, and salaries join to
LineStar's salary space for the same slate.
