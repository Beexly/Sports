"""Fit how an offensive-line absence changes the points that team scores.

2024 uses the weekly depth chart. 2025 uses the last chart snapshot before
kickoff. The injury file supplies Out, Doubtful, and Questionable. Each
team's own healthy games are the baseline, and the opponent's usual points
allowed is removed. The coefficient is points. The engine stores points
divided by the mean score, which is the multiplier.
"""
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

ROOT = Path("/tmp/Sports")
OUT = ROOT / "data" / "gse-dataset" / "current" / "ol-drag-calibration.json"
REPORT = ROOT / "docs" / "reasoning" / "ol-drag-calibration.md"
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"

POSITIONS = ("LT", "RT", "LG", "RG", "C")
TACKLES = ("LT", "RT")
INTERIOR = ("LG", "RG", "C")


def load_games():
    rows = []
    with GAMES.open() as handle:
        for line in handle:
            if not line.strip():
                continue
            game = json.loads(line)
            if game.get("season_phase", game.get("game_type")) not in (None, "REG") and game.get("game_type") != "REG":
                continue
            if game.get("game_type") not in (None, "REG"):
                continue
            if not game.get("settled"):
                continue
            if game["season"] not in (2024, 2025):
                continue
            rows.append(game)
    return rows


def load_injuries():
    status = {}
    practice = {}
    for season in (2024, 2025):
        path = Path(f"/tmp/olcal/injuries_{season}.csv")
        with path.open(newline="") as handle:
            for row in csv.DictReader(handle):
                if row["game_type"] != "REG":
                    continue
                key = (int(row["season"]), int(row["week"]), row["team"], row["gsis_id"])
                if row["report_status"]:
                    status[key] = row["report_status"]
                if row["practice_status"]:
                    practice[key] = row["practice_status"]
    return status, practice


def load_depth_2024():
    chart = defaultdict(dict)
    with Path("/tmp/olcal/depth_2024.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row["game_type"] != "REG":
                continue
            pos = row["depth_position"]
            if pos not in POSITIONS:
                continue
            rank = int(row["depth_team"])
            if rank > 2:
                continue
            key = (int(row["season"]), int(row["week"]), row["club_code"])
            chart[key][(pos, rank)] = row["gsis_id"]
    return chart


def load_depth_2025(games):
    kickoff = {}
    for game in games:
        if game["season"] != 2025:
            continue
        day = game["gameday"]
        kickoff[(game["week"], game["home_team"])] = day
        kickoff[(game["week"], game["away_team"])] = day
    by_team = defaultdict(list)
    for (week, team), gameday in kickoff.items():
        by_team[team].append((week, gameday))
    best_dt = {}
    with Path("/tmp/olcal/depth_2025.csv").open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row["pos_abb"] not in POSITIONS:
                continue
            rank = int(row["pos_rank"] or 99)
            if rank > 2:
                continue
            day = row["dt"][:10]
            for week, gameday in by_team.get(row["team"], ()):
                if day > gameday:
                    continue
                slot = (week, row["team"], row["pos_abb"], rank)
                current = best_dt.get(slot)
                if current is None or row["dt"] > current[0]:
                    best_dt[slot] = (row["dt"], row["gsis_id"])
    chart = defaultdict(dict)
    for (week, team, pos, rank), (_dt, gsis) in best_dt.items():
        chart[(2025, week, team)][(pos, rank)] = gsis
    return chart


def state_of(status, season, week, team, gsis):
    if not gsis:
        return "ACTIVE"
    return {"Out": "OUT", "Doubtful": "DOUBTFUL", "Questionable": "QUESTIONABLE"}.get(
        status.get((season, week, team, gsis), ""), "ACTIVE"
    )


def practice_of(practice, season, week, team, gsis):
    if not gsis:
        return "FULL"
    raw = practice.get((season, week, team, gsis), "")
    if raw.startswith("Did Not"):
        return "DNP"
    if raw.startswith("Limited"):
        return "LIMITED"
    return "FULL"


def main():
    games = load_games()
    status, practice = load_injuries()
    chart = load_depth_2024()
    chart.update(load_depth_2025(games))
    allowed = defaultdict(list)
    scored = {}
    for game in games:
        for team, opp, points, allowed_points in (
            (game["home_team"], game["away_team"], game["home_score"], game["away_score"]),
            (game["away_team"], game["home_team"], game["away_score"], game["home_score"]),
        ):
            scored[(game["season"], game["week"], team)] = (points, opp, game["week"])
            allowed[(game["season"], opp)].append((game["week"], points))

    samples = []
    for (season, week, team), (points, opp, _week) in scored.items():
        lineup = chart.get((season, week, team))
        if not lineup or ("LT", 1) not in lineup or ("RT", 1) not in lineup:
            continue
        baseline = [value for played, value in allowed[(season, opp)] if played != week]
        if not baseline:
            continue
        opp_mean = sum(baseline) / len(baseline)
        features = {name: 0 for name in (
            "tackle_out", "tackle_dnp", "tackle_limited", "interior_out", "backup_tackle_out",
        )}
        starter_states = [state_of(status, season, week, team, lineup.get((pos, 1))) for pos in TACKLES]
        starter_practice = [practice_of(practice, season, week, team, lineup.get((pos, 1))) for pos in TACKLES]
        if any(item in ("OUT", "DOUBTFUL") for item in starter_states):
            features["tackle_out"] = 1
        elif any(item == "DNP" for item in starter_practice):
            features["tackle_dnp"] = 1
        elif any(item == "LIMITED" for item in starter_practice):
            features["tackle_limited"] = 1
        else:
            backup_states = [state_of(status, season, week, team, lineup.get((pos, 2))) for pos in TACKLES]
            if any(item in ("OUT", "DOUBTFUL") for item in backup_states):
                features["backup_tackle_out"] = 1
        for pos in INTERIOR:
            if state_of(status, season, week, team, lineup.get((pos, 1))) == "OUT":
                features["interior_out"] = 1
        samples.append({
            "season": season,
            "week": week,
            "team": team,
            "y": points - opp_mean,
            "points": points,
            **features,
        })

    teams = sorted({row["team"] for row in samples})
    team_index = {team: index for index, team in enumerate(teams)}
    names = ["tackle_out", "tackle_dnp", "tackle_limited", "interior_out", "backup_tackle_out"]
    y = np.array([row["y"] for row in samples], dtype=float)
    x = np.array([[row[name] for name in names] for row in samples], dtype=float)
    team_ids = np.array([team_index[row["team"]] for row in samples])
    # Demean within team so a bad offense is not credited to its injuries.
    for index in range(len(teams)):
        mask = team_ids == index
        y[mask] -= y[mask].mean()
        x[mask] -= x[mask].mean(axis=0)
    beta, *_ = np.linalg.lstsq(x, y, rcond=None)
    fitted = x @ beta
    residual = y - fitted
    dof = max(len(y) - len(names) - len(teams), 1)
    sigma2 = float(residual @ residual) / dof
    xtx_inv = np.linalg.pinv(x.T @ x)
    se = np.sqrt(np.clip(np.diag(xtx_inv) * sigma2, 0, None))
    mean_points = float(np.mean([row["points"] for row in samples]))
    counts = {name: int(sum(row[name] for row in samples)) for name in names}
    # A tackle is not worth more than a touchdown. Pull a noisy coefficient
    # toward zero by that much, and no further.
    prior_points = 7.0
    coefficients = {}
    for name, b, s in zip(names, beta, se):
        shrink = (prior_points ** 2) / (prior_points ** 2 + float(s) ** 2)
        shrunk = float(b) * shrink
        # A positive sign would raise the offense because a lineman is hurt.
        # That is not a result this sample can support. Noise inside one
        # standard error stays at zero.
        if shrunk >= 0 or abs(float(b)) <= float(s):
            used = 0.0
        else:
            used = shrunk
        coefficients[name] = {
            "games": counts[name],
            "points": round(float(b), 3),
            "se": round(float(s), 3),
            "shrunk_points": round(shrunk, 3),
            "used_points": round(used, 3),
            "multiplier": round(used / mean_points, 4),
        }
    result = {
        "seasons": [2024, 2025],
        "team_weeks": len(samples),
        "mean_points": round(mean_points, 3),
        "prior_points": prior_points,
        "coefficients": coefficients,
        "note": "multiplier is shrunk points divided by the mean score. The next week reads this file.",
    }
    OUT.write_text(json.dumps(result, indent=2) + "\n")
    lines = [
        "# Offensive line drag, fitted",
        "",
        f"{len(samples)} team-weeks in 2024 and 2025. The outcome is points scored minus what that opponent usually allows. Each team is compared with itself. A coefficient noisier than 7 points is pulled toward zero.",
        "",
        "| absence | games | points | se | used points | multiplier |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for name in names:
        row = coefficients[name]
        lines.append(
            f"| {name} | {row['games']} | {row['points']:+.2f} | {row['se']:.2f} | {row['used_points']:+.2f} | {row['multiplier']:+.4f} |"
        )
    lines.append("")
    lines.append("Doubtful is pooled with out. A questionable tag is not the input. The input is whether the starting tackle practiced. A coefficient inside one standard error, or a positive one, is stored as zero. The next week reads this file.")
    lines.append("")
    REPORT.write_text("\n".join(lines))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
