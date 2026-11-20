#!/usr/bin/env python3
"""
GSE General 360-Degree Full-Board Slate Evaluator (`evaluate_slate_360_full_markets.py`)
========================================================================================
Generalized 77-market NFL evaluator for any matchup (`--away --home --week`), adding:
1. Coupled IDP Tackles (`tackles_plus_assists`, `solo_tackles`, `assist_tackles`) tied
   to opponent offensive snap/completion/rush volume instead of independent noise.
2. Extreme Value Theory (EVT / GPD Peak-Over-Threshold) longest-play tail distributions
   anchored to Empirical Bayes shrunk `p88`/`p90` play quantiles (`k0=10` rec / `k0=18` rush).
3. Market-implied scoring volatility `sigma_mkt(g)` surfaced alongside simulated dispersion.
4. Strict Stage 5 Class B Two-Sided De-Vig & Conjunction Gate (`EDGE#1b` / `EDGE#2`):
   - Two-sided priced markets are multiplicatively de-vigged to compute `edge_vs_market`
     and EV at actual posted American odds.
   - Unpriced single-side or line-only markets fail closed (`decision="PASS"`,
     `publishAllowed=False`, `PASS_UNPRICED_MARKET`).
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.enforce_stage0_roster_and_board_allowlist import (  # noqa: E402
    assert_zero_roster_contamination,
)
from scripts.ops.gse_coach_mind_simulator import (  # noqa: E402
    build_jev_state_tensor,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)
from scripts.ops.gse_connected_game_workflow import (  # noqa: E402
    _get_matchup_env,
    _quantiles_from_vec,
)
from scripts.ops.week8_forensic_kernels import (  # noqa: E402
    evaluate_empirical_prop_probability,
    wilson_lower_bound,
)

TEAM_ALIASES = {"LA": "LAR", "JAC": "JAX", "WSH": "WAS", "LVR": "LV"}


def _norm_team(tm: str) -> str:
    u = (tm or "").strip().upper()
    return TEAM_ALIASES.get(u, u)


def _american_to_implied_prob(american: Any) -> float | None:
    if american is None or isinstance(american, bool):
        return None
    try:
        a = float(american)
    except (TypeError, ValueError):
        return None
    if a == 0.0 or not math.isfinite(a):
        return None
    if a < 0:
        return (-a) / ((-a) + 100.0)
    return 100.0 / (a + 100.0)


def _american_to_profit_per_unit(american: Any) -> float | None:
    if american is None or isinstance(american, bool):
        return None
    try:
        a = float(american)
    except (TypeError, ValueError):
        return None
    if a == 0.0 or not math.isfinite(a):
        return None
    return (100.0 / (-a)) if a < 0 else (a / 100.0)


def _devig_two_way(over_odds: Any, under_odds: Any) -> tuple[float, float] | None:
    p_o = _american_to_implied_prob(over_odds)
    p_u = _american_to_implied_prob(under_odds)
    if p_o is None or p_u is None:
        return None
    tot = p_o + p_u
    if tot <= 0.0:
        return None
    return (p_o / tot, p_u / tot)


def _to_playable_american(prob: float) -> int:
    p = max(0.505, min(0.75, prob - 0.015))
    return int(round(-100.0 * p / (1.0 - p)))


def _evt_gpd_longest_draw(
    rng: np.random.Generator,
    scale_base: np.ndarray,
    loc_yd: float,
    xi: float,
    beta: float,
    n_sims: int,
    floor_yd: float,
) -> np.ndarray:
    """Peak-Over-Threshold Generalized Pareto tail anchored to scaled player volume."""
    u = np.clip(rng.random(n_sims), 1e-4, 0.9995)
    gpd_exc = (beta / xi) * ((1.0 - u) ** (-xi) - 1.0) if abs(xi) > 1e-6 else (-beta * np.log(1.0 - u))
    gpd_exc = np.clip(gpd_exc, 0.0, 75.0)
    return np.maximum(floor_yd, loc_yd * scale_base + 0.55 * gpd_exc - 0.45 * beta)


def _compute_empirical_quarter_and_longest_priors(away_u: str, home_u: str) -> dict[str, Any]:
    pbp_p = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
    pbp = pd.read_parquet(pbp_p)
    pbp["posteam"] = pbp["posteam"].replace({"LA": "LAR"})
    pbp["defteam"] = pbp["defteam"].replace({"LA": "LAR"})
    scrim = pbp[pbp["play_type"].isin(["pass", "run"]) & pbp["posteam"].notna()].copy()

    q_yds: dict[str, list[float]] = {}
    for tm in (away_u, home_u):
        sub = scrim[scrim["posteam"] == tm]
        tot_y = float(sub["yards_gained"].clip(lower=0).sum()) or 1.0
        shares = [float(sub[sub["qtr"] == q]["yards_gained"].clip(lower=0).sum()) / tot_y for q in (1, 2, 3, 4)]
        s_sum = sum(shares) or 1.0
        if tot_y <= 1.0:
            shares = [0.24, 0.27, 0.23, 0.26]
            s_sum = 1.0
        q_yds[tm] = [round(x / s_sum, 4) for x in shares]

    sack_counts: dict[str, float] = {}
    for tm in (away_u, home_u):
        tdef = scrim[scrim["defteam"] == tm]
        tdef_g = max(1, int(tdef["game_id"].nunique()))
        for col in ("sack_player_name", "half_sack_1_player_name", "half_sack_2_player_name"):
            if col in tdef.columns:
                w = 1.0 if col == "sack_player_name" else 0.5
                for nm, cnt in tdef[col].dropna().value_counts().items():
                    sack_counts[f"{tm}|{nm}"] = sack_counts.get(f"{tm}|{nm}", 0.0) + w * float(cnt) / tdef_g

    max_rec_obs: dict[str, tuple[float, int]] = {}
    all_rec_p = scrim[scrim["complete_pass"] == 1]
    for nm, grp in all_rec_p.groupby("receiver_player_name"):
        if len(grp) > 0:
            max_rec_obs[str(nm)] = (float(grp["receiving_yards"].quantile(0.88) or 14.0), int(len(grp)))

    max_rush_obs: dict[str, tuple[float, int]] = {}
    all_run_p = scrim[scrim["play_type"] == "run"]
    for nm, grp in all_run_p.groupby("rusher_player_name"):
        if len(grp) > 0:
            max_rush_obs[str(nm)] = (float(grp["rushing_yards"].quantile(0.88) or 10.5), int(len(grp)))

    return {
        "q_shares": q_yds,
        "sack_per_gm": sack_counts,
        "rec_p90_play": max_rec_obs,
        "rush_p90_play": max_rush_obs,
    }


def _short_cands(full_name: str) -> list[str]:
    clean = full_name.replace(" Jr.", "").replace(" Sr.", "").replace(" III", "").replace(" II", "").strip()
    parts = clean.split()
    if len(parts) < 2:
        return [clean]
    f, l = parts[0], parts[-1]
    cands = [f"{f[0]}.{l}", f"{f[:2]}.{l}", f"{f[:3]}.{l}"]
    if full_name == "Drew Ogletree":
        cands.insert(0, "A.Ogletree")
    return cands


def _estimate_market_implied_volatility(board: dict[str, Any], vecs: dict[str, Any]) -> dict[str, Any]:
    gl = board.get("game_lines") or {}
    ou = float(gl.get("over_under") or 44.5)
    sp = abs(float(gl.get("spread") or 0.0))
    # Empirical NFL score total std scales gently with posted total & blowout dispersion (~12.4-14.2 pts)
    sigma_mkt = round(max(11.0, min(16.0, 10.6 + 0.062 * ou + 0.08 * sp)), 3)
    tot_vec = np.asarray(vecs["away_score"], dtype=np.float64) + np.asarray(vecs["home_score"], dtype=np.float64)
    sigma_sim = round(float(np.std(tot_vec)), 3)
    return {
        "posted_total": ou,
        "posted_abs_spread": sp,
        "market_implied_volatility_pts": sigma_mkt,
        "sim_total_volatility_pts": sigma_sim,
        "volatility_ratio_sim_to_mkt": round(sigma_sim / max(1.0, sigma_mkt), 4),
    }


def _eval_vec_against_line(
    vec: np.ndarray,
    line: float,
    n_sims: int,
    stat_type: str = "generic",
    over_odds: Any = None,
    under_odds: Any = None,
) -> dict[str, Any]:
    min_req = 1.15 if stat_type in ("receptions", "tackles_plus_assists", "solo_tackles", "assist_tackles") else 0.90
    if float(np.std(vec)) >= min_req:
        emp = evaluate_empirical_prop_probability(
            samples=vec,
            line=float(line),
            market_over_american=over_odds,
            market_under_american=under_odds,
            max_prob_cap=0.780,
            stat_type=stat_type,
        )
        p_over = min(0.780, max(0.005, float(emp["p_over"])))
        p_under = min(0.780, max(0.005, float(emp["p_under"])))
    else:
        p_over = min(0.780, max(0.005, float(np.mean(vec > float(line)))))
        p_under = min(0.780, max(0.005, float(np.mean(vec < float(line)))))

    devig = _devig_two_way(over_odds, under_odds)
    if devig is not None:
        mkt_over, mkt_under = devig
        edge_over = p_over - mkt_over
        edge_under = p_under - mkt_under
        lean = "OVER" if edge_over >= edge_under else "UNDER"
        w_prob = min(0.780, p_over if lean == "OVER" else p_under)
        mkt_p = mkt_over if lean == "OVER" else mkt_under
        lean_american = over_odds if lean == "OVER" else under_odds
        prof = _american_to_profit_per_unit(lean_american) or 0.9091
        ev_units = w_prob * prof - (1.0 - w_prob)
        edge_vs_mkt = w_prob - mkt_p
        w_lb = wilson_lower_bound(w_prob * n_sims, n_sims)
        if edge_vs_mkt >= 0.055 and w_lb >= 0.535 and ev_units >= 0.04:
            decision = "EDGE#2"
            publish_allowed = True
            reason = f"CLEARED_EDGE2: two-sided devig edge {edge_vs_mkt:+.3f}, EV {ev_units:+.3f}u"
        elif edge_vs_mkt >= 0.035 and w_lb >= 0.515 and ev_units >= 0.02:
            decision = "EDGE#1b"
            publish_allowed = True
            reason = f"CLEARED_EDGE1B: two-sided devig edge {edge_vs_mkt:+.3f}, EV {ev_units:+.3f}u"
        else:
            decision = "PASS"
            publish_allowed = False
            reason = f"PASS_SUB_THRESHOLD: two-sided devig edge {edge_vs_mkt:+.3f}, EV {ev_units:+.3f}u"
    else:
        lean = "OVER" if p_over >= p_under else "UNDER"
        w_prob = min(0.780, p_over if lean == "OVER" else p_under)
        w_lb = wilson_lower_bound(w_prob * n_sims, n_sims)
        mkt_p = None
        edge_vs_mkt = None
        ev_units = None
        decision = "PASS"
        publish_allowed = False
        reason = "PASS_UNPRICED_MARKET: ESPN Core propBets provides target line without two-sided American odds."

    conf_int = min(78, max(51, int(round(50.0 + abs(w_prob - 0.50) * 100.0))))
    q = _quantiles_from_vec(vec, 1.0, allow_negative=bool(np.min(vec) < 0))
    return {
        "post_sim_mean": round(float(q["mean"]), 2),
        "post_sim_p50": round(float(q["p50"]), 2),
        "post_sim_std": round(float(q["std"]), 2),
        "post_sim_p25": round(float(q["p25"]), 2),
        "post_sim_p75": round(float(q["p75"]), 2),
        "model_lean": lean,
        "model_prob_over": round(p_over, 4),
        "model_prob_under": round(p_under, 4),
        "win_prob_on_lean": round(w_prob, 4),
        "wilson_lower_90": round(float(w_lb), 4),
        "market_fair_prob": round(mkt_p, 4) if mkt_p is not None else None,
        "edge_vs_market": round(edge_vs_mkt, 4) if edge_vs_mkt is not None else None,
        "edge_vs_devig_50": round(w_prob - 0.5000, 4),
        "ev_units": round(ev_units, 4) if ev_units is not None else None,
        "confidence_score": f"{conf_int}/100",
        "playable_to_american_odds": _to_playable_american(w_prob),
        "decision": decision,
        "publishAllowed": publish_allowed,
        "gate_reason": reason,
    }


def evaluate_slate_360_markets(
    away: str,
    home: str,
    week: int,
    *,
    board_path: Path | None = None,
    dossier_path: Path | None = None,
    spine_path: Path | None = None,
    out_path: Path | None = None,
    master_out_path: Path | None = None,
    n_sims: int = 10000,
    seed: int = 20261119,
) -> dict[str, Any]:
    away_u = _norm_team(away)
    home_u = _norm_team(home)
    aw_l, hm_l = away_u.lower(), home_u.lower()

    dossier_p = dossier_path or (REPO_ROOT / "data" / "engine" / f"connected_workflow_dossier_{aw_l}_{hm_l}_week{week}.json")
    board_p = board_path or (REPO_ROOT / "data" / "engine" / f"slate_{aw_l}_{hm_l}_week{week}_board.json")
    spine_p = spine_path or (REPO_ROOT / "data" / "engine" / f"jev_full_game_spine_{aw_l}_{hm_l}_week{week}.json")

    dossier = json.loads(dossier_p.read_text(encoding="utf-8"))
    board = json.loads(board_p.read_text(encoding="utf-8"))
    spine_raw = json.loads(spine_p.read_text(encoding="utf-8"))
    spine_game = (spine_raw.get("games") or {}).get(f"{away_u}@{home_u}", spine_raw)

    s0 = dossier["stage0_roster_and_board_allowlist"]
    s2 = dossier["stage2_jev_spine_and_10k_simulation"]
    s34 = dossier["stage3_4_conserved_post_sim_projections"]
    s5 = dossier["stage5_360_conjunction_gate"]

    sealed_obj, sealed_hash = load_sealed_object_readonly()
    jev_tensor = build_jev_state_tensor(spine_game, enforce_freshness=False)
    priors = dict(s2["compiled_stage1_priors"])
    priors["jev_state_tensor"] = jev_tensor
    env_cfg = _get_matchup_env(away_u, home_u, week)

    sim_a = simulate_matchup_pbp(
        away=away_u,
        home=home_u,
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=n_sims,
        seed=seed,
        w1_w7_override=priors,
        return_vectors=True,
        jev_state_tensor=jev_tensor,
        posted_home_spread=float(env_cfg["posted_home_spread"]),
        posted_total=float(env_cfg["posted_total"]),
    )
    vecs = sim_a["vectors"]
    actual_n = len(vecs["away_score"])
    emp_priors = _compute_empirical_quarter_and_longest_priors(away_u, home_u)
    mkt_vol = _estimate_market_implied_volatility(board, vecs)

    rng = np.random.default_rng(seed)
    aw_sh_q = emp_priors["q_shares"][away_u]
    hm_sh_q = emp_priors["q_shares"][home_u]
    aw_q_pts = vecs["away_score"][:, None] * rng.dirichlet(np.array(aw_sh_q) * 28.0, size=actual_n)
    hm_q_pts = vecs["home_score"][:, None] * rng.dirichlet(np.array(hm_sh_q) * 28.0, size=actual_n)

    aw_1q, hm_1q = aw_q_pts[:, 0], hm_q_pts[:, 0]
    aw_2q, hm_2q = aw_q_pts[:, 1], hm_q_pts[:, 1]
    aw_3q, hm_3q = aw_q_pts[:, 2], hm_q_pts[:, 2]
    aw_4q, hm_4q = aw_q_pts[:, 3], hm_q_pts[:, 3]
    aw_1h, hm_1h = aw_1q + aw_2q, hm_1q + hm_2q

    # Detect teams with Out edge defenders for dynamic pass-rush share reallocation
    out_edges_by_team: dict[str, int] = {}
    for inj in board.get("live_injuries") or []:
        st_u = str(inj.get("status") or "").strip().lower()
        pos_u = str(inj.get("position") or "").strip().upper()
        tm_u = _norm_team(str(inj.get("team") or ""))
        if st_u == "out" and pos_u in ("DE", "OLB", "EDGE"):
            out_edges_by_team[tm_u] = out_edges_by_team.get(tm_u, 0) + 1

    # Opponent offensive play volume coupling multiplier for IDP tackles
    aw_opp_plays = (
        np.asarray(vecs.get("home_rush_att", vecs["home_score"]), dtype=np.float64)
        + np.asarray(vecs.get("home_pass_comp", vecs["home_pass_att"] * 0.63), dtype=np.float64)
    )
    hm_opp_plays = (
        np.asarray(vecs.get("away_rush_att", vecs["away_score"]), dtype=np.float64)
        + np.asarray(vecs.get("away_pass_comp", vecs["away_pass_att"] * 0.63), dtype=np.float64)
    )
    aw_idp_vol_mult = np.clip(aw_opp_plays / max(1.0, float(np.mean(aw_opp_plays))), 0.65, 1.45)
    hm_idp_vol_mult = np.clip(hm_opp_plays / max(1.0, float(np.mean(hm_opp_plays))), 0.65, 1.45)

    ath_projs = s34["athlete_post_sim_projections"]
    props = board.get("props") or []
    evaluated_items: list[dict[str, Any]] = []
    seen_keys: set[tuple[str, str, str, Any]] = set()

    ath_vecs: dict[str, dict[str, np.ndarray]] = {}
    for name, ap in ath_projs.items():
        tm = _norm_team(ap["team"])
        pos = ap["position"]
        pr = ap["projections"]
        is_aw = tm == away_u
        q_sh = aw_sh_q if is_aw else hm_sh_q
        frac_1q, frac_1h = q_sh[0], q_sh[0] + q_sh[1]

        if pos == "QB":
            p_yds = np.asarray(vecs["away_pass_yds"] if is_aw else vecs["home_pass_yds"], dtype=np.float64)
            p_tds = np.asarray(vecs["away_pass_tds"] if is_aw else vecs["home_pass_tds"], dtype=np.float64)
            att = np.asarray(vecs["away_pass_att"] if is_aw else vecs["home_pass_att"], dtype=np.float64)
            cmp_ = np.asarray(vecs["away_pass_comp"] if is_aw else vecs["home_pass_comp"], dtype=np.float64)
            ints = np.asarray(vecs["away_ints"] if is_aw else vecs["home_ints"], dtype=np.float64)
            ry = np.asarray(vecs["away_qb_rush_yds"] if is_aw else vecs["home_qb_rush_yds"], dtype=np.float64)
            if float(np.std(ry)) < 6.0:
                ry = np.maximum(0.0, ry + rng.gamma(2.2, 4.5, size=actual_n) - 4.0)
            car = np.asarray(vecs["away_qb_scrambles"] if is_aw else vecs["home_qb_scrambles"], dtype=np.float64) + rng.poisson(1.4, size=actual_n)
            qb_mean_p = max(1.0, float(np.mean(p_yds)))
            qb_ypc_scale = np.maximum(0.3, (p_yds / qb_mean_p) ** 0.55)
            long_cmp = _evt_gpd_longest_draw(rng, qb_ypc_scale, loc_yd=31.0, xi=0.10, beta=7.5, n_sims=actual_n, floor_yd=8.0)
            long_ru = _evt_gpd_longest_draw(rng, np.maximum(0.25, ry / max(1.0, float(np.mean(ry)))) ** 0.45, loc_yd=6.5, xi=0.08, beta=3.2, n_sims=actual_n, floor_yd=1.0)
            d_map = {
                "pass_yds": p_yds,
                "pass_yds_1q": p_yds * rng.beta(frac_1q * 18.0, (1.0 - frac_1q) * 18.0, size=actual_n),
                "pass_yds_1h": p_yds * rng.beta(frac_1h * 22.0, (1.0 - frac_1h) * 22.0, size=actual_n),
                "pass_tds": p_tds,
                "pass_completions": cmp_,
                "pass_attempts": att,
                "interceptions": ints,
                "rush_yds": ry,
                "rush_yds_1q": ry * rng.beta(0.25 * 10.0, 0.75 * 10.0, size=actual_n),
                "carries": car,
                "pass_plus_rush_yds": p_yds + ry,
                "longest_comp": long_cmp,
                "longest_rush": long_ru,
                "any_td": (rng.poisson(np.clip(ry * 0.008 + 0.08, 0.04, 0.65)) >= 1).astype(np.float64),
            }
        elif pos in ("RB", "WR", "TE"):
            ry_m = float((pr.get("rush_yds") or {}).get("mean", 0.0))
            cy_m = float((pr.get("carries") or {}).get("mean", 0.0))
            rec_m = float((pr.get("rec_yds") or {}).get("mean", 0.0))
            re_m = float((pr.get("receptions") or {}).get("mean", 0.0))
            td_m = float((pr.get("rec_tds") or {}).get("mean", 0.12))

            team_rush_v = np.asarray(vecs["away_rush_yds"] if is_aw else vecs["home_rush_yds"], dtype=np.float64)
            team_pass_v = np.asarray(vecs["away_pass_yds"] if is_aw else vecs["home_pass_yds"], dtype=np.float64)
            rush_sh = float(pr.get("carry_share_conserved", ry_m / max(1.0, float(np.mean(team_rush_v)))))
            rec_sh = float(pr.get("target_share_conserved", rec_m / max(1.0, float(np.mean(team_pass_v)))))

            rush_v = np.maximum(0.0, team_rush_v * rush_sh * rng.gamma(16.0, 1.0 / 16.0, size=actual_n)) if ry_m > 0.5 else np.zeros(actual_n)
            if ry_m > 0.5:
                rush_v = np.maximum(0.0, rush_v * (ry_m / max(0.5, float(np.mean(rush_v)))))
            rec_v = np.maximum(0.0, team_pass_v * rec_sh * rng.gamma(14.0, 1.0 / 14.0, size=actual_n)) if rec_m > 0.5 else np.zeros(actual_n)
            if rec_m > 0.5:
                rec_v = np.maximum(0.0, rec_v * (rec_m / max(0.5, float(np.mean(rec_v)))))

            ypr = float(np.clip(rec_m / max(0.5, re_m), 6.0, 16.5))
            ypc = float(np.clip(ry_m / max(0.5, cy_m), 3.3, 5.5)) if ry_m > 0.5 else 4.2
            car_v = np.maximum(0.0, rush_v / ypc + (rng.gamma(4.0, 0.575, size=actual_n) - 2.30)) if ry_m > 0.5 else np.zeros(actual_n)
            recp_v = np.maximum(0.0, rec_v / ypr + (rng.gamma(4.0, 0.425, size=actual_n) - 1.70))
            if float(np.std(recp_v)) < 1.25:
                recp_v = np.maximum(0.0, recp_v + (rng.gamma(4.0, 0.625, size=actual_n) - 2.50))

            cands = _short_cands(name)
            pos_prior_rec = 16.5 if pos == "WR" else (13.0 if pos == "TE" else 8.5)
            pos_prior_rush = 12.5 if pos == "RB" else 8.0
            best_rec_tup = max((emp_priors["rec_p90_play"].get(sc, (0.0, 0)) for sc in cands), key=lambda x: x[1], default=(pos_prior_rec, 0))
            best_rush_tup = max((emp_priors["rush_p90_play"].get(sc, (0.0, 0)) for sc in cands), key=lambda x: x[1], default=(pos_prior_rush, 0))
            w_eb_rec = best_rec_tup[1] / (best_rec_tup[1] + 10.0)
            w_eb_rush = best_rush_tup[1] / (best_rush_tup[1] + 18.0)
            obs_long_rec = w_eb_rec * best_rec_tup[0] + (1.0 - w_eb_rec) * pos_prior_rec
            obs_long_rush = w_eb_rush * best_rush_tup[0] + (1.0 - w_eb_rush) * pos_prior_rush

            long_rec_v = _evt_gpd_longest_draw(rng, np.maximum(0.3, rec_v / max(1.0, rec_m)) ** 0.40, loc_yd=obs_long_rec, xi=0.14, beta=5.6, n_sims=actual_n, floor_yd=2.0)
            long_rush_v = _evt_gpd_longest_draw(rng, np.maximum(0.3, rush_v / max(1.0, ry_m)) ** 0.40, loc_yd=obs_long_rush, xi=0.10, beta=4.4, n_sims=actual_n, floor_yd=1.0)

            tm_td_tot = float(np.mean(vecs["away_score"] if is_aw else vecs["home_score"])) / 9.2
            pos_td_share = td_m if pos in ("WR", "TE") else max(td_m, rush_sh * 0.48 * tm_td_tot)
            td_count_vec = rng.poisson(max(0.03, pos_td_share), size=actual_n).astype(np.float64)
            d_map = {
                "rush_yds": rush_v,
                "rush_yds_1q": rush_v * rng.beta(frac_1q * 12.0, (1.0 - frac_1q) * 12.0, size=actual_n),
                "rush_yds_1h": rush_v * rng.beta(frac_1h * 16.0, (1.0 - frac_1h) * 16.0, size=actual_n),
                "carries": car_v,
                "rec_yds": rec_v,
                "rec_yds_1q": rec_v * rng.beta(frac_1q * 11.0, (1.0 - frac_1q) * 11.0, size=actual_n),
                "rec_yds_1h": rec_v * rng.beta(frac_1h * 15.0, (1.0 - frac_1h) * 15.0, size=actual_n),
                "receptions": recp_v,
                "rush_plus_rec_yds": rush_v + rec_v,
                "longest_rec": long_rec_v,
                "longest_rush": long_rush_v,
                "td_count": td_count_vec,
                "any_td": (td_count_vec >= 1).astype(np.float64),
            }
        elif pos == "PK":
            tm_pts = np.asarray(vecs["away_score"] if is_aw else vecs["home_score"], dtype=np.float64)
            fg_m = float((pr.get("fg_made") or {}).get("mean", 1.5))
            pat_m = float((pr.get("pat_made") or {}).get("mean", 2.0))
            fg_v = np.clip(tm_pts * (fg_m / max(1.0, float(np.mean(tm_pts)))) + rng.gamma(3.5, 0.42, size=actual_n) - 1.47, 0.0, 6.0)
            pat_v = np.clip(tm_pts * (pat_m / max(1.0, float(np.mean(tm_pts)))) + rng.gamma(3.5, 0.40, size=actual_n) - 1.40, 0.0, 7.0)
            d_map = {"fg_made": fg_v, "pat_made": pat_v, "kicking_points": 3.0 * fg_v + pat_v}
        else:
            tk_m = float((pr.get("tackles_plus_assists") or {}).get("mean", 4.5))
            sol_m = float((pr.get("solo_tackles") or {}).get("mean", 2.6))
            pbp_sk = max([emp_priors["sack_per_gm"].get(f"{tm}|{sc}", 0.0) for sc in _short_cands(name)] or [0.0])
            opp_sacks_vec = np.asarray(vecs["away_sacks"] if tm == home_u else vecs["home_sacks"], dtype=np.float64)
            sk_mult = 1.0 + 0.12 * min(2, out_edges_by_team.get(tm, 0)) if pos in ("DE", "OLB", "EDGE") else 1.0
            est_sk_rate = max(0.08, pbp_sk * sk_mult)
            team_sk_mean = max(1.5, float(np.mean(opp_sacks_vec)))
            sk_v = rng.poisson(np.clip(opp_sacks_vec * (est_sk_rate / team_sk_mean), 0.04, 2.2)).astype(np.float64)

            vol_mult = aw_idp_vol_mult if is_aw else hm_idp_vol_mult
            shape_k = max(2.2, tk_m * 0.85)
            tk_base = rng.gamma(shape_k, tk_m / shape_k, size=actual_n)
            tk_v = np.maximum(0.0, tk_base * vol_mult)
            sol_ratio = float(np.clip(sol_m / max(0.5, tk_m), 0.35, 0.80))
            sol_noise = rng.beta(sol_ratio * 14.0, (1.0 - sol_ratio) * 14.0, size=actual_n)
            sol_v = np.maximum(0.0, tk_v * sol_noise)
            ast_v = np.maximum(0.0, tk_v - sol_v)
            if float(np.std(tk_v)) < 1.25:
                tk_v = np.maximum(0.0, tk_v + (rng.gamma(4.0, 0.55, size=actual_n) - 2.20))
            d_map = {
                "tackles_plus_assists": tk_v,
                "solo_tackles": sol_v,
                "assist_tackles": ast_v,
                "sacks": sk_v,
            }
        ath_vecs[name] = d_map

    market_summary: dict[str, dict[str, int]] = {}
    binary_yesno_keywords = ("touchdown scorer", "score 2", "score 3", "overtime", "moneyline")
    for it in props:
        mkt = str(it.get("market") or "").strip()
        ath = str(it.get("athlete") or "").strip()
        tm = _norm_team(str(it.get("team") or ""))
        line = it.get("line")
        ml_k = mkt.lower()
        is_binary_mkt = any(bk in ml_k for bk in binary_yesno_keywords)
        if line is None and not is_binary_mkt:
            continue
        k = (mkt, ath, tm, line)
        if k in seen_keys:
            continue
        seen_keys.add(k)
        line_f = 0.5 if line is None else float(line)

        vec: np.ndarray | None = None
        st_type = "generic"

        if mkt == "1st Quarter Total":
            vec = aw_1q + hm_1q
        elif mkt == "2nd Quarter Total":
            vec = aw_2q + hm_2q
        elif mkt == "3rd Quarter Total":
            vec = aw_3q + hm_3q
        elif mkt == "4th Quarter Total":
            vec = aw_4q + hm_4q
        elif mkt == "1st Half Total":
            vec = aw_1h + hm_1h
        elif mkt in ("1st Quarter Moneyline", "2nd Quarter Moneyline", "3rd Quarter Moneyline", "4th Quarter Moneyline", "1st Half Moneyline") and tm in (away_u, home_u):
            q_pair = {
                "1st Quarter Moneyline": (aw_1q, hm_1q),
                "2nd Quarter Moneyline": (aw_2q, hm_2q),
                "3rd Quarter Moneyline": (aw_3q, hm_3q),
                "4th Quarter Moneyline": (aw_4q, hm_4q),
                "1st Half Moneyline": (aw_1h, hm_1h),
            }[mkt]
            tm_p, opp_p = q_pair if tm == away_u else (q_pair[1], q_pair[0])
            vec = (tm_p > opp_p + 0.5).astype(np.float64)
            line_f = 0.5
        elif mkt == "Team Total Points" and tm in (away_u, home_u):
            vec = np.asarray(vecs["away_score"] if tm == away_u else vecs["home_score"], dtype=np.float64)
        elif mkt == "Team 1st Half Total Points" and tm in (away_u, home_u):
            vec = aw_1h if tm == away_u else hm_1h
        elif mkt == "Team Total Touchdowns" and tm in (away_u, home_u):
            tm_pts = np.asarray(vecs["away_score"] if tm == away_u else vecs["home_score"], dtype=np.float64)
            vec = np.clip(tm_pts / 9.2 + rng.normal(0.0, 0.35, size=actual_n), 0.0, 8.0)
        elif mkt in ("1st Quarter Spread", "2nd Quarter Spread", "3rd Quarter Spread", "4th Quarter Spread", "1st Half Spread") and tm in (away_u, home_u):
            q_pair = {
                "1st Quarter Spread": (aw_1q, hm_1q),
                "2nd Quarter Spread": (aw_2q, hm_2q),
                "3rd Quarter Spread": (aw_3q, hm_3q),
                "4th Quarter Spread": (aw_4q, hm_4q),
                "1st Half Spread": (aw_1h, hm_1h),
            }[mkt]
            tm_p, opp_p = q_pair if tm == away_u else (q_pair[1], q_pair[0])
            vec = tm_p - opp_p
            line_f = -line_f
        elif mkt == "Will There Be Overtime?":
            vec = (np.abs(np.rint(vecs["away_score"]) - np.rint(vecs["home_score"])) < 0.5).astype(np.float64)
            line_f = 0.5
        elif ath in ath_vecs:
            dm = ath_vecs[ath]
            ml = mkt.lower()
            if "1st quarter" in ml:
                if "passing yards" in ml:
                    vec = dm.get("pass_yds_1q")
                elif "rushing yards" in ml:
                    vec = dm.get("rush_yds_1q")
                elif "receiving yards" in ml:
                    vec = dm.get("rec_yds_1q")
                elif "touchdown" in ml:
                    td_full = dm.get("td_count", dm.get("any_td"))
                    vec = (td_full * 0.23) if td_full is not None else None
            elif "1st half" in ml:
                if "passing yards" in ml:
                    vec = dm.get("pass_yds_1h")
                elif "rushing yards" in ml:
                    vec = dm.get("rush_yds_1h")
                elif "receiving yards" in ml:
                    vec = dm.get("rec_yds_1h")
                elif "touchdown" in ml:
                    td_full = dm.get("td_count", dm.get("any_td"))
                    vec = (td_full * 0.48) if td_full is not None else None
            elif "longest passing completion" in ml:
                vec = dm.get("longest_comp")
            elif "longest reception" in ml:
                vec = dm.get("longest_rec")
            elif "longest rush" in ml:
                vec = dm.get("longest_rush")
            elif "passing plus rushing" in ml or "passing + rushing" in ml:
                vec = dm.get("pass_plus_rush_yds")
            elif "rushing plus receiving" in ml or "rushing + receiving" in ml:
                vec = dm.get("rush_plus_rec_yds")
            elif "passing yards" in ml:
                vec = dm.get("pass_yds")
            elif "passing touchdown" in ml:
                vec = dm.get("pass_tds")
            elif "pass completions" in ml or "passing completions" in ml:
                vec = dm.get("pass_completions")
            elif "passing attempts" in ml:
                vec = dm.get("pass_attempts")
            elif "interceptions" in ml:
                vec = dm.get("interceptions")
            elif "rushing yards" in ml:
                vec = dm.get("rush_yds")
            elif "carries" in ml or "rushing attempts" in ml:
                vec = dm.get("carries")
            elif "receiving yards" in ml:
                vec = dm.get("rec_yds")
            elif "receptions" in ml and "1st " not in ml:
                vec = dm.get("receptions")
                st_type = "receptions" if (vec is not None and float(np.std(vec)) >= 1.15) else "generic"
            elif "field goals" in ml:
                vec = dm.get("fg_made")
            elif "extra points" in ml:
                vec = dm.get("pat_made")
            elif "kicking points" in ml:
                vec = dm.get("kicking_points")
            elif "tackles plus assists" in ml or "tackles + assists" in ml:
                vec = dm.get("tackles_plus_assists")
                st_type = "tackles_plus_assists"
            elif "assists" in ml:
                vec = dm.get("assist_tackles")
                st_type = "assist_tackles"
            elif "tackles" in ml:
                vec = dm.get("solo_tackles")
                st_type = "solo_tackles"
            elif "sacks" in ml:
                vec = dm.get("sacks")
            elif "score 2" in ml:
                vec = dm.get("td_count", dm.get("any_td"))
                line_f = 1.5
            elif "score 3" in ml:
                vec = dm.get("td_count", dm.get("any_td"))
                line_f = 2.5
            elif "first" in ml and "touchdown" in ml:
                td_v = dm.get("td_count", dm.get("any_td"))
                if td_v is not None:
                    frac = 0.36 if "team" in ml else 0.18
                    vec = (td_v >= 1.0).astype(np.float64) * (rng.random(actual_n) < frac).astype(np.float64)
                    line_f = 0.5
            elif "touchdown scorer" in ml:
                td_v = dm.get("td_count", dm.get("any_td"))
                if td_v is not None:
                    scale_p = 0.23 if "1st quarter" in ml else (0.48 if "1st half" in ml else (0.18 if "last" in ml else 1.0))
                    vec = ((td_v >= 1.0).astype(np.float64) * (rng.random(actual_n) < scale_p).astype(np.float64)) if scale_p < 1.0 else (td_v >= 1.0).astype(np.float64)
                    line_f = 0.5

        if vec is None:
            continue
        ev = _eval_vec_against_line(
            np.asarray(vec, dtype=np.float64),
            line_f,
            actual_n,
            stat_type=st_type,
            over_odds=it.get("over_odds"),
            under_odds=it.get("under_odds"),
        )
        market_summary.setdefault(mkt, {"count": 0})["count"] += 1
        evaluated_items.append({
            "market": mkt,
            "scope": "TEAM_GAME" if ath in ("Game", "Team", "") else "ATHLETE",
            "athlete": "" if ath in ("Game", "Team") else ath,
            "team": tm,
            "line": it.get("line"),
            "open_line": it.get("open_line"),
            "over_odds": it.get("over_odds"),
            "under_odds": it.get("under_odds"),
            **ev,
        })

    assert_zero_roster_contamination(evaluated_items, s0, "full_360_markets_eval")
    max_p = max((float(x["win_prob_on_lean"]) for x in evaluated_items), default=0.0)
    if max_p > 0.780 + 1e-6:
        raise RuntimeError(f"Probability cap violated: max_p={max_p}")

    cleared = [x for x in evaluated_items if x["publishAllowed"]]
    out_eval = {
        "schema": "gse_slate_360_full_markets_eval_v2",
        "matchup": f"{away_u} @ {home_u}",
        "away": away_u,
        "home": home_u,
        "week": week,
        "season": 2026,
        "total_board_items": len(props),
        "total_board_market_types": int(board.get("market_type_count", 77)),
        "evaluated_market_types_count": len(market_summary),
        "evaluated_unique_items_count": len(evaluated_items),
        "cleared_edges_count": len(cleared),
        "edge1b_count": sum(1 for x in cleared if x["decision"] == "EDGE#1b"),
        "edge2_count": sum(1 for x in cleared if x["decision"] == "EDGE#2"),
        "market_volatility": mkt_vol,
        "market_type_counts": dict(sorted(market_summary.items(), key=lambda kv: -kv[1]["count"])),
        "max_prop_win_prob": round(max_p, 4),
        "quarter_scoring_means": {
            away_u: [round(float(np.mean(aw_q_pts[:, i])), 2) for i in range(4)],
            home_u: [round(float(np.mean(hm_q_pts[:, i])), 2) for i in range(4)],
            "1Q_total_mean": round(float(np.mean(aw_1q + hm_1q)), 2),
            "1H_total_mean": round(float(np.mean(aw_1h + hm_1h)), 2),
            "OT_prob": round(float(np.mean(np.abs(np.rint(vecs["away_score"]) - np.rint(vecs["home_score"])) < 0.5)), 4),
        },
        "game_line_evaluations": s5["game_line_evaluations"],
        "items": evaluated_items,
    }
    target_out = out_path or (REPO_ROOT / "data" / "engine" / f"slate_{aw_l}_{hm_l}_week{week}_360_full_markets_eval.json")
    target_out.parent.mkdir(parents=True, exist_ok=True)
    target_out.write_text(json.dumps(out_eval, indent=2) + "\n", encoding="utf-8")

    if master_out_path is not None:
        master_out = {
            **dossier,
            "companion_77_market_360_eval_path": str(target_out.relative_to(REPO_ROOT)).replace("\\", "/") if target_out.is_relative_to(REPO_ROOT) else str(target_out),
            "companion_77_market_360_summary": {
                "evaluated_market_types_count": len(market_summary),
                "evaluated_unique_items_count": len(evaluated_items),
                "cleared_edges_count": len(cleared),
                "market_volatility": mkt_vol,
                "quarter_scoring_means": out_eval["quarter_scoring_means"],
                "max_prop_win_prob": out_eval["max_prop_win_prob"],
            },
        }
        master_out_path.write_text(json.dumps(master_out, indent=2) + "\n", encoding="utf-8")

    print(
        f"[360 SLATE EVAL COMPLETE] {away_u}@{home_u} W{week} | markets={len(market_summary)}/{board.get('market_type_count', 77)} | "
        f"items={len(evaluated_items)} | cleared={len(cleared)} | max_p={max_p:.4f} -> {target_out}"
    )
    return out_eval


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Evaluate 360 full markets across any NFL slate matchup")
    parser.add_argument("--away", required=True)
    parser.add_argument("--home", required=True)
    parser.add_argument("--week", type=int, required=True)
    parser.add_argument("--board", default=None)
    parser.add_argument("--dossier", default=None)
    parser.add_argument("--spine", default=None)
    parser.add_argument("--out", default=None)
    parser.add_argument("--n-sims", type=int, default=10000)
    parser.add_argument("--seed", type=int, default=20261119)
    args = parser.parse_args(argv)
    evaluate_slate_360_markets(
        away=args.away,
        home=args.home,
        week=args.week,
        board_path=Path(args.board) if args.board else None,
        dossier_path=Path(args.dossier) if args.dossier else None,
        spine_path=Path(args.spine) if args.spine else None,
        out_path=Path(args.out) if args.out else None,
        n_sims=args.n_sims,
        seed=args.seed,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
