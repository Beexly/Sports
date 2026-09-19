#!/usr/bin/env python3
"""MIMO-6 situational conformal + sport-conditional 5pp recalibration gate.

Strata (Gemini directive):
  weather: dome | wind>=12 | cold<35F | other/unknown
  key margins: K1 {3,7,10} | K2 |mu|<3 | K3 other
  total line: low <41.5 | mid 42-49.5 | shootout >=50 | unknown
Fail-closed: n < 32 => +Inf qhat, no band (tighter than n=9 product floor).
Rolling-origin option via --mode rolling.
Also: sport-conditional market 5pp gate (MARKET-5PP replacement).
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean, pstdev

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from sport_resolve import resolve_sport  # noqa: E402
from mondrian_cqr import fnum, parse_iso, stratum  # noqa: E402

SITU_MIN_N = 32  # Gemini: fail-closed No-band when n<32
ALPHA = 0.10


def fnum2(x):
    return fnum(x)


def weather_strat(row_like):
    """row_like: wind, temp, roof from nflverse or board-export."""
    roof = str(row_like.get("roof") or "").lower()
    wind = fnum2(row_like.get("wind"))
    temp = fnum2(row_like.get("temp"))
    if roof in ("dome", "closed"):
        return "dome"
    if wind is not None and wind >= 12:
        return "wind_ge12"
    if temp is not None and temp < 35:
        return "cold_lt35F"
    return "other_or_unknown"


def key_strat(mu):
    return stratum(float(mu))  # K1/K2/K3 already defined


def total_strat(total_line):
    t = fnum2(total_line)
    if t is None:
        return "unknown"
    if t < 41.5:
        return "low_lt41.5"
    if t <= 49.5:
        return "mid_42_49.5"
    return "shootout_ge50"


def qhat_abs(res, alpha=ALPHA):
    n = len(res)
    if n < SITU_MIN_N:
        return None, True  # product fail-closed
    k = math.ceil((n + 1) * (1 - alpha))
    if k > n or k < 1:
        return None, True
    return sorted(res)[k - 1], False


def market_5pp_sport(rows):
    """Sport-conditional 5pp gate — replacement before market-anchored claims."""
    by = defaultdict(list)
    for r in rows:
        if r.get("result") not in ("WIN", "LOSS"):
            continue
        m = fnum2(r.get("marketFairProb"))
        if m is None or not (0 < m < 1):
            continue
        sp = resolve_sport(r.get("sport"), r.get("espnEventId"), r.get("selection"))
        by[sp].append((m, 1 if r.get("result") == "WIN" else 0))
    out = {}
    for sp, arr in by.items():
        bins = defaultdict(list)
        for m, y in arr:
            bins[min(9, int(m * 10))].append((m, y))
        ev, vi = [], []
        for b in range(10):
            cell = bins.get(b) or []
            if len(cell) < 30:
                continue
            mm = sum(a[0] for a in cell) / len(cell)
            my = sum(a[1] for a in cell) / len(cell)
            gap = abs(mm - my)
            rec = {"bin": b, "n": len(cell), "mean_mfp": mm, "mean_y": my, "abs_gap": gap}
            ev.append(rec)
            if gap > 0.05:
                vi.append(rec)
        out[sp] = {
            "n": len(arr),
            "n_evaluable_bins": len(ev),
            "n_violating_bins": len(vi),
            "evaluable": ev,
            "gate": (
                "BLOCK_market_fixed_offset"
                if vi
                else "ALLOW_market_offset_pending_more_n"
                if ev
                else "UNDERPOWERED"
            ),
            "recalibration_replacement": (
                f"sport={sp}: if any bin |mean mfp - mean y|>0.05 do NOT use market logit as fixed offset; "
                f"fit sport-conditional recalibration (isotonic/sport offset) then re-run 5pp gate"
                if vi
                else f"sport={sp}: no violating evaluable bin on this snapshot; still require pre-reg holdout before product claim"
            ),
        }
    return out


def load_board(path):
    return [json.loads(l) for l in path.read_text(encoding="utf-8").splitlines() if l.strip()]


def board_margin_rows(rows):
    out = []
    for raw in rows:
        if str(raw.get("isBootstrap", "false")).lower() in {"true", "1"}:
            continue
        y = fnum2(raw.get("actualMargin"))
        if y is None:
            hs, aw = fnum2(raw.get("homeScore")), fnum2(raw.get("awayScore"))
            if hs is not None and aw is not None:
                y = hs - aw
        mu = fnum2(raw.get("predictedMeanMargin"))
        if mu is None and str(raw.get("pickType") or "").upper() == "SPREAD":
            line = fnum2(raw.get("line"))
            if line is not None:
                mu = -line
        if y is None or mu is None:
            continue
        gen = parse_iso(raw.get("generatedAt"))
        kick = parse_iso(raw.get("commenceTime"))
        if gen and kick and gen >= kick:
            continue  # pre-game only
        sport = resolve_sport(raw.get("sport"), raw.get("espnEventId"), raw.get("selection"))
        out.append(
            {
                "y": y,
                "mu": mu,
                "resid": y - mu,
                "sport": sport,
                "pickType": str(raw.get("pickType") or "").upper(),
                "wind": None,
                "temp": None,
                "roof": None,
                "total_line": fnum2(raw.get("line")) if str(raw.get("pickType") or "").upper() == "TOTAL" else None,
                "result": raw.get("result"),
                "marketFairProb": fnum2(raw.get("marketFairProb")),
                "key": key_strat(mu),
                "wstrat": weather_strat(raw),
                "tstrat": total_strat(raw.get("total_line") or (raw.get("line") if str(raw.get("pickType") or "").upper() == "TOTAL" else None)),
                "gen_ts": gen.timestamp() if gen else 0,
            }
        )
    return out


def load_nflverse_games(path):
    rows = []
    with path.open(encoding="utf-8") as f:
        for rec in csv.DictReader(f):
            try:
                home = float(rec["home_score"])
                away = float(rec["away_score"])
                spread = float(rec["spread_line"])
            except Exception:
                continue
            mu = -spread
            y = home - away
            rows.append(
                {
                    "y": y,
                    "mu": mu,
                    "resid": y - mu,
                    "sport": "NFL",
                    "pickType": "SPREAD",
                    "wind": fnum2(rec.get("wind")),
                    "temp": fnum2(rec.get("temp")),
                    "roof": rec.get("roof"),
                    "total_line": fnum2(rec.get("total_line")),
                    "result": None,
                    "marketFairProb": None,
                    "key": key_strat(mu),
                    "wstrat": weather_strat(rec),
                    "tstrat": total_strat(rec.get("total_line")),
                    "season": int(float(rec.get("season") or 0)),
                    "gen_ts": float(int(float(rec.get("season") or 0))),
                }
            )
    return rows


def evaluate_strata(rows, axis_fn, label):
    rows = sorted(rows, key=lambda r: r.get("gen_ts") or 0)
    mid = len(rows) // 2
    cal, te = rows[:mid], rows[mid:]
    cells = []
    buckets = defaultdict(list)
    for r in cal:
        buckets[axis_fn(r)].append(r)
    for k, cal_rs in sorted(buckets.items(), key=lambda kv: -len(kv[1])):
        te_rs = [r for r in te if axis_fn(r) == k]
        abs_cal = [abs(r["resid"]) for r in cal_rs]
        q, inf = qhat_abs(abs_cal)
        if inf or not te_rs:
            cells.append(
                {
                    "stratum": k,
                    "axis": label,
                    "n_cal": len(cal_rs),
                    "n_holdout": len(te_rs),
                    "qhat": None,
                    "qhat_infinite": True,
                    "coverage_oot": None,
                    "mean_width": None,
                    "status": "NO_BAND_FAIL_CLOSED" if inf else "EMPTY_HOLDOUT",
                    "min_n": SITU_MIN_N,
                }
            )
            continue
        covered = sum(1 for r in te_rs if abs(r["resid"]) <= q)
        cov = covered / len(te_rs)
        cells.append(
            {
                "stratum": k,
                "axis": label,
                "n_cal": len(cal_rs),
                "n_holdout": len(te_rs),
                "qhat": q,
                "qhat_infinite": False,
                "coverage_oot": cov,
                "mean_width": 2 * q,
                "meets_0.85": cov >= 0.85,
                "status": "ok",
                "min_n": SITU_MIN_N,
            }
        )
    ok = [c for c in cells if c.get("coverage_oot") is not None]
    return {
        "axis": label,
        "cells": cells,
        "n_bins_ok": len(ok),
        "n_bins_noband": sum(1 for c in cells if c.get("qhat_infinite")),
        "min_oot_coverage": min((c["coverage_oot"] for c in ok), default=None),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--board", required=True)
    ap.add_argument("--nflverse", default=r"C:\Users\Garrett\nfl_ot\games.csv")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    board_path = Path(args.board)
    if not board_path.exists():
        write_report(Path(args.out), {"ok": False, "status": "DATA_BLOCKED"})
        return 2
    board_raw = load_board(board_path)
    board = board_margin_rows(board_raw)
    nfl = load_nflverse_games(Path(args.nflverse)) if Path(args.nflverse).exists() else []

    # weather axis needs nflverse (wind/temp/roof); board margins have key + total
    axes = {}
    if nfl:
        axes["weather_nflverse"] = evaluate_strata(nfl, lambda r: r["wstrat"], "weather")
        axes["key_nflverse"] = evaluate_strata(nfl, lambda r: r["key"], "key_margin")
        axes["total_line_nflverse"] = evaluate_strata(nfl, lambda r: r["tstrat"], "total_line")
        axes["weather_x_key_nflverse"] = evaluate_strata(
            nfl, lambda r: f"{r['wstrat']}|{r['key']}", "weather_x_key"
        )
    axes["key_board_export"] = evaluate_strata(board, lambda r: r["key"], "key_margin_board")
    axes["sport_x_key_board"] = evaluate_strata(board, lambda r: f"{r['sport']}|{r['key']}", "sport_x_key")
    axes["total_strat_board"] = evaluate_strata(board, lambda r: r["tstrat"], "total_line_board")

    # rolling-origin on NFL weather|key if enough
    rolling = None
    if len(nfl) >= 200:
        nfl_s = sorted(nfl, key=lambda r: r.get("gen_ts") or 0)
        hold = nfl_s[int(len(nfl_s) * 0.6) :]
        hist = defaultdict(list)
        rcells = []
        for r in hold:
            key = f"{r['wstrat']}|{r['key']}"
            abs_hist = [abs(x["resid"]) for x in hist[key]]
            if len(abs_hist) < SITU_MIN_N:
                rcells.append({"stratum": key, "status": "NO_BAND_n_hist_lt_32", "n_hist": len(abs_hist)})
            else:
                k = math.ceil((len(abs_hist) + 1) * 0.9)
                q = abs_hist[k - 1] if k <= len(abs_hist) else None
                if q is None:
                    rcells.append({"stratum": key, "status": "NO_BAND_k_gt_n", "n_hist": len(abs_hist)})
                else:
                    rcells.append(
                        {
                            "stratum": key,
                            "n_hist": len(abs_hist),
                            "halfwidth": q,
                            "covered": 1 if abs(r["resid"]) <= q else 0,
                        }
                    )
            hist[key].append(r)
        scored = [c for c in rcells if "covered" in c]
        rolling = {
            "n_holdout": len(hold),
            "n_scored": len(scored),
            "n_noband": sum(1 for c in rcells if "NO_BAND" in str(c.get("status"))),
            "coverage": mean(c["covered"] for c in scored) if scored else None,
            "note": "expanding window per weather|key; min_n=32 fail-closed",
        }

    m5 = market_5pp_sport(board_raw)

    report = {
        "ok": True,
        "task": "MIMO-6 situational conformal + MIMO-7 gate prep",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "min_n_situational": SITU_MIN_N,
        "fail_closed_rule": "n < 32 => No-band +Inf; never clamp",
        "n_board_margins": len(board),
        "n_nflverse_games": len(nfl),
        "situational_axes": axes,
        "rolling_weather_key": rolling,
        "market_5pp_sport_gate": m5,
        "mimo7_underdog_note": (
            "Board-export lacks rest/trench/backup-QB fields; situational ML turnaround "
            "needs 26 signals join (pull 0826ea2f1) + underdog American odds. "
            "Gate ready: any sport with violating 5pp bins BLOCKS market-fixed-offset claims."
        ),
        "kill_lines": [
            "Situational product band only if OOT cov>=0.85 and n_holdout>=32 else No-band",
            "Market-anchored product claim blocked on any sport with >=1 5pp violating bin",
            "Never clamp finite band when n<32",
        ],
    }
    write_report(Path(args.out), report)
    # compact score
    scores = {}
    for name, ax in axes.items():
        scores[name] = {
            "ok_bins": ax["n_bins_ok"],
            "noband": ax["n_bins_noband"],
            "min_cov": ax["min_oot_coverage"],
        }
    print(dumps_report({"ok": True, "out": str(args.out), "axes": scores, "rolling": rolling, "m5_gate": {k: v.get("gate") for k, v in m5.items()}}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
