# nflverse/nflverse-rosters — Dossier

**Stars:** 27 (verified 2026-10-02) · **Language:** R · **Pushed:** 2026-10-01 (alive) · **Created:** 2020-09-15

## 1. Vision
The build pipeline for nflverse's rosters, depth charts, and practice-report/injury data — the human-availability layer (who's active, who's hurt, depth order) behind the numbers.

## 2. The Ask
Consume via nflreadr/nflreadpy or nflverse-data release URLs. Data archived out of the repo tree in 2022; releases are the interface.

## 3. Constraints
- **License: NOASSERTION on the API** (unclear SPDX) — same nflverse-family caveat; underlying data CC-BY-4.0 via nflverse-data.
- Injury/practice-report data is sourced from team reports and scraping — timing and completeness vary by week; depth-chart data is particularly brittle late in the week.

## 4. GSE lens
Directly relevant to GSE's freshly built **OL availability provider** — but the lens is a warning: rosters/injuries are the *least automatable* nflverse dataset (practice-report timing, questionable-tag semantics, depth-chart churn), and nflverse's own pipeline is the thinnest-documented of the family. GSE's OL provider must not trust this as gospel: it needs the same treatment fantasy-football-ai gives data contracts — freshness checks, null/range checks, and a named HOLD state when the week's injury data hasn't landed. An availability signal that silently goes stale is worse than none, because downstream calibration will learn to trust it.

## 5. Verdict
**ADOPT** (the data, with contracts) — Consume via nflreadpy, but wrap the OL availability producer in freshness/null checks before it touches any model input.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/nflverse-rosters
- Gitdiagram: https://gitdiagram.com/nflverse/nflverse-rosters
- Star history (27 stars): https://star-history.com/#nflverse/nflverse-rosters
- github.dev: https://github.dev/nflverse/nflverse-rosters
