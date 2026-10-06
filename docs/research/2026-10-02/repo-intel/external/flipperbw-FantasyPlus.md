# flipperbw / FantasyPlus

- **Stars:** 93 | **License:** MPL-2.0 | **Pushed:** 2020-09-10 (STALE / abandoned) | **Lang:** JavaScript (Chrome extension)

## Vision
A browser extension that injects FantasyPros projections (CBS, ESPN, NumberFire, FFToday, PFF), rankings, standard deviations, and injury-adjusted averages directly into fantasy sites, customized for the user's league scoring. Existed to fix the gap that fantasy platforms show their own projections but not consensus ones.

## The Ask
- Chrome extension install from the Web Store; scrapes FantasyPros pages at view time.
- Assumes FantasyPros page structure stays stable (it doesn't).

## Constraints
- **MPL-2.0** — file-level copyleft; adoptable only with care.
- **Dead since 2020.** FantasyPros changed layouts multiple times since; the scraper is almost certainly broken. The concept is the only surviving value.

## GSE lens
Two lessons. First, the product idea is validated and old: **show your projections inside the user's existing workflow, not only on your own site.** GSE's public surface is its own website; FantasyPlus showed that meeting users where they already draft (ESPN/Yahoo/Sleeper pages) is a distribution lane GSE has never built. Second, it shows the fragility of scraping as a strategy — GSE's engine should prefer APIs (nflverse, Sleeper) over scraped projection sources. No gap in the prediction math here; the gap is distribution thinking.

## Verdict
**REBUILD** (concept only) — a GSE browser overlay is a future distribution lane; the code is dead and unusable.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/flipperbw/FantasyPlus
- GitDiagram: https://gitdiagram.com/flipperbw/FantasyPlus
- Star history: https://star-history.com/#flipperbw/FantasyPlus (93 stars)
- github.dev: https://github.dev/flipperbw/FantasyPlus
