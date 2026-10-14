#!/usr/bin/env python3
"""Build RIL, OLCD, PSR, PFE, CTF and score them. Does not touch CVI, BQP, or SWCC."""
import csv, json, math, os, sys, collections
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "ingest"))
import situational_metrics as sm
import schedule_meta as sched

GAMES = os.environ.get("GAMES_CSV", r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflverse_games.csv")
SNAP_DIR = os.environ.get("SNAP_DIR", r"C:/Users/Garrett/AppData/Local/hermes/cache/scratch/nflcache")
INJ_DIR = os.environ.get("INJ_DIR", r"C:/Users/Garrett/Sports/intelligence/audit/data/injuries")
PBP_DIRS = [
    r"C:/Users/Garrett/Sports/intelligence/audit/data",
    r"C:/Users/Garrett/Sports/intelligence/coaching/data",
]
PART_DIR = r"C:/Users/Garrett/Sports/intelligence/coaching/data"
PLAYERS = os.path.join(SNAP_DIR, "players.csv")
STADIUMS = os.path.join(HERE, "..", "..", "docs", "data-sources", "research", "2026-10-14", "ingest-samples", "stadiums.json")
OUT = HERE


def load_filter():
    rows = []
    with open(GAMES, newline="", encoding="utf-8") as f:
        for raw in csv.DictReader(f):
            if raw.get("game_type") != "REG":
                continue
            try:
                season, week = int(raw["season"]), int(raw["week"])
            except (TypeError, ValueError):
                continue
            if (season, week) < (2017, 1) or (season, week) > (2026, 5):
                continue
            def num(k):
                v = raw.get(k)
                if v in ("", "NA", None):
                    return None
                return float(v)
            hs, aws, sp = num("home_score"), num("away_score"), num("spread_line")
            if hs is None or aws is None or sp is None:
                continue
            ko = sm.kickoff(raw.get("gameday"), raw.get("gametime"))
            rows.append({
                "game_id": raw["game_id"], "season": season, "week": week,
                "home": raw["home_team"], "away": raw["away_team"],
                "spread": sp, "margin": hs - aws, "kickoff": ko,
                "home_rest": num("home_rest"), "away_rest": num("away_rest"),
                "location": raw.get("location"), "stadium_id": raw.get("stadium_id"),
                "gameday": raw.get("gameday"),
            })
    return rows


def gaussian_check(games):
    total = sum(sm.crps(g["spread"], sm.SIGMA, g["margin"]) for g in games)
    got = total / len(games)
    return len(games), got


def load_snaps():
    import pyarrow.parquet as pq
    by_team_game = collections.defaultdict(dict)
    team_order = collections.defaultdict(list)
    paths = []
    for y in range(2015, 2025):
        paths.append(os.path.join(SNAP_DIR, f"snap_counts_{y}.parquet"))
    paths.append(r"C:/Users/Garrett/Sports/intelligence/coaching/data/snap_counts_2025.parquet")
    for path in paths:
        if not os.path.exists(path):
            continue
        t = pq.read_table(path, columns=["game_id", "season", "week", "pfr_player_id", "position", "team", "offense_snaps", "offense_pct", "defense_snaps", "defense_pct"])
        n = t.num_rows
        gid, season, week = t.column("game_id").to_pylist(), t.column("season").to_pylist(), t.column("week").to_pylist()
        pid, pos, team = t.column("pfr_player_id").to_pylist(), t.column("position").to_pylist(), t.column("team").to_pylist()
        osn, op, dsn, dp = [t.column(c).to_pylist() for c in ("offense_snaps", "offense_pct", "defense_snaps", "defense_pct")]
        seen = set()
        for i in range(n):
            if not pid[i] or not team[i] or not gid[i]:
                continue
            def f(v):
                return 0.0 if v in (None, "", "NA") else float(v)
            by_team_game[(team[i], gid[i])][pid[i]] = (pos[i], f(op[i]), f(dp[i]), f(osn[i]), f(dsn[i]))
            key = (team[i], gid[i])
            if key not in seen:
                seen.add(key)
                team_order[team[i]].append((int(season[i]), int(week[i]), gid[i]))
    for team in team_order:
        team_order[team].sort()
    return by_team_game, team_order


def load_injuries():
    import pyarrow as pa
    import pyarrow.parquet as pq
    idx = collections.defaultdict(list)
    fails = collections.Counter()
    stamped_seasons = set()
    for y in range(2015, 2025):
        path = os.path.join(INJ_DIR, f"injuries_{y}.parquet")
        if not os.path.exists(path):
            fails[f"injury_file_absent_{y}"] += 1
            continue
        schema = set(pq.read_schema(path).names)
        if "date_modified" not in schema:
            fails[f"injury_season_no_date_modified_{y}"] += 1
            continue
        cols = [c for c in ("season", "week", "team", "gsis_id", "position", "report_status", "date_modified") if c in schema]
        table = pq.read_table(path, columns=cols)
        stamps = table.column("date_modified").cast(pa.string()).to_pylist()
        stamped_seasons.add(y)
        for i in range(table.num_rows):
            ts = sm.parse_ts(stamps[i])
            if ts is None:
                fails["injury_row_no_date_modified"] += 1
                continue
            idx[(int(table.column("season")[i].as_py()), int(table.column("week")[i].as_py()), table.column("team")[i].as_py())].append(
                (table.column("gsis_id")[i].as_py(), table.column("position")[i].as_py(), table.column("report_status")[i].as_py(), ts)
            )
    return idx, stamped_seasons, fails


def crosswalk():
    gsis_of = {}
    with open(PLAYERS, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("pfr_id") not in (None, "", "NA") and r.get("gsis_id") not in (None, "", "NA"):
                gsis_of[r["gsis_id"]] = r["pfr_id"]
    return gsis_of


def build_ril(games, snaps, order, inj, stamped, xw, fails):
    out = {}
    for g in games:
        if g["season"] not in stamped or g["kickoff"] is None:
            fails["ril_omit_season_or_kickoff"] += 1
            out[g["game_id"]] = None
            continue
        if g["home_rest"] is None or g["away_rest"] is None:
            fails["ril_omit_rest_missing"] += 1
            out[g["game_id"]] = None
            continue
        total = 0.0
        ok = True
        for team, rest in ((g["home"], g["home_rest"]), (g["away"], g["away_rest"])):
            prior = [gid for s, w, gid in order[team] if (s, w) < (g["season"], g["week"])][-3:]
            if len(prior) < 3:
                fails["ril_omit_lt3_prior_snaps"] += 1
                ok = False
                break
            deficit = max(0.0, 7.0 - rest)
            acc = 0.0
            for gsis, pos, status, ts in inj.get((g["season"], g["week"], team), []):
                if ts > g["kickoff"]:
                    fails["ril_injury_after_kickoff"] += 1
                    continue
                if status not in sm.STATUS_W or pos not in sm.POS_W:
                    fails["ril_status_or_position_unmapped"] += 1
                    continue
                pfr = xw.get(gsis)
                if not pfr:
                    fails["ril_no_crosswalk"] += 1
                    continue
                shares = []
                for gid in prior:
                    row = snaps.get((team, gid), {}).get(pfr)
                    if row:
                        shares.append(max(row[1], row[2]))
                if not shares:
                    fails["ril_player_no_prior_snaps"] += 1
                    continue
                acc += sm.STATUS_W[status] * sm.POS_W[pos] * (sum(shares) / len(shares))
            total += deficit * acc
        out[g["game_id"]] = total if ok else None
    return out


def build_olcd(games, snaps, order, fails):
    out = {}
    for g in games:
        sides = []
        ok = True
        for team in (g["home"], g["away"]):
            prior = [gid for s, w, gid in order[team] if (s, w) < (g["season"], g["week"])]
            if len(prior) < 4:
                fails["olcd_omit_lt4_prior"] += 1
                ok = False
                break
            window, before = prior[-3:], prior[:-3]
            if not before:
                fails["olcd_omit_no_starter_baseline"] += 1
                ok = False
                break
            share = collections.defaultdict(float)
            pos = {}
            for gid in before[-4:]:
                for pid, row in snaps.get((team, gid), {}).items():
                    if row[0] in sm.OL:
                        share[pid] += row[1]
                        pos[pid] = row[0]
            starters = [pid for pid, _ in sorted(share.items(), key=lambda kv: -kv[1])[:5]]
            if len(starters) < 5:
                fails["olcd_omit_lt5_ol"] += 1
                ok = False
                break
            returning = 0.0
            expected = 0.0
            for gid in window:
                rows = snaps.get((team, gid), {})
                team_off = max((row[3] for row in rows.values()), default=0.0)
                expected += 5.0 * team_off
                for pid in starters:
                    if pid in rows:
                        returning += rows[pid][3]
            if expected <= 0:
                fails["olcd_omit_expected_zero"] += 1
                ok = False
                break
            sides.append(1.0 - returning / expected)
        out[g["game_id"]] = None if not ok else sum(sides) / 2.0
    return out


def build_psr(games, fails):
    import pyarrow.parquet as pq
    agg = collections.defaultdict(lambda: [0, 0.0, 0.0])
    used = []
    for y in list(range(2016, 2025)) + [2025, 2026]:
        path = None
        name = f"pbp_{y}.parquet" if y <= 2024 else f"play_by_play_{y}.parquet"
        for d in PBP_DIRS:
            cand = os.path.join(d, name)
            if os.path.exists(cand):
                path = cand
                break
        if not path:
            fails[f"psr_pbp_absent_{y}"] += 1
            continue
        schema = set(pq.read_schema(path).names)
        need = {"game_id", "defteam", "qb_dropback", "sack", "qb_hit"}
        if not need <= schema:
            fails[f"psr_pbp_missing_columns_{y}"] += 1
            continue
        t = pq.read_table(path, columns=list(need))
        gid, dteam = t.column("game_id").to_pylist(), t.column("defteam").to_pylist()
        drop, sack, hit = t.column("qb_dropback").to_pylist(), t.column("sack").to_pylist(), t.column("qb_hit").to_pylist()
        for i in range(t.num_rows):
            if drop[i] != 1 or not dteam[i]:
                continue
            rec = agg[(dteam[i], gid[i])]
            rec[0] += 1
            rec[1] += float(sack[i] or 0)
            rec[2] += float(hit[i] or 0)
        used.append(os.path.basename(path))
    by_team = collections.defaultdict(list)
    ko = {g["game_id"]: (g["season"], g["week"]) for g in games}
    # include agg games even if not in filter, keyed by season-week from games plus any id
    all_ids = {}
    with open(GAMES, newline="", encoding="utf-8") as f:
        for raw in csv.DictReader(f):
            try:
                all_ids[raw["game_id"]] = (int(raw["season"]), int(raw["week"]))
            except (TypeError, ValueError):
                continue
    for (team, gid), rec in agg.items():
        if gid in all_ids:
            by_team[team].append((all_ids[gid], rec))
    for team in by_team:
        by_team[team].sort()
    out = {}
    for g in games:
        sides = []
        ok = True
        for team in (g["home"], g["away"]):
            prior = [rec for key, rec in by_team[team] if key < (g["season"], g["week"])]
            if not prior:
                fails["psr_omit_no_prior_pbp"] += 1
                ok = False
                break
            drops = sum(r[0] for r in prior)
            sacks = sum(r[1] for r in prior)
            hits = sum(r[2] for r in prior)
            if drops == 0 or hits == 0:
                fails["psr_omit_zero_pressure"] += 1
                ok = False
                break
            # league expected uses the same prior window across both teams' history is team-specific.
            # expected sack rate given this unit's pressure rate = (its own earlier sack/pressure ratio is circular).
            # Use the rate: sack_rate - (league not available here without a second pass).
            # Second pass below replaces this.
            sides.append((sacks / drops, hits / drops, drops, sacks, hits))
        out[g["game_id"]] = None if not ok else sides
    # league expected from all prior defensive games, computed per game from games strictly before it
    league = []
    for team, rows in by_team.items():
        for key, rec in rows:
            league.append((key, rec))
    league.sort()
    values = {}
    for g in games:
        sides = out[g["game_id"]]
        if sides is None:
            values[g["game_id"]] = None
            continue
        prior = [rec for key, rec in league if key < (g["season"], g["week"])]
        ld, ls, lh = sum(r[0] for r in prior), sum(r[1] for r in prior), sum(r[2] for r in prior)
        if lh == 0:
            fails["psr_omit_no_league_pressure"] += 1
            values[g["game_id"]] = None
            continue
        ratio = ls / lh
        acc = 0.0
        for sack_rate, press_rate, *_ in sides:
            expected = ratio * press_rate
            acc += abs(sack_rate - expected)
        values[g["game_id"]] = acc
    fails["psr_files"] = used
    return values


def entropy(counts):
    n = sum(counts.values())
    if n == 0:
        return None
    h = 0.0
    for c in counts.values():
        p = c / n
        if p > 0:
            h -= p * math.log(p)
    return h


def build_pfe(games, fails):
    import pyarrow.parquet as pq
    # discover a team column
    sample = os.path.join(PART_DIR, "pbp_participation_2024.parquet")
    names = set(pq.read_schema(sample).names)
    team_col = next((c for c in ("possession_team", "posteam", "offense_team") if c in names), None)
    if team_col is None:
        fails["pfe_no_team_column"] += 1
        return {g["game_id"]: None for g in games}, names
    by = collections.defaultdict(collections.Counter)
    for y in range(2016, 2026):
        path = os.path.join(PART_DIR, f"pbp_participation_{y}.parquet")
        if not os.path.exists(path):
            fails[f"pfe_file_absent_{y}"] += 1
            continue
        t = pq.read_table(path, columns=["nflverse_game_id", team_col, "offense_personnel"])
        gid, team, pers = t.column("nflverse_game_id").to_pylist(), t.column(team_col).to_pylist(), t.column("offense_personnel").to_pylist()
        for i in range(t.num_rows):
            if gid[i] and team[i] and pers[i]:
                by[(team[i], gid[i])][pers[i]] += 1
    id_key = {g["game_id"]: (g["season"], g["week"]) for g in games}
    all_ids = {}
    with open(GAMES, newline="", encoding="utf-8") as f:
        for raw in csv.DictReader(f):
            try:
                all_ids[raw["game_id"]] = (int(raw["season"]), int(raw["week"]))
            except (TypeError, ValueError):
                continue
    hist = collections.defaultdict(list)
    for (team, gid), counts in by.items():
        if gid in all_ids:
            hist[team].append((all_ids[gid], counts))
    for team in hist:
        hist[team].sort()
    out = {}
    for g in games:
        sides = []
        ok = True
        for team in (g["home"], g["away"]):
            prior = [c for key, c in hist[team] if key < (g["season"], g["week"])][-4:]
            if len(prior) < 4:
                fails["pfe_omit_lt4_prior"] += 1
                ok = False
                break
            merged = collections.Counter()
            for c in prior:
                merged.update(c)
            h = entropy(merged)
            if h is None:
                ok = False
                break
            sides.append(h)
        out[g["game_id"]] = None if not ok else sum(sides) / 2.0
    return out, names


def build_ctf(games, fails):
    raw = open(GAMES, "rb").read()
    stadiums = json.load(open(STADIUMS, encoding="utf-8"))
    rows = {r["game_id"]: r for r in sched.build(raw, stadiums, 2015, 2026)}
    out = {}
    for g in games:
        smeta = rows.get(g["game_id"])
        if not smeta:
            fails["ctf_omit_no_schedule_row"] += 1
            out[g["game_id"]] = None
            continue
        miles, tz = smeta.get("away_travel_miles"), smeta.get("away_tz_shift_h")
        if miles is None or tz is None or g["away_rest"] is None:
            fails["ctf_omit_null_travel_tz_or_rest"] += 1
            out[g["game_id"]] = None
            continue
        short = 1.0 if g["away_rest"] < 7 else 0.5
        out[g["game_id"]] = abs(tz) * math.log1p(miles) * short
    return out


def main():
    games = load_filter()
    n, got = gaussian_check(games)
    print("GAUSSIAN", n, round(got, 6))
    if n != 2462 or abs(got - sm.EXPECTED) > 1e-5:
        print("STOP baseline disagrees")
        print("expected", 2462, sm.EXPECTED)
        print("got", n, got)
        sys.exit(2)
    snaps, order = load_snaps()
    inj, stamped, fails = load_injuries()
    xw = crosswalk()
    ril = build_ril(games, snaps, order, inj, stamped, xw, fails)
    olcd = build_olcd(games, snaps, order, fails)
    psr = build_psr(games, fails)
    pfe, pfe_cols = build_pfe(games, fails)
    ctf = build_ctf(games, fails)
    feats = {"RIL": ril, "OLCD": olcd, "PSR": psr, "PFE": pfe, "CTF": ctf}
    diagnostics = {}
    for name, values in feats.items():
        diagnostics[name] = sm.score_feature(games, values)
        diagnostics[name]["n_defined"] = sum(1 for v in values.values() if v is not None)
        diagnostics[name]["failed_closed"] = {k: v for k, v in fails.items() if k.startswith(name.lower()) or k.startswith(name[:3].lower())}
    improving = [k for k, d in diagnostics.items() if d["delta"] is not None and d["delta"] < 0 and d["status"] != "REFUSED"]
    combination = None
    if len(improving) >= 2:
        # score only the improving pair/set on games where every improving feature is defined
        combo_values = {}
        for g in games:
            if all(feats[k].get(g["game_id"]) is not None for k in improving):
                combo_values[g["game_id"]] = sum(feats[k][g["game_id"]] for k in improving)
            else:
                combo_values[g["game_id"]] = None
        combination = {"features": improving, "score": sm.score_feature(games, combo_values), "passed": False}
    else:
        combination = {"run": False, "reason": "fewer than two features improved alone", "improving": improving}
    report = {
        "label": "DIAGNOSTIC. Not an emission weight. passed stays false.",
        "filter": "REG 2017 W1 through 2026 W5, non-null scores and spread_line",
        "gaussian_baseline": {"n": n, "crps": round(got, 6), "matches_7.154021": True},
        "delta_definition": "crps_with - crps_without. Refuse when delta >= 0.",
        "weights": {"status": sm.STATUS_W, "position": {k: v for k, v in sorted(sm.POS_W.items())}},
        "diagnostics": diagnostics,
        "combination": combination,
        "failed_closed_counts": dict(fails),
        "pfe_columns_seen": sorted(pfe_cols) if isinstance(pfe_cols, set) else pfe_cols,
        "untouched": ["CVI", "BQP", "SWCC"],
        "passed": False,
    }
    json.dump(report, open(os.path.join(OUT, "situational_diagnostics.json"), "w"), indent=1)
    for name, d in diagnostics.items():
        print(name, d["status"], "n", d["n_feature_defined_and_scored"], "delta", d["delta"], "with", d["crps_with"], "without", d["crps_without"])
    print("combination", combination.get("run", combination.get("features")))


if __name__ == "__main__":
    main()
