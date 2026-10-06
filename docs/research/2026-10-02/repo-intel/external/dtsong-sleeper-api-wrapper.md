# dtsong / sleeper-api-wrapper

- **Stars:** 101 | **License:** MIT | **Pushed:** 2026-09-30 (alive) | **Lang:** Python (pip: `sleeper-api-wrapper`)

## Vision
A maintained Python wrapper over Sleeper's full read-only API (users, leagues, rosters, matchups, drafts, transactions, traded picks), converting raw JSON into Python types. Exists to remove the friction of hand-rolling HTTP calls against Sleeper docs. Ownership transferred from SwapnikKatkoori to dtsong in March 2022 and kept current since.

## The Ask
- Python 3.8+; `pip install sleeper-api-wrapper`; only deps are `requests` + `pytest`.
- No API key needed — Sleeper's read endpoints are keyless. No compute worth mentioning.

## Constraints
- MIT — adoptable.
- Wrapper only: no analytics, no caching, no decision layer. The Sleeper API itself is rate-limited (roughly 1000 calls/min across the community; wrapper does not enforce it).

## GSE lens
Reveals a supply-chain gap, not an engine gap. GSE's engine already has a "Sleeper market signals" adapter in the repo, but the 47-signal registry has zero producers wired. The honest read: **GSE is re-discussing plumbing that pip already solves.** There is no reason for GSE to hand-roll a Sleeper client when this (or cameron-eth/sleeper-sdk) is MIT and maintained. No verdict on which GSE should pick — but "build our own HTTP wrapper" would be pure NIH waste.

## Verdict
**ADOPT** (MIT) — use as the read path for Sleeper-sourced market signals; do not re-implement a wrapper.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/dtsong/sleeper-api-wrapper
- GitDiagram: https://gitdiagram.com/dtsong/sleeper-api-wrapper
- Star history: https://star-history.com/#dtsong/sleeper-api-wrapper (101 stars)
- github.dev: https://github.dev/dtsong/sleeper-api-wrapper
