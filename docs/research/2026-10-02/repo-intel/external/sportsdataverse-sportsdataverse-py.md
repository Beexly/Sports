# sportsdataverse/sportsdataverse-py — 120 stars

## 1. Vision
Multi-sport Python SDK over ESPN's (and others') public endpoints — NFL, CFB, NBA, CBB, MLB, NHL, soccer, hockey — with a Polars/pandas parser layer that normalizes raw JSON into usable frames. The sportsdataverse org's answer to "one package for every scoreboard."

## 2. The Ask
Needs Python (pip/uv), no API key — it rides ESPN's public endpoints. Lifecycle is *experimental*, so expect API churn. Downstream code takes Polars or pandas.

## 3. Constraints
- License: MIT.
- Scale: it wraps undocumented public endpoints — ESPN can and does change them without notice. Coverage is scoreboard/schedule/stats shaped, not betting or DFS-slate shaped.
- Maintenance: ALIVE — pushed 2026-10-01, active org.

## 4. GSE lens
GSE's known gaps include a DFS optimizer with no live slate feed and an engine that needs schedule/scoreboard plumbing. This package will not fix the slate problem (it doesn't carry DFS slate data), but its ESPN endpoint coverage and parser layer are exactly the research base for building GSE's *own* thin ESPN client — schedules, scores, and team/player endpoints the engine will need for live operation. The honest limitation: depending on a third-party wrapper over undocumented endpoints is fragile, so the value here is endpoint discovery, not the dependency.

## 5. Verdict
REBUILD — use it as endpoint documentation to build GSE's own minimal ESPN client (schedules, scoreboards, rosters) with GSE-owned retry/caching, per the re-implementation rule. Do not take a runtime dependency on it.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/sportsdataverse/sportsdataverse-py
- GitDiagram: https://gitdiagram.com/sportsdataverse/sportsdataverse-py
- Star history: https://star-history.com/#sportsdataverse/sportsdataverse-py (120 stars)
- github.dev: https://github.dev/sportsdataverse/sportsdataverse-py
