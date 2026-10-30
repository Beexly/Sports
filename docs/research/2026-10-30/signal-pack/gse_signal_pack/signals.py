"""The seven signals. Definitions are stated in each docstring and travel
with the output tables — a borrowed chart's numbers are never imported,
only its method.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .data import PFR_TO_NFLVERSE, parse_pfr_defense_advanced, position_group

POSITIONS = ["QB", "RB", "WR", "TE", "OTHER"]


# ---------------------------------------------------------------------------
# 1. Red-zone expected TD share allowed, by position (@KoalatyStats method)
# ---------------------------------------------------------------------------

def red_zone_opportunities(pbp: pd.DataFrame, posmap: dict) -> pd.DataFrame:
    """Red-zone opportunities (targets + carries) with the ball-handler's
    roster position group and whether the play scored.

    Targets: pass_attempt == 1, spikes and two-point plays excluded,
    receiver_id present. Carries: rush_attempt == 1, two-point excluded.
    Red zone: yardline_100 <= 20.
    """
    rz = pbp[(pbp.yardline_100 <= 20) & (pbp.two_point_attempt == 0)]
    tg = rz[
        (rz.pass_attempt == 1) & (rz.qb_spike == 0) & rz.receiver_id.notna()
    ].copy()
    tg["player_id"] = tg.receiver_id
    tg["td"] = (tg.pass_touchdown == 1).astype(int)
    tg["kind"] = "target"
    ca = rz[rz.rush_attempt == 1].copy()
    ca["player_id"] = ca.rusher_id
    ca["td"] = (ca.rush_touchdown == 1).astype(int)
    ca["kind"] = "carry"
    cols = ["defteam", "posteam", "player_id", "td", "kind"]
    opps = pd.concat([tg[cols], ca[cols]], ignore_index=True)
    opps["pos_group"] = opps.player_id.map(posmap).map(position_group)
    return opps


def red_zone_expected_td_share(pbp: pd.DataFrame, posmap: dict) -> pd.DataFrame:
    """For each defense: expected TD share allowed by position in the RZ.

    Each opportunity a defense faced is priced at the *league* TD rate for
    that position group (targets and carries pooled, as the source chart's
    opportunity definition does); the expected TDs are then shared out by
    position. Propensity, not results: it says where a defense's red-zone
    TDs should come from given what it allows.
    """
    opps = red_zone_opportunities(pbp, posmap)
    league = opps.groupby("pos_group").td.agg(["sum", "count"])
    league_rate = (league["sum"] / league["count"]).rename("league_rz_td_rate")

    cell = (
        opps.groupby(["defteam", "pos_group"])
        .agg(opps_faced=("td", "size"), tds_allowed=("td", "sum"))
        .reset_index()
        .join(league_rate, on="pos_group")
    )
    cell["xtd"] = cell.opps_faced * cell.league_rz_td_rate
    total = cell.groupby("defteam").xtd.transform("sum")
    cell["xtd_share"] = cell.xtd / total
    cell = cell.rename(columns={"defteam": "defense"})
    return cell.sort_values(["defense", "pos_group"]).reset_index(drop=True)


def red_zone_share_wide(cell: pd.DataFrame) -> pd.DataFrame:
    wide = cell.pivot_table(
        index="defense", columns="pos_group", values="xtd_share"
    ).fillna(0.0)
    for c in POSITIONS:
        if c not in wide:
            wide[c] = 0.0
    totals = (
        cell.groupby("defense")
        .agg(rz_opps_faced=("opps_faced", "sum"), rz_tds_allowed=("tds_allowed", "sum"),
             rz_xtd_allowed=("xtd", "sum"))
        .reset_index()
    )
    out = totals.join(wide[POSITIONS].add_suffix("_xtd_share"), on="defense")
    return out.sort_values("defense").reset_index(drop=True)


# ---------------------------------------------------------------------------
# 2. Missed tackles by defense (PFR Advanced Defense, player MTkl summed)
# ---------------------------------------------------------------------------

def missed_tackles_by_defense(pfr_defense_html: str) -> pd.DataFrame:
    """Team missed-tackle totals from PFR's player-level Advanced Defense
    table. (The 'broken tackles allowed' half of the source chart family
    has no public team-level source — see outputs/02 summary gap note.)
    """
    players = parse_pfr_defense_advanced(pfr_defense_html)
    team = players.groupby("team_pfr").agg(
        mtkl=("mtkl", "sum"), players_charted=("player", "nunique")
    ).reset_index()
    team["team"] = team.team_pfr.replace(PFR_TO_NFLVERSE)
    team = team.sort_values("mtkl").reset_index(drop=True)
    team["rank_fewest"] = range(1, len(team) + 1)
    return team[["rank_fewest", "team", "team_pfr", "mtkl", "players_charted"]]


# ---------------------------------------------------------------------------
# 3. QB throwaway rate (PFR Advanced Passing)
# ---------------------------------------------------------------------------

def qb_throwaway_rate(accuracy: pd.DataFrame, pbp: pd.DataFrame,
                      roster: pd.DataFrame,
                      min_dropbacks: int = 1) -> pd.DataFrame:
    """Throwaways per dropback and per attempt, per QB.

    Throwaways and attempts are PFR charting (Advanced Passing table).
    Sacks taken come from nflverse pbp (sack plays by passer), joined
    PFR name -> roster full_name -> GSIS id -> pbp passer_id.
    Dropbacks = pass attempts + sacks taken (spike plays sit inside Att
    in both sources' accounting). Multi-team QBs merge on name.
    """
    acc = accuracy.groupby("Player", as_index=False).agg(
        att=("Att", "sum"), throwaways=("ThAwy", "sum"), spikes=("Spikes", "sum")
    )
    sacks = pbp[pbp.sack == 1].groupby("passer_id").size()
    id2name = dict(zip(roster.gsis_id, roster.full_name))
    sack_by_name: dict[str, int] = {}
    for gid, n in sacks.items():
        nm = id2name.get(gid)
        if nm:
            sack_by_name[nm] = sack_by_name.get(nm, 0) + int(n)
    df = acc.copy()
    df["sacks"] = df.Player.map(sack_by_name).fillna(0).astype(int)
    df["dropbacks"] = df.att + df.sacks
    df["thawy_per_dropback"] = df.throwaways / df.dropbacks
    df["thawy_per_attempt"] = df.throwaways / df.att
    df = df[df.dropbacks >= min_dropbacks]
    df = df.sort_values("thawy_per_dropback", ascending=False).reset_index(drop=True)
    df["rank"] = range(1, len(df) + 1)
    return df.rename(columns={"Player": "qb"})[
        ["rank", "qb", "dropbacks", "att", "sacks", "throwaways",
         "thawy_per_dropback", "thawy_per_attempt"]
    ]


# ---------------------------------------------------------------------------
# 4. RB rushing EPA / attempt leaderboard (nflverse pbp)
# ---------------------------------------------------------------------------

def rb_rushing_epa(pbp: pd.DataFrame, posmap: dict,
                   min_attempts: int = 50) -> pd.DataFrame:
    """Designed rushing EPA per attempt for roster-listed RBs.

    Scrambles are not rush_attempt plays in nflverse pbp, so this is
    designed-run value only. Two-point plays excluded.
    """
    rush = pbp[(pbp.rush_attempt == 1) & (pbp.two_point_attempt == 0)].copy()
    rush["pos"] = rush.rusher_id.map(posmap)
    rb = rush[rush.pos == "RB"]
    g = rb.groupby(["rusher_id", "rusher_player_name", "posteam"]).agg(
        att=("epa", "size"), rush_yards=("yards_gained", "sum"),
        epa_total=("epa", "sum"), successes=("success", "sum"),
        rush_tds=("rush_touchdown", "sum"),
    ).reset_index()
    g["epa_per_att"] = g.epa_total / g.att
    g["success_rate"] = g.successes / g.att
    g["ypc"] = g.rush_yards / g.att
    q = g[g.att >= min_attempts].sort_values(
        "epa_per_att", ascending=False
    ).reset_index(drop=True)
    q["rank"] = range(1, len(q) + 1)
    return q.rename(columns={"rusher_player_name": "rb", "posteam": "team"})[
        ["rank", "rb", "team", "att", "rush_yards", "ypc", "epa_per_att",
         "success_rate", "rush_tds"]
    ]


def rb_qualified_count(pbp: pd.DataFrame, posmap: dict, threshold: int) -> int:
    rush = pbp[(pbp.rush_attempt == 1) & (pbp.two_point_attempt == 0)].copy()
    rush["pos"] = rush.rusher_id.map(posmap)
    counts = rush[rush.pos == "RB"].groupby("rusher_id").size()
    return int((counts >= threshold).sum())


# ---------------------------------------------------------------------------
# 5. Big plays vs success rate, team offenses (@ghatz_28 quadrant)
# ---------------------------------------------------------------------------

BIG_PASS_YARDS = 16   # explosive pass threshold (Sharp Football convention)
BIG_RUSH_YARDS = 12   # explosive rush threshold


def big_plays_vs_success(pbp: pd.DataFrame) -> pd.DataFrame:
    """Per team offense: success rate (EPA > 0) and big-play rate on
    scrimmage plays (pass + run, two-point plays excluded), with each
    team's quadrant against the league medians.
    """
    scrim = pbp[
        pbp.play_type.isin(["pass", "run"]) & (pbp.two_point_attempt == 0)
    ].copy()
    scrim["big_play"] = (
        ((scrim.play_type == "pass") & (scrim.yards_gained >= BIG_PASS_YARDS))
        | ((scrim.play_type == "run") & (scrim.yards_gained >= BIG_RUSH_YARDS))
    ).astype(int)
    g = scrim.groupby("posteam").agg(
        plays=("epa", "size"), successes=("success", "sum"),
        big_plays=("big_play", "sum"), epa_total=("epa", "sum"),
    ).reset_index().rename(columns={"posteam": "team"})
    g["success_rate"] = g.successes / g.plays
    g["big_play_rate"] = g.big_plays / g.plays
    g["epa_per_play"] = g.epa_total / g.plays
    med_sr, med_bp = g.success_rate.median(), g.big_play_rate.median()
    def quad(r):
        hi_sr, hi_bp = r.success_rate >= med_sr, r.big_play_rate >= med_bp
        if hi_sr and hi_bp:
            return "Q1: efficient + explosive"
        if hi_bp:
            return "Q2: boom-or-bust (explosive, inefficient)"
        if hi_sr:
            return "Q3: efficient, not explosive"
        return "Q4: inefficient + not explosive"
    g["quadrant"] = g.apply(quad, axis=1)
    return g.sort_values("big_play_rate", ascending=False).reset_index(drop=True)


# ---------------------------------------------------------------------------
# 6. Defensive EPA / play by quarter (@sfdata9ers table)
# ---------------------------------------------------------------------------

def defensive_epa_by_quarter(pbp: pd.DataFrame) -> pd.DataFrame:
    """Defensive EPA/play (from the defense's side: negative is good)
    split by quarter 1-4, scrimmage plays only, two-point plays excluded.
    Regulation quarters only; overtime is reported separately in the CSV
    long form by build_tables if present.
    """
    scrim = pbp[
        pbp.play_type.isin(["pass", "run"])
        & (pbp.two_point_attempt == 0)
        & pbp.qtr.isin([1, 2, 3, 4])
    ]
    g = scrim.groupby(["defteam", "qtr"]).agg(
        plays=("epa", "size"), epa_total=("epa", "sum")
    ).reset_index()
    g["epa_per_play_allowed"] = g.epa_total / g.plays
    wide = g.pivot_table(
        index="defteam", columns="qtr", values="epa_per_play_allowed"
    )
    wide.columns = [f"q{int(c)}_epa_allowed" for c in wide.columns]
    overall = scrim.groupby("defteam").epa.mean().rename("all_q_epa_allowed")
    plays = scrim.groupby("defteam").size().rename("plays")
    out = wide.join(overall).join(plays).reset_index().rename(
        columns={"defteam": "defense"}
    )
    return out.sort_values("all_q_epa_allowed").reset_index(drop=True)
