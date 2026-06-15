# Free-First Data Architecture

**Goal:** run the stats platform on $0 of paid data wherever a free, cleared source
covers the need — without lowering quality. Paid APIs are the exception, gated and
justified, not the default.

## The one paid dependency

After free-first wiring, **odds/lines are the only need that still justifies spend**
(The Odds API). Everything else — scores, schedules, status, rankings, standings,
weather, NCAA depth — is served free. The spend guard (`paidCallJustified`) enforces this
per call; in-season gating keeps the Odds API's free credits for sports actually playing.

## Free sources (all cleared, facts-only, attributed)

| Source | Covers | Key? | Clearance |
|---|---|---|---|
| ESPN public API | scores/schedule/status (7 sports), AP/Coaches rankings, standings | no | `approved_public_logged_off` |
| henrygd NCAA API | NCAA scores/rankings/standings (self-hostable) | no | free; self-host via `docker/docker-compose.yml` |
| Open-Meteo | game-time weather | no | open license (CC-BY) |
| nflverse | deep NFL stats | no | open data |

## Modules (apps/web/lib/data-sources)

- **free-adapters/** — pure parsers + fetchers per source. Schemas verified live, fixture-tested.
  `espn-scores` supports `dates` targeting (required to fetch past finals).
- **source-router.ts** — free-first, cleared-only, quality-ranked routing. Picks the best
  free source for a need×sport; only escalates to paid when no free source covers it.
  `freeCoverageMatrix()` + `planIngestion()` show exactly what to clear to remove spend.
- **cost-policy.ts** — the spend guard. `paidCallJustified()` must pass before any paid call.
- **season-gating.ts** — restricts paid odds pulls to in-season sports.
- **free-stats.ts** — TTL-cached facade over the free adapters (avoids free-tier rate limits).
- **free-first-ingest.ts** — `fetchScoresFreeFirst` / `fetchWeatherFreeFirst`: route → fetch → tag provenance.
- **cfb-free.ts** — `getCfbSnapshot()`: one cached CFB facts snapshot (scores + rankings + standings).
- **score-verification.ts** — index free finals; cross-check our recorded scores.
- **ncaa-consensus.ts** — cross-source trust + failover. `crossCheckNcaaScores()` joins ESPN ↔
  henrygd by stable team **abbreviation** + date proximity (±1 day), reporting
  agreement / disagreement / coverage gaps. `resilientNcaaScores()` fails over free→free.
- **free-settlement.ts** — `buildTrustedFinals()` fuses ESPN + henrygd into trust-tiered finals
  (CONFIRMED / SINGLE_SOURCE / DISPUTED); `settlePendingPicks()` grades via the engine's
  `calculatePickResult` but only when trusted — DISPUTED finals HOLD, unmatched stay PENDING.

## Trust discipline

Two independent free sources agreeing on a final = a **confirmed** fact. A score conflict is
**flagged and held**, never settled blindly. This is what lets free data feed the settled
track record behind the proof-gated pricing ladder ("≥100 settled + published calibration")
without compromising the no-stale/no-unverified-data rules.

## Verify $0 operation

```bash
npx tsx scripts/free-ingest-smoke.mjs
```

Hits every free source live (no key, no spend) and proves cross-source NCAA confirmation —
slates aligned dynamically so it works in any season. Exits non-zero on any failure.

## Self-hosting henrygd (no rate cap)

```bash
docker compose -f docker/docker-compose.yml up -d ncaa-api   # ghcr.io/henrygd/ncaa-api :3000
# then point the app at it:
HENRYGD_NCAA_BASE_URL=http://localhost:3000
```

Without the override the adapter uses henrygd's public demo (5 req/sec/IP cap).

## Next step (deliberate, not yet wired)

`settleSport()` in `@sports/ingestion-pipeline` still fetches scores from the paid Odds API
and matches by `externalId`. Routing it through `buildTrustedFinals` + `settlePendingPicks`
would remove that paid score fetch and add cross-source confirmation — but it changes
settlement's matching semantics (externalId → team+date), a money-critical change that should
be validated against a live DB before shipping. The pure primitives are built and tested; the
integration is intentionally held for a DB-backed review.
