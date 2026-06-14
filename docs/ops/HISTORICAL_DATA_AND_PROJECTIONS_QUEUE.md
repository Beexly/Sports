# Historical Data → Calibration → 2026 Projections — Autonomous Queue

Owner directive (2026-06-14): load **every** prior NFL season's data (not just the
current one), review/understand/leverage it, backtest against real outcomes, and use
it to power validated 2026 projections. Work autonomously; ship verified slices.

Key reframe: **historical seasons are settled.** nflverse `schedules` carries closing
lines (`spread_line`, `total_line`, moneylines) AND final scores per game back to 1999.
That is the real `(forecast, outcome)` archive — it passes the calibration data gate
that the empty live `Pick` table could not.

## Queue (intelligent dependency order)

1. **gsis→Player crosswalk** ✅ in progress — resolve `Injury.playerId` (clean gsisId
   match) so injuries are queryable per player; order cron players-first.
2. **Historical schedules/results ingestion** — new `HistoricalGame` model from nflverse
   `schedules`: per-game closing line + total + moneylines + final score + result, ALL
   seasons (1999+). This is the settled-outcome archive.
3. **Backtest + calibration measurement report** — run the engine's de-vig/market logic
   on historical closing lines → forecast probability; compare to real outcomes; compute
   Brier / reliability / ECE with the already-built `probability-calibration.ts`. Read-only,
   real numbers. This is the honest "how calibrated are we" surface.
4. **Historical player-stats backfill** — extend player/snap/injury ingestion to ingest a
   season RANGE (all seasons), not just current. Inputs for projections.
5. **Depth charts** ingestion (deferred earlier for column variance — verify columns first).
6. **2026 projections** — only after 1–4: per-player/team projections grounded in
   historical rates, with the calibration from the backtest. A MODEL_VERSION step.

## Hard rules carried forward
- No fake data; every extracted record clearance-gated + rights/freshness-stamped.
- Gate (`typecheck && lint && build && test`) green before every commit; read RAW_EXIT.
- Pricing signals into live confidence stays a deliberate MODEL_VERSION step — but it is
  now unblockable because real historical calibration exists (item 3).
- Branch `claude/zealous-noether-inaaa3`; no merge/deploy (owner-gated).
