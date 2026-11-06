# Engine map: where competitive intel lands in GSE

Read-only recon of `Beexly/Sports` at `origin/main` d5b69af84 (2026-11-06), worktree
`C:/c/wt-ci-rival`, branch `feat/competitive-intel`. Every claim below carries a
file:line or a command. What is not verified is marked UNVERIFIED.

---

## 1. Non-negotiables found before anything else

| Found | Where | Consequence for this work |
|---|---|---|
| Repo is PolyForm Noncommercial | `README.md:3-8` | anything derived inherits a noncommercial ceiling; commercial relaunch needs a licence decision, not a code change |
| Data GSE generates is CC BY-NC 4.0 | `README.md:6`, `DATA_LICENSE` (19 KB) | rival data joins a deliberately non-commercial corpus unless it is licensed |
| `publishes_pick` stays false, no auto-publish | `README.md:17-18`, `docs/ops/CANONICAL.md:14` | new surfaces read, never publish |
| Node 20 only, `.nvmrc` is law | `README.md:66-87`, `.nvmrc` (v20) | every command runs under 20; Node 22 passes locally and fails CI |
| `SignalFamily` stays eight | `packages/types/src/signal-registry.ts:13-37`, `README.md:28` | map rival classes onto the eight, never add a ninth |
| Sealed week-3 values are immutable | `README.md:24`, `ENGINE_METHOD.md:41-51` | never touch `2026_03_LAC_BUF` signed values |
| Long jobs never in a Vercel function | `README.md:243-248` | harvest runs in `workers/`, Actions, or locally |

## 2. The eight families, and where rival signal classes map

`packages/types/src/signal-registry.ts:13-37` is the authoritative union, and the
comment at :20-35 explains why widening beats merging: family is the clustering key for
independence, so two signals in one family count once.

| Rival signal class | Family | Rationale (the same rule the engine uses) |
|---|---|---|
| Their posted side, line, price | `MARKET` | a priced opinion about the same market |
| Their stat projection / per-player model output | `EFFICIENCY` | opponent-adjusted rate expectation, not a price |
| Their consensus percentage, ownership, ticket splits | `MARKET_MICROSTRUCTURE` | crowd positioning and liquidity, not the same as price |
| Their OL/DL, trench, pressure or run-block grades | `TRENCHES` | line-level physical dominance |
| Their injury, availability, rest, snap-count inputs | `SITUATIONAL` | context that changes who is on the field |
| Their weather, venue, roof, wind treatment | `MICROCLIMATE` | physical environment, must not collapse into situational |
| Their beat-writer, narrative, coaching-tone read | `NARRATIVE` | story and intent, not measurement |
| Their record-vs-expected, one-score luck, fumble regression | `LUCK` | outcome noise separating from process |

Hard rule: a rival pick is `MARKET` even when the writeup cites a projection. If their
projection is captured separately it is its own `EFFICIENCY` row; one rival artifact never
yields two families of the same evidence.

`SignalCategory` (`packages/db/prisma/schema.prisma:1539-1553`) is a *different* axis and
stays untouched: ODDS, SCHEDULE, WEATHER, INJURIES, RATINGS, MARKET_SENTIMENT,
PLAYER_AVAILABILITY, OFFICIALS, VENUE_ENVIRONMENT, TEAM_RATES, STANDINGS, DIVISION_CONTEXT,
MILESTONES, PACE. Rival rows use `signal_family`; they do not invent a category.

## 3. Game key

Format is `YYYY_WW_AWAY_HOME`, zero-padded week, canonical three-letter codes, and it is
used verbatim as `game_id`:

- `packages/prediction-engine/src/edge-lab/__tests__/decision-time-price-archive.test.ts:23` — `game_id: "2026_03_LAC_BUF"`
- `:24` — `market_id: "2026_03_LAC_BUF::rec_yds_over_52.5"` (market id is `<game_id>::<market_slug>`)
- `packages/prediction-engine/src/reasoning/live-edge-registry.test.ts:83` — `signed_game_id` is the same string
- `scripts/overnight/compute-week3-contract.ts:10,31` — `TARGET_GAME = "2026_03_LAC_BUF"`

Reconciliation joins on `game_key` + market. A rival pick whose game key cannot be derived
from the GSE `Game` row is quarantined, not fuzzy-matched.

## 4. Existing models this work must not duplicate

`packages/db/prisma/schema.prisma` has 104 models. The relevant ones:

| Model | Line | What already exists |
|---|---|---|
| `Game` | :300 | canonical fixture, `externalId @unique`, commence time, line movement, data quality |
| `Pick` | :518 | published pick with `confidence`, `edgeScore`, `tier`, `pickGrade`, `clvLockLine`, `clvLockPrice` |
| `PickSignalSnapshot` | :847 | per-pick signal values already captured |
| `GameSignal` | :821 | per-game signal rows |
| `Odds` / `OddsLineSnapshot` | :423 / :467 | live and historical prices, the closing-line source |
| `SourceSnapshot` | :790 | existing provenance-by-source snapshot |
| `IngestionRun` | :491 | run ledger with status |
| `PerformanceSummary` | :1414 | the `/performance` numbers |

There is **no** `RivalOrg`, `RivalPick`, `RivalAsset`, `ProspectContact`, `PaywallRecipe`,
`RivalProjection`, `RivalPromotion` or `RivalDelta`. `packages/competitive-intel` does not
exist. The competitive layer is genuinely new, but the *ingestion* of several rivals is
not: `action-network-client.ts`, `covers-client.ts`, `vsin-client.ts`,
`sharp-football-client.ts`, `fourforfour-client.ts`, `fantasypros-ecr-client.ts`,
`rotowire-rss-client.ts`, `sleeper-projections-intake.ts`, `prizepicks-intake.ts` and
`underdog-client.ts` all live in `packages/data-ingestion/src`. New work wraps and
extends these, it does not re-fetch what a client already parses.

## 5. Where a new dataset registers for licensing

Three files, in this order, all before the first fetch:

1. `apps/web/lib/scraping/source-rights-registry.ts` — source of truth. Entry shape at the
   `espn-public-api` row: `source_id`, `source_name`, `source_url`, `terms_url`,
   `jurisdiction`, `source_type`, `status`, `automation_allowed`, the six permission
   booleans (`public_logged_off_allowed`, `commercial_display_allowed`, `storage_allowed`,
   `derived_analytics_allowed`, `model_training_allowed`, `attribution_required`),
   `attribution_text`, three risk fields, `reviewed_at`, `reviewed_by`, `evidence_urls`,
   `unlock_condition`, `notes`.
2. `DATASET_LICENSES.json` — sidecar keyed by dataset id; the CV ingest gate refuses to run
   on a missing or mismatched licence (`_note` field says exactly that).
3. `NOTICE` — scope line per third-party source family.

`status` values accepted as cleared by the guard: `approved_public_logged_off`,
`approved_api`, `approved_open_license`, `approved_written_permission`
(`scripts/guardrails/ingestion-source-clearance.mjs:104-109`). Everything else, including an
unknown id, is restricted by default (`:189-193`).

The runtime gate is `checkClearance({ source_id, mode, tool_id, intents })`
(`apps/web/lib/scraping/clearance-engine.ts:38-43, 85`). `mode` is one of seven
(`extraction-modes.ts:8-15`), `tool_id` one of seven (`tool-registry.ts:12-19`), `intents`
one of six (`extraction-modes.ts:19-25`). No registry entry means `SOURCE_NOT_REGISTERED`
and a hard block without even a snapshot.

Practical consequence: for a ToS-scraped rival, the honest entry is `permission_required`
with `automation_allowed: false` until we choose to argue it, and then a
`manual_research_only` or `permission_required` + documented rationale. Claiming
`approved_public_logged_off` while the ToS forbids automation is the exact contradiction the
guard was built to catch.

## 6. Surfaces that render what

| Surface | State | What it may render |
|---|---|---|
| `/performance` | exists, gated `PERFORMANCE_STATS_ENABLED` (`README.md:210-211`) | rival-vs-own accuracy comparison, CLV deltas |
| `/promotions` | exists, compliance-gated (`README.md:212-219`) | rival promotion rows only after disclosure + terms + eligible states + `APPROVED` |
| `/cockpit/sources` | exists (`README.md:185`) | the competitor registry itself: tier, verdict, last harvest |
| `/cockpit/rivals` | to build | divergence board, `rival_only` coverage gaps |
| `/cockpit/prospects` | to build | segment counts, contact confidence, export |
| `/cockpit/brief` | exists (`README.md:182`) | top-20 divergence summary line |

Route convention: every cockpit page and `/api/cockpit/*` redirects non-admins
(`README.md:199-200`), so new cockpit routes reuse the existing `requireAdmin` guard rather
than inventing auth. Public additions ride existing flags; a new flag must be default false
with an inline `.env.example` progression note (pattern at `.env.example:78-81,113-117`).

## 7. Which guard fails the PR first

In the order they will actually fire, with the reason:

1. `ingestion-source-clearance` (`npm run guard:ingestion-clearance`) — `UNGATED_FETCH` the
   moment an adapter names a rival host and calls `fetch(` without `checkClearance`, and
   `LICENCE_CONTRADICTION` if a header says "CC-BY" on the same line as a restricted marker
   (`ingestion-source-clearance.mjs:120-160, 235-254`). It scans
   `packages/data-ingestion/src`, `packages/prediction-engine/src`,
   `apps/web/lib/ingestion`, `workers`, `scripts/ingest` (`:74-82`). A new
   `packages/competitive-intel/src` root is not in that list yet, which is itself a finding
   to fix in the same PR.
2. `api-route-boundary` (`npm run guard:api-v1-boundary` is unrelated; the route guard is
   `api-route-boundary.mjs` against the 59-entry frozen baseline) — a new API route with no
   recognised auth guard is a failure unless the baseline is deliberately extended.
3. `em-dash-scan` — any `—` or `–` in owner-facing copy.
4. `secret-scan` (`guard:secrets`) — keys pasted into fixtures.
5. `commercial-copy-scan` and `no-unsupported-performance-claims` — "beats the market" with
   no artifact behind it.
6. `draft-only` — writing `publishedAt` or flipping `status: "PUBLISHED"` outside the manual
   path.
7. `model-freeze` — only if `MODEL_VERSION` moves; a competitive layer should not move it.
8. `definition-of-done` — requires a line in `docs/strategy/AGENT-ALIGNMENT.md` and
   `docs/strategy/HANDOFF.md`.
9. `sql-identifier-case` — snake_case columns.
10. `guard:node-version-parity` and `provenance:audit` (to be added in Phase 14).

`npm run guardrails` is `node scripts/guardrails/run-all.mjs`, which runs every guard
concurrently and reports all failures, so order matters for diagnosis, not for pass/fail
(`package.json`, `run-all.mjs:1-30`).

## 8. Data flow this joins

```
worker or local run
  -> adapter (tier, licence entry, checkClearance)
  -> raw artifact to data/rival/<slug>/ + manifest hash
  -> normalizer (pure) -> zod (strict, fail the batch)
  -> six provenance columns -> Prisma RivalPick / RivalProjection / RivalAsset
  -> reconciliation job joins RivalPick to Pick on game_key + market
  -> RivalDelta -> brief top-20 -> /cockpit/rivals and /performance
```

Existing pieces reused: `fetchWithFailover` and `withMirrors`
(`packages/data-ingestion/src/fetch-failover.ts:25-56`) for transport retries,
`no-store-fetch.ts` for cache-busting, `DataNormalizer`
(`packages/data-ingestion/src/normalizer.ts:30`) conventions, `IngestionRun` for the run
ledger, `content_hash` discipline already used by `data/gse-dataset/nflverse-ingest-manifest.json`.

## 9. Open questions the code cannot answer

- Whether `GET /api/cockpit/*` auth is middleware or per-route UNVERIFIED (README asserts
  redirect; the route guard baseline suggests middleware does not cover `/api/*` at all).
- Whether PolyForm Noncommercial permits *displaying* rival data to paying customers:
  `commercial_display_allowed` on each registry entry is the answering field, and GSE's own
  licence being noncommercial makes the answer "internal analysis only" until decided.
- Whether `RivalPromotion` should reuse `CockpitComplianceStatus` (schema :1854) verbatim or
  a parallel enum. Reuse is cheaper and already has an `APPROVED` value.
