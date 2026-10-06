# ItsTitle / fantasy-football-draft-room

- **Stars:** 29 | **License:** MIT | **Pushed:** 2026-09-02 (alive, brand new) | **Lang:** TypeScript (Vite + React)

## Vision
A free, no-account, no-API-key draft tool with two modes: (1) **mock draft** against a tunable computer room (live ADP per scoring format, adjustable positional lean, any roster shape, snake/linear/3RR), and (2) **draft assistant** that mirrors a real live Sleeper draft pick-by-pick. Deliberately refuses to offer formats its free data sources can't support (no rookie drafts — "a format that runs on nothing is worse than a missing one").

## The Ask
- Node 22.12+; `npm run install:all && npm run dev`; browser only. Zero keys, zero accounts, zero database; all settings stay in the user's browser.

## Constraints
- MIT — adoptable.
- Sleeper-only live mode. ADP cached 6h; ~600 players per board. No season-long features.

## GSE lens
The honesty doctrine in this repo is the lesson: **it ships only what its data can support and says so.** GSE's engine has the opposite failure mode on record — a reasoning trace that returned INVALID (honest, good) but also a history of components built with no consumer (coaching tau table, 47-signal registry with no producers). The GSE weak point this exposes is packaging: GSE's draft/manager tooling doesn't exist as a user-facing product at all. If GSE ever wants a draft product, this is the MIT-licensed reference implementation for the mock-room + live-mirror architecture — but the honest-scoping rule ("don't ship a format your data can't support") is the part GSE should internalize today: every uncalibrated signal must stay shadow-only, which Garrett already mandates, but it needs enforcement tooling (also a known gap).

## Verdict
**REBUILD** — adopt the honesty doctrine and the two-mode architecture as GSE's own; MIT allows direct pattern reuse.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/ItsTitle/fantasy-football-draft-room
- GitDiagram: https://gitdiagram.com/ItsTitle/fantasy-football-draft-room
- Star history: https://star-history.com/#ItsTitle/fantasy-football-draft-room (29 stars)
- github.dev: https://github.dev/ItsTitle/fantasy-football-draft-room
