# Session Handoff — Covariate Bus + SEP Bind

## Identity
- **Session:** `stealth/ox-alpha` — Galaxy Sports Edge (independent `p` with process, then `e = p − q`).
- **Stance:** The site is a window. We do NOT build chrome. No Odds market ingestion. `priced: false` throughout.
- **Serving SHA:** `873f3151` (origin/main). #525 is on ancestor `544d0148` — slug/cap NOT redone.

## Worktrees
| Purpose | Path | Branch |
|---|---|---|
| PR 1 — covariate bus | `C:\Users\Garrett\Sports-bus` | `hermes/covariate-bus` |
| PR 2 — sep bind | `C:\Users\Garrett\Sports-bus-sep` | `hermes/ngs-sep-adot-catch` |

`hermes/ngs-sep-adot-catch` rebases on bus commit `25b5583f` (bus is a strict ancestor).

## What shipped this turn

### PR 1 — Covariate Bus (IP): #547 ✅ (CI green, pushed, OPEN)
- **File:** `packages/prediction-engine/src/edge-lab/covariate-bus.ts`
- **Tests:** `__tests__/covariate-bus.test.ts` — 13/13 green
- **Commit:** `25b5583f` on `origin/hermes/covariate-bus`

Contract:
- Row key: `gsisId | season | week | statType` (`receiving` | `passing` | `rushing`).
- `week=0` (season aggregate) dropped unconditionally — never a next-game covariate.
- Leak-safe: `sepForKickoff(rows, gsisId, season, kickoffWeek)` uses latest `1..kickoffWeek-1` row only. No same-week, no future. `null` → `null` (fail-closed, no impute).
- Returns `{ value, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" }` — never a bare float pretending to be arrival sep.
- Exposes ONLY covariate fields. Never as `p`: `expectedCompletionPct`, `avgExpectedYac`, `expectedRushYards`, vendor `cpoe`, `ryoe` — y-axis only.
- Barrel exports in `index.ts`. `priced: false`. Pure, no I/O, no Prisma.

### PR 2 — SEP Bind: #548 (pushed, PR OPEN, CI running)
- **File:** `packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts`
- **Tests:** `__tests__/props-hb-adot-sep-bind.test.ts` — 6/6 green locally
- **Commits:** `7e966783` + `69ab88a7` on `origin/hermes/ngs-sep-adot-catch`

Contract:
- `bindSepSamples(rows, requests)` feeds `sepForKickoff` into `AdotSepCatchSample`.
- Honest header on the bind file: weekly mean ≠ catch frame. Grain forwarded verbatim.
- Fail-closed: bus returns `null` → sample DROPPED, never imputed, never 3.0 yards.
- `bindSepSamples` returns ok/no-prior-row results; `boundSepSamples` collects only bound samples.
- Barrel exports in `index.ts`: `SEP_BIND_METHOD_TAG`, `bindSepSamples`, `boundSepSamples`, `SepBindRequest`, `SepBindResult`. `priced: false`.

## Verification
- `npx vitest run` covariate-bus.test.ts: 13/13 pass
- `npx vitest run` props-hb-adot-sep-bind.test.ts: 6/6 pass (+ sep.test.ts 3/3)
- `tsc --noEmit` on `packages/prediction-engine`: clean

## Next priority — Bind #2: air+YAC (gap map §4, L2 covariate)
- Target: `props-hb-air-yac.ts` — bind `avgYac` (weekly NGS mean) via the covariate bus as a covariate.
  - Gap map says: `avgYac` → covariate → bind onto `air-yac`. `yacAboveExpected` → y-axis (GSE-xYAC referee). So the bus field is `avgYac` only.
  - `AirYacSample` currently has `{ receptions, airYards, yac }`. The bind enriches each sample with `avgYac` from `nextGameCovariate(rows, gsisId, season, kickoffWeek, "receiving", "avgYac")`.
- Then Bind #3: `props-hb-int.ts` — bind passing `aggressiveness` / `avgTimeToThrow`.
- Three fails on any file → BLOCKED that file, skip to next bind. Never idle.

## Next priority — Bind #3: INT (gap map §3)
- Target: `props-hb-int.ts` — bind passing `aggressiveness` + `avgTimeToThrow` via the bus.
- Fail-closed: null on either → drop sample.

## Constraints (do not violate)
- Do NOT edit `C:\Users\Garrett\Sports` (main worktree) — work only in worktrees.
- Do NOT touch schema, `.github`, Odds, scrape.
- Gap map: `C:\Users\Garrett\Sports-p0\docs\data\PROP_COVARIATE_GAP.md` (read-only).
- #525 is on serving SHA `544d0148` — slug/cap not redone.
