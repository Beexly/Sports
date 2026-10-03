# Stat-Intake Coverage Matrix — do we have EVERYTHING? (2026-06-15)

**Honest headline: not yet — but here is the exact map, verified against the live
nflverse release manifest, and the gaps I closed tonight.** "Every stat intake possible"
is a moving target; this doc makes it measurable instead of a vibe.

## How to read this — three honest tiers of "intake"
A dataset can be at one of three levels. Saying "we have it" without saying which level is
how you fool yourself.
1. **CATALOG** — the unified fetch layer (`packages/data-ingestion/nflverse-source.ts`) can
   pull + parse it (typed, tested). Capability exists.
2. **CONSUMED** — a loader actually fetches it and computes signals (`apps/web/lib/nflverse/*`).
3. **PERSISTED** — it's stored as a queryable system of record (Prisma model).

Today most analytics are CATALOG/CONSUMED but **not PERSISTED** (the Phase-A gap — see
`PROPRIETARY_METRICS_REPRODUCTION_STRATEGY.md`). Only player/stat/snap/injury/depth/
historical-game/team-efficiency are persisted.

## The nflverse universe (authoritative — 26 live release tags) × our coverage

| nflverse release | Status | Tier | Notes |
|---|---|---|---|
| `pbp` | ✅ | CONSUMED | EPA/CPOE/WP/air-yards/success — the foundation |
| `player_stats` | ✅ | PERSISTED | weekly player stats → `PlayerGameStat` |
| `nextgen_stats` | ✅ | **PERSISTED** | → `NextGenStat` (separation/cushion/CPOE/rush-yds-over-expected) — **persisted 2026-06-15** |
| `pfr_advstats` | ✅ | **PERSISTED** | → `PfrAdvStat` (QB pressure + yards before/after contact) — **persisted 2026-06-15** |
| `snap_counts` | ✅ | PERSISTED | snap share → `SnapCount` |
| `injuries` | ✅ | PERSISTED | report/practice status → `Injury` |
| `depth_charts` | ✅ | PERSISTED | role/starter → `DepthChartEntry` |
| `rosters` | ✅ | PERSISTED | season rosters → `Player` |
| `schedules` | ✅ | PERSISTED | results + closing lines → `HistoricalGame` |
| `players` | ✅ | CATALOG | all-time master |
| `combine` | ✅ | CONSUMED | athletic priors |
| `espn_data` (QBR) | ✅ | CONSUMED | ESPN Total QBR (triangulation) |
| `draft_picks` | ✅ | CATALOG | defined; **no consumer yet** (draft-capital prior unbuilt) |
| **`officials`** | ✅ **(added tonight)** | CATALOG | crew per game → referee tendencies. **Was MISSING.** |
| **`trades`** | ✅ **(added tonight)** | CATALOG | player/pick movement. **Was MISSING.** |
| **`contracts`** | ✅ **(added tonight)** | CATALOG | OverTheCap value/APY/guarantees → holdout/contract-year. **Was MISSING.** |
| **`weekly_rosters`** | ✅ **(added tonight)** | CATALOG | weekly active/inactive/IR + gsis_id. **Was MISSING.** |
| **`stats_team`** | ✅ **(added tonight)** | CATALOG | team-week EPA/CPOE aggregates. **Was MISSING.** |
| `pbp_participation` | ⚠️ RIGHTS-HOLD | — | **CC-BY-SA-4.0** (share-alike) — formation/personnel/box. Do NOT ingest without a share-alike/clearance review. High value, real legal caveat. |
| `ftn_charting` | ⛔ EXCLUDED | — | **CC-BY-SA-4.0** — correctly excluded per CLAUDE.md |
| `players_components` | ◻️ GAP (parquet-only) | — | ID-crosswalk components; no CSV asset → needs a parquet reader (our layer is CSV) |
| `stats_player` | ◻️ minor | — | newer player-stats variant; overlaps `player_stats` |
| `teams`,`misc`,`blank`,`test` | n/a | — | metadata / non-data tags |

**Tonight:** the unified intake layer now reaches **5 previously-missing CC-BY-4.0 datasets**
(officials, trades, contracts, weekly_rosters, stats_team) — real filenames + schemas verified
against the live release headers, URL builders unit-tested. That's the CATALOG tier; turning
each into CONSUMED/PERSISTED signal is the next (founder-gated) layer.

## Beyond nflverse — what competitors pull that we don't (yet)

| Source | Have? | Value | Note |
|---|---|---|---|
| Betting market (The Odds API) | ✅ | high | de-vig consensus, CLV — already wired |
| Weather (NWS) | ✅ | med | ingested |
| **College football (cfbfastR / collegefootballdata.com)** | ❌ GAP | **high** | QB college→NFL scheme transition (you named this). **Not nflverse** — needs its own source-rights classification + API terms review before ingest. |
| Big Data Bowl tracking (Kaggle) | ❌ GAP | med | Phase D — separation/space models; research-sample only |
| PFF paid API / NGS raw feed / SIS grades | ⛔ | — | proprietary moats — we build equivalents, never copy (legal line). **Founder override 2026-09-18:** PFF's own *public* player-page embedded grades (`__NEXT_DATA__`) are in scope at CATALOG tier with per-ingestion citation (time/date/exact URL); the paid PFF API stays excluded. |
| PFF public player-page grades | ✅ | med | **CATALOG (2026-09-18, WIRE-40)** — `pff-grades-client.ts`; fail-closed, sourceUrl+fetchedAt on every payload |

## WIRE-40 — 40 new verified inputs at CATALOG tier (2026-09-18)

Forty inputs live-verified by unauthenticated GET on 2026-09-18 (~01:20–01:42 CDT;
see `/tmp/verified-40/LIST.md`), registered in `packages/data-ingestion/src/source-registry.ts`
and wired as GET-only, fail-closed clients (`assertIngestible` + `noStoreFetch` +
`AbortController` timeout; every `use-with-caution` source defaults OFF behind an env flag).
**Verdict tally: 1 cleared, 14 cleared-with-attribution, 25 use-with-caution.**
Deviation from the original verified-40 tally (4/14/22): Sleeper's 3 entries were
downgraded cleared → use-with-caution because the repo's standing doctrine holds Sleeper
is free only for non-commercial use with no written commercial grant.

| # | Registry ID(s) | Client file | Verdict | Env flag |
|---|---|---|---|---|
| 1–2 | `ftn-statsiq-catalog`, `ftn-statsiq-home` | `ftn-statsiq-client.ts` | use-with-caution | `FTN_STATSIQ_INGEST` |
| 3 | `pff` | `pff-grades-client.ts` | use-with-caution | `PFF_GRADES_INGEST` |
| 4–10 | `sharp-football-pace`, `-offensive-tendencies`, `-personnel`, `-coverage`, `-offensive-line`, `-defensive-line`, `-offensive-efficiency` | `sharp-football-client.ts` | use-with-caution | `SHARP_FOOTBALL_INGEST` |
| 11–15 | `pregame-consensus-history`, `pregame-odds-history`, `pregame-consensus-meta`, `pregame-odds-meta`, `pregame-event-listing` | `pregame-client.ts` | use-with-caution | `PREGAME_INGEST` |
| 16 | `action-network` | `action-network-client.ts` | use-with-caution | `ACTION_NETWORK_INGEST` |
| 17–18 | `covers-odds-history`, `covers-live-odds` | `covers-client.ts` | cleared-with-attribution | `COVERS_INGEST` (stricter than minimum) |
| 19 | `vsin-betting-splits` | `vsin-client.ts` | cleared-with-attribution | `VSIN_INGEST` (stricter than minimum) |
| 20 | `dkn-betting-splits` | `dknetwork-client.ts` | cleared-with-attribution | `DKN_SPLITS_INGEST` (stricter than minimum) |
| 21–22 | `draftkings-getcontests`, `draftkings-getavailableplayers` | `draftkings-dfs-client.ts` | use-with-caution | `DRAFTKINGS_DFS_INGEST` |
| 23 | `spreadspoke-scores` | `spreadspoke-client.ts` | use-with-caution | `SPREADSPOKE_INGEST` |
| 24 | `keeptradecut-dynasty` | `keeptradecut-client.ts` | cleared-with-attribution | none (cleared tier) |
| 25 | `fantasypros-ecr` | `fantasypros-ecr-client.ts` | cleared-with-attribution | none (cleared tier) |
| 26–27 | `underdog-stats`, `underdog-projections` | `underdog-client.ts` | use-with-caution | `UNDERDOG_INGEST` |
| 28 | `fourforfour-cheatsheet` | `fourforfour-client.ts` | cleared-with-attribution | none (cleared tier) |
| 29 | `dynastyprocess-values` | `dynastyprocess-client.ts` | cleared | none (cleared tier) |
| 30–32 | `sleeper-state`, `sleeper-players`, `sleeper-trending` | `sleeper-feeds-client.ts` | use-with-caution | `SLEEPER_FEEDS_INGEST` |
| 33–34 | `teamrankings-ratings`, `teamrankings-trends` | `teamrankings-client.ts` | cleared-with-attribution | none (cleared tier) |
| 35 | `rotowire-rss` | `rotowire-rss-client.ts` | cleared-with-attribution | none (cleared tier) |
| 36–38 | `dvoa-timeseries-local`, `dvoa-historical-local`, `dvoa-fo-finals-local` | `dvoa-archive-client.ts` | cleared-with-attribution | none (local CSVs) |
| 39 | `ftn-charting-openapi` | `ftn-charting-spec-client.ts` | use-with-caution | `FTN_CHARTING_SPEC_INGEST` |
| 40 | `fo-wayback-dvoa-1983` | `dvoa-archive-client.ts` | cleared-with-attribution | none (Wayback snapshot) |

Notes:
- Covers, VSiN, and DK Network are `cleared-with-attribution` in the registry but their
  clients are env-gated anyway — stricter than the minimum, because their commercial
  terms (Covers redistribution limits, DK Network personal/non-commercial ToS) are narrow.
- The DraftKings DFS lobby/lineup website endpoints (#21–22) are not a documented public
  API; `draftGroupId` is ephemeral per pull and must be resolved from `getContests()` first.
- PFF: public page-embedded grades only; every ingestion must record the exact page URL
  and fetch date/time (the client returns `sourceUrl` + `fetchedAt` on every payload).
  Paid PFF API remains excluded.

## So: do we have everything? — the calibrated answer
- **Public *box + advanced* stats (nflverse CC-BY-4.0): now essentially complete at the
  CATALOG tier.** After tonight, the only nflverse data we can't reach are the CC-BY-SA ones
  (ftn_charting excluded; pbp_participation on rights-hold) and a parquet-only ID table.
- **But "intake exists" ≠ "intake is used."** The real remaining work is *down* the tiers
  (CONSUMED → PERSISTED) and the soft/contextual signals, not *breadth* of nflverse pulls.
- **Genuine breadth gaps that remain:** college data (for QB scheme transition) and tracking
  (Phase D) — both **outside nflverse**, both needing their own rights path.

## Recommended next (highest value-for-effort)
1. **Consumers for the 5 new datasets** — start with `officials` (crew penalty/total lean) and
   `contracts` (contract-year motivation), each clearance-gated + calibrated.
2. **Resolve `pbp_participation` rights** (share-alike review) — it's the single highest-value
   *scheme/personnel* dataset; unlocks formation/box/coverage context.
3. **Classify college football data** in the source-rights registry → QB college→NFL scheme.
4. **Phase-A persistence** for the analytical pillars (the bigger structural unlock).
   **In progress:** NGS (`NextGenStat`) + PFR advanced (`PfrAdvStat`) now persisted as
   systems of record (storage only, not yet scoring inputs). Remaining pillars: `stats_team`
   (team aggregates), per-player EPA allocation from PBP, then the universal signal ledger.
5. Add an explicit `rights` field to the catalog type so CC-BY vs CC-BY-SA is enforced in code,
   not just comments.
