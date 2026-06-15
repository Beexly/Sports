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
| `nextgen_stats` | ✅ | CONSUMED | separation/cushion/time-to-throw (pass/rush/rec variants) |
| `pfr_advstats` | ✅ | CONSUMED | pressures/coverage/blocks (pass/rush/rec/def variants) |
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
| PFF / NGS raw feed / SIS grades | ⛔ | — | proprietary moats — we build equivalents, never copy (legal line) |

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
5. Add an explicit `rights` field to the catalog type so CC-BY vs CC-BY-SA is enforced in code,
   not just comments.
