"""Join the current nflverse files onto every week-3 game.

Uses only information dated before that game. Week 3's own result is not an input.
Play drawings are not in these files. The charting flags are.
"""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
OUT_DIR = ROOT / "data" / "gse-dataset" / "current"
PBP = Path("/tmp/pbp_2026.csv")
FTN = Path("/workspace/ftn_charting_2026.csv")
DEPTH = Path("/workspace/depth_charts_2026.csv")
INJ = Path("/workspace/injuries_2026.csv")
ROSTER = Path("/workspace/roster_weekly_2026.csv")
STATS = Path("/workspace/stats_team_week_2026.csv")
SNAPS = Path("/workspace/snap_counts_2026.csv")
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"


def rows(path):
    with open(path, newline="") as handle:
        return list(csv.DictReader(handle))


def truthy(value):
    return str(value).strip().lower() in {"true", "1", "t"}


def rate(flags):
    if not flags:
        return None
    return sum(1 for flag in flags if flag) / len(flags)


games = [json.loads(line) for line in GAMES.read_text().splitlines() if line.strip()]
week3 = [game for game in games if game["season"] == 2026 and game["week"] == 3]

# Coaches and play calls from play-by-play. One coach pair per game.
plays_by_game = defaultdict(list)
coaches = {}
for row in rows(PBP):
    game_id = row["game_id"]
    coaches[game_id] = {
        "week": int(row["week"]),
        "home_team": row["home_team"],
        "away_team": row["away_team"],
        "home_coach": row["home_coach"],
        "away_coach": row["away_coach"],
    }
    if not row.get("posteam"):
        continue
    plays_by_game[game_id].append(row)

chart_by_play = {}
for row in rows(FTN):
    chart_by_play[(row["nflverse_game_id"], row["nflverse_play_id"])] = row

# Latest depth-chart snapshot on or before 2026-09-26. Sunday is the 27th.
depth_rows = rows(DEPTH)
latest_dt = max(row["dt"] for row in depth_rows if row["dt"][:10] <= "2026-09-26")
qb = {}
for row in depth_rows:
    if row["dt"] != latest_dt or row["pos_abb"] != "QB" or row["pos_rank"] != "1":
        continue
    qb[row["team"]] = row["player_name"]

active = defaultdict(int)
for row in rows(ROSTER):
    if row["week"] == "3" and row["status"] == "ACT":
        active[row["team"]] += 1

injuries = defaultdict(lambda: {"out": [], "doubtful": [], "questionable": []})
for row in rows(INJ):
    if row["week"] != "3":
        continue
    status = (row["report_status"] or "").strip()
    key = {"Out": "out", "Doubtful": "doubtful", "Questionable": "questionable"}.get(status)
    if key is None:
        continue
    injuries[row["team"]][key].append(f"{row['full_name']} ({row['position']}, {row['report_primary_injury'] or 'unspecified'})")

stats = defaultdict(lambda: {"attempts": 0.0, "epa": 0.0, "weeks": set()})
for row in rows(STATS):
    week = int(row["week"])
    if week >= 3:
        continue
    attempts = float(row["attempts"] or 0)
    epa = float(row["passing_epa"] or 0)
    stats[row["team"]]["attempts"] += attempts
    stats[row["team"]]["epa"] += epa
    stats[row["team"]]["weeks"].add(week)

snaps = defaultdict(list)
for row in rows(SNAPS):
    if int(row["week"]) >= 3 or row["position"] != "QB":
        continue
    snaps[row["team"]].append((row["player"], float(row["offense_pct"] or 0), int(row["week"])))


def last_coach(team, before_week):
    found = None
    for game_id, info in coaches.items():
        if info["week"] >= before_week:
            continue
        if info["home_team"] == team:
            candidate = (info["week"], info["home_coach"], game_id)
        elif info["away_team"] == team:
            candidate = (info["week"], info["away_coach"], game_id)
        else:
            continue
        if found is None or candidate[0] > found[0]:
            found = candidate
    return found


def scheme(team, before_week):
    motion, action, rpo, screen, shotgun, huddle, charted = [], [], [], [], [], [], 0
    for game_id, plays in plays_by_game.items():
        info = coaches[game_id]
        if info["week"] >= before_week:
            continue
        if team not in (info["home_team"], info["away_team"]):
            continue
        for play in plays:
            if play["posteam"] != team:
                continue
            shotgun.append(truthy(play.get("shotgun")))
            huddle.append(truthy(play.get("no_huddle")))
            chart = chart_by_play.get((game_id, play["play_id"]))
            if chart is None:
                continue
            charted += 1
            motion.append(truthy(chart["is_motion"]))
            action.append(truthy(chart["is_play_action"]))
            rpo.append(truthy(chart["is_rpo"]))
            screen.append(truthy(chart["is_screen_pass"]))
    return {
        "offensive_plays": len(shotgun),
        "charted_plays": charted,
        "shotgun_rate": rate(shotgun),
        "no_huddle_rate": rate(huddle),
        "motion_rate": rate(motion),
        "play_action_rate": rate(action),
        "rpo_rate": rate(rpo),
        "screen_rate": rate(screen),
    }


def side(team, before_week):
    coach = last_coach(team, before_week)
    team_stats = stats[team]
    attempts = team_stats["attempts"]
    qb_snaps = sorted(snaps[team], key=lambda item: (-item[1], item[2]))
    return {
        "coach": None if coach is None else coach[1],
        "coach_last_seen_week": None if coach is None else coach[0],
        "quarterback": qb.get(team),
        "quarterback_as_of": latest_dt,
        "active_roster": active[team],
        "qb_snap_leader_prior_weeks": None if not qb_snaps else {
            "player": qb_snaps[0][0],
            "offense_pct": qb_snaps[0][1],
            "week": qb_snaps[0][2],
        },
        "passing_epa_per_attempt_prior_weeks": None if attempts <= 0 else team_stats["epa"] / attempts,
        "pass_attempts_prior_weeks": attempts,
        "injuries": injuries[team],
        "scheme_prior_weeks": scheme(team, before_week),
    }


contexts = []
for game in sorted(week3, key=lambda item: (item["gameday"], item["game_id"])):
    contexts.append({
        "game_id": game["game_id"],
        "season": game["season"],
        "week": game["week"],
        "gameday": game["gameday"],
        "away_team": game["away_team"],
        "home_team": game["home_team"],
        "settled": game["settled"],
        "depth_chart_as_of": latest_dt,
        "lookahead": "none — coaches, snaps, charting, and team stats are from weeks before this game",
        "away": side(game["away_team"], game["week"]),
        "home": side(game["home_team"], game["week"]),
    })

OUT_DIR.mkdir(parents=True, exist_ok=True)
(OUT_DIR / "week3-context.jsonl").write_text("".join(json.dumps(row) + "\n" for row in contexts))


def pct(value):
    return "n/a" if value is None else f"{value:.1%}"


def epa(value):
    return "n/a" if value is None else f"{value:.3f}"


def injury_line(block):
    parts = []
    for key in ("out", "doubtful", "questionable"):
        names = block[key]
        if names:
            parts.append(f"{key} {len(names)}: " + "; ".join(names))
    return "none listed" if not parts else " | ".join(parts)


lines = [
    "# Week 3 current wire",
    "",
    f"Depth chart snapshot {latest_dt}. Roster, injury report, coaches, snap counts, team passing EPA, and charted play-calls are joined onto each week-3 game.",
    "Nothing in a row uses that game's result. Charting is motion, play-action, RPO, and screen flags. It is not a drawn playbook.",
    "",
]
for row in contexts:
    lines.append(f"## {row['away_team']} at {row['home_team']} ({row['gameday']})")
    lines.append("")
    for label, block in (("Away", row["away"]), ("Home", row["home"])):
        scheme_block = block["scheme_prior_weeks"]
        leader = block["qb_snap_leader_prior_weeks"]
        leader_text = "none" if leader is None else f"{leader['player']} {leader['offense_pct']:.0%} week {leader['week']}"
        lines.append(
            f"- {label}: coach {block['coach']} (last seen week {block['coach_last_seen_week']}). "
            f"QB {block['quarterback']}. Active roster {block['active_roster']}. "
            f"Prior snap leader {leader_text}. "
            f"Passing EPA/attempt {epa(block['passing_epa_per_attempt_prior_weeks'])} on {block['pass_attempts_prior_weeks']:.0f} attempts."
        )
        lines.append(
            f"  Scheme on {scheme_block['offensive_plays']} prior offensive plays "
            f"({scheme_block['charted_plays']} charted): "
            f"shotgun {pct(scheme_block['shotgun_rate'])}, "
            f"no-huddle {pct(scheme_block['no_huddle_rate'])}, "
            f"motion {pct(scheme_block['motion_rate'])}, "
            f"play-action {pct(scheme_block['play_action_rate'])}, "
            f"RPO {pct(scheme_block['rpo_rate'])}, "
            f"screen {pct(scheme_block['screen_rate'])}."
        )
        lines.append(f"  Injuries: {injury_line(block['injuries'])}")
    lines.append("")

doc = ROOT / "docs" / "reasoning" / "week3-current-wire.md"
doc.write_text("\n".join(lines))
print(json.dumps({
    "games": len(contexts),
    "depth_as_of": latest_dt,
    "sample": {
        "game": contexts[1]["game_id"] if len(contexts) > 1 else contexts[0]["game_id"],
        "home_qb": contexts[1]["home"]["quarterback"] if len(contexts) > 1 else None,
        "home_coach": contexts[1]["home"]["coach"] if len(contexts) > 1 else None,
        "charted": contexts[1]["home"]["scheme_prior_weeks"]["charted_plays"] if len(contexts) > 1 else None,
    },
}, indent=2))
