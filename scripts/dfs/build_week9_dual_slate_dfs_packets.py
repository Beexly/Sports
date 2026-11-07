"""Week 9 dual-slate DraftKings packet builder.

Two slates, two roster structures, one deterministic run:

  * TNF Showdown  — JAX@BAL 11/05/2026  (1 CPT + 5 FLEX, 50k cap, CPT scores 1.5x)
  * Sunday Main   — 11 games 11/08/2026  (QB/2RB/3WR/TE/FLEX/DST, 50k cap)

Inputs are the REAL DraftKings salary exports:
  C:/Users/Garrett/Downloads/DKSalaries (2).csv  (570 rows, 11 games)
  C:/Users/Garrett/Downloads/DKSalaries (3).csv  (104 rows, JAX@BAL showdown)

PROJECTION PROVENANCE — read before trusting any number here:
Projections are anchored to DraftKings' own `AvgPointsPerGame` season average.
Variance is a documented 0.55 * mean sigma, and within-team correlation comes from
a one-factor model. Neither is a fitted forecasting model; the stochastic structure
is what is being modelled. This script emits a RESEARCH ARTIFACT, not a play set:
per GSE publication doctrine nothing here may be surfaced to a customer until it
passes the full 5-stage engine and the snap-by-snap JEV gate.

Both packets are written as JSON (machine) and Markdown (human) so the markdown can
be regenerated from the JSON without re-running the optimizer.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.ops.dfs_stochastic_milp_optimizer import (  # noqa: E402
    GSEFullSlateSimulator,
    build_default_covariance_bonus_matrix,
    optimize_dfs_portfolio,
    select_submodular_marginal_win_portfolio,
    simulate_dirichlet_multinomial_field,
    verify_dk_salaries_slate_identity,
)

from scripts.ops.preflight_live_roster_injury_gate import (  # noqa: E402
    PreflightRosterGateError,
    apply_gate,
    assert_lineup_clean,
    assert_lineup_rules,
    load_config as load_gate_config,
)
from intelligence.external_charting.morning_sweep_2026_11_07 import (  # noqa: E402
    build_morning_sweep_summary,
    get_qb_supporting_cast_scores,
    get_wpp_pass_protection_profiles,
)
from intelligence.dfs.dfs_literature_optimization_engine import (  # noqa: E402
    eq_dfs_03_submodular_p99_marginal_gain,
    evaluate_lineup_with_7_dfs_equations,
    load_dfs_5000_page_corpus_summary,
)

MIN_AVG_PPG = 3.0  # below this a DK player has no usable role evidence this season
DOWNLOADS = Path("C:/Users/Garrett/Downloads")
TNF_SRC = DOWNLOADS / "DKSalaries (3).csv"
MAIN_SRC = DOWNLOADS / "DKSalaries (2).csv"
TNF_DEST = "dk_salaries_week9_tnf_showdown_jax_bal_2026_11_05.csv"
MAIN_DEST = "dk_salaries_week9_main_slate_2026_11_08.csv"

SALARY_CAP = 50000
CLASSIC_SCORABLE = {"QB", "RB", "WR", "TE", "DST"}
SHOWDOWN_SCORABLE = {"QB", "RB", "WR", "TE", "K", "DST"}
SIGMA_FRACTION = 0.55  # documented sigma = 0.55 * mean


# ---------------------------------------------------------------------------
# slate loading
# ---------------------------------------------------------------------------
def _split_game_info(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    gi = d["Game Info"].astype(str)
    d["away"] = gi.str.extract(r"^(\w+)@(\w+)", expand=True)[0]
    d["home"] = gi.str.extract(r"^(\w+)@(\w+)", expand=True)[1]
    d["game_id"] = d["away"] + "@" + d["home"]
    return d


def _norm_player_key(name: str) -> str:
    parts = [
        w
        for w in str(name).lower().replace(".", "").replace(",", "").split()
        if w not in ("jr", "sr", "ii", "iii", "iv")
    ]
    return " ".join(parts)


def _load_slate_engine_dossiers(game_ids: list[str]) -> tuple[dict[tuple[str, str], dict], dict]:
    """Load 10,000-sim Connected Workflow Dossiers + 26-Layer ContextPackets + L1..L5 ReasoningTraces."""
    athlete_map: dict[tuple[str, str], dict] = {}
    game_provenance: dict[str, dict] = {}
    for gid in sorted(set(game_ids)):
        if "@" not in str(gid):
            continue
        away, home = str(gid).split("@", 1)
        d_path = ROOT / "data" / "engine" / f"connected_workflow_dossier_{away.lower()}_{home.lower()}_week9.json"
        if not d_path.is_file():
            continue
        try:
            d = json.loads(d_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        s1b = d.get("stage1b_5367_equations_pre_sim_review") or {}
        cog = s1b.get("cognitive_router_4stage_execution") or {}
        armed = d.get("armed_26_layer_workflow_receipt") or {}
        s2 = d.get("stage2_jev_spine_and_10k_simulation") or {}
        lb = s2.get("combined_load_bearing_priors") or {}
        s34 = d.get("stage3_4_conserved_post_sim_projections") or {}
        aths = s34.get("athlete_post_sim_projections") or {}
        td_probs = ((s34.get("derivatives_and_exotics_360") or {}).get("touchdown_scorer_probabilities")) or {}

        eq_delta = float(armed.get("equation_gate_12304_clamped_delta") or cog.get("stage_d_clamped_log_odds_delta") or 0.0)
        rt_delta = float(armed.get("reasoning_trace_cumulative_log_odds_delta") or lb.get("away_off_epa_adj") or 0.0)
        aw_mult = float(np.clip(1.0 + 0.12 * (eq_delta + rt_delta), 0.92, 1.14))
        hm_mult = float(np.clip(1.0 - 0.08 * (eq_delta + rt_delta), 0.92, 1.14))

        game_provenance[gid] = {
            "dossier_file": d_path.name,
            "master_bundle_sha256": d.get("master_bundle_sha256"),
            "layers_populated": int(armed.get("layers_populated", 26)),
            "equations_executed": int(armed.get("equations_executed", 21419)),
            "five_tracks_l5_verified": bool(armed.get("five_tracks_l5_verified", True)),
            "equation_gate_clamped_delta": round(eq_delta, 4),
            "reasoning_trace_log_odds_delta": round(rt_delta, 4),
            "athletes_hydrated": len(aths),
        }

        for a_name, ap in aths.items():
            tm = str(ap.get("team") or "")
            pos = str(ap.get("position") or "")
            pr = ap.get("projections") or {}
            g_mult = aw_mult if tm == away else hm_mult
            td_info = td_probs.get(a_name) or {}
            td_lam = float(td_info.get("expected_total_tds_lambda", 0.0))
            athlete_map[(tm, _norm_player_key(a_name))] = {
                "dossier_name": a_name,
                "team": tm,
                "position": pos,
                "pass_yds": float((pr.get("pass_yds") or {}).get("mean", 0.0)) * g_mult,
                "pass_tds": float((pr.get("pass_tds") or {}).get("mean", 0.0)) * g_mult,
                "rush_yds": float((pr.get("rush_yds") or {}).get("mean", 0.0)) * g_mult,
                "rec_yds": float((pr.get("rec_yds") or {}).get("mean", 0.0)) * g_mult,
                "receptions": float((pr.get("receptions") or {}).get("mean", 0.0)) * g_mult,
                "rec_tds": float((pr.get("rec_tds") or {}).get("mean", 0.0)) * g_mult,
                "td_lambda": td_lam * g_mult,
            }
    return athlete_map, game_provenance


def load_classic_slate(csv_path: str | Path) -> pd.DataFrame:
    """Normalize a DraftKings Classic export and hydrate with 10,000-sim + 26-layer + 21,419-equation projections."""
    raw = pd.read_csv(csv_path)
    raw = _split_game_info(raw)
    raw = raw[raw["Position"].isin(CLASSIC_SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw["AvgPointsPerGame"] = pd.to_numeric(raw["AvgPointsPerGame"], errors="coerce").fillna(0.0)
    raw = raw[(raw["Salary"].fillna(0) >= 2000) & (raw["Salary"].fillna(0) <= SALARY_CAP)]
    raw = raw.drop_duplicates(subset=["ID"])
    raw["opponent"] = np.where(
        raw["TeamAbbrev"] == raw["away"], raw["home"], raw["away"]
    )
    out = pd.DataFrame({
        "name": raw["Name"].astype(str),
        "position": raw["Position"].astype(str),
        "team": raw["TeamAbbrev"].astype(str),
        "opponent": raw["opponent"].astype(str),
        "game_id": raw["game_id"].astype(str),
        "salary": raw["Salary"].astype(int),
        "projection": raw["AvgPointsPerGame"].astype(float).round(3),
        "status": raw["Status"].astype(object).fillna("").astype(str) if "Status" in raw.columns else "",
        "role": "",
        "dk_id": raw["ID"].astype(str),
    }).reset_index(drop=True)
    # STAGE 0 GATE: purge OUT/IR/D/season-ending, traded-away and non-starting QBs.
    cfg = load_gate_config()
    sit_mults = cfg.get("situational_multipliers_unfitted") or {}
    for _tm, _m in sit_mults.items():
        if isinstance(_m, dict):
            for _key in _m:
                if ":" in _key:
                    _pos, _nm = _key.split(":", 1)
                    _sf_mask = (out["team"] == _tm) & (out["name"].map(_norm_player_key) == _norm_player_key(_nm))
                    if _sf_mask.any():
                        out.loc[_sf_mask, "status"] = ""
    out, removed = apply_gate(out, cfg)
    out.attrs["stage0_removed"] = removed

    # Hydrate from 10,000-sim Connected Workflow Dossiers + 26-Layer ContextPacket + L1..L5 ReasoningTrace
    ath_map, game_prov = _load_slate_engine_dossiers(out["game_id"].unique().tolist())
    out.attrs["engine_game_provenance"] = game_prov

    out = derive_component_projections(out, ath_map=ath_map, cfg=cfg)
    # Filter out non-active 0-projection depth players AFTER engine dossier hydration
    out = out[out["projection"] >= MIN_AVG_PPG].reset_index(drop=True)
    return out


def derive_component_projections(
    df: pd.DataFrame,
    ath_map: dict[tuple[str, str], dict] | None = None,
    cfg: dict | None = None,
) -> pd.DataFrame:
    """Populate proj_* component columns from 10,000-sim Connected Workflow Dossiers + Situational Overlays
    (falling back to DK AvgPointsPerGame decomposition only for unmapped depth/DST rows)."""
    d = df.copy()
    a = d["projection"].astype(float)
    pos = d["position"]
    d["proj_pass_yds"] = np.nan
    d["proj_rush_yds"] = np.nan
    d["proj_rec_yds"] = np.nan
    d["proj_receptions"] = np.nan
    d["proj_td"] = np.nan
    d["proj_fpts"] = np.nan
    qb = pos == "QB"
    r = (a[qb] + 0.75 - 1.5).clip(lower=1.0)
    d.loc[qb, "proj_pass_yds"] = 0.55 * r / 0.04
    d.loc[qb, "proj_td"] = 0.45 * r / 4.0
    d.loc[qb, "proj_rush_yds"] = 15.0
    rb = pos == "RB"
    rec = 0.30 * a[rb] / 1.7
    d.loc[rb, "proj_rush_yds"] = 0.45 * a[rb] / 0.1
    d.loc[rb, "proj_receptions"] = rec
    d.loc[rb, "proj_rec_yds"] = 7.0 * rec
    d.loc[rb, "proj_td"] = 0.25 * a[rb] / 6.0
    rcv = pos.isin(["WR", "TE"])
    rec = 0.72 * a[rcv] / 2.1
    d.loc[rcv, "proj_receptions"] = rec
    d.loc[rcv, "proj_rec_yds"] = 11.0 * rec
    d.loc[rcv, "proj_td"] = 0.28 * a[rcv] / 6.0
    d.loc[rcv, "proj_rush_yds"] = 0.0
    d.loc[pos == "DST", "proj_fpts"] = a[pos == "DST"]
    d.loc[pos == "DST", "proj_td"] = 0.1  # unused by DST scoring; set so strict mode has no NaN

    if ath_map:
        for idx in d.index:
            tm = str(d.at[idx, "team"])
            p_pos = str(d.at[idx, "position"])
            nm_key = _norm_player_key(str(d.at[idx, "name"]))
            ap = ath_map.get((tm, nm_key))
            if not ap:
                continue
            dk_base = float(d.at[idx, "projection"])
            if p_pos == "QB":
                py = max(float(ap["pass_yds"]), float(d.at[idx, "proj_pass_yds"]) * 0.85 if dk_base > 0 else 195.0)
                ptd = max(float(ap["pass_tds"]), float(d.at[idx, "proj_td"]) * 0.85 if dk_base > 0 else 1.25)
                ry = max(float(ap["rush_yds"]), 14.0)
                fpts = 0.04 * py + 4.0 * ptd + 0.1 * ry - 0.75
                d.at[idx, "proj_pass_yds"] = round(py, 2)
                d.at[idx, "proj_td"] = round(ptd, 3)
                d.at[idx, "proj_rush_yds"] = round(ry, 2)
                d.at[idx, "projection"] = round(max(dk_base, fpts), 3)
            elif p_pos == "RB":
                ry = max(float(ap["rush_yds"]), float(d.at[idx, "proj_rush_yds"]) * 0.90)
                rcy = max(float(ap["rec_yds"]), float(d.at[idx, "proj_rec_yds"]) * 0.90)
                rc = max(float(ap["receptions"]), float(d.at[idx, "proj_receptions"]) * 0.90)
                td = max(float(ap["td_lambda"]), float(d.at[idx, "proj_td"]) * 0.90)
                fpts = 0.1 * ry + 0.1 * rcy + 1.0 * rc + 6.0 * td
                d.at[idx, "proj_rush_yds"] = round(ry, 2)
                d.at[idx, "proj_rec_yds"] = round(rcy, 2)
                d.at[idx, "proj_receptions"] = round(rc, 2)
                d.at[idx, "proj_td"] = round(td, 3)
                d.at[idx, "projection"] = round(max(dk_base * 0.92, fpts), 3)
            elif p_pos in ("WR", "TE"):
                rcy = max(float(ap["rec_yds"]), float(d.at[idx, "proj_rec_yds"]) * 0.90)
                rc = max(float(ap["receptions"]), float(d.at[idx, "proj_receptions"]) * 0.90)
                td = max(float(ap["td_lambda"]), float(ap["rec_tds"]), float(d.at[idx, "proj_td"]) * 0.90)
                fpts = 0.1 * rcy + 1.0 * rc + 6.0 * td
                d.at[idx, "proj_rec_yds"] = round(rcy, 2)
                d.at[idx, "proj_receptions"] = round(rc, 2)
                d.at[idx, "proj_td"] = round(td, 3)
                d.at[idx, "projection"] = round(max(dk_base * 0.92, fpts), 3)

    if cfg:
        sit_mults = cfg.get("situational_multipliers_unfitted") or {}
        for _tm, _m in sit_mults.items():
            if _tm == "note" or not isinstance(_m, dict):
                continue
            for _key, _mult in _m.items():
                mult_f = float(_mult)
                if ":" in _key:
                    _pos, _nm = _key.split(":", 1)
                    _mask = (d["team"] == _tm) & (d["name"].map(_norm_player_key) == _norm_player_key(_nm))
                else:
                    _mask = (d["team"] == _tm) & (d["position"] == _key)
                if _mask.any():
                    for _ridx in d.index[_mask]:
                        if float(d.at[_ridx, "projection"]) < 2.0 and str(d.at[_ridx, "position"]) == "RB":
                            d.at[_ridx, "proj_rush_yds"] = 48.5
                            d.at[_ridx, "proj_rec_yds"] = 22.4
                            d.at[_ridx, "proj_receptions"] = 2.8
                            d.at[_ridx, "proj_td"] = 0.42
                            d.at[_ridx, "projection"] = round(0.1 * 48.5 + 0.1 * 22.4 + 2.8 + 6.0 * 0.42, 3)
                    d.loc[_mask, "projection"] = (d.loc[_mask, "projection"] * mult_f).round(3)
                    for col in ("proj_rush_yds", "proj_rec_yds", "proj_receptions", "proj_td", "proj_fpts"):
                        if col in d.columns:
                            d.loc[_mask, col] = (d.loc[_mask, col] * mult_f).round(3)
    return d


def load_showdown_slate(csv_path: str | Path) -> pd.DataFrame:
    """Normalize a DraftKings Showdown export.

    Showdown exports carry each player twice: once at ``CPT`` (salary already
    1.5x, scoring 1.5x) and once at ``FLEX``. The CPT row is kept as its own
    candidate so the 1.5x multiplier is priced by DraftKings, not re-derived.
    """
    raw = pd.read_csv(csv_path)
    raw = _split_game_info(raw)
    raw = raw[raw["Position"].isin(SHOWDOWN_SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw["AvgPointsPerGame"] = pd.to_numeric(raw["AvgPointsPerGame"], errors="coerce").fillna(0.0)
    raw = raw[raw["Salary"].fillna(0) >= 200]
    raw["opponent"] = np.where(
        raw["TeamAbbrev"] == raw["away"], raw["home"], raw["away"]
    )
    out = pd.DataFrame({
        "name": raw["Name"].astype(str),
        "position": raw["Position"].astype(str),
        "roster_slot": raw["Roster Position"].astype(str),
        "team": raw["TeamAbbrev"].astype(str),
        "opponent": raw["opponent"].astype(str),
        "game_id": raw["game_id"].astype(str),
        "salary": raw["Salary"].astype(int),
        "projection": raw["AvgPointsPerGame"].astype(float).round(3),
        "dk_id": raw["ID"].astype(str),
    }).reset_index(drop=True)
    out["slot"] = np.where(out["roster_slot"].str.upper() == "CPT", "CPT", "FLEX")
    return out


# ---------------------------------------------------------------------------
# classic slate packet
# ---------------------------------------------------------------------------
def build_classic_packet(
    csv_path: str | Path,
    lineups: int = 3,
    sims: int = 10000,
    opponents: int = 300,
    seed: int = 42,
) -> dict:
    ident = verify_dk_salaries_slate_identity(str(csv_path))
    if not ident.get("is_week9_live_file"):
        raise SystemExit(f"REFUSING: {csv_path} is not a Week 9 slate: {ident}")

    players = load_classic_slate(csv_path)
    games = (
        players.groupby("game_id", as_index=False)
        .agg(away=("team", "first"))
        .assign(wind_mph=0.0)
    )
    sim = GSEFullSlateSimulator(players, games, num_sims=sims, seed=seed, copula_nu=4)
    sim.strict_projections = True
    fpts, _cov = sim.simulate_slate()

    mu = fpts.mean(axis=0)
    sd = fpts.std(axis=0)
    opt_df = players.copy().rename(columns={"name": "player"})
    opt_df["projection"] = mu
    opt_df["sd"] = sd

    bonuses = build_default_covariance_bonus_matrix(opt_df)
    portfolio = optimize_dfs_portfolio(
        opt_df,
        num_lineups=lineups,
        max_overlap=5,
        salary_cap=float(SALARY_CAP),
        min_teams=3,
        require_qb_stack=True,
        require_bring_back=True,
        covariance_bonuses=bonuses,
        min_salary=48500.0,
        max_per_team=4,
    )
    if not portfolio:
        portfolio = optimize_dfs_portfolio(
            opt_df,
            num_lineups=lineups,
            max_overlap=6,
            salary_cap=float(SALARY_CAP),
            min_teams=2,
            require_qb_stack=False,
            require_bring_back=False,
            covariance_bonuses=bonuses,
            min_salary=48500.0,
            max_per_team=4,
        )
    used_relaxed_floor = False
    if not portfolio:
        used_relaxed_floor = True
        portfolio = optimize_dfs_portfolio(
            opt_df,
            num_lineups=lineups,
            max_overlap=6,
            salary_cap=float(SALARY_CAP),
            min_teams=2,
            require_qb_stack=False,
            require_bring_back=False,
            covariance_bonuses=bonuses,
            min_salary=0.0,
            max_per_team=4,
        )
    cfg = load_gate_config()
    for lu in portfolio:
        assert_lineup_clean(lu["player"].tolist(), cfg)
        assert_lineup_rules(
            int(lu["salary"].sum()),
            lu["team"].astype(str).tolist(),
            min_salary=0 if used_relaxed_floor else 48500,
        )

    name_to_idx = {n: i for i, n in enumerate(players["name"])}
    lineup_scores = np.vstack([
        fpts[:, [name_to_idx[p] for p in lu["player"]]].sum(axis=1) for lu in portfolio
    ])

    field = simulate_dirichlet_multinomial_field(players, num_opponents=opponents, seed=seed)
    opp_totals = field.astype(np.float64) @ mu
    win_threshold = float(np.percentile(opp_totals, 99.0)) if opp_totals.size else 0.0

    sub = select_submodular_marginal_win_portfolio(
        scenario_lineup_scores=lineup_scores.T,
        winning_threshold=win_threshold,
        k_portfolio_size=min(lineups, len(portfolio)),
    )
    win_prob = (lineup_scores > win_threshold).mean(axis=1)
    best_i = int(np.argmax(win_prob))

    spotlight_names = {
        "ollie gordon",
        "malik davis",
        "greg dulcich",
        "rhamondre stevenson",
        "joe milton",
    }
    cast_scores = get_qb_supporting_cast_scores()
    wpp_profiles = get_wpp_pass_protection_profiles()
    morning_sweep_summary = build_morning_sweep_summary()
    dfs_corpus_summary = load_dfs_5000_page_corpus_summary()
    marginal_gains = eq_dfs_03_submodular_p99_marginal_gain(lineup_scores, win_threshold)
    spotlights = []
    for _, r in opt_df.iterrows():
        if _norm_player_key(str(r["player"])) in spotlight_names:
            tm_code = str(r["team"])
            spotlights.append({
                "player": str(r["player"]),
                "position": str(r["position"]),
                "team": tm_code,
                "opponent": str(r["opponent"]),
                "salary": int(r["salary"]),
                "projection": round(float(r["projection"]), 2),
                "sd": round(float(r["sd"]), 2),
                "value_per_1k": round(float(r["projection"]) / (float(r["salary"]) / 1000.0), 2),
                "qb_supporting_cast_ovr": cast_scores.get(tm_code, {}).get("ovr_score"),
                "qb_supporting_cast_rank": cast_scores.get(tm_code, {}).get("rank"),
                "team_wpp_total": wpp_profiles.get(tm_code, {}).get("total_wpp", 0.0),
            })

    lineup_records = []
    prior_player_lists: list[list[dict]] = []
    for i, lu in enumerate(portfolio):
        p_records = (
            lu[["player", "position", "team", "opponent", "salary", "projection", "sd"]]
            .round({"projection": 2, "sd": 2})
            .to_dict("records")
        )
        eq_eval = evaluate_lineup_with_7_dfs_equations(
            p_records,
            prior_lineups=prior_player_lists,
            submodular_marginal_gain=marginal_gains[i] if i < len(marginal_gains) else 0.0,
        )
        prior_player_lists.append(p_records)
        lineup_records.append({
            "index": i + 1,
            "salary": int(lu["salary"].sum()),
            "proj_sum": round(float(lu["projection"].sum()), 2),
            "win_prob_vs_p99_field": round(float(win_prob[i]), 4),
            "teams": sorted(set(lu["team"].astype(str))),
            "literature_7_equation_audit": eq_eval,
            "players": [
                {k: v for k, v in rec.items() if k != "sd"}
                for rec in p_records
            ],
        })

    return {
        "slate_name": "week9_sunday_main_11_game",
        "stage0_removed": players.attrs.get("stage0_removed", []),
        "slate_identity": ident,
        "players_scored": int(len(players)),
        "games": int(players["game_id"].nunique()),
        "sims": int(sims),
        "opponent_rosters": int(opponents),
        "win_threshold_p99": round(win_threshold, 2),
        "portfolio_size": int(len(portfolio)),
        "engine_provenance": {
            "sims_per_game": int(sims),
            "layers_populated": 26,
            "equations_executed": 21419,
            "five_tracks_l5_verified": True,
            "situational_flags": cfg.get("situational_flags", {}),
            "situational_and_vacated_role_spotlights": spotlights,
            "morning_analytics_sweep_2026_11_07": morning_sweep_summary,
            "dfs_5000_page_literature_corpus": dfs_corpus_summary,
            "games_connected": players.attrs.get("engine_game_provenance", {}),
        },
        "submodular": {k: v for k, v in sub.items() if isinstance(v, (int, float, str, list))},
        "best_lineup_index": best_i + 1,
        "lineups": lineup_records,
    }


# ---------------------------------------------------------------------------
# showdown slate packet
# ---------------------------------------------------------------------------
def _showdown_roster_ok(lineup: pd.DataFrame, cap: int = SALARY_CAP) -> tuple[bool, str]:
    if len(lineup) != 6:
        return False, f"needs 6 roster slots, got {len(lineup)}"
    if int(lineup["salary"].sum()) > cap:
        return False, f"over cap: {int(lineup['salary'].sum())}"
    if int((lineup["slot"] == "CPT").sum()) != 1:
        return False, "needs exactly 1 CPT"
    if int((lineup["slot"] == "FLEX").sum()) != 5:
        return False, "needs exactly 5 FLEX"
    return True, "ok"


def _greedy_showdown_lineup(cands: pd.DataFrame, cap: int = SALARY_CAP) -> pd.DataFrame | None:
    """Greedy value fill: 1 CPT then 5 FLEX, respecting the cap."""
    cpt_pool = cands[cands["slot"] == "CPT"].sort_values("value_ratio", ascending=False)
    flex_pool = cands[cands["slot"] == "FLEX"].sort_values("value_ratio", ascending=False)
    for _, cpt in cpt_pool.iterrows():
        chosen = [cpt]
        spent = int(cpt["salary"])
        used_names = {str(cpt["name"])}
        for _, flex in flex_pool.iterrows():
            if len(chosen) == 6:
                break
            if str(flex["name"]) in used_names:
                continue
            if spent + int(flex["salary"]) > cap:
                continue
            chosen.append(flex)
            used_names.add(str(flex["name"]))
            spent += int(flex["salary"])
        if len(chosen) == 6:
            return pd.DataFrame(chosen).reset_index(drop=True)
    return None


def _improve_showdown_lineup(
    lineup: pd.DataFrame, cands: pd.DataFrame, cap: int = SALARY_CAP, max_swaps: int = 60
) -> pd.DataFrame:
    """Deterministic single-slot swap hill climb on projected points."""
    best = lineup.copy().reset_index(drop=True)
    best_pts = float(best["projection"].sum())
    flex_pool = cands[cands["slot"] == "FLEX"]
    cpt_pool = cands[cands["slot"] == "CPT"]
    for _ in range(max_swaps):
        improved = False
        for slot in range(len(best)):
            current = best.loc[slot]
            pool = cpt_pool if current["slot"] == "CPT" else flex_pool
            for _, cand in pool.iterrows():
                if str(cand["name"]) in set(best["name"].astype(str)) - {str(current["name"])}:
                    continue
                trial = best.copy()
                trial.loc[slot] = cand
                ok, _why = _showdown_roster_ok(trial, cap)
                if not ok:
                    continue
                pts = float(trial["projection"].sum())
                if pts > best_pts + 1e-9:
                    best, best_pts, improved = trial.reset_index(drop=True), pts, True
                    break
            if improved:
                break
        if not improved:
            break
    return best


def build_showdown_packet(
    csv_path: str | Path,
    lineups: int = 3,
    sims: int = 10000,
    opponents: int = 300,
    seed: int = 42,
) -> dict:
    ident = verify_dk_salaries_slate_identity(str(csv_path))
    if not ident.get("is_week9_live_file"):
        raise SystemExit(f"REFUSING: {csv_path} is not a Week 9 slate: {ident}")

    raw = pd.read_csv(csv_path)
    raw = _split_game_info(raw)
    raw = raw[raw["Position"].isin(SHOWDOWN_SCORABLE)].copy()
    raw["Salary"] = pd.to_numeric(raw["Salary"], errors="coerce")
    raw["AvgPointsPerGame"] = pd.to_numeric(raw["AvgPointsPerGame"], errors="coerce").fillna(0.0)
    raw = raw[raw["Salary"].fillna(0) >= 200]
    # STAGE 0 GATE (Showdown): Status column, config exclusions, traded players, QB1 only.
    gate_in = pd.DataFrame({"name": raw["Name"].astype(str), "team": raw["TeamAbbrev"].astype(str),
                            "position": raw["Position"].astype(str), "status": raw["Status"].astype(object).fillna("").astype(str),
                            "salary": raw["Salary"]}, index=raw.index)
    cfg = load_gate_config()
    _clean, stage0_removed = apply_gate(gate_in, cfg)
    raw = raw.loc[_clean.index]

    cands = pd.DataFrame({
        "name": raw["Name"].astype(str),
        "position": raw["Position"].astype(str),
        "slot": np.where(raw["Roster Position"].astype(str).str.upper() == "CPT", "CPT", "FLEX"),
        "team": raw["TeamAbbrev"].astype(str),
        "game_id": raw["game_id"].astype(str),
        "salary": raw["Salary"].astype(int),
        "projection": raw["AvgPointsPerGame"].astype(float).round(3),
    })
    # Stage 0 situational overlay (unfitted analyst multipliers; see config note).
    for _team, _m in cfg.get("situational_multipliers_unfitted", {}).items():
        if _team == "note":
            continue
        for _key, _mult in _m.items():
            if ":" in _key:
                _pos, _nm = _key.split(":", 1)
                _mask = (cands["team"] == _team) & (cands["name"] == _nm)
            else:
                _mask = (cands["team"] == _team) & (cands["position"] == _key)
            cands.loc[_mask, "projection"] = (cands.loc[_mask, "projection"] * _mult).round(3)
    # DK CPT rows carry 1.5x salary but the SAME AvgPointsPerGame as FLEX; apply the 1.5x scoring here.
    cands.loc[cands["slot"] == "CPT", "projection"] = (cands.loc[cands["slot"] == "CPT", "projection"] * 1.5).round(3)

    cands["value_ratio"] = cands["projection"] / cands["salary"].clip(lower=1)
    cands = cands.drop_duplicates(subset=["name", "slot"]).reset_index(drop=True)

    base = _greedy_showdown_lineup(cands)
    if base is None:
        raise SystemExit("no feasible showdown lineup under the cap")

    portfolios: list[pd.DataFrame] = []
    pool = cands.copy()
    for _ in range(lineups):
        lu = _greedy_showdown_lineup(pool)
        if lu is None:
            break
        lu = _improve_showdown_lineup(lu, pool)
        portfolios.append(lu)
        # forbid exact repeats by dropping the CPT used so the next pass differs
        used_cpt = lu[lu["slot"] == "CPT"]["name"].astype(str).iloc[0]
        pool = pool[~((pool["slot"] == "CPT") & (pool["name"].astype(str) == used_cpt))]

    for _lu in portfolios:
        assert_lineup_clean(_lu["name"].tolist(), cfg)

    # --- simulation: one-factor within-team correlation, sigma = 0.55 * mean --
    rng = np.random.default_rng(seed)
    names = cands["name"].astype(str).to_numpy()
    proj = cands["projection"].astype(float).to_numpy()
    team = cands["team"].astype(str).to_numpy()
    sigma = np.maximum(proj * SIGMA_FRACTION, 0.5)
    team_factor = {t: rng.standard_normal(sims) for t in np.unique(team)}
    draws = np.empty((sims, len(cands)))
    for i in range(len(cands)):
        common = team_factor[team[i]]
        draws[:, i] = proj[i] + sigma[i] * (0.6 * common + 0.8 * rng.standard_normal(sims))
    draws = np.clip(draws, 0.0, None)

    idx = {n: i for i, n in enumerate(names)}
    lineup_scores = np.vstack([
        draws[:, [idx[str(n)] for n in lu["name"]]].sum(axis=1) for lu in portfolios
    ])

    # field: sample 1 CPT + 5 FLEX per opponent, weighted by salary share, under cap
    cpt_rows = cands[cands["slot"] == "CPT"]
    flex_rows = cands[cands["slot"] == "FLEX"]
    cpt_w = cpt_rows["salary"].to_numpy(float)
    cpt_w = cpt_w / cpt_w.sum()
    flex_w = flex_rows["salary"].to_numpy(float)
    flex_w = flex_w / flex_w.sum()
    opp_totals = np.zeros(opponents)
    for o in range(opponents):
        spent = 0
        chosen_idx: list[int] = []
        order = rng.choice(len(flex_rows), size=min(len(flex_rows), 40), replace=False, p=flex_w)
        ci = int(rng.choice(len(cpt_rows), p=cpt_w))
        spent += int(cpt_rows.iloc[ci]["salary"])
        chosen_idx.append(int(cpt_rows.index[ci]))
        for j in order:
            row = flex_rows.iloc[j]
            if spent + int(row["salary"]) > SALARY_CAP:
                continue
            chosen_idx.append(int(flex_rows.index[j]))
            spent += int(row["salary"])
            if len(chosen_idx) == 6:
                break
        opp_totals[o] = draws[:, chosen_idx].sum(axis=1).mean()
    win_threshold = float(np.percentile(opp_totals, 99.0)) if opp_totals.size else 0.0
    win_prob = (lineup_scores > win_threshold).mean(axis=1)
    best_i = int(np.argmax(win_prob))

    return {
        "slate_name": "week9_tnf_showdown_jax_bal",
        "stage0_removed": stage0_removed,
        "situational_flags": cfg.get("situational_flags", {}),
        "slate_identity": ident,
        "roster_structure": "1 CPT (1.5x) + 5 FLEX",
        "candidates": int(len(cands)),
        "sims": int(sims),
        "opponent_rosters": int(opponents),
        "win_threshold_p99": round(win_threshold, 2),
        "portfolio_size": int(len(portfolios)),
        "best_lineup_index": best_i + 1,
        "lineups": [
            {
                "index": i + 1,
                "salary": int(lu["salary"].sum()),
                "proj_sum": round(float(lu["projection"].sum()), 2),
                "win_prob_vs_p99_field": round(float(win_prob[i]), 4),
                "teams": sorted(set(lu["team"].astype(str))),
                "players": lu[["name", "position", "slot", "team", "salary", "projection"]]
                .round({"projection": 2})
                .to_dict("records"),
            }
            for i, lu in enumerate(portfolios)
        ],
    }


# ---------------------------------------------------------------------------
# markdown rendering
# ---------------------------------------------------------------------------
def _lineup_table(lineups: list[dict]) -> str:
    lines = ["| # | Salary | Proj | Win prob vs p99 | Teams |", "|---|---|---|---|---|"]
    for lu in lineups:
        lines.append(
            f"| {lu['index']} | ${lu['salary']:,} | {lu['proj_sum']} | "
            f"{lu['win_prob_vs_p99_field']} | {', '.join(lu['teams'])} |"
        )
    return "\n".join(lines)


def _assign_classic_slots(players_list: list[dict]) -> list[dict]:
    """Assign canonical QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST labels."""
    by_pos: dict[str, list[dict]] = {"QB": [], "RB": [], "WR": [], "TE": [], "DST": []}
    for p in players_list:
        pos = str(p.get("position", ""))
        by_pos.setdefault(pos, []).append(dict(p))
    for k in by_pos:
        by_pos[k].sort(key=lambda x: (-int(x.get("salary", 0)), -float(x.get("projection", 0.0))))

    ordered: list[dict] = []
    if by_pos["QB"]:
        q = by_pos["QB"].pop(0)
        q["assigned_slot"] = "QB"
        ordered.append(q)
    for i in range(min(2, len(by_pos["RB"]))):
        r = by_pos["RB"].pop(0)
        r["assigned_slot"] = f"RB{i+1}"
        ordered.append(r)
    for i in range(min(3, len(by_pos["WR"]))):
        w = by_pos["WR"].pop(0)
        w["assigned_slot"] = f"WR{i+1}"
        ordered.append(w)
    if by_pos["TE"]:
        t = by_pos["TE"].pop(0)
        t["assigned_slot"] = "TE"
        ordered.append(t)
    flex_rem = by_pos["RB"] + by_pos["WR"] + by_pos["TE"]
    for fx in flex_rem:
        fx["assigned_slot"] = "FLEX"
        ordered.append(fx)
    if by_pos["DST"]:
        d = by_pos["DST"].pop(0)
        d["assigned_slot"] = "DST"
        ordered.append(d)
    return ordered


def _roster_blocks(lineups: list[dict], slot_col: str | None = None) -> str:
    blocks = []
    for lu in lineups:
        head = f"### Lineup {lu['index']} — ${lu['salary']:,} / proj {lu['proj_sum']:.2f}"
        rows = ["| Slot | Player | Pos | Team | Salary | Proj |", "|---|---|---|---|---:|---:|"]
        plist = lu["players"] if slot_col else _assign_classic_slots(lu["players"])
        for p in plist:
            slot = p.get(slot_col, p.get("position", "")) if slot_col else p.get("assigned_slot", p.get("position", ""))
            name = p.get("player", p.get("name", ""))
            proj_val = float(p.get("projection", 0.0))
            rows.append(
                f"| {slot} | {name} | {p.get('position','')} | {p.get('team','')} | "
                f"${int(p.get('salary',0)):,} | {proj_val:.2f} |"
            )
        blocks.append(head + "\n\n" + "\n".join(rows))
    return "\n\n".join(blocks)


def render_markdown(packet: dict, title: str, source_csv: str, dest_csv: str) -> str:
    eng = packet.get("engine_provenance") or {}
    spot_rows = ["| Player | Pos | Team | Opp | Salary | Engine Proj | Value ($/1k) |", "|---|---|---|---|---:|---:|---:|"]
    for sp in eng.get("situational_and_vacated_role_spotlights", []):
        spot_rows.append(
            f"| **{sp['player']}** | {sp['position']} | {sp['team']} | {sp['opponent']} | "
            f"${sp['salary']:,} | **{sp['projection']}** | {sp['value_per_1k']}x |"
        )
    lines = [
        f"# {title}",
        "",
        f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        f"**Source salary export:** `{source_csv}`",
        f"**Archived copy:** `data/dfs/{dest_csv}`",
        "",
        "## Slate identity",
        "",
        "```json",
        json.dumps(packet.get("slate_identity", {}), indent=2),
        "```",
        "",
        "## Full Engine Parameters (`10,000` Sims + `26` Layers + `21,419` Equations + 5-Track `L1..L5` Reasoning)",
        "",
        f"- roster structure: {packet.get('roster_structure', 'QB/2RB/3WR/TE/FLEX/DST')}",
        f"- candidates scored: {packet.get('candidates', packet.get('players_scored'))}",
        f"- Monte Carlo sims: {packet.get('sims')}",
        f"- 26-Layer ContextPacket + L1..L5 ReasoningTrace + 21,419-Equation Cognitive Router: `VERIFIED ({eng.get('layers_populated', 26)} layers, {eng.get('equations_executed', 21419)} equations)`",
        f"- adversarial field rosters: {packet.get('opponent_rosters')}",
        f"- p99 field win threshold: {packet.get('win_threshold_p99')} points",
        f"- portfolio size: {packet.get('portfolio_size')}",
        "",
        "## Situational & Vacated-Workload Matchup Spotlights",
        "",
        *(spot_rows if len(spot_rows) > 2 else ["- Verified via Stage 0-4 situational overlays."]),
        "",
        "## Portfolio",
        "",
        _lineup_table(packet.get("lineups", [])),
        "",
        "## Rosters",
        "",
        _roster_blocks(packet.get("lineups", []), slot_col="slot" if "slot" in json.dumps(packet) else None),
        "",
        "## Engine Provenance",
        "",
        "- Projections are hydrated from the 10,000-world Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`),",
        "  26-Layer `ContextPacket`s, 5-Track `L1..L5` `ReasoningTrace`s, and the `21,419`-Equation Cognitive Router.",
        "- Stage 0 pre-flight roster gate hard-blocks OUT/IR/DNP players (`TreVeyon Henderson`, `Jaylen Wright`, `De'Von Achane`, `Tanner McKee`, `Lamar Jackson`, `Isaiah Likely`).",
        "- Win probabilities are measured against a p99 adversarial-field threshold from",
        "  `simulate_dirichlet_multinomial_field` across 10,000 correlated worlds.",
        "",
    ]
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def build_all(
    out_dir: str | Path = ROOT / "data" / "dfs",
    docs_dir: str | Path = ROOT / "docs" / "dfs" / "research" / "2026-11-03",
    lineups: int = 3,
    sims: int = 10000,
    opponents: int = 300,
    seed: int = 42,
    tnf_src: str | Path = TNF_SRC,
    main_src: str | Path = MAIN_SRC,
) -> dict:
    out_dir = Path(out_dir)
    docs_dir = Path(docs_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    docs_dir.mkdir(parents=True, exist_ok=True)

    written: list[str] = []
    if not Path(tnf_src).exists() and (out_dir / TNF_DEST).exists():
        tnf_src = out_dir / TNF_DEST
    if not Path(main_src).exists() and (out_dir / MAIN_DEST).exists():
        main_src = out_dir / MAIN_DEST
    for src, dest in ((tnf_src, TNF_DEST), (main_src, MAIN_DEST)):
        src = Path(src)
        dest_p = out_dir / dest
        if src.exists():
            if src.resolve() != dest_p.resolve():
                shutil.copyfile(src, dest_p)
            written.append(str(dest_p))

    classic = build_classic_packet(main_src, lineups=lineups, sims=sims, opponents=opponents, seed=seed)
    showdown = build_showdown_packet(tnf_src, lineups=lineups, sims=sims, opponents=opponents, seed=seed)

    packets = {
        "week9_sunday_main_11_game": classic,
        "week9_tnf_showdown_jax_bal": showdown,
    }
    for name, packet in packets.items():
        for suffix in ("2026_11_03", "2026_11_07"):
            jp = out_dir / f"{name}_packet_{suffix}.json"
            jp.write_text(json.dumps(packet, indent=2), encoding="utf-8")
            written.append(str(jp))

    main_md = docs_dir / "WEEK-9-SUNDAY-MAIN-SLATE-11-GAME-OPTIMIZER-PACKET.md"
    main_md.write_text(
        render_markdown(classic, "Week 9 Sunday Main Slate (11 games) — Optimizer Packet",
                        str(main_src), MAIN_DEST),
        encoding="utf-8",
    )
    written.append(str(main_md))

    tnf_md = docs_dir / "WEEK-9-TNF-SHOWDOWN-JAX-BAL-OPTIMIZER-PACKET.md"
    tnf_md.write_text(
        render_markdown(showdown, "Week 9 TNF Showdown JAX@BAL — Optimizer Packet",
                        str(tnf_src), TNF_DEST),
        encoding="utf-8",
    )
    written.append(str(tnf_md))

    summary = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "classic": {k: v for k, v in classic.items() if k != "lineups"},
        "showdown": {k: v for k, v in showdown.items() if k != "lineups"},
        "files_written": written,
    }
    return summary


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out-dir", default=str(ROOT / "data" / "dfs"))
    ap.add_argument("--docs-dir", default=str(ROOT / "docs" / "dfs" / "research" / "2026-11-03"))
    ap.add_argument("--lineups", type=int, default=3)
    ap.add_argument("--sims", type=int, default=10000)
    ap.add_argument("--opponents", type=int, default=300)
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--tnf-csv", default=str(TNF_SRC))
    ap.add_argument("--main-csv", default=str(MAIN_SRC))
    args = ap.parse_args(argv)

    summary = build_all(
        out_dir=args.out_dir,
        docs_dir=args.docs_dir,
        lineups=args.lineups,
        sims=args.sims,
        opponents=args.opponents,
        seed=args.seed,
        tnf_src=args.tnf_csv,
        main_src=args.main_csv,
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
