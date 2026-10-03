"""Walk-forward pressure, fourth-down, and special-teams edges.

2025 is the test. A team's rate in a game uses only earlier 2025 weeks.
Week 3 of 2026 uses the finished 2025 rate as the prior and weeks 1-2 as
the observation. A signal enters the tilt only when the 2025 walk-forward
correlation with home wins has the expected sign and is not noise.
"""
import csv
import gzip
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"
OUT = ROOT / "data" / "gse-dataset" / "current" / "week3-situational.jsonl"
REPORT = ROOT / "docs" / "reasoning" / "situational-edges.md"


def num(value):
    try:
        out = float(value)
    except (TypeError, ValueError):
        return None
    return out if out == out else None


def flag(value):
    return value in ("1", "1.0")


def open_plays(path):
    if str(path).endswith(".gz"):
        return gzip.open(path, "rt", newline="")
    return open(path, newline="")


def consume(path, season, week_max):
    """Per team-week counts. week_max is exclusive for the live season."""
    acc = defaultdict(lambda: defaultdict(float))
    with open_plays(path) as handle:
        for row in csv.DictReader(handle):
            if row.get("season_type") not in ("REG", "reg"):
                continue
            week = num(row.get("week"))
            if week is None:
                continue
            week = int(week)
            if week_max is not None and week >= week_max:
                continue
            posteam = row.get("posteam") or ""
            defteam = row.get("defteam") or ""
            play_type = row.get("play_type") or ""
            if defteam and (flag(row.get("pass_attempt")) or flag(row.get("sack"))):
                acc[(season, week, defteam)]["def_drop"] += 1
                if flag(row.get("qb_hit")):
                    acc[(season, week, defteam)]["def_hit"] += 1
            if posteam and (flag(row.get("pass_attempt")) or flag(row.get("sack"))):
                acc[(season, week, posteam)]["off_drop"] += 1
                if flag(row.get("qb_hit")):
                    acc[(season, week, posteam)]["off_hit"] += 1
            if row.get("down") == "4" and play_type in ("pass", "run", "punt", "field_goal"):
                team = posteam
                if team:
                    acc[(season, week, team)]["fourth"] += 1
                    if play_type in ("pass", "run"):
                        acc[(season, week, team)]["go"] += 1
            if play_type in ("kickoff", "punt", "field_goal", "extra_point") and posteam:
                epa = num(row.get("epa"))
                if epa is not None:
                    acc[(season, week, posteam)]["st_epa"] += epa
                    acc[(season, week, posteam)]["st_n"] += 1
    return acc


class Book:
    def __init__(self):
        self.counts = defaultdict(lambda: defaultdict(float))

    def add_week(self, acc, season, week, team):
        part = acc.get((season, week, team))
        if not part:
            return
        for key, value in part.items():
            self.counts[team][key] += value

    def rate(self, team, num_key, den_key):
        den = self.counts[team][den_key]
        if den <= 0:
            return None
        return self.counts[team][num_key] / den

    def snapshot(self, team):
        return {
            "def_pressure": self.rate(team, "def_hit", "def_drop"),
            "off_pressure": self.rate(team, "off_hit", "off_drop"),
            "go_rate": self.rate(team, "go", "fourth"),
            "st_epa": self.rate(team, "st_epa", "st_n"),
            "def_drop": self.counts[team]["def_drop"],
            "fourth": self.counts[team]["fourth"],
            "st_n": self.counts[team]["st_n"],
        }


def pearson(pairs):
    xs = [a for a, _b in pairs]
    ys = [b for _a, b in pairs]
    n = len(xs)
    if n < 30:
        return None, n
    mx = sum(xs) / n
    my = sum(ys) / n
    num = sum((a - mx) * (b - my) for a, b in pairs)
    dx = sum((a - mx) ** 2 for a in xs) ** 0.5
    dy = sum((b - my) ** 2 for b in ys) ** 0.5
    if dx == 0 or dy == 0:
        return None, n
    return num / (dx * dy), n


def edge(home, away):
    """Positive means the home side has the better pressure matchup.

    def_pressure high is good. off_pressure high means the offense is hit more,
    which is bad. The first version added the bad term and the correlation
    came out negative. This is the corrected difference.
    """
    needed = (home["def_pressure"], home["off_pressure"], away["def_pressure"], away["off_pressure"])
    if any(value is None for value in needed):
        return None
    home_net = home["def_pressure"] - home["off_pressure"]
    away_net = away["def_pressure"] - away["off_pressure"]
    return home_net - away_net


def main():
    print("reading 2025 plays")
    prior_acc = consume("/tmp/pbp_2025.csv.gz", 2025, None)
    print("reading 2026 plays")
    live_acc = consume("/tmp/pbp_2026.csv", 2026, 3)
    games = [json.loads(line) for line in GAMES.read_text().splitlines() if line.strip()]
    season_2025 = [g for g in games if g["season"] == 2025 and g["season_phase"] == "REG" and g["settled"] is True]
    by_week = defaultdict(list)
    for game in season_2025:
        by_week[int(game["week"])].append(game)

    book = Book()
    pressure_pairs = []
    fourth_pairs = []
    st_pairs = []
    for week in sorted(by_week):
        for game in by_week[week]:
            if game["home_win"] is None:
                continue
            home = book.snapshot(game["home_team"])
            away = book.snapshot(game["away_team"])
            won = 1.0 if game["home_win"] else 0.0
            pressure = edge(home, away)
            if pressure is not None and home["def_drop"] >= 30 and away["def_drop"] >= 30:
                pressure_pairs.append((pressure, won))
            if home["go_rate"] is not None and away["go_rate"] is not None and home["fourth"] >= 4 and away["fourth"] >= 4:
                fourth_pairs.append((home["go_rate"] - away["go_rate"], won))
            if home["st_epa"] is not None and away["st_epa"] is not None and home["st_n"] >= 8 and away["st_n"] >= 8:
                st_pairs.append((home["st_epa"] - away["st_epa"], won))
        teams = {game["home_team"] for game in by_week[week]} | {game["away_team"] for game in by_week[week]}
        for team in teams:
            book.add_week(prior_acc, 2025, week, team)

    pressure_r, pressure_n = pearson(pressure_pairs)
    fourth_r, fourth_n = pearson(fourth_pairs)
    st_r, st_n = pearson(st_pairs)

    # Week 3: 2025 finished book is the prior. 2026 weeks 1-2 are blended in
    # with a cap so two games cannot replace the season.
    prior_book = Book()
    for key in prior_acc:
        season, week, team = key
        prior_book.add_week(prior_acc, season, week, team)
    live_book = Book()
    for key in live_acc:
        season, week, team = key
        live_book.add_week(live_acc, season, week, team)

    def blend(team, num_key, den_key, prior_n):
        obs_n = live_book.counts[team][den_key]
        obs = live_book.rate(team, num_key, den_key)
        base = prior_book.rate(team, num_key, den_key)
        if obs is None and base is None:
            return None
        if obs is None:
            return base
        if base is None:
            return obs
        return (obs_n * obs + prior_n * base) / (obs_n + prior_n)

    def profile(team):
        return {
            "def_pressure": blend(team, "def_hit", "def_drop", 150),
            "off_pressure": blend(team, "off_hit", "off_drop", 150),
            "go_rate": blend(team, "go", "fourth", 25),
            "st_epa": blend(team, "st_epa", "st_n", 40),
        }

    def clip(value):
        if value > 1:
            return 1.0
        if value < -1:
            return -1.0
        return value

    use_pressure = pressure_r is not None and pressure_r > 0.03
    use_fourth = fourth_r is not None and abs(fourth_r) > 0.03
    use_st = st_r is not None and st_r > 0.03
    week3 = [g for g in games if g["season"] == 2026 and g["week"] == 3]
    rows = []
    for game in sorted(week3, key=lambda item: item["game_id"]):
        home = profile(game["home_team"])
        away = profile(game["away_team"])
        pressure = edge(home, away)
        fourth = None if home["go_rate"] is None or away["go_rate"] is None else home["go_rate"] - away["go_rate"]
        st = None if home["st_epa"] is None or away["st_epa"] is None else home["st_epa"] - away["st_epa"]
        rows.append({
            "game_id": game["game_id"],
            "trench_signed": None if pressure is None or not use_pressure else clip(pressure / 0.12),
            "coaching_signed": None if fourth is None or not use_fourth else clip((fourth * (1 if fourth_r > 0 else -1)) / 0.15),
            "special_teams_signed": None if st is None or not use_st else clip(st / 0.8),
            "pressure_edge": pressure,
            "go_rate_edge": fourth,
            "st_epa_edge": st,
            "home_go_rate": home["go_rate"],
            "away_go_rate": away["go_rate"],
        })
    OUT.write_text("".join(json.dumps(row) + "\n" for row in rows))
    lines = [
        "# Situational edges, measured before use",
        "",
        "2025 regular season, walk-forward. A team enters a game with only earlier weeks. Correlation is with the home team winning.",
        "",
        "| signal | games | pearson r | enters the tilt |",
        "|---|---:|---:|---|",
        f"| pressure matchup | {pressure_n} | {pressure_r if pressure_r is not None else ''} | {'yes' if use_pressure else 'no'} |",
        f"| fourth-down go rate | {fourth_n} | {fourth_r if fourth_r is not None else ''} | {'yes' if use_fourth else 'no'} |",
        f"| special-teams EPA | {st_n} | {st_r if st_r is not None else ''} | {'yes' if use_st else 'no'} |",
        "",
        "Pressure is qb_hit divided by dropbacks. The matchup is the home team's pressure created minus pressure allowed, minus the same net for the away team. Fourth-down go rate is passes and runs divided by those plus punts and field goals. Special-teams EPA is the mean EPA on the posteam's kickoffs, punts, field goals, and extra points.",
        "",
        "A signal is allowed into the tilt only if r is above 0.03 in the direction that makes the signal useful. Otherwise the number is kept on the row and the family stays dark.",
        "",
    ]
    REPORT.write_text("\n".join(lines))
    print(json.dumps({
        "pressure": [pressure_r, pressure_n, use_pressure],
        "fourth": [fourth_r, fourth_n, use_fourth],
        "st": [st_r, st_n, use_st],
        "sample": next(row for row in rows if row["game_id"] == "2026_03_LAC_BUF"),
    }, indent=2))


if __name__ == "__main__":
    main()
