"""Opponent-adjusted pass/rush split for week 3.

The reverse-engineering gap list ranks this first: Elo adjusts for opponent
through the score, and it does not adjust efficiency. 2025 is the prior.
2026 weeks 1 and 2 are the observation. Week 3 is not an input.
Passing gets more of the blend than rushing, because that is the documented
split. Shrinkage pulls a two-game sample back toward the 2025 prior.
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
OUT = ROOT / "data" / "gse-dataset" / "current" / "week3-split-efficiency.jsonl"
PRIOR_PATH = Path("/tmp/team-stats/tw2025.csv")
LIVE_PATH = Path("/tmp/team-stats/tw2026.csv")
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"

PASS_ATTEMPT_PRIOR = 80.0
RUSH_CARRY_PRIOR = 40.0


def num(value):
    try:
        out = float(value)
    except (TypeError, ValueError):
        return 0.0
    return out if out == out else 0.0


def rows(path):
    with open(path, newline="") as handle:
        return [row for row in csv.DictReader(handle) if row["season_type"] == "REG"]


def clip(value):
    if value > 1:
        return 1.0
    if value < -1:
        return -1.0
    return value


def add(bucket, team, **fields):
    slot = bucket[team]
    for key, value in fields.items():
        slot[key] += value


def season_rates(table):
    off = defaultdict(lambda: defaultdict(float))
    defense = defaultdict(lambda: defaultdict(float))
    for row in table:
        team = row["team"]
        opp = row["opponent_team"]
        attempts = num(row["attempts"])
        carries = num(row["carries"])
        add(off, team,
            attempts=attempts, carries=carries,
            pass_epa=num(row["passing_epa"]), rush_epa=num(row["rushing_epa"]),
            cpoe=num(row["passing_cpoe"]), pass20=num(row["passing_20"]),
            rush10=num(row["rushing_10"]), ints=num(row["passing_interceptions"]))
        add(defense, opp,
            attempts=attempts, carries=carries,
            pass_epa=num(row["passing_epa"]), rush_epa=num(row["rushing_epa"]))
    return off, defense


def rate(part, num_key, den_key):
    den = part[den_key]
    if den <= 0:
        return 0.0
    return part[num_key] / den


prior_rows = rows(PRIOR_PATH)
live_rows = [row for row in rows(LIVE_PATH) if int(row["week"]) < 3]
prior_off, prior_def = season_rates(prior_rows)
live_off, _live_def = season_rates(live_rows)
league_ints = rate(
    {key: sum(team[key] for team in prior_off.values()) for key in ("ints", "attempts")},
    "ints", "attempts",
)


def adjusted(off_table, def_lookup):
    """Attempt-weighted mean of (own rate − opponent's prior defensive rate)."""
    out = {}
    # Rebuild from games so the opponent is the one in that row.
    return out


def residuals(table, def_pass, def_rush):
    acc = defaultdict(lambda: defaultdict(float))
    for row in table:
        team = row["team"]
        opp = row["opponent_team"]
        attempts = num(row["attempts"])
        carries = num(row["carries"])
        if attempts > 0:
            own = num(row["passing_epa"]) / attempts
            acc[team]["pass_num"] += attempts * (own - def_pass.get(opp, 0.0))
            acc[team]["pass_den"] += attempts
            acc[team]["cpoe_num"] += num(row["passing_cpoe"])
            acc[team]["exp_num"] += num(row["passing_20"])
            acc[team]["int_num"] += num(row["passing_interceptions"]) - attempts * league_ints
        if carries > 0:
            own = num(row["rushing_epa"]) / carries
            acc[team]["rush_num"] += carries * (own - def_rush.get(opp, 0.0))
            acc[team]["rush_den"] += carries
            acc[team]["rush10_num"] += num(row["rushing_10"])
    built = {}
    for team, part in acc.items():
        built[team] = {
            "pass": part["pass_num"] / part["pass_den"] if part["pass_den"] else 0.0,
            "rush": part["rush_num"] / part["rush_den"] if part["rush_den"] else 0.0,
            "cpoe": part["cpoe_num"] / part["pass_den"] if part["pass_den"] else 0.0,
            "explosive": (part["exp_num"] / part["pass_den"] if part["pass_den"] else 0.0),
            "int_luck": part["int_num"] / part["pass_den"] if part["pass_den"] else 0.0,
            "attempts": part["pass_den"],
            "carries": part["rush_den"],
        }
    return built


def_pass_2025 = {team: rate(part, "pass_epa", "attempts") for team, part in prior_def.items()}
def_rush_2025 = {team: rate(part, "rush_epa", "carries") for team, part in prior_def.items()}
prior = residuals(prior_rows, def_pass_2025, def_rush_2025)
# 2026 opponent is judged by the 2025 defense, which does not include 2026.
live = residuals(live_rows, def_pass_2025, def_rush_2025)


def shrink(observed, obs_n, prior_value, prior_n):
    den = obs_n + prior_n
    if den <= 0:
        return 0.0
    return (obs_n * observed + prior_n * prior_value) / den


def team_block(team):
    obs = live.get(team, {"pass": 0, "rush": 0, "cpoe": 0, "explosive": 0, "int_luck": 0, "attempts": 0, "carries": 0})
    base = prior.get(team, {"pass": 0, "rush": 0, "cpoe": 0, "explosive": 0, "int_luck": 0})
    return {
        "pass": shrink(obs["pass"], obs["attempts"], base["pass"], PASS_ATTEMPT_PRIOR),
        "rush": shrink(obs["rush"], obs["carries"], base["rush"], RUSH_CARRY_PRIOR),
        "cpoe": shrink(obs["cpoe"], obs["attempts"], 0.0, PASS_ATTEMPT_PRIOR),
        "explosive": shrink(obs["explosive"], obs["attempts"], base["explosive"], PASS_ATTEMPT_PRIOR),
        "int_luck": shrink(obs["int_luck"], obs["attempts"], 0.0, PASS_ATTEMPT_PRIOR),
        "attempts_2026": obs["attempts"],
        "pass_prior_2025": base["pass"],
    }


def signed(home, away):
    raw = {key: home[key] - away[key] for key in home}
    scale = {"pass": 0.45, "rush": 0.30, "cpoe": 0.12, "explosive": 0.08, "int_luck": 0.06}
    return {
        "pass": clip(raw["pass"] / scale["pass"]),
        "rush": clip(raw["rush"] / scale["rush"]),
        "cpoe": clip(raw["cpoe"] / scale["cpoe"]),
        "explosive": clip(raw["explosive"] / scale["explosive"]),
        "turnover": clip(-(raw["int_luck"]) / scale["int_luck"]),
        "raw_pass": raw["pass"],
        "raw_cpoe": raw["cpoe"],
    }


games = [json.loads(line) for line in GAMES.read_text().splitlines() if line.strip()]
week3 = [game for game in games if game["season"] == 2026 and game["week"] == 3]
out_rows = []
for game in sorted(week3, key=lambda item: item["game_id"]):
    home = team_block(game["home_team"])
    away = team_block(game["away_team"])
    parts = signed(
        {key: home[key] for key in ("pass", "rush", "cpoe", "explosive", "int_luck")},
        {key: away[key] for key in ("pass", "rush", "cpoe", "explosive", "int_luck")},
    )
    blend = clip(
        0.55 * parts["pass"]
        + 0.15 * parts["rush"]
        + 0.15 * parts["cpoe"]
        + 0.10 * parts["explosive"]
        + 0.05 * parts["turnover"]
    )
    out_rows.append({
        "game_id": game["game_id"],
        "home_team": game["home_team"],
        "away_team": game["away_team"],
        "efficiency_signed": blend,
        "parts": parts,
        "home_pass": home["pass"],
        "away_pass": away["pass"],
        "home_attempts_2026": home["attempts_2026"],
        "method": "2025 opponent-adjusted prior, 2026 weeks 1-2 observation, shrink 80 pass attempts / 40 carries",
    })

OUT.write_text("".join(json.dumps(row) + "\n" for row in out_rows))
sample = next(row for row in out_rows if row["game_id"] == "2026_03_LAC_BUF")
print(json.dumps({"games": len(out_rows), "sample": sample}, indent=2))
