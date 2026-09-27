# Total-Signal Wiring — Status 2026-09-27 (night build)

**Spec:** `docs/research/2026-09-27/total-signal-wiring-spec.md` (branch
`motif/total-signal-wiring-2026-09-27`).
**Branch:** `agent/total-signal-wiring` · **PR #927** · merged `b4db523be`.

---

## Wired

### 1. Adjustment layer v1 — the missing middle (TSW-1, PR #927)
`apps/web/lib/signals/adjustment-layer.ts`

The spec's own gap list said it: *"No adjustment layer. Nothing maps 'LT out' →
'shift RB/QB usage'."* That was true — a grep for injury→projection or
depth-chart logic returned nothing. This is the spec's `TRIGGER → AFFECTED →
DIRECTION → MAGNITUDE → LOG` shape for rules 1–6:

| Spec | Trigger | Moves |
|---|---|---|
| §1 | starting OL out | QB passing ↓, RB checkdown ↑, team pass rate ↓ |
| §2 | starting DB out | **opposing** QB/WR/TE ↑, that DST allowed ↑ |
| §3 | pass-rush out | opposing QB time-to-throw ↑ |
| §4 | depth chart | promoted backup inherits *part* of the starter's share |
| §5 | sustained wind | pass attempts ↓, run rate ↑, scaled by speed |
| §6 | game script | pace ↑, halved, side explicitly unattributed |

Because §2/§3 adjust the *opposing* offense, they key on a `byOpponent` index —
keying on `p.team` looks up the injured team's own roster and the rule silently
never fires. That was a real bug caught by running the tests.

### 2. Engine-backed DFS slate — the sample-slate fallback is dead (TSW-2, PR #927)
`apps/web/lib/fantasy/engine-slate.ts` · `GET /api/cron/engine-dfs-slate`

**The finding that mattered:** `registerDfsSlateProvider` had **zero production
callers**. `activeDfsSlate()` — the default argument to `optimizeExact`,
`kBest`, `optimizeDiverse`, `optimizeExactLineup` — always returned
`ILLUSTRATIVE_DFS`, whose own header reads *"Fictional players, real team codes,
illustrative numbers."* The repo's best optimizer was optimizing fiction.

The optimizer is **not rebuilt or modified** (spec rule, and it was checked
first). This sits beside it and projects from tables already populated:
`player_game_stats.fantasyPointsPpr` (35,168 rows measured on prod), plus
injuries and depth charts through TSW-1.

**Three-condition gate, found by reading the seam:** live only when registered
**AND** `live: true` **AND** `isConfigured("dfs")` → reads `DFS_PROVIDER`.
Registering alone is not enough. That flag is founder-only (law 3); this lane
does not set it — the cron *reports* it.

---

## What is measured vs. what is not

The cron returns this block on every run, because three of the optimizer's
inputs are not yet real:

- **projection** — MEASURED mean `fantasyPointsPpr` over the last 5 real games
- **floor / ceiling** — MEASURED observed min/max in the same window
- **salary** — **NOT REAL.** No licensed DK feed; 0, and the cap is a no-op
- **ownership** — **ASSUMED** neutral 0.5. Not derivable from any repo source.
  The tournament edge depends on it, so a wrong value is worse than an honest one.
- **adjustments** — **UNCALIBRATED** defaults. Computed and reported; **not**
  applied to any projection until a backtest supplies measured magnitudes.

---

## Blocked

- **`signals` table is 0 rows** and the prop pipeline has no fuel. Writing it is
  deliberately *not* in this PR — the `gate_decisions` precedent (three readers,
  no writer, 94 days) says a write path gets its own review. The census job that
  measures what *would* be written is live (PR #926).
- **Tuner sample join.** Signals are per-player, outcomes per-game, and the join
  returns **0 rows for all 3,451 settled picks**: `depth_chart.team` is an
  abbreviation (`DEN`), `games.homeTeamName` is a full name, and every depth
  chart row is `week = 0`. The `teams` table that would bridge them (name +
  abbreviation) exists in schema with **0 rows**. No abbreviation crosswalk was
  invented — a wrong one silently attaches NFL depth charts to MLB games.
  Even with a perfect crosswalk, populated signal tables are game-level, so
  tuning caps at ~4.9% of settled picks (NFL 169, MLB 2,185, NCAAF 757).
- **`DFS_PROVIDER`** — founder-only flip. Not set by this lane.

---

## Measured on production (read-only, `hermes_ro`)

The engine's closing-line record, `MATCHED_CLOSE` collapsed out (a matched line
proves no edge), one-tailed binomial vs a coinflip:

| pick type | beat | lost | net | p | reading |
|---|---|---|---|---|---|
| TOTAL | 452 | 371 | **+8%** | 0.0026 | **beating the close** |
| SPREAD | 169 | 301 | −13% | <0.00001 | losing |
| MONEYLINE | 29 | 165 | −54% | <0.00001 | losing badly |

MONEYLINE is 66% lost-to-close: the market is sharper on that bet type than the
engine is. Trend is improving — SPREAD went −80% (Jul, v5.1.0) → −15.2% (Sep,
v5.2.7), p<0.00001; MONEYLINE −94% → −32%, p=0.0006. No tier, floor, or
pickType exclusion was changed; those are founder-only.

Also: **86 tables in prod are empty**, several load-bearing
(`cockpit_decisions`, `daily_briefs`, `jarvis_decisions`, `pick_memories`,
`loss_autopsies`, `owner_decision_requests`).

---

## Next

1. **Calibrate the magnitudes** — the spec's rule 6: a rule that can't prove
   itself in backtest doesn't ship. Every magnitude currently reports
   `calibrated: false` for exactly this reason.
2. **Populate `signals`** — decide the write path on the evidence the census job
   now produces.
3. **Off-field intake lane** (spec rule 7) — travel distance and rest days are
   measurable today; nutrition/psychology are not.
4. **Crosswalk** — populate `teams` (name + abbreviation) with a sport guard.
   `CLE` is both Browns and Guardians; a naive match is a silent corruption.
