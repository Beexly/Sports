# Total-Signal Wiring Spec — GSE Engine
**Date:** 2026-09-27 · **Owner:** Garrett Baxley · **Status:** SPEC (build order below)

## The doctrine
The GSE engine exists for one purpose: ingest **every signal possible** — on-field,
off-field, nutrition, psychology, cognitive, anything that can move a number — and
produce the most intelligent reasoning and decisions for fantasy, predictions,
props, parlays. It is not built to beat the books (that never happens). It is
built to be the smartest engine, so every decision downstream is the
best-informed one available.

Every signal maps to an **explicit, logged projection adjustment**. No vibes, no
unwritten rules. If Garrett has to explain a rule twice, it wasn't in the spec —
that failure ends here.

## The chain
```
signals → adjustments → projections → consumers
                                      ├─ DFS slate provider → optimizer (k-best/diverse) → payout sim → lineups
                                      ├─ picks pipeline (moneyline/spread/total)
                                      └─ prop pipeline (player signals → lines)
```

## Verified state (2026-09-27, repo audit)
**Wired:**
- Signal sources: nflverse adapter (`lib/data-sources/nflverse.ts`), Sleeper market
  signals, data-sources catalog + router, signal lineage tracking
  (`lib/picks/signal-lineage.ts`).
- `game_signals`: 5,142 rows.
- Optimizer: exact branch-and-bound, k-best, diverse pools, late swap,
  correlation GPP layer, exposure control, payout sim vs simulated field —
  all real, all on `origin/main`, no mocks.

**Missing (the gap):**
- **No adjustment layer.** Nothing maps "LT out" → "shift RB/QB usage". Nothing
  maps "starting safety out" → "bump opposing QB/WR". Zero injury→projection
  logic in the codebase.
- **`signals` (player-level): 0 rows.** The prop pipeline has no fuel.
- No nutrition / psychology / cognitive ingestion of any kind.
- The optimizer runs on the illustrative sample slate — no live provider
  registered (`registerDfsSlateProvider` never called in prod code).

## Signal taxonomy v1 — adjustment rules
Shape of every rule: **TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG**.
Magnitudes are calibration tasks, not guesses — the spec fixes the shape,
backtests fix the numbers.

### 1. Offensive-line injuries (Garrett's example)
- TRIGGER: starting LT (or C) ruled out/doubtful; backup starting.
- AFFECTED: QB passing efficiency, RB yards-before-contact, team run/pass mix.
- DIRECTION: QB down slightly; RB efficiency down; checkdown/target share to RB
  up slightly (pressure outlet); team pass rate down a tick.
- LOG: which lineman, replacement, snap counts.

### 2. Defensive secondary injuries (Garrett's example)
- TRIGGER: starting S or CB1/CB2 out.
- AFFECTED: opposing QB pass yards/TD, opposing WR1/WR2/TE, that DST's
  projection.
- DIRECTION: opposing pass game up; that defense down; opposing offense
  implied total up slightly.
- LOG: who is out, who replaces them, coverage responsibility.

### 3. Pass-rush injuries (extends the same logic)
- TRIGGER: starting EDGE out → opposing QB time-to-throw up → QB/WR up slightly.
- Mirror of rule 2 for the front seven.

### 4. Skill-position depth chart movement
- TRIGGER: RB/WR/TE elevated to starter, snap share jumps, or bellcow tags
  (e.g. "Dowdle's out so Warren's the bellcow").
- AFFECTED: that player's volume projection; teammates' target share down.

### 5. Weather (already a DFS gate — encode it here)
- TRIGGER: sustained wind thresholds, precipitation, extreme cold.
- AFFECTED: pass yards/attempts down, kick distance, run rate up.

### 6. Game script / Vegas
- TRIGGER: large spreads, high/low totals.
- AFFECTED: trailing-team pass volume up (garbage-time discount applies —
  4th-quarter trailing volume is NOT role change), leading-team run rate up.

### 7. Off-field signals (intake lane — benchmark program)
- Nutrition, sleep/travel, psychology, cognitive load. No ingestion exists.
  Intake starts with what's measurable (injury report participation,
  travel distance, rest days) before anything exotic.

## Build order
1. **Lock the projection source** (Garrett's call — open). Everything downstream
   eats from this.
2. **Register the live DFS slate provider** → optimizer consumes engine
   projections. Kills the sample-slate fallback.
3. **Adjustment layer v1:** rules 1–4 (injuries + depth chart). This is the
   highest-leverage build — it improves projections, which improves the
   optimizer, the picks, and (once fueled) the props, all at once.
4. **Fill the player `signals` table** (0 rows today). The prop pipeline
   cannot exist without it.
5. **Off-field intake lane** (rule 7) via the benchmark program.
6. **Backtest every rule** against historical slates before it touches a live
   projection. A rule that can't prove itself in backtest doesn't ship.

## Standing rules this spec enforces
- Check the repo BEFORE building anything (2026-09-27 lesson).
- Real engine data over mocks, always.
- Every adjustment logged with its trigger — the lineage table is the receipt.
- Garrett explains a rule once; it lives here after that.
