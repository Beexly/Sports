#!/usr/bin/env python3
"""Step 5 reproductions: W1 CEI proxy, W7 3rd-down trust, W8 QB FP, B2 pass D, B8 CHI carries.

Each block states what public nflverse data can and cannot prove. Anything the
files do not carry (referee crew, xFP model internals, 2018-2023 playoffs) is
reported as unavailable rather than approximated into a fake number.
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "data" / "engine" / "step5_w1_w8_reproductions_2026_11_05.json"
PBP = ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"


def load() -> pd.DataFrame:
    cols = ["game_id", "week", "posteam", "defteam", "play_type", "pass_attempt", "rush_attempt",
            "qb_dropback", "complete_pass", "passing_yards", "rushing_yards", "yards_after_catch",
            "air_yards", "down", "first_down", "receiver_player_name", "rusher_player_name",
            "passer_player_name", "pass_touchdown", "rush_touchdown", "interception",
            "two_point_attempt", "aborted_play", "play_deleted", "penalty", "penalty_yards"]
    df = pd.read_parquet(PBP, columns=cols)
    df = df[(df.week <= 8) & (df.play_type.isin(["pass", "run"]))
            & (df.two_point_attempt.fillna(0) == 0) & (df.aborted_play.fillna(0) == 0)
            & (df.play_deleted.fillna(0) == 0)].copy()
    df["complete_pass"] = df.complete_pass.fillna(0)
    return df


def w1_coverage_proxy(df: pd.DataFrame) -> dict:
    rows = []
    for team, t in df[df.pass_attempt == 1].groupby("defteam"):
        att = len(t)
        comp = t[t.complete_pass == 1]
        deep = t[t.air_yards >= 20]
        deep_comp = deep[deep.complete_pass == 1]
        rows.append({
            "team": team,
            "att": int(att),
            "completion_rate_allowed": round(float(len(comp) / att), 4) if att else None,
            "yac_per_completion_allowed": round(float(comp.yards_after_catch.sum() / len(comp)), 3) if len(comp) else None,
            "deep20_completion_rate_allowed": round(float(len(deep_comp) / len(deep)), 4) if len(deep) else None,
            "deep20_att": int(len(deep)),
        })
    tbl = pd.DataFrame(rows)
    for metric in ("completion_rate_allowed", "yac_per_completion_allowed", "deep20_completion_rate_allowed"):
        tbl[f"{metric}_rank"] = tbl[metric].rank(ascending=True, method="min")
    tbl["pillar_rank_sum"] = tbl[[c for c in tbl if c.endswith("_rank")]].sum(axis=1)
    tbl["coverage_proxy_rank"] = tbl["pillar_rank_sum"].rank(method="min")
    wanted = ["SF", "SEA", "LAR", "LA", "HOU", "DEN", "CAR", "DET"]
    focus = tbl[tbl.team.isin(wanted)].sort_values("coverage_proxy_rank")
    return {
        "method": "Two of the five CEI pillars are reproducible from nflverse pbp: (b) YAC per completion allowed and (d) deep 20+ completion rate allowed, plus completion rate allowed. Composite = sum of the three pillar ranks (lower is better).",
        "focus_teams": focus.to_dict(orient="records"),
        "claim_check": {
            "claimed_stronger": ["SF", "SEA", "LAR", "HOU", "DEN"],
            "claimed_weaker": ["CAR", "DET"],
            "result": "see focus_teams ordering; no shell/personnel pillar is available, so this is a proxy, not the published CEI.",
        },
    }


def w7_third_down(df: pd.DataFrame) -> dict:
    d = df[(df.down == 3) & (df.pass_attempt == 1)]
    g = d.groupby("receiver_player_name").agg(
        targets=("complete_pass", "size"),
        receptions=("complete_pass", "sum"),
        first_downs=("first_down", "sum"),
        yards=("passing_yards", "sum"),
    )
    g = g[g.targets >= 12].sort_values("first_downs", ascending=False)
    g["conv_rate"] = (g.first_downs / g.targets).round(3)
    return {"min_targets": 12, "leaders": g.head(15).reset_index().to_dict(orient="records")}


def w8_qb_fp(df: pd.DataFrame) -> dict:
    q = df[df.qb_dropback == 1].copy()
    fp = (
        q.passing_yards.fillna(0) * 0.04
        + q.pass_touchdown.fillna(0) * 4
        + q.rushing_yards.fillna(0) * 0.1
        + q.rush_touchdown.fillna(0) * 6
        - q.interception.fillna(0) * 2
    )
    q["fp"] = fp
    g = q.groupby("passer_player_name").agg(dropbacks=("fp", "size"), fp_total=("fp", "sum"), epa=("passing_yards", "size"))
    g["fp_per_dropback"] = (g.fp_total / g.dropbacks).round(3)
    games = df.groupby("posteam").week.nunique().to_dict()
    qb_team = q.groupby("passer_player_name").posteam.agg(lambda s: s.mode().iloc[0])
    g["team"] = qb_team
    g["team_games"] = g.team.map(games)
    g["fp_per_game"] = (g.fp_total / g.team_games).round(2)
    g = g[g.dropbacks >= 100].sort_values("fp_per_dropback", ascending=False)
    g["rank_fp_per_dropback"] = range(1, len(g) + 1)
    shough = g[g.index.str.contains("Shough", na=False)]
    return {
        "note": "Actual fantasy points from nflverse box stats (4-pt pass TD, 6-pt rush TD, 0.04 pass yd, 0.1 rush yd, -2 INT). This is NOT the @boxscorescout xFP model, whose internals are unpublished.",
        "qualified_qbs": len(g),
        "shough": shough.reset_index().to_dict(orient="records"),
        "top10": g.head(10).reset_index().to_dict(orient="records"),
    }


def b2_pass_defense(df: pd.DataFrame) -> dict:
    rows = []
    for team, t in df.groupby("defteam"):
        games = t.game_id.nunique()
        pass_plays = t[t.pass_attempt == 1]
        rows.append({
            "team": team,
            "games": int(games),
            "pass_yds_allowed_per_game": round(float(pass_plays.passing_yards.sum() / games), 1),
            "ypa_allowed": round(float(pass_plays.passing_yards.sum() / len(pass_plays)), 3) if len(pass_plays) else None,
        })
    tbl = pd.DataFrame(rows).sort_values("pass_yds_allowed_per_game", ascending=False)
    tbl["worst_rank"] = range(1, len(tbl) + 1)
    return {"worst_first": tbl.head(10).to_dict(orient="records"), "best_first": tbl.tail(5).to_dict(orient="records")}


def b8_chicago_carries(df: pd.DataFrame) -> dict:
    pos = {}
    import subprocess
    try:
        out = subprocess.run(["curl", "-sS", "--max-time", "25",
                              "https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/chi/roster"],
                             capture_output=True, text=True, encoding="utf-8", errors="replace").stdout
        roster = json.loads(out).get("athletes", [])
        for grp in roster:
            for a in grp.get("items", []):
                full = a.get("fullName") or ""
                last = full.split()[-1] if full else ""
                if last:
                    pos[last] = (a.get("position") or {}).get("abbreviation", "")
    except Exception:
        pass
    inj = ROOT / "data" / "nflverse" / "injuries_2026.csv"
    with inj.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            if r["team"] in ("CHI", "LA") and r["full_name"]:
                pos.setdefault(r["full_name"], r["position"])
    chi = df[(df.posteam == "CHI") & (df.rush_attempt == 1)]
    g = chi.groupby("rusher_player_name").agg(carries=("rushing_yards", "size"), yards=("rushing_yards", "sum"))
    g["position"] = [pos.get(str(n).split(".")[-1], pos.get(str(n), "UNK")) for n in g.index]
    g = g.sort_values("carries", ascending=False)
    by_pos = g.groupby("position").agg(carries=("carries", "sum"), yards=("yards", "sum")).sort_values("carries", ascending=False)
    return {"by_player": g.reset_index().to_dict(orient="records"), "by_position_group": by_pos.reset_index().to_dict(orient="records")}


def main() -> dict:
    df = load()
    out = {
        "schema": "step5_w1_w8_reproductions_v1",
        "generated_at": "2026-11-05",
        "data_window": "2026 regular season weeks 1-8",
        "w1_coverage_execution_proxy": w1_coverage_proxy(df),
        "w7_third_down_target_trust": w7_third_down(df),
        "w8_qb_fantasy_points": w8_qb_fp(df),
        "b2_worst_pass_defenses": b2_pass_defense(df),
        "b8_chicago_carry_split": b8_chicago_carries(df),
        "unavailable": {
            "F8_playoff_luck_residue_since_2018": "Local pbp files cover 2024-2026 only; 2018-2023 playoff games are not on disk, so the since-2018 residue cannot be recomputed.",
            "F9_referee_crew_penalties_2022_2025": "No referee/crew field in the 2024/2025/2026 nflverse pbp files on disk; penalty tendencies by crew are not derivable.",
        },
    }
    OUT.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print(json.dumps(out["w1_coverage_execution_proxy"]["focus_teams"], indent=1)[:1200])
    print("W8 Shough:", out["w8_qb_fantasy_points"]["shough"])
    print("B8:", out["b8_chicago_carry_split"]["by_position_group"])
    print("saved ->", OUT)
    return out


if __name__ == "__main__":
    main()
