#!/usr/bin/env python3
"""
All-in-One 2026 Weeks 1-9 (requested) Analytics & Matchup Engine — successor to
scripts/ops/build_all_in_one_2026_analytics_engine.py (left untouched).

Systems carried over (computed ONLY from real local data):
  #11 System-Optimal Play-Calling Minimax Equilibrium (54.4% reference constant, labeled)
  #12 2026 Anytime TD & Redzone Distribution
  #13 QB Ball Placement, Target Quality & Pressure Survival
  #14 Defensive Trenches, Coverage & Sim Pressure
  #15 Target Funnel & YAC / Missed Tackle Mismatches (SumerSports W1-7 CSV)
  #16 Flores Variance, Pace & Script Equilibrium
  NEW: conditional blitz / script splits (real samples or null)
  NEW: week10MatchupFaultLines (Week 10 slate from Neon snapshot / ESPN cross-check)

ZERO-FABRICATION CONTRACT:
  - PBP/FTN true coverage is reported; if PBP does not reach 2026-11-09 (W9 MNF),
    the shortfall is printed prominently and recorded in dataGaps.
  - dfsCrackingTheCodeRules: legacy generator hardcoded publisher-stated DFS Army
    figures (no primary CSV exists in the repo; underlying lineup data not public).
    Section kept with nulls + dataGaps — stale numbers NOT carried forward.
  - PFR team missed tackles were hardcoded in the legacy generator with no
    verifiable source file -> null + dataGaps. Real SumerSports W1-7 missed-tackle
    CSV is used instead under explicitly named fields.
  - Week 10 active-roster filtering unavailable (injuries parquet W1-6 only, depth
    charts stale to 2026-10-14) -> activeWeek10 null + dataGaps.
  - No legacy hardcoded fallback rates; empty samples => null.

Output: data/engine/nfl_2026_w1_w9_advanced_charting_and_funnels.json
"""
from __future__ import annotations

import datetime as dt
import json
import math
from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
COACH_DIR = REPO / "intelligence" / "coaching" / "data"
TABLES_DIR = REPO / "docs" / "research" / "2026-10-28" / "full-tables"
ENGINE_DIR = REPO / "data" / "engine"
OUT_JSON = ENGINE_DIR / "nfl_2026_w1_w9_advanced_charting_and_funnels.json"

SEASON = 2026
WEEKS_REQUESTED = list(range(1, 10))
SCHEMA = "gse_all_in_one_2026_charting_funnels_equilibrium.v1"

MIN_PLAYS_SCRIPT = 30
MIN_DROPBACKS_SCRIPT = 30
MIN_DROPBACKS_DOWN = 20

NICKNAME_TO_ABBR = {
    "Cardinals": "ARI", "Falcons": "ATL", "Ravens": "BAL", "Bills": "BUF",
    "Panthers": "CAR", "Bears": "CHI", "Bengals": "CIN", "Browns": "CLE",
    "Cowboys": "DAL", "Broncos": "DEN", "Lions": "DET", "Packers": "GB",
    "Texans": "HOU", "Colts": "IND", "Jaguars": "JAX", "Chiefs": "KC",
    "Raiders": "LV", "Chargers": "LAC", "Rams": "LAR", "Dolphins": "MIA",
    "Vikings": "MIN", "Patriots": "NE", "Saints": "NO", "Giants": "NYG",
    "Jets": "NYJ", "Eagles": "PHI", "Steelers": "PIT", "49ers": "SF",
    "Seahawks": "SEA", "Buccaneers": "TB", "Titans": "TEN", "Commanders": "WAS",
}
FULL_NAME_TO_ABBR = {
    "Arizona Cardinals": "ARI", "Atlanta Falcons": "ATL", "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF", "Carolina Panthers": "CAR", "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN", "Cleveland Browns": "CLE", "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN", "Detroit Lions": "DET", "Green Bay Packers": "GB",
    "Houston Texans": "HOU", "Indianapolis Colts": "IND", "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC", "Las Vegas Raiders": "LV", "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR", "Miami Dolphins": "MIA", "Minnesota Vikings": "MIN",
    "New England Patriots": "NE", "New Orleans Saints": "NO", "New York Giants": "NYG",
    "New York Jets": "NYJ", "Philadelphia Eagles": "PHI", "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF", "Seattle Seahawks": "SEA", "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN", "Washington Commanders": "WAS",
}
ABBR_ALIAS = {"WSH": "WAS", "LA": "LAR"}


def norm_team(t: str) -> str:
    if not isinstance(t, str):
        return ""
    t = t.strip().upper()
    return ABBR_ALIAS.get(t, t)


def jround(x, n: int = 3):
    if x is None:
        return None
    try:
        xf = float(x)
    except (TypeError, ValueError):
        return None
    if math.isnan(xf) or math.isinf(xf):
        return None
    return round(xf, n)


def _clean(o):
    if isinstance(o, dict):
        return {str(k): _clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_clean(v) for v in o]
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return None if np.isnan(o) else float(o)
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, float):
        return None if (math.isnan(o) or math.isinf(o)) else o
    if isinstance(o, (dt.datetime, dt.date)):
        return o.isoformat()
    return o


def week_coverage(df: pd.DataFrame) -> dict:
    weeks = sorted(int(w) for w in df["week"].dropna().unique()) if "week" in df.columns else []
    by_week = {int(k): int(v) for k, v in df["week"].value_counts().sort_index().items()} if "week" in df.columns else {}
    return {"weeks": weeks, "rows_by_week": by_week}


def script_bucket_off(diff: float) -> str:
    if diff >= 8:
        return "leading"
    if diff <= -8:
        return "trailing"
    return "neutral"


def _canon_ts(t) -> str | None:
    """Canonical UTC timestamp so Neon ('...T18:00:00Z') and ESPN ('...T18:00Z') compare equal."""
    if not t:
        return None
    d = dt.datetime.fromisoformat(str(t).replace(" ", "T").replace("Z", "+00:00"))
    return d.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_week10_schedule(data_gaps: list) -> tuple[list, str, str]:
    games: list = []
    source = ""
    cross = ""
    sch_path = COACH_DIR / "schedule.csv"
    if sch_path.exists():
        sch = pd.read_csv(sch_path)
        s26w10 = sch[(sch["season"] == SEASON) & (sch["week"] == 10)]
        if len(s26w10):
            seen = set()
            for _, r in s26w10.iterrows():
                team, opp = norm_team(str(r["team"])), norm_team(str(r["opponent"]))
                key = tuple(sorted((team, opp)))
                if key in seen:
                    continue
                seen.add(key)
                games.append({"away": opp, "home": team, "commenceTimeUtc": None})
            source = "intelligence/coaching/data/schedule.csv (season 2026, week 10)"
    neon_path = ENGINE_DIR / "sources" / "neon_week10_schedule_2026.json"
    espn_path = ENGINE_DIR / "espn_2026_week10_scoreboard.json"
    neon_games: list = []
    if neon_path.exists():
        snap = json.loads(neon_path.read_text(encoding="utf-8"))
        for g in snap.get("games", []):
            home = FULL_NAME_TO_ABBR.get(str(g.get("homeTeamName", "")).strip())
            away = FULL_NAME_TO_ABBR.get(str(g.get("awayTeamName", "")).strip())
            if home and away:
                neon_games.append({"away": away, "home": home, "commenceTimeUtc": _canon_ts(g["commenceTime"])})
    espn_games: list = []
    if espn_path.exists():
        ed = json.loads(espn_path.read_text(encoding="utf-8"))
        for e in ed.get("events", []):
            comp = e.get("competitions", [{}])[0]
            abbr = {c.get("homeAway"): c.get("team", {}).get("abbreviation") for c in comp.get("competitors", [])}
            home, away = norm_team(abbr.get("home", "")), norm_team(abbr.get("away", ""))
            if home and away:
                espn_games.append({"away": away, "home": home, "commenceTimeUtc": _canon_ts(e.get("date")),
                                   "venueRaw": comp.get("venue", {}).get("fullName")})
    if not games and neon_games:
        games = neon_games
        source = "data/engine/sources/neon_week10_schedule_2026.json (Neon read-only snapshot)"
    if not games and espn_games:
        games = espn_games
        source = "data/engine/espn_2026_week10_scoreboard.json (ESPN snapshot fallback)"
        data_gaps.append({"source": "schedule.csv / Neon", "gap": "Week 10 schedule from ESPN fallback.", "impact": "week10MatchupFaultLines provenance"})
    if neon_games and espn_games:
        n_set = {(g["away"], g["home"], g["commenceTimeUtc"]) for g in neon_games}
        e_set = {(g["away"], g["home"], g["commenceTimeUtc"]) for g in espn_games}
        cross = f"Neon vs ESPN: {len(n_set & e_set)}/{len(n_set)} games agree on teams + UTC commence time"
    if not games:
        data_gaps.append({"source": "schedule sources", "gap": "No Week 10 schedule available.", "impact": "week10MatchupFaultLines empty"})
    return games, source, cross


def main():
    data_gaps: list = []
    notes: list = [
        "Zero-fabrication build: all values computed from local parquet/CSV; empty samples => null + dataGaps. No legacy hardcoded fallback rates.",
        "equilibriumReferencePct 54.4 is a labeled legacy research constant (W1-7 all-in-one research, system #11), not a measured 2026 value.",
        "Conditional script buckets (offense perspective): leading >= +8, trailing <= -8, neutral |diff| < 8; defense mirrored. Min samples 30/30/20.",
        "week8MatchupFaultLines from the W1-7 artifact is superseded by week10MatchupFaultLines (same internal structure, computed for the real Week 10 slate).",
        "Receiver board is NOT active-roster filtered for Week 10 (injuries/depth-chart sources stale); activeWeek10 is null for every player.",
    ]

    pbp = pd.read_parquet(COACH_DIR / "play_by_play_2026.parquet")
    ftn = pd.read_parquet(COACH_DIR / "ftn_charting_2026.parquet")
    snaps = pd.read_parquet(COACH_DIR / "snap_counts_2026.parquet")

    pbp_cov, ftn_cov, snap_cov = week_coverage(pbp), week_coverage(ftn), week_coverage(snaps)
    max_date = str(pbp["game_date"].max()) if "game_date" in pbp.columns else None
    print("=== SOURCE COVERAGE (verified from data) ===")
    print(f"PBP  rows={len(pbp)} weeks={pbp_cov['weeks']} max_game_date={max_date} rows_by_week={pbp_cov['rows_by_week']}")
    print(f"FTN  rows={len(ftn)} weeks={ftn_cov['weeks']} rows_by_week={ftn_cov['rows_by_week']}")
    print(f"SNAP rows={len(snaps)} weeks={snap_cov['weeks']}")
    if max_date is None or max_date < "2026-11-09":
        print(f"*** SHORTFALL: PBP max game_date {max_date} < 2026-11-09 (Week 9 MNF). TRUE coverage {pbp_cov['weeks']} emitted; W8-9 gap recorded. ***")
        data_gaps.append({
            "source": "intelligence/coaching/data/play_by_play_2026.parquet",
            "gap": f"PBP covers only weeks {pbp_cov['weeks']} (max game_date {max_date}); does NOT reach Week 9 MNF 2026-11-09. "
                   f"Partial W8 (188 rows, CAR@GB TNF only) exists in docs/research/2026-10-30/signal-pack/data/play_by_play_2026.csv.gz — not merged.",
            "impact": "All charting/funnel/equilibrium fields computed over true W1-7 coverage; weeksCovered='1-7'; no W8-9 values invented.",
        })
    if set(ftn_cov["weeks"]) < set(WEEKS_REQUESTED):
        data_gaps.append({
            "source": "intelligence/coaching/data/ftn_charting_2026.parquet",
            "gap": f"FTN charting covers only weeks {ftn_cov['weeks']}; no W8-9 charting.",
            "impact": "All FTN-dependent charting fields (QB placement, target quality, sim pressure, blitz splits) are W1-7; ftnWeeksCovered labels coverage.",
        })

    pbp["posteam"] = pbp["posteam"].astype(str).map(norm_team)
    pbp["defteam"] = pbp["defteam"].astype(str).map(norm_team)
    snaps = snaps.copy()
    snaps["team"] = snaps["team"].astype(str).map(norm_team)

    ftn_cols = [
        "nflverse_game_id", "nflverse_play_id", "n_defense_box", "is_motion",
        "is_play_action", "is_screen_pass", "is_rpo", "is_catchable_ball",
        "is_contested_ball", "is_drop", "is_interception_worthy", "is_throw_away",
        "is_qb_out_of_pocket", "is_qb_fault_sack", "n_blitzers", "n_pass_rushers",
        "read_thrown", "is_created_reception", "qb_location",
    ]
    ftn_sub = ftn[[c for c in ftn_cols if c in ftn.columns]].drop_duplicates(
        subset=["nflverse_game_id", "nflverse_play_id"]
    )
    merged = pbp.merge(
        ftn_sub, left_on=["game_id", "play_id"],
        right_on=["nflverse_game_id", "nflverse_play_id"], how="left",
    )
    merged["script_off"] = merged["score_differential"].map(
        lambda d: script_bucket_off(float(d)) if pd.notna(d) else None
    )

    # Position lookup from snap counts (W1-7 vintage — labeled)
    pos_map = {}
    for _, r in snaps[["player", "position"]].drop_duplicates(subset=["player"]).iterrows():
        pos_map[str(r["player"])] = str(r["position"])

    def get_pos(name):
        p = pos_map.get(name, "")
        if not p:
            for k, v in pos_map.items():
                if name.endswith(k.split()[-1]) and name[0] == k[0]:
                    return v
        return p

    # ------------------------------------------------------------------ #13 QB profiles
    qb_profiles = {}
    pass_plays = merged[(merged["pass_attempt"] == 1) & (merged["qb_spike"] == 0) & merged["is_catchable_ball"].notna()].copy()
    for qb, grp in pass_plays.groupby("passer_player_name"):
        if pd.isna(qb) or len(grp) < 35:
            continue
        team = grp["posteam"].mode().iloc[0] if len(grp["posteam"].mode()) else ""
        att = len(grp)
        throwaways = int((grp["is_throw_away"] == True).sum())
        aimed = max(1, att - throwaways)
        catchable = int((grp["is_catchable_ball"] == True).sum())
        aimed_ca = int(((grp["is_catchable_ball"] == True) & (grp["is_throw_away"] == False)).sum())
        contested = int((grp["is_contested_ball"] == True).sum())
        pickable = int((grp["is_interception_worthy"] == True).sum())
        drops = int((grp["is_drop"] == True).sum())
        created = int((grp["is_created_reception"] == True).sum())
        first_read = int((grp["read_thrown"].astype(str).str.lower().isin(["1", "1.0", "first", "primary"])).sum())
        oop = int((grp["is_qb_out_of_pocket"] == True).sum())
        inp = grp[grp["is_qb_out_of_pocket"] == False]
        oop_p = grp[grp["is_qb_out_of_pocket"] == True]
        qb_db = merged[(merged["posteam"] == team) & (merged["qb_dropback"] == 1) & (merged["passer_player_name"] == qb)]
        sacks = int(qb_db["sack"].fillna(0).sum()) if len(qb_db) else 0
        qb_fault_sacks = int((qb_db["is_qb_fault_sack"] == True).sum()) if len(qb_db) else 0
        hits = int(qb_db["qb_hit"].fillna(0).sum()) if len(qb_db) else 0
        press_snaps = sacks + hits
        in_ca_pct = round(float(inp["is_catchable_ball"].mean() * 100.0), 1) if len(inp) >= 10 else None
        out_ca_pct = round(float(oop_p["is_catchable_ball"].mean() * 100.0), 1) if len(oop_p) >= 10 else None
        ca_aimed_pct = round(aimed_ca / aimed * 100.0, 1) if att >= 35 else None
        pressure_to_sack = round(sacks / press_snaps * 100.0, 1) if press_snaps > 0 else None
        archetype = None
        if ca_aimed_pct is not None and in_ca_pct is not None and out_ca_pct is not None and pressure_to_sack is not None:
            if ca_aimed_pct >= 80.0 and in_ca_pct >= 84.0 and out_ca_pct >= 74.0 and pressure_to_sack <= 15.0:
                archetype = "Elite Placement & Pocket Manipulation (Tier 1)"
            elif ca_aimed_pct >= 76.0 and out_ca_pct >= 70.0:
                archetype = "High-Floor Scheme Creator (Tier 2)"
            elif ca_aimed_pct < 70.0 or pressure_to_sack > 24.0:
                archetype = "High-Variance / Pressure Sensitive (Tier 3)"
            else:
                archetype = "Balanced System Distributor"
        qb_profiles[qb] = {
            "team": team, "qb": qb, "chartedPassAttempts": att, "aimedPassAttempts": aimed, "throwaways": throwaways,
            "catchableBallRateRawPct": jround(catchable / att * 100.0, 1),
            "catchableBallRateAimedPct": ca_aimed_pct,
            "openTargetRatePct": jround((aimed - contested) / aimed * 100.0, 1),
            "contestedTargetRatePct": jround(contested / aimed * 100.0, 1),
            "pickablePassRatePct": jround(pickable / aimed * 100.0, 2),
            "receiverDropRatePct": jround(drops / max(1, catchable) * 100.0, 1),
            "createdReceptionRatePct": jround(created / att * 100.0, 1),
            "firstReadThrowSharePct": jround(first_read / att * 100.0, 1),
            "outOfPocketPassSharePct": jround(oop / att * 100.0, 1),
            "inPocketCatchablePct": in_ca_pct,
            "outOfPocketCatchablePct": out_ca_pct,
            "sackRatePct": jround(sacks / max(1, len(qb_db)) * 100.0, 1) if len(qb_db) else None,
            "pressureToSackRatePct": pressure_to_sack,
            "qbFaultSackSharePct": jround(qb_fault_sacks / max(1, sacks) * 100.0, 1) if sacks > 0 else None,
            "pressureSurvivalArchetype": archetype,
        }

    # ------------------------------------------------------------------ receiver profiles
    receiver_profiles = {}
    tgt_plays = merged[(merged["pass_attempt"] == 1) & merged["receiver_player_name"].notna() & merged["is_catchable_ball"].notna()].copy()
    for rec, grp in tgt_plays.groupby("receiver_player_name"):
        if pd.isna(rec) or len(grp) < 20:
            continue
        team = grp["posteam"].mode().iloc[0] if len(grp["posteam"].mode()) else ""
        tgts = len(grp)
        ca = int((grp["is_catchable_ball"] == True).sum())
        contested = grp[grp["is_contested_ball"] == True]
        recs = int(grp["complete_pass"].fillna(0).sum())
        drops = int((grp["is_drop"] == True).sum())
        created = int((grp["is_created_reception"] == True).sum())
        receiver_profiles[rec] = {
            "team": team, "player": rec, "targets": tgts, "catchableTargets": ca,
            "catchableTargetRatePct": jround(ca / tgts * 100.0, 1),
            "openTargetRatePct": jround((tgts - len(contested)) / tgts * 100.0, 1),
            "contestedCatchRatePct": jround(float(contested["complete_pass"].fillna(0).mean()) * 100.0, 1) if len(contested) else None,
            "dropRatePct": jround(drops / max(1, ca) * 100.0, 1),
            "createdReceptions": created,
            "activeWeek10": None,
        }
    data_gaps.append({
        "source": "injuries_2026.parquet / depth_charts_2026.parquet",
        "gap": "Injury reports cover weeks 1-6 only; depth charts latest dt 2026-10-14. No reliable Week 10 active/inactive determination exists locally.",
        "impact": "activeWeek10 is null for all receivers; receiverCatchableAndContestedProfiles is the top-80 catchable-target board WITHOUT active-roster filtering (legacy Week-8 exclusion list NOT carried forward).",
    })

    # ------------------------------------------------------------------ missed tackles (real CSV)
    sumer_mt: dict = {}
    mt_path = TABLES_DIR / "sumersports-missed-tackle-rate-2026.csv"
    if mt_path.exists():
        mtdf = pd.read_csv(mt_path)
        for _, r in mtdf.iterrows():
            ab = norm_team(str(r["team"]))
            if ab:
                sumer_mt[ab] = {"missed_tackles": int(r["missed_tackles"]), "tackle_attempts": int(r["attempts"]),
                                "missed_rate_pct": float(r["missed_rate_pct"])}
        data_gaps.append({
            "source": "docs/research/2026-10-28/full-tables/sumersports-missed-tackle-rate-2026.csv",
            "gap": "SumerSports missed-tackle CSV is W1-7 vintage (2026-10-28 snapshot); no W8-9 refresh.",
            "impact": "sumerSportsMissedTacklesW1W7 fields labeled with true coverage.",
        })
    else:
        data_gaps.append({"source": "sumersports-missed-tackle-rate-2026.csv", "gap": "CSV missing.", "impact": "SumerSports missed-tackle fields null."})
    data_gaps.append({
        "source": "PFR team missed tackles (legacy hardcoded dict)",
        "gap": "Legacy W1-7 generator hardcoded PFR missed-tackle counts with no verifiable source file in the repo; no W8-9 PFR data available.",
        "impact": "pfrTeamMissedTacklesW1W7 kept as null (stale hardcoded numbers NOT carried forward); real SumerSports W1-7 CSV provided under separate fields.",
    })

    # ------------------------------------------------------------------ #12 anytime TD splits
    td_plays = merged[merged["touchdown"] == 1].copy()
    rush_tds = td_plays[td_plays["rush"] == 1]
    pass_tds = td_plays[td_plays["pass"] == 1]
    gl_rush_10 = rush_tds[rush_tds["yardline_100"] <= 10]
    gl_rush_5 = rush_tds[rush_tds["yardline_100"] <= 5]
    gl_rush_1 = rush_tds[rush_tds["yardline_100"] <= 1]
    gl_pass_5 = pass_tds[pass_tds["yardline_100"] <= 5]
    league_td_splits = {
        "totalRushingTdsW1W7": int(len(rush_tds)),
        "totalPassingTdsW1W7": int(len(pass_tds)),
        "rushingTdsInside10Pct": jround(len(gl_rush_10) / max(1, len(rush_tds)) * 100.0, 1),
        "rushingTdsInside5Pct": jround(len(gl_rush_5) / max(1, len(rush_tds)) * 100.0, 1),
        "rushingTdsFrom1YardLinePct": jround(len(gl_rush_1) / max(1, len(rush_tds)) * 100.0, 1),
        "passingTdsInside5Pct": jround(len(gl_pass_5) / max(1, len(pass_tds)) * 100.0, 1),
    }

    # ------------------------------------------------------------------ #15 DFS rules: nulls + gap
    dfs_rules = {
        "sampleSizeTop100Lineups": None,
        "totalTournamentLineupsAnalyzed": None,
        "qbStackRatePct": None,
        "nonWr1PartnerShareOfWinningStacksPct": None,
        "secondaryCorrelatedGamePairRatePct": None,
        "minTwoSub10PctOwnedSkillPlayersRatePct": None,
        "gameTotalUnder48SharePct": None,
        "rbOrSecondTeFlexSharePct": None,
    }
    data_gaps.append({
        "source": "dfsCrackingTheCodeRules (DFS Army / Kevin 'Geek' Alan publisher study)",
        "gap": "Legacy generator hardcoded publisher-stated figures (34,856 top-100 lineups / 232,000 analyzed). No primary CSV exists in the repo; underlying lineup-level data is not public (see docs/data-sources/research/2026-10-29/2026-10-29-RESEARCH-ALL-IN-ONE.md #14: publisher-stated, not independently reproducible).",
        "impact": "All dfsCrackingTheCodeRules fields null; stale W1-7-vintage numbers NOT carried forward unlabeled.",
    })

    # ------------------------------------------------------------------ per-team analytics
    team_analytics = {}
    all_teams = sorted(set(NICKNAME_TO_ABBR.values()))
    suppressed_splits: list = []

    for team in all_teams:
        off = merged[merged["posteam"] == team]
        dfn = merged[merged["defteam"] == team]
        off_pass = off[off["pass"] == 1]
        off_rush = off[off["rush"] == 1]
        off_targets = off[off["receiver_player_name"].notna()]

        wr_targets = off_targets[off_targets["receiver_player_name"].apply(lambda x: get_pos(str(x)) in ("WR", "TE", "RB"))]
        total_tgts = max(1, len(wr_targets))
        wr_cnt = int(wr_targets["receiver_player_name"].apply(lambda x: get_pos(str(x)) == "WR").sum())
        te_cnt = int(wr_targets["receiver_player_name"].apply(lambda x: get_pos(str(x)) == "TE").sum())
        rb_cnt = int(wr_targets["receiver_player_name"].apply(lambda x: get_pos(str(x)) == "RB").sum())
        classified = wr_cnt + te_cnt + rb_cnt
        if classified > 0:
            wr_share = round(wr_cnt / classified * 100.0, 1)
            te_share = round(te_cnt / classified * 100.0, 1)
            rb_share = round(rb_cnt / classified * 100.0, 1)
        else:
            wr_share = te_share = rb_share = None

        top_wr = wr_targets[wr_targets["receiver_player_name"].apply(lambda x: get_pos(str(x)) == "WR")]["receiver_player_name"].value_counts()
        wr1_name = str(top_wr.index[0]) if len(top_wr) else None
        wr1_tgts = int(top_wr.iloc[0]) if len(top_wr) else 0
        wr1_share = round(wr1_tgts / total_tgts * 100.0, 1) if len(wr_targets) else None
        non_wr1_share = round(100.0 - wr1_share, 1) if wr1_share is not None else None

        funnel_type = None
        if wr_share is not None:
            if te_share + rb_share >= 38.0:
                funnel_type = "Distributed Mismatch Funnel (TE/RB Heavy)"
            elif wr1_share is not None and wr1_share >= 28.0:
                funnel_type = "Alpha WR1 Dominant Funnel"
            else:
                funnel_type = "Balanced Multi-WR Spread Funnel"

        charted_tgts = off_targets[off_targets["is_screen_pass"].notna()]
        screen_rate = round(float((charted_tgts["is_screen_pass"] == True).mean() * 100.0), 1) if len(charted_tgts) else None

        off_yac = off_pass[off_pass["complete_pass"] == 1]
        avg_off_yac = float(off_yac["yards_after_catch"].mean()) if len(off_yac) else None
        dfn_comp = dfn[(dfn["pass"] == 1) & (dfn["complete_pass"] == 1)]
        avg_def_yac_allowed = float(dfn_comp["yards_after_catch"].mean()) if len(dfn_comp) else None

        neutral = off[(off["qtr"] <= 3) & (off["score_differential"].abs() <= 10)]
        neutral_pass_rate = float(neutral["pass"].mean() * 100.0) if len(neutral) else None
        ed_pass = off[(off["down"].isin([1, 2])) & (off["pass"] == 1)]
        run_after_inc = None
        if len(ed_pass) >= 5:
            seq = ed_pass.sort_values(["game_id", "drive", "play_id"]).copy()
            seq["prev_inc"] = seq.groupby(["game_id", "drive"])["incomplete_pass"].shift(1).fillna(0)
            after_inc = seq[seq["prev_inc"] == 1]
            if len(after_inc) >= 5:
                run_after_inc = round(float(after_inc["rush"].mean() * 100.0), 1)
        proe = float(off["pass_oe"].dropna().mean()) if "pass_oe" in off.columns and len(off["pass_oe"].dropna()) else None

        off["drive_play_idx"] = off.groupby(["game_id", "drive"])["play_id"].rank(method="first")
        first3 = off[off["drive_play_idx"] <= 3]
        first3_pass_rate = float(first3["pass"].mean() * 100.0) if len(first3) else None
        autocorr = None
        if len(off) >= 20:
            ac = off.sort_values(["game_id", "play_id"])["pass"].astype(float).autocorr(lag=1)
            autocorr = jround(ac, 3)

        def_db = dfn[dfn["qb_dropback"] == 1]
        charted_def_db = def_db[def_db["n_pass_rushers"].notna()]
        four_man = charted_def_db[charted_def_db["n_pass_rushers"] == 4]
        sim_press = charted_def_db[(charted_def_db["n_pass_rushers"] == 4) & (charted_def_db["n_blitzers"] >= 1)]
        four_man_sack_rate = round(float(four_man["sack"].fillna(0).mean() * 100.0), 1) if len(four_man) else None
        sim_press_rate = round(len(sim_press) / max(1, len(charted_def_db)) * 100.0, 1) if len(charted_def_db) else None

        wp_std = float(dfn["wp"].dropna().std()) if "wp" in dfn.columns and len(dfn["wp"].dropna()) >= 10 else None
        high_leverage_share = round(float((dfn["wp"].between(0.35, 0.65)).mean() * 100.0), 1) if "wp" in dfn.columns and len(dfn) else None

        off_rz = off[off["yardline_100"] <= 20]
        gl_snaps = off[off["yardline_100"] <= 5]
        gl_rush = gl_snaps[gl_snaps["rush"] == 1]
        gl_pass = gl_snaps[gl_snaps["pass"] == 1]
        rb_gl_share = None
        wr_gl_share = None
        te_gl_share = None
        if len(gl_snaps):
            rb_gl_share = round(len(gl_rush) / max(1, len(gl_snaps)) * 100.0, 1)
            gl_tgts = gl_pass[gl_pass["receiver_player_name"].notna()]
            if len(gl_tgts):
                wr_gl_share = round(float(gl_tgts["receiver_player_name"].apply(lambda x: get_pos(str(x)) == "WR").mean() * 100.0), 1)
                te_gl_share = round(float(gl_tgts["receiver_player_name"].apply(lambda x: get_pos(str(x)) == "TE").mean() * 100.0), 1)
        anytime_td_threat = "High-Volume RB + Mismatch TE" if (rb_gl_share or 0) >= 50.0 else "WR Redzone Specialist + QB Scramble"

        motion_pa = off[(off["is_motion"] == True) | (off["is_play_action"] == True)]
        motion_pa_epa = float(motion_pa["epa"].mean()) if len(motion_pa) >= 5 else None
        under_center_sniffer = off[(off["qb_location"].astype(str).str.lower().str.contains("under")) | (off["shotgun"] == 0)]
        sniffer_epa = float(under_center_sniffer["epa"].mean()) if len(under_center_sniffer) >= 5 else None

        # ---------------- conditional splits ----------------
        cond: dict = {
            "scriptBuckets": {"leading": "offense score_differential >= +8", "trailing": "<= -8", "neutral": "|diff| < 8"},
            "minSamples": {"passRateByScript": MIN_PLAYS_SCRIPT, "blitzByScript": MIN_DROPBACKS_SCRIPT, "blitzByDown": MIN_DROPBACKS_DOWN},
            "pass_rate_by_script": {}, "def_blitz_rate_by_script": {}, "def_blitz_rate_by_down": {},
            "man_coverage_rate_by_down": None,
        }
        off_scrim = off[(off["pass"] == 1) | (off["rush"] == 1)]
        for b in ("leading", "trailing", "neutral"):
            sub = off_scrim[off_scrim["script_off"] == b]
            n = int(len(sub))
            if n >= MIN_PLAYS_SCRIPT:
                cond["pass_rate_by_script"][b] = {"pass_pct": round(float(sub["pass"].mean() * 100.0), 1), "plays": n}
            else:
                cond["pass_rate_by_script"][b] = None
                suppressed_splits.append(f"{team}.pass_rate_by_script.{b} (n={n})")
            mirror = {"leading": "trailing", "trailing": "leading", "neutral": "neutral"}
            dsub = charted_def_db[charted_def_db["script_off"].map(mirror.get) == b]
            nd = int(len(dsub))
            if nd >= MIN_DROPBACKS_SCRIPT:
                cond["def_blitz_rate_by_script"][b] = {"blitz_pct": round(float((dsub["n_blitzers"] >= 1).mean() * 100.0), 1), "charted_dropbacks": nd}
            else:
                cond["def_blitz_rate_by_script"][b] = None
                suppressed_splits.append(f"{team}.def_blitz_rate_by_script.{b} (n={nd})")
        for d in (1, 2, 3, 4):
            dsub = charted_def_db[charted_def_db["down"] == d]
            nd = int(len(dsub))
            if nd >= MIN_DROPBACKS_DOWN:
                cond["def_blitz_rate_by_down"][str(d)] = {"blitz_pct": round(float((dsub["n_blitzers"] >= 1).mean() * 100.0), 1), "charted_dropbacks": nd}
            else:
                cond["def_blitz_rate_by_down"][str(d)] = None
                suppressed_splits.append(f"{team}.def_blitz_rate_by_down.{d} (n={nd})")

        mt = sumer_mt.get(team, {})
        team_analytics[team] = {
            "team": team,
            "targetFunnel": {
                "totalTargets": len(wr_targets),
                "wrTargetSharePct": wr_share,
                "teTargetSharePct": te_share,
                "rbTargetSharePct": rb_share,
                "wr1Name": wr1_name,
                "wr1TargetSharePct": wr1_share,
                "nonWr1TargetSharePct": non_wr1_share,
                "funnelClassification": funnel_type,
                "proeAllowedPct": jround(proe, 2),
                "screenCheckdownRatePct": screen_rate,
            },
            "tacklingAndYac": {
                "pfrTeamMissedTacklesW1W7": None,
                "sumerSportsMissedTacklesW1W7": mt.get("missed_tackles"),
                "sumerSportsTackleAttemptsW1W7": mt.get("tackle_attempts"),
                "sumerSportsMissedTackleRatePctW1W7": mt.get("missed_rate_pct"),
                "missedTacklesSource": "sumersports-missed-tackle-rate-2026.csv (W1-7 vintage); PFR legacy counts null (no verifiable source)",
                "offYacPerCompletion": jround(avg_off_yac, 2),
                "defYacAllowedPerCompletion": jround(avg_def_yac_allowed, 2),
            },
            "minimaxPlayCallEquilibrium": {
                "neutralPassRatePct": jround(neutral_pass_rate, 1),
                "equilibriumReferencePct": 54.4,
                "equilibriumReferenceNote": "Legacy research constant (W1-7 all-in-one system #11), not a measured 2026 value",
                "equilibriumIndifferenceGapPp": jround(neutral_pass_rate - 54.4, 1) if neutral_pass_rate is not None else None,
                "runRateAfterEarlyDownIncPct": run_after_inc,
                "playCallAutocorrelation": autocorr,
            },
            "floresVarianceAndSimPressure": {
                "wpVolatilityStd": jround(wp_std, 3),
                "highLeverageSnapSharePct": high_leverage_share,
                "fourManRushSackRatePct": four_man_sack_rate,
                "simulatedPressureRatePct": sim_press_rate,
            },
            "trueOneOnOneTrench": {
                "fourManRushDropbacks": len(four_man),
                "fourManSackRatePct": jround(float(four_man["sack"].fillna(0).mean() * 100.0), 1) if len(four_man) else None,
                "fourManQbHitRatePct": jround(float(four_man["qb_hit"].fillna(0).mean() * 100.0), 1) if len(four_man) else None,
                "fourManEpaAllowedPerDropback": jround(float(four_man["epa"].mean()), 3) if len(four_man) else None,
            },
            "goalLineAnytimeTdProfile": {
                "rbGoalLineCarrySharePct": rb_gl_share,
                "wrGoalLineTargetSharePct": wr_gl_share,
                "teGoalLineTargetSharePct": te_gl_share,
                "anytimeTdArchetype": anytime_td_threat,
            },
            "schemeBeaterDeclaration": {
                "motionAndPlayActionEpa": jround(motion_pa_epa, 3),
                "underCenterPlayActionSnifferEpa": jround(sniffer_epa, 3),
            },
            "conditionalSplits": cond,
        }

    if suppressed_splits:
        data_gaps.append({
            "source": "conditional splits minimum-sample gate",
            "gap": f"{len(suppressed_splits)} team/split cells below minimum sample set to null: " + "; ".join(suppressed_splits),
            "impact": "conditionalSplits cells null (no small-sample rates fabricated).",
        })
    man_cols = [c for c in ftn.columns if c in ("is_man_coverage", "coverage_scheme", "man_coverage", "is_zone_coverage")]
    if not man_cols:
        data_gaps.append({
            "source": "intelligence/coaching/data/ftn_charting_2026.parquet",
            "gap": "No man/zone coverage-scheme column in FTN charting (is_man_coverage / coverage_scheme / man_coverage / is_zone_coverage absent).",
            "impact": "conditionalSplits.man_coverage_rate_by_down null for all teams; blitz-by-down and blitz-by-script computed from n_blitzers.",
        })

    # ------------------------------------------------------------------ Week 10 matchup fault lines
    w10_games, sched_source, sched_cross = load_week10_schedule(data_gaps)
    w10_fault_lines: dict = {}
    for g in w10_games:
        away, home = g["away"], g["home"]
        a = team_analytics.get(away, {})
        h = team_analytics.get(home, {})
        a_off = merged[merged["posteam"] == away]
        h_off = merged[merged["posteam"] == home]
        a_ed = a_off[(a_off["down"].isin([1, 2])) & (a_off["interception"].fillna(0) == 0) & (a_off["fumble_lost"].fillna(0) == 0)]
        h_ed = h_off[(h_off["down"].isin([1, 2])) & (h_off["interception"].fillna(0) == 0) & (h_off["fumble_lost"].fillna(0) == 0)]
        a_to_epa = float(a_off.loc[(a_off["interception"].fillna(0) == 1) | (a_off["fumble_lost"].fillna(0) == 1), "epa"].sum()) / max(1, len(a_off)) if len(a_off) else None
        h_to_epa = float(h_off.loc[(h_off["interception"].fillna(0) == 1) | (h_off["fumble_lost"].fillna(0) == 1), "epa"].sum()) / max(1, len(h_off)) if len(h_off) else None
        a_chart = a_off[a_off["is_interception_worthy"].notna()]
        h_chart = h_off[h_off["is_interception_worthy"].notna()]
        venue_note = "Allianz Arena, Munich (international series — NOT Detroit)" if (away == "NE" and home == "DET") else None
        w10_fault_lines[f"{away}@{home}"] = {
            "matchup": f"{away} @ {home}",
            "commenceTimeUtc": g.get("commenceTimeUtc"),
            "venueNote": venue_note,
            "awayDefFunnel": h.get("targetFunnel", {}),
            "homeDefFunnel": a.get("targetFunnel", {}),
            "faultLine1_earlyDownNonTurnoverEpa": {
                "awayEarlyDownCleanEpa": jround(float(a_ed["epa"].mean()), 3) if len(a_ed) else None,
                "homeEarlyDownCleanEpa": jround(float(h_ed["epa"].mean()), 3) if len(h_ed) else None,
            },
            "faultLine2_turnoverLuckVsIntWorthy": {
                "awayTurnoverEpaPerPlay": jround(a_to_epa, 3),
                "awayIntWorthyRatePct": jround(float((a_chart["is_interception_worthy"] == True).mean() * 100.0), 2) if len(a_chart) else None,
                "homeTurnoverEpaPerPlay": jround(h_to_epa, 3),
                "homeIntWorthyRatePct": jround(float((h_chart["is_interception_worthy"] == True).mean() * 100.0), 2) if len(h_chart) else None,
            },
            "faultLine3_targetFunnelAndTacklingMismatch": {
                "awayMissedTackles": a.get("tacklingAndYac", {}).get("sumerSportsMissedTacklesW1W7"),
                "homeMissedTackles": h.get("tacklingAndYac", {}).get("sumerSportsMissedTacklesW1W7"),
                "missedTacklesSource": "sumersports-missed-tackle-rate-2026.csv (W1-7); null where unavailable",
                "awayYacPerComp": a.get("tacklingAndYac", {}).get("offYacPerCompletion"),
                "homeYacPerComp": h.get("tacklingAndYac", {}).get("offYacPerCompletion"),
            },
        }

    payload = {
        "schema": SCHEMA,
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "season": SEASON,
        "weeksRequested": "1-9",
        "weeksCovered": f"{min(pbp_cov['weeks'])}-{max(pbp_cov['weeks'])}" if pbp_cov["weeks"] else None,
        "pbpWeeksCovered": pbp_cov["weeks"],
        "ftnWeeksCovered": ftn_cov["weeks"],
        "snapWeeksCovered": snap_cov["weeks"],
        "pbpMaxGameDate": max_date,
        "pbpRows": int(len(pbp)),
        "ftnChartedRows": int(len(ftn)),
        "pbpRowsByWeek": pbp_cov["rows_by_week"],
        "ftnRowsByWeek": ftn_cov["rows_by_week"],
        "chartedPassAttempts": int(len(pass_plays)),
        "leagueAnytimeTdSplits": league_td_splits,
        "dfsCrackingTheCodeRules": dfs_rules,
        "qbBallPlacementAndPressureProfiles": qb_profiles,
        "receiverCatchableAndContestedProfiles": dict(sorted(receiver_profiles.items(), key=lambda kv: -kv[1]["catchableTargets"])[:80]),
        "allReceiverProfiles": list(receiver_profiles.values()),
        "teams": team_analytics,
        "week10MatchupFaultLines": w10_fault_lines,
        "week10ScheduleSource": sched_source,
        "week10ScheduleCrossCheck": sched_cross,
        "dataGaps": data_gaps,
        "notes": notes,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(_clean(payload), indent=2, allow_nan=False), encoding="utf-8")

    print(f"\nWrote {OUT_JSON}")
    print(f"QB profiles: {len(qb_profiles)} | receiver profiles: {len(receiver_profiles)} | teams: {len(team_analytics)} | week10 fault lines: {len(w10_fault_lines)}")
    print(f"dataGaps entries={len(data_gaps)}")
    for g in data_gaps:
        print(f"  - [{g['source']}] {g['gap'][:160]}")


if __name__ == "__main__":
    main()