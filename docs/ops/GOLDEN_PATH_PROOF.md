# Golden Path Proof — Galaxy Sports Edge

**Generated:** 2026-05-29 · **By:** Claude (Opus 4.8) · **Branch:** `claude/awesome-sagan-LOyCa`

Maps the intended golden path to **real routes** in this clone, marks each
done / stub / mapped / gap, and records dead-ends. Direction confirmed with owner:
*map golden-path roles to existing routes, create no new routes, flag genuine gaps.*

Golden path (intended):
Homepage → Today's Board → Decision Room → Evidence/Trust → Coach → No-Bet/Parlay MRI →
Autopsy → Command Center → Academy → Report → Demo.

| # | Role | Real route / surface | Status | Onward path? |
|---|---|---|---|---|
| 1 | Homepage | `/` `app/page.tsx` (346L) | ✅ Done | → board, methodology, ledger; "Start in Sixty" |
| 2 | Today's Board | `/board` (195L) | ✅ Done | → `/room/[gameId]`, methodology |
| 3 | **Decision Room** | `/room/[gameId]` (164→~190L) | ✅ Done — **dead-end FIXED this pass** | → ledger, performance, methodology, responsible-play (added) |
| 4 | Evidence/Trust | Evidence Timeline (in room) + `/methodology` + `/responsible-play` + `/vault` (stub) + `RiskDisclosure` + Footer | ✅ Present (distributed) | reachable site-wide via Footer |
| 5 | Coach | `jarvis` (operator-only, in `/cockpit`) | ⚠️ Gap (no public coach) | — |
| 6 | No-Bet / Parlay MRI | concept only (`No edge, no pick` now on Decision Room) | ⚠️ Gap (no dedicated surface) | — |
| 7 | Autopsy | room "Galaxy Memory" + `/ledger` + `/performance/losses` | ⚠️ Partial (no dedicated surface) | — |
| 8 | Command Center | `/cockpit` (482L) | ✅ Done (operator-facing) | → history, dashboard, performance |
| 9 | Academy | — | ⚠️ Gap (not built) | — |
| 10 | Report | `/performance` (546L) + `/journal` + `/brief` + `/ledger` | ✅ Present | cross-linked |
| 11 | Demo | homepage "Start in Sixty" | ⚠️ Mapped (no dedicated guided demo) | — |
| — | Observatory / Vault | `/observatory` (66L), `/vault` (57L) | 🟡 Intentional pre-launch stubs | degrade gracefully |

## What changed this pass
- **Decision Room (`/room/[gameId]`)** previously had a single in-content link (back to
  `/board` at the top) and ended at a compact risk disclosure — a dead-end on the most
  decision-adjacent public surface, and short of the role's contract ("related
  intelligence, next surface, track/autopsy readiness").
- Added a **"Where This Goes Next"** section (composed from existing primitives) linking to
  Public Ledger (track record / autopsy), Calibration Report, Methodology, and
  Responsible-Play, plus a restraint line: *"Galaxy declines more games than it publishes.
  No edge, no pick — that is the process, not a gap."* This delivers No-Bet visibility and
  process-over-outcome framing **without a new route**.
- Locked in by `apps/web/__tests__/game-room-route.test.ts` (onward-links + restraint
  assertions).

## Flagged gaps (owner/Codex to schedule — NOT built this pass)
- **Coach** — a real coach implies live AI, which is owner-gated (disabled). Today `jarvis`
  serves the operator. A public, bounded, non-manipulative coach is `OWNER-GATED`.
- **Parlay MRI** — structure-diagnosis surface; `DEFERRED-NONBLOCKING`.
- **Academy** — behavior-correcting learning; `DEFERRED-NONBLOCKING`.
- **Dedicated Autopsy** — currently distributed; consolidating is `CLAUDE-BUILD-REPAIR`
  candidate for a future loop.
- **Guided Demo** — a labeled 90-second tour route; `DEFERRED-NONBLOCKING`.

## Degraded-state proof (verified)
- Picks/board/performance/observatory/vault all render explicit bootstrap/stub states with
  status badges + explanatory copy + a link onward when their gate is closed.
- `prefers-reduced-motion` honored globally (`globals.css`).
- Trust context reachable from every page via global `Footer`.
