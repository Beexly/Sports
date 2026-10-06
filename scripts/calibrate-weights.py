"""Calibrate projection weights and the game-probability contract.

Fantasy and prop projections are a trailing blend. The blend weight is chosen
on 2024 only and frozen. 2025 and 2026 are the test. Game probabilities are
the same Elo used in the historical walk-forward (48-point home field, K=20,
no margin multiplier). Nothing here is a pick.
"""
import csv
import gzip
import json
import math
from collections import defaultdict
from pathlib import Path

ROOT = Path("/tmp/Sports")
GAMES = ROOT / "data" / "gse-dataset" / "games.jsonl"
STATS = Path("/tmp/player_stats.csv.gz")
OUT_JSON = ROOT / "data" / "gse-dataset" / "current" / "calibration-weights.json"
OUT_MD = ROOT / "docs" / "reasoning" / "calibration-weights.md"

POSITIONS = ("QB", "RB", "WR", "TE")
PROP_FIELDS = {
    "passing_yards": frozenset({"QB"}),
    "rushing_yards": frozenset({"QB", "RB"}),
    "receiving_yards": frozenset({"RB", "WR", "TE"}),
    "receptions": frozenset({"RB", "WR", "TE"}),
}


def num(value):
    try:
        out = float(value)
    except (TypeError, ValueError):
        return 0.0
    return out if math.isfinite(out) else 0.0


def half_ppr(row):
    # nflverse fantasy_points pays 0 per reception. fantasy_points_ppr pays 1.
    # Half-PPR is the standard score plus half a point per reception.
    if row.get("fantasy_points"):
        return num(row["fantasy_points"]) + 0.5 * num(row["receptions"])
    return (
        num(row["passing_yards"]) * 0.04
        + num(row["passing_tds"]) * 4
        - num(row["interceptions"]) * 2
        + num(row["rushing_yards"]) * 0.1
        + num(row["rushing_tds"]) * 6
        + num(row["receptions"]) * 0.5
        + num(row["receiving_yards"]) * 0.1
        + num(row["receiving_tds"]) * 6
        - num(row.get("rushing_fumbles_lost")) * 2
        - num(row.get("receiving_fumbles_lost")) * 2
    )


def mean(values):
    return sum(values) / len(values) if values else None


def mae(pairs):
    if not pairs:
        return None
    return sum(abs(pair[0] - pair[1]) for pair in pairs) / len(pairs)


def bias(pairs):
    if not pairs:
        return None
    return sum(pair[0] - pair[1] for pair in pairs) / len(pairs)


def slope_intercept(pairs):
    if len(pairs) < 2:
        return None, None
    xs = [pair[0] for pair in pairs]
    ys = [pair[1] for pair in pairs]
    mx, my = mean(xs), mean(ys)
    var = sum((x - mx) ** 2 for x in xs)
    if var <= 0:
        return None, None
    cov = sum((pair[0] - mx) * (pair[1] - my) for pair in pairs)
    slope = cov / var
    return slope, my - slope * mx


def add_row(grouped, row):
    if (row.get("season_type") or "") != "REG":
        return
    if row.get("position") not in POSITIONS:
        return
    season = int(row["season"])
    if season < 2024 or season > 2026:
        return
    week = int(float(row["week"]))
    if week < 1 or week > 18:
        return
    grouped[(row["player_id"], season)].append({
        "season": season,
        "week": week,
        "position": row["position"],
        "name": row.get("player_display_name") or row.get("player_name") or "",
        "team": row.get("recent_team") or row.get("team") or "",
        "points": half_ppr(row),
        **{field: num(row.get(field)) for field in PROP_FIELDS},
    })


def load_player_weeks():
    grouped = defaultdict(list)
    with gzip.open(STATS, "rt") as handle:
        for row in csv.DictReader(handle):
            if row.get("season") == "2024":
                add_row(grouped, row)
    for path in (Path("/tmp/nfl-stats/w2025.csv"), Path("/workspace/w2026.csv")):
        with open(path, newline="") as handle:
            for row in csv.DictReader(handle):
                add_row(grouped, row)
    for rows in grouped.values():
        rows.sort(key=lambda item: item["week"])
    return grouped


def pairs_for(grouped, season, field, blend, positions=None):
    out = []
    for (_player, row_season), rows in grouped.items():
        if row_season != season:
            continue
        for index, row in enumerate(rows):
            if positions is not None and row["position"] not in positions:
                continue
            prior = [item for item in rows[:index] if positions is None or item["position"] in positions]
            if not prior:
                continue
            season_mean = mean([item[field] for item in prior])
            last4 = mean([item[field] for item in prior[-4:]])
            pred = blend * last4 + (1 - blend) * season_mean
            out.append((pred, row[field], row["position"]))
    return out


def best_blend(grouped, field, positions=None):
    best = None
    for step in range(0, 11):
        blend = step / 10
        score = mae(pairs_for(grouped, 2024, field, blend, positions))
        if score is None:
            continue
        if best is None or score < best[0]:
            best = (score, blend)
    return best


def summarize(pairs):
    by_pos = defaultdict(list)
    for pred, actual, position in pairs:
        by_pos[position].append((pred, actual))
    rows = {}
    for position, group in sorted(by_pos.items()):
        slope, intercept = slope_intercept(group)
        rows[position] = {
            "n": len(group),
            "mae": mae(group),
            "bias_pred_minus_actual": bias(group),
            "slope": slope,
            "intercept": intercept,
        }
    slope, intercept = slope_intercept([(pred, actual) for pred, actual, _pos in pairs])
    return {
        "n": len(pairs),
        "mae": mae([(pred, actual) for pred, actual, _pos in pairs]),
        "bias_pred_minus_actual": bias([(pred, actual) for pred, actual, _pos in pairs]),
        "slope": slope,
        "intercept": intercept,
        "by_position": rows,
    }


def elo_walk():
    games = [json.loads(line) for line in GAMES.read_text().splitlines() if line.strip()]
    games.sort(key=lambda game: (game["gameday"], game["game_id"]))
    elo = defaultdict(lambda: 1500.0)
    hfa = 48.0
    scored = []
    week3 = []
    for game in games:
        home = elo[game["home_team"]]
        away = elo[game["away_team"]]
        probability = 1 / (1 + 10 ** (-(home + hfa - away) / 400))
        played = game.get("settled") and game.get("home_score") is not None and game.get("away_score") is not None and game.get("margin") != 0
        if game.get("season") == 2026 and game.get("week") == 3 and 0 < probability < 1:
            week3.append({"game_id": game["game_id"], "probability": probability})
        if not played:
            continue
        home_win = 1 if game["home_score"] > game["away_score"] else 0
        if 2015 <= game["season"] <= 2025 and 0 < probability < 1:
            scored.append((game["season"], probability, home_win))
        delta = 20 * (home_win - probability)
        elo[game["home_team"]] = home + delta
        elo[game["away_team"]] = away - delta
    return scored, week3


def brier(rows):
    return sum((p - y) ** 2 for _s, p, y in rows) / len(rows)


def ece(rows, bins=10):
    buckets = [[] for _ in range(bins)]
    for _s, p, y in rows:
        index = min(bins - 1, int(p * bins))
        buckets[index].append((p, y))
    total = len(rows)
    error = 0.0
    table = []
    for index, bucket in enumerate(buckets):
        if not bucket:
            continue
        avg_p = sum(p for p, _y in bucket) / len(bucket)
        avg_y = sum(y for _p, y in bucket) / len(bucket)
        error += (len(bucket) / total) * abs(avg_p - avg_y)
        table.append({"bin": index, "n": len(bucket), "mean_p": avg_p, "home_win_rate": avg_y})
    return error, table


def main():
    grouped = load_player_weeks()
    fantasy_fit = best_blend(grouped, "points")
    if fantasy_fit is None:
        raise SystemExit("no 2024 fantasy rows")
    fantasy_blend = fantasy_fit[1]
    fantasy = {
        "scoring": "half-PPR: nflverse fantasy_points plus 0.5 per reception",
        "blend": "w * last_4_weeks + (1-w) * season_to_date, prior weeks only",
        "w_chosen_on_2024": fantasy_blend,
        "w_2024_mae": fantasy_fit[0],
        "seasons": {
            str(season): summarize(pairs_for(grouped, season, "points", fantasy_blend))
            for season in (2024, 2025, 2026)
        },
    }
    position_mae = fantasy["seasons"]["2025"]["by_position"]
    inverse = {pos: 1 / row["mae"] for pos, row in position_mae.items() if row["mae"]}
    inverse_sum = sum(inverse.values())
    position_weight = {pos: value / inverse_sum for pos, value in inverse.items()}

    props = {}
    for field, positions in PROP_FIELDS.items():
        fit = best_blend(grouped, field, positions)
        blend = fit[1]
        props[field] = {
            "positions": sorted(positions),
            "w_chosen_on_2024": blend,
            "w_2024_mae": fit[0],
            "seasons": {
                str(season): summarize(pairs_for(grouped, season, field, blend, positions))
                for season in (2024, 2025, 2026)
            },
        }

    scored, week3 = elo_walk()
    by_season = defaultdict(list)
    for season, p, y in scored:
        by_season[season].append((season, p, y))
    error, table = ece(scored)
    early = [row for row in scored if row[0] <= 2024]
    late = by_season[2025]
    payload = {
        "fantasy": fantasy,
        "position_weight_from_2025_inverse_mae": position_weight,
        "props": props,
        "game_probability": {
            "method": "Elo K=20, home field 48, no margin multiplier, fit choice from 2002-2014",
            "sample_count": len(scored),
            "brier_2015_2025": brier(scored),
            "brier_2015_2024": brier(early),
            "brier_2025": brier(late),
            "drift_abs_2025_minus_prior": abs(brier(late) - brier(early)),
            "ece_10bin": error,
            "bins": table,
            "market_baseline_brier_2015_2025": 0.21220235412306304,
            "week3": week3,
        },
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n")

    def fmt(value):
        return "n/a" if value is None else f"{value:.3f}"

    lines = [
        "# Calibration weights",
        "",
        "The blend weight was chosen by lowest 2024 mean absolute error and then frozen. 2025 and 2026 did not choose it.",
        f"Half-PPR blend w = {fantasy_blend:.1f}. Position weights are the 2025 inverse MAE, normalized to sum to 1. A position that was harder to project gets less weight. That weight is not a probability.",
        "",
        "## Half-PPR projections",
        "",
        "| season | rows | MAE | bias (pred − actual) | slope | intercept |",
        "|---|---|---|---|---|---|",
    ]
    for season, block in fantasy["seasons"].items():
        lines.append(f"| {season} | {block['n']} | {fmt(block['mae'])} | {fmt(block['bias_pred_minus_actual'])} | {fmt(block['slope'])} | {fmt(block['intercept'])} |")
    lines += ["", "| position | 2025 n | 2025 MAE | weight |", "|---|---|---|---|"]
    for pos, weight in position_weight.items():
        row = position_mae[pos]
        lines.append(f"| {pos} | {row['n']} | {fmt(row['mae'])} | {weight:.3f} |")
    lines += ["", "## Props", ""]
    for field, block in props.items():
        test = block["seasons"]["2025"]
        live = block["seasons"]["2026"]
        lines.append(
            f"- {field} ({', '.join(block['positions'])}): w={block['w_chosen_on_2024']:.1f}. "
            f"2025 n={test['n']} MAE={fmt(test['mae'])} slope={fmt(test['slope'])}. "
            f"2026 n={live['n']} MAE={fmt(live['mae'])} slope={fmt(live['slope'])}."
        )
    game = payload["game_probability"]
    lines += [
        "",
        "## Game probability",
        "",
        f"Elo on {game['sample_count']} games, 2015–2025. Brier {game['brier_2015_2025']:.4f}. ECE {game['ece_10bin']:.4f}. Drift |2025 − 2015–2024| {game['drift_abs_2025_minus_prior']:.4f}.",
        "The devigged-price baseline on the overlapping moneyline games was 0.2122. This Elo does not beat that baseline, so the calibration contract must not come back VALIDATED.",
        "",
    ]
    OUT_MD.write_text("\n".join(lines) + "\n")
    print(json.dumps({
        "fantasy_w": fantasy_blend,
        "fantasy_2025_mae": fantasy["seasons"]["2025"]["mae"],
        "fantasy_2026_n": fantasy["seasons"]["2026"]["n"],
        "weights": position_weight,
        "ece": error,
        "brier": game["brier_2015_2025"],
        "drift": game["drift_abs_2025_minus_prior"],
        "sample": game["sample_count"],
    }, indent=2))


if __name__ == "__main__":
    main()
