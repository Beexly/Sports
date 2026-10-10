# L4 Flow Pump — Cadence Automation

Automated scheduling for the L4 flow snapshot pump (`snapshot_pump.py`).
Fires every 30 minutes during college/NFL game windows so the
move-leadership dataset compounds instead of depending on manual runs.

## Game windows (America/Chicago)

- **Saturday:** 11:00–23:00 CT
- **Sunday:** 11:00–23:00 CT
- Outside windows the scheduler sleeps until the next window opens.

## Files

| File | Purpose |
|---|---|
| `snapshot_pump.py` | One-shot snapshot: CFBD + Kalshi + Pinnacle → `flow_warehouse.jsonl` (append-only). Patched vs upstream: honors `PUMP_WAREHOUSE_DIR` env var. |
| `doctrine.py` | Warehouse validation layer (unchanged upstream copy). |
| `pump_cadence.sh` | The scheduler. Loop: check window → run pump → log → sleep 30 min. |
| `pump_cadence_README.md` | This file. |

## How it runs

```bash
cd ~/workspace/pump
nohup ./pump_cadence.sh > pump_cadence.out 2>&1 &
echo $! > pump_cadence.pid
```

- PID tracked in `pump_cadence.pid`
- Per-run log in `pump_cadence.log`: timestamp, rows captured, errors
- Warehouse: `warehouse/flow_warehouse.jsonl` (append-only, never overwritten)

## Failure handling

- Each source fetch fails independently and gracefully (returns 0 rows, logs warning, continues).
- If `snapshot_pump.py` itself crashes: 3 attempts with 60s backoff, then skip to next 30-min slot. The schedule never dies on a bad run.
- CFBD requires `CFBD_API_KEY` env var; without it that source yields 0 rows (Kalshi + Pinnacle are keyless and still capture).

## Stopping

```bash
kill $(cat ~/workspace/pump/pump_cadence.pid)
```

## Verification

Check the log tail for recent runs:

```bash
tail -20 ~/workspace/pump/pump_cadence.log
wc -l ~/workspace/pump/warehouse/flow_warehouse.jsonl
```

## Doctrine compliance

- Append-only warehouse: rows are never modified or deleted.
- Every row carries `observed_at` (UTC ISO) — point-in-time stamp per Rule 1.
- No signal reaches any reasoner from this pipeline; it is a raw observation feed (diagnostic role per Rules 4/5/8/12/13/14).
- First deployment: 2026-10-10 ~15:37 CT (Saturday game window), 200 Kalshi rows on first snapshot.
