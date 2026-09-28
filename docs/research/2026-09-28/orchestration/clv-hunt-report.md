# CLV History Hunt — Research Brief (Lane 2)

**Date:** 2026-09-28 · **Researcher:** subagent (research only, no browser, no DB connection)
**Verdict: FOUND.** Real closing-line-value history exists — not in third-party files, but in Garrett's own engine Neon Postgres, plus a wired (but credit-gated) historical-backfill lane. No credentials were touched; all Neon facts come from the documented 2026-09-24/25 read-only pull (docs/data-sources/research/2026-09-24/live-database-intelligence-report.md).

## 1. WHERE THE CLV HISTORY LIVES — Neon Postgres (neondb, host ep-summer-moon-apv5ccys)

| Table | Rows (2026-09-25) | Size | What it is |
|---|---|---:|---|
| `odds` | **8,083,183** | 2.0 GB | Timestamped per-book price time series: `bookmaker`, `market`, all prices, **`fetchedAt`** — schema comment explicitly notes "Closing-line lookups filter gameId + range/order on fetchedAt" |
| `odds_line_snapshots` | **2,213,952** | 535 MB | Phase-classified snapshots: `phase` = OPEN \| INTERIM \| **CLOSE**; `book`, `market` (SPREAD\|MONEYLINE\|TOTAL + `player_*\|slug` props), `side`, `price` (native American), `line`, `capturedAt`, `source` |
| `opening_lines` | 4,923 | 1.4 MB | Openers: `spread`, `total`, `homePrice`, `awayPrice`, `firstSeenAt` — the "CLV spine" |
| `picks` | ~4,030 | 12 MB | Per-pick graded CLV column suite — 2,189 CLV-graded rows, avg CLV **−0.193**, zero positive |

**Coverage notes (from repo code/docs, not a fresh query):** books = `fanduel, draftkings, betmgm, caesars, pointsbetus, bovada, mybookieag` (US region, American odds; `us_ex` adds Kalshi/Polymarket/Novig/ProphetX) — packages/data-ingestion/src/config.ts. Cadence = `refresh-odds` cron **once daily 10:00 UTC**, in-season sports only (cost control). **Known gap:** the snapshot writer silently broke **2026-08-22 → ~mid-Sept 2026** (wrong Prisma filter shape swallowed by a catch returning `{persisted: 0}`) — three weeks of missing CLOSE data; a freshness monitor now exists (apps/web/lib/ops/odds-line-archive-freshness.ts) but the module deliberately wires to **no** alert channel.

## 2. SCHEMA + CONSUMPTION PATH (for the coding agent)

**Writer** — packages/ingestion-pipeline/src/line-archive.ts: persists whatever the daily Odds API refresh already fetched; OPEN = first-ever snapshot per (gameId, market), else INTERIM; `markClosingSnapshots` (wired into settle-sport.ts, hermes-H-D) re-tags the **last pre-kickoff snapshot per (market, book, side)** as CLOSE — idempotent. Gated on `LINE_ARCHIVE_ENABLED=true`; zero upstream calls of its own.

**Per-pick CLV columns on `picks`** (write-once lock + settle-time grade): `clvLockLine`, `clvLockPrice`, `clvCloseLine`, `clvClosePrice`, `clvKind` (POINTS|PROBABILITY), `clvValue` (positive = beat the close), `clvVerdict` (BEAT_CLOSE|MATCHED_CLOSE|LOST_TO_CLOSE), `clvCapturedAt`, `clvGradedAt`, `bookDisagreementAtLock` (max−min across books at lock — the liquidity regressor). Grading logic referenced as `clv-capture.ts` in the schema comment (test survives at packages/prediction-engine/src/__tests__/clv-capture.test.ts; implementation lives in the settle path).

**Ready-made math:** apps/web/lib/tracker/clv.ts (pure computeSpreadClv/computeTotalClv/computeMoneylineClv), packages/prediction-engine/src/clv-harness.ts (ready-for-data runner, synthetic opens must be labeled), packages/prediction-engine/src/clv-decomposition.ts (OLS: information coefficient vs liquidity coefficient on bookDisagreementAtLock vs residual — with the honesty rule: never label residual "sharp/public money"; market-memory.ts's `sharpSplitSourced` gate enforces it), scripts/ops/regrade-against-book-lines.ts.

## 3. DOCUMENTED NEON READ PATH (no live read performed — per rules)

`node scripts/db-inventory.cjs` — read-only, `DATABASE_URL` from env, **never committed**; companions scripts/db-calibration-pull.cjs, scripts/rebuild-calibration-from-live.cjs. The credential is never stored (Garrett granted transiently 2026-09-13); as a research subagent I had no DATABASE_URL, so **no live connection was attempted** — a fresh read grant from Garrett is the only path for new queries. The 2026-09-24/25 intelligence report is the authoritative recent read.

## 4. OTHER LANES — CHECKED, NOTHING ELSE MATERIAL

- **gse-competitive-intel** (56 CLV hits): all playbooks/specs — codex-work/handoff-docs/MARKET_CLV_FOUNDATION.md is a 5-line implementation note ("opening preserved, close + result required before CLV computes"), not data. No line-history evidence/dossiers with real timestamps+prices. No WFord26 artifact exists in either repo (0 hits).
- **~/workspace/goals, ~/workspace/*.md, ~/memory**: CLV mentions are strategy notes only (v5.3.0 build spec, nfl-analytics-reverse-engineering.md, grok/mimo/edgerunner people pages, agent-fleet group). **Zero CSV/JSON line-snapshot files anywhere in ~/workspace.**
- **Sports repo UI**: apps/web/lib/tracker/clv.ts is a personal bet ledger (localStorage, manually entered closing odds) — not a history source. `game_signals` (5,142 rows) is SCHEDULE-only, not lines. The 2026-09-04 clv-harness.ts note "no historical open/close archive" is stale — the archive exists now.

## 5. ACQUISITION PLAN (going forward)

1. **Keep collecting:** verify `LINE_ARCHIVE_ENABLED=true` in prod and point the freshness monitor at an *independently verified-alive* alert channel — the 8/22 silent outage is the standing risk.
2. **Backfill the gap + deep history — OddsPapi `/historical-odds`:** FREE and UNMETERED (per nfl-analytics-reverse-engineering.md); NFL sportId 14 / tournamentId 31; **Pinnacle NFL game lines** (no props). fetchPinnacleLineMovement (packages/data-ingestion/src/odds-provider-adapter.ts, 37 tests across client/adapter test files) → deduped snapshots + close-before-kickoff for CLV reconstruction. Terms: internal analytics only, no resell; `certifiableForLiveGate=FALSE` pending legal read. Garrett holds the oddspapi.io account (one-time key-gen permission, nothing stored).
3. **Cadence:** daily refresh is the credit reality (The Odds API 20K cr/mo under baxley.garrett@gmail.com, key in Secure Vault only); if Garrett approves spend, add a pre-kickoff Sunday sweep so CLOSE tagging has sub-daily resolution.
4. **For the coding agent (CLV-by-bookmaker pattern):** the pattern is already encoded — per-book CLOSE tagging in markClosingSnapshots, per-pick clvCloseLine graded at settle, bookDisagreementAtLock as the liquidity regressor in clv-decomposition.ts. Grade lock vs **each book's** close, not a consensus close; clvCapturedAt records which snapshot was used. Keep the sharpSplitSourced honesty gate: CLV decomposes into information + liquidity + unexplained, never "sharp money" without sourced handle data.

## Open items

(a) confirm LINE_ARCHIVE_ENABLED=true and wire a live freshness alert; (b) Garrett's call on the OddsPapi legal read so fetchPinnacleLineMovement backfills the 8/22–9/15 gap; (c) a fresh Neon read grant (transient DATABASE_URL) if new min/max date, per-sport, and per-book row counts are needed to quantify exact coverage.

*Research only. No credentials in this document. No live-browser actions taken.*
