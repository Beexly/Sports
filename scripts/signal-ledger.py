"""One row per signal for every week-3 game.

A backup tackle is not a family. A backup back is not a family. Each charted
player is ingested. Only the ones whose status changed move a projection:
an offensive lineman moves the whole offense, and a starter back who is out
moves a share of his work to the next back. The share is larger when the
team actually runs and when the next back has been efficient. The game total
has to agree before that player is marked for the lineup.
"""
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
CHART = Path("/tmp/depth_charts_2026.csv")
STATS = Path("/tmp/player-stats/ps2026.csv")
CONTEXT = ROOT / "data" / "gse-dataset" / "current" / "week3-context.jsonl"
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"
READINGS = ROOT / "data" / "gse-dataset" / "current" / "week3-engine-readings.jsonl"
SIGNALS = ROOT / "data" / "gse-dataset" / "current" / "week3-signals.jsonl"
ADJUST = ROOT / "data" / "gse-dataset" / "current" / "week3-usage-adjustments.jsonl"
REPORT = ROOT / "docs" / "reasoning" / "week3-signal-ledger.md"

CHART_AS_OF = "2026-09-26T12:12:29Z"
WEEK = 3
CALIBRATION = ROOT / "data" / "gse-dataset" / "current" / "ol-drag-calibration.json"
INJURIES = ROOT / "data" / "gse-dataset" / "current" / "injuries_2026.csv"
SKILL = {"QB": 0.08, "RB": 0.05, "WR": 0.04, "TE": 0.03}
SCHEME_KEYS = ("shotgun_rate", "no_huddle_rate", "motion_rate", "play_action_rate", "rpo_rate", "screen_rate")


def norm(name):
    name = name.lower().replace(".", "").replace("'", "").replace("-", " ")
    name = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", "", name)
    return re.sub(r"\s+", " ", name).strip()


def num(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def load_line_rules():
    fitted = json.loads(CALIBRATION.read_text())
    multipliers = {name: row["multiplier"] for name, row in fitted["coefficients"].items()}
    game_status = {}
    practice = {}
    with INJURIES.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if int(row["week"]) != WEEK or row["game_type"] != "REG":
                continue
            key = (row["team"], row["gsis_id"])
            game_status[key] = row["report_status"]
            practice[key] = row["practice_status"]
    return multipliers, game_status, practice


def clip(value, low, high):
    return max(low, min(high, value))


def line_multiplier(players, multipliers, game_status, practice):
    starters = [player for player in players if player["pos"] in ("LT", "RT") and player["rank"] == 1]
    seen = set()
    unique = []
    for player in starters:
        if player["gsis_id"] in seen:
            continue
        seen.add(player["gsis_id"])
        unique.append(player)
    if not unique:
        return 1.0, "no starting tackle on the chart"
    states = [game_status.get((player["team"], player["gsis_id"]), "") for player in unique]
    practices = [practice.get((player["team"], player["gsis_id"]), "") for player in unique]
    if any(item in ("Out", "Doubtful") for item in states):
        return 1 + multipliers["tackle_out"], "starting tackle out"
    if any(item.startswith("Did Not") for item in practices):
        return 1 + multipliers["tackle_dnp"], "starting tackle did not practice"
    if any(item.startswith("Limited") for item in practices):
        return 1 + multipliers["tackle_limited"], "starting tackle limited"
    return 1.0, "starting tackles practiced in full"
    return max(low, min(high, value))


def load_chart():
    best = {}
    with CHART.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row["dt"] != CHART_AS_OF:
                continue
            key = (row["team"], row["gsis_id"], row["pos_abb"])
            rank = int(row["pos_rank"] or 99)
            current = best.get(key)
            if current is None or rank < current["rank"]:
                best[key] = {
                    "team": row["team"],
                    "gsis_id": row["gsis_id"],
                    "player": row["player_name"],
                    "pos": row["pos_abb"],
                    "pos_name": row["pos_name"],
                    "rank": rank,
                }
    by_team = defaultdict(list)
    for row in best.values():
        by_team[row["team"]].append(row)
    return by_team


def load_status(contexts):
    status = {}
    for game in contexts:
        for side in ("away", "home"):
            team = game[f"{side}_team"]
            injuries = game[side]["injuries"]
            for bucket, label in (("out", "OUT"), ("doubtful", "DOUBTFUL"), ("questionable", "QUESTIONABLE")):
                for item in injuries[bucket]:
                    player = item.split(" (")[0]
                    status[(team, norm(player))] = label
    return status


def load_usage():
    rush = defaultdict(lambda: [0.0, 0.0])
    team_rush = defaultdict(lambda: [0.0, 0.0])
    with STATS.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season_type", "REG") not in ("REG", ""):
                continue
            if int(num(row["week"])) >= 3:
                continue
            carries = num(row["carries"])
            attempts = num(row["attempts"])
            team_rush[row["team"]][0] += carries
            team_rush[row["team"]][1] += attempts
            if row["position"] != "RB":
                continue
            key = (row["team"], norm(row["player_display_name"]))
            rush[key][0] += carries
            rush[key][1] += num(row["rushing_yards"])
    return rush, team_rush


def run_rate(team_rush, team):
    carries, attempts = team_rush.get(team, (0.0, 0.0))
    if carries + attempts <= 0:
        return None
    return carries / (carries + attempts)


def ypc(rush, team, player):
    carries, yards = rush.get((team, norm(player)), (0.0, 0.0))
    if carries < 3:
        return None, carries
    return yards / carries, carries


def load_fantasy():
    points = defaultdict(float)
    games = defaultdict(int)
    targets = defaultdict(float)
    with STATS.open(newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season_type", "REG") not in ("REG", ""):
                continue
            if int(num(row["week"])) >= 3:
                continue
            key = (row["team"], norm(row["player_display_name"]))
            points[key] += num(row["fantasy_points"]) + 0.5 * num(row["receptions"])
            games[key] += 1
            targets[key] += num(row["targets"])
    means = {key: points[key] / games[key] for key in points if games[key]}
    return means, targets
    carries, yards = rush.get((team, norm(player)), (0.0, 0.0))
    if carries < 3:
        return None, carries
    return yards / carries, carries


def main():
    contexts = [json.loads(line) for line in CONTEXT.read_text().splitlines() if line.strip()]
    contexts = [game for game in contexts if game["settled"] is not True]
    chart = load_chart()
    status = load_status(contexts)
    line_rules, game_status, practice_status = load_line_rules()
    rush, team_rush = load_usage()
    fantasy, targets = load_fantasy()
    totals = {}
    for line in GAMES.read_text().splitlines():
        if not line.strip():
            continue
        game = json.loads(line)
        if game["season"] == 2026 and game["week"] == 3:
            totals[game["game_id"]] = game.get("total_line")
    live_totals = [totals[g["game_id"]] for g in contexts if isinstance(totals.get(g["game_id"]), (int, float))]
    median_total = sorted(live_totals)[len(live_totals) // 2]
    tilt = {}
    for line in READINGS.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row["tilt"] is None:
            continue
        tilt[row["home_team"]] = row["tilt"]
        tilt[row["away_team"]] = -row["tilt"]

    signals = []
    adjustments = []
    cascades = []
    per_game = {}

    for game in contexts:
        game_id = game["game_id"]
        count = 0
        total = totals.get(game_id)
        for side in ("away", "home"):
            team = game[f"{side}_team"]
            players = chart.get(team, [])
            by_pos = defaultdict(list)
            for player in players:
                by_pos[player["pos"]].append(player)
                state = status.get((team, norm(player["player"])), "ACTIVE")
                weight = SKILL.get(player["pos"], 0.005)
                mult = 1.0 if state in ("OUT", "DOUBTFUL") else 0.0
                points = -weight * mult
                flows = "offense" if player["pos"] in {"LT", "RT", "LG", "RG", "C"} or player["pos"] in SKILL else "roster"
                signals.append({
                    "game_id": game_id,
                    "team": team,
                    "signal": f"{team}.{player['pos']}.{player['rank']}.{norm(player['player']).replace(' ', '_')}",
                    "player": player["player"],
                    "pos": player["pos"],
                    "rank": player["rank"],
                    "status": state,
                    "weight": weight,
                    "points": round(points, 4),
                    "flows_to": flows,
                })
                count += 1
            scheme = game[side]["scheme_prior_weeks"]
            for key in SCHEME_KEYS:
                signals.append({
                    "game_id": game_id,
                    "team": team,
                    "signal": f"{team}.scheme.{key}",
                    "player": None,
                    "pos": "SCHEME",
                    "rank": None,
                    "status": "MEASURED",
                    "weight": 0.01,
                    "points": round(scheme.get(key) or 0.0, 4),
                    "flows_to": "scheme",
                })
                count += 1

            multiplier, reason = line_multiplier(players, line_rules, game_status, practice_status)
            adjustments.append({
                "kind": "ol",
                "game_id": game_id,
                "team": team,
                "multiplier": round(multiplier, 4),
                "drag": round(multiplier - 1, 4),
                "reason": reason,
            })

            def vacate(position, usage_of, scheme_mult):
                pool = [player for player in by_pos.get(position, []) if player["rank"] <= 4]
                pool.sort(key=lambda player: (-usage_of(player), player["rank"]))
                seen = set()
                ordered = []
                for player in pool:
                    if player["player"] in seen:
                        continue
                    seen.add(player["player"])
                    ordered.append(player)
                for index, missing in enumerate(ordered):
                    state = status.get((team, norm(missing["player"])), "ACTIVE")
                    if state not in ("OUT", "DOUBTFUL"):
                        continue
                    healthy = []
                    for candidate in ordered:
                        if candidate["player"] == missing["player"]:
                            continue
                        candidate_state = status.get((team, norm(candidate["player"])), "ACTIVE")
                        if candidate_state in ("ACTIVE", "QUESTIONABLE"):
                            healthy.append((candidate, candidate_state))
                    if not healthy:
                        continue
                    receiver, receiver_state = max(healthy, key=lambda item: usage_of(item[0]))
                    missing_mean = fantasy.get((team, norm(missing["player"])), 0.0)
                    if missing_mean <= 0:
                        continue
                    missing_ypc, missing_carries = ypc(rush, team, missing["player"])
                    receiver_ypc, receiver_carries = ypc(rush, team, receiver["player"])
                    if position == "RB" and missing_ypc and receiver_ypc:
                        raw = receiver_ypc / missing_ypc
                        ratio = (receiver_carries * raw + 8 * 0.85) / (receiver_carries + 8)
                    else:
                        ratio = 0.85
                    ratio = clip(ratio, 0.55, 1.15)
                    transfer = missing_mean * 0.62 * scheme_mult * ratio
                    if receiver_state == "QUESTIONABLE":
                        transfer *= 0.65
                    team_tilt = tilt.get(team, 0.0)
                    agrees = (
                        transfer >= 1.5
                        and isinstance(total, (int, float))
                        and total >= median_total
                        and team_tilt >= 0
                    )
                    applied = transfer if agrees else transfer * 0.4
                    cascades.append({
                        "kind": "usage",
                        "game_id": game_id,
                        "team": team,
                        "starter": missing["player"],
                        "starter_status": state,
                        "player": receiver["player"],
                        "work": round(transfer, 3),
                        "points": round(applied, 3),
                        "run_rate": None if rate is None else round(rate, 3),
                        "efficiency_ratio": round(ratio, 3),
                        "scheme_mult": round(scheme_mult, 3),
                        "total_line": total,
                        "median_total": median_total,
                        "team_edge": round(team_tilt, 4),
                        "agrees": agrees,
                        "position": position,
                    })

            rate = run_rate(team_rush, team)
            run_mult = 0.7 if rate is None else clip(0.7 + (rate - 0.40), 0.45, 1.0)
            pass_mult = 0.7 if rate is None else clip(0.7 + ((1 - rate) - 0.55), 0.45, 1.0)
            vacate("RB", lambda player: rush.get((team, norm(player["player"])), (0.0, 0.0))[0], run_mult)
            vacate("WR", lambda player: targets.get((team, norm(player["player"])), 0.0), pass_mult)
        per_game[game_id] = count

    combined = {}
    for row in cascades:
        key = (row["team"], norm(row["player"]))
        current = combined.get(key)
        if current is None:
            combined[key] = dict(row)
        else:
            current["points"] = round(current["points"] + row["points"], 3)
            current["starter"] = current["starter"] + ", " + row["starter"]
            current["agrees"] = current["agrees"] or row["agrees"]
    adjustments.extend(combined.values())
    ADJUST.write_text("".join(json.dumps(row) + "\n" for row in adjustments))
    counts = sorted(per_game.values())
    lines = [
        "# Signal ledger, week 3",
        "",
        "Every charted player is a signal. The offensive-line multiplier is the 2024-2025 fit, and the same file is what next week reads. A starting tackle who is out, or who did not practice, lowers the skill players. A questionable tag with a full practice does not.",
        "",
        f"Signals this week: {len(signals)}. Per game: {counts[0]} to {counts[-1]}. Median game total on the slate: {median_total}.",
        "",
        "The total is the posted number on the game file. No player prop price was on that file, so agreement is opportunity plus the total plus the team edge. A book prop is not invented.",
        "",
        "| team | out | status | next | work | applied | run rate | total | team edge | lineup |",
        "|---|---|---|---|---:|---:|---:|---:|---:|---|",
    ]
    for row in cascades:
        lines.append(
            f"| {row['team']} | {row['starter']} | {row['starter_status']} | {row['player']} | {row['work']:.2f} | {row['points']:.2f} | {row['run_rate']} | {row['total_line']} | {row['team_edge']:+.3f} | {row['agrees']} |"
        )
    drags = [row for row in adjustments if row["kind"] == "ol"]
    lines.extend(["", "## Offensive line", "", "The multiplier comes from 2024 and 2025, not from a 4 percent guess. A starting tackle who is out is -11.3 percent. One who did not practice is -7.5 percent. One who was limited is -5.0 percent. A full practice is no change. A backup guard is not in the fit.", "", "| team | multiplier | why |", "|---|---:|---|"])
    for row in sorted(drags, key=lambda item: item["drag"]):
        lines.append(f"| {row['team']} | {row['multiplier']:.3f} | {row['reason']} |")
    lines.append("")
    REPORT.write_text("\n".join(lines))
    print(json.dumps({
        "signals": len(signals),
        "per_game_min": counts[0],
        "per_game_max": counts[-1],
        "cascades": cascades,
        "ol_teams": len(drags),
    }, indent=2)[:2500])


if __name__ == "__main__":
    main()
