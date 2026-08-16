# PROVE THE EDGE — One-Sitting Proof Chain

> **Prepare-not-flip.** This runbook is the exact ordered command sequence that takes the owner
> from empty tables to a published-ready calibration story in a single sitting. It is **your**
> checklist — an agent does NOT run the write/prod steps here.
>
> The whole point of Phase 14 is to convert "trust us, we'll show results later" into
> "here is 25 seasons of reliability curve, here is the code, reproduce it." The strongest trust
> asset is a proof nobody can fake. This runbook makes that proof reproducible.

## Legend — what each row means for YOU

| Tag | Meaning |
|---|---|
| **READ** | No data is written. Safe for anyone to run locally or on prod. Returns real numbers. |
| **OWNER-ONLY WRITES** | This step writes production data. Only you run it. It needs a live `DATABASE_URL`, a `CRON_SECRET`, and a Stripe/test-mode setup. Do NOT delegate. |
| **OWNER-ONLY FLAG** | This step flips a founder gate / env var that changes prod behavior (e.g. `PUBLIC_PICKS_ENABLED`). Only you decide to flip it. |

---

## The honest framing (read this first)

A sustained 70% win rate against the spread does not exist — not for this product, not for anyone.
The closing line is the most accurate public prediction of a game because it is the aggregated output
of every sharp bettor, syndicate, model, and the books' quants, all pushing money until the price
balances at ~50/50 by design. Even the best professional operations alive live at **53–55% ATS**;
57% sustained is legendary. (Source: `docs/strategy/PATH_TO_PROVEN_EDGE.md`, Part I §3 / §4.)

The real north star is **Closing Line Value (CLV)**: did we get a better number than the line closed at?
Beat the close consistently and the wins follow whether or not any single bet hits. CLV is measurable,
leading, and unfakeable — a tout can cherry-pick a win streak; nobody can fake a sustained CLV beat.

**The real edge target is CLV vs. the obtainable price on a SELECTIVE subset, proven over a real
sample of 200+ fired bets — not a headline win rate.** Blind full-slate edge against a dead-efficient
NFL spread is structurally capped; this product does not chase it. Every public-facing number below
must carry that caveat, and the runbook must not imply the backfill alone proves an edge.
(Source: the P14-03 task directive, which reproduces the memory/strategy-doc caveat; see
`docs/strategy/PATH_TO_PROVEN_EDGE.md`. The specific "~52-56% / 200+ fired bets / selective subset"
caveat the task asks to be included is stated in the task itself in `handoff/SPRINT_QUEUE.md` lines
1940-1942; the grounding for it is `docs/strategy/PATH_TO_PROVEN_EDGE.md` §1/§4/§5 — the cap on
mainstream-spread win rate and the CLV-over-selective-subset + sample-floor discipline. If a
differing number is later found in a strategy doc, prefer the doc and update this runbook rather
than ship a contradictory claim.)

---

## Step 0 — Prerequisites (OWNER-ONLY: env var NAMES only)

This runbook names env var **names** only, never values. Required to boot the prod-backed steps:

- `DATABASE_URL` — live Neon (or local) Postgres. Hard-required for any WRITE.
- `CRON_SECRET` — Bearer token for the cron routes (`apps/web/lib/cron/authorize.ts`).
- `NEXT_PUBLIC_BASE_URL` — your production host.
- `THE_ODDS_API_KEY` — optional; the backfill and the proof chain above are free-mode
  (nflverse, CC-BY-4.0). Do NOT add a paid key to make this proof run; it is not needed.

Verify your credentials are live WITHOUT revealing them:
```sh
# READ — names only, prints ok/red (no values)
NODE_OPTIONS=--use-system-ca npx tsx scripts/ops/credentials-smoke.mjs
```
(`scripts/ops/credentials-smoke.mjs` — confirms presence, prints `ok`/`red`, never a value.)

---

## Step 1 — Build the historical corpus (OWNER-ONLY WRITES ×2)

The proof needs real settled outcomes. Two cron routes populate them from nflverse. They are
**GET** routes protected by `CRON_SECRET` and are **NOT registered in `vercel.json`**
(grep-verified: only `settle-picks` and `backfill-independent-trueprob` appear under `vercel.json`
crons; the two backfills are invoked on demand or by a future owner-wired schedule).
This is intentional per the prepare-not-flip doctrine — the owner decides when prod runs them.

### 1a. Historical games (writes `HistoricalGame`, schema `packages/db/prisma/schema.prisma:2855`)

Route: `apps/web/app/api/cron/backfill-historical-games/route.ts` → `ingestHistoricalGames()`
(`apps/web/lib/ingestion/historical-games.ts:37`). Replaces the whole `historical_games` table —
heavy, run occasionally.

```sh
# OWNER-ONLY — writes HistoricalGame rows. Replace <HOST> and <CRON_SECRET value>.
curl -sS "https://<HOST>/api/cron/backfill-historical-games" \
  -H "Authorization: Bearer <CRON_SECRET>"
echo $?   # expect 0; route returns { success: true, ... } on 200
```

### 1b. Team efficiency (writes `TeamGameEfficiency`, schema `packages/db/prisma/schema.prisma:2889`)

Route: `apps/web/app/api/cron/backfill-team-efficiency/route.ts` → `ingestTeamEfficiency(season)`.
Chunked: 2 seasons per call (`MAX_SEASONS_PER_CALL=2`), returns `nextFrom` to page through 1999→current.
Default range is `from=1999` to `to=currentNflSeason()` (see `apps/lib/ingestion/player-stats.ts`).

```sh
# OWNER-ONLY — writes TeamGameEfficiency rows, chunked. First chunk:
curl -sS "https://<HOST>/api/cron/backfill-team-efficiency?from=1999&to=2000" \
  -H "Authorization: Bearer <CRON_SECRET>"
# Inspect the JSON: read "nextFrom", then advance until nextFrom === null.
```

> This writes `TeamGameEfficiency` — the **only non-market NFL independent leg** in the proof chain
> (`packages/ingestion-pipeline/src/settle-sport.ts` consumes it; P14 context confirms it was
> previously unwired from live surfaces). It is the one place a real independent signal enters.

### 1c. The placebo-grade settlement engine (OWNER-ONLY WRITES — gated)

Driver: `scripts/backfill/historical-settlement-backfill.ts`. This is the one-sitting settlement
harness: for each past game it re-runs the **FROZEN** model on ONLY pre-game information, commits a
pick + proof receipt + signal snapshot, then settles WIN/LOSS/PUSH against the known final score.
It is dry-run by default and **never** flips `MODEL_VERSION` (`docs/strategy/PATH_TO_PROVEN_EDGE.md`
§5.4 / the driver header both forbid it).

```sh
# READ-FIRST (safe, zero writes) — run a single season's worth as a smoke check:
NODE_OPTIONS=--use-system-ca npx tsx \
  scripts/backfill/historical-settlement-backfill.ts --from=2023 --to=2023 --weeks=1-4
# Prints: "mode: DRY-RUN (default) — ZERO DB writes"  + a per-game summary.

# OWNER-ONLY WRITES — the real path. Backfill picks are isBootstrap=true, so they NEVER
# contaminate canonical/live history unless promoted later:
BACKFILL_WRITE=1 NODE_OPTIONS=--use-system-ca npx tsx \
  scripts/backfill/historical-settlement-backfill.ts --from=2023 --to=2023
```

The driver's own header (`scripts/backfill/historical-settlement-backfill.ts:19-34`) documents
the safety invariants: dry-run by default, `BACKFILL_WRITE=1` only writes, `isBootstrap=true`,
idempotent on `[gameId, pickType]`, CC-BY-4.0 nflverse only, no schema change / no migrate / no
`MODEL_VERSION` bump. Do NOT override `BACKFILL_WRITE` casually.

---

## Step 2 — Let live settlement run (OWNER-ONLY WRITES — cron, hands-off)

Route: `apps/web/app/api/cron/settle-picks/route.ts`. Registered in `vercel.json` (line 21) and
runs on the Vercel cron schedule. It settles completed games via `settleSport`
(`packages/ingestion-pipeline/src/settle-sport.ts`), grading picks through the same
`calculatePickResult` and grading CLV through the same `clv.ts` primitives the backfill uses.
Owner gate: just confirm it is scheduled and left running — do NOT touch `MODEL_VERSION`
or the settlement path from this runbook.

```sh
# READ — confirm the cron registration (names only, no values):
grep -n "settle-picks" vercel.json
# READ — who the settle path touches:
grep -rn "calculatePickResult\|settleSport\|drainPendingTeamGameLogs" \
  packages/ingestion-pipeline/src/settle-sport.ts | head
```

---

## Step 3 — Read the proof (READ, no writes, runs as anyone)

The calibration page renders the market baseline. It reads two public, unauthenticated endpoints
which read `HistoricalGame` directly:

- `apps/web/app/api/calibration/market-backtest/route.ts` → `loadMarketCalibrationBacktest()`
  (`apps/web/lib/calibration/market-backtest.ts:42`) — de-vigs the CLOSING moneyline over the
  whole `HistoricalGame` archive and computes Brier decomposition / ECE / reliability curve.
- `apps/web/app/api/calibration/elo-backtest/route.ts` → `loadEloVsMarketBacktest()`
  (`apps/web/lib/calibration/elo-backtest.ts`) — whether a results-only Elo matches the close.
- Render surface: `apps/web/app/calibration/market/page.tsx` → `/calibration/market`.

```sh
# READ — the raw market calibration report (no auth, no writes):
curl -sS "https://<HOST>/api/calibration/market-backtest" | head
# READ — the elo-vs-market report:
curl -sS "https://<HOST>/api/calibration/elo-backtest" | head
# READ — the rendered page:
open "https://<HOST>/calibration/market"
```

**Honest empty state (must ship until the backfill runs):** when `HistoricalGame` has no rows,
`loadMarketCalibrationBacktest` returns `{ status: "no-data", note: "…run the backfill…" }`
(`apps/web/lib/calibration/market-backtest.ts:23-36`, `BASELINE_NOTE`). The page surfaces that
exact message — never a fabricated or zero-filled chart (P14-01 honest-empty-state requirement).

---

## Step 4 — Close the loop: model vs. market (READ then OWNER-ONLY publish)

1. From Step 3, record the market's Brier / ECE / beat-close-rate. This is the **denominator**:
   "the close's Brier is X; ours must beat X."
2. `settle-picks` (Step 2) settles the FROZEN model's picks with CLV (`clv.ts`) at close
   (`packages/prediction-engine/src/clv-capture.ts`). Confirm CLV coverage via
   `apps/web/lib/performance/clv-coverage.ts` → `loadClvCoverage(db)`.
3. The public surface gates the claim behind readiness + sample floor
   (`apps/web/lib/performance/public-clv-policy.ts:89-96`). A beat-close rate is only believable
   at ~100% coverage; below that it is a survivorship-biased subsample.

```sh
# READ — confirm the coverage tool exists and is wired (names only):
grep -rn "export.*loadClvCoverage\|settledEligible\|coverageRatePct" \
  apps/web/lib/performance/clv-coverage.ts | head
# READ — confirm the public claim gate:
sed -n '85,100p' apps/web/lib/performance/public-clv-policy.ts
```

Only once (a) the backfill has run, (b) `settle-picks` has graded a real sample, and (c) CLV
coverage is healthy, does a public-facing win-rate/CLV claim become non-vacuous.
That publish is an OWNER-ONLY FLAG, not this runbook's job.

---

## Safety checklist (OWNER-ONLY, verify before each run)

- [ ] `BACKFILL_WRITE` is **not** set unless you intend real writes (Step 1c default is dry-run).
- [ ] `MODEL_VERSION` is **not** bumped (`scripts/backfill/historical-settlement-backfill.ts:28`).
- [ ] No Prisma migration is run from here (`docs/strategy/PATH_TO_PROVEN_EDGE.md` §5.4: the
      `20260813200000_add_entity_graph` migration is owner-gated per P9-01).
- [ ] `isBootstrap=true` is what the backfill stamps (prevents contaminating canonical history).
- [ ] The two backfill cron routes above are NOT in `vercel.json` — you invoke them, you decide
      when prod runs them.
- [ ] Every prod-writes step above is tagged **OWNER-ONLY WRITES**; every read-only step is tagged
      **READ**. Re-derive before trusting a future version of this file.

---

## Files this runbook traces to (all verified to exist)

- `apps/web/app/api/cron/backfill-historical-games/route.ts` — writes `HistoricalGame` (schema `packages/db/prisma/schema.prisma:2855`). GET, Bearer `CRON_SECRET`. NOT in `vercel.json` crons.
- `apps/web/app/api/cron/backfill-team-efficiency/route.ts` — writes `TeamGameEfficiency` (schema `packages/db/prisma/schema.prisma:2889`). GET, chunked 1999→current+1, Bearer. NOT in `vercel.json` crons.
- `apps/web/app/api/cron/settle-picks/route.ts` — live settlement cron. GET, registered `vercel.json:21`.
- `scripts/backfill/historical-settlement-backfill.ts` — owner-only settlement driver. Dry-run default; `BACKFILL_WRITE=1` writes.
- `apps/web/lib/cron/authorize.ts` — shared cron auth (`CRON_SECRET` / `CRON_SECRET_PREVIOUS`).
- `apps/web/app/api/calibration/market-backtest/route.ts` — public READ endpoint; reads `HistoricalGame`.
- `apps/web/app/api/calibration/elo-backtest/route.ts` — public READ endpoint.
- `apps/web/lib/calibration/market-backtest.ts:42` (`loadMarketCalibrationBacktest`) — reads `db.historicalGame.findMany`.
- `apps/web/app/calibration/market/page.tsx` — renders the report; surfaces honest `no-data` empty state.
- `apps/web/lib/performance/clv-coverage.ts` — `loadClvCoverage` (coverage denominator).
- `apps/web/lib/performance/public-clv-policy.ts:89-96` — public claim gate.
- `packages/prediction-engine/src/clv.ts`, `clv-capture.ts` — CLV math reused by settlement + backfill.
- `docs/strategy/PATH_TO_PROVEN_EDGE.md` — the honest framing (cap on spread win rate; CLV north star).
- `scripts/ops/credentials-smoke.mjs` — names-only credential presence check.
