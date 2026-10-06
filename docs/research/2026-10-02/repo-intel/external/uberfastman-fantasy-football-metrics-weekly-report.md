# uberfastman / fantasy-football-metrics-weekly-report

- **Stars:** 227 | **License:** GPL-3.0 | **Pushed:** 2025-10-01 (alive, seasonal cadence) | **Lang:** Python

## Vision
Generate a polished weekly report (stats, metrics, rankings, power rankings) for a fantasy football league across five platforms: Yahoo, ESPN, CBS, Sleeper, Fleaflicker. It exists because league commissioners and content creators want a turnkey "weekly packet" — data in, PDF/report out — without hand-building graphics and narrative each week.

## The Ask
- Runs as CLI, Git, or Docker. Needs per-platform auth tokens (Yahoo OAuth, ESPN cookies, Sleeper keyless, etc.).
- Assumes a season is live; seasonal workflow (update each week, rerun the report).
- Compute: trivial, local machine.

## Constraints
- **GPL-3.0** — copyleft. Cannot be absorbed into proprietary GSE code without open-sourcing the combined work. Study-only.
- Seasonally alive but maintainer-driven; pushes cluster around NFL season.
- Output is a generic stat packet, not a predictive product — no projections of its own, just descriptive metrics.

## GSE lens
This is the most direct mirror of Garrett's **standing weekly DFS packet deliverable** (write-up + graphics + position boards). One solo dev built a multi-platform weekly packet generator years ago. GSE's weekly packet format exists as a deliverable spec, but the weekly machine that produces it on schedule doesn't. The weak point: **GSE talks about weekly packets; uberfastman ships them.** The build lesson is the pipeline architecture: platform adapters → metric computation → PDF/report rendering, all runnable from a cron. GSE should rebuild this pattern as its own (GPL blocks adoption).

## Verdict
**REBUILD** — learn the adapter/report pipeline pattern; GPL-3.0 forbids direct adoption into GSE.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/uberfastman/fantasy-football-metrics-weekly-report
- GitDiagram: https://gitdiagram.com/uberfastman/fantasy-football-metrics-weekly-report
- Star history: https://star-history.com/#uberfastman/fantasy-football-metrics-weekly-report (227 stars)
- github.dev: https://github.dev/uberfastman/fantasy-football-metrics-weekly-report
