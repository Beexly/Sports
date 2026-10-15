# Line Archiver — ESPN/DraftKings leg

Hourly, append-only capture of DraftKings lines for every upcoming NFL game,
persisted as `OddsLineSnapshot` rows. This is the producer the forward line
archive always lacked: `../line-archive.ts` only persists what the paid Odds
API refresh already fetched, and with `LINE_ARCHIVE_ENABLED` never flipped in
production the L-14 label census (2026-08-20) found `odds_line_snapshots` at
**zero rows ever** — every line-movement / CLV consumer downstream starved.
This job creates the rows.

## What it does, exactly

One run:

1. Fetches the keyless ESPN public scoreboard's inline DraftKings block for
   the NFL via `fetchEspnOddsForSport` (`@sports/data-ingestion`) — no API
   key, no credits. (Pinnacle is deliberately NOT used here: its guest API
   is US-IP blocked. The Pinnacle leg lives in `../pinnacle-line-archive.ts`
   and rides The Odds API.)
2. Keeps games kicking off in **(now, now + 7 days]** — T-7d through
   kickoff. A game that has kicked off is never captured here; settle-time
   CLOSE tagging (`markClosingSnapshots`) owns it from there.
3. Normalizes with `DataNormalizer` and converts via the existing
   `toLineSnapshotRows`: per game up to 6 rows — MONEYLINE home/away
   (`line: null`), SPREAD home/away (away line = negation of the home
   point), TOTAL over/under.
4. Resolves each ESPN event to its canonical `Game` row
   (`resolveCanonicalGame`: ESPN-seeded games carry externalId
   `espn:americanfootball_nfl:<eventId>`; the twin matcher covers games the
   paid path created). Events that resolve to no tracked game are counted
   and listed in the run result — never silently dropped, never archived
   against a wrong game. This job never creates Game rows (that is
   `seed-games-from-espn.ts`'s job).
5. Appends the rows. Nothing is ever updated or deleted by this job.

Row shape — field-for-field the object `captureLineSnapshots` hands to
`oddsLineSnapshot.createMany`, matching
`packages/db/prisma/schema.prisma` (`OddsLineSnapshot`):

| field        | value                                                              |
| ------------ | ------------------------------------------------------------------ |
| `gameId`     | canonical `Game.id`                                                |
| `capturedAt` | the run's single UTC timestamp, shared by every row in the batch   |
| `phase`      | `OPEN` for the first snapshot ever of that game+market, else `INTERIM` (per game+market, classified against the store — same rule as `captureLineSnapshots`). `CLOSE` is never stamped here |
| `book`       | `espn_public` (the ESPN client's bookmaker key — codebase law: it labels DraftKings lines as an ESPN-routed public feed) |
| `market`     | `SPREAD` \| `MONEYLINE` \| `TOTAL`                                 |
| `side`       | `home` \| `away` \| `over` \| `under`                              |
| `price`      | American odds (platform convention end to end)                      |
| `line`       | points for SPREAD/TOTAL, `null` for MONEYLINE                      |
| `source`     | `espn-public-dk` (vs the US refresh's `the-odds-api` and the EU Pinnacle leg's `the-odds-api-eu` in the same table) |

`id` / `createdAt` are DB-assigned and intentionally absent from the row
objects, exactly as in `captureLineSnapshots`.

## Key & week convention (canonical — do not improvise)

Rows are keyed ONLY by the resolved canonical `Game.id` (production) / the
seeded Game externalId (dry-run). **This job derives no week number from
any source, and no ESPN week label appears in any key, row, or join.**
Internal keys follow the dataset convention in `data/gse-dataset/games.jsonl`;
external week labels are display-only. The conventions differ: tonight's
game is `game_id 2026_06_SEA_DEN`, **week 6** in games.jsonl (and in
Hermes' freeze and the situational graph), while ESPN displays it as
Week 7. A Week-7 key against the Week-6 dataset joins is a silent miss —
reconcile at the source, never at the join.

## The gate

Production (DB) mode is **hard-gated on `LINE_ARCHIVE_ENABLED=true`** — the
same founder flag as the rest of the archive. Flag off ⇒ the job is a logged
no-op: zero ESPN fetches, zero DB calls. Turning capture on is the founder
flipping that one env var in production; nothing else changes.

## Cadence hookup

- **Vercel cron (production):** `apps/web/app/api/cron/line-archiver`
  (route in `apps/web/app/api/cron/line-archiver/route.ts`), scheduled
  hourly at minute 7 (`"7 * * * *"`) in both `vercel.json` copies. Auth is
  the standard cron auth (`CRON_SECRET` / Vercel platform cron). The route
  only ever runs DB mode.
- **Operator CLI** (from the repo root):

  ```sh
  # DB mode — appends rows; no-op unless LINE_ARCHIVE_ENABLED=true
  npx tsx packages/ingestion-pipeline/src/line-archiver/run-line-archiver.ts

  # Dry-run — live fetch, identical row shape, local JSONL instead of the DB
  npx tsx packages/ingestion-pipeline/src/line-archiver/run-line-archiver.ts --dry-run --out ./week7.jsonl
  ```

## Dry-run mode

`--dry-run` is an explicit operator action for verification and backfill
rehearsal. It:

- fetches the **live** ESPN board and runs the real normalize/convert path;
- writes rows as JSONL (one row per line, keys in schema order,
  `capturedAt` as ISO-8601 UTC) to `--out` (default
  `line-archive-dry-run.jsonl`);
- resolves `gameId` to the ESPN event id — which **is** the seeded Game
  externalId (`espn:americanfootball_nfl:<id>`), so dry-run rows join to
  real Game rows on that key with no translation;
- classifies phase against the JSONL file itself, so a second dry-run
  against the same file produces `INTERIM` rows exactly as the DB path
  would;
- **never touches a database** and is not gated on `LINE_ARCHIVE_ENABLED`
  (it writes only a local file). Its run result is marked `dryRun: true`.

## Why dry-run is the shipped acceptance path (blocker, stated precisely)

Real DB writes from a dev/CI machine are blocked by two standing rules, not
by this code:

1. **No DB tests on the default Neon branch** (founder rule; throwaway
   copy-on-write branches only).
2. Creating a throwaway Neon branch needs a **Neon API key, which has not
   been minted** (the founder signed into the Neon console 2026-10-01; key
   minting is still owed). No Neon connector/credential is available to
   this workspace, and no `DATABASE_URL` is present in the environment.

So the DB store is unit-tested against the delegate surface (including the
`{ in: [...] }` existence-check shape whose absence silently zeroed the
original archive), the full pipeline is verified end-to-end in dry-run
(2026-10-15, against origin/main's ESPN client: fetched 15 events, 14 in
window — the 15th kicks off just past the T+7d edge and was correctly
excluded — 14 games × 6 rows = 84 rows stamped OPEN on run 1 and INTERIM
on run 2 against the same JSONL, zero errors)
against the live Week 6 slate (games.jsonl convention; ESPN displays this
slate as Week 7 — internal keys follow games.jsonl, external week labels
are display-only), and the production flip is: set
`LINE_ARCHIVE_ENABLED=true` — after which the hourly cron writes real rows
with no code change. The first production run's result JSON (route
response / `[line-archiver]` log line) should show `rowsPersisted > 0`;
`apps/web/lib/ops/line-archive-freshness.ts` will then start reporting the
archive as fresh.

## Failure behavior

- Upstream ESPN failure: the run returns `errors: ["fetch failed: …"]`,
  persists nothing, and the CLI exits 1. A partial board (some date boards
  failed) proceeds with the events it got and records the fetch error.
- One game's resolve/write failure never stops the slate: it is caught,
  recorded in `errors`, and the run continues.
- A game in-window with no usable odds (ESPN carries no inline book for it)
  is counted in `gamesWithoutRows`.

## Files

- `espn-line-archive.ts` — core: window filter, phase classification, store
  seams (DB + JSONL), the gated/ungated runners. Dependency-injected;
  unit-tested in `../../__tests__/espn-line-archive.test.ts`.
- `run-line-archiver.ts` — production wiring (real ESPN client, normalizer,
  game resolver, Prisma store) + the operator CLI + `runLineArchiverJob`
  used by the cron route.
