#!/usr/bin/env python3
"""
scripts/ops/solve_showdown_dfs_milp.py

Real 0-1 Mixed-Integer Linear Programming (MILP) Optimizer (`scipy.optimize.milp`) for:
  1. DraftKings Showdown Captain-Mode (`1 CPT @ 1.5x salary & 1.5x points + 5 FLEX <= $50,000`,
     at least 1 player from each team, mutual exclusion `x_cpt[i] + x_flex[i] <= 1`)
  2. DraftKings Classic (`9 roster slots: 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST <= $50,000`)

Supports two objective modes (`SG-6` & `SG-8`):
  - `mode="cash"`: maximizes `0.60 * median_fpts + 0.40 * p25_floor_fpts`, strictly excluding
    any player flagged with `is_decoy_trap=True` (`block_cash_dfs=True`) or `is_out=True`.
  - `mode="gpp"`: maximizes `0.55 * p90_ceiling_fpts + 0.45 * leverage_adjusted_fpts - ownership_penalty`.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp

_OPS_DIR = str(Path(__file__).resolve().parent)
if _OPS_DIR not in sys.path:
    sys.path.insert(0, _OPS_DIR)

from week8_forensic_kernels import detect_injury_decoy_or_pitch_count_trap  # noqa: E402


def _enrich_player_decoy_and_objectives(player: Mapping[str, Any]) -> dict[str, Any]:
    p = dict(player)
    name = str(p.get("name") or p.get("player") or p.get("player_name") or "Unknown")
    team = str(p.get("team") or "UNK").upper()
    pos = str(p.get("pos") or p.get("position") or "FLEX").upper()
    flex_salary = int(round(float(p.get("salary", p.get("flex_salary", 5000)))))
    cpt_salary = int(round(float(p.get("cpt_salary", round(1.5 * flex_salary)))))

    median_fpts = float(p.get("median_fpts", p.get("p50", p.get("proj_pts", 10.0))))
    p25_floor_fpts = float(p.get("p25_floor_fpts", p.get("p25", 0.68 * median_fpts)))
    p90_ceiling_fpts = float(p.get("p90_ceiling_fpts", p.get("p90", p.get("q85", 1.45 * median_fpts))))
    ownership = float(p.get("ownership", 0.16))
    leverage_bonus = max(0.0, 0.28 - ownership) * 0.65
    leverage_adjusted_fpts = float(
        p.get("leverage_adjusted_fpts", p90_ceiling_fpts * (1.0 + leverage_bonus))
    )

    is_decoy = bool(p.get("is_decoy_trap", False) or p.get("block_cash_dfs", False))
    if not is_decoy and p.get("injury_designation") and p.get("market_line") is not None and p.get("healthy_prior_mean"):
        trap_check = detect_injury_decoy_or_pitch_count_trap(
            player_name=name,
            injury_designation=str(p["injury_designation"]),
            market_line=float(p["market_line"]),
            healthy_prior_mean=float(p["healthy_prior_mean"]),
        )
        is_decoy = bool(trap_check["is_decoy_trap"])

    ownership_penalty = float(
        p.get(
            "ownership_penalty",
            (6.5 * ownership + 4.0) if is_decoy else (2.2 * ownership),
        )
    )
    cash_score = 0.60 * median_fpts + 0.40 * p25_floor_fpts
    gpp_score = 0.55 * p90_ceiling_fpts + 0.45 * leverage_adjusted_fpts - ownership_penalty

    return {
        **p,
        "name": name,
        "player": name,
        "team": team,
        "pos": pos,
        "salary": flex_salary,
        "flex_salary": flex_salary,
        "cpt_salary": cpt_salary,
        "median_fpts": round(median_fpts, 3),
        "p25_floor_fpts": round(p25_floor_fpts, 3),
        "p90_ceiling_fpts": round(p90_ceiling_fpts, 3),
        "leverage_adjusted_fpts": round(leverage_adjusted_fpts, 3),
        "ownership": round(ownership, 4),
        "ownership_penalty": round(ownership_penalty, 3),
        "is_decoy_trap": is_decoy,
        "block_cash_dfs": is_decoy,
        "is_out": bool(p.get("is_out", False)),
        "cash_objective": round(cash_score, 4),
        "gpp_objective": round(gpp_score, 4),
    }


def solve_dk_showdown_milp(
    players: Sequence[Mapping[str, Any]],
    mode: str = "cash",
    salary_cap: int = 50000,
    min_salary: int = 42000,
) -> dict[str, Any]:
    """Solve DraftKings 6-man Showdown (1 CPT + 5 FLEX <= $50,000) via scipy.optimize.milp."""
    mode_norm = mode.strip().lower()
    if mode_norm not in {"cash", "gpp"}:
        raise ValueError(f"Unsupported Showdown MILP mode: {mode} (expected 'cash' or 'gpp')")

    enriched = [_enrich_player_decoy_and_objectives(p) for p in players]
    n = len(enriched)
    if n < 6:
        raise ValueError(f"Need at least 6 candidate players for Showdown MILP, got {n}")

    # Decision variables: [x_cpt_0 .. x_cpt_{n-1}, x_flex_0 .. x_flex_{n-1}]
    u_flex = np.array(
        [p["cash_objective"] if mode_norm == "cash" else p["gpp_objective"] for p in enriched],
        dtype=np.float64,
    )
    u_cpt = 1.5 * u_flex
    c = -np.concatenate([u_cpt, u_flex])
    integrality = np.ones(2 * n, dtype=np.float64)

    lb_vars = np.zeros(2 * n, dtype=np.float64)
    ub_vars = np.ones(2 * n, dtype=np.float64)
    excluded_decoys: list[str] = []

    for i, p in enumerate(enriched):
        if p["is_out"]:
            ub_vars[i] = 0.0
            ub_vars[n + i] = 0.0
        elif p["is_decoy_trap"]:
            excluded_decoys.append(p["name"])
            if mode_norm == "cash":
                # Strict Cash exclusion for injury decoys / pitch-count traps (SG-6, SG-8)
                ub_vars[i] = 0.0
                ub_vars[n + i] = 0.0
            else:
                # Never Captain a pitch-count decoy in GPP
                ub_vars[i] = 0.0

    rows: list[np.ndarray] = []
    lhs: list[float] = []
    rhs: list[float] = []

    # 1. Exactly 1 Captain
    r_cpt = np.zeros(2 * n, dtype=np.float64)
    r_cpt[:n] = 1.0
    rows.append(r_cpt)
    lhs.append(1.0)
    rhs.append(1.0)

    # 2. Exactly 5 FLEX
    r_flex = np.zeros(2 * n, dtype=np.float64)
    r_flex[n:] = 1.0
    rows.append(r_flex)
    lhs.append(5.0)
    rhs.append(5.0)

    # 3. Mutual exclusion: x_cpt[i] + x_flex[i] <= 1 for each player i
    for i in range(n):
        r_me = np.zeros(2 * n, dtype=np.float64)
        r_me[i] = 1.0
        r_me[n + i] = 1.0
        rows.append(r_me)
        lhs.append(0.0)
        rhs.append(1.0)

    # 4. Salary constraint: min_salary <= sum(cpt_sal * x_cpt + flex_sal * x_flex) <= salary_cap
    r_sal = np.zeros(2 * n, dtype=np.float64)
    for i, p in enumerate(enriched):
        r_sal[i] = float(p["cpt_salary"])
        r_sal[n + i] = float(p["flex_salary"])
    rows.append(r_sal)
    lhs.append(float(min_salary))
    rhs.append(float(salary_cap))

    # 5. At least 1 player from each team (and at most 5 from any single team)
    teams = sorted({p["team"] for p in enriched if not p["is_out"]})
    if len(teams) >= 2:
        for tm in teams:
            r_tm = np.zeros(2 * n, dtype=np.float64)
            for i, p in enumerate(enriched):
                if p["team"] == tm:
                    r_tm[i] = 1.0
                    r_tm[n + i] = 1.0
            rows.append(r_tm)
            lhs.append(1.0)
            rhs.append(5.0)

    A = np.vstack(rows)
    constraints = LinearConstraint(A, lhs, rhs)
    bounds = Bounds(lb_vars, ub_vars)

    res = milp(c=c, integrality=integrality, bounds=bounds, constraints=constraints)
    if not res.success or res.x is None:
        raise RuntimeError(f"SHOWDOWN_MILP_INFEASIBLE (mode={mode_norm}): {res.message}")

    sol = np.round(res.x).astype(int)
    cpt_indices = [i for i in range(n) if sol[i] == 1]
    flex_indices = [i for i in range(n) if sol[n + i] == 1]

    if len(cpt_indices) != 1 or len(flex_indices) != 5:
        raise RuntimeError(f"SHOWDOWN_MILP_INVALID_CARDINALITY: cpt={len(cpt_indices)}, flex={len(flex_indices)}")

    roster: list[dict[str, Any]] = []
    c_idx = cpt_indices[0]
    cp = enriched[c_idx]
    roster.append({
        "slot": "CPT (1.5x)",
        "player": cp["name"],
        "name": cp["name"],
        "team": cp["team"],
        "pos": cp["pos"],
        "position": cp["pos"],
        "salary": cp["cpt_salary"],
        "base_flex_salary": cp["flex_salary"],
        "proj_pts": round(1.5 * cp["median_fpts"], 2),
        "effective_median_fpts": round(1.5 * cp["median_fpts"], 2),
        "p25_pts": round(1.5 * cp["p25_floor_fpts"], 2),
        "p90_pts": round(1.5 * cp["p90_ceiling_fpts"], 2),
        "effective_p90_fpts": round(1.5 * cp["p90_ceiling_fpts"], 2),
        "objective_contrib": round(float(u_cpt[c_idx]), 3),
        "is_decoy_trap": cp["is_decoy_trap"],
    })

    for f_idx in sorted(flex_indices, key=lambda idx: -enriched[idx]["flex_salary"]):
        fp = enriched[f_idx]
        roster.append({
            "slot": "FLEX",
            "player": fp["name"],
            "name": fp["name"],
            "team": fp["team"],
            "pos": fp["pos"],
            "position": fp["pos"],
            "salary": fp["flex_salary"],
            "base_flex_salary": fp["flex_salary"],
            "proj_pts": round(fp["median_fpts"], 2),
            "effective_median_fpts": round(fp["median_fpts"], 2),
            "p25_pts": round(fp["p25_floor_fpts"], 2),
            "p90_pts": round(fp["p90_ceiling_fpts"], 2),
            "effective_p90_fpts": round(fp["p90_ceiling_fpts"], 2),
            "objective_contrib": round(float(u_flex[f_idx]), 3),
            "is_decoy_trap": fp["is_decoy_trap"],
        })

    total_salary = sum(int(r["salary"]) for r in roster)
    total_proj_median = round(sum(float(r["proj_pts"]) for r in roster), 2)
    total_proj_p25 = round(sum(float(r["p25_pts"]) for r in roster), 2)
    total_proj_p90 = round(sum(float(r["p90_pts"]) for r in roster), 2)
    selected_names = [r["player"] for r in roster]

    return {
        "solver": "scipy.optimize.milp",
        "contest_type": "DK_SHOWDOWN",
        "mode": mode_norm,
        "status": "OPTIMAL",
        "lineup_type": (
            "DraftKings Showdown Captain-Mode Cash Optimal ($50,000 Cap, Decoy-Filtered MILP)"
            if mode_norm == "cash"
            else "DraftKings Showdown GPP Ceiling & Leverage Optimal ($50,000 Cap MILP)"
        ),
        "total_salary": total_salary,
        "salary_remaining": salary_cap - total_salary,
        "objective_value": round(float(-res.fun), 3),
        "projected_dk_points_mean": total_proj_median,
        "projected_median_fpts": total_proj_median,
        "projected_dk_points_p25_floor": total_proj_p25,
        "projected_dk_points_p75_ceiling": total_proj_p90,
        "projected_dk_points_p90_ceiling": total_proj_p90,
        "projected_p90_ceiling_fpts": total_proj_p90,
        "kissell_sharpe_ratio": round(total_proj_median / max(1.0, (total_proj_p90 - total_proj_p25) * 0.42), 2),
        "kissell_omega_ratio": round(total_proj_p90 / max(1.0, total_proj_p25), 2),
        "excluded_decoy_traps": excluded_decoys,
        "excluded_decoys": excluded_decoys,
        "selected_players": selected_names,
        "roster": roster,
    }


def solve_dk_classic_milp(
    players: Sequence[Mapping[str, Any]],
    mode: str = "cash",
    salary_cap: int = 50000,
    min_salary: int = 45000,
) -> dict[str, Any]:
    """Solve DraftKings 9-slot Classic roster (1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST <= $50,000) via MILP."""
    mode_norm = mode.strip().lower()
    if mode_norm not in {"cash", "gpp"}:
        raise ValueError(f"Unsupported Classic MILP mode: {mode}")

    enriched = [_enrich_player_decoy_and_objectives(p) for p in players]
    n = len(enriched)
    if n < 9:
        raise ValueError(f"Need at least 9 candidate players for Classic MILP, got {n}")

    u = np.array(
        [p["cash_objective"] if mode_norm == "cash" else p["gpp_objective"] for p in enriched],
        dtype=np.float64,
    )
    c = -u
    integrality = np.ones(n, dtype=np.float64)
    lb_vars = np.zeros(n, dtype=np.float64)
    ub_vars = np.ones(n, dtype=np.float64)

    for i, p in enumerate(enriched):
        if p["is_out"] or (mode_norm == "cash" and p["is_decoy_trap"]):
            ub_vars[i] = 0.0

    def _pos_vec(positions: set[str]) -> np.ndarray:
        return np.array([1.0 if p["pos"] in positions else 0.0 for p in enriched], dtype=np.float64)

    rows = [
        np.ones(n, dtype=np.float64),                      # 9 total players
        np.array([float(p["salary"]) for p in enriched]),  # salary cap
        _pos_vec({"QB"}),                                  # 1 QB
        _pos_vec({"DST", "DEF", "D/ST"}),                  # 1 DST
        _pos_vec({"RB"}),                                  # 2..3 RB
        _pos_vec({"WR"}),                                  # 3..4 WR
        _pos_vec({"TE"}),                                  # 1..2 TE
        _pos_vec({"RB", "WR", "TE"}),                      # 7 skill players (2 RB + 3 WR + 1 TE + 1 FLEX)
    ]
    lhs = [9.0, float(min_salary), 1.0, 1.0, 2.0, 3.0, 1.0, 7.0]
    rhs = [9.0, float(salary_cap), 1.0, 1.0, 3.0, 4.0, 2.0, 7.0]

    res = milp(
        c=c,
        integrality=integrality,
        bounds=Bounds(lb_vars, ub_vars),
        constraints=LinearConstraint(np.vstack(rows), lhs, rhs),
    )
    if not res.success or res.x is None:
        raise RuntimeError(f"CLASSIC_MILP_INFEASIBLE (mode={mode_norm}): {res.message}")

    sol = np.round(res.x).astype(int)
    chosen = [enriched[i] for i in range(n) if sol[i] == 1]
    total_salary = sum(int(p["salary"]) for p in chosen)
    return {
        "solver": "scipy.optimize.milp",
        "contest_type": "DK_CLASSIC",
        "mode": mode_norm,
        "status": "OPTIMAL",
        "total_salary": total_salary,
        "objective_value": round(float(-res.fun), 3),
        "selected_players": [p["name"] for p in chosen],
        "roster": chosen,
    }


def build_jax_bal_showdown_pool() -> list[dict[str, Any]]:
    """Canonical Week 9 JAX @ BAL Showdown player pool with Brian Thomas Jr. decoy flag."""
    return [
        {
            "name": "Trevor Lawrence",
            "team": "JAX",
            "pos": "QB",
            "salary": 10000,
            "median_fpts": 20.8,
            "p25_floor_fpts": 16.2,
            "p90_ceiling_fpts": 28.5,
            "ownership": 0.42,
            "is_decoy_trap": False,
        },
        {
            "name": "Travis Etienne",
            "team": "JAX",
            "pos": "RB",
            "salary": 8800,
            "median_fpts": 18.4,
            "p25_floor_fpts": 14.2,
            "p90_ceiling_fpts": 25.8,
            "ownership": 0.34,
            "is_decoy_trap": False,
        },
        {
            "name": "Parker Washington",
            "team": "JAX",
            "pos": "WR",
            "salary": 6800,
            "median_fpts": 15.6,
            "p25_floor_fpts": 11.8,
            "p90_ceiling_fpts": 23.2,
            "ownership": 0.24,
            "is_decoy_trap": False,
        },
        {
            "name": "Jakobi Meyers",
            "team": "JAX",
            "pos": "WR",
            "salary": 6200,
            "median_fpts": 14.8,
            "p25_floor_fpts": 11.2,
            "p90_ceiling_fpts": 21.4,
            "ownership": 0.19,
            "is_decoy_trap": False,
        },
        {
            "name": "Derrick Henry",
            "team": "BAL",
            "pos": "RB",
            "salary": 9800,
            "median_fpts": 16.9,
            "p25_floor_fpts": 12.8,
            "p90_ceiling_fpts": 26.8,
            "ownership": 0.38,
            "is_decoy_trap": False,
        },
        {
            "name": "Mark Andrews",
            "team": "BAL",
            "pos": "TE",
            "salary": 5400,
            "median_fpts": 12.2,
            "p25_floor_fpts": 8.8,
            "p90_ceiling_fpts": 18.9,
            "ownership": 0.21,
            "is_decoy_trap": False,
        },
        {
            "name": "Zay Flowers",
            "team": "BAL",
            "pos": "WR",
            "salary": 8200,
            "median_fpts": 11.4,
            "p25_floor_fpts": 6.8,
            "p90_ceiling_fpts": 21.5,
            "ownership": 0.22,
            "is_decoy_trap": False,
        },
        {
            "name": "Brenton Strange",
            "team": "JAX",
            "pos": "TE",
            "salary": 4400,
            "median_fpts": 9.8,
            "p25_floor_fpts": 6.9,
            "p90_ceiling_fpts": 16.4,
            "ownership": 0.14,
            "is_decoy_trap": False,
        },
        {
            "name": "Cam Little",
            "team": "JAX",
            "pos": "PK",
            "salary": 3800,
            "median_fpts": 9.2,
            "p25_floor_fpts": 6.8,
            "p90_ceiling_fpts": 14.0,
            "ownership": 0.15,
            "is_decoy_trap": False,
        },
        {
            "name": "Brian Thomas Jr.",
            "team": "JAX",
            "pos": "WR",
            "salary": 7800,
            "median_fpts": 6.2,
            "p25_floor_fpts": 1.8,
            "p90_ceiling_fpts": 15.5,
            "ownership": 0.28,
            "injury_designation": "Questionable",
            "market_line": 12.5,
            "healthy_prior_mean": 58.0,
            "is_decoy_trap": True,
            "block_cash_dfs": True,
        },
        {
            "name": "Bhayshul Tuten",
            "team": "JAX",
            "pos": "RB",
            "salary": 5800,
            "median_fpts": 4.5,
            "p25_floor_fpts": 0.0,
            "p90_ceiling_fpts": 12.0,
            "ownership": 0.12,
            "injury_designation": "Questionable",
            "market_line": 18.5,
            "healthy_prior_mean": 54.0,
            "is_decoy_trap": True,
            "block_cash_dfs": True,
        },
    ]


def run_jax_bal_showdown_self_test() -> dict[str, Any]:
    pool = build_jax_bal_showdown_pool()
    cash_res = solve_dk_showdown_milp(pool, mode="cash")
    gpp_res = solve_dk_showdown_milp(pool, mode="gpp")

    selected_cash = set(cash_res["selected_players"])
    assert "Brian Thomas Jr." not in selected_cash, "Decoy Brian Thomas Jr. must be excluded from Cash!"
    for healthy_core in ("Parker Washington", "Jakobi Meyers", "Travis Etienne", "Trevor Lawrence"):
        assert healthy_core in selected_cash, f"Expected healthy core {healthy_core} in Cash lineup: {selected_cash}"
    assert cash_res["total_salary"] <= 50000, f"Cash salary {cash_res['total_salary']} exceeds 50000"
    assert gpp_res["total_salary"] <= 50000, f"GPP salary {gpp_res['total_salary']} exceeds 50000"

    return {
        "self_test_passed": True,
        "cash": cash_res,
        "gpp": gpp_res,
        "cash_lineup": cash_res,
        "gpp_lineup": gpp_res,
    }


if __name__ == "__main__":
    out = run_jax_bal_showdown_self_test()
    print(json.dumps(out, indent=2))
