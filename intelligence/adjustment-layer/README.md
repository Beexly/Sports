# Adjustment Layer v1 — the Layer-2 adjustment grammar

**Status: SHADOW. Weight 0. Emission ZERO_OBJECT. Nothing here modifies
any distribution, price, projection, or pick.**

Implements the grammar specified in
`docs/research/2026-09-27/total-signal-wiring-spec.md` ("Total-Signal
Wiring Spec", *Signal taxonomy v1 — the adjustment rules*; the identical
copy lives at `docs/engine/research/2026-09-27/total-signal-wiring-spec.md`).
Census item C-075: this is Garrett's build-order step 3 ("Adjustment layer
v1: rules 1–4 … the highest-leverage build").

## The shape

Every rule in the spec has one shape, kept literally:

```
TRIGGER → AFFECTED → DIRECTION → MAGNITUDE → LOG
```

The spec is explicit about magnitudes: *"Magnitudes are calibration
tasks, not guesses. The spec fixes the shape; backtests fix the numbers"*
(build-order step 6: backtest every rule before it touches a live
projection). So v1 emits **qualitative magnitude bands** taken from the
spec's own words (`SLIGHT` / `TICK` / `PLAIN` for an unqualified
direction / `UNSPECIFIED` where the spec states none), with
`magnitude: null` and `calibrated: false` on every record. No number is
invented anywhere in this package.

## The 7 families (exactly as specified)

Machine-readable definitions, trigger configuration, per-parameter
provenance, and spec quotes: **`families.json`**.

| # | Family | Spec trigger | Fires when (v1 encode) |
|---|--------|--------------|------------------------|
| 1 | `OL_INJURY` | starting LT (or C) ruled out/doubtful; backup starting | stamped injury row: position LT or C, starter, status OUT or DOUBTFUL |
| 2 | `SECONDARY_INJURY` | starting S or CB1/CB2 out | stamped injury row: position S/FS/SS/CB, starter, status **OUT only** (spec's word; DOUBTFUL/QUESTIONABLE do not fire — deliberate boundary) |
| 3 | `PASS_RUSH_INJURY` | starting EDGE out | stamped injury row: position EDGE, starter, status OUT |
| 4 | `DEPTH_CHART` | RB/WR/TE elevated to starter, snap share jumps, or bellcow tags | stamped depth-chart row: event elevation / snap_jump / bellcow / consolidation |
| 5 | `WEATHER` | sustained wind thresholds, precipitation, extreme cold | stamped weather row vs thresholds — **not in the spec**; reused from the situational-graph edge registry (`weather_extreme`: wind ≥ 20 mph, temp ≤ 20°F or ≥ 95°F). Precipitation sub-trigger **unarmed** (no threshold exists in spec or registry) |
| 6 | `GAME_SCRIPT` | large spreads, high/low totals | stamped market-line row, \|spread\| ≥ 7.0 — **parameter**, not a spec value (the fleet's existing encode, `apps/web/lib/signals/adjustment-layer.ts` §6). Totals sub-trigger **unarmed** (no threshold anywhere). Trailing-team records carry `garbage_time_discount: true, role_change: false` per spec |
| 7 | `OFF_FIELD` | intake lane: nutrition, sleep/travel, psychology, cognitive load — "no ingestion exists"; starts with what's measurable | Measurable lanes only: the graph's `altitude_short_week` composite edge, `rest_differential` edges, stamped travel rows. Direction `VARIANCE` (friction, not a mean shift — spec states no direction; taken from the fleet's authored Layer-2 read and cited in each record), band `UNSPECIFIED`. Nutrition/psychology/cognitive lanes have no ingestion and no triggers |

## How it runs

Inputs are **stamped situational inputs** only:

- situational-graph edges (`intelligence/situational-graph/`, consumed
  verbatim), and
- stamped template rows (`injury_report`, `depth_chart`, `weather`,
  `market_line`, `travel`) — each carrying `source` + `as_of`.

**Point-in-time discipline** (same as the graph's `visible_at`): an input
fires a pregame adjustment only if `as_of ≤ read_at` **and**
`as_of < kickoff`. Anything stamped at/after kickoff or after the read
time is refused fail-closed and reported in the run's `refused` list —
never silently dropped, never used.

Emission is fenced: records are validated against the graph's
forbidden-key set plus `projection`/`price` (record targets are renamed
so the fence is absolute) and pinned to `weight == 0`,
`magnitude is None`, `calibrated is False`. A violation raises instead
of emitting.

## Files

| File | What |
|------|------|
| `grammar.py` | The engine: PIT visibility, family evaluators, record construction, emission fence |
| `families.json` | The 7 families as data — spec quotes, trigger config, per-parameter provenance, SPEC_GAP flags |
| `ledger.py` | The shadow adjustment ledger: append-only JSONL, hash-chained, tamper-evident, idempotent replay |
| `apply_seam.py` | **The application seam — named, unconnected.** The only door a future cleared gate would use; v1 raises `SeamNotConnected` unconditionally. `grammar.py` never imports it |
| `run_instance.py` | CLI: run one game's inputs, append to a ledger, print the run report |
| `inputs/2026-week06-sea-at-den.graph.json` | The SEA@DEN situational-graph instance, vendored verbatim (graph branch `motif/situational-graph-v1-2026-10-15`, blob `4806dc65…`) |
| `inputs/2026-week06-sea-at-den.json` | Stamped template rows for SEA@DEN, authored from the WO-0 input packet (ESPN pulls, 2026-10-15 10:31–10:36 AM CT). Only what the packet states is carried — positions/designations the packet doesn't state are null, never invented |
| `ledger/adjustments-2026-week06-sea-at-den.jsonl` | The worked instance's ledger output: 13 records, chain-verified |
| `tests/test_adjustment_layer.py` | 32 tests (see below) |

## Worked instance — SEA@DEN (2026_06_SEA_DEN), read at 2026-10-15T17:00Z

**13 records emitted.** Injury asymmetry is the center, exactly as the
fleet's Layer-2 read had it:

- `SECONDARY_INJURY` ×10 — DEN loses **two starting defensive backs**:
  Pat Surtain II (CB1, OUT) and Talanoa Hufanga (S, OUT). Each fires the
  family's 5 records: SEA pass yards ↑, SEA pass TDs ↑, SEA receiver
  production ↑, DEN defensive output ↓, SEA implied total ↑ slightly.
- `DEPTH_CHART` ×2 — Zach Charbonnet (SEA RB2, OUT) consolidates the
  backfield: RB1-slot volume ↑, teammates' target share ↓. (The packet
  does not name the lead back; the record names the slot, not a player.)
- `OFF_FIELD` ×1 — the graph's `altitude_short_week` composite vs SEA
  (visitor at 5,280 ft on 4 days' rest): direction `VARIANCE`, band
  `UNSPECIFIED`.

Evaluated and honestly **not** fired: Riley Moss (CB2, QUESTIONABLE —
the spec's F2 trigger is "out"; he remains the inactives watch item);
OL injuries (none in the packet); pass rush (no EDGE out; SEA's Surratt/
Thomas are off-ball LB depth — no family covers that, a spec gap);
weather (54°F, gusts 8 mph — and the packet reports gusts, not sustained
wind; below every threshold, precip sub-trigger unarmed); game script
(spread 2.5 < 7.0 parameter; totals unarmed); rest differential
(symmetric 4/4). The graph's `injury_burden` family is honest-empty for
this game (its injury CSV has no stamp column), which is why the injury
facts arrive as stamped template rows.

## Tests

```
python3 -m pytest intelligence/adjustment-layer/tests -q   # 32 passed
```

Per-family fire / boundary no-fire tests (including wind exactly 20,
temp exactly 20°F, spread exactly 7.0, CB DOUBTFUL vs OUT), PIT
isolation (post-kickoff stamp refused; post-read stamp invisible; edge
invisibility), ledger chain verification + tamper detection + idempotent
replay, fence tests (no emission-shaped key at any depth; weight 0;
magnitude null), seam refusal, determinism, and a golden test pinning
the SEA@DEN instance above.

## Relationship to the sibling module on main

`apps/web/lib/signals/adjustment-layer.ts` (landed 2026-09-27) is a
*different* implementation of the same spec: a DFS player-projection
adjustment engine with numeric default magnitudes (self-labeled
UNCALIBRATED) and a promotion gate. The census line "zero code" is stale
for that variant. This package is the distinct piece the census item
asks for: the Layer-2 **reasoning grammar** over the situational graph,
emitting banded, weight-0 ledger records with no application path. The
two are consistent on doctrine (shadow-first, gate before anything
moves a number); they differ deliberately on magnitudes — this grammar
carries none, per the spec's "backtests fix the numbers."

## Spec gaps recorded (not papered over)

1. **Numeric magnitudes** — deferred by the spec's own design to
   backtests (build-order step 6). Bands only until then.
2. **Rule 7 direction/magnitude** — none stated in the spec. v1 uses
   `VARIANCE` from the fleet's authored read, cited per record.
3. **Rule 2 doubtful boundary** — spec says "out"; DOUBTFUL secondary
   starters do not fire in v1.
4. **Off-ball LB absences** — no family covers them (SEA's Surratt/
   Thomas case).
5. **Weather thresholds + precipitation threshold** — absent from the
   spec; wind/temp reused from the graph registry; precip unarmed.
6. **Game-script thresholds** — "large spreads" / "high/low totals"
   unquantified in the spec; spread 7.0 is a fleet-precedent parameter,
   totals unarmed.
7. **IR designations** — the spec is silent; grammar triggers only on
   the report designation OUT (plus DOUBTFUL for rule 1). IR rows are
   carried as non-triggering inputs.
8. **Stamped injury feed** — the graph's injury family is honest-empty
   because `injuries_2026.csv` has no stamp column; until a stamped
   injury source lands, injury facts enter via authored template rows.
9. **Kick-distance direction** — the spec lists it as affected without
   stating a direction; v1 carries DOWN (wind context), flagged in
   `families.json`.
