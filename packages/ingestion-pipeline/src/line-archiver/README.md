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

## Product prices (SPEC-B extension, 2026-10-15)

SPEC-B (the pick spec) can only score products the archive captures:
alternate lines, buy-point prices, teasers. The featured leg above
captures the main line only, so a second leg — `espn-product-prices.ts`,
wired by `run-product-prices.ts` — probes the keyless ESPN surfaces per
in-window event for alternate-line ladders and persists whatever
genuinely exists as `OddsLineSnapshot` rows under the **additive** market
values `ALT_SPREAD` / `ALT_TOTAL`: same row shape, same stores, same
serializer, same OPEN/INTERIM classification per (gameId, market), same
`espn-public-dk` source stamp. Existing rows and consumers are untouched
— `ALT_*` rows are new market values in the same table (dry-run: a
separate JSONL, default `line-archive-products-dry-run.jsonl`).

```sh
# Dry-run — probe the live surfaces, append any product rows to JSONL
npx tsx packages/ingestion-pipeline/src/line-archiver/run-product-prices.ts --dry-run --out ./products.jsonl

# DB mode — appends rows; no-op unless LINE_ARCHIVE_ENABLED=true
npx tsx packages/ingestion-pipeline/src/line-archiver/run-product-prices.ts
```

Extraction never invents a price: a ladder is an array under a key whose
path names it an alternate AND names its market; entries are accepted in
outcome form (`{ name, price, point }`) or side form
(`{ home: { line, price }, away: { … } }`), strictly validated, and a rung
identical to the featured row (same side, line AND price — the main line
inside the ladder) is dropped so the featured price is never
double-archived as a product. Every run reports per-class exposure and
names unexposed classes in its result's `gaps`. There is deliberately
**no cron route for this leg yet**: the keyless surfaces expose no
ladders today (table below), and hourly production fan-out for an
availability probe is spend without capture. Wire the route the day a
run reports a class exposed.

### Product-price gaps (explicit — sources checked 2026-10-15, event 401872995 SEA@DEN)

| product class | keyless status | source(s) checked |
| ------------- | -------------- | ----------------- |
| `ALT_SPREAD` (alternate spread lines + prices) | **NOT EXPOSED** — main line only (open + current) | ESPN scoreboard inline odds block; ESPN summary `pickcenter` (its bet-type links enumerate only Moneyline / Point Spread / Total); ESPN core-API odds index + provider detail (`…/events/401872995/competitions/401872995/odds/100`) |
| `ALT_TOTAL` (alternate totals + prices) | **NOT EXPOSED** — main line only (open + current) | same three surfaces as above |
| Buy-point prices | **NOT EXPOSED** — a buy-point price is an alternate-ladder rung adjacent to the main line; no ladder exists on the checked surfaces | same three surfaces as above |
| Teaser prices / teaser-relevant shifted lines | **NOT EXPOSED** — no teaser card and no ladder to shift from on the checked surfaces | same three surfaces as above |
| DraftKings guest API (the book behind the ESPN block, direct) | **UNVERIFIABLE from the capture environment** — `sportsbook-nash.draftkings.com` answers HTTP 403 (Akamai edge) for the event endpoint; contents not read, block not routed around (no spoofing, per doctrine) | `GET /sites/US-SB/api/v5/events/34118277` (the DK event id carried in ESPN's own deep links), 2026-10-15 |
| MONEYLINE | already captured by the featured leg (home/away rows, `line: null`) — confirmed against tonight's game: SEA −142 / DEN +120 | ESPN scoreboard inline odds block |

The known keyed path to ladders exists but is **outside this leg's
keyless fence**: The Odds API's catalog carries `alternate_spreads` /
`alternate_totals` markets (per its public market docs) on keyed plans.
If SPEC-B prioritizes product scoring before a keyless surface ships
ladders, that is the priced route — it would ride the existing Odds API
legs, not this one. Nothing here fabricates the missing prices in the
meantime.

One adjacent non-capture, stated plainly: the checked payloads also
carry each book's **opening** line beside the current one. An opening
price is not a product price, and stamping it with a later `capturedAt`
would falsify the series (phase `OPEN` already means first-captured, not
opened-at), so this leg leaves open lines unarchived.

## Failure behavior

- Upstream ESPN failure: the run returns `errors: ["fetch failed: …"]`,
  persists nothing, and the CLI exits 1. A partial board (some date boards
  failed) proceeds with the events it got and records the fetch error.
- One game's resolve/write failure never stops the slate: it is caught,
  recorded in `errors`, and the run continues.
- A game in-window with no usable odds (ESPN carries no inline book for it)
  is counted in `gamesWithoutRows`.
- Product leg: a surface that fails to fetch is simply not consulted (and
  never claimed in the run's `sourcesChecked`); an event whose surfaces
  all fail is recorded in `errors` and the slate continues. Zero product
  rows with `gaps` populated is a finding, not a failure — the product
  CLI exits 0 unless the probe itself failed (errors and nothing scanned).

## Files

- `espn-line-archive.ts` — core: window filter, phase classification, store
  seams (DB + JSONL), the gated/ungated runners. Dependency-injected;
  unit-tested in `../../__tests__/espn-line-archive.test.ts`.
- `run-line-archiver.ts` — production wiring (real ESPN client, normalizer,
  game resolver, Prisma store) + the operator CLI + `runLineArchiverJob`
  used by the cron route.
- `espn-product-prices.ts` — the product-price extension core: per-event
  probing of the keyless ESPN surfaces (core odds detail + summary
  pickcenter), strict alternate-ladder extraction, exposure/gap
  accounting, the gated/ungated runners. Unit-tested in
  `../../__tests__/espn-product-prices.test.ts` against tonight's real
  captured payloads plus synthetic ladders.
- `run-product-prices.ts` — the extension's wiring (real keyless payload
  fetches, game resolver, stores) + operator CLI + `runProductPricesJob`.
  CLI-only for now — see "Product prices" above for why no cron route.
