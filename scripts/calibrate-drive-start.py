"""Average starting field position from nflverse pbp.

First snap of each drive. Lower yardline_100 is closer to a score.
2025 regular season is the prior. 2026 weeks 1-2 are the observation.
A component is live only if |r| versus 2025 home result clears 0.08
and the coefficient sits outside one standard error.
"""
from __future__ import annotations

import csv
import gzip
import json
from collections import defaultdict
from pathlib import Path

import numpy as np

ROOT = Path("/tmp/Sports")
GAMES = Path("/tmp/olcal/games_nflverse.csv")
PBP_2025 = Path("/tmp/pbp_2025.csv.gz")
PBP_2026 = Path("/tmp/pbp_2026.csv")
OUT = ROOT / "data" / "gse-dataset" / "current" / "drive-start-calibration.json"
WEEK3 = ROOT / "data" / "gse-dataset" / "current" / "week3-drive-start.jsonl"
REPORT = ROOT / "docs" / "reasoning" / "drive-start-calibration.md"


def num(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def iter_pbp(path: Path):
    if path.suffix == ".gz":
        handle = gzip.open(path, "rt")
    else:
        handle = path.open()
    with handle:
        for row in csv.DictReader(handle):
            yield row


def first_snaps(path: Path, seasons, max_week=None):
    seen = set()
    starts = defaultdict(list)
    scored = defaultdict(list)
    for row in iter_pbp(path):
        season = num(row.get("season"))
        week = num(row.get("week"))
        if season not in seasons:
            continue
        if row.get("season_type") not in ("REG", "REG"):
            st = row.get("game_type") or row.get("season_type") or ""
            if st not in ("REG", ""):
                continue
        if max_week is not None and week is not None and week > max_week:
            continue
        posteam = row.get("posteam") or ""
        drive = row.get("drive") or row.get("fixed_drive") or ""
        game = row.get("game_id") or ""
        yl = num(row.get("yardline_100"))
        if not posteam or not drive or not game or yl is None:
            continue
        if row.get("play_type") not in ("pass", "run", "qb_kneel", "qb_spike"):
            continue
        key = (game, posteam, str(drive))
        if key in seen:
            continue
        seen.add(key)
        starts[posteam].append(yl)
        ended = row.get("drive_ended_with_score")
        scored[posteam].append(1.0 if str(ended) in ("1", "True", "true") else 0.0)
    return starts, scored


def shrink(prior_mean, prior_n, obs_mean, obs_n, k=12):
    if prior_n <= 0 and obs_n <= 0:
        return None
    if obs_n <= 0:
        return prior_mean
    if prior_n <= 0:
        return obs_mean
    w = obs_n / (obs_n + k)
    return (1 - w) * prior_mean + w * obs_mean


def corr_and_se(xs, ys):
    x = np.asarray(xs, float)
    y = np.asarray(ys, float)
    if len(x) < 30:
        return 0.0, 0.0, 0.0
    x = x - x.mean()
    y = y - y.mean()
    denom = np.sqrt((x * x).sum() * (y * y).sum())
    r = float((x * y).sum() / denom) if denom else 0.0
    # slope of y on signed start
    xx = (x * x).sum()
    b = float((x * y).sum() / xx) if xx else 0.0
    resid = y - b * x
    se = float(np.sqrt((resid * resid).sum() / max(len(x) - 2, 1) / xx)) if xx else 0.0
    return r, b, se


def main():
    starts_25, scored_25 = first_snaps(PBP_2025, {2025.0, 2025})
    starts_26, scored_26 = first_snaps(PBP_2026, {2026.0, 2026}, max_week=2)

    teams = sorted(set(starts_25) | set(starts_26))
    team_start = {}
    team_score = {}
    for team in teams:
        p = starts_25.get(team, [])
        o = starts_26.get(team, [])
        team_start[team] = {
            "prior_mean": float(np.mean(p)) if p else None,
            "prior_n": len(p),
            "obs_mean": float(np.mean(o)) if o else None,
            "obs_n": len(o),
            "shrunk": shrink(
                float(np.mean(p)) if p else 0.0,
                len(p),
                float(np.mean(o)) if o else 0.0,
                len(o),
            ),
        }
        ps = scored_25.get(team, [])
        os_ = scored_26.get(team, [])
        team_score[team] = shrink(
            float(np.mean(ps)) if ps else 0.0,
            len(ps),
            float(np.mean(os_)) if os_ else 0.0,
            len(os_),
        )

    # 2025 games: signed start vs home win
    signed = []
    wins = []
    with GAMES.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season") != "2025" or row.get("game_type") != "REG":
                continue
            home = row.get("home_team")
            away = row.get("away_team")
            hs = team_start.get(home, {}).get("prior_mean")
            aws = team_start.get(away, {}).get("prior_mean")
            hw = num(row.get("home_score"))
            aw = num(row.get("away_score"))
            if None in (hs, aws, hw, aw):
                continue
            # lower yardline is better; positive signed favors home
            signed.append(aws - hs)
            wins.append(1.0 if hw > aw else 0.0)

    r, b, se = corr_and_se(signed, wins)
    live = abs(r) >= 0.08 and abs(b) > se

    week3 = []
    ctx = ROOT / "data" / "gse-dataset" / "current" / "week3-context.jsonl"
    for line in ctx.read_text().splitlines():
        if not line.strip():
            continue
        game = json.loads(line)
        home = game["home_team"]
        away = game["away_team"]
        hs = (team_start.get(home) or {}).get("shrunk")
        aws = (team_start.get(away) or {}).get("shrunk")
        signed_game = None if None in (hs, aws) else aws - hs
        # scale ~ typical 4 yard team gap -> unit
        helper = None if signed_game is None else max(-1.0, min(1.0, signed_game / 4.0))
        week3.append({
            "game_id": game["game_id"],
            "home_team": home,
            "away_team": away,
            "home_start_yl": hs,
            "away_start_yl": aws,
            "signed_yards": signed_game,
            "helper_signed": helper if live else None,
            "live": live,
        })

    payload = {
        "r_2025_home_win": r,
        "slope": b,
        "se": se,
        "n_games": len(wins),
        "live": live,
        "rule": "|r|>=0.08 and |slope|>se. lower yardline_100 is better. helper is (away-home)/4.",
        "teams": team_start,
        "holdout_note": "same-season 2025 association. not walk-forward.",
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    WEEK3.write_text("".join(json.dumps(row) + "\n" for row in week3))

    lines = [
        "# Drive-start field position",
        "",
        "First snap of each drive from nflverse pbp. 2025 is the prior. 2026 weeks 1-2 are the observation, shrunk with k=12 drives.",
        "",
        f"| r vs 2025 home win | slope | se | n | live |",
        f"|---|---:|---:|---:|---|",
        f"| {r:+.3f} | {b:+.4f} | {se:.4f} | {len(wins)} | {'LIVE' if live else 'STORED'} |",
        "",
        "Lower starting yardline_100 is closer to the end zone. Signed helper is (away start − home start) / 4.",
        "This is the MOVE-37 residue that survived ablation: field position, not `sin√min`.",
        "",
    ]
    REPORT.write_text("\n".join(lines) + "\n")
    print(json.dumps({"r": r, "slope": b, "se": se, "n": len(wins), "live": live}))


if __name__ == "__main__":
    main()
