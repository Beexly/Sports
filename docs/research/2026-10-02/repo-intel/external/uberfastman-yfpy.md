# uberfastman/yfpy — 269 stars

## 1. Vision
The canonical Python wrapper for the Yahoo Fantasy Sports public API (NFL, NHL, MLB, NBA) — leagues, teams, rosters, players, stats, transactions, draft results. The go-to library for anyone building on Yahoo fantasy data, with PyPI releases and CI.

## 2. The Ask
Needs Yahoo OAuth credentials (consumer key/secret from a Yahoo developer app) and user authorization per league — it is an authenticated API, not a scrape. Python environment, pip install.

## 3. Constraints
- License: GPL-3.0 — **this is the whole story**. Copyleft: linking it into GSE's engine would contaminate the codebase.
- Scale: rate-limited by Yahoo's API; data is fantasy-league-scoped (your leagues), not a global player-stat feed — useful for league context, not for training data.
- Maintenance: ALIVE — pushed 2026-04-21, steady releases, single dedicated maintainer (uberfastman).

## 4. GSE lens
The gap this exposes is a *legal* one, not a technical one: GSE's fleet is hungry for fantasy data sources (DFS optimizer, season-long lanes), and yfpy is exactly the kind of library an agent would reach for — which is precisely why the GPL-3.0 flag matters. If any GSE agent has already vendored or pip-installed yfpy into the Sports repo or engine dependencies, that is a license contamination incident waiting to happen. The fleet needs a standing license gate (this is where the reposcope rubric earns its keep).

## 5. Verdict
IGNORE — GPL-3.0 is disqualifying for a commercial engine. Do not install, do not vendor. If Yahoo fantasy data is ever needed, rebuild a thin MIT client against Yahoo's API directly.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/uberfastman/yfpy
- GitDiagram: https://gitdiagram.com/uberfastman/yfpy
- Star history: https://star-history.com/#uberfastman/yfpy (269 stars)
- github.dev: https://github.dev/uberfastman/yfpy
