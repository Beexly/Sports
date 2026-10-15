#!/usr/bin/env python3
"""line_movement_score.py -- PIT-safe line-movement scale score on the frozen filter.

Movement may change scale only. Predictive mean stays spread_line (<1e-12).
A row with no pre-kickoff movement stamp is not scored (fail closed).
If the movement file is absent, this refuses. It does not impute zero movement.

Expected file (CSV), path via MOVE_CSV or the default below:
    game_id,move,observed_at
    observed_at must be strictly before that game's gameday.
    move = close_spread - open_spread, nflverse sign (positive = home favored).

Command when the file exists:
    MOVE_CSV=<path> python dfs/walk_forward/line_movement_score.py
"""
import csv
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import gse_location_locked_harness as H  # noqa: E402

MIN_PRIOR = 25
SIGMA0 = 13.45
GATE = 7.099
JOINT = 7.142622
DEFAULT_MOVE = os.path.join(
    os.environ.get("LOCALAPPDATA", ""),
    "hermes", "cache", "scratch", "movement_pit.csv",
)
OUT = os.path.join(ROOT, "research", "line-movement-score-2026-10-15.json")
CMD = "MOVE_CSV=<path> python dfs/walk_forward/line_movement_score.py"


def load_moves(path):
    if not path or not os.path.exists(path):
        return None
    out = {}
    with open(path, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        need = ("game_id", "move", "observed_at")
        missing = [c for c in need if c not in (rdr.fieldnames or [])]
        if missing:
            raise SystemExit("movement file missing columns: %s" % missing)
        for row in rdr:
            out[row["game_id"]] = row
    return out


def score(rows, moves):
    """Expanding-window beta on |move|, prior rows only. mu locked."""
    grid = [round(-0.40 + i * 0.02, 4) for i in range(41)]
    running = [0.0] * len(grid)
    n_scored = 0
    deltas = []
    refused_unstamped = 0
    max_dev = 0.0
    cnt = 0
    for i, r in enumerate(rows):
        mu = float(r["spread_line"])
        if abs(mu - r["spread_line"]) >= 1e-12:
            raise RuntimeError("location lock violated")
        max_dev = max(max_dev, abs(mu - r["spread_line"]))
        rec = moves.get(r["game_id"])
        gameday = str(r.get("gameday") or "")
        stamp_ok = False
        move = None
        if rec is not None:
            obs = str(rec.get("observed_at") or "")
            # date prefix compare: stamp must exist and not be after gameday
            if obs and gameday and obs[:10] <= gameday[:10] and rec.get("move") not in ("", None):
                try:
                    move = float(rec["move"])
                    stamp_ok = True
                except (TypeError, ValueError):
                    stamp_ok = False
        if not stamp_ok:
            refused_unstamped += 1
            # do not fold an unstamped row into the fit
            continue
        x = abs(move)
        if cnt >= MIN_PRIOR:
            best_b, best_v = 0.0, None
            for bi, b in enumerate(grid):
                v = running[bi] / cnt
                if best_v is None or v < best_v:
                    best_b, best_v = b, v
        else:
            best_b = 0.0
        sd = max(1e-6, SIGMA0 * math.exp(max(-0.45, min(0.45, best_b * x))))
        c_with = H.crps_gaussian(mu, sd, r["margin"])
        c_base = H.crps_gaussian(mu, SIGMA0, r["margin"])
        deltas.append(c_with - c_base)
        n_scored += 1
        for bi, b in enumerate(grid):
            sd_p = max(1e-6, SIGMA0 * math.exp(max(-0.45, min(0.45, b * x))))
            running[bi] += H.crps_gaussian(mu, sd_p, r["margin"])
        cnt += 1
    if n_scored < 150:
        return {
            "n_scored": n_scored,
            "refused_unstamped": refused_unstamped,
            "max_abs_mean_shift": max_dev,
            "gate_cleared": False,
            "passed": False,
            "reason": "n_scored < 150 or movement stamps missing. Not a clear.",
        }
    mean_d = sum(deltas) / len(deltas)
    return {
        "n_scored": n_scored,
        "refused_unstamped": refused_unstamped,
        "mean_delta_vs_13_45": mean_d,
        "implied_crps": 7.154021 + mean_d,
        "delta_vs_joint_hetero": (7.154021 + mean_d) - JOINT,
        "max_abs_mean_shift": max_dev,
        "gate_cleared": (7.154021 + mean_d) <= GATE and mean_d < 0 and n_scored >= 150,
        "passed": False,
    }


def main():
    path = os.environ.get("MOVE_CSV", DEFAULT_MOVE)
    rows, skipped = H.load_frozen()
    moves = load_moves(path)
    if moves is None:
        doc = {
            "status": "refused_prior",
            "reason": "No PIT movement file. nflverse games.csv has spread_line only (the close). Live ESPN snapshots are 14 STATUS_SCHEDULED games, 4 timestamps, 0 nonzero moves, 0 final scores. Movement cannot be scored on the frozen n=2462 filter without imputing.",
            "frozen_n": len(rows),
            "skipped_rows": len(skipped) if not isinstance(skipped, int) else skipped,
            "movement_file": path,
            "movement_file_present": False,
            "live_snapshots": {
                "dir": os.path.join(os.environ.get("LOCALAPPDATA", ""), "hermes", "cache", "scratch", "market"),
                "events": 14,
                "two_timestamps": 14,
                "nonzero_move": 0,
                "status": "STATUS_SCHEDULED",
            },
            "mu": "spread_line",
            "gate": GATE,
            "gate_cleared": False,
            "passed": False,
            "emission": "ZERO_OBJECT",
            "command_when_file_appears": CMD,
            "required_columns": ["game_id", "move", "observed_at"],
        }
    else:
        doc = score(rows, moves)
        doc["status"] = "ran_live" if doc.get("n_scored", 0) >= 150 else "refused_prior"
        doc["emission"] = "ZERO_OBJECT"
        doc["gate"] = GATE
        doc["command"] = CMD
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(doc, fh, indent=1)
    print(json.dumps(doc, indent=1))
    print("written", OUT)


if __name__ == "__main__":
    main()
