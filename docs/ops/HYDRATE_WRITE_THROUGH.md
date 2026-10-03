# PlayerGameStat → NflverseMemoryStore write-through

## Path
1. Prisma `PlayerGameStat` (SoR, nflverse CC-BY)
2. `expandPrismaPlayerGameStat` → flat `nfl.*` metrics
3. `writeThroughPlayerGameStats` (prefix allowlist + batch cap)
4. `NflverseMemoryStore.put` (PIT online cold plane)

## Code
- `packages/stats-api/src/hydration/write-through.ts`
- `hydratePlayerGameStatsToMemory(store, rows)`
- Worker: `workers/data-refresh/src/hydrate-cold-plane.ts` (no Odds API key required)
- Web: `hydrateLocalNflverseMemory` in `apps/web/lib/gse-stats/value-provider.ts`

## Session tier on /values
- `apps/web/lib/gse-stats/session-tier.ts`
- Session Stripe entitlements win; query `?tier=` alone cannot elevate.

## Packages ported (2026-07-29)
- `@sports/partner-stack` — anti-affiliate + entitlements pure
- `@sports/phase-c` — remeasure methodology (no invented 5b)
- `@sports/ops` — hydrate-force checklist

## Law
oddsApiRequired=false for cold plane · LIVE_BOARD off · measurement > narrative
