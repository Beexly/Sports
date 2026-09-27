"""One projection, three surfaces.

Fantasy, the week-3 game reading, and the lineup solver share one number.
Salaries are pulled from the public weekly slate pages. Their projections
are ignored. Thursday's finished game is left out. A player listed out is
left out. The lineup is cap-feasible. It is not a sportsbook pick.
"""
import csv
import html
import itertools
import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
DK_HTML = Path("/tmp/dk-slate.html")
FD_HTML = Path("/tmp/dff-fd.html")
PLAYERS_2025 = Path("/tmp/player-stats/ps2025.csv")
PLAYERS_2026 = Path("/tmp/player-stats/ps2026.csv")
TEAM_2025 = Path("/tmp/team-stats/tw2025.csv")
TEAM_2026 = Path("/tmp/team-stats/tw2026.csv")
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"
READINGS = ROOT / "data" / "gse-dataset" / "current" / "week3-engine-readings.jsonl"
CONTEXT = ROOT / "data" / "gse-dataset" / "current" / "week3-context.jsonl"
OUT = ROOT / "data" / "gse-dataset" / "current" / "week3-connected-slate.jsonl"
REPORT = ROOT / "docs" / "reasoning" / "week3-connected-slate.md"

PRIOR_GAMES = 4.0
TILT_SCALE = 0.08
TEAM_ALIAS = {"JAC": "JAX", "JAX": "JAX", "WSH": "WAS", "WAS": "WAS", "LAR": "LA", "LA": "LA"}


def num(value):
    try:
        out = float(value)
    except (TypeError, ValueError):
        return 0.0
    return out if out == out else 0.0


def canon_team(team):
    team = (team or "").upper()
    return TEAM_ALIAS.get(team, team)


def decode_name(name):
    name = html.unescape(name)
    return name.replace("\\u0027", "'").replace("\\u0026", "&").replace("\\/", "/").strip()


def norm_name(name):
    name = decode_name(name).lower().replace(".", "").replace("'", "").replace("-", " ")
    name = re.sub(r"\b(jr|sr|ii|iii|iv|v)\b", "", name)
    return re.sub(r"\s+", " ", name).strip()


def half_ppr(row):
    return num(row["fantasy_points"]) + 0.5 * num(row["receptions"])


def load_player_means(path, week_max):
    games = defaultdict(list)
    meta = {}
    with open(path, newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season_type", "REG") not in ("REG", ""):
                continue
            week = int(num(row["week"]))
            if week_max is not None and week >= week_max:
                continue
            if row["position"] not in ("QB", "RB", "WR", "TE"):
                continue
            key = (norm_name(row["player_display_name"]), canon_team(row["team"]))
            games[key].append(half_ppr(row))
            meta[key] = row["position"]
    means = {key: (sum(vals) / len(vals), len(vals), meta[key]) for key, vals in games.items()}
    return means


def project_player(key, live, prior, position_prior):
    if key in live and key in prior:
        obs, n, pos = live[key]
        base, _pn, _p = prior[key]
        return (n * obs + PRIOR_GAMES * base) / (n + PRIOR_GAMES), n, pos, "player-prior"
    if key in live:
        obs, n, pos = live[key]
        base = position_prior.get(pos, obs)
        return (n * obs + PRIOR_GAMES * base) / (n + PRIOR_GAMES), n, pos, "position-prior"
    if key in prior:
        base, _pn, pos = prior[key]
        return base, 0, pos, "prior-only"
    return None


def dk_points_allowed(points):
    if points <= 0:
        return 10
    if points <= 6:
        return 7
    if points <= 13:
        return 4
    if points <= 20:
        return 1
    if points <= 27:
        return 0
    if points <= 34:
        return -1
    return -4


def load_dst():
    games = {}
    for line in GAMES.read_text().splitlines():
        if not line.strip():
            continue
        game = json.loads(line)
        if game["season"] not in (2025, 2026) or game["home_score"] is None:
            continue
        games[(game["season"], game["week"], game["home_team"])] = num(game["away_score"])
        games[(game["season"], game["week"], game["away_team"])] = num(game["home_score"])
    per_team = defaultdict(list)
    for path, season, week_max in ((TEAM_2025, 2025, None), (TEAM_2026, 2026, 3)):
        with open(path, newline="") as handle:
            for row in csv.DictReader(handle):
                if row["season_type"] != "REG":
                    continue
                week = int(num(row["week"]))
                if week_max is not None and week >= week_max:
                    continue
                allowed = games.get((season, week, row["team"]))
                if allowed is None:
                    continue
                score = (
                    dk_points_allowed(allowed)
                    + num(row["def_sacks"])
                    + 2 * num(row["def_interceptions"])
                    + 2 * num(row["fumble_recovery_opp"])
                    + 6 * num(row["def_tds"])
                    + 2 * num(row["def_safeties"])
                )
                per_team[canon_team(row["team"])].append((season, score))
    out = {}
    for team, rows in per_team.items():
        prior = [score for season, score in rows if season == 2025]
        live = [score for season, score in rows if season == 2026]
        if prior and live:
            out[team] = (len(live) * (sum(live) / len(live)) + PRIOR_GAMES * (sum(prior) / len(prior))) / (len(live) + PRIOR_GAMES)
        elif live:
            out[team] = sum(live) / len(live)
        elif prior:
            out[team] = sum(prior) / len(prior)
    return out


def parse_dk(html):
    pat = re.compile(r'\["((?:\\.|[^"\\])*)","(QB|RB|WR|TE|DST)","([A-Z]{2,3})","([A-Z]{2,3})",(\d+),')
    rows = []
    for name, pos, team, opp, salary in pat.findall(html):
        rows.append({
            "name": decode_name(name),
            "position": pos,
            "team": canon_team(team),
            "opponent": canon_team(opp),
            "salary": int(salary),
            "site": "draftkings",
        })
    return rows


def parse_fd(html):
    rows = []
    for tag in re.findall(r"<tr class=\" projections-listing \"[^>]*>", html):
        def attr(key):
            match = re.search(key + r'="([^"]*)"', tag)
            return match.group(1) if match else ""
        if attr("start_date") < "2026-09-27":
            continue
        pos = attr("pos")
        if pos not in ("QB", "RB", "WR", "TE", "DST"):
            continue
        rows.append({
            "name": decode_name(attr("name")),
            "position": pos,
            "team": canon_team(attr("team")),
            "opponent": canon_team(attr("opp")),
            "salary": int(attr("salary")),
            "site": "fanduel",
        })
    return rows


def outs_by_team():
    blocked = defaultdict(set)
    for line in CONTEXT.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        for side in ("home", "away"):
            team = canon_team(row[f"{side}_team"] if f"{side}_team" in row else row["home_team" if side == "home" else "away_team"])
            for item in row[side]["injuries"]["out"]:
                blocked[team].add(norm_name(item.split("(")[0]))
    return blocked


def tilts():
    signed = {}
    game_of = {}
    for line in READINGS.read_text().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        signed[row["home_team"]] = row["tilt"]
        signed[row["away_team"]] = -row["tilt"]
        game_of[row["home_team"]] = row["game_id"]
        game_of[row["away_team"]] = row["game_id"]
    return signed, game_of


def finished_teams():
    done = set()
    for line in GAMES.read_text().splitlines():
        if not line.strip():
            continue
        game = json.loads(line)
        if game["season"] == 2026 and game["week"] == 3 and game["settled"] is True:
            done.add(game["home_team"])
            done.add(game["away_team"])
    return done


def build_pool(salary_rows, live, prior, position_prior, dst, blocked, tilt, game_of, done):
    pool = []
    unmatched = []
    excluded_out = []
    excluded_final = []
    for row in salary_rows:
        if row["team"] in done:
            excluded_final.append(row["name"])
            continue
        if row["position"] == "DST":
            base = dst.get(row["team"])
            if base is None:
                unmatched.append(row["name"])
                continue
            pos = "DST"
            source = "dst-box"
            games_n = None
        else:
            key = (norm_name(row["name"]), row["team"])
            if key[0] in blocked.get(row["team"], ()):
                excluded_out.append(row["name"])
                continue
            built = project_player(key, live, prior, position_prior)
            if built is None:
                unmatched.append(f"{row['name']} {row['team']}")
                continue
            base, games_n, pos, source = built
        environment = tilt.get(row["team"], 0.0)
        connected = base * (1 + TILT_SCALE * environment)
        pool.append({
            "name": row["name"],
            "position": pos,
            "team": row["team"],
            "opponent": row["opponent"],
            "salary": row["salary"],
            "site": row["site"],
            "projection": connected,
            "projection_before_game": base,
            "game_tilt_for_team": environment,
            "game_id": game_of.get(row["team"]),
            "source": source,
            "games_2026": games_n,
        })
    return pool, unmatched, excluded_out, excluded_final


def optimize(pool, cap):
    by_pos = defaultdict(list)
    for player in pool:
        by_pos[player["position"]].append(player)
    for pos in by_pos:
        by_pos[pos].sort(key=lambda item: item["projection"], reverse=True)
    qbs = by_pos["QB"][:8]
    rbs = by_pos["RB"][:10]
    wrs = by_pos["WR"][:10]
    tes = by_pos["TE"][:8]
    dsts = by_pos["DST"][:8]
    best = None
    for qb, rb_pair, wr_trip, te, dst in itertools.product(
        qbs, itertools.combinations(rbs, 2), itertools.combinations(wrs, 3), tes, dsts,
    ):
        base = (qb, *rb_pair, *wr_trip, te, dst)
        salary = sum(player["salary"] for player in base)
        if salary > cap:
            continue
        used = {id(player) for player in base}
        flex = None
        for candidate in (*rbs, *wrs, *tes):
            if id(candidate) in used:
                continue
            if salary + candidate["salary"] > cap:
                continue
            if flex is None or candidate["projection"] > flex["projection"]:
                flex = candidate
        if flex is None:
            continue
        lineup = (*base, flex)
        score = sum(player["projection"] for player in lineup)
        spent = salary + flex["salary"]
        if best is None or score > best[0]:
            best = (score, lineup, spent)
    if best is None:
        raise RuntimeError("no cap-feasible lineup")
    return best


def check(lineup, cap, site):
    positions = [player["position"] for player in lineup]
    if positions.count("QB") != 1 or positions.count("DST") != 1 or positions.count("TE") < 1:
        raise RuntimeError(f"{site} roster illegal: {positions}")
    if sum(player["position"] == "RB" for player in lineup) < 2:
        raise RuntimeError(f"{site} rb short")
    if sum(player["position"] == "WR" for player in lineup) < 3:
        raise RuntimeError(f"{site} wr short")
    if len(lineup) != 9:
        raise RuntimeError(f"{site} not 9")
    spent = sum(player["salary"] for player in lineup)
    if spent > cap:
        raise RuntimeError(f"{site} over cap {spent}")
    return spent


def main():
    live = load_player_means(PLAYERS_2026, 3)
    prior = load_player_means(PLAYERS_2025, None)
    position_points = defaultdict(list)
    for (_name, _team), (mean, _n, pos) in prior.items():
        position_points[pos].append(mean)
    position_prior = {pos: sum(vals) / len(vals) for pos, vals in position_points.items()}
    dst = load_dst()
    blocked = outs_by_team()
    tilt, game_of = tilts()
    done = finished_teams()
    dk_rows = parse_dk(DK_HTML.read_text(encoding="utf-8", errors="replace"))
    fd_rows = parse_fd(FD_HTML.read_text(encoding="utf-8", errors="replace"))
    dk_pool, dk_miss, dk_out, dk_final = build_pool(dk_rows, live, prior, position_prior, dst, blocked, tilt, game_of, done)
    fd_pool, fd_miss, fd_out, fd_final = build_pool(fd_rows, live, prior, position_prior, dst, blocked, tilt, game_of, done)
    dk_score, dk_lineup, dk_spent = optimize(dk_pool, 50000)
    fd_score, fd_lineup, fd_spent = optimize(fd_pool, 60000)
    check(dk_lineup, 50000, "draftkings")
    check(fd_lineup, 60000, "fanduel")
    payload = {
        "projection": "half-PPR, 2026 weeks 1-2 shrunk toward the 2025 per-game mean with 4 games of prior, then times (1 + 0.08 * team tilt)",
        "tilt_source": "week3-engine-readings.jsonl",
        "publishable_pick": False,
        "draftkings": {
            "source": "https://oneweekseason.com/draftkings-main-slate/",
            "cap": 50000,
            "salary_rows": len(dk_rows),
            "priced": len(dk_pool),
            "unmatched": dk_miss,
            "out": dk_out,
            "excluded_finished_game": sorted(set(dk_final)),
            "spent": dk_spent,
            "projection_sum": dk_score,
            "lineup": list(dk_lineup),
            "search": "top 8 QB, 10 RB, 10 WR, 8 TE, 8 DST by our projection, exact flex under the cap. Not proven optimal outside that cut.",
        },
        "fanduel": {
            "source": "https://www.dailyfantasyfuel.com/nfl/projections/fanduel/",
            "cap": 60000,
            "salary_rows": len(fd_rows),
            "priced": len(fd_pool),
            "unmatched": fd_miss[:40],
            "unmatched_count": len(fd_miss),
            "out": fd_out,
            "excluded_finished_game": sorted(set(fd_final)),
            "spent": fd_spent,
            "projection_sum": fd_score,
            "lineup": list(fd_lineup),
            "search": "same cut and same projection as DraftKings. Sunday file only; Monday is not on this page.",
            "note": "The One Week Season FanDuel page repeated the DraftKings salaries. It was not used.",
        },
    }
    # Full priced pool, one row per site-player, for the shared fantasy list.
    lines = []
    for player in sorted(dk_pool + fd_pool, key=lambda item: (item["site"], -item["projection"])):
        lines.append(json.dumps(player))
    OUT.write_text("\n".join(lines) + "\n")
    (ROOT / "data" / "gse-dataset" / "current" / "week3-lineups.json").write_text(json.dumps(payload, indent=2) + "\n")

    def table(lineup):
        body = ["| player | pos | team | salary | our projection | game tilt |", "|---|---|---|---:|---:|---:|"]
        for player in sorted(lineup, key=lambda item: -item["projection"]):
            body.append(
                f"| {player['name']} | {player['position']} | {player['team']} | {player['salary']} | {player['projection']:.2f} | {player['game_tilt_for_team']:.3f} |"
            )
        return body

    fantasy = sorted(dk_pool, key=lambda item: -item["projection"])[:15]
    report = [
        "# Connected slate, week 3",
        "",
        "One number feeds the fantasy list and both solvers. The game reading moves it by `1 + 0.08 * team tilt`. Their published projections were not used. This is not a sportsbook pick.",
        "",
        f"DraftKings salaries: {len(dk_rows)} rows, {len(dk_pool)} priced, {len(dk_miss)} unmatched, {len(dk_out)} removed as out. Spent {dk_spent} of 50000. Projection sum {dk_score:.2f}.",
        f"FanDuel salaries: {len(fd_rows)} Sunday rows, {len(fd_pool)} priced, {len(fd_miss)} unmatched, {len(fd_out)} removed as out. Spent {fd_spent} of 60000. Projection sum {fd_score:.2f}. Monday is not on the FanDuel page.",
        "Defense uses sacks, interceptions, fumble recoveries, defensive touchdowns, safeties, and points allowed. Yards allowed are not scored.",
        "",
        "## DraftKings lineup",
        "",
        *table(dk_lineup),
        "",
        "## FanDuel lineup",
        "",
        *table(fd_lineup),
        "",
        "## Top fantasy projections on the DraftKings prices",
        "",
        "| player | pos | team | projection |",
        "|---|---|---|---:|",
    ]
    for player in fantasy:
        report.append(f"| {player['name']} | {player['position']} | {player['team']} | {player['projection']:.2f} |")
    report.append("")
    REPORT.write_text("\n".join(report))
    print(json.dumps({
        "dk_spent": dk_spent,
        "dk_proj": round(dk_score, 2),
        "dk_priced": len(dk_pool),
        "dk_unmatched": len(dk_miss),
        "dk_out": dk_out,
        "fd_spent": fd_spent,
        "fd_proj": round(fd_score, 2),
        "fd_priced": len(fd_pool),
        "fd_unmatched": len(fd_miss),
        "dk_names": [p["name"] for p in dk_lineup],
        "fd_names": [p["name"] for p in fd_lineup],
    }, indent=2))


if __name__ == "__main__":
    main()
