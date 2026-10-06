# BurntSushi/nflgame — Dossier

**Stars:** 1,306 (verified 2026-10-02) · **Language:** Python · **Pushed:** 2019-10-23 (dead) · **Created:** 2012-08-29

## 1. Vision
The original community Python API for NFL GameCenter JSON data (2012-era): real-time-ish game data in Python objects for analysts and tinkerers. 1,306 stars make it the most-starred repo in this category — legacy gravity.

## 2. The Ask
Python 2/3 client over NFL.com's old GameCenter JSON endpoints. No API key; it scraped whatever NFL.com exposed at the time.

## 3. Constraints
- **License: Unlicense** (public domain) — but irrelevant now.
- **DEAD**: README is a one-liner — "THIS PROJECT IS UNMAINTAINED. Please see the actively maintained fork (derek-adair/nflgame)." The upstream feeds it depended on (feeds.nfl.com legacy JSON) are deprecated/403'd per the Public-NFL-API audit. Even the fork inherits a deprecated data source.

## 4. GSE lens
The cautionary tale, not a blueprint: **a data tool dies when its upstream dies**. Stars (1,306) did not save it. For GSE: any signal producer hard-coupled to a single scraping source is a future corpse. This is directly relevant to the 47-signal registry — if any producer design assumes one feed and no fallback, it inherits nflgame's fate. Also a reminder that "most starred" ≠ "useful today" — a good gut-check for how GSE evaluates external dependencies.

## 5. Verdict
**IGNORE** — Dead upstream feeds, unmaintained since 2019. Its design lessons are already absorbed by nflverse's multi-source, release-asset approach.

## 6. The 4 tricks
- Codewiki: https://codewiki.google/github.com/BurntSushi/nflgame
- Gitdiagram: https://gitdiagram.com/BurntSushi/nflgame
- Star history (1,306 stars): https://star-history.com/#BurntSushi/nflgame
- github.dev: https://github.dev/BurntSushi/nflgame
