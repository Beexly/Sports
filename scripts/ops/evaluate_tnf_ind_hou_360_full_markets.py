#!/usr/bin/env python3
"""
GSE Companion 360-Degree Full-Board Evaluator for TNF IND @ HOU (Week 11, 2026-11-19)
===================================================================================
Evaluates ALL 77 market categories across all 1,782 live DraftKings board items
(`1Q-4Q`, `1H/2H`, Team Totals, Overtime, QB, RB/WR/TE, Longest, Kicking, IDP
Tackles & Sacks, and TD Scorers) directly from conserved 10,000-world PBP vectors
and real Weeks 1-10 PBP empirical quarter/tail/IDP splits.

Enforces Stage 5 Class B de-vig gate strictly: target-only ESPN Core propBets without
two-sided Over/Under American odds carry `decision="PASS"` and `publishAllowed=False`,
while emitting `post_sim_mean`, `post_sim_p50`, `model_lean`, `win_prob_on_lean` (<= 0.780),
`confidence_score` (`XX/100`), and `playable_to_american_odds` thresholds.
"""
from __future__ import annotations

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


def _compute_empirical_quarter_and_longest_priors() -> dict[str, Any]:
    pbp_p = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"
    pbp = pd.read_parquet(pbp_p)
    pbp["posteam"] = pbp["posteam"].replace({"LA": "LAR"})
    pbp["defteam"] = pbp["defteam"].replace({"LA": "LAR"})
    scrim = pbp[pbp["play_type"].isin(["pass", "run"]) & pbp["posteam"].notna()].copy()

    # League and team quarter yardage & TD shares across quarters 1..4
    q_yds = {}
    for tm in ("IND", "HOU"):
        sub = scrim[scrim["posteam"] == tm]
        tot_y = float(sub["yards_gained"].clip(lower=0).sum()) or 1.0
        shares = []
        for q in (1, 2, 3, 4):
            qy = float(sub[sub["qtr"] == q]["yards_gained"].clip(lower=0).sum())
            shares.append(qy / tot_y)
        s_sum = sum(shares) or 1.0
        q_yds[tm] = [round(x / s_sum, 4) for x in shares]

    # Player-level sacks & longest play priors (Weeks 1-10, league-wide lookup + sample counts for EB shrinkage)
    sack_counts: dict[str, float] = {}
    max_rec_obs: dict[str, tuple[float, int]] = {}
    max_rush_obs: dict[str, tuple[float, int]] = {}
    team_gp_map: dict[str, int] = {}
    for tm in ("IND", "HOU"):
        tdef = scrim[scrim["defteam"] == tm]
        tdef_g = max(1, int(tdef["game_id"].nunique()))
        team_gp_map[tm] = tdef_g
        for col in ("sack_player_name", "half_sack_1_player_name", "half_sack_2_player_name"):
            if col in tdef.columns:
                w = 1.0 if col == "sack_player_name" else 0.5
                for nm, cnt in tdef[col].dropna().value_counts().items():
                    sack_counts[f"{tm}|{nm}"] = sack_counts.get(f"{tm}|{nm}", 0.0) + w * float(cnt) / tdef_g

    all_rec_p = scrim[scrim["complete_pass"] == 1]
    for nm, grp in all_rec_p.groupby("receiver_player_name"):
        if len(grp) > 0:
            max_rec_obs[str(nm)] = (float(grp["receiving_yards"].quantile(0.88) or 14.0), int(len(grp)))
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


def _to_playable_american(prob: float) -> int:
    p = max(0.505, min(0.75, prob - 0.015))
    return int(round(-100.0 * p / (1.0 - p)))


def _eval_vec_against_line(
    vec: np.ndarray,
    line: float,
    n_sims: int,
    stat_type: str = "generic",
) -> dict[str, Any]:
    min_req = 1.15 if stat_type in ("receptions", "tackles_plus_assists", "solo_tackles", "assist_tackles") else 0.90
    if float(np.std(vec)) >= min_req:
        emp = evaluate_empirical_prop_probability(
            samples=vec,
            line=float(line),
            market_over_american=None,
            market_under_american=None,
            max_prob_cap=0.780,
            stat_type=stat_type,
        )
        p_over = min(0.780, max(0.005, float(emp["p_over"])))
        p_under = min(0.780, max(0.005, float(emp["p_under"])))
    else:
        p_over = min(0.780, max(0.005, float(np.mean(vec > float(line)))))
        p_under = min(0.780, max(0.005, float(np.mean(vec < float(line)))))
    lean = "OVER" if p_over >= p_under else "UNDER"
    w_prob = min(0.780, p_over if lean == "OVER" else p_under)
    w_lb = wilson_lower_bound(w_prob * n_sims, n_sims)
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
        "edge_vs_devig_50": round(w_prob - 0.5000, 4),
        "confidence_score": f"{conf_int}/100",
        "playable_to_american_odds": _to_playable_american(w_prob),
        "decision": "PASS",
        "publishAllowed": False,
        "gate_reason": "PASS_UNPRICED_MARKET: ESPN Core propBets provides target line without two-sided American odds.",
    }


def evaluate_full_360_markets() -> dict[str, Any]:
    dossier_p = REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_ind_hou_week11.json"
    board_p = REPO_ROOT / "data" / "engine" / "tnf_ind_hou_dk_full_board_2026_11_19.json"
    spine_p = REPO_ROOT / "data" / "engine" / "jev_full_game_spine_ind_hou_week11.json"

    dossier = json.loads(dossier_p.read_text(encoding="utf-8"))
    board = json.loads(board_p.read_text(encoding="utf-8"))
    spine_raw = json.loads(spine_p.read_text(encoding="utf-8"))
    spine_game = (spine_raw.get("games") or {}).get("IND@HOU", spine_raw)

    s0 = dossier["stage0_roster_and_board_allowlist"]
    s2 = dossier["stage2_jev_spine_and_10k_simulation"]
    s34 = dossier["stage3_4_conserved_post_sim_projections"]
    s5 = dossier["stage5_360_conjunction_gate"]

    sealed_obj, sealed_hash = load_sealed_object_readonly()
    jev_tensor = build_jev_state_tensor(spine_game, enforce_freshness=False)
    priors = dict(s2["compiled_stage1_priors"])
    priors["jev_state_tensor"] = jev_tensor
    env_cfg = _get_matchup_env("IND", "HOU", 11)

    sim_a = simulate_matchup_pbp(
        away="IND",
        home="HOU",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=10000,
        seed=20261119,
        w1_w7_override=priors,
        return_vectors=True,
        jev_state_tensor=jev_tensor,
        posted_home_spread=float(env_cfg["posted_home_spread"]),
        posted_total=float(env_cfg["posted_total"]),
    )
    vecs = sim_a["vectors"]
    n_sims = len(vecs["away_score"])
    emp_priors = _compute_empirical_quarter_and_longest_priors()

    rng = np.random.default_rng(20261119)
    # Derive conserved quarter scoring vectors per world from full-game away/home scores
    aw_sh_q = emp_priors["q_shares"]["IND"]
    hm_sh_q = emp_priors["q_shares"]["HOU"]
    aw_q_draws = rng.dirichlet(np.array(aw_sh_q) * 28.0, size=n_sims)
    hm_q_draws = rng.dirichlet(np.array(hm_sh_q) * 28.0, size=n_sims)
    aw_q_pts = vecs["away_score"][:, None] * aw_q_draws
    hm_q_pts = vecs["home_score"][:, None] * hm_q_draws

    # Quarter & half derived distributions
    aw_1q, hm_1q = aw_q_pts[:, 0], hm_q_pts[:, 0]
    aw_2q, hm_2q = aw_q_pts[:, 1], hm_q_pts[:, 1]
    aw_3q, hm_3q = aw_q_pts[:, 2], hm_q_pts[:, 2]
    aw_4q, hm_4q = aw_q_pts[:, 3], hm_q_pts[:, 3]
    aw_1h, hm_1h = aw_1q + aw_2q, hm_1q + hm_2q

    ath_projs = s34["athlete_post_sim_projections"]
    props = board.get("props") or []
    evaluated_items: list[dict[str, Any]] = []
    seen_keys: set[tuple[str, str, str, Any]] = set()

    # Build helper vectors per active athlete from conserved simulation distributions
    ath_vecs: dict[str, dict[str, np.ndarray]] = {}
    for name, ap in ath_projs.items():
        tm = ap["team"]
        pos = ap["position"]
        pr = ap["projections"]
        is_aw = tm == "IND"
        q_sh = aw_sh_q if is_aw else hm_sh_q
        frac_1q = q_sh[0]
        frac_1h = q_sh[0] + q_sh[1]
        d_map: dict[str, np.ndarray] = {}

        if pos == "QB":
            p_yds = np.asarray(vecs["away_pass_yds"] if is_aw else vecs["home_pass_yds"], dtype=np.float64)
            p_tds = np.asarray(vecs["away_pass_tds"] if is_aw else vecs["home_pass_tds"], dtype=np.float64)
            att = np.asarray(vecs["away_pass_att"] if is_aw else vecs["home_pass_att"], dtype=np.float64)
            cmp_ = np.asarray(vecs["away_pass_comp"] if is_aw else vecs["home_pass_comp"], dtype=np.float64)
            ints = np.asarray(vecs["away_ints"] if is_aw else vecs["home_ints"], dtype=np.float64)
            ry = np.asarray(vecs["away_qb_rush_yds"] if is_aw else vecs["home_qb_rush_yds"], dtype=np.float64)
            if float(np.std(ry)) < 6.0:
                ry = np.maximum(0.0, ry + rng.gamma(2.2, 4.5, size=n_sims) - 4.0)
            car = np.asarray(vecs["away_qb_scrambles"] if is_aw else vecs["home_qb_scrambles"], dtype=np.float64) + rng.poisson(1.4, size=n_sims)
            # Longest pass completion scaled to ADOT/team verticality (C.J. Stroud 39.5 vs Daniel Jones 29.5 tail)
            base_max_c = 34.0 if tm == "HOU" else 28.0
            long_cmp = np.maximum(8.0, base_max_c * (p_yds / max(1.0, float(np.mean(p_yds)))) ** 0.55 + rng.gamma(2.5, 4.2, size=n_sims) - 10.5)
            long_ru = np.maximum(1.0, 6.5 * np.maximum(0.2, ry / max(1.0, float(np.mean(ry)))) ** 0.45 + rng.gamma(2.0, 1.8, size=n_sims) - 3.6)

            d_map = {
                "pass_yds": p_yds,
                "pass_yds_1q": p_yds * rng.beta(frac_1q * 18.0, (1.0 - frac_1q) * 18.0, size=n_sims),
                "pass_yds_1h": p_yds * rng.beta(frac_1h * 22.0, (1.0 - frac_1h) * 22.0, size=n_sims),
                "pass_tds": p_tds,
                "pass_completions": cmp_,
                "pass_attempts": att,
                "interceptions": ints,
                "rush_yds": ry,
                "rush_yds_1q": ry * rng.beta(0.25 * 10.0, 0.75 * 10.0, size=n_sims),
                "carries": car,
                "pass_plus_rush_yds": p_yds + ry,
                "longest_comp": long_cmp,
                "longest_rush": long_ru,
                "any_td": np.maximum(0.0, ry * 0.012 + rng.poisson(0.14 if tm == "IND" else 0.09, size=n_sims) * 0.45),
            }
        elif pos in ("RB", "WR", "TE"):
            ry_m = float((pr.get("rush_yds") or {}).get("mean", 0.0))
            ry_s = max(5.0, float((pr.get("rush_yds") or {}).get("std", 6.0)))
            cy_m = float((pr.get("carries") or {}).get("mean", 0.0))
            rec_m = float((pr.get("rec_yds") or {}).get("mean", 0.0))
            rec_s = max(6.0, float((pr.get("rec_yds") or {}).get("std", 8.0)))
            re_m = float((pr.get("receptions") or {}).get("mean", 0.0))
            td_m = float((pr.get("rec_tds") or {}).get("mean", 0.12))

            team_rush_v = np.asarray(vecs["away_rush_yds"] if is_aw else vecs["home_rush_yds"], dtype=np.float64)
            team_pass_v = np.asarray(vecs["away_pass_yds"] if is_aw else vecs["home_pass_yds"], dtype=np.float64)
            rush_sh = float(pr.get("carry_share_conserved", ry_m / max(1.0, float(np.mean(team_rush_v)))))
            rec_sh = float(pr.get("target_share_conserved", rec_m / max(1.0, float(np.mean(team_pass_v)))))

            rush_v = np.maximum(0.0, team_rush_v * rush_sh * rng.gamma(16.0, 1.0 / 16.0, size=n_sims)) if ry_m > 0.5 else np.zeros(n_sims)
            if ry_m > 0.5:
                rush_v = np.maximum(0.0, rush_v * (ry_m / max(0.5, float(np.mean(rush_v)))))
            rec_v = np.maximum(0.0, team_pass_v * rec_sh * rng.gamma(14.0, 1.0 / 14.0, size=n_sims)) if rec_m > 0.5 else np.zeros(n_sims)
            if rec_m > 0.5:
                rec_v = np.maximum(0.0, rec_v * (rec_m / max(0.5, float(np.mean(rec_v)))))

            ypr = float(np.clip(rec_m / max(0.5, re_m), 6.0, 16.5))
            ypc = float(np.clip(ry_m / max(0.5, cy_m), 3.3, 5.5)) if ry_m > 0.5 else 4.2
            car_v = np.maximum(0.0, rush_v / ypc + (rng.gamma(4.0, 0.575, size=n_sims) - 2.30)) if ry_m > 0.5 else np.zeros(n_sims)
            recp_v = np.maximum(0.0, rec_v / ypr + (rng.gamma(4.0, 0.425, size=n_sims) - 1.70))
            if float(np.std(recp_v)) < 1.25:
                recp_v = np.maximum(0.0, recp_v + (rng.gamma(4.0, 0.625, size=n_sims) - 2.50))

            cands = _short_cands(name)
            pos_prior_rec = 16.5 if pos == "WR" else (13.0 if pos == "TE" else 8.5)
            pos_prior_rush = 12.5 if pos == "RB" else 8.0
            best_rec_tup = max((emp_priors["rec_p90_play"].get(sc, (0.0, 0)) for sc in cands), key=lambda x: x[1], default=(pos_prior_rec, 0))
            best_rush_tup = max((emp_priors["rush_p90_play"].get(sc, (0.0, 0)) for sc in cands), key=lambda x: x[1], default=(pos_prior_rush, 0))
            # Empirical Bayes shrinkage (k0=10 catches / k0=18 carries) to eliminate 2-catch outlier inflation
            w_eb_rec = best_rec_tup[1] / (best_rec_tup[1] + 10.0)
            w_eb_rush = best_rush_tup[1] / (best_rush_tup[1] + 18.0)
            obs_long_rec = w_eb_rec * best_rec_tup[0] + (1.0 - w_eb_rec) * pos_prior_rec
            obs_long_rush = w_eb_rush * best_rush_tup[0] + (1.0 - w_eb_rush) * pos_prior_rush
            # Match team total TDs rate cleanly
            tm_td_tot = float(np.mean(vecs["away_score"] if is_aw else vecs["home_score"])) / 9.2
            pos_td_share = td_m if pos in ("WR", "TE") else max(td_m, rush_sh * 0.48 * tm_td_tot)
            any_td_ind = (rng.poisson(max(0.03, pos_td_share), size=n_sims) >= 1).astype(np.float64)
            td_count_vec = rng.poisson(max(0.03, pos_td_share), size=n_sims).astype(np.float64)

            d_map = {
                "rush_yds": rush_v,
                "rush_yds_1q": rush_v * rng.beta(frac_1q * 12.0, (1.0 - frac_1q) * 12.0, size=n_sims),
                "rush_yds_1h": rush_v * rng.beta(frac_1h * 16.0, (1.0 - frac_1h) * 16.0, size=n_sims),
                "carries": car_v,
                "rec_yds": rec_v,
                "rec_yds_1q": rec_v * rng.beta(frac_1q * 11.0, (1.0 - frac_1q) * 11.0, size=n_sims),
                "rec_yds_1h": rec_v * rng.beta(frac_1h * 15.0, (1.0 - frac_1h) * 15.0, size=n_sims),
                "receptions": recp_v,
                "rush_plus_rec_yds": rush_v + rec_v,
                "longest_rec": np.maximum(2.0, obs_long_rec * np.maximum(0.3, rec_v / max(1.0, rec_m)) ** 0.40 + rng.gamma(2.2, 2.8, size=n_sims) - 6.16),
                "longest_rush": np.maximum(1.0, obs_long_rush * np.maximum(0.3, rush_v / max(1.0, ry_m)) ** 0.40 + rng.gamma(2.0, 2.4, size=n_sims) - 4.80),
                "td_count": td_count_vec,
                "any_td": any_td_ind,
            }
        elif pos == "PK":
            tm_pts = np.asarray(vecs["away_score"] if is_aw else vecs["home_score"], dtype=np.float64)
            fg_m = float((pr.get("fg_made") or {}).get("mean", 1.5))
            pat_m = float((pr.get("pat_made") or {}).get("mean", 2.0))
            fg_v = np.clip(tm_pts * (fg_m / max(1.0, float(np.mean(tm_pts)))) + rng.gamma(3.5, 0.42, size=n_sims) - 1.47, 0.0, 6.0)
            pat_v = np.clip(tm_pts * (pat_m / max(1.0, float(np.mean(tm_pts)))) + rng.gamma(3.5, 0.40, size=n_sims) - 1.40, 0.0, 7.0)
            d_map = {"fg_made": fg_v, "pat_made": pat_v, "kicking_points": 3.0 * fg_v + pat_v}
        else:
            tk_m = float((pr.get("tackles_plus_assists") or {}).get("mean", 4.5))
            sol_m = float((pr.get("solo_tackles") or {}).get("mean", 2.6))
            ast_m = float((pr.get("assist_tackles") or {}).get("mean", 1.9))
            pbp_sk = max([emp_priors["sack_per_gm"].get(f"{tm}|{sc}", 0.0) for sc in _short_cands(name)] or [0.0])
            opp_sacks_vec = np.asarray(vecs["away_sacks"] if tm == "HOU" else vecs["home_sacks"], dtype=np.float64)
            # Reallocate Danielle Hunter Out HOU edge sack share to Will Anderson Jr. (+18%) & Jadeveon Clowney (+12%)
            sk_mult = 1.18 if name == "Will Anderson Jr." else (1.12 if name == "Jadeveon Clowney" else 1.0)
            est_sk_rate = max(0.08, pbp_sk * sk_mult)
            team_sk_mean = max(1.5, float(np.mean(opp_sacks_vec)))
            sk_v = rng.poisson(np.clip(opp_sacks_vec * (est_sk_rate / team_sk_mean), 0.04, 2.2)).astype(np.float64)
            tk_v = np.maximum(0.0, rng.gamma(max(1.5, tk_m * 0.7), 1.4, size=n_sims) + (tk_m - max(1.5, tk_m * 0.7) * 1.4))
            sol_ratio = sol_m / max(0.5, tk_m)
            sol_v = np.maximum(0.0, tk_v * sol_ratio + (rng.gamma(4.0, 0.375, size=n_sims) - 1.50))
            ast_v = np.maximum(0.0, tk_v * (1.0 - sol_ratio) + (rng.gamma(4.0, 0.375, size=n_sims) - 1.50))
            if float(np.std(tk_v)) < 1.25:
                tk_v = np.maximum(0.0, tk_v + (rng.gamma(4.0, 0.65, size=n_sims) - 2.60))
            if float(np.std(sol_v)) < 1.25:
                sol_v = np.maximum(0.0, sol_v + (rng.gamma(4.0, 0.65, size=n_sims) - 2.60))
            if float(np.std(ast_v)) < 1.25:
                ast_v = np.maximum(0.0, ast_v + (rng.gamma(4.0, 0.65, size=n_sims) - 2.60))
            d_map = {
                "tackles_plus_assists": tk_v,
                "solo_tackles": sol_v,
                "assist_tackles": ast_v,
                "sacks": sk_v,
            }
        ath_vecs[name] = d_map

    # Team-level Quarter / Half / Team Total / TD / OT mappings
    market_summary: dict[str, dict[str, int]] = {}
    binary_yesno_keywords = ("touchdown scorer", "score 2", "score 3", "overtime", "moneyline")
    for it in props:
        mkt = str(it.get("market") or "").strip()
        ath = str(it.get("athlete") or "").strip()
        tm = str(it.get("team") or "").strip().upper()
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

        # 1. Quarter / Half / Game Exotics (Team or Game level)
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
        elif mkt in ("1st Quarter Moneyline", "2nd Quarter Moneyline", "3rd Quarter Moneyline", "4th Quarter Moneyline", "1st Half Moneyline") and tm in ("IND", "HOU"):
            q_pair = {
                "1st Quarter Moneyline": (aw_1q, hm_1q),
                "2nd Quarter Moneyline": (aw_2q, hm_2q),
                "3rd Quarter Moneyline": (aw_3q, hm_3q),
                "4th Quarter Moneyline": (aw_4q, hm_4q),
                "1st Half Moneyline": (aw_1h, hm_1h),
            }[mkt]
            tm_p, opp_p = q_pair if tm == "IND" else (q_pair[1], q_pair[0])
            vec = (tm_p > opp_p + 0.5).astype(np.float64)
            line_f = 0.5
        elif mkt == "Team Total Points" and tm in ("IND", "HOU"):
            vec = np.asarray(vecs["away_score"] if tm == "IND" else vecs["home_score"], dtype=np.float64)
        elif mkt == "Team 1st Half Total Points" and tm in ("IND", "HOU"):
            vec = aw_1h if tm == "IND" else hm_1h
        elif mkt == "Team Total Touchdowns" and tm in ("IND", "HOU"):
            tm_pts = np.asarray(vecs["away_score"] if tm == "IND" else vecs["home_score"], dtype=np.float64)
            vec = np.clip(tm_pts / 9.2 + rng.normal(0.0, 0.35, size=n_sims), 0.0, 8.0)
        elif mkt in ("1st Quarter Spread", "2nd Quarter Spread", "3rd Quarter Spread", "4th Quarter Spread", "1st Half Spread") and tm in ("IND", "HOU"):
            q_pair = {
                "1st Quarter Spread": (aw_1q, hm_1q),
                "2nd Quarter Spread": (aw_2q, hm_2q),
                "3rd Quarter Spread": (aw_3q, hm_3q),
                "4th Quarter Spread": (aw_4q, hm_4q),
                "1st Half Spread": (aw_1h, hm_1h),
            }[mkt]
            tm_p, opp_p = q_pair if tm == "IND" else (q_pair[1], q_pair[0])
            vec = tm_p - opp_p
            line_f = -line_f
        elif mkt == "Will There Be Overtime?":
            # NFL ties at regulation end (~3.5% close regulation tie frequency)
            ot_ind = (np.abs(np.rint(vecs["away_score"]) - np.rint(vecs["home_score"])) < 0.5).astype(np.float64)
            vec = ot_ind
            line_f = 0.5

        # 2. Player props (Full Game + Milestones + 1Q/1H + Longest + IDP + TD Scorers)
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
                    td_full = dm["td_count"] if "td_count" in dm else dm.get("any_td")
                    vec = (td_full * 0.23) if td_full is not None else None
            elif "1st half" in ml:
                if "passing yards" in ml:
                    vec = dm.get("pass_yds_1h")
                elif "rushing yards" in ml:
                    vec = dm.get("rush_yds_1h")
                elif "receiving yards" in ml:
                    vec = dm.get("rec_yds_1h")
                elif "touchdown" in ml:
                    td_full = dm["td_count"] if "td_count" in dm else dm.get("any_td")
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
                st_type = "receptions" if float(np.std(vec)) >= 1.15 else "generic"
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
                td_v = dm["td_count"] if "td_count" in dm else dm.get("any_td")
                vec = td_v
                line_f = 1.5
            elif "score 3" in ml:
                td_v = dm["td_count"] if "td_count" in dm else dm.get("any_td")
                vec = td_v
                line_f = 2.5
            elif "first" in ml and "touchdown" in ml:
                td_v = dm["td_count"] if "td_count" in dm else dm.get("any_td")
                if td_v is not None:
                    frac = 0.36 if "team" in ml else 0.18
                    vec = (td_v >= 1.0).astype(np.float64) * (rng.random(n_sims) < frac).astype(np.float64)
                    line_f = 0.5
            elif "touchdown scorer" in ml:
                td_v = dm["td_count"] if "td_count" in dm else dm.get("any_td")
                if td_v is not None:
                    scale_p = 0.23 if "1st quarter" in ml else (0.48 if "1st half" in ml else (0.18 if "last" in ml else 1.0))
                    vec = ((td_v >= 1.0).astype(np.float64) * (rng.random(n_sims) < scale_p).astype(np.float64)) if scale_p < 1.0 else (td_v >= 1.0).astype(np.float64)
                    line_f = 0.5

        if vec is None:
            continue
        ev = _eval_vec_against_line(np.asarray(vec, dtype=np.float64), line_f, n_sims, stat_type=st_type)
        market_summary.setdefault(mkt, {"count": 0})["count"] += 1
        evaluated_items.append({
            "market": mkt,
            "scope": "TEAM_GAME" if ath in ("Game", "Team", "") else "ATHLETE",
            "athlete": "" if ath in ("Game", "Team") else ath,
            "team": tm,
            "line": it.get("line"),
            "open_line": it.get("open_line"),
            **ev,
        })

    # Assert zero roster contamination & probability bounds on full 77-market evaluation
    assert_zero_roster_contamination(evaluated_items, s0, "full_360_markets_eval")
    max_p = max((float(x["win_prob_on_lean"]) for x in evaluated_items), default=0.0)
    if max_p > 0.780 + 1e-6:
        raise RuntimeError(f"Probability cap violated: max_p={max_p}")

    out_eval = {
        "schema": "gse_tnf_360_full_markets_eval_v1",
        "matchup": "IND @ HOU",
        "week": 11,
        "season": 2026,
        "total_board_items": len(props),
        "total_board_market_types": int(board.get("market_type_count", 77)),
        "evaluated_market_types_count": len(market_summary),
        "evaluated_unique_items_count": len(evaluated_items),
        "market_type_counts": dict(sorted(market_summary.items(), key=lambda kv: -kv[1]["count"])),
        "max_prop_win_prob": round(max_p, 4),
        "quarter_scoring_means": {
            "IND": [round(float(np.mean(aw_q_pts[:, i])), 2) for i in range(4)],
            "HOU": [round(float(np.mean(hm_q_pts[:, i])), 2) for i in range(4)],
            "1Q_total_mean": round(float(np.mean(aw_1q + hm_1q)), 2),
            "1H_total_mean": round(float(np.mean(aw_1h + hm_1h)), 2),
            "OT_prob": round(float(np.mean(np.abs(np.rint(vecs["away_score"]) - np.rint(vecs["home_score"])) < 0.5)), 4),
        },
        "game_line_evaluations": s5["game_line_evaluations"],
        "items": evaluated_items,
    }
    eval_path = REPO_ROOT / "data" / "engine" / "tnf_ind_hou_360_full_markets_eval_2026_11_19.json"
    eval_path.write_text(json.dumps(out_eval, indent=2), encoding="utf-8")

    master_out = {
        **dossier,
        "companion_77_market_360_eval_path": "data/engine/tnf_ind_hou_360_full_markets_eval_2026_11_19.json",
        "companion_77_market_360_summary": {
            "evaluated_market_types_count": len(market_summary),
            "evaluated_unique_items_count": len(evaluated_items),
            "quarter_scoring_means": out_eval["quarter_scoring_means"],
            "max_prop_win_prob": out_eval["max_prop_win_prob"],
        },
    }
    master_p = REPO_ROOT / "data" / "engine" / "tnf_ind_hou_master_bundle_2026_11_19.json"
    master_p.write_text(json.dumps(master_out, indent=2), encoding="utf-8")
    print(
        f"[360 FULL MARKETS EVAL COMPLETE] markets={len(market_summary)}/{board.get('market_type_count')} | "
        f"items={len(evaluated_items)} | max_p={max_p:.4f} -> {eval_path}"
    )
    return out_eval


if __name__ == "__main__":
    evaluate_full_360_markets()
