"""Fit rest, wind, temperature, and referee on 2024-2025 nflverse games.

Rest moves the game margin. Wind and temperature move the total versus the
posted number. A referee effect is stored only when that crew has enough
games and the mean sits outside one standard error.
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path("/tmp/Sports")
SRC = Path("/tmp/olcal/games_nflverse.csv")
OUT = ROOT / "data" / "gse-dataset" / "current" / "environment-calibration.json"
REPORT = ROOT / "docs" / "reasoning" / "environment-calibration.md"


def num(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def load():
    rows = []
    with SRC.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season") not in ("2024", "2025") or row.get("game_type") != "REG":
                continue
            if num(row.get("home_score")) is None or num(row.get("away_score")) is None:
                continue
            rows.append(row)
    return rows


def ols(x, y):
    x = np.asarray(x, dtype=float)
    y = np.asarray(y, dtype=float)
    n = len(y)
    if n < 30 or np.allclose(x.var(), 0):
        return None
    X = np.column_stack([np.ones(n), x])
    beta, *_ = np.linalg.lstsq(X, y, rcond=None)
    resid = y - X @ beta
    dof = max(n - 2, 1)
    sigma2 = float(resid @ resid) / dof
    xtx_inv = np.linalg.pinv(X.T @ X)
    se = np.sqrt(np.clip(np.diag(xtx_inv) * sigma2, 0, None))
    used = float(beta[1]) if abs(float(beta[1])) > float(se[1]) else 0.0
    return {
        "n": n,
        "intercept": round(float(beta[0]), 4),
        "slope": round(float(beta[1]), 4),
        "se": round(float(se[1]), 4),
        "used_slope": round(used, 4),
    }


def main():
    rows = load()
    rest_x, rest_y = [], []
    wind_x, wind_y = [], []
    temp_x, temp_y = [], []
    by_ref = defaultdict(list)
    for row in rows:
        home_rest = num(row.get("home_rest"))
        away_rest = num(row.get("away_rest"))
        if home_rest is not None and away_rest is not None:
            rest_x.append(home_rest - away_rest)
            rest_y.append(num(row["home_score"]) - num(row["away_score"]))
        roof = row.get("roof")
        wind = num(row.get("wind"))
        temp = num(row.get("temp"))
        total = num(row.get("total"))
        line = num(row.get("total_line"))
        if roof in ("outdoors", "open") and wind is not None and total is not None and line is not None:
            wind_x.append(wind)
            wind_y.append(total - line)
        if roof in ("outdoors", "open") and temp is not None and total is not None and line is not None:
            temp_x.append(temp)
            temp_y.append(total - line)
        ref = row.get("referee") or ""
        if ref and total is not None and line is not None:
            by_ref[ref].append({
                "total_resid": total - line,
                "margin": num(row["home_score"]) - num(row["away_score"]),
            })

    rest = ols(rest_x, rest_y)
    wind = ols(wind_x, wind_y)
    temp = ols(temp_x, temp_y)
    crews = {}
    for ref, games in by_ref.items():
        if len(games) < 12:
            continue
        margins = np.array([g["margin"] for g in games], dtype=float)
        totals = np.array([g["total_resid"] for g in games], dtype=float)
        se_m = float(margins.std(ddof=1) / np.sqrt(len(games)))
        se_t = float(totals.std(ddof=1) / np.sqrt(len(games)))
        mean_m = float(margins.mean())
        mean_t = float(totals.mean())
        crews[ref] = {
            "games": len(games),
            "home_margin": round(mean_m, 3),
            "home_margin_se": round(se_m, 3),
            "home_margin_used": round(mean_m, 3) if abs(mean_m) > se_m else 0.0,
            "total_resid": round(mean_t, 3),
            "total_resid_se": round(se_t, 3),
            "total_resid_used": round(mean_t, 3) if abs(mean_t) > se_t else 0.0,
        }

    result = {
        "seasons": [2024, 2025],
        "games": len(rows),
        "rest_days_to_margin": rest,
        "wind_mph_to_total_residual": wind,
        "temp_f_to_total_residual": temp,
        "referees": crews,
        "note": "used_slope is zero when |slope| <= se. Next week reads this file.",
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n")
    live_refs = [name for name, row in crews.items() if row["home_margin_used"] or row["total_resid_used"]]
    lines = [
        "# Environment calibration, 2024-2025",
        "",
        f"{len(rows)} settled regular-season games. Rest moves the margin. Wind and temperature move the total versus the number. A referee is stored only at 12 games or more.",
        "",
        "| feature | n | slope | se | used |",
        "|---|---:|---:|---:|---:|",
        f"| rest days → home margin | {rest['n']} | {rest['slope']:+.3f} | {rest['se']:.3f} | {rest['used_slope']:+.3f} |",
        f"| wind mph → total residual | {wind['n']} | {wind['slope']:+.3f} | {wind['se']:.3f} | {wind['used_slope']:+.3f} |",
        f"| temperature F → total residual | {temp['n']} | {temp['slope']:+.3f} | {temp['se']:.3f} | {temp['used_slope']:+.3f} |",
        "",
        f"Referee crews with a used effect: {len(live_refs)} of {len(crews)}.",
        "",
    ]
    REPORT.write_text("\n".join(lines))
    print(json.dumps({
        "rest": rest,
        "wind": wind,
        "temp": temp,
        "refs": len(crews),
        "refs_used": len(live_refs),
    }, indent=2))


if __name__ == "__main__":
    main()
