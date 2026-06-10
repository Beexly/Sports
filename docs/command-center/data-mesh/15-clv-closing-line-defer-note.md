# CLV / Closing-Line Value — built scaffold + deferred ops timing

Status: **scaffold built, additive, gated green.** Live precise-timing trigger
+ closing-reference selection are **deferred to founder/ops** (no rebuild
needed to flip them on).

This implements WIN-01 (closing-line snapshot) + WIN-02 (per-pick CLV compute +
rolling scoreboard) as one cohesive additive build. BUILD-032 (provider-license
gate for the source flag) is referenced via the `closingRef` column, not
re-implemented.

## What CLV is, and why it matters

Closing-Line Value compares the **bet-time** line/price we published to the
**closing** reference — the last fair price the market offers before kickoff.
A consistently CLV-positive book is the strongest *non-outcome* proof that the
engine beats the market. The board/ledger can show an honest CLV-positive rate
as evidence the picks beat the close.

Convention used everywhere: **positive CLV = the bet beat the close** (we
secured a better number/price than the market settled on).

## What was built now (additive, no ops change required)

1. **Schema (`packages/db/prisma/schema.prisma`)**
   - New nullable model `ClosingLine` (mirrors `OpeningLine`), unique on
     `[gameId, market, closingRef]`, with `bookmakerCount` + `isStale` honesty
     guards and a `closingRef` reference id (defaults to `consensus`).
   - Six NULLABLE additive columns on `Pick`: `closingLine`, `closingPrice`,
     `clvPoints`, `clvCents`, `clvPositive`, `clvComputedAt`. They are
     **computed shadow proof only** — they never feed the published
     confidence/tier/grade/result or `MODEL_VERSION`.
   - Additive idempotent migration `20260610060117_add_closing_line_clv`
     (`CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`), runs in-build
     via the existing `DIRECT_URL`-gated guard. No enum change, no backfill.

2. **Pure CLV math (`packages/prediction-engine/src/clv.ts`)**
   - `computeClv()` → `{ clvPoints, clvCents, clvPositive }`, side-aware sign
     convention, returns **all-null** when either side is missing OR the
     closing snapshot is stale (no fabricated value).
   - `computeClvPositiveRate()` → rolling rate over picks with a verdict; null
     for an empty sample (never inflated by absent data).
   - `clvBetSideFor()` mirrors settlement's side derivation. Full vitest.

3. **Capture helper (`packages/data-ingestion/src/closing-line.ts`)**
   - `captureClosingLine()` derives a per-market consensus from a fetched odds
     event and upserts `ClosingLine` (idempotent). Fail-closed + stub-safe:
     swallows DB/provider errors, no-ops under the `@sports/db` stub, never
     throws into settlement. Thin coverage (`< MIN_CLOSING_BOOKMAKER_COUNT`)
     → `isStale=true`. Empty market → skipped. Full vitest.

4. **Worker wiring (`workers/data-refresh/src/index.ts` → `settleResults()`)**
   - One guarded `getOdds()` pull per sport per cycle → best-available
     pre-kickoff close. Per settled pick: read the closing row, compute CLV,
     write the nullable `pick.clv*` columns. Whole block is non-fatal.

5. **Read surface (`apps/web/app/api/performance/route.ts`)**
   - Additive `clv: { clvPositiveRate, sampleSize, positiveCount }` field
     beside `winRate`. The win-rate math is untouched. Null until closes accrue.

This is fully functional on the existing 30-min worker cadence: it captures a
near-kickoff line on a best-effort basis and `isStale`-flags thin/late snaps.

## Deferred to founder / ops (needs a cron/worker change — gated)

1. **Precise near-kickoff trigger.** A true "close" is a pull in the tight
   pre-commence window. The current schedule cannot hit it precisely:
   - Vercel `refresh-odds` crons run once/day at fixed early-AM hours; the
     `settle-picks` cron route is a documented **stub** — the real loop is the
     long-running worker on a 30-min `setInterval`.
   - To make the close precise, add a per-game scheduled pull at
     `commence − 5min` (or tighten settle cadence near kickoffs). This is a
     **worker/cron config change**, not a code rebuild — `captureClosingLine`
     is already the attach point.

2. **Closing-reference selection (consensus vs Pinnacle).** `closingRef` is a
   column, so the reference book is **config, not schema**. Founder decides
   the canonical reference; flipping it is a value change. Until then the
   built-in multi-book `consensus` reference is used and `isStale` excludes
   thin snaps.

3. **Provider license for a named sharp reference (BUILD-032).** If a specific
   book (e.g. Pinnacle) becomes the reference, confirm the provider license
   permits storing/derived use; the `closingRef` + `isStale` plumbing is ready.

## Honesty guards baked in (so "CLV-positive %" can't be gamed)

- `closingRef` — fixed-in-advance reference (F-10).
- `bookmakerCount` + `isStale` — thin/limit-down snapshots excluded (C-5/F-10).
- CLV computed only when **both** bet-time and closing sides exist and the snap
  is fresh; otherwise the pick's `clv*` columns stay NULL. No CLV value ever
  feeds the published number.
