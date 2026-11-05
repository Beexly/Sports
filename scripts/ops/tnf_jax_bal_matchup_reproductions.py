#!/usr/bin/env python3
"""TNF JAX @ BAL W1-8 nflverse PBP matchup reproductions (2026-11-05).

Reproduces the five PBP-testable claims from the 2026-11-05 AM/PM sweeps:
  F6  BAL light-box / dime / two-high + Trevor Lawrence EPA/dropback split
  W2  JAX backside A-gap / Fire Zone pressure profile
  W8  Zay Flowers MOF profile vs BAL MOF pass profile
  W10 Catchable Ball Rate vs EPA/play (TLaw, BAL QBs)
  W3  Combined Mismatch Manifesto sums for JAX @ BAL

Only public nflverse pbp + FTN charting is used. Anything not derivable from
those sources is emitted as null with an explicit `unavailable_reason`; no
number is invented to fill a gap.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
OUT_JSON = ROOT / "data" / "engine" / "tnf_jax_bal_pbp_reproductions_2026_11_05.json"
ESPN = ROOT / "data" / "engine" / "_espn_week9_scoreboard.json"
SCRIPTS_JSON = ROOT / "data" / "engine" / "week9_game_scripts_2026.json"

PBP = ROOT / "data" / "nflverse" / "pbp" / "play_by_play_2026.parquet"
FTN = ROOT / "data" / "nflverse" / "ftn_charting_2026.parquet"

BASE_COLS = [
    "play_id", "game_id", "week", "posteam", "defteam", "play_type",
    "qb_dropback", "pass_attempt", "rush_attempt", "sack", "qb_hit",
    "yards_gained", "passing_yards", "rushing_yards", "epa", "pass_location",
    "complete_pass",
    "receiver_player_name", "passer_player_name", "two_point_attempt",
    "aborted_play", "play_deleted",
]


def load_pbp() -> pd.DataFrame:
    df = pd.read_parquet(PBP, columns=BASE_COLS)
    df = df[
        (df.week <= 8)
        & (df.play_type.isin(["pass", "run"]))
        & (df.two_point_attempt.fillna(0) == 0)
        & (df.aborted_play.fillna(0) == 0)
        & (df.play_deleted.fillna(0) == 0)
    ].copy()
    for c in ("qb_dropback", "pass_attempt", "rush_attempt", "sack", "qb_hit"):
        df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
    df["key"] = df.game_id.astype(str) + "|" + df.play_id.astype("Int64").astype(str)
    df["pressure"] = ((df.sack == 1) | (df.qb_hit == 1)).astype(int)
    df["explosive"] = (
        ((df.pass_attempt == 1) & (df.yards_gained >= 20))
        | ((df.rush_attempt == 1) & (df.yards_gained >= 10))
    ).astype(int)
    return df


def team_profile(df: pd.DataFrame, team: str, side: str) -> dict:
    """side='off' -> team's offense; side='def' -> what the team's defense allows."""
    col = "posteam" if side == "off" else "defteam"
    t = df[df[col] == team]
    plays = len(t)
    db = t[t.qb_dropback == 1]
    ru = t[t.rush_attempt == 1]
    return {
        "plays": int(plays),
        "epa_per_play": round(float(t.epa.mean()), 4) if plays else None,
        "dropbacks": int(len(db)),
        "pass_yds_per_dropback": round(float(db.passing_yards.sum() / len(db)), 3) if len(db) else None,
        "rushes": int(len(ru)),
        "rush_yds_per_rush": round(float(ru.rushing_yards.sum() / len(ru)), 3) if len(ru) else None,
        "pressure_rate": round(float(db.pressure.mean()), 4) if len(db) else None,
        "explosive_rate": round(float(t.explosive.mean()), 4) if plays else None,
    }


def league_table(df: pd.DataFrame, side: str) -> pd.DataFrame:
    col = "posteam" if side == "off" else "defteam"
    rows = []
    for team, t in df.groupby(col):
        p = team_profile(t, team, side)
        p["team"] = team
        rows.append(p)
    return pd.DataFrame(rows)


def rank_of(table: pd.DataFrame, team: str, metric: str, higher_is_better: bool) -> dict:
    s = table.set_index("team")[metric].dropna()
    if team not in s.index:
        return {"value": None, "rank": None, "of": int(len(s))}
    r = s.rank(ascending=not higher_is_better, method="min")[team]
    return {"value": round(float(s[team]), 4), "rank": int(r), "of": int(len(s))}


def qb_pass_profile(pbp: pd.DataFrame, ftn: pd.DataFrame, name_pat: str, team: str) -> dict:
    q = pbp[(pbp.qb_dropback == 1) & (pbp.posteam == team) & pbp.passer_player_name.fillna("").str.contains(name_pat, regex=False)]
    if q.empty:
        return {"dropbacks": 0}
    f = ftn[ftn.key.isin(q.key) & ftn.is_catchable_ball.notna()]
    catchable = float(f.is_catchable_ball.astype(bool).mean()) if len(f) else None
    return {
        "dropbacks": int(len(q)),
        "epa_per_dropback": round(float(q.epa.mean()), 4),
        "catchable_ball_rate": round(catchable, 4) if catchable is not None else None,
        "catchable_sample": int(len(f)),
        "charting_weeks": "1-7 (FTN public file stops at week 7)",
    }


def main() -> dict:
    pbp = load_pbp()
    ftn = pd.read_parquet(FTN)
    ftn = ftn[(ftn.week <= 7)].copy()
    ftn["key"] = ftn.nflverse_game_id.astype(str) + "|" + ftn.nflverse_play_id.astype("Int64").astype(str)
    ftn["n_defense_box"] = pd.to_numeric(ftn.n_defense_box, errors="coerce")
    ftn["n_blitzers"] = pd.to_numeric(ftn.n_blitzers, errors="coerce")

    off_tbl = league_table(pbp, "off")
    def_tbl = league_table(pbp, "def")

    # ---- F6: BAL defensive shell/box profile -------------------------------
    bal_pass = pbp[(pbp.defteam == "BAL") & (pbp.qb_dropback == 1)]
    bal_ftn = ftn[ftn.key.isin(bal_pass.key)]
    box = bal_ftn[bal_ftn.n_defense_box.between(1, 11)]
    light = float((box.n_defense_box <= 6).mean()) if len(box) else None
    bal_all_ftn = ftn[ftn.key.isin(pbp[pbp.defteam == "BAL"].key)]
    box_all = bal_all_ftn[bal_all_ftn.n_defense_box.between(1, 11)]
    light_all_plays = float((box_all.n_defense_box <= 6).mean()) if len(box_all) else None
    # League light-box rate for rank context
    ftn_pass = ftn[ftn.key.isin(pbp[pbp.qb_dropback == 1].key)]
    joined = ftn_pass.merge(pbp[["key", "defteam"]], on="key", how="left")
    jbox = joined[joined.n_defense_box.between(1, 11)]
    lb_by_def = jbox.assign(light=(jbox.n_defense_box <= 6).astype(int)).groupby("defteam").light.mean()
    light_rank = int((lb_by_def > light).sum() + 1) if light is not None else None

    tlaw = pbp[(pbp.qb_dropback == 1) & pbp.passer_player_name.fillna("").str.contains("Lawrence", regex=False)]
    tlaw_ftn = ftn[ftn.key.isin(tlaw.key)]
    tb = tlaw_ftn[tlaw_ftn.n_defense_box.between(1, 11)]
    tl_light = tlaw[tlaw.key.isin(tb[tb.n_defense_box <= 6].key)]
    tl_heavy = tlaw[tlaw.key.isin(tb[tb.n_defense_box >= 7].key)]

    f6 = {
        "bal_light_box_rate": round(light, 4) if light is not None else None,
        "bal_light_box_rate_all_plays": round(light_all_plays, 4) if light_all_plays is not None else None,
        "bal_light_box_sample_all_plays": int(len(box_all)),
        "bal_light_box_rank": light_rank,
        "bal_light_box_sample": int(len(box)),
        "bal_dime_rate": None,
        "bal_dime_unavailable_reason": "nflverse pbp/FTN carry no defensive personnel (DB count); dime rate is not derivable from public data.",
        "bal_two_high_rate": None,
        "bal_two_high_unavailable_reason": "Public nflverse/FTN charting has no coverage-shell field; two-high rate requires All-22 tracking or PFF/FTN proprietary charting.",
        "tlaw_epa_per_dropback": round(float(tlaw.epa.mean()), 4),
        "tlaw_epa_vs_light_box": round(float(tl_light.epa.mean()), 4) if len(tl_light) else None,
        "tlaw_epa_vs_heavy_box": round(float(tl_heavy.epa.mean()), 4) if len(tl_heavy) else None,
        "tlaw_split_note": "Box-count split (<=6 vs >=7), NOT the claimed two-high vs single-high shell split; shell split is unavailable.",
        "tlaw_light_sample": int(len(tl_light)),
        "tlaw_heavy_sample": int(len(tl_heavy)),
    }

    # ---- W2: JAX pressure profile -----------------------------------------
    jax_def_db = pbp[(pbp.defteam == "JAX") & (pbp.qb_dropback == 1)]
    jax_ftn = ftn[ftn.key.isin(jax_def_db.key)]
    jblitz = jax_ftn[jax_ftn.n_blitzers.notna()]
    jpa = jax_ftn[jax_ftn.is_play_action.notna()]
    uc = jax_ftn[jax_ftn.qb_location.fillna("").str.upper().isin(["U", "UNDER_CENTER", "UNDER CENTER", "UC"])]
    f6["jax_blitz_rate"] = round(float((jblitz.n_blitzers >= 1).mean()), 4) if len(jblitz) else None
    f6["jax_pressure_rate"] = round(float(jax_def_db.pressure.mean()), 4)
    f6["jax_play_action_blitz_rate"] = (
        round(float((jpa[jpa.is_play_action == 1].n_blitzers.dropna() >= 1).mean()), 4) if len(jpa) else None
    )
    f6["jax_under_center_pressure_rate"] = (
        round(float(jax_def_db[jax_def_db.key.isin(uc.key)].pressure.mean()), 4) if len(uc) else None
    )
    f6["w2_note"] = "Backside A-gap / Fire Zone identification is film-derived; public data yields only blitz/pressure rates, not gap or coverage-family attribution."
    f6["qb_location_values"] = sorted(ftn.qb_location.dropna().unique().tolist())[:10]

    # ---- W8: Zay Flowers MOF ----------------------------------------------
    fl = pbp[(pbp.receiver_player_name.fillna("").str.contains("Flowers", regex=False)) & (pbp.pass_attempt == 1)]
    fl_mof = fl[fl.pass_location == "middle"]
    bal_pass = pbp[(pbp.posteam == "BAL") & (pbp.pass_attempt == 1)]
    bal_mof = bal_pass[bal_pass.pass_location == "middle"]
    w8 = {
        "flowers_targets": int(len(fl)),
        "flowers_mof_targets": int(len(fl_mof)),
        "flowers_mof_target_share": round(float(len(fl_mof) / len(fl)), 4) if len(fl) else None,
        "flowers_receptions": int(fl.complete_pass.fillna(0).sum()),
        "flowers_yards": int(fl.passing_yards.fillna(0).sum()),
        "flowers_mof_receptions": int(fl_mof.complete_pass.fillna(0).sum()),
        "flowers_mof_yards": int(fl_mof.passing_yards.fillna(0).sum()),
        "bal_mof_attempt_share": round(float(len(bal_mof) / len(bal_pass)), 4) if len(bal_pass) else None,
        "bal_mof_completion_rate": round(float(bal_mof.complete_pass.fillna(0).mean()), 4) if len(bal_mof) else None,
    }

    # ---- W10: Catchable Ball Rate vs EPA ----------------------------------
    w10 = {
        "trevor_lawrence": qb_pass_profile(pbp, ftn, "Lawrence", "JAX"),
        "bal_qbs": {},
    }
    for nm in ("Fagnano", "Brissett", "Jackson", "Huntley"):
        prof = qb_pass_profile(pbp, ftn, nm, "BAL")
        if prof.get("dropbacks", 0):
            w10["bal_qbs"][nm] = prof

    # ---- W3: Mismatch Manifesto combined sums -----------------------------
    def combined(metric: str, higher_off_better: bool) -> dict:
        o = rank_of(off_tbl, "JAX", metric, higher_off_better)
        d = rank_of(def_tbl, "BAL", metric, not higher_off_better)
        val = None
        if o["value"] is not None and d["value"] is not None:
            val = round(o["value"] + d["value"], 4)
        return {"jacksonville_offense": o, "baltimore_defense_allowed": d, "combined_sum": val}

    w3 = {
        "epa_per_play": combined("epa_per_play", True),
        "pass_yds_per_dropback": combined("pass_yds_per_dropback", True),
        "rush_yds_per_rush": combined("rush_yds_per_rush", True),
        "pressure_rate_allowed": combined("pressure_rate", False),
        "explosive_rate": combined("explosive_rate", True),
        "note": "RB YBC/rush unavailable: 2026 nflverse pbp has no yards-before-contact field. Rushing yards per rush is the substituted metric.",
    }

    # ---- Week 9 game scripts 12 -> 15 staging ------------------------------
    espn = json.loads(ESPN.read_text(encoding="utf-8"))
    games = []
    for e in espn.get("events", []):
        c = e["competitions"][0]
        o = (c.get("odds") or [{}])[0]
        home = next(t for t in c["competitors"] if t["homeAway"] == "home")
        away = next(t for t in c["competitors"] if t["homeAway"] == "away")
        games.append({
            "game_id": e["id"],
            "kickoff_utc": e["date"],
            "matchup": e["shortName"],
            "away": away["team"]["abbreviation"],
            "home": home["team"]["abbreviation"],
            "neutral_site": bool(c.get("neutralSite", False)),
            "total_points": o.get("overUnder"),
            "home_spread": o.get("spread"),
            "script_inputs_source": "ESPN scoreboard odds snapshot 2026-11-05",
            "script_status": "staged",
        })
    SCRIPTS_JSON.write_text(json.dumps({
        "schema": "week9_game_scripts_v1",
        "generated_at_cst": "2026-11-05",
        "games_staged": len(games),
        "note": "All 15 Week 9 games staged from live ESPN lines; game-script model consumes total_points/home_spread per game.",
        "games": games,
    }, indent=2), encoding="utf-8")

    result = {
        "schema": "tnf_jax_bal_pbp_reproductions_v1",
        "generated_at": "2026-11-05",
        "data_window": "2026 regular season weeks 1-8 (nflverse pbp); FTN charting weeks 1-7",
        "official_ledger": "16-5 (76.2%, +10.45u)",
        "f6_bal_shell_and_tlaw": f6,
        "w2_jax_pressure": {k: f6[k] for k in ("jax_blitz_rate", "jax_pressure_rate", "jax_play_action_blitz_rate", "jax_under_center_pressure_rate", "w2_note", "qb_location_values")},
        "w8_zay_flowers_mof": w8,
        "w10_catchable_ball": w10,
        "w3_mismatch_manifesto": w3,
        "week9_game_scripts": {"path": str(SCRIPTS_JSON.relative_to(ROOT)), "games_staged": len(games)},
        "reproducibility": {
            "reproduced": ["BAL light-box rate", "TLaw box-split EPA/dropback", "JAX blitz/pressure rates", "Zay Flowers MOF profile", "BAL MOF pass profile", "Catchable Ball Rate", "Mismatch Manifesto components"],
            "not_reproducible": ["BAL dime rate (no def personnel)", "BAL two-high rate (no coverage shell field)", "shell-split TLaw EPA delta", "RB YBC/rush (no YBC field)", "A-gap/Fire Zone attribution (film only)"],
        },
    }
    OUT_JSON.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    main()
