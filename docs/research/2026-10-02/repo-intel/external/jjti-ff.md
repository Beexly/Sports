# jjti / ff (ffdraft.app)

- **Stars:** 78 | **License:** NONE (no license file — all rights reserved by default) | **Pushed:** 2026-09-11 (alive) | **Lang:** TypeScript

## Vision
A web draft assistant (ffdraft.app) that ranks players by **value over replacement (VOR)** computed dynamically per league: projections averaged across ESPN, CBS, and NFL, updated daily, then adjusted for league size, roster format, scoring rules, and live ADP. The pitch: don't draft by raw rank; draft by how much value a player adds over whoever you'd get at that position otherwise.

## The Ask
- A hosted web app; user just opens it. Data side needs daily projection pulls from ESPN/CBS/NFL (public endpoints, no key).

## Constraints
- **No license** — cannot adopt or copy code; method study only.
- Averaging three sources is naive vs. proper weighting, but the VOR-over-replacement-baseline mechanic is sound.
- Single-page app scope; no season-long management.

## GSE lens
The weak point this exposes is **replacement-level thinking in GSE's rankings.** GSE publishes rankings; this repo publishes *rankings relative to what you'd get if you didn't draft the guy* — which is what actually wins drafts. GSE's rest-of-season and positional rankings (the rankings program started 2026-09-28) should be expressed as value-over-replacement computed against league-specific baselines, not as flat ordered lists. The daily multi-source projection refresh is also a standard GSE hasn't operationalized: its projection sources are still being wired, not refreshed on a schedule. Method to steal: dynamic VOR with league-parameterized replacement baselines.

## Verdict
**REBUILD** — no license, so re-implement the dynamic-VOR method as GSE's own ranking layer.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/jjti/ff
- GitDiagram: https://gitdiagram.com/jjti/ff
- Star history: https://star-history.com/#jjti/ff (78 stars)
- github.dev: https://github.dev/jjti/ff
