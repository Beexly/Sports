#!/usr/bin/env python3
"""Jackknife+ margin calibration on nflverse schedules games.csv (walk-forward).

Corpus OBSERVED on disk first; if only a partial local file exists, report that n.
Attempt public nflverse schedules download only when --allow-network; CC-BY-4.0 attribution required.
Convention: predicted home margin = -spread_line (nflverse home spread).
Actual home margin = home_score - away_score.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
import urllib.request
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import dumps_report, write_report  # noqa: E402
from jackknife_plus_margins import jackknife_plus_interval, split_conformal_halfwidth, MIN_N, ALPHA  # noqa: E402

NFLVERSE_GAMES_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"
ATTRIBUTION = "Data via nflverse (nflverse-data), licensed CC BY 4.0."


def load_games_csv(path: Path):
    rows = []
    with path.open(encoding="utf-8") as f:
        for rec in csv.DictReader(f):
            try:
                season = int(float(rec.get("season") or 0))
            except Exception:
                continue
            hs = rec.get("home_score") or rec.get("home_score") or ""
            as_ = rec.get("away_score") or ""
            try:
                home_score = float(hs)
                away_score = float(as_)
            except Exception:
                continue
            spread = rec.get("spread_line")
            try:
                spread_f = float(spread)
            except Exception:
                continue
            # REG only preferred; include POST separately
            gtype = (rec.get("game_type") or rec.get("season_type") or "REG").upper()
            actual = home_score - away_score
            pred = -spread_f  # home margin implied by market
            rows.append(
                {
                    "season": season,
                    "game_type": gtype,
                    "actual": actual,
                    "pred": pred,
                    "game_id": rec.get("game_id"),
                    "espn": rec.get("espn"),
                }
            )
    return rows


def walk_forward_jackknife(rows, min_season=1999, n_folds=5):
    seasons = sorted({r["season"] for r in rows if r["season"] >= min_season})
    if len(seasons) < n_folds + 2:
        return {"ok": False, "status": "TOO_FEW_SEASONS", "seasons": seasons}
    # 5 expanding temporal folds: test on later blocks
    fold_edges = []
    # split season list into n_folds+1 chunks; fold i trains on chunks 0..i, tests chunk i+1
    chunk = max(1, len(seasons) // (n_folds + 1))
    for i in range(n_folds):
        train_max = seasons[min(len(seasons) - 1, (i + 1) * chunk) - 1]
        test_lo = seasons[min(len(seasons) - 1, (i + 1) * chunk)]
        test_hi = seasons[min(len(seasons) - 1, (i + 2) * chunk - 1)]
        fold_edges.append((train_max, test_lo, test_hi))

    folds = []
    for fi, (train_max, test_lo, test_hi) in enumerate(fold_edges):
        train = [r for r in rows if r["season"] <= train_max]
        test = [r for r in rows if test_lo <= r["season"] <= test_hi]
        y_cal = [r["actual"] for r in train]
        pred_cal = [r["pred"] for r in train]
        half = split_conformal_halfwidth(y_cal, pred_cal, ALPHA)
        cov_j, cov_s, wid_j = [], [], []
        for r in test:
            jp = jackknife_plus_interval(y_cal, r["pred"], ALPHA)
            if jp["status"] != "ok":
                continue
            wid_j.append(jp["width"])
            cov_j.append(jp["lower"] <= r["actual"] <= jp["upper"])
            cov_s.append(abs(r["actual"] - r["pred"]) <= half)
        folds.append(
            {
                "fold": fi,
                "train_seasons_max": train_max,
                "test_seasons": [test_lo, test_hi],
                "n_train": len(train),
                "n_test": len(test),
                "split_halfwidth": half if math.isfinite(half) else None,
                "split_mean_width": 2 * half if math.isfinite(half) else None,
                "jplus_mean_width": mean(wid_j) if wid_j else None,
                "coverage_jplus": mean(cov_j) if cov_j else None,
                "coverage_split": mean(cov_s) if cov_s else None,
                "verdict_fold": (
                    "INSUFFICIENT"
                    if not cov_j
                    else "J+_beats_or_matches"
                    if mean(cov_j) >= mean(cov_s) - 0.03
                    else "J+_undercovers"
                ),
            }
        )

    valid = [f for f in folds if f["coverage_jplus"] is not None and f["coverage_split"] is not None]
    mean_cov_j = mean([f["coverage_jplus"] for f in valid]) if valid else None
    mean_cov_s = mean([f["coverage_split"] for f in valid]) if valid else None
    mean_w_j = mean([f["jplus_mean_width"] for f in valid if f["jplus_mean_width"] is not None]) if valid else None
    mean_w_s = mean([f["split_mean_width"] for f in valid if f["split_mean_width"] is not None]) if valid else None
    width_ratio = (mean_w_j / mean_w_s) if mean_w_j and mean_w_s else None

    # Mission kill line: J+ strictly beats split coverage without widening >10%
    if mean_cov_j is None or mean_cov_s is None:
        mission = "NOT_RUN"
    elif mean_cov_j > mean_cov_s and width_ratio is not None and width_ratio <= 1.10:
        mission = "MISSION_PASS_J+_higher_cov_width_ok"
    elif mean_cov_j >= mean_cov_s - 0.03 and width_ratio is not None and width_ratio <= 1.10:
        mission = "J+_acceptable_not_strictly_better"
    else:
        mission = "MISSION_FAIL_or_width_blowup"

    return {
        "ok": True,
        "n_rows": len(rows),
        "seasons": [seasons[0], seasons[-1]] if seasons else None,
        "n_folds": len(folds),
        "folds": folds,
        "mean_coverage_jplus": mean_cov_j,
        "mean_coverage_split": mean_cov_s,
        "mean_width_jplus": mean_w_j,
        "mean_width_split": mean_w_s,
        "width_ratio_j_over_split": width_ratio,
        "mission": mission,
        "kill_line": "J+ must beat split coverage and width_J+ <= 1.10 * width_split",
        "attribution": ATTRIBUTION,
        "convention": "predicted home margin = -nflverse spread_line; actual = home_score - away_score",
        "filter": "rows with numeric scores and spread_line",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default=r"C:\Users\Garrett\nfl_ot\games.csv")
    ap.add_argument("--out", required=True)
    ap.add_argument("--allow-network", action="store_true", help="fetch nflverse schedules games.csv")
    ap.add_argument("--download-to", default="")
    args = ap.parse_args()
    path = Path(args.input)
    network_note = None
    if args.allow_network and args.download_to:
        dest = Path(args.download_to)
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            req = urllib.request.Request(NFLVERSE_GAMES_URL, headers={"User-Agent": "GSE-stats-lane/1.0"})
            with urllib.request.urlopen(req, timeout=60) as r:
                dest.write_bytes(r.read())
            path = dest
            network_note = f"downloaded {dest} bytes={dest.stat().st_size}"
        except Exception as e:
            network_note = f"DOWNLOAD_FAIL {type(e).__name__}: {e}"

    if not path.exists():
        payload = {
            "ok": False,
            "status": "DATA_BLOCKED",
            "path": str(path),
            "need": "nflverse schedules games.csv (local or --allow-network --download-to ...)",
            "mission_claimed_n": 14251,
            "attribution": ATTRIBUTION,
        }
        write_report(Path(args.out), payload)
        print(dumps_report(payload))
        return 2

    rows = load_games_csv(path)
    report = walk_forward_jackknife(rows)
    report["input"] = str(path)
    report["network_note"] = network_note
    report["mission_claimed_n"] = 14251
    report["observed_n"] = len(rows)
    report["n_gap_vs_mission"] = (14251 - len(rows)) if len(rows) else None
    write_report(Path(args.out), report)
    print(
        dumps_report(
            {
                "ok": report.get("ok"),
                "out": str(args.out),
                "observed_n": len(rows),
                "mission": report.get("mission"),
                "mean_cov_j": report.get("mean_coverage_jplus"),
                "mean_cov_s": report.get("mean_coverage_split"),
                "width_ratio": report.get("width_ratio_j_over_split"),
                "network_note": network_note,
            }
        )
    )
    return 0 if report.get("ok") else 2


if __name__ == "__main__":
    raise SystemExit(main())
