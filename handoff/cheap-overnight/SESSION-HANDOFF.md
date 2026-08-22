# Overnight Handoff — 2026-08-22 (covariate bus + SEP bind)

## Context

Galaxy Sports Edge posture: independent p with process, then e = p − q.
The site is a window — we do NOT build chrome. This slice implements the
**covariate bus (IP)** and the **SEP bind** as pure, leak-safe, fail-closed
feature plumbing — no Odds market ingestion, no y-axis fields as p.

Started in `stealth/ox-alpha`. Did NOT `--resume`. Did NOT write DONE.md STOP.
Did NOT touch `C:\Users\Garrett\Sports` (canonical). Did NOT edit schema,
`.github`, Odds, or scrape layers.

## Worktrees

- `C:\Users\Garrett\Sports-bus` — branch `hermes/covariate-bus` (PR 1)
- `C:\Users\Garrett\Sports-bus-sep` — branch `hermes/ngs-sep-adot-catch` (PR 2, rebased on PR 1)
- Neither `Sports-hz` nor `Sports-board` was reused for this slice.

## PRs shipped (both pushed to origin, both OPEN)

### PR 1 — covariate bus (IP) — PR #547
Branch `hermes/covariate-bus` → `origin/hermes/covariate-bus` at `5a1790dc`

`packages/prediction-engine/src/edge-lab/covariate-bus.ts` — pure, no I/O, no Prisma.

- Key: `gsisId + season + week + statType` (receiving | passing | rushing).
- `week=0` (season aggregate) → dropped unconditionally, never selected as next-game X.
- Leak-safe: `sepForKickoff(rows, gsisId, season, kickoffWeek)` uses latest
  `1..kickoffWeek-1` receiving row. No same-week. No future. null → fail-closed.
- Fields: receiving `avgSeparation` / `avgCushion` / `airYardsShare` (airYardsShare
  is volume T only); passing `avgTimeToThrow` / `aggressiveness` / `avgIntendedAirYards`;
  rushing `pctAttemptsGte8Defenders` (box-count proxy) / `avgTimeToLos`.
- NEVER as p: `expectedCompletionPct`, `avgExpectedYac`, `expectedRushYards`,
  vendor `cpoe` / `ryoe` — all y-axis, explicitly absent from the bus type.
- Honesty: returns `{ value, grain: "week_t_for_tplus1", provenance: "weekly_ngs_mean" }`
  — weekly mean, not arrival sep. Tagged via `COVARIATE_BUS_METHOD_TAG = "covariate_bus_v1"`.
- Tests: 16 tests in `__tests__/covariate-bus.test.ts` covering leak (week t
  not used for week t), week 0 dropped, missing→null, finite sep≥0, y-axis
  fields absent by construction.
- Barrel exports in `packages/prediction-engine/src/index.ts`.

### PR 2 — SEP bind — PR #548
Branch `hermes/ngs-sep-adot-catch` → `origin/hermes/ngs-sep-adot-catch` at `2dd13d53` (6 commits)

`packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts` — binds the bus
into the aDOT×SEP catch model.

- `bindSepSamples(rows, requests)` — caller supplies `SepBindRequest` (gsisId,
  season, kickoffWeek, aDOT sample). `sepForKickoff` called verbatim.
- If bus returns null → sample DROPPED (`ok:false`, `refuse:"no_prior_row"`).
  Never invents 3.0 yards. Never imputes.
- `boundSepSamples()` convenience filter; `priced:false` on every result.
- Honesty header in file: weekly NGS mean forwarded, not arrival separation.
- Barrel exports in `packages/prediction-engine/src/index.ts`:
  `SEP_BIND_METHOD_TAG`, `bindSepSamples`, `boundSepSamples`,
  `SepBindRequest`, `SepBindResult`.
- Tests: 6 tests in `__tests__/props-hb-adot-sep-bind.test.ts` covering leak-safe
  selection (not 99, not 5.0), fail-closed on no prior row / null separation,
  aDOT field preservation, end-to-end aDOT×SEP priors.

## Test results

```
npx vitest run --root packages/prediction-engine
```
2870 passed, 2 failed (2872 total) across 265 test files.

The 2 failures are pre-existing and unrelated:
- `metric-evidence-report-markdown.test.ts` — ENOENT for
  `C:\Users\docs\math\GSE_SHADOW_METRIC_EVIDENCE_REPORTS.md` (path-root mismatch).
- `metric-source-payload-rights.test.ts` — ENOENT for
  `C:\Users\apps\web\lib\scraping\source-rights-registry.ts`.

All edge-lab tests pass (covariate-bus 16, props-hb-adot-sep-bind 6,
props-hb-adot-sep 3, props-hb-adot-catch 5 — 40 tests in the targeted run).
Full edge-lab suite: 642 passed across 62 files.

## Next up (not started)

- xYAC bind: `props-hb-air-yac.ts` needs the covariate bus for volume T + YAC
  split. Next bind on the list after SEP.
- Deep prop stats: `hermes/deep-prop-stats` is behind origin/main by 3 —
  rebase E8 red-zone TD rate when ready.
- If three fails on one file → BLOCKED, move to next bind.

## Watchdog

Watchdog pid 24188 stays live (per AGENT.md). Do not start a second Hermes.
No DONE.md STOP written.