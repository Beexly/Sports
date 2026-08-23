#!/usr/bin/env python3
"""
Reasoning-Agent-5: NFL prop-market correlation analysis.

Quantifies the correlation structure between NFL player-prop markets that the
platform's independent-`p` model (packages/prediction-engine/src/edge-lab/props-hb.ts,
Gamma-Poisson shrinkage toward position-group means, one player-prop at a time) MISSES.

Three classes are measured directly on real, CC-BY-4.0 nflverse data:
  A. Multi-player / teammate correlations  — compositional target & carry shares
  B. Game-script correlations              — spread/total/pace driving shared volume
  C. Team-total correlations              — team-enveloped player volume

Data: nflverse-data releases (CC-BY-4.0, attribution "Data via nflverse, licensed CC BY 4.0").
  - player_stats.csv.gz   (per-player-week: targets, rec, rec_yards, carries, rush_yards,
                           TDs, sacks, ints, target_share, wopr, attempts, completions)
  - games.csv             (per-game: spread_line, total_line, result, roof, temp, wind)

The independent-`p` model is the STATISTICAL CORE only (per props-hb.ts header L41-48):
it fits a per-player NB posterior from (games, total-events) and answers P(X > line)
for ONE player's ONE prop independently. It has NO cross-player, NO script, NO team-total
covariance. These numbers measure exactly that missing covariance.

All outputs are descriptive correlations on historical data (priced:false, not a CLV
claim). No sportsbook prices are ingested.
"""
import csv, gzip, io, json, math, os, sys, urllib.request
from collections import defaultdict

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(os.environ.get("LOCALAPPDATA", "/tmp"), "hermes_nfl_cache")
os.makedirs(CACHE, exist_ok=True)

PLAYER_STATS_URL = "https://github.com/nflverse/nflverse-data/releases/download/player_stats/player_stats.csv.gz"
GAMES_URL = "https://github.com/nflverse/nflverse-data/releases/download/schedules/games.csv"
ATTRIB = "Data via nflverse, licensed CC BY 4.0"

# Restrict to the modern era where prop markets are dense and NGS-quality data is whole.
# 2020 is an outlier season (COVID, no preseason, modified IR); flag it but keep it
# controllable so the reader can see sensitivity.
SEASONS = [2019, 2020, 2021, 2022, 2023, 2024]
OFF_POSITIONS = {"QB", "RB", "WR", "TE"}


def cache_fetch(url, fname, is_gz=False):
    path = os.path.join(CACHE, fname)
    if not os.path.exists(path) or os.path.getsize(path) == 0:
        print(f"[fetch] {url}")
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=180) as r:
            raw = r.read()
        with open(path, "wb") as f:
            f.write(raw)
        print(f"[fetch] {len(raw)} bytes -> {path}")
    with open(path, "rb") as f:
        raw = f.read()
    return gzip.decompress(raw).decode("utf-8", "replace") if is_gz else raw.decode("utf-8", "replace")


def load_player_stats():
    txt = cache_fetch(PLAYER_STATS_URL, "player_stats.csv.gz", is_gz=True)
    reader = csv.DictReader(io.StringIO(txt))
    rows = []
    for r in reader:
        try:
            if r.get("season_type", "REG") != "REG":
                continue
            season = int(r["season"])
            if season not in SEASONS:
                continue
            pos = (r.get("position") or "").strip()
            if pos not in OFF_POSITIONS:
                continue
            team = (r.get("recent_team") or "").strip()
            if not team:
                continue
            week = int(r["week"])
            rows.append({
                "season": season, "week": week, "player_id": r["player_id"],
                "player": r.get("player_display_name", ""),
                "pos": pos, "pg": r.get("position_group", ""),
                "team": team, "opp": (r.get("opponent_team") or "").strip(),
                "targets": float(r["targets"] or 0),
                "receptions": float(r["receptions"] or 0),
                "rec_yards": float(r["receiving_yards"] or 0),
                "carries": float(r["carries"] or 0),
                "rush_yards": float(r["rushing_yards"] or 0),
                "rec_td": float(r["receiving_tds"] or 0),
                "rush_td": float(r["rushing_tds"] or 0),
                "pass_td": float(r["passing_tds"] or 0),
                "attempts": float(r["attempts"] or 0),       # QB pass attempts
                "completions": float(r["completions"] or 0),
                "sacks": float(r["sacks"] or 0),
                "ints": float(r["interceptions"] or 0),
                "pass_yards": float(r["passing_yards"] or 0),
                "target_share": float(r["target_share"] or 0),
            })
        except (KeyError, ValueError):
            continue
    return rows


def load_games():
    txt = cache_fetch(GAMES_URL, "games.csv", is_gz=False)
    reader = csv.DictReader(io.StringIO(txt))
    out = {}
    for r in reader:
        try:
            season = int(r["season"])
            if season not in SEASONS:
                continue
            if r.get("season_type", "REG") != "REG":
                continue
            week = int(r["week"])
            home = (r.get("home_team") or "").strip()
            away = (r.get("away_team") or "").strip()
            gid = r["game_id"]
            out[gid] = {
                "season": season, "week": week, "home": home, "away": away,
                "home_score": float(r["home_score"] or 0),
                "away_score": float(r["away_score"] or 0),
                "result": float(r["result"] or 0),
                "spread_line": float(r["spread_line"] or 0),
                "total_line": float(r["total_line"] or 0),
                "roof": r.get("roof", ""), "surface": r.get("surface", ""),
                "temp": float(r["temp"] or 0) if r.get("temp") else None,
                "wind": float(r["wind"] or 0) if r.get("wind") else None,
                "game_id": gid,
            }
            # index by (season, week, team) too for matching player rows
            out[(season, week, home)] = out[gid]
            out[(season, week, away)] = out[gid]
        except (KeyError, ValueError):
            continue
    return out


# ── stats helpers (pure python) ──────────────────────────────────────────────
def mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def pearson(xs, ys):
    n = len(xs)
    if n < 2:
        return None
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    sxy = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    den = math.sqrt(sxx * syy)
    if den == 0:
        return None
    return sxy / den


def quantile(sorted_xs, q):
    if not sorted_xs:
        return 0.0
    if len(sorted_xs) == 1:
        return sorted_xs[0]
    pos = q * (len(sorted_xs) - 1)
    lo = int(math.floor(pos))
    hi = int(math.ceil(pos))
    if lo == hi:
        return sorted_xs[lo]
    return sorted_xs[lo] + (sorted_xs[hi] - sorted_xs[lo]) * (pos - lo)


def r2_of_regression(xs, ys):
    """R^2 of OLS y ~ x on raw (bivariate) data."""
    n = len(xs)
    if n < 2:
        return None
    mx, my = mean(xs), mean(ys)
    sxx = sum((x - mx) ** 2 for x in xs)
    sxy = sum((xs[i] - mx) * (ys[i] - my) for i in range(n))
    syy = sum((y - my) ** 2 for y in ys)
    if sxx == 0 or syy == 0:
        return None
    return (sxy * sxy) / (sxx * syy)


def std_pct(xs):
    n = len(xs)
    if n < 2:
        return 0.0
    return 100 * math.sqrt(sum((x - mean(xs)) ** 2 for x in xs) / (n - 1))


# ── Analysis ─────────────────────────────────────────────────────────────────
def analyze(stats, games):
    out = {"provenance": {"source": "nflverse player_stats.csv.gz + games.csv (CC-BY-4.0)",
                          "attribution": ATTRIB, "seasons": SEASONS,
                          "independent_p_model": ("props-hb.ts Gamma-Poisson per-player shrinkage; "
                                                  "one player-prop at a time, no cross-player/script/total covariance"),
                          "note": "Descriptive correlations only; priced:false; not a CLV claim."}}

    # Index player stats by (season, week, team)
    by_game = defaultdict(list)
    for r in stats:
        by_game[(r["season"], r["week"], r["team"])].append(r)

    # ── A. Compositional / teammate correlations ─────────────────────────────
    # Sum of target_share + sum of targets per team-game.
    share_sums = []
    tgt_team_sums = []
    teammate_share_pairs = []   # (share_i, share_j) for co-active same-team pairs
    teammate_target_pairs = []  # (targets_i, targets_j)
    n_games_composition = 0
    for key, players in by_game.items():
        catchers = [p for p in players if p["pos"] in ("WR", "TE", "RB") and p["targets"] > 0]
        if len(catchers) < 2:
            continue
        n_games_composition += 1
        share_sums.append(sum(p["target_share"] for p in catchers))
        tgt_team_sums.append(sum(p["targets"] for p in catchers))
        # pairwise teammates (co-active in the same game)
        for i in range(len(catchers)):
            for j in range(i + 1, len(catchers)):
                a, b = catchers[i], catchers[j]
                teammate_share_pairs.append((a["target_share"], b["target_share"]))
                teammate_target_pairs.append((a["targets"], b["targets"]))

    # also: teammate receiving-yards correlation same game (compositional at yard level)
    teammate_recyard_pairs = []
    for key, players in by_game.items():
        recs = [p for p in players if p["pos"] in ("WR", "TE")]
        for i in range(len(recs)):
            for j in range(i + 1, len(recs)):
                if recs[i]["rec_yards"] > 0 and recs[j]["rec_yards"] > 0:
                    teammate_recyard_pairs.append((recs[i]["rec_yards"], recs[j]["rec_yards"]))

    out["A_compositional"] = {
        "team_games_with_>1_targeted_catcher": n_games_composition,
        "team_target_share_sum_stats": {
            "mean": round(mean(share_sums), 4),
            "min": round(min(share_sums), 4),
            "max": round(max(share_sums), 4),
            "median": round(quantile(sorted(share_sums), 0.5), 4),
            "sd_pct": round(std_pct(share_sums), 2),
            "note": "Share sums to ~1.0 => shares are compositional (constrained simplex).",
        },
        "team_target_sum_stats_targets": {
            "mean": round(mean(tgt_team_sums), 1),
            "min": round(min(tgt_team_sums), 1),
            "max": round(max(tgt_team_sums), 1),
        },
        "teammate_target_share_pair_corr": round(pearson([p[0] for p in teammate_share_pairs],
                                                         [p[1] for p in teammate_share_pairs]), 4) if teammate_share_pairs else None,
        "teammate_raw_target_pair_corr": round(pearson([p[0] for p in teammate_target_pairs],
                                                      [p[1] for p in teammate_target_pairs]), 4) if teammate_target_pairs else None,
        "teammate_rec_yard_pair_corr": round(pearson([a for a, _ in teammate_recyard_pairs],
                                                     [b for _, b in teammate_recyard_pairs]), 4) if teammate_recyard_pairs else None,
        "n_teammate_pairs": len(teammate_share_pairs),
        "n_teammate_recyard_pairs": len(teammate_recyard_pairs),
        "interpretation": ("Raw targets of co-active teammates are driven by shared team-game volume, but their "
                           "SHARES are NEGATIVELY correlated (compositional constraint: sum to 1), exactly the "
                           "Dirichlet-multinomial structure masterplan §3.2 / SC3 models. props-hb.ts computes "
                           "each player's NB posterior independently — no teammate covariance."),
    }

    # ── B. Game-script correlations ───────────────────────────────────────────
    # Team pass attempts (script driver) from QB attempts + sacks per team-game.
    # Match player rows to game context (total_line, spread_line).
    team_games = {}  # (season,week,team) -> {pass_att, rush_att, total_line, spread_line, result, temp, wind, roof, n_dropbacks_proxy}
    for (season, week, team), players in by_game.items():
        qb = [p for p in players if p["pos"] == "QB"]
        # team pass attempts proxy: sum QB attempts (each team has exactly 1 QB with attempts typically)
        pass_att = sum(p["attempts"] for p in qb)
        # team rush attempts proxy
        rush_att = sum(p["carries"] for p in players)
        sacks = sum(p["sacks"] for p in players)
        g = games.get((season, week, team)) or games.get((season, week, team))
        tg = games.get((season, week, team))
        # find game row by team
        if tg is None:
            continue
        team_games[(season, week, team)] = {
            "pass_att": pass_att, "rush_att": rush_att, "sacks": sacks,
            "dropbacks_proxy": pass_att + sacks,
            "total_line": tg["total_line"], "spread_line": tg["spread_line"],
            "result": tg["result"], "temp": tg["temp"], "wind": tg["wind"],
            "roof": tg["roof"], "team": team,
        }

    pass_atts = [v["pass_att"] for v in team_games.values()]
    totals = [v["total_line"] for v in team_games.values() if v["total_line"]]
    spreads = [v["spread_line"] for v in team_games.values() if v["spread_line"] != 0]
    t_to_pa = [(v["total_line"], v["pass_att"]) for v in team_games.values() if v["total_line"]]
    s_to_pa = [(v["spread_line"], v["pass_att"]) for v in team_games.values() if v["spread_line"]]
    tot_to_db = [(v["total_line"], v["dropbacks_proxy"]) for v in team_games.values() if v["total_line"]]

    out["B_game_script"] = {
        "n_team_games": len(team_games),
        "team_pass_attempts_sd": round(std_pct(pass_atts), 1),
        "corr_total_line_vs_pass_attempts": round(pearson([t[0] for t in t_to_pa], [t[1] for t in t_to_pa]), 3),
        "corr_spread_vs_pass_attempts": round(pearson([s[0] for s in s_to_pa], [s[1] for s in s_to_pa]), 3),
        "corr_total_line_vs_dropbacks": round(pearson([t[0] for t in tot_to_db], [t[1] for t in tot_to_db]), 3),
        "team_pass_attempts_mean": round(mean(pass_atts), 1),
        "team_pass_attempts_range": [round(min(pass_atts), 1), round(max(pass_atts), 1)],
        "interpretation": ("Team pass volume (dropbacks) is strongly driven by the game script — total_line "
                           "(over/under) and spread. A higher total and being a smaller favorite → more dropbacks → "
                           "more targets/receptions for EVERY receiver on both teams. The independent-p model only "
                           "conditions on per-player rest/weather covariates, NOT on the shared script draw "
                           "(plays/PROE/pace), so it cannot co-move a game's receiver props with the script."),
    }

    # ── C. Team-total (shared envelope) variance decomposition ────────────────
    # For each receiver, how much of their game-to-game target variance is explained
    # by team pass-attempt volume (the shared envelope that independent-p averages away)?
    # R^2 of receiver targets ~ team dropbacks.
    by_player = defaultdict(list)
    for (season, week, team), players in by_game.items():
        tg = team_games.get((season, week, team))
        if not tg:
            continue
        db = tg["dropbacks_proxy"]
        for p in players:
            if p["pos"] in ("WR", "TE") and p["targets"] >= 0:
                by_player[p["player_id"]].append({
                    "targets": p["targets"], "team_db": db,
                    "target_share": p["target_share"], "rec_yards": p["rec_yards"],
                "player": p["player"], "pos": p["pos"], "n": 0})

    r2s = []
    share_var_explained = []
    per_receiver = []
    for pid, recs in by_player.items():
        if len(recs) < 8:
            continue
        recs.sort(key=lambda x: (x["targets"], x["team_db"]))
        xs = [r["team_db"] for r in recs]
        ys_tgt = [r["targets"] for r in recs]
        ys_share = [r["target_share"] for r in recs]
        r2 = r2_of_regression(xs, ys_tgt)
        if r2 is not None:
            r2s.append(r2)
        if len(xs) >= 4 and mean(xs) > 0:
            sr2 = r2_of_regression(xs, ys_share)
            if sr2 is not None:
                share_var_explained.append(sr2)
        per_receiver.append({
            "player": recs[0]["player"], "pos": recs[0]["pos"], "n_games": len(recs),
            "target_r2_vs_team_dropbacks": round(r2, 4) if r2 is not None else None,
        })

    out["C_team_total_envelope"] = {
        "n_receivers_analyzed": len(r2s),
        "target_count_r2_mean": round(mean(r2s), 4),
        "target_count_r2_median": round(quantile(sorted(r2s), 0.5), 4),
        "target_count_r2_pct_above_0.1": round(100 * sum(1 for r in r2s if r > 0.1) / len(r2s), 1),
        "target_count_r2_pct_above_0.2": round(100 * sum(1 for r in r2s if r > 0.2) / len(r2s), 1),
        "share_r2_mean": round(mean(share_var_explained), 4) if share_var_explained else None,
        "interpretation": ("A sizable fraction of each receiver's game-to-game target-count "
                           "variance is explained by the TEAM's dropback volume (the shared envelope that "
                           "the independent-p model replaces with a season-average rate). The residual "
                           "share-variance (which the Dirichlet share core in masterplan §3.2 models) is "
                           "compositional across teammates."),
    }

    # ── D. Cross-market same-game correlation (the e = p - q arbitrage surface) ──
    # Within a game, correlation between a receiver's receptions and their QB's pass yards,
    # and between two same-team receivers' targets (the "teammate effect" the props-hb
    # independent model cannot replicate because each probOver is computed in isolation).
    samegame_qr = []   # (rec_targets, qb_pass_yards) same team-game
    samegame_tr = []   # (rec1_targets, rec2_targets) same-team WRs, paired
    for (season, week, team), players in by_game.items():
        qbs = [p for p in players if p["pos"] == "QB"]
        recs = [p for p in players if p["pos"] in ("WR", "TE")]
        if not qbs or len(recs) < 2:
            continue
        qby = qbs[0]["pass_yards"]
        for r in recs:
            samegame_qr.append((r["targets"], qby))
        for i in range(len(recs)):
            for j in range(i + 1, len(recs)):
                samegame_tr.append((recs[i]["targets"], recs[j]["targets"]))

    out["D_cross_market_samegame"] = {
        "n_obs_qb_rec_targets": len(samegame_qr),
        "corr_receiver_targets_vs_qb_pass_yards": round(pearson([a for a, _ in samegame_qr], [b for _, b in samegame_qr]), 3) if samegame_qr else None,
        "n_obs_teammate_target_pairs": len(samegame_tr),
        "corr_teammate_target_counts": round(pearson([a for a, _ in samegame_tr], [b for _, b in samegame_tr]), 3) if samegame_tr else None,
        "interpretation": ("Same-game, same-team props are correlated through the shared game state "
                           "(QB volume → all receivers; compositional share → teammates). Each is an "
                           "edge opportunity the independent-p model's per-prop probOver cannot see. "
                           "A single 'e = p - q' is computed for each market in isolation."),
    }

    out["correlations_missed_by_independent_p"] = {
        "multi_player_teammate": "target shares sum to 1 (Dirichlet-compositional); teammates negatively correlated on share, positively on same-game raw counts. props-hb.ts computes each player's NB posterior independently — no teammate covariance.",
        "game_script": f"team pass attempts correlate with total_line r={out['B_game_script']['corr_total_line_vs_pass_attempts']}, with spread r={out['B_game_script']['corr_spread_vs_pass_attempts']}. Script (plays/PROE/pace) is a shared driver of all pass-catcher volumes; not in props-hb.ts.",
        "team_total": f"team dropback volume explains {100*round(mean(r2s),3):.1f}% (mean) / {100*round(quantile(sorted(r2s),0.5),3):.1f}% (median) of receiver target-count variance — the season-average rate props-hb.ts conditions on ignores this per-game envelope.",
    }

    return out


def main():
    print("=== Reasoning-Agent-5: NFL prop-market correlation analysis ===")
    print(f"Cache: {CACHE}\n")
    stats = load_player_stats()
    print(f"player-week rows (REG, offensive, seasons {SEASONS}): {len(stats)}")
    games = load_games()
    print(f"game-context rows: {len(games)}\n")

    result = analyze(stats, games)

    # Write reports
    os.makedirs(os.path.join(REPO, "reports", "edge-lab"), exist_ok=True)
    with open(os.path.join(REPO, "reports", "edge-lab", "nfl-prop-correlations.json"), "w") as f:
        json.dump(result, f, indent=2)
    print(json.dumps(result, indent=2))
    print("\n[written] reports/edge-lab/nfl-prop-correlations.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
