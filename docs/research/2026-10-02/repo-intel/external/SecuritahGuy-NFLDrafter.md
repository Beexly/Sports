# SecuritahGuy / NFLDrafter

- **Stars:** 4 | **License:** NONE (no license file) | **Pushed:** 2026-09-02 (alive, "revival" in Sept 2026) | **Lang:** TypeScript + Python (FastAPI + React + SQLite)

## Vision
A local-first fantasy draft command center: custom scoring profiles, multi-source draft ranks (FantasyPros ECR 50% / ESPN 20% / FFC ADP 30% weighted blend), VORP tiers, news-correlated watch lists, draft-confidence estimates, Yahoo league sync, and a weekly-prep workspace. Runs entirely on the user's machine with SQLite.

## The Ask
- FastAPI backend + React frontend + SQLite (WAL mode). Yahoo OAuth for league sync (optional). FantasyPros/ESPN/FFC feeds via public endpoints with a 7-day cache. `nflreadpy` for nflverse data (needs network).

## Constraints
- **No license file** — cannot adopt code; method study only.
- Each source is assigned an explicit role (ECR = conviction, ESPN = draft-room ordering, FFC ADP = acquisition cost) rather than being dumped into one pot — the discipline is the point.
- Automated Yahoo live-pick sync explicitly NOT implemented; manual draft console is the reliable path.

## GSE lens
Two sharp lessons. First, **source-role discipline**: NFLDrafter never treats every number as interchangeable — each feed has a named job. GSE's 47-signal registry lists signals but (per the known gaps) has no producers wired and no documented role/weight per signal. A registry without roles is a phone book. Second, **the honesty ledger**: its README carries a "revival status" table marking exactly what's implemented, what's labeled-fallback, and what's not implemented. GSE's AGENTS.md tracks inventory, but public-facing honesty about calibration state ("this signal is uncalibrated, shadow-only") needs the same tabular discipline — and enforcement tooling for it doesn't exist yet. The weighted-blend math (50/20/30 with named roles) is also a directly reusable pattern for GSE's interim consensus baseline.

## Verdict
**REBUILD** — no license; re-implement source-role discipline, the honesty-ledger pattern, and the weighted blend as GSE's own.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/SecuritahGuy/NFLDrafter
- GitDiagram: https://gitdiagram.com/SecuritahGuy/NFLDrafter
- Star history: https://star-history.com/#SecuritahGuy/NFLDrafter (4 stars)
- github.dev: https://github.dev/SecuritahGuy/NFLDrafter
