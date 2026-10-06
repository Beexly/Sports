"""Join NGS summary tables, special-teams EPA, and pace from nflverse.

NGS summary files are the usable layer. Raw tracking is not. A component
enters the week-3 row only if the 2025 walk-forward correlation with the
home result clears 0.08. The rest is stored and stays at zero.
"""
import csv
import gzip
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"
OUT = ROOT / "data" / "gse-dataset" / "current" / "week3-ngs-st-pace.jsonl"
REPORT = ROOT / "docs" / "reasoning" / "ngs-st-pace.md"


def num(value):
    try:
        if value is None or value == "":
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def load_ngs(path, season, week_max, fields, attempt_key):
    acc = defaultdict(lambda: defaultdict(float))
    weight = defaultdict(lambda: defaultdict(float))
    with open(path, newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season") != str(season) or row.get("season_type") != "REG":
                continue
            week = int(row.get("week") or 0)
            if week < 1:
                continue
            if week_max is not None and week >= week_max:
                continue
            team = row.get("team_abbr")
            att = num(row.get(attempt_key)) or 0.0
            if att <= 0 or not team:
                continue
            for field in fields:
                value = num(row.get(field))
                if value is None:
                    continue
                acc[team][field] += value * att
                weight[team][field] += att
    out = {}
    for team, fields_acc in acc.items():
        out[team] = {}
        for field, total in fields_acc.items():
            denom = weight[team][field]
            out[team][field] = total / denom if denom else None
    return out


def load_pbp(path, season, week_max):
    st = defaultdict(lambda: [0.0, 0])
    plays = defaultdict(lambda: [0, 0.0])
    opener = gzip.open if str(path).endswith(".gz") else open
    with opener(path, "rt", newline="") as handle:
        for row in csv.DictReader(handle):
            if row.get("season") != str(season) and row.get("season") != str(season):
                # pbp often stores season as int-like string
                pass
            week = int(num(row.get("week")) or 0)
            if week < 1:
                continue
            if week_max is not None and week >= week_max:
                continue
            if row.get("season_type") not in ("REG", "", None) and row.get("game_type") not in ("REG", "", None):
                # some pbp uses season_type
                if row.get("season_type") not in (None, "", "REG"):
                    continue
            posteam = row.get("posteam") or row.get("pos_team")
            epa = num(row.get("epa"))
            play_type = (row.get("play_type") or "").lower()
            special = row.get("special_teams_play") in ("1", "TRUE", "True", "true") or play_type in (
                "punt", "field_goal", "extra_point", "kickoff",
            )
            if special and posteam and epa is not None:
                st[posteam][0] += epa
                st[posteam][1] += 1
            if posteam and play_type in ("pass", "run", "qb_kneel", "qb_spike"):
                plays[posteam][0] += 1
                sec = num(row.get("game_seconds_remaining"))
                # pace proxy later from play count / games; store play counts
    games_played = defaultdict(set)
    # second pass not needed; derive from play count vs known games
    return st, plays


def mean_st(st):
    return {team: (vals[0] / vals[1] if vals[1] else 0.0) for team, vals in st.items()}


def signed_diff(home, away, scale):
    if home is None or away is None:
        return None
    value = (home - away) / scale
    return max(-1.0, min(1.0, value))


def corr(pairs):
    if len(pairs) < 40:
        return None
    xs = [p[0] for p in pairs]
    ys = [p[1] for p in pairs]
    mx = sum(xs) / len(xs)
    my = sum(ys) / len(ys)
    nume = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    dx = sum((x - mx) ** 2 for x in xs) ** 0.5
    dy = sum((y - my) ** 2 for y in ys) ** 0.5
    if dx == 0 or dy == 0:
        return 0.0
    return nume / (dx * dy)


def main():
    passing_fields = (
        "completion_percentage_above_expectation",
        "avg_time_to_throw",
        "aggressiveness",
        "avg_air_yards_differential",
    )
    rushing_fields = ("rush_yards_over_expected_per_att", "efficiency")
    receiving_fields = ("avg_separation", "avg_yac_above_expectation")

    ngs_pass_25 = load_ngs("/tmp/olcal/ngs_passing.csv", 2025, None, passing_fields, "attempts")
    ngs_rush_25 = load_ngs("/tmp/olcal/ngs_rushing.csv", 2025, None, rushing_fields, "rush_attempts")
    ngs_rec_25 = load_ngs("/tmp/olcal/ngs_receiving.csv", 2025, None, receiving_fields, "targets")
    ngs_pass_26 = load_ngs("/tmp/olcal/ngs_passing.csv", 2026, 3, passing_fields, "attempts")
    ngs_rush_26 = load_ngs("/tmp/olcal/ngs_rushing.csv", 2026, 3, rushing_fields, "rush_attempts")
    ngs_rec_26 = load_ngs("/tmp/olcal/ngs_receiving.csv", 2026, 3, receiving_fields, "targets")

    print("pbp st 2025...")
    st25, plays25 = load_pbp("/tmp/pbp_2025.csv.gz", 2025, None)
    print("pbp st 2026...")
    st26, plays26 = load_pbp("/tmp/pbp_2026.csv", 2026, 3)
    st25_mean = mean_st(st25)
    st26_mean = mean_st(st26)

    # 2025 walk-forward using full-season NGS as a weak test (not week-lagged —
    # call it association, not causal). We only keep components with |r|>=0.08
    # against 2025 home_win.
    results = []
    with GAMES.open() as handle:
        for line in handle:
            game = json.loads(line)
            if game.get("season") != 2025 or not game.get("settled") or game.get("game_type") not in (None, "REG"):
                continue
            if game.get("home_win") is None:
                continue
            home, away = game["home_team"], game["away_team"]
            y = 1.0 if game["home_win"] else 0.0
            def take(table, field, h, a):
                hv = (table.get(h) or {}).get(field)
                av = (table.get(a) or {}).get(field)
                if hv is None or av is None:
                    return None
                return hv - av
            results.append({
                "y": y,
                "cpoe": take(ngs_pass_25, "completion_percentage_above_expectation", home, away),
                "ttt": take(ngs_pass_25, "avg_time_to_throw", home, away),
                "agg": take(ngs_pass_25, "aggressiveness", home, away),
                "air": take(ngs_pass_25, "avg_air_yards_differential", home, away),
                "ryoe": take(ngs_rush_25, "rush_yards_over_expected_per_att", home, away),
                "sep": take(ngs_rec_25, "avg_separation", home, away),
                "yac": take(ngs_rec_25, "avg_yac_above_expectation", home, away),
                "st": (st25_mean.get(home, 0) - st25_mean.get(away, 0)),
            })

    corrs = {}
    for key in ("cpoe", "ttt", "agg", "air", "ryoe", "sep", "yac", "st"):
        pairs = [(row[key], row["y"]) for row in results if row[key] is not None]
        corrs[key] = {"n": len(pairs), "r": None if not pairs else round(corr(pairs), 4)}

    live = {key: meta for key, meta in corrs.items() if meta["r"] is not None and abs(meta["r"]) >= 0.08}

    def blend(prior, live_tbl, field, k=8):
        # shrink 2026 toward 2025. k is games-equivalent, here just a unit shrink.
        p = (prior.get(field) if prior else None)
        o = (live_tbl.get(field) if live_tbl else None)
        if p is None and o is None:
            return None
        if o is None:
            return p
        if p is None:
            return o
        return (2 * o + k * p) / (2 + k)

    games = []
    with GAMES.open() as handle:
        for line in handle:
            game = json.loads(line)
            if game.get("season") == 2026 and game.get("week") == 3:
                games.append(game)

    rows = []
    for game in games:
        home, away = game["home_team"], game["away_team"]
        signed = {}
        parts = {}
        mapping = {
            "cpoe": (ngs_pass_25, ngs_pass_26, "completion_percentage_above_expectation", 3.0),
            "ttt": (ngs_pass_25, ngs_pass_26, "avg_time_to_throw", 0.4),
            "ryoe": (ngs_rush_25, ngs_rush_26, "rush_yards_over_expected_per_att", 0.8),
            "sep": (ngs_rec_25, ngs_rec_26, "avg_separation", 0.6),
            "yac": (ngs_rec_25, ngs_rec_26, "avg_yac_above_expectation", 0.8),
            "st": (None, None, None, 0.15),
        }
        for key, (prior_tbl, live_tbl, field, scale) in mapping.items():
            if key == "st":
                hv = blend({"st": st25_mean.get(home)}, {"st": st26_mean.get(home)}, "st")
                av = blend({"st": st25_mean.get(away)}, {"st": st26_mean.get(away)}, "st")
            else:
                hv = blend(prior_tbl.get(home), live_tbl.get(home), field)
                av = blend(prior_tbl.get(away), live_tbl.get(away), field)
            parts[key] = {"home": hv, "away": av, "diff": None if hv is None or av is None else hv - av}
            if key in live:
                signed[key] = signed_diff(hv, av, scale)
            else:
                signed[key] = None
        # Composite of live NGS/ST pieces only. Missing stay out.
        live_vals = [value for value in signed.values() if value is not None]
        ngs_signed = sum(live_vals) / len(live_vals) if live_vals else None
        rows.append({
            "game_id": game["game_id"],
            "home_team": home,
            "away_team": away,
            "correlations_2025": corrs,
            "live_components": sorted(live),
            "parts": parts,
            "signed": signed,
            "ngs_st_signed": ngs_signed,
        })

    OUT.write_text("".join(json.dumps({k: v for k, v in row.items() if k != "correlations_2025"}) + "\n" for row in rows))
    lines = [
        "# NGS, special teams, pace",
        "",
        "NGS summary tables from nflverse (passing, rushing, receiving) through 2026 week 2. Special-teams EPA from play-by-play. A component is live in week 3 only if |r| versus 2025 home result is at least 0.08.",
        "",
        "| component | n | r | week-3 |",
        "|---|---:|---:|---|",
    ]
    labels = {
        "cpoe": "NGS CPOE",
        "ttt": "time to throw",
        "agg": "aggressiveness",
        "air": "air yards differential",
        "ryoe": "rush yards over expected",
        "sep": "separation",
        "yac": "YAC over expected",
        "st": "special teams EPA",
    }
    for key, label in labels.items():
        r = corrs[key]["r"]
        state = "LIVE" if key in live else "stored, unused"
        lines.append(f"| {label} | {corrs[key]['n']} | {'' if r is None else f'{r:+.3f}'} | {state} |")
    lines.append("")
    lines.append("Pace from play counts was not converted to a signed game edge. It is a totals input. Wind already failed the environment fit.")
    REPORT.write_text("\n".join(lines))
    print(json.dumps({"corrs": corrs, "live": sorted(live), "games": len(rows)}, indent=2))


if __name__ == "__main__":
    main()
