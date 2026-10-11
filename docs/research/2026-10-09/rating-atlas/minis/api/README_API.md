# GSE Engine API

Minimal HTTP service exposing the engine's board logic. Honest labels only — no pick/bet/edge language.

## Start it

```bash
python3 api.py
# Serves on port 8899 (override with PORT env var)
```

## Endpoints

### `GET /health`
Service status.
```bash
curl localhost:8899/health
```
```json
{"status": "ok", "service": "gse-engine-api", "timestamp": "2026-10-11T04:30:10+00:00"}
```

### `GET /board/nfl`
NFL board for the current slate. Real Pinnacle lines through FreshnessGate (2h max age).
Each row is labeled `"baseline"` (closing line only) or `"diagnostic overlay"` (closing line + stamped overlay).
```bash
curl localhost:8899/board/nfl
```
Response fields per row:
- `game`: "Away at Home"
- `game_id`, `start`
- `spread_close`, `total_close`: Pinnacle main lines
- `ml_fair_home`, `ml_fair_away`: Shin-devigged fair probabilities
- `residual`: informational overlay residual (null if baseline)
- `status`: "baseline" | "diagnostic overlay"
- `overlays_applied`, `overlays_refused`: which overlays passed/failed the gate

Top-level: `generated_at`, `status` ("OK" or "REFUSED"), `n_rows`, `n_baseline`, `n_diagnostic`, `refusals`.

If closing lines are stale (>2h), the entire board refuses honestly — no silent fallback.

### `GET /board/cfb`
CFB model card + status. CFB plays Saturdays; on Sundays this returns the frozen fitted state.
```bash
curl localhost:8899/board/cfb
```

## Files

- `api.py` — Flask app (this service)
- `live_board.py` — board generation logic (honest labels, CollegeGuard, FreshnessGate)
- `freshness_gate.py` — the only read path for stamped data (pandas import is lazy in this bundle to avoid numpy ABI issues; branch version is verbatim)
- `nfl_closing_lines.json` — stamped Pinnacle lines (refresh before slate)
- `nfl_games.json` — game list derived from closing lines
- `MODEL_CARD_v1.json` — frozen CFB fitted parameters

## Refreshing lines

Before each slate, re-pull Pinnacle lines and rewrite `nfl_closing_lines.json` with a fresh `observed_at`. The gate refuses anything older than 2 hours.

## Doctrine notes

- FreshnessGate is the only read path. Stale data refuses, it doesn't corrupt.
- CollegeGuard blocks the entire board if any CFB parameter matches an NFL constant within ±2%.
- Overlays are diagnostic only. They never replace the close.
- Kill ledger: 12 entries, chain intact (see parent directory).
