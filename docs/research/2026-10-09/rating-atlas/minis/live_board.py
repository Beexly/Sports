"""
live_board.py — tonight's honest output.

Generates the live board Garrett actually sees. Every row is labeled
"baseline" (closing line only) or "diagnostic overlay" (closing line +
a stamped, fresh overlay that passed the gate).

NEVER outputs "pick", "bet", "edge", or "play" language.
This is a board, not a pick sheet.

Read path: FreshnessGate only. If a file is stale or unstamped,
the overlay is dropped and the game falls back to baseline.
CollegeGuard refuses the entire board if any CFB parameter
matches an NFL constant within ±2%.
"""

import json
import sys
from datetime import datetime, timezone

# FreshnessGate is landed by the wiring agent at the same path.
# This import MUST succeed — no fallback to raw reads.
try:
    from freshness_gate import load_stamped
except ImportError:
    # Allow running from the minis/ directory directly
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from freshness_gate import load_stamped


# ---------------------------------------------------------------------------
# CollegeGuard — rule 3, hardcoded (doctrine.py is the source of truth,
# this is the enforcement copy for the live path)
# ---------------------------------------------------------------------------
NFL_CONSTANTS = {
    "nfl_gaussian_ladder_13.45": 13.45,
    "pinnacle_total_sigma": 13.19,
    "pinnacle_spread_sigma": 10.62,
    "modern_hfa": 1.56,
    "dk_pass_sigma": 70.9,
    "dk_rec_sigma": 37.7,
    "dk_rush_sigma": 41.7,
    "dk_1h_pass_sigma": 51.0,
    "dk_1h_rec_sigma": 26.0,
    "dk_1h_rush_sigma": 22.0,
}
COLLEGE_GUARD_TOL = 0.02  # ±2%


def _college_guard_check(params: dict, label: str = "CFB") -> None:
    """Raise if any CFB parameter matches an NFL constant within ±2%."""
    violations = []
    for k, v in params.items():
        if isinstance(k, str) and k.lower().startswith("nfl_"):
            violations.append(f"key '{k}' carries an NFL port ({label})")
        if isinstance(v, (int, float)):
            for cname, cval in NFL_CONSTANTS.items():
                if abs(float(v) - cval) <= COLLEGE_GUARD_TOL * max(1.0, abs(cval)):
                    violations.append(
                        f"value {v} at '{k}' matches NFL constant "
                        f"{cname}={cval} ({label})"
                    )
    if violations:
        raise ValueError(
            "COLLEGE GUARD REFUSED — entire board blocked:\n  "
            + "\n  ".join(violations)
        )


def _extract_cfb_params(overlay_data) -> dict:
    """Pull numeric parameters from overlay data for CollegeGuard check."""
    params = {}
    if isinstance(overlay_data, dict):
        for k, v in overlay_data.items():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                params[k] = v
            elif isinstance(v, dict):
                for sk, sv in v.items():
                    if isinstance(sv, (int, float)) and not isinstance(sv, bool):
                        params[f"{k}.{sk}"] = sv
    return params


# ---------------------------------------------------------------------------
# Overlay definitions: name -> (warehouse key, max_age_hours)
# ---------------------------------------------------------------------------
OVERLAYS = [
    ("situational_graph", "situational_graph", 6.0),
    ("eq1_pressure_leverage", "eq_overlays", 6.0),
    ("eq2_drive_tempo", "eq_overlays", 6.0),
    ("eq3_must_score", "eq_overlays", 6.0),
    ("ppa", "ppa_overlay", 6.0),
]


def live_board(games, warehouse):
    """
    games: list of {id, home, away, start} — the slate.
    warehouse: dict of {key: path} — stamped data files.

    Returns: board dict with rows labeled "baseline" or "diagnostic overlay".
    """
    board = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "label": "LIVE BOARD — baseline and diagnostic rows only.",
        "rows": [],
        "refusals": [],
    }

    # ---- 1. Closing lines through the gate (2h max — live lines) ----
    try:
        lines_data = load_stamped(warehouse["closing_lines"], max_age_hours=2)
    except Exception as e:
        # Gate refused or file missing — entire board is refused.
        # Fall back: no board, honest refusal.
        board["refusals"].append({
            "scope": "entire_board",
            "reason": f"closing lines failed FreshnessGate: {e}",
        })
        board["status"] = "REFUSED — no fresh closing lines"
        return board

    # Normalize: lines file may be {"games": [...]} or a bare list
    if isinstance(lines_data, dict):
        line_games = lines_data.get("games", [])
    else:
        line_games = lines_data
    lines_by_id = {g.get("id"): g for g in line_games if g.get("id") is not None}

    # ---- 2. Attempt overlays through the gate ----
    overlays_loaded = {}   # name -> data
    overlays_refused = []  # {name, reason}
    for name, wkey, max_age in OVERLAYS:
        path = warehouse.get(wkey)
        if not path:
            overlays_refused.append({"name": name, "reason": "no path in warehouse"})
            continue
        try:
            data = load_stamped(path, max_age_hours=max_age)
            # CollegeGuard on any numeric params in this overlay
            _college_guard_check(_extract_cfb_params(data), label=f"CFB/{name}")
            overlays_loaded[name] = data
        except ValueError as e:
            # CollegeGuard refusal — this is fatal for the whole board
            raise
        except Exception as e:
            overlays_refused.append({"name": name, "reason": str(e)[:200]})

    # ---- 2b. Explicit CFB params check if provided ----
    if "cfb_params" in warehouse:
        cfb_p = warehouse["cfb_params"]
        if isinstance(cfb_p, str):
            cfb_p = load_stamped(cfb_p, max_age_hours=6.0)
        _college_guard_check(cfb_p if isinstance(cfb_p, dict) else {}, label="CFB/params")

    # ---- 3. Build rows ----
    for game in games:
        gid = game.get("id")
        line = lines_by_id.get(gid, {})

        row = {
            "game": f"{game.get('away')} at {game.get('home')}",
            "game_id": gid,
            "start": game.get("start") or line.get("start"),
            "spread_close": line.get("spread"),
            "total_close": line.get("total"),
            "ml_fair_home": line.get("ml_hf"),
            "ml_fair_away": line.get("ml_af"),
            "residual": None,
            "status": "baseline",
            "overlays_applied": [],
            "overlays_refused": [r["name"] for r in overlays_refused],
        }

        # Apply overlays that passed the gate (diagnostic only — never μ)
        applied = []
        for name, data in overlays_loaded.items():
            val = _lookup_overlay(data, name, gid, game)
            if val is not None:
                applied.append(name)
        if applied:
            row["overlays_applied"] = applied
            row["status"] = "diagnostic overlay"
            # Residual is informational only — does NOT replace the close
            row["residual"] = _combine_residuals(
                {n: _lookup_overlay(d, n, gid, game) for n, d in overlays_loaded.items()}
            )

        board["rows"].append(row)

    board["status"] = "OK"
    board["n_rows"] = len(board["rows"])
    board["n_baseline"] = sum(1 for r in board["rows"] if r["status"] == "baseline")
    board["n_diagnostic"] = sum(1 for r in board["rows"] if r["status"] == "diagnostic overlay")
    return board


def _lookup_overlay(data, name, game_id, game):
    """Extract this game's overlay value. Returns None if not found."""
    try:
        if isinstance(data, dict):
            # Try game-id keyed, then team-keyed
            for key in (str(game_id), game_id):
                if key in data:
                    v = data[key]
                    return v.get(name, v) if isinstance(v, dict) else v
            # Try nested "games" or "overlays" structure
            for container in ("games", "overlays", "values"):
                if container in data and isinstance(data[container], dict):
                    for key in (str(game_id), game_id):
                        if key in data[container]:
                            return data[container][key]
        return None
    except Exception:
        return None


def _combine_residuals(values: dict):
    """Combine overlay values into an informational residual. Never μ."""
    nums = [v for v in values.values() if isinstance(v, (int, float))]
    if not nums:
        return None
    # Simple mean — diagnostic only, documented as such
    return round(sum(nums) / len(nums), 3)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("usage: python3 live_board.py <games.json> <warehouse.json>")
        print("  games.json: list of {id, home, away, start}")
        print('  warehouse.json: {"closing_lines": "path", "situational_graph": "path", ...}')
        sys.exit(2)

    games_path, warehouse_path = sys.argv[1], sys.argv[2]
    games_raw = json.load(open(games_path))
    games = games_raw.get("games", games_raw) if isinstance(games_raw, dict) else games_raw
    warehouse = json.load(open(warehouse_path))

    board = live_board(games, warehouse)

    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    out_path = f"live_board_{ts}.json"
    json.dump(board, open(out_path, "w"), indent=1)
    print(json.dumps(board, indent=1))
    print(f"\nSaved: {out_path}", file=sys.stderr)
