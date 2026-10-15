#!/usr/bin/env python3
"""SAI diagnostics build -- the seven P1 situational metrics, ingested for every
frozen-filter game and screened under the kill-only asymmetric screen protocol
(Opus adversarial review, 2026-10-15).

Spec source: Oct 14 "Architectural Deepening" Drive doc (wf_situational_engine.py
family). Formulas were recovered verbatim from the doc's OMML equations; the doc's
own kernels (wf_situational_engine.py, landed alongside) are used where they fit.

TARGET PARAMETER DECLARATIONS (mu = +spread_line is LOCKED; a metric with no
dispersion pathway has no hypothesis):
  BQP    -> sigma scale:  sigma_adj = sigma_base * (1 + beta * max(0, BQP))
  SWCC   -> sigma scale:  sigma_adj = sigma_base * exp(beta * SWCC)
  RIL-P1 -> sigma scale:  sigma_adj = sigma_base * (1 + beta_sum * RIL_sum
                          + beta_diff * |dRIL|)   [screened as two 1-D looks]
  QPTSR  -> sigma scale:  sigma_adj = sigma_base * (1 + beta * QPTSR)
  OLCAI  -> sigma scale:  sigma_adj = sigma_base * exp(beta * OLCAI)
  SPESE  -> sigma scale:  sigma_adj = sigma_base * (1 + beta * (SPESE - SPESE_bar))
            AND atom weight: P_adj(|M|=7) = clip(P_base(|M|=7) + gamma*(SPESE
            - SPESE_bar), 0, 0.14), P_adj(|M|=3) = p_37 - P_adj(|M|=7)
  CAOFI  -> sigma scale:  sigma_adj = sigma_base * (1 + beta * CAOFI)
  SAI    -> sigma scale (composite of cleared constituents only)

SCREEN PROTOCOL (kill-only, asymmetric): degradation on the operative reference
-> REFUSED and recorded; improvement -> future-filter pre-registration slot only
(never a weight, never a promotion). Operative reference = family-2 construction
(7.133199) where composable, else the Gaussian baseline (7.154021) with the
non-conditional flag set. SWCC is NOT screened here (REFUSED on prior corpora).
BQP is NOT screened here (PARKED: leak audit + corpus-overlap counts pending).

Emission: ZERO_OBJECT. walk_forward.json is never written. passed stays false.
"""
from __future__ import annotations

import collections
import csv
import json
import math
import os
import sys
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import wf_situational_engine as eng  # the doc's own module (kernels + harness)

DATA = os.environ.get("SAI_DATA_DIR", os.path.expanduser("~/workspace/sai-build/data"))
STADIUMS_JSON = os.environ.get("SAI_STADIUMS", os.path.expanduser("~/workspace/sai-build/ref/stadiums.json"))
SIGMA = 13.45
BASELINE_CRPS = 7.154021
FAMILY2_CRPS = 7.133199
GATE = 7.099
ET = ZoneInfo("America/New_York")

STATUS_WEIGHTS = eng.STATUS_WEIGHTS
POS_WEIGHTS = eng.POS_WEIGHTS
OFF_POS = {"QB", "RB", "FB", "HB", "WR", "TE", "C", "G", "T", "OT", "OG", "OL", "LT", "LG", "RT", "RG", "C/G", "G/C", "T/G", "G/T"}
OL_INJ_POS = {"C", "G", "T", "OT", "OG", "OL", "LT", "LG", "RT", "RG", "C/G", "G/C", "T/G", "G/T"}
OL_SNAP_POS = {"T", "G", "C", "OL"}
SKILL_POS = {"QB", "RB", "WR", "TE", "FB", "HB"}


def parse_ts(value):
    return eng.parse_ts_utc(value)


def kickoff_utc(gameday, gametime):
    if not gameday or not gametime or gametime in ("", "NA"):
        return None
    try:
        local = datetime.strptime(gameday + " " + gametime, "%Y-%m-%d %H:%M").replace(tzinfo=ET)
    except ValueError:
        return None
    return local.astimezone(timezone.utc)


# --------------------------------------------------------------------------
# Schedule / filter
# --------------------------------------------------------------------------

def load_games():
    """All REG games 2015-2026 from nflverse games.csv + the frozen filter."""
    path = os.path.join(DATA, "games.csv")
    all_rows = []
    with open(path, newline="", encoding="utf-8") as f:
        for x in csv.DictReader(f):
            if x.get("game_type") != "REG":
                continue
            try:
                s, w = int(x["season"]), int(x["week"])
            except (TypeError, ValueError, KeyError):
                continue

            def num(k):
                v = x.get(k)
                if v in ("", "NA", None):
                    return None
                try:
                    return float(v)
                except ValueError:
                    return None

            all_rows.append({
                "game_id": x["game_id"], "season": s, "week": w,
                "home": x.get("home_team"), "away": x.get("away_team"),
                "home_score": num("home_score"), "away_score": num("away_score"),
                "spread": num("spread_line"), "total_line": num("total_line"),
                "home_rest": num("home_rest"), "away_rest": num("away_rest"),
                "gameday": x.get("gameday"), "gametime": x.get("gametime"),
                "kickoff": kickoff_utc(x.get("gameday"), x.get("gametime")),
                "location": x.get("location"), "stadium_id": x.get("stadium_id"),
                "referee": x.get("referee"),
            })
    filt = []
    for g in all_rows:
        if not (g["season"] >= 2017 and (g["season"] < 2026 or (g["season"] == 2026 and g["week"] <= 5))):
            continue
        if g["home_score"] is None or g["away_score"] is None or g["spread"] is None:
            continue
        g = dict(g)
        g["margin"] = g["home_score"] - g["away_score"]
        filt.append(g)
    filt.sort(key=lambda g: (g["season"], g["week"], g["game_id"]))
    return all_rows, filt


def load_stadiums():
    st = json.load(open(STADIUMS_JSON, encoding="utf-8"))
    return {r["stadium_id"]: r for r in st["rows"]}


def build_schedule_meta(all_rows, stadiums):
    """Per schedule_meta.py (dfs/ingest): away origin = most frequent home
    stadium_id of the away team that season; travel = haversine(origin, venue);
    tz offsets evaluated at kickoff. Missing venue fields -> None (no imputation)."""
    home_site = collections.defaultdict(collections.Counter)
    for g in all_rows:
        if g["location"] == "Home" and g["stadium_id"]:
            home_site[(g["season"], g["home"])][g["stadium_id"]] += 1

    def offset_h(tzname, when_utc):
        if not tzname or when_utc is None:
            return None
        return ZoneInfo(tzname).utcoffset(when_utc.replace(tzinfo=None)).total_seconds() / 3600.0

    meta = {}
    for g in all_rows:
        v = stadiums.get(g["stadium_id"] or "", {})
        origin_id = home_site[(g["season"], g["away"])].most_common(1)
        o = stadiums.get(origin_id[0][0], {}) if origin_id else {}
        miles = None
        if o.get("lat") is not None and v.get("lat") is not None:
            miles = eng.haversine_miles(o["lat"], o["lon"], v["lat"], v["lon"])
        ko = g["kickoff"]
        meta[g["game_id"]] = {
            "travel_miles_away": miles,
            "venue": v, "origin": o,
            "tz_venue_off": offset_h(v.get("timezone"), ko),
            "tz_away_home_off": offset_h(o.get("timezone"), ko),
            "tz_home_home_off": None,  # filled below (home team's own origin)
            "venue_alt_m": v.get("altitude_m"),
            "away_home_alt_m": o.get("altitude_m"),
        }
    # home team's home-stadium tz (for circadian: TZ_home is the home team's base tz)
    for g in all_rows:
        hid = home_site[(g["season"], g["home"])].most_common(1)
        h = stadiums.get(hid[0][0], {}) if hid else {}
        meta[g["game_id"]]["tz_home_home_off"] = offset_h(h.get("timezone"), g["kickoff"])
        meta[g["game_id"]]["home_origin"] = h
    return meta


# --------------------------------------------------------------------------
# Snaps
# --------------------------------------------------------------------------

def load_snaps():
    import pyarrow.parquet as pq
    snaps = {}          # (team, game_id) -> {pfr: dict}
    team_games = collections.defaultdict(list)  # team -> [(season, week, game_id)]
    for y in range(2015, 2027):
        path = os.path.join(DATA, f"snap_counts_{y}.parquet")
        if not os.path.exists(path):
            continue
        t = pq.read_table(path, columns=["game_id", "season", "week", "pfr_player_id", "position",
                                         "team", "offense_snaps", "offense_pct", "defense_snaps",
                                         "defense_pct", "st_snaps", "st_pct"])
        cols = {c: t.column(c).to_pylist() for c in t.column_names}
        seen = set()
        for i in range(t.num_rows):
            team, gid, pid = cols["team"][i], cols["game_id"][i], cols["pfr_player_id"][i]
            if not team or not gid or not pid:
                continue

            def f(v):
                return 0.0 if v in (None, "", "NA") else float(v)

            snaps.setdefault((team, gid), {})[pid] = {
                "pos": cols["position"][i],
                "off_snaps": f(cols["offense_snaps"][i]), "off_pct": f(cols["offense_pct"][i]),
                "def_snaps": f(cols["defense_snaps"][i]), "def_pct": f(cols["defense_pct"][i]),
                "st_snaps": f(cols["st_snaps"][i]), "st_pct": f(cols["st_pct"][i]),
            }
            if (team, gid) not in seen:
                seen.add((team, gid))
                team_games[team].append((int(cols["season"][i]), int(cols["week"][i]), gid))
    for team in team_games:
        team_games[team].sort()
    return snaps, team_games


def unit_total(snaps, team, gid, unit):
    """Team plays in a unit = max single-player unit snaps (iron-man count)."""
    rows = snaps.get((team, gid), {})
    key = {"off": "off_snaps", "def": "def_snaps", "st": "st_snaps"}[unit]
    return max((r[key] for r in rows.values()), default=0.0)


def prior_team_games(team_games, team, season, week, n=None):
    prior = [gid for (s, w, gid) in team_games.get(team, []) if (s, w) < (season, week)]
    return prior if n is None else prior[-n:]


def player_share(snaps, team_games, team, pfr, season, week, unit, n_games=3):
    """Player unit-snap share over the team's prior n_games games.
    None if the team has no prior games or the player has no snap rows at all
    in the window (unverifiable). Absence in one game counts as 0 there."""
    prior = prior_team_games(team_games, team, season, week, n_games)
    if not prior:
        return None
    key = {"off": "off_snaps", "def": "def_snaps", "st": "st_snaps"}[unit]
    num = 0.0
    den = 0.0
    seen = False
    for gid in prior:
        den += unit_total(snaps, team, gid, unit)
        row = snaps.get((team, gid), {}).get(pfr)
        if row is not None:
            seen = True
            num += row[key]
    if not seen or den <= 0:
        return None
    return num / den


# --------------------------------------------------------------------------
# Injuries + crosswalk
# --------------------------------------------------------------------------

def load_injuries():
    import pyarrow.parquet as pq
    idx = collections.defaultdict(list)       # (season, week, team) -> [row]
    unstamped_report = set()                  # (season, week, team) with an unstamped row
    stamped_seasons = set()
    for y in range(2015, 2027):
        path = os.path.join(DATA, f"injuries_{y}.parquet")
        if not os.path.exists(path):
            continue
        schema = set(pq.read_schema(path).names)
        if "date_modified" not in schema:
            continue
        stamped_seasons.add(y)
        t = pq.read_table(path, columns=["season", "week", "team", "gsis_id", "position",
                                         "report_status", "date_modified"])
        cols = {c: t.column(c).to_pylist() for c in t.column_names}
        for i in range(t.num_rows):
            key = (int(cols["season"][i]), int(cols["week"][i]), cols["team"][i])
            ts = parse_ts(str(cols["date_modified"][i]) if cols["date_modified"][i] is not None else None)
            if ts is None:
                unstamped_report.add(key)
            idx[key].append({
                "gsis": cols["gsis_id"][i], "pos": cols["position"][i],
                "status": cols["report_status"][i], "ts": ts,
            })
    return idx, unstamped_report, stamped_seasons


def load_crosswalk():
    gsis_of_pfr = {}
    pfr_of_gsis = {}
    path = os.path.join(DATA, "players.csv")
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            g, p = r.get("gsis_id"), r.get("pfr_id")
            if g in (None, "", "NA") or p in (None, "", "NA"):
                continue
            pfr_of_gsis[g] = p
            gsis_of_pfr[p] = g
    return pfr_of_gsis, gsis_of_pfr


# --------------------------------------------------------------------------
# PBP aggregates (computed once over 2015-2026; all windows strictly prior)
# --------------------------------------------------------------------------

PBP_COLS = ["game_id", "season", "week", "play_id", "posteam", "defteam", "play_type",
            "qb_dropback", "sack", "qb_hit", "qb_scramble", "passer_player_id",
            "rusher_player_id", "receiver_player_id", "epa", "wp", "qtr",
            "game_seconds_remaining", "yards_gained", "pass", "rush",
            "series", "series_success", "penalty", "penalty_yards"]


def load_pbp_aggregates():
    import pyarrow.parquet as pq
    agg = {
        "epa_passer": collections.defaultdict(lambda: [0.0, 0]),    # (gid, gsis) -> [sum, n]
        "epa_rusher": collections.defaultdict(lambda: [0.0, 0]),
        "epa_receiver": collections.defaultdict(lambda: [0.0, 0]),
        "qb_dropbacks": collections.defaultdict(collections.Counter),  # gid -> Counter gsis
        "def_pressure_pbp": collections.defaultdict(lambda: [0, 0, 0]),  # (gid, defteam) -> [dropbacks, sacks, hits]
        "qb_scramble": collections.defaultdict(lambda: [0, 0]),     # (gid, gsis) -> [scrambles, dropbacks]
        "team_game_order": {},                                      # gid -> (season, week)
        "spese_off": collections.defaultdict(lambda: [0, 0, 0, 0]),  # (gid, posteam) -> [plays, explosive, series_n, series_stalled]
        "spese_def": collections.defaultdict(lambda: [0, 0, 0, 0]),  # (gid, defteam) -> [plays_faced, explosive_allowed, series_n, series_stalled_forced]
        "neutral_minutes": {},                                      # gid -> neutral-script Q1-3 clock minutes
        "game_penalty": collections.defaultdict(lambda: [0.0, 0]),  # gid -> [penalty_yards, plays]
        "series_seen": collections.defaultdict(dict),               # (gid, posteam) -> {series: success}
    }
    for y in range(2015, 2027):
        path = os.path.join(DATA, f"play_by_play_{y}.parquet")
        if not os.path.exists(path):
            continue
        t = pq.read_table(path, columns=PBP_COLS)
        d = t.to_pandas()
        for gid, s, w in zip(d["game_id"], d["season"], d["week"]):
            agg["team_game_order"][gid] = (int(s), int(w))
        # EPA attribution
        for role, col in (("epa_passer", "passer_player_id"), ("epa_rusher", "rusher_player_id"),
                          ("epa_receiver", "receiver_player_id")):
            sub = d[d[col].notna() & d["epa"].notna()]
            for (gid, p), grp in sub.groupby([sub["game_id"], sub[col]]):
                agg[role][(gid, p)][0] += float(grp["epa"].sum())
                agg[role][(gid, p)][1] += len(grp)
        # QB dropbacks + scrambles
        db = d[d["qb_dropback"] == 1]
        for (gid, p), grp in db.groupby([db["game_id"], db["passer_player_id"]]):
            if isinstance(p, str) and p:
                agg["qb_dropbacks"][gid][p] += len(grp)
                agg["qb_scramble"][(gid, p)][0] += int((grp["qb_scramble"] == 1).sum())
                agg["qb_scramble"][(gid, p)][1] += len(grp)
        # Defensive pressure (PBP fallback definition: sacks + hits per dropback faced)
        for (gid, dt), grp in db.groupby([db["game_id"], db["defteam"]]):
            if isinstance(dt, str) and dt:
                rec = agg["def_pressure_pbp"][(gid, dt)]
                rec[0] += len(grp)
                rec[1] += int((grp["sack"] == 1).sum())
                rec[2] += int((grp["qb_hit"] == 1).sum())
        # Penalties (CAOFI RefChaos input)
        for gid, grp in d.groupby(d["game_id"]):
            pen = grp[grp["penalty"] == 1]
            agg["game_penalty"][gid][0] += float(pen["penalty_yards"].fillna(0).sum())
            agg["game_penalty"][gid][1] += len(grp)
        # SPESE neutral-script aggregates: Q1-3, 0.05 <= wp <= 0.95, pass/run plays
        neu = d[(d["qtr"] <= 3) & (d["wp"] >= 0.05) & (d["wp"] <= 0.95) &
                ((d["pass"] == 1) | (d["rush"] == 1)) & d["posteam"].notna()]
        for (gid, pt), grp in neu.groupby([neu["game_id"], neu["posteam"]]):
            expl = int(((grp["rush"] == 1) & (grp["yards_gained"] >= 10) |
                        (grp["pass"] == 1) & (grp["yards_gained"] >= 20)).sum())
            rec = agg["spese_off"][(gid, pt)]
            rec[0] += len(grp)
            rec[1] += expl
        for (gid, dt), grp in neu.groupby([neu["game_id"], neu["defteam"]]):
            if not isinstance(dt, str) or not dt:
                continue
            expl_al = int(((grp["rush"] == 1) & (grp["yards_gained"] >= 10) |
                           (grp["pass"] == 1) & (grp["yards_gained"] >= 20)).sum())
            rec = agg["spese_def"][(gid, dt)]
            rec[0] += len(grp)
            rec[1] += expl_al
        # series outcomes under neutral script (per offense)
        for (gid, pt, ser), grp in neu.groupby([neu["game_id"], neu["posteam"], neu["series"]]):
            agg["series_seen"][(gid, pt)][ser] = int(grp["series_success"].max())
        for (gid, pt), series_map in agg["series_seen"].items():
            pass  # counted in finalize step below (needs defteam per series; done in finalize)
        # neutral clock minutes per game: sum of gsr gaps between consecutive
        # Q1-3 plays where the earlier play is neutral-script
        for gid, grp in d[d["qtr"] <= 3].groupby(d["game_id"]):
            g = grp.sort_values("game_seconds_remaining", ascending=False)
            gsr = g["game_seconds_remaining"].to_numpy()
            wpv = g["wp"].to_numpy()
            secs = 0.0
            for i in range(len(gsr) - 1):
                if wpv[i] is not None and 0.05 <= wpv[i] <= 0.95 and gsr[i] == gsr[i] and gsr[i + 1] == gsr[i + 1]:
                    secs += max(0.0, float(gsr[i]) - float(gsr[i + 1]))
            agg["neutral_minutes"][gid] = secs / 60.0
    # finalize series counts into spese_off / spese_def
    # defteam per (gid, posteam): the opponent in that game
    return agg


def finalize_spese_series(agg, game_teams):
    """Fold per-series outcomes into spese_off (offense stall) and spese_def
    (stalls forced). game_teams: gid -> (home, away)."""
    for (gid, pt), series_map in agg["series_seen"].items():
        teams = game_teams.get(gid)
        if not teams:
            continue
        home, away = teams
        dt = away if pt == home else home
        n = len(series_map)
        stalled = sum(1 for v in series_map.values() if v == 0)
        agg["spese_off"][(gid, pt)][2] += n
        agg["spese_off"][(gid, pt)][3] += stalled
        agg["spese_def"][(gid, dt)][2] += n
        agg["spese_def"][(gid, dt)][3] += stalled
    del agg["series_seen"]


def load_participation_aggregates():
    """Quick-pressure aggregates from pbp_participation (2018-2025), joined to
    PBP for passer identity and sack outcomes.
    Returns (qp_qb, prr_def, seasons_present, note):
      qp_qb[(gid, gsis)] = [quick_pressures, sacks_on_quick]
      prr_def[(gid, defteam)] = [pressures, dropbacks_faced]"""
    import pyarrow.parquet as pq
    qp_qb = collections.defaultdict(lambda: [0, 0])
    prr_def = collections.defaultdict(lambda: [0, 0])
    seasons = []
    note = None
    # PBP lookup for (gid, play_id) -> (passer, sack, qb_dropback, defteam)
    pbp_lookup = {}
    for y in range(2018, 2027):
        path = os.path.join(DATA, f"play_by_play_{y}.parquet")
        if not os.path.exists(path):
            continue
        t = pq.read_table(path, columns=["game_id", "play_id", "passer_player_id", "sack",
                                         "qb_dropback", "defteam"])
        d = t.to_pandas()
        def _i(x):
            return 0 if x is None or (isinstance(x, float) and math.isnan(x)) else int(x)

        for gid, pid, psr, sk, qbd, dt in zip(d["game_id"], d["play_id"], d["passer_player_id"],
                                              d["sack"], d["qb_dropback"], d["defteam"]):
            pbp_lookup[(gid, pid)] = (psr, _i(sk), _i(qbd), dt)
    for y in range(2018, 2027):
        path = os.path.join(DATA, f"pbp_participation_{y}.parquet")
        if not os.path.exists(path):
            continue
        schema = set(pq.read_schema(path).names)
        if not {"nflverse_game_id", "play_id", "was_pressure", "time_to_throw"} <= schema:
            note = f"participation {y}: required columns absent ({sorted(schema)[:8]}...)"
            continue
        seasons.append(y)
        t = pq.read_table(path, columns=["nflverse_game_id", "play_id", "was_pressure", "time_to_throw"])
        d = t.to_pandas()
        for gid, pid, wp_, ttt in zip(d["nflverse_game_id"], d["play_id"], d["was_pressure"], d["time_to_throw"]):
            lk = pbp_lookup.get((gid, pid))
            if lk is None:
                continue
            psr, sk, qbd, dt = lk
            if qbd != 1:
                continue
            if isinstance(dt, str) and dt:
                prr_def[(gid, dt)][1] += 1
                if wp_ == 1:
                    prr_def[(gid, dt)][0] += 1
            if wp_ == 1 and ttt is not None and ttt == ttt and float(ttt) < 2.5 and isinstance(psr, str) and psr:
                qp_qb[(gid, psr)][0] += 1
                qp_qb[(gid, psr)][1] += sk
    return qp_qb, prr_def, seasons, note


# --------------------------------------------------------------------------
# Cumulative prior-window helpers
# --------------------------------------------------------------------------

import bisect


class CumSeries:
    """Sorted ((season, week), values...) rows with prefix sums for PIT lookups."""

    def __init__(self):
        self.keys = []
        self.rows = []

    def add(self, key, vals):
        self.keys.append(key)
        self.rows.append(vals)

    def finalize(self):
        order = sorted(range(len(self.keys)), key=lambda i: self.keys[i])
        self.keys = [self.keys[i] for i in order]
        self.rows = [self.rows[i] for i in order]
        self.prefix = [[0.0] * len(self.rows[0])] if self.rows else []
        for r in self.rows:
            prev = self.prefix[-1]
            self.prefix.append([prev[j] + r[j] for j in range(len(r))])
        if not self.rows:
            self.prefix = [[0.0]]

    def prior(self, key):
        """Sum of rows with (season, week) strictly before key."""
        i = bisect.bisect_left(self.keys, key)
        return self.prefix[i]


def build_cumseries(agg, filt_keys_from=2015):
    """Cumulative series for EPA pools, QB traits, defensive pressure, league pace."""
    order = agg["team_game_order"]  # gid -> (season, week)
    cs = {}
    # EPA pools by (role, group): group QB / RB / WRTE from snap positions is
    # resolved by the caller via pos_of; pools here are role-level with a
    # per-player series, plus league role pools keyed by group filled later.
    cs["epa_player"] = {}  # (role, gsis) -> CumSeries of [sum_epa, n]
    for role in ("epa_passer", "epa_rusher", "epa_receiver"):
        per_player = collections.defaultdict(list)
        for (gid, p), (s, n) in agg[role].items():
            key = order.get(gid)
            if key is None:
                continue
            per_player[p].append((key, s, n))
        for p, rows in per_player.items():
            ser = CumSeries()
            for key, s, n in sorted(rows):
                ser.add(key, [s, n])
            ser.finalize()
            cs["epa_player"][(role, p)] = ser
    # QB dropbacks / scrambles (PBP)
    qb = collections.defaultdict(list)
    for gid, counter in agg["qb_dropbacks"].items():
        key = order.get(gid)
        if key is None:
            continue
        for p, c in counter.items():
            sc, dbn = agg["qb_scramble"].get((gid, p), [0, 0])
            qb[p].append((key, c, sc))
    cs["qb"] = {}
    for p, rows in qb.items():
        ser = CumSeries()
        for key, c, sc in sorted(rows):
            ser.add(key, [c, sc])
        ser.finalize()
        cs["qb"][p] = ser
    # Defensive pressure, PBP fallback flavor: (gid, defteam) -> [dropbacks, sacks, hits]
    dfb = collections.defaultdict(list)
    for (gid, dt), (dbn, sk, ht) in agg["def_pressure_pbp"].items():
        key = order.get(gid)
        if key is None:
            continue
        dfb[dt].append((key, dbn, sk, ht))
    cs["def_pbp"] = {}
    for dt, rows in dfb.items():
        ser = CumSeries()
        for key, dbn, sk, ht in sorted(rows):
            ser.add(key, [dbn, sk, ht])
        ser.finalize()
        cs["def_pbp"][dt] = ser
    return cs


def build_participation_series(qp_qb, prr_def, order):
    cs_qb = {}
    per = collections.defaultdict(list)
    for (gid, p), (qp, sk) in qp_qb.items():
        key = order.get(gid)
        if key is not None:
            per[p].append((key, qp, sk))
    for p, rows in per.items():
        ser = CumSeries()
        for key, qp, sk in sorted(rows):
            ser.add(key, [qp, sk])
        ser.finalize()
        cs_qb[p] = ser
    cs_def = {}
    perd = collections.defaultdict(list)
    for (gid, dt), (pr, dbn) in prr_def.items():
        key = order.get(gid)
        if key is not None:
            perd[dt].append((key, pr, dbn))
    for dt, rows in perd.items():
        ser = CumSeries()
        for key, pr, dbn in sorted(rows):
            ser.add(key, [pr, dbn])
        ser.finalize()
        cs_def[dt] = ser
    return cs_qb, cs_def


# --------------------------------------------------------------------------
# Feature builders. Each returns (values {game_id: float|None}, fails Counter).
# --------------------------------------------------------------------------

def pos_group_of(pos):
    if pos == "QB":
        return "QB"
    if pos in ("RB", "FB", "HB"):
        return "RB"
    if pos in ("WR", "TE"):
        return "WRTE"
    return None


def build_bqp(filt, ctx):
    fails = collections.Counter()
    values = {}
    snaps, team_games = ctx["snaps"], ctx["team_games"]
    inj, stamped = ctx["inj"], ctx["stamped_seasons"]
    pfr_of_gsis, gsis_of_pfr = ctx["pfr_of_gsis"], ctx["gsis_of_pfr"]
    cs = ctx["cum"]
    agg = ctx["agg"]
    # position of a player in his most recent prior game (from snaps)
    def player_pos(team, pfr, season, week):
        for gid in reversed(prior_team_games(team_games, team, season, week, 8)):
            row = snaps.get((team, gid), {}).get(pfr)
            if row:
                return row["pos"]
        return None

    def league_prior_mean(group, season, week):
        """Position-group league prior mean EPA/play (bqp_swcc precedent),
        from the precomputed cumulative pool."""
        ser = ctx["epa_pool"].get(group)
        if ser is None:
            return None
        s, n = ser.prior((season, week))
        return (s / n) if n > 0 else None

    def epa_tilde(pfr, pos, season, week):
        gsis = gsis_of_pfr.get(pfr)
        if gsis is None or pos is None:
            return None
        group = pos_group_of(pos)
        if group is None:
            return None
        role = {"QB": None, "RB": "epa_rusher", "WRTE": "epa_receiver"}[group]
        tot_s, tot_n = 0.0, 0.0
        roles = ("epa_passer", "epa_rusher") if group == "QB" else (role,)
        for r in roles:
            ser = cs["epa_player"].get((r, gsis))
            if ser is not None:
                s, n = ser.prior((season, week))
                tot_s += s
                tot_n += n
        e0 = league_prior_mean(group, season, week)
        if e0 is None:
            return None
        return (tot_s + 100.0 * e0) / (tot_n + 100.0)

    for g in filt:
        gid = g["game_id"]
        if g["season"] not in stamped:
            fails["bqp_season_injuries_unstamped"] += 1
            values[gid] = None
            continue
        if g["kickoff"] is None:
            fails["bqp_no_kickoff"] += 1
            values[gid] = None
            continue
        game_val = 0.0
        ok = True
        for team in (g["home"], g["away"]):
            prior3 = prior_team_games(team_games, team, g["season"], g["week"], 3)
            if not prior3:
                fails["bqp_no_prior_snaps"] += 1
                ok = False
                break
            # starters: offensive players with prior-3w offense share > 0.60
            candidates = set()
            for pgid in prior3:
                candidates.update(snaps.get((team, pgid), {}).keys())
            starters = {}
            for pfr in candidates:
                share = player_share(snaps, team_games, team, pfr, g["season"], g["week"], "off", 3)
                if share is not None and share > 0.60:
                    pos = player_pos(team, pfr, g["season"], g["week"])
                    if pos in SKILL_POS:
                        starters[pfr] = (share, pos)
            team_bqp = 0.0
            for pfr, (share, pos) in starters.items():
                gsis = gsis_of_pfr.get(pfr)
                if gsis is None:
                    continue
                trig = None
                for row in inj.get((g["season"], g["week"], team), []):
                    if row["gsis"] == gsis and row["status"] in ("Out", "Doubtful"):
                        trig = row
                        break
                if trig is None:
                    continue
                if trig["ts"] is None:
                    fails["bqp_trigger_unstamped"] += 1
                    ok = False
                    break
                if trig["ts"] > g["kickoff"]:
                    continue  # as-of: not yet visible at kickoff
                # backup: same-position teammate, highest trailing-8g off share,
                # not himself Out/Doubtful on a stamped row this week
                out_ids = {r["gsis"] for r in inj.get((g["season"], g["week"], team), [])
                           if r["status"] in ("Out", "Doubtful") and r["ts"] is not None and r["ts"] <= g["kickoff"]}
                best = None
                mates = set()
                for pgid in prior_team_games(team_games, team, g["season"], g["week"], 8):
                    mates.update(snaps.get((team, pgid), {}).keys())
                for mate in mates:
                    if mate == pfr:
                        continue
                    mpos = player_pos(team, mate, g["season"], g["week"])
                    if mpos != pos:
                        continue
                    mgsis = gsis_of_pfr.get(mate)
                    if mgsis is None or mgsis in out_ids:
                        continue
                    mshare = player_share(snaps, team_games, team, mate, g["season"], g["week"], "off", 8)
                    if mshare is None:
                        continue
                    if best is None or mshare > best[0] or (mshare == best[0] and mate < best[1]):
                        best = (mshare, mate)
                e_start = epa_tilde(pfr, pos, g["season"], g["week"])
                e_back = epa_tilde(best[1], pos, g["season"], g["week"]) if best else None
                if e_start is None or e_back is None:
                    fails["bqp_no_backup_or_epa"] += 1
                    ok = False
                    break
                w_pos = 2.5 if pos == "QB" else 1.0
                team_bqp += (e_start - e_back) * share * w_pos
            if not ok:
                break
            game_val += max(0.0, team_bqp)
        values[gid] = game_val if ok else None
    return values, fails


def build_swcc(filt, ctx):
    """Features computed + ingested; NOT screened (REFUSED on prior corpora)."""
    fails = collections.Counter()
    values = {}
    snaps, team_games = ctx["snaps"], ctx["team_games"]
    meta = ctx["meta"]
    # prior game in same season by kickoff (games.csv order)
    by_team_season = collections.defaultdict(list)
    for g in ctx["all_rows"]:
        by_team_season[(g["season"], g["home"])].append(g)
        by_team_season[(g["season"], g["away"])].append(g)
    for k in by_team_season:
        by_team_season[k].sort(key=lambda g: (g["kickoff"] is None, g["kickoff"], g["game_id"]))

    def prior_game(team, g):
        lst = by_team_season.get((g["season"], team), [])
        prev = None
        for cand in lst:
            if cand["kickoff"] is not None and g["kickoff"] is not None and cand["kickoff"] < g["kickoff"]:
                prev = cand
        return prev

    def snap_load(team, pg):
        rows = snaps.get((team, pg["game_id"]), {})
        if not rows:
            return None
        return sum(r["off_snaps"] + r["def_snaps"] for r in rows.values())

    for g in filt:
        gid = g["game_id"]
        if g["kickoff"] is None:
            fails["swcc_no_kickoff"] += 1
            values[gid] = None
            continue
        m = meta[gid]
        terms = []
        ok = True
        for team, is_away in ((g["away"], True), (g["home"], False)):
            pg = prior_game(team, g)
            if pg is None or pg["kickoff"] is None:
                fails["swcc_no_prior_game_in_season"] += 1
                ok = False
                break
            rest_days = (g["kickoff"] - pg["kickoff"]).total_seconds() / 86400.0
            load = snap_load(team, pg)
            if load is None:
                fails["swcc_no_prior_snaps"] += 1
                ok = False
                break
            terms.append((rest_days, load, is_away))
        if not ok:
            values[gid] = None
            continue
        travel = m["travel_miles_away"]
        if travel is None:
            fails["swcc_travel_missing"] += 1
            values[gid] = None
            continue
        val = eng.compute_swcc(
            rest_days_away=terms[0][0], rest_days_home=terms[1][0],
            travel_miles_away=travel,
            prior_snaps_away=terms[0][1], prior_snaps_home=terms[1][1],
            observed_at_meta=g["kickoff"], kickoff_utc=g["kickoff"])
        if val is None:
            fails["swcc_kernel_none"] += 1
        values[gid] = val
    return values, fails


def unit_of_pos(pos):
    if pos in OFF_POS:
        return "off"
    if pos in ("DE", "DT", "NT", "EDGE", "DL", "CB", "S", "FS", "SS", "DB",
               "LB", "ILB", "OLB", "MLB"):
        return "def"
    return "st"


def build_ril_p1(filt, ctx):
    fails = collections.Counter()
    values = {}
    abs_values = {}
    snaps, team_games = ctx["snaps"], ctx["team_games"]
    inj, unstamped_report, stamped = ctx["inj"], ctx["unstamped_report"], ctx["stamped_seasons"]
    pfr_of_gsis = ctx["pfr_of_gsis"]
    for g in filt:
        gid = g["game_id"]
        if g["season"] not in stamped:
            fails["ril_season_unstamped"] += 1
            values[gid] = None
            abs_values[gid] = None
            continue
        if g["kickoff"] is None:
            fails["ril_no_kickoff"] += 1
            values[gid] = None
            abs_values[gid] = None
            continue
        team_vals = {}
        ok = True
        for team, rest in ((g["home"], g["home_rest"]), (g["away"], g["away_rest"])):
            key = (g["season"], g["week"], team)
            if key in unstamped_report:
                fails["ril_unstamped_record_in_report"] += 1
                ok = False
                break
            rows = []
            for row in inj.get(key, []):
                if row["ts"] is None:
                    fails["ril_unstamped_record_in_report"] += 1
                    ok = False
                    break
                if row["ts"] > g["kickoff"]:
                    fails["ril_row_after_kickoff_excluded"] += 1
                    continue
                pfr = pfr_of_gsis.get(row["gsis"])
                share = None
                if pfr is not None:
                    share = player_share(snaps, team_games, team, pfr, g["season"], g["week"],
                                         unit_of_pos(row["pos"]), 3)
                rows.append({
                    "date_modified": row["ts"].isoformat(),
                    "report_status": row["status"],
                    "position": row["pos"],
                    "snap_share_prior_3w": share,
                })
            if not ok:
                break
            team_vals[team] = eng.compute_ril_team(rows, rest, g["kickoff"])
            if team_vals[team] is None:
                fails["ril_kernel_none"] += 1
                ok = False
                break
        if ok and len(team_vals) == 2:
            values[gid] = team_vals[g["home"]] + team_vals[g["away"]]
            abs_values[gid] = abs(team_vals[g["home"]] - team_vals[g["away"]])
        else:
            values[gid] = None
            abs_values[gid] = None
    return (values, abs_values), fails


def build_epa_pools(ctx):
    """League prior-mean pools per position group, as cumulative series.
    QB pool <- passer plays by QBs; RB pool <- rusher plays by RB/FB;
    WRTE pool <- receiver plays by WR/TE. Position from snap_counts."""
    agg = ctx["agg"]
    snaps = ctx["snaps"]
    pfr_of_gsis = ctx["pfr_of_gsis"]
    pos_of = {}
    for (team, gid), rows in snaps.items():
        for pfr, r in rows.items():
            gsis = ctx["gsis_of_pfr"].get(pfr)
            if gsis:
                pos_of[(gid, gsis)] = r["pos"]
    ctx["pos_of"] = pos_of
    pools = {}
    role_for = {"QB": "epa_passer", "RB": "epa_rusher", "WRTE": "epa_receiver"}
    for group, role in role_for.items():
        per_key = collections.defaultdict(lambda: [0.0, 0])
        for (gid, p), (s, n) in agg[role].items():
            if pos_group_of(pos_of.get((gid, p))) != group:
                continue
            key = agg["team_game_order"].get(gid)
            if key is None:
                continue
            per_key[key][0] += s
            per_key[key][1] += n
        ser = CumSeries()
        for key in sorted(per_key):
            ser.add(key, per_key[key])
        ser.finalize()
        pools[group] = ser
    return pools


def build_qptsr(filt, ctx):
    fails = collections.Counter()
    values = {}
    agg = ctx["agg"]
    cs_qb_part, cs_def_part = ctx["part_qb"], ctx["part_def"]
    part_seasons = ctx["part_seasons"]
    inj, stamped = ctx["inj"], ctx["stamped_seasons"]
    order = agg["team_game_order"]
    # team game sequence (games.csv REG) for prior-game QB identification
    team_seq = collections.defaultdict(list)
    for g in ctx["all_rows"]:
        team_seq[g["home"]].append(g)
        team_seq[g["away"]].append(g)
    for t in team_seq:
        team_seq[t].sort(key=lambda g: (g["season"], g["week"], g["game_id"]))

    def prior_game(team, season, week):
        prev = None
        for cand in team_seq.get(team, []):
            if (cand["season"], cand["week"]) < (season, week):
                prev = cand
        return prev

    def qb_prior_stats(gsis, season, week):
        """(dropbacks, scrambles, quick_pressures, quick_sacks) strictly prior.
        Quick pressures: participation definition for seasons with a
        participation file, PBP fallback (sack|hit dropbacks) otherwise --
        the doc's stated fallback when participation columns are absent."""
        ser = ctx["cum"]["qb"].get(gsis)
        if ser is None:
            return 0, 0, 0, 0
        dbn, scr = ser.prior((season, week))
        # quick pressures: walk the QB's per-game rows is not stored; use the
        # participation series for seasons covered and PBP fallback otherwise.
        qp, qsk = 0, 0
        pser = cs_qb_part.get(gsis)
        if pser is not None:
            qp, qsk = pser.prior((season, week))
        # fallback portion: prior games in seasons WITHOUT participation.
        # Approximate via PBP: dropbacks with sack or hit in those seasons.
        fb = ctx["qb_fallback"].get(gsis)
        if fb is not None:
            fqp, fqsk = fb.prior((season, week))
            qp += fqp
            qsk += fqsk
        return dbn, scr, qp, qsk

    def prr_prior(defteam, season, week):
        """(pressures, dropbacks_faced) strictly prior, same source mixing."""
        pr, dbn = 0.0, 0.0
        pser = cs_def_part.get(defteam)
        if pser is not None:
            pr, dbn = pser.prior((season, week))
        fser = ctx["def_fallback"].get(defteam)
        if fser is not None:
            fdbn, fsk, fht = fser.prior((season, week))
            # fallback seasons contribute (sacks+hits) as pressures
            pr += fsk + fht
            dbn += fdbn
        return pr, dbn

    def league_prr(season, week):
        pr, dbn = 0.0, 0.0
        teams = set(list(cs_def_part.keys()) + list(ctx["def_fallback"].keys()))
        for dt in teams:
            a, b = prr_prior(dt, season, week)
            pr += a
            dbn += b
        return (pr / dbn) if dbn > 0 else None

    for g in filt:
        gid = g["game_id"]
        total = 0.0
        any_q = False
        for team, opp in ((g["home"], g["away"]), (g["away"], g["home"])):
            pg = prior_game(team, g["season"], g["week"])
            if pg is None:
                fails["qptsr_no_prior_game"] += 1
                continue
            counters = agg["qb_dropbacks"].get(pg["game_id"], {})
            if not counters:
                fails["qptsr_no_prior_dropbacks"] += 1
                continue
            team_db = sum(counters.values())
            ranked = sorted(counters.items(), key=lambda kv: (-kv[1], kv[0]))
            starter, sdb = ranked[0]
            if team_db == 0 or sdb / team_db <= 0.60:
                fails["qptsr_no_primary_qb"] += 1
                continue
            # Out-status replacement (stamped seasons only)
            if g["season"] in stamped and g["kickoff"] is not None:
                out_rows = {r["gsis"] for r in inj.get((g["season"], g["week"], team), [])
                            if r["status"] == "Out" and r["ts"] is not None and r["ts"] <= g["kickoff"]}
                if starter in out_rows:
                    repl = None
                    for cand, _ in ranked[1:]:
                        if cand not in out_rows:
                            repl = cand
                            break
                    if repl is None:
                        fails["qptsr_starter_out_no_replacement"] += 1
                        continue
                    starter = repl
                    fails["qptsr_starter_replaced_out"] += 1
            dbn, scr, qp, qsk = qb_prior_stats(starter, g["season"], g["week"])
            if dbn < 50:
                fails["qptsr_qb_lt50_prior_dropbacks"] += 1
                continue
            p2s = (qsk + 30.0 * 0.180) / (qp + 30.0) - 0.180
            prr_opp_n, prr_opp_d = prr_prior(opp, g["season"], g["week"])
            prr_lg = league_prr(g["season"], g["week"])
            if prr_opp_d <= 0 or prr_lg is None or prr_lg <= 0:
                fails["qptsr_no_prior_pressure"] += 1
                continue
            prr_opp = prr_opp_n / prr_opp_d
            scr_rate = (scr / dbn) if dbn > 0 else 0.0
            total += p2s * (prr_opp / prr_lg) * (1.0 + scr_rate)
            any_q = True
        values[gid] = total if any_q else None
        if not any_q:
            fails["qptsr_neither_qb_qualifies"] += 1
    return values, fails


def build_qb_fallback_series(ctx, part_seasons):
    """Per-QB and per-defteam CumSeries restricted to seasons WITHOUT a
    participation file (2015-2017, 2026), using the PBP fallback definition:
    quick pressure := dropback with sack==1 or qb_hit==1."""
    agg = ctx["agg"]
    order = agg["team_game_order"]
    import pyarrow.parquet as pq
    per_qb = collections.defaultdict(list)
    for y in range(2015, 2027):
        if y in part_seasons:
            continue
        path = os.path.join(DATA, f"play_by_play_{y}.parquet")
        if not os.path.exists(path):
            continue
        t = pq.read_table(path, columns=["game_id", "passer_player_id", "qb_dropback", "sack", "qb_hit"])
        d = t.to_pandas()
        db = d[d["qb_dropback"] == 1]
        for (gid, p), grp in db.groupby([db["game_id"], db["passer_player_id"]]):
            if not isinstance(p, str) or not p:
                continue
            qp = int(((grp["sack"] == 1) | (grp["qb_hit"] == 1)).sum())
            qsk = int((grp["sack"] == 1).sum())
            key = order.get(gid)
            if key is not None:
                per_qb[p].append((key, qp, qsk))
    qb_series = {}
    for p, rows in per_qb.items():
        ser = CumSeries()
        for key, qp, qsk in sorted(rows):
            ser.add(key, [qp, qsk])
        ser.finalize()
        qb_series[p] = ser
    def_series = {}
    # rebuild def fallback from def_pressure_pbp with season filter
    perd = collections.defaultdict(list)
    for (gid, dt), (dbn, sk, ht) in agg["def_pressure_pbp"].items():
        key = order.get(gid)
        if key is None or key[0] in part_seasons:
            continue
        perd[dt].append((key, dbn, sk, ht))
    for dt, rows in perd.items():
        ser = CumSeries()
        for key, dbn, sk, ht in sorted(rows):
            ser.add(key, [dbn, sk, ht])
        ser.finalize()
        def_series[dt] = ser
    return qb_series, def_series


def build_olcai(filt, ctx):
    fails = collections.Counter()
    values = {}
    snaps, team_games = ctx["snaps"], ctx["team_games"]
    inj, stamped = ctx["inj"], ctx["stamped_seasons"]
    pfr_of_gsis = ctx["pfr_of_gsis"]
    for g in filt:
        gid = g["game_id"]
        total = 0.0
        ok = True
        for team in (g["home"], g["away"]):
            prior = prior_team_games(team_games, team, g["season"], g["week"], 4)
            if len(prior) < 4:
                fails["olcai_lt4_prior_games"] += 1
                ok = False
                break
            players = set()
            for pgid in prior:
                for pfr, r in snaps.get((team, pgid), {}).items():
                    if r["pos"] in OL_SNAP_POS:
                        players.add(pfr)
            players = sorted(players)

            def vec(pgid):
                rows = snaps.get((team, pgid), {})
                return [rows.get(p, {}).get("off_pct", 0.0) if p in rows else 0.0 for p in players]

            s_last = vec(prior[-1])
            base_vecs = [vec(pgid) for pgid in prior[:-1]]
            s_bar = [sum(v[i] for v in base_vecs) / len(base_vecs) for i in range(len(players))]
            dot = sum(a * b for a, b in zip(s_last, s_bar))
            n1 = math.sqrt(sum(a * a for a in s_last))
            n2 = math.sqrt(sum(b * b for b in s_bar))
            if n1 <= 0 or n2 <= 0:
                fails["olcai_zero_norm"] += 1
                ok = False
                break
            churn = 1.0 - dot / (n1 * n2)
            entropy = max(0.0, 5.0 - sum(a * a for a in s_last))
            inj_term = 0.0
            if g["season"] in stamped and g["kickoff"] is not None:
                last_rows = snaps.get((team, prior[-1]), {})
                for row in inj.get((g["season"], g["week"], team), []):
                    if row["pos"] not in OL_INJ_POS:
                        continue
                    w = STATUS_WEIGHTS.get(row["status"], 0.0)
                    if w <= 0:
                        continue
                    if row["ts"] is None:
                        fails["olcai_unstamped_row_skipped"] += 1
                        continue
                    if row["ts"] > g["kickoff"]:
                        continue
                    pfr = pfr_of_gsis.get(row["gsis"])
                    s_i = last_rows.get(pfr, {}).get("off_pct", 0.0) if pfr else 0.0
                    inj_term += w * s_i
            elif g["season"] not in stamped:
                fails["olcai_injury_term_unstamped_season_zeroed"] += 1
            total += churn + 0.25 * entropy + inj_term
        values[gid] = total if ok else None
    return values, fails


def build_spese(filt, ctx):
    fails = collections.Counter()
    values = {}
    agg = ctx["agg"]
    order = agg["team_game_order"]
    game_teams = ctx["game_teams"]
    # per-team game sequence from PBP order
    team_seq = collections.defaultdict(list)
    for gid, key in order.items():
        teams = game_teams.get(gid)
        if teams:
            team_seq[teams[0]].append((key, gid))
            team_seq[teams[1]].append((key, gid))
    for t in team_seq:
        team_seq[t].sort()
    # league pace at each (season, week) boundary: cumulative over all games
    pace_keys = sorted({order[gid] for gid in order})
    pace_cum = {}
    tot_plays, tot_min = 0, 0.0
    games_by_key = collections.defaultdict(list)
    for gid, key in order.items():
        games_by_key[key].append(gid)
    for key in pace_keys:
        pace_cum[key] = (tot_plays, tot_min)
        for gid in games_by_key[key]:
            teams = game_teams.get(gid)
            if not teams:
                continue
            for tm in teams:
                tot_plays += agg["spese_off"][(gid, tm)][0]
            tot_min += agg["neutral_minutes"].get(gid, 0.0)
    # boundary lookup: for a filter week, use cum at first key >= (season, week)
    sorted_keys = sorted(pace_cum.keys())

    def league_pace(season, week):
        import bisect as _b
        i = _b.bisect_left(sorted_keys, (season, week))
        if i >= len(sorted_keys):
            tp, tm = tot_plays, tot_min
        else:
            tp, tm = pace_cum[sorted_keys[i]]
        if tm <= 0:
            return None
        return (tp / tm) * 60.0

    def team_window(team, season, week, n=6):
        lst = [gid for (key, gid) in team_seq.get(team, []) if key < (season, week)][-n:]
        return lst

    for g in filt:
        gid = g["game_id"]
        lp = league_pace(g["season"], g["week"])
        if lp is None or lp <= 0:
            fails["spese_no_league_pace"] += 1
            values[gid] = None
            continue
        sides = {}
        ok = True
        for team, opp in ((g["home"], g["away"]), (g["away"], g["home"])):
            win = team_window(team, g["season"], g["week"])
            win_opp = team_window(opp, g["season"], g["week"])
            if not win or not win_opp:
                fails["spese_no_prior_games"] += 1
                ok = False
                break
            off = [0, 0, 0, 0]
            minutes = 0.0
            for pgid in win:
                r = agg["spese_off"][(pgid, team)]
                for j in range(4):
                    off[j] += r[j]
                minutes += agg["neutral_minutes"].get(pgid, 0.0)
            deff = [0, 0, 0, 0]
            for pgid in win_opp:
                r = agg["spese_def"][(pgid, opp)]
                for j in range(4):
                    deff[j] += r[j]
            if off[0] <= 0 or deff[0] <= 0 or off[2] <= 0 or deff[2] <= 0 or minutes <= 0:
                fails["spese_window_empty"] += 1
                ok = False
                break
            pace = (off[0] / minutes) * 60.0
            expl_m = math.sqrt((off[1] / off[0]) * (deff[1] / deff[0]))
            stall_m = math.sqrt((off[3] / off[2]) * (deff[3] / deff[2]))
            sides[team] = (pace, expl_m, stall_m)
        if not ok:
            values[gid] = None
            continue
        pace_factor = (sides[g["home"]][0] + sides[g["away"]][0]) / (2.0 * lp)
        s = sum(math.sqrt(sides[t][1] * sides[t][2]) for t in (g["home"], g["away"]))
        values[gid] = pace_factor * s
    return values, fails


def build_caofi(filt, ctx):
    fails = collections.Counter()
    values = {}
    snaps, team_games = ctx["snaps"], ctx["team_games"]
    meta = ctx["meta"]
    agg = ctx["agg"]
    # referee history + league PenYPP boundary stats
    ref_games = collections.defaultdict(list)  # ref -> [((season,week), yards, plays)]
    league_games = []  # ((season,week), pen_ypp)
    for g in ctx["all_rows"]:
        pen = agg["game_penalty"].get(g["game_id"])
        if pen is None or pen[1] <= 0:
            continue
        pypp = pen[0] / pen[1]
        league_games.append(((g["season"], g["week"]), pypp))
        if g["referee"]:
            ref_games[g["referee"]].append(((g["season"], g["week"]), pen[0], pen[1]))
    league_games.sort()
    league_keys = [k for k, _ in league_games]
    league_vals = [v for _, v in league_games]
    league_pre = [0.0]
    league_pre2 = [0.0]
    for v in league_vals:
        league_pre.append(league_pre[-1] + v)
        league_pre2.append(league_pre2[-1] + v * v)
    for r in ref_games:
        ref_games[r].sort()
    ref_pre = {}
    for r, rows in ref_games.items():
        # PenYardsPerPlay(Ref) = total penalty yards / total plays over his
        # prior games (play-weighted), per the spec formula.
        pre_y = [0.0]
        pre_p = [0.0]
        acc_y, acc_p = 0.0, 0.0
        for _, yds, pls in rows:
            acc_y += yds
            acc_p += pls
            pre_y.append(acc_y)
            pre_p.append(acc_p)
        ref_pre[r] = (pre_y, pre_p, rows)

    def league_stats(season, week):
        i = bisect.bisect_left(league_keys, (season, week))
        if i < 30:
            return None
        mean = league_pre[i] / i
        var = league_pre2[i] / i - mean * mean
        return mean, math.sqrt(var) if var > 0 else None

    for g in filt:
        gid = g["game_id"]
        m = meta[gid]
        ko = g["kickoff"]
        if ko is None or m["tz_venue_off"] is None or m["tz_away_home_off"] is None or m["tz_home_home_off"] is None:
            fails["caofi_tz_or_kickoff_missing"] += 1
            values[gid] = None
            continue
        ko_et = ko.astimezone(ET)
        hour_et = ko_et.hour + ko_et.minute / 60.0
        circ = max(0.0, m["tz_home_home_off"] - m["tz_away_home_off"]) * (1.0 if hour_et <= 13.5 else 0.0) \
            + 2.0 * (1.0 if abs(m["tz_venue_off"] - m["tz_away_home_off"]) >= 4 else 0.0)
        # Hypoxia
        if m["venue_alt_m"] is None or m["away_home_alt_m"] is None:
            fails["caofi_altitude_missing"] += 1
            values[gid] = None
            continue
        prior = prior_team_games(team_games, g["away"], g["season"], g["week"], 1)
        if not prior:
            fails["caofi_no_prior_game_away"] += 1
            values[gid] = None
            continue
        def_snaps = unit_total(snaps, g["away"], prior[-1], "def")
        if def_snaps <= 0:
            fails["caofi_no_def_snaps"] += 1
            values[gid] = None
            continue
        hypoxia = max(0.0, (m["venue_alt_m"] - m["away_home_alt_m"]) / 1000.0) * (def_snaps / 70.0)
        # RefChaos
        ref = g["referee"]
        ls = league_stats(g["season"], g["week"])
        if not ref or ref not in ref_pre or ls is None:
            fails["caofi_ref_history_missing"] += 1
            values[gid] = None
            continue
        pre_y, pre_p, rows = ref_pre[ref]
        keys = [k for k, _, _ in rows]
        i = bisect.bisect_left(keys, (g["season"], g["week"]))
        if i < 1 or pre_p[i] <= 0:
            fails["caofi_ref_no_prior_games"] += 1
            values[gid] = None
            continue
        ref_pypp = pre_y[i] / pre_p[i]
        mean, sd = ls
        if sd is None or sd <= 0:
            fails["caofi_league_sd_zero"] += 1
            values[gid] = None
            continue
        refchaos = max(0.0, (ref_pypp - mean) / sd)
        values[gid] = 0.40 * circ + 0.35 * hypoxia + 0.25 * refchaos
    return values, fails


# --------------------------------------------------------------------------
# Family-2 construction (pit_round2.py, copied verbatim where noted) --
# hetero-Gaussian sigma0*exp(beta_T*T/44) + key-number atoms, PIT-selected.
# --------------------------------------------------------------------------

def _Phi(z):
    return 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))


def _phi(z):
    return math.exp(-0.5 * z * z) / math.sqrt(2.0 * math.pi)


def keynum_components(mu, sd, p3, p7):
    """pit_round2.py verbatim."""
    w = 1.0 - p3 - p7
    atoms = [(3.0, p3 / 2), (-3.0, p3 / 2), (7.0, p7 / 2), (-7.0, p7 / 2)]
    atoms = [(a, q) for a, q in atoms if q > 0]
    return w, mu / w, atoms


def _e_abs_g(c, sd, x):
    """pit_round2.py verbatim."""
    z = (x - c) / sd
    return sd * (z * (2.0 * _Phi(z) - 1.0) + 2.0 * _phi(z))


def crps_keynum(mu, sd, p3, p7, y):
    """pit_round2.py verbatim (energy-form CRPS)."""
    w, c, atoms = keynum_components(mu, sd, p3, p7)
    e1 = w * _e_abs_g(c, sd, y) + sum(q * abs(a - y) for a, q in atoms)
    e2 = w * w * 2.0 * sd / math.sqrt(math.pi)
    e2 += 2.0 * w * sum(q * _e_abs_g(c, sd, a) for a, q in atoms)
    e2 += sum(qi * qj * abs(ai - aj) for ai, qi in atoms for aj, qj in atoms)
    return e1 - 0.5 * e2


def hetero_sd(beta_T, total_line):
    """pit_round2.py verbatim."""
    xT = (total_line if total_line is not None else 44.0) / 44.0
    return SIGMA * math.exp(max(-0.45, min(0.45, beta_T * xT)))


F2_BETA_GRID = tuple(round(-0.20 + 0.02 * i, 2) for i in range(21))
F2_P_GRID = (0.0, 0.01, 0.02, 0.03, 0.05, 0.08)
F2_MIN_PRIOR = 25


def family2_per_game(filt):
    """Reproduce pit_round2.family_hetero_keys per game.
    Returns {game_id: (crps_f2, sigma_g, p3, p7, flagged)} and the mean CRPS."""
    rows = filt  # already sorted by (season, week, game_id)
    params = [(b, p3, p7) for b in F2_BETA_GRID for p3 in F2_P_GRID for p7 in F2_P_GRID]
    table = [[crps_keynum(r["spread"], hetero_sd(b, r["total_line"]), p3, p7, r["margin"])
              for r in rows] for (b, p3, p7) in params]
    # pit_select (pit_round2.py): running sums over strictly-prior rows
    first = {}
    pidx = []
    for i, r in enumerate(rows):
        first.setdefault((r["season"], r["week"]), i)
        pidx.append(first[(r["season"], r["week"])])
    cums = []
    for j in range(len(params)):
        acc = 0.0
        cj = [0.0]
        for v in table[j]:
            acc += v
            cj.append(acc)
        cums.append(cj)
    out = {}
    tot = 0.0
    for i, r in enumerate(rows):
        n = pidx[i]
        if n < F2_MIN_PRIOR:
            c = eng.crps_gaussian(r["spread"], SIGMA, r["margin"])
            out[r["game_id"]] = (c, SIGMA, 0.0, 0.0, True)
            tot += c
            continue
        j = min(range(len(params)), key=lambda jj: cums[jj][n])
        b, p3, p7 = params[j]
        c = table[j][i]
        out[r["game_id"]] = (c, hetero_sd(b, r["total_line"]), p3, p7, False)
        tot += c
    return out, tot / len(rows)


# --------------------------------------------------------------------------
# Screens
# --------------------------------------------------------------------------

DOC_GRID = [-0.25 + 0.005 * i for i in range(151)]       # doc fit_beta grid
COMPOSED_GRID = [-0.25 + 0.025 * i for i in range(31)]   # composed-fit grid (documented)


def _clamp_sigma(s):
    return max(6.0, min(24.0, s))


def sigma_linear_pos(beta, f):
    return eng.modulated_sigma(SIGMA, f, beta, mode="linear")


def sigma_linear_raw(beta, f):
    if f is None:
        return SIGMA
    return _clamp_sigma(SIGMA * (1.0 + beta * f))


def sigma_exp(beta, f):
    return eng.modulated_sigma(SIGMA, f, beta, mode="exp")


def _week_blocks(filt):
    blocks = []
    cur = None
    for g in filt:
        key = (g["season"], g["week"])
        if cur != key:
            blocks.append([])
            cur = key
        blocks[-1].append(g)
    return blocks


def doc_screen(filt, values, sigma_fn, center=False):
    """Doc-protocol screen vs the Gaussian baseline: beta fit by the doc grid
    on prior games with the feature defined (>=25 else beta=0), expanding
    window by (season, week) blocks. Reports full-filter and paired-subset
    deltas. center=True centers the feature on its prior defined mean
    (SPESE's (SPESE - SPESE_bar) form)."""
    blocks = _week_blocks(filt)
    prior = []  # (mu, y, f)
    full_with, full_without = [], []
    sub_with, sub_without = [], []
    beta_last = 0.0
    n_joined = 0
    for block in blocks:
        defined = [(mu, y, f) for (mu, y, f) in prior if f is not None]
        fbar = (sum(f for _, _, f in defined) / len(defined)) if (center and defined) else 0.0
        beta = 0.0
        if len(defined) >= 25:
            best = None
            for cand in DOC_GRID:
                loss = 0.0
                for mu, y, f in defined:
                    fe = (f - fbar) if center else f
                    loss += eng.crps_gaussian(mu, sigma_fn(cand, fe), y)
                if best is None or loss < best[0]:
                    best = (loss, cand)
            beta = best[1]
        beta_last = beta
        for g in block:
            f = values.get(g["game_id"])
            base = eng.crps_gaussian(g["spread"], SIGMA, g["margin"])
            full_without.append(base)
            if f is None:
                full_with.append(base)
            else:
                n_joined += 1
                fe = (f - fbar) if center else f
                w = eng.crps_gaussian(g["spread"], sigma_fn(beta, fe), g["margin"])
                full_with.append(w)
                sub_with.append(w)
                sub_without.append(base)
        for g in block:
            prior.append((g["spread"], g["margin"], values.get(g["game_id"])))
    n = len(filt)

    def mean(xs):
        return round(sum(xs) / len(xs), 6) if xs else None

    d_full = round(mean(full_with) - mean(full_without), 6)
    d_sub = round(mean(sub_with) - mean(sub_without), 6) if sub_with else None
    return {
        "reference": "gaussian_baseline_7.154021",
        "n_filter": n, "n_joined": n_joined,
        "crps_without": mean(full_without), "crps_with": mean(full_with),
        "delta_full": d_full,
        "subset_n": len(sub_with), "subset_crps_without": mean(sub_without),
        "subset_crps_with": mean(sub_with), "delta_subset": d_sub,
        "beta_last": round(beta_last, 4),
    }


def f2_screen(filt, values, factor_fn, center=False, f2=None):
    """Family-2-conditional screen: the metric's sigma factor multiplies
    family-2's per-game sigma_g (atoms and mean-lock centre unchanged).
    beta fit on prior defined games, composed grid, >=25 else beta=0."""
    if f2 is None:
        f2, _ = family2_per_game(filt)
    blocks = _week_blocks(filt)
    prior = []  # (game, f)
    full_with, full_without = [], []
    sub_with, sub_without = [], []
    beta_last = 0.0
    n_joined = 0
    for block in blocks:
        defined = [(g, f) for (g, f) in prior if f is not None]
        fbar = (sum(f for _, f in defined) / len(defined)) if (center and defined) else 0.0
        beta = 0.0
        if len(defined) >= 25:
            best = None
            for cand in COMPOSED_GRID:
                loss = 0.0
                for g0, f0 in defined:
                    _, sg, p3, p7, _fl = f2[g0["game_id"]]
                    fe = (f0 - fbar) if center else f0
                    loss += crps_keynum(g0["spread"], sg * factor_fn(cand, fe), p3, p7, g0["margin"])
                if best is None or loss < best[0]:
                    best = (loss, cand)
            beta = best[1]
        beta_last = beta
        for g in block:
            c_f2, sg, p3, p7, _fl = f2[g["game_id"]]
            full_without.append(c_f2)
            f = values.get(g["game_id"])
            if f is None:
                full_with.append(c_f2)
            else:
                n_joined += 1
                fe = (f - fbar) if center else f
                w = crps_keynum(g["spread"], sg * factor_fn(beta, fe), p3, p7, g["margin"])
                full_with.append(w)
                sub_with.append(w)
                sub_without.append(c_f2)
        for g in block:
            prior.append((g, values.get(g["game_id"])))
    def mean(xs):
        return round(sum(xs) / len(xs), 6) if xs else None
    return {
        "reference": "family2_7.133199",
        "n_filter": len(filt), "n_joined": n_joined,
        "crps_without": mean(full_without), "crps_with": mean(full_with),
        "delta_full": round(mean(full_with) - mean(full_without), 6),
        "subset_n": len(sub_with), "subset_crps_without": mean(sub_without),
        "subset_crps_with": mean(sub_with),
        "delta_subset": (round(mean(sub_with) - mean(sub_without), 6) if sub_with else None),
        "beta_last": round(beta_last, 4),
    }


def f2_atom_screen(filt, values, f2=None):
    """SPESE atom pathway composed on family-2: p7 shifted by gamma*(SPESE -
    prior mean SPESE), clipped to [0, min(0.14, p3+p7)]; p3 takes the residual
    so total atom mass p_37 (and the mean-lock centre) is preserved."""
    if f2 is None:
        f2, _ = family2_per_game(filt)
    blocks = _week_blocks(filt)
    prior = []
    full_with, full_without = [], []
    sub_with, sub_without = [], []
    gamma_last = 0.0
    n_joined = 0

    def composed(g, gamma, fe):
        _, sg, p3, p7, _fl = f2[g["game_id"]]
        p37 = p3 + p7
        p7a = min(max(p7 + gamma * fe, 0.0), min(0.14, p37))
        p3a = p37 - p7a
        return crps_keynum(g["spread"], sg, p3a, p7a, g["margin"])

    for block in blocks:
        defined = [(g, f) for (g, f) in prior if f is not None]
        fbar = (sum(f for _, f in defined) / len(defined)) if defined else 0.0
        gamma = 0.0
        if len(defined) >= 25:
            best = None
            for cand in COMPOSED_GRID:
                loss = sum(composed(g0, cand, f0 - fbar) for g0, f0 in defined)
                if best is None or loss < best[0]:
                    best = (loss, cand)
            gamma = best[1]
        gamma_last = gamma
        for g in block:
            c_f2 = f2[g["game_id"]][0]
            full_without.append(c_f2)
            f = values.get(g["game_id"])
            if f is None:
                full_with.append(c_f2)
            else:
                n_joined += 1
                w = composed(g, gamma, f - fbar)
                full_with.append(w)
                sub_with.append(w)
                sub_without.append(c_f2)
        for g in block:
            prior.append((g, values.get(g["game_id"])))
    def mean(xs):
        return round(sum(xs) / len(xs), 6) if xs else None
    return {
        "reference": "family2_7.133199_atoms",
        "n_filter": len(filt), "n_joined": n_joined,
        "crps_without": mean(full_without), "crps_with": mean(full_with),
        "delta_full": round(mean(full_with) - mean(full_without), 6),
        "subset_n": len(sub_with), "subset_crps_without": mean(sub_without),
        "subset_crps_with": mean(sub_with),
        "delta_subset": (round(mean(sub_with) - mean(sub_without), 6) if sub_with else None),
        "gamma_last": round(gamma_last, 4),
    }


def factor_linear_pos(beta, f):
    return max(6.0 / SIGMA, min(24.0 / SIGMA, 1.0 + beta * max(0.0, f)))


def factor_linear_raw(beta, f):
    return max(6.0 / SIGMA, min(24.0 / SIGMA, 1.0 + beta * f))


def factor_exp(beta, f):
    return math.exp(max(-0.50, min(0.60, beta * f)))


# Branch harness (situational_metrics.score_feature, landed for the five
# diagnostics): sigma = 13.45 * exp(beta * z), z standardized on prior defined
# values, golden-section beta on prior games, >=30 prior defined required.
def _fit_beta_branch(residuals, z):
    if len(residuals) < 30:
        return None

    def mean_crps(beta):
        return sum(eng.crps_gaussian(mu, SIGMA * math.exp(beta * zi), y)
                   for (mu, y), zi in zip(residuals, z)) / len(residuals)

    gr = (math.sqrt(5) - 1) / 2
    a, b = -1.0, 1.0
    c, d = b - gr * (b - a), a + gr * (b - a)
    fc, fd = mean_crps(c), mean_crps(d)
    for _ in range(40):
        if fc < fd:
            b, d, fd = d, c, fc
            c = b - gr * (b - a)
            fc = mean_crps(c)
        else:
            a, c, fc = c, d, fd
            d = a + gr * (b - a)
            fd = mean_crps(d)
    return (a + b) / 2


def branch_harness_screen(filt, values):
    blocks = _week_blocks(filt)
    prior_vals, prior_rows = [], []
    full_base, full_feat, sub_base, sub_feat = [], [], [], []
    beta_last = None
    for block in blocks:
        mu_z = sd_z = beta = None
        if len(prior_vals) >= 30:
            mu_z = sum(prior_vals) / len(prior_vals)
            var = sum((v - mu_z) ** 2 for v in prior_vals) / len(prior_vals)
            sd_z = math.sqrt(var) if var > 0 else None
            if sd_z:
                z_train = [(v - mu_z) / sd_z for v in prior_vals]
                beta = _fit_beta_branch([(r["spread"], r["margin"]) for r in prior_rows], z_train)
                beta_last = beta
        for g in block:
            base = eng.crps_gaussian(g["spread"], SIGMA, g["margin"])
            full_base.append(base)
            v = values.get(g["game_id"])
            if v is None or beta is None or sd_z is None:
                full_feat.append(base)
            else:
                z = (v - mu_z) / sd_z
                feat = eng.crps_gaussian(g["spread"], SIGMA * math.exp(beta * z), g["margin"])
                full_feat.append(feat)
                sub_base.append(base)
                sub_feat.append(feat)
        for g in block:
            v = values.get(g["game_id"])
            if v is not None:
                prior_vals.append(v)
                prior_rows.append(g)

    def mean(xs):
        return round(sum(xs) / len(xs), 6) if xs else None
    return {
        "reference": "branch_harness_exp_z (situational_metrics.score_feature equivalent)",
        "n_filter": len(filt),
        "n_feature_defined_and_scored": len(sub_base),
        "crps_without": mean(sub_base), "crps_with": mean(sub_feat),
        "delta_subset": (round(mean(sub_feat) - mean(sub_base), 6) if sub_base else None),
        "full_filter_crps_without": mean(full_base),
        "full_filter_crps_with": mean(full_feat),
        "delta_full": round(mean(full_feat) - mean(full_base), 6),
        "beta_last": (round(beta_last, 4) if beta_last is not None else None),
    }


# --------------------------------------------------------------------------
# SAI composite (built for screening only from SCREEN-SURVIVORS, per the
# doc's Step 3.3 combination rule adapted to the screen protocol)
# --------------------------------------------------------------------------

def _quantile(sorted_xs, q):
    if not sorted_xs:
        return None
    pos = q * (len(sorted_xs) - 1)
    lo = int(math.floor(pos))
    hi = min(lo + 1, len(sorted_xs) - 1)
    return sorted_xs[lo] + (sorted_xs[hi] - sorted_xs[lo]) * (pos - lo)


SAI_GROUPS = (("SWCC", "CAOFI"), ("RIL", "BQP", "OLCAI"), ("QPTSR", "SPESE"))


def build_sai(filt, feats_by_key, survivors):
    """feats_by_key: {'CAOFI': values, 'RIL': ril_sum, 'OLCAI': ..., 'SPESE': ...,
    'QPTSR': ..., 'SWCC': ..., 'BQP': ...}. survivors: subset of keys.
    Standardization: strictly-prior filter games' defined values; a metric's
    tilde is 0 until >=25 prior defined values exist, and 0 when its game
    value is None (the doc's None->0 product rule)."""
    blocks = _week_blocks(filt)
    prior_vals = {k: [] for k in feats_by_key}
    values = {}
    for block in blocks:
        stats = {}
        for k in survivors:
            xs = sorted(prior_vals[k])
            if len(xs) >= 25:
                med = _quantile(xs, 0.50)
                iqr = _quantile(xs, 0.75) - _quantile(xs, 0.25)
                stats[k] = (med, iqr)
        for g in block:
            prod = 1.0
            for group in SAI_GROUPS:
                s = 0.0
                for k in group:
                    if k not in survivors:
                        continue
                    v = feats_by_key[k].get(g["game_id"])
                    if v is None or k not in stats:
                        continue
                    med, iqr = stats[k]
                    s += max(0.0, v - med) / (iqr + 1e-6)
                prod *= (1.0 + s)
            values[g["game_id"]] = prod - 1.0
        for g in block:
            for k, vals in feats_by_key.items():
                v = vals.get(g["game_id"])
                if v is not None:
                    prior_vals[k].append(v)
    return values


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

TARGET_PARAMETERS = {
    "BQP": "sigma scale: sigma_adj = sigma_base * (1 + beta * max(0, BQP))",
    "SWCC": "sigma scale: sigma_adj = sigma_base * exp(beta * SWCC)",
    "RIL-P1": "sigma scale: sigma_adj = sigma_base * (1 + beta_sum * RIL_sum + beta_diff * |dRIL|)",
    "QPTSR": "sigma scale: sigma_adj = sigma_base * (1 + beta * QPTSR)",
    "OLCAI": "sigma scale: sigma_adj = sigma_base * exp(beta * OLCAI)",
    "SPESE": "sigma scale: sigma_adj = sigma_base * (1 + beta * (SPESE - SPESE_bar)); AND atom weight on P(|M|=7) vs P(|M|=3) with p_37 preserved",
    "CAOFI": "sigma scale: sigma_adj = sigma_base * (1 + beta * CAOFI)",
    "SAI": "sigma scale (composite regime variable over cleared constituents)",
}

PRIOR_CORPORA = {
    "BQP": {
        "manifest_570": {"n": 570, "crps_gaussian": 7.0271, "crps_with": 7.0224,
                         "delta_baseline_minus_with": 0.0047, "verdict": "improves on manifest"},
        "nflverse_2494": {"n": 2494, "crps_gaussian": 7.1485, "crps_with": 7.1494,
                          "delta_baseline_minus_with": -0.0009, "verdict": "degrades on cross-check"},
        "source": "bqp_result.json on grok/walk-forward-2026-10-14, generated 2026-10-14T22:10:56Z (verified from the artifact)",
    },
    "SWCC": {
        "manifest_570": {"n": 570, "crps_gaussian": 7.0271, "crps_with": 7.0289,
                         "delta_baseline_minus_with": -0.0018, "verdict": "degrades on manifest"},
        "nflverse_2494": {"n": 2494, "crps_gaussian": 7.1485, "crps_with": 7.1490,
                          "delta_baseline_minus_with": -0.0005, "verdict": "degrades on cross-check"},
        "source": "swcc_result.json on grok/walk-forward-2026-10-14, generated 2026-10-14T22:10:56Z (verified from the artifact)",
    },
}


def coverage_stats(values, filt):
    xs = sorted(v for v in values.values() if v is not None)
    n = len(xs)
    if not xs:
        return {"n_defined": 0, "coverage": 0.0}
    return {
        "n_defined": n, "coverage": round(n / len(filt), 4),
        "min": round(xs[0], 6), "median": round(_quantile(xs, 0.5), 6),
        "mean": round(sum(xs) / n, 6), "max": round(xs[-1], 6),
        "n_zero": sum(1 for v in xs if v == 0.0),
    }


def main():
    out_path = os.environ.get("SAI_OUT", os.path.join(HERE, "sai_diagnostics_result.json"))
    feat_path = os.environ.get("SAI_FEATURES_OUT", os.path.join(HERE, "sai_features_2026-10-15.jsonl"))
    all_rows, filt = load_games()
    base = sum(eng.crps_gaussian(g["spread"], SIGMA, g["margin"]) for g in filt) / len(filt)
    print(f"filter n={len(filt)} baseline={base:.6f} (target 7.154021)")
    assert len(filt) == 2462 and abs(base - BASELINE_CRPS) < 5e-7, "baseline reproduction failed"

    stadiums = load_stadiums()
    meta = build_schedule_meta(all_rows, stadiums)
    snaps, team_games = load_snaps()
    inj, unstamped_report, stamped = load_injuries()
    pfr_of_gsis, gsis_of_pfr = load_crosswalk()
    game_teams = {g["game_id"]: (g["home"], g["away"]) for g in all_rows}

    cache = os.path.expanduser("~/workspace/sai-build/cache_agg.pkl")
    if os.path.exists(cache) and not os.environ.get("SAI_NO_CACHE"):
        import pickle
        with open(cache, "rb") as fh:
            blob = pickle.load(fh)
        agg, (qp_qb, prr_def, part_seasons, part_note) = blob["agg"], blob["part"]
        print("aggregates from cache")
    else:
        agg = load_pbp_aggregates()
        finalize_spese_series(agg, game_teams)
        qp_qb, prr_def, part_seasons, part_note = load_participation_aggregates()
        import pickle

        def _plain(o):
            if isinstance(o, collections.defaultdict):
                return {k: _plain(v) for k, v in o.items()}
            if isinstance(o, dict):
                return {k: _plain(v) for k, v in o.items()}
            return o

        with open(cache, "wb") as fh:
            pickle.dump({"agg": _plain(agg),
                         "part": (_plain(qp_qb), _plain(prr_def), part_seasons, part_note)}, fh)
        print("aggregates built + cached")
    # restore defaultdict access for directly-indexed aggregate maps
    agg["spese_off"] = collections.defaultdict(lambda: [0, 0, 0, 0], agg["spese_off"])
    agg["spese_def"] = collections.defaultdict(lambda: [0, 0, 0, 0], agg["spese_def"])
    agg["qb_dropbacks"] = collections.defaultdict(collections.Counter, agg["qb_dropbacks"])
    print("participation seasons:", part_seasons, "| note:", part_note)

    ctx = {
        "all_rows": all_rows, "meta": meta, "snaps": snaps, "team_games": team_games,
        "inj": inj, "unstamped_report": unstamped_report, "stamped_seasons": stamped,
        "pfr_of_gsis": pfr_of_gsis, "gsis_of_pfr": gsis_of_pfr,
        "game_teams": game_teams, "agg": agg,
    }
    ctx["cum"] = build_cumseries(agg)
    ctx["epa_pool"] = build_epa_pools(ctx)
    ctx["part_qb"], ctx["part_def"] = build_participation_series(qp_qb, prr_def, agg["team_game_order"])
    ctx["part_seasons"] = set(part_seasons)
    ctx["qb_fallback"], ctx["def_fallback"] = build_qb_fallback_series(ctx, ctx["part_seasons"])

    # ---- feature ingestion (all seven; universal ingestion) ----
    feats = {}
    fails = {}
    feats["CAOFI"], fails["CAOFI"] = build_caofi(filt, ctx)
    (feats["RIL"], feats["RIL_ABS"]), fails["RIL-P1"] = build_ril_p1(filt, ctx)
    feats["OLCAI"], fails["OLCAI"] = build_olcai(filt, ctx)
    feats["SPESE"], fails["SPESE"] = build_spese(filt, ctx)
    feats["QPTSR"], fails["QPTSR"] = build_qptsr(filt, ctx)
    feats["BQP"], fails["BQP"] = build_bqp(filt, ctx)
    feats["SWCC"], fails["SWCC"] = build_swcc(filt, ctx)
    for name in ("CAOFI", "RIL-P1", "OLCAI", "SPESE", "QPTSR", "BQP", "SWCC"):
        key = {"RIL-P1": "RIL"}.get(name, name)
        st = coverage_stats(feats[key], filt)
        print(f"features {name}: defined {st['n_defined']}/2462")

    # ---- family-2 reference (reproduction check first) ----
    f2, f2_mean = family2_per_game(filt)
    print(f"family-2 reproduction: {f2_mean:.6f} (target 7.133199)")
    f2_ok = abs(f2_mean - FAMILY2_CRPS) < 5e-7

    # ---- screens (kill-only; operative reference = family-2) ----
    screens = {}

    def run_screen(metric_key, values, sigma_fn, factor_fn, center=False):
        return {
            "doc_vs_baseline": doc_screen(filt, values, sigma_fn, center=center),
            "family2_conditional": (f2_screen(filt, values, factor_fn, center=center, f2=f2) if f2_ok else None),
            "family2_conditional_note": (None if f2_ok else "family-2 reproduction failed; screen vs baseline only, NOT family-2-conditional"),
            "branch_harness": branch_harness_screen(filt, values),
        }

    screens["CAOFI"] = run_screen("CAOFI", feats["CAOFI"], sigma_linear_raw, factor_linear_raw)
    screens["RIL_sum"] = run_screen("RIL_sum", feats["RIL"], sigma_linear_raw, factor_linear_raw)
    screens["RIL_absdiff"] = run_screen("RIL_absdiff", feats["RIL_ABS"], sigma_linear_raw, factor_linear_raw)
    screens["OLCAI"] = run_screen("OLCAI", feats["OLCAI"], sigma_exp, factor_exp)
    screens["SPESE_scale"] = run_screen("SPESE_scale", feats["SPESE"], sigma_linear_raw, factor_linear_raw, center=True)
    screens["SPESE_atom"] = {"family2_conditional": (f2_atom_screen(filt, feats["SPESE"], f2=f2) if f2_ok else None),
                              "note": "atom pathway exists only composed on a key-number base (family-2); no baseline form"}
    screens["QPTSR"] = run_screen("QPTSR", feats["QPTSR"], sigma_linear_raw, factor_linear_raw)

    def operative_delta(scr):
        if scr.get("family2_conditional") is not None:
            return scr["family2_conditional"]["delta_full"], "family2"
        return scr["doc_vs_baseline"]["delta_full"], "baseline_flagged_not_family2_conditional"

    dispositions = {}
    survivors = []
    # CAOFI
    d, ref = operative_delta(screens["CAOFI"])
    dispositions["CAOFI"] = ("SCREENED-SURVIVED" if d < 0 else "SCREENED-KILLED")
    if d < 0:
        survivors.append("CAOFI")
    # RIL-P1: primary channel = RIL_sum; secondary = |dRIL|
    d1, _ = operative_delta(screens["RIL_sum"])
    d2, _ = operative_delta(screens["RIL_absdiff"])
    if d1 < 0:
        dispositions["RIL-P1"] = "SCREENED-SURVIVED"
        survivors.append("RIL")
    elif d2 < 0:
        dispositions["RIL-P1"] = "SCREENED-SURVIVED (secondary |dRIL| channel only)"
        survivors.append("RIL")
    else:
        dispositions["RIL-P1"] = "SCREENED-KILLED"
    # OLCAI
    d, _ = operative_delta(screens["OLCAI"])
    dispositions["OLCAI"] = ("SCREENED-SURVIVED" if d < 0 else "SCREENED-KILLED")
    if d < 0:
        survivors.append("OLCAI")
    # SPESE: scale look + atom look
    d1, _ = operative_delta(screens["SPESE_scale"])
    atom = screens["SPESE_atom"]["family2_conditional"]
    d_atom = atom["delta_full"] if atom else None
    if d1 < 0 or (d_atom is not None and d_atom < 0):
        dispositions["SPESE"] = "SCREENED-SURVIVED"
        survivors.append("SPESE")
    else:
        dispositions["SPESE"] = "SCREENED-KILLED"
    # QPTSR
    d, _ = operative_delta(screens["QPTSR"])
    dispositions["QPTSR"] = ("SCREENED-SURVIVED" if d < 0 else "SCREENED-KILLED")
    if d < 0:
        survivors.append("QPTSR")
    dispositions["BQP"] = "PARKED (leak audit of the nflverse run + corpus game-ID overlap counts pending in another lane; frozen screen not run)"
    dispositions["SWCC"] = "REFUSED (prior corpora: degraded on manifest 570 and nflverse 2494; frozen screen not run per protocol)"

    # ---- SAI: only from >=2 survivors ----
    sai_values = None
    sai_screen = None
    if len(survivors) >= 2:
        feats_by_key = {"CAOFI": feats["CAOFI"], "RIL": feats["RIL"], "OLCAI": feats["OLCAI"],
                        "SPESE": feats["SPESE"], "QPTSR": feats["QPTSR"],
                        "SWCC": feats["SWCC"], "BQP": feats["BQP"]}
        sai_values = build_sai(filt, feats_by_key, set(survivors))
        sai_screen = run_screen("SAI", sai_values, sigma_linear_raw, factor_linear_raw)
        d, _ = operative_delta(sai_screen)
        dispositions["SAI"] = ("SCREENED-SURVIVED" if d < 0 else "SCREENED-KILLED")
    else:
        dispositions["SAI"] = f"NOT SCORED (fewer than 2 constituents survived: {len(survivors)})"

    looks = 7  # CAOFI, RIL_sum, RIL_|dRIL|, OLCAI, SPESE_scale, SPESE_atom, QPTSR
    if sai_screen is not None:
        looks += 1

    def metric_block(name, key, screen_keys):
        blk = {
            "target_parameter": TARGET_PARAMETERS[name],
            "disposition": dispositions[name],
            "ingestion": coverage_stats(feats[key], filt),
            "failed_closed": dict(fails.get(name, {})),
            "screens": {sk: screens[sk] for sk in screen_keys if sk in screens},
        }
        if name in PRIOR_CORPORA:
            blk["prior_corpora"] = PRIOR_CORPORA[name]
        return blk

    result = {
        "label": "DIAGNOSTIC SCREEN. Kill-only asymmetric screen (Opus review 2026-10-15). "
                 "Improvement earns a future-filter pre-registration slot only -- never a weight, "
                 "never a promotion. Emission ZERO_OBJECT. passed stays false.",
        "spec_source": "Oct 14 Architectural Deepening doc (Drive), formulas recovered from OMML equations; "
                       "doc kernels in wf_situational_engine.py",
        "filter": "REG 2017 W1 - 2026 W5, non-null scores and spread_line",
        "n_filter": len(filt),
        "baseline_reproduction": {"crps": round(base, 6), "target": BASELINE_CRPS, "ok": True},
        "family2_reproduction": {"crps": round(f2_mean, 6), "target": FAMILY2_CRPS, "ok": f2_ok},
        "mu": "spread_line (locked, never shifted)",
        "screen_protocol": {
            "rule": "delta_full < 0 on the operative reference -> SCREENED-SURVIVED (pre-registration slot on the FUTURE filter); delta_full >= 0 -> SCREENED-KILLED (refused, recorded)",
            "operative_reference": "family-2 construction (7.133199) where composable; else baseline with explicit flag",
            "beta_fit": "expanding window by (season, week) blocks; doc grid [-0.25, 0.50] x151 for baseline screens; 31-point grid (step 0.025) for family-2-composed fits (documented); >=25 prior defined games else beta=0",
            "multiplicity_looks": looks,
            "multiplicity_note": "7 pathway looks (CAOFI; RIL_sum; RIL_|dRIL|; OLCAI; SPESE scale; SPESE atom; QPTSR) on the operative reference, each also read vs baseline and under the branch harness (non-operative readings); SAI combination adds 1 look when screened. BQP and SWCC contribute 0 frozen looks (PARKED / REFUSED-prior).",
        },
        "metrics": {
            "CAOFI": metric_block("CAOFI", "CAOFI", ["CAOFI"]),
            "RIL-P1": metric_block("RIL-P1", "RIL", ["RIL_sum", "RIL_absdiff"]),
            "OLCAI": metric_block("OLCAI", "OLCAI", ["OLCAI"]),
            "SPESE": metric_block("SPESE", "SPESE", ["SPESE_scale", "SPESE_atom"]),
            "QPTSR": metric_block("QPTSR", "QPTSR", ["QPTSR"]),
            "BQP": metric_block("BQP", "BQP", []),
            "SWCC": metric_block("SWCC", "SWCC", []),
        },
        "SAI": {
            "disposition": dispositions["SAI"],
            "survivors_used": survivors,
            "ingestion": (coverage_stats(sai_values, filt) if sai_values is not None else None),
            "screens": sai_screen,
        },
        "graph_registration": {
            "note": "Every metric is ingested as a situational-graph edge family at weight 0 with its "
                    "disposition as its status. Refusal is a status inside the engine, never exile. "
                    "Survivors hold future-filter pre-registration slots only.",
            "edge_families": {
                name: {"edge_family": f"situational.p1.{name.lower().replace('-', '_')}",
                       "weight": 0, "status": dispositions[name],
                       "target_parameter": TARGET_PARAMETERS[name]}
                for name in ("BQP", "SWCC", "RIL-P1", "QPTSR", "OLCAI", "SPESE", "CAOFI", "SAI")
            },
        },
        "passed": False,
        "emission": "ZERO_OBJECT (0 picks / 0 parlays / 0 DFS)",
        "walk_forward_json_touched": False,
    }
    with open(out_path, "w") as fh:
        json.dump(result, fh, indent=1)
    # ingestion artifact: per-game feature values for all seven + SAI
    with open(feat_path, "w") as fh:
        for g in filt:
            row = {"game_id": g["game_id"], "season": g["season"], "week": g["week"],
                   "BQP": feats["BQP"].get(g["game_id"]), "SWCC": feats["SWCC"].get(g["game_id"]),
                   "RIL": feats["RIL"].get(g["game_id"]), "RIL_ABS": feats["RIL_ABS"].get(g["game_id"]),
                   "QPTSR": feats["QPTSR"].get(g["game_id"]), "OLCAI": feats["OLCAI"].get(g["game_id"]),
                   "SPESE": feats["SPESE"].get(g["game_id"]), "CAOFI": feats["CAOFI"].get(g["game_id"]),
                   "SAI": (sai_values.get(g["game_id"]) if sai_values else None)}
            fh.write(json.dumps(row) + "\n")
    for name in ("CAOFI", "RIL-P1", "OLCAI", "SPESE", "QPTSR", "BQP", "SWCC", "SAI"):
        print(name, "->", dispositions[name])
    print("looks:", looks, "| survivors:", survivors)
    print("wrote", out_path, "and", feat_path)


if __name__ == "__main__":
    main()
