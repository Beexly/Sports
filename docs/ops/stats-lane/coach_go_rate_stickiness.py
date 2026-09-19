#!/usr/bin/env python3
"""Coach 4th-and-short go-rate stickiness (stats-lane V2).

On nflverse play-by-play 2024 and 2025 (and 2023 if present):
  team/coach 4th&short go rate by season; Spearman rank-corr season-over-season
  for coaches AND teams present in both adjacent seasons.

Definitions (documented, not invented):
  4th&short: down == 4 AND ydstogo <= 2 AND ydstogo >= 1
  Eligible play_type: run, pass, punt, field_goal  (excludes no_play, qb_kneel, etc.)
  Go: play_type in (run, pass)
  Team unit: posteam
  Coach: home_coach if posteam==home_team else away_coach
  go_rate = go_attempts / eligible_attempts   (team-season or coach-season)

Kill line (pre-registered):
  if adjacent-season Spearman r < 0.20 for BOTH coach and team rates,
  coach go-rate stays SPEC (not a factor). If coach r >= 0.20, register
  candidate factor with kill: wire only if holdout Brier improves by >=0.002
  on n>=272 NFL decided pre-game rows after the feature is actually joinable.

Attribution: nflverse pbp, CC BY 4.0. No DB. No fabricated coach data.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from statistics import mean

sys.path.insert(0, str(Path(__file__).resolve().parent))
from stats_json import write_report  # noqa: E402
from opponent_adjusted_epa import opponent_adjusted, sigmoid  # noqa: E402  (helpers on path)

PBP_DIR = Path("docs/ops/stats-lane/incoming/nflverse-pbp")
DEFAULT_OUT = Path("docs/ops/stats-lane/out/coach_go_rate_stickiness.json")

ELIGIBLE = {"run", "pass", "punt", "field_goal"}
GO = {"run", "pass"}
STICKINESS_KILL_R = 0.20
FACTOR_KILL_LINE = (
    "r>=0.20 registers CANDIDATE only; wire as factor only if holdout Brier improves "
    ">=0.002 on n>=272 decided pre-game NFL rows after a real join key exists"
)


def fnum(x):
    try:
        if x is None or x == "":
            return None
        v = float(x)
        return v if math.isfinite(v) else None
    except Exception:
        return None


def average_ranks(vals: list[float]) -> list[float]:
    n = len(vals)
    order = sorted(range(n), key=lambda i: vals[i])
    ranks = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and vals[order[j + 1]] == vals[order[i]]:
            j += 1
        avg = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[order[k]] = avg
        i = j + 1
    return ranks


def spearman(xs: list[float], ys: list[float]) -> float | None:
    if len(xs) < 3 or len(xs) != len(ys):
        return None
    rx, ry = average_ranks(xs), average_ranks(ys)
    mx, my = mean(rx), mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    dx = math.sqrt(sum((a - mx) ** 2 for a in rx))
    dy = math.sqrt(sum((b - my) ** 2 for b in ry))
    if dx <= 0 or dy <= 0:
        return None
    return num / (dx * dy)


def season_from_path(path: Path) -> int | None:
    name = path.name
    for y in (2022, 2023, 2024, 2025, 2026):
        if str(y) in name:
            return y
    return None


def load_go_rates(path: Path, season: int):
    """Return (coach_rates, team_rates) dicts: key -> {go, elig, rate}.

    Uses csv.reader — nflverse pbp `desc` fields contain commas and quotes;
    naive split(',') misaligns columns (surfaced coach keys = surface types).
    """
    coach: dict[str, dict] = defaultdict(lambda: {"go": 0, "elig": 0})
    team: dict[str, dict] = defaultdict(lambda: {"go": 0, "elig": 0})
    opener = gzip.open if path.suffix == ".gz" else open
    n_rows = 0
    n_elig = 0
    n_skip_parse = 0
    need = ["season", "week", "home_team", "away_team", "posteam", "down", "ydstogo",
            "play_type", "home_coach", "away_coach"]
    with opener(path, "rt", encoding="utf-8", newline="") as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return None, None, {"error": "empty file", "path": str(path)}
        idx = {h: i for i, h in enumerate(header)}
        for col in need:
            if col not in idx:
                return None, None, {"error": f"missing column {col}", "path": str(path)}
        max_need = max(idx[c] for c in need)
        for parts in reader:
            n_rows += 1
            if len(parts) <= max_need:
                n_skip_parse += 1
                continue
            try:
                sea = int(float(parts[idx["season"]]))
            except Exception:
                n_skip_parse += 1
                continue
            if sea != season:
                continue
            try:
                down = int(float(parts[idx["down"]]))
                ytg = float(parts[idx["ydstogo"]])
            except Exception:
                continue
            if down != 4 or ytg < 1 or ytg > 2:
                continue
            ptype = (parts[idx["play_type"]] or "").strip()
            if ptype not in ELIGIBLE:
                continue
            n_elig += 1
            posteam = (parts[idx["posteam"]] or "").strip()
            home = (parts[idx["home_team"]] or "").strip()
            hc = (parts[idx["home_coach"]] or "").strip()
            ac = (parts[idx["away_coach"]] or "").strip()
            coach_name = hc if posteam == home else ac
            is_go = 1 if ptype in GO else 0
            if coach_name and coach_name not in ("", "NA"):
                coach[coach_name]["go"] += is_go
                coach[coach_name]["elig"] += 1
            if posteam:
                team[posteam]["go"] += is_go
                team[posteam]["elig"] += 1

    def finalize(d: dict) -> dict:
        out = {}
        for k, v in d.items():
            if v["elig"] >= 5:  # min sample for a rate
                out[k] = {
                    "go": v["go"],
                    "elig": v["elig"],
                    "rate": v["go"] / v["elig"],
                    "season": season,
                }
        return out

    meta = {
        "path": str(path),
        "season": season,
        "n_pbp_rows_scanned": n_rows,
        "n_4th_short_eligible": n_elig,
        "n_skip_parse": n_skip_parse,
        "n_coach_keys_raw": len(coach),
        "n_team_keys_raw": len(team),
        "n_coach_keys_min5": len(finalize(coach)),
        "n_team_keys_min5": len(finalize(team)),
    }
    return finalize(coach), finalize(team), meta


def stickiness_pair(a: dict, b: dict, label: str) -> dict:
    keys = sorted(set(a) & set(b))
    if len(keys) < 3:
        return {
            "unit": label,
            "n_overlap": len(keys),
            "spearman": None,
            "status": "insufficient_overlap",
        }
    xs = [a[k]["rate"] for k in keys]
    ys = [b[k]["rate"] for k in keys]
    rho = spearman(xs, ys)
    return {
        "unit": label,
        "n_overlap": len(keys),
        "spearman": rho,
        "status": "ok" if rho is not None else "rank_degenerate",
        "sample_overlap_keys": keys[:8],
        "mean_rate_a": mean(xs),
        "mean_rate_b": mean(ys),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--pbp-dir", type=Path, default=PBP_DIR)
    args = ap.parse_args()

    seasons = []
    for y in (2023, 2024, 2025):
        for cand in (
            args.pbp_dir / f"play_by_play_{y}.csv.gz",
            args.pbp_dir / f"play_by_play_{y}.csv",
        ):
            if cand.exists():
                seasons.append((y, cand))
                break

    if len(seasons) < 2:
        payload = {
            "instrument": "coach_go_rate_stickiness",
            "status": "DATA_BLOCKED",
            "need": "at least two seasons of nflverse pbp",
            "found": [str(p) for _, p in seasons],
            "kill_line_stickiness_r": STICKINESS_KILL_R,
            "factor_kill_line": FACTOR_KILL_LINE,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
        }
        write_report(args.out, payload)
        print(json.dumps({"status": "DATA_BLOCKED", "out": str(args.out)}))
        return 1

    by_season_coach: dict[int, dict] = {}
    by_season_team: dict[int, dict] = {}
    metas = []
    for y, path in seasons:
        c, t, meta = load_go_rates(path, y)
        if c is None:
            metas.append(meta)
            continue
        by_season_coach[y] = c
        by_season_team[y] = t
        metas.append(meta)

    years = sorted(by_season_coach.keys())
    coach_corr = []
    team_corr = []
    for i in range(len(years) - 1):
        y0, y1 = years[i], years[i + 1]
        coach_corr.append(
            {"from": y0, "to": y1, **stickiness_pair(by_season_coach[y0], by_season_coach[y1], "coach")}
        )
        team_corr.append(
            {"from": y0, "to": y1, **stickiness_pair(by_season_team[y0], by_season_team[y1], "team")}
        )

    coach_rhos = [c["spearman"] for c in coach_corr if c.get("spearman") is not None]
    team_rhos = [c["spearman"] for c in team_corr if c.get("spearman") is not None]
    coach_mean_r = mean(coach_rhos) if coach_rhos else None
    team_mean_r = mean(team_rhos) if team_rhos else None

    # Kill: stickiness r < 0.20 → SPEC. Positive path if coach r >= 0.20.
    if coach_mean_r is None:
        kill_triggered = None
        status_factor = "INSUFFICIENT"
    else:
        kill_triggered = coach_mean_r < STICKINESS_KILL_R
        status_factor = "SPEC" if kill_triggered else "CANDIDATE"

    payload = {
        "instrument": "coach_go_rate_stickiness",
        "status": "ok",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "definitions": {
            "fourth_and_short": "down==4 AND 1 <= ydstogo <= 2",
            "eligible_play_type": sorted(ELIGIBLE),
            "go_play_type": sorted(GO),
            "rate": "go_attempts / eligible_attempts",
            "min_elig_per_key": 5,
            "coach": "home_coach if posteam==home_team else away_coach",
            "unit_team": "posteam",
        },
        "kill_line_stickiness_r": STICKINESS_KILL_R,
        "factor_kill_line": FACTOR_KILL_LINE,
        "seasons_loaded": years,
        "metas": metas,
        "coach_stickiness": coach_corr,
        "team_stickiness": team_corr,
        "coach_mean_spearman": coach_mean_r,
        "team_mean_spearman": team_mean_r,
        "kill_triggered": kill_triggered,
        "factor_status": status_factor,
        "positive_path_replacement": (
            "CANDIDATE coach-go-rate factor: early-down / 4th-short aggressiveness prior, "
            "joinable via nflverse home_coach/away_coach + schedules. Kill on wire: "
            + FACTOR_KILL_LINE
            if status_factor == "CANDIDATE"
            else "SPEC only — stickiness below kill line; do not feed the mint path."
        ),
        "attribution": "nflverse play-by-play, CC BY 4.0",
    }
    write_report(args.out, payload)
    print(
        json.dumps(
            {
                "instrument": "coach_go_rate_stickiness",
                "status": "ok",
                "seasons": years,
                "coach_mean_r": coach_mean_r,
                "team_mean_r": team_mean_r,
                "kill_triggered": kill_triggered,
                "factor_status": status_factor,
                "out": str(args.out),
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
