# cameron-eth / sleeper-sdk

- **Stars:** 20 | **License:** NONE (no license file — all rights reserved) | **Pushed:** 2026-10-02 (alive, very active) | **Lang:** Python (typed, async-first)

## Vision
A layered Python toolkit that turns the raw Sleeper API into a decision engine: (1) typed async rate-limited API client with player caching, (2) enrichment (KeepTradeCut dynasty values, marketplace trade prices, NFL stats), (3) analytics (archetypes, value deltas, positional fit), (4) a decision layer CLI that can actually *propose* trades. Explicitly positioned as the foundation for "the largest open source fantasy football project."

## The Ask
- Python; pip install. Free public APIs (Sleeper, KTC, FantasyCalc). Async design assumes a long-running process or agent loop.

## Constraints
- **No license file** — legally unusable as-is, despite the open-source ambition. Author should add one; until then it's read-only inspiration.
- Sleeper-only. Decision layer is CLI/agent-skill oriented, not a web product.

## GSE lens
The architecture diagram is the lesson: **API → enrichment → analytics → decision layer**, each independently usable. GSE's engine has the same four layers in spirit (adapters, signals, projections, optimizer) but they're not cleanly separable or independently testable — the DFS optimizer, for example, can't run without the whole engine context, and the 47-signal registry has no producers. The KTC/marketplace enrichment also flags a GSE blind spot: **GSE has no market-value layer** — no FantasyCalc/KTC-style consensus values feeding trade or DFS decisions, even though Sleeper market signals are supposedly in the plumbing. Blunt: a 20-star repo has a cleaner layered architecture than GSE's engine.

## Verdict
**REBUILD** — no license, so re-implement the layered pattern (and add a market-value enrichment tier) as GSE's own.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/cameron-eth/sleeper-sdk
- GitDiagram: https://gitdiagram.com/cameron-eth/sleeper-sdk
- Star history: https://star-history.com/#cameron-eth/sleeper-sdk (20 stars)
- github.dev: https://github.dev/cameron-eth/sleeper-sdk
