# nflverse/nflreadpy — Dossier

**Stars:** 225 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2026-09-09 (alive, active) · **Created:** 2025-09-08

## 1. Vision
The Python port of nflreadr: the one-line data loader for all nflverse releases (`nfl.load_pbp()`, `nfl.load_player_stats([2022, 2023])`, `load_team_stats`, rosters, injuries, NGS...). Built on Polars with memory/filesystem caching and progress tracking, so Python shops get the same frictionless data access R users have had for years.

## 2. The Ask
`pip install nflreadpy` (PyPI). Zero config, zero keys. Internet to pull release assets. Optional: convert Polars → pandas with `.to_pandas()`.

## 3. Constraints
- **License: MIT** — full commercial freedom.
- Explicitly labeled "Lifecycle: experimental" by nflverse (badge in README), though it's the recommended Python path and pushed monthly.
- API mirrors nflreadr, so breaking upstream changes propagate to both.

## 4. GSE lens
This is already GSE's best-practice data path and it exposes a **dependency-management gap, not a data gap**: GSE's training mission commits frozen parquets to a branch — a reasonable freeze — but nflreadpy's `load_*` design shows the *healthy* consumer pattern: never scrape, always load versioned releases, cache locally, and keep the loader thin. If GSE's engine code pulls data through ad-hoc paths instead of one thin loader module (the "one feature module" idea fantasy-football-ai demonstrates), the freeze becomes a fork that rots. Also: nflreadpy is MIT and one year old with 225 stars — a reminder that the R-to-Python bridge is fresh enough that GSE shouldn't assume API stability; pin versions.

## 5. Verdict
**ADOPT** — MIT, alive, and already the natural loader for GSE's Python engine. Pin to a release and route ALL nflverse reads through it.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/nflverse/nflreadpy
- Gitdiagram: https://gitdiagram.com/nflverse/nflreadpy
- Star history (225 stars): https://star-history.com/#nflverse/nflreadpy
- github.dev: https://github.dev/nflverse/nflreadpy
