# NFL 2026 Week 1 data readiness

**Measured 2026-09-08 on production (read-only SELECT) and against the repo.**
**Kickoff: 2026-09-10T00:20:00Z — roughly 48 hours out.**
**Status: OPEN. The remedy touches `vercel.json`, which agents do not edit.**

## The state of the inputs

| Input | Rows | Freshest | Verdict |
|---|---|---|---|
| `players` | 1,370 (1,209 skill) | `recentTeam` denormalized from 2025 | ~7 months of roster movement unreflected |
| `player_game_stats` | 34,422 | **season 2025**, zero 2026 | expected — 2026 has not been played |
| `injuries` | 6,068 | **2025 week 22** (Super Bowl) | 7 months stale |
| `depth_chart_entries` | **0** | — | **table is empty** |
| `snap_counts` | 26,612 | 2025 | 7 months stale |

Every optimizer that consumes player data is, right now, reasoning from a
season that ended in February.

## Root cause: the satellites are behind a mode flag nothing sets

`apps/web/app/api/cron/refresh-player-stats/route.ts`:

```ts
const mode = (url.searchParams.get("mode") ?? "primary").toLowerCase();
const runFull = mode === "full" || mode === "all";
...
if (runFull) {
  const snaps       = await ingestSnapCounts(season);
  const injuries    = await ingestInjuries(season);
  const depth       = await ingestDepthCharts(season);
  const ngsPassing  = await ingestNextGenStats(season, "passing");
  const ngsReceiving= await ingestNextGenStats(season, "receiving");
  const ngsRushing  = await ingestNextGenStats(season, "rushing");
}
```

There are exactly two scheduled callers, and **neither passes a mode**:

- `apps/web/vercel.json` (mirrored at the repo root) schedules the bare path
  `"/api/cron/refresh-player-stats"` at `0,30 * * * *`.
- `.github/workflows/external-cron.yml` curls
  `"${CRON_TARGET_URL}/api/cron/refresh-player-stats"` at `40 */6 * * *`.

So `runFull` is **always false on every scheduled run**. Injuries, depth
charts, snap counts and Next Gen Stats have never refreshed on a schedule.
The only other path that writes them is
`apps/web/lib/ingestion/backfill-player-data.ts`, a manual backfill — which is
consistent with what production holds: one historical load of injuries and
snap counts, no depth charts at all, nothing since.

This is not a broken ingestion. `ingestDepthCharts`, `ingestInjuries` and
`ingestSnapCounts` are written, wired and tested. They are simply never
invoked by anything that runs on a clock.

## Why the tests did not catch it

Every satellite assertion in `apps/web/__tests__/refresh-player-stats-route.test.ts`
requests `?mode=full`:

```
line 202:  ...refresh-player-stats?season=2024&mode=full
line 232:  ...refresh-player-stats?season=2024&mode=full
line 249:  ...refresh-player-stats?season=2024&mode=full
```

The suite proves the satellites work **when invoked in a mode nothing invokes
them in**. Nothing asserted that a scheduled invocation reaches them. Added in
this change: a characterization test named
`"SCHEDULED RUNS INGEST NO SATELLITES ... (C-198)"` that pins the current
behaviour so the gap is loud in the test output. It is written to FAIL once the
gap is closed, and says so in its own comment.

## The fix (founder action — `vercel.json` is agent-frozen)

Pick one:

**A. Change the schedule (smallest, no code change).** Point the cron at
`/api/cron/refresh-player-stats?mode=full`. Cost: six extra nflverse fetches
per invocation. At `0,30 * * * *` that is 96 satellite passes a day, which is
almost certainly more than needed — consider also dropping this to hourly, or
adding a second, less frequent full-mode entry alongside the existing primary
one. The second option is the safer shape: keep `0,30 * * * *` primary for
weekly stats and add e.g. `15 */3 * * *` with `mode=full`.

**B. Flip the default in the route.** Make satellites run unless
`mode=primary` is explicitly passed. Fewer moving parts, but it changes the
cost profile of an existing schedule silently, and it is a code change to a
cron route rather than a scheduling decision. A is more honest about intent.

Either way, **verify afterwards** that `depth_chart_entries` is non-zero and
`injuries` carries season 2026 rows before trusting any Week-1 optimizer
output.

## The separate question this raises

Even with the cron fixed, nflverse may not publish 2026 week-1 depth charts and
injury reports until close to or after kickoff. The route already handles that
honestly — `isUnpublishedSeasonSignal` falls back to the resolved season rather
than failing — but note what that fallback means for the satellites: it would
ingest **2025** depth charts under a 2026 run. That is worse than empty,
because an optimizer cannot tell a stale depth chart from a current one.

Whatever else is decided, the optimizers themselves must state which season
their inputs came from, and refuse to project when that season is not the one
being played. That is CLAUDE.md rule 5, and it is the subject of the separate
optimizer audit filed alongside this.
