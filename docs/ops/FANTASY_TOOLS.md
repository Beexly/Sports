# FANTASY_TOOLS — parked inventory (C-360 / D3)

**Rule (D3):** every tool runs on live data or it does not exist. DFS optimizer,
props board, and GSE Score/Index stay in nav. The other nine leave nav until each
is live on a named real data path (C-412). A tool with no real data path after
C-412 is listed for deletion (C-391). Nothing stays on sample data.

Parked pages keep their routes and get `robots: { index: false }`. They are
unlinked from nav / footer / mobile-nav.

## Stay in nav (3)

| Tool | Route | Data path today | Status |
|---|---|---|---|
| DFS | `/fantasy/dfs` | `loadDfsSalaries()` — licensed DK salary feed when connected; sample slate otherwise | Partly live (math real, pool gated) |
| Props | `/fantasy/props` | `activePickemLines()` — live pick'em feed when connected; illustrative lines otherwise | Partly live (replaced by real board in Phase 3) |
| GSE Score / Index | `lib/fantasy/gse-score.ts` (library, not a page) | LIVE: nflverse process-grade via `lib/intelligence/player-model.ts`; SAMPLE: VOR+proj percentile, labelled SAMPLE | Live process-grade path exists; sample fallback labelled |

## Nine parked tools

| Tool | Route | Intended data path | What blocks it |
|---|---|---|---|
| Start-Sit | `/fantasy/lineup` | Live player pool + projections (`resolveToolPoolAsync` / licensed projections provider) | No licensed projections feed connected; pool is sample until then |
| Waivers | `/fantasy/waivers` | Roster sync + projections + free-agent pool | Needs roster sync (read-only connect is a separate parked tool) and a projections feed |
| Draft | `/fantasy/draft` | Live pool + ADP/tiers from a licensed draft feed | No licensed draft/ADP feed; runs on sample players |
| Trade | `/fantasy/trade` | Both sides valued on live GSE Score over a real pool | GSE Score sample path only until projections feed lands |
| Best Ball | `/fantasy/bestball` | Live player pool + spike-week projections | No projections feed; ceiling/spike math is real, players illustrative |
| NBA Slate | `/fantasy/nba` | Live NBA salaries + projections | Page is an explicit fictional validator demo; no NBA feed |
| Touchdowns | `/fantasy/touchdowns` | Live player TD rates, red-zone/goal-line volume, implied totals | Composite is glass-box but inputs are illustrative; needs live usage + team totals |
| Showdown | `/fantasy/showdown` | Live single-game slate salaries + projections | No live Showdown slate feed; exact combinatorics on illustrative slate |
| Connect League | `/fantasy/connect` | Read-only public roster sync (Sleeper/ESPN public) | Roster sync path is designed but not the production wire; advice stays locked without projections |

## Related (not in the nine; also unlinked from primary nav)

| Surface | Route | Note |
|---|---|---|
| Optimizer hub | `/optimizer` | One workspace over DFS/Start-Sit/Draft; parked with the tools it wraps |
| Contest Bay | `/fantasy/contests` | F-27: goes with the parked tools (C-412 / C-391) |
| Fantasy hub | `/fantasy` | Directory page; not a tool. Age gate stays (F-25) |

## Unpark order (C-412)

Fantasy-week order: who is out (injuries) → waivers → lineups → trades.

1. Connect League (roster sync is the base layer for everything else)
2. Waivers
3. Start-Sit / Lineup
4. Trade
5. Draft / Best Ball
6. NBA / Touchdowns / Showdown (daily contest tools)

A tool whose named data path cannot be built from §2 of LAST_PLAN is listed for
deletion in C-391 with the reason.
