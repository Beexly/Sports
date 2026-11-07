#!/usr/bin/env python3
"""
Python `ctypes` Zero-Copy ABI Bridge to `libgse_native_kernels.dll` (`c-pro` C11 + `cpp-pro` C++20)
====================================================================================================
Provides zero-copy NumPy `ctypes` bindings for:
1. `gse_c_sinkhorn_knopp_bounded_conservation` (C11 Gate G1 Alpha Starter Share Conservation)
2. `gse_c_empirical_bayes_role_shrinkage` (C11 Gate G2 Empirical Bayes Role-Prior Shrinkage)
3. `gse_c_dk_ppr_milestone_scoring` (C11 DraftKings +3.0 300/100-Yd Milestone Evaluator)
4. `gse_cpp_simulate_student_t_dfs_worlds` (C++20 xoshiro256** + Student-t nu=4 10,000-World Copula)
"""

from __future__ import annotations

import ctypes
from pathlib import Path
from typing import Dict, Optional, Tuple

import numpy as np

KERNEL_DIR = Path(__file__).resolve().parent
DLL_PATH = KERNEL_DIR / "bin" / "libgse_native_kernels.dll"

_LIB: Optional[ctypes.CDLL] = None


def _load_library() -> Optional[ctypes.CDLL]:
    global _LIB
    if _LIB is not None:
        return _LIB
    if not DLL_PATH.exists():
        return None
    try:
        lib = ctypes.CDLL(str(DLL_PATH))

        # 1. gse_c_sinkhorn_knopp_bounded_conservation
        lib.gse_c_sinkhorn_knopp_bounded_conservation.argtypes = [
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.c_double,
            ctypes.c_size_t,
            ctypes.c_uint32,
            ctypes.c_double,
            ctypes.POINTER(ctypes.c_double),
        ]
        lib.gse_c_sinkhorn_knopp_bounded_conservation.restype = ctypes.c_int

        # 2. gse_c_empirical_bayes_role_shrinkage
        lib.gse_c_empirical_bayes_role_shrinkage.argtypes = [
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_int32),
            ctypes.POINTER(ctypes.c_int32),
            ctypes.c_double,
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_double),
        ]
        lib.gse_c_empirical_bayes_role_shrinkage.restype = ctypes.c_int

        # 3. gse_c_dk_ppr_milestone_scoring
        lib.gse_c_dk_ppr_milestone_scoring.argtypes = [
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.c_size_t,
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
        ]
        lib.gse_c_dk_ppr_milestone_scoring.restype = ctypes.c_int

        # 4. gse_cpp_simulate_student_t_dfs_worlds
        lib.gse_cpp_simulate_student_t_dfs_worlds.argtypes = [
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_int32),
            ctypes.POINTER(ctypes.c_int32),
            ctypes.POINTER(ctypes.c_int32),
            ctypes.c_size_t,
            ctypes.c_size_t,
            ctypes.c_uint64,
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
        ]
        lib.gse_cpp_simulate_student_t_dfs_worlds.restype = ctypes.c_int

        # 5. gse_c_evt_gpd_tweedie_and_wasserstein_dro
        lib.gse_c_evt_gpd_tweedie_and_wasserstein_dro.argtypes = [
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.c_double,
            ctypes.c_double,
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
        ]
        lib.gse_c_evt_gpd_tweedie_and_wasserstein_dro.restype = ctypes.c_int

        # 6. gse_c_level_k_qre_ownership_fixed_point
        lib.gse_c_level_k_qre_ownership_fixed_point.argtypes = [
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
            ctypes.c_double,
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_double),
            ctypes.POINTER(ctypes.c_double),
        ]
        lib.gse_c_level_k_qre_ownership_fixed_point.restype = ctypes.c_int

        _LIB = lib
        return _LIB
    except OSError:
        return None


def is_native_kernel_loaded() -> bool:
    return _load_library() is not None


def c_sinkhorn_knopp_bounded_conservation(
    prior_weights: np.ndarray,
    min_floor_weights: np.ndarray,
    max_cap_weights: np.ndarray,
    target_total_sum: float = 1.0,
    max_iters: int = 50,
    tol: float = 1e-9,
) -> np.ndarray:
    lib = _load_library()
    priors = np.ascontiguousarray(prior_weights, dtype=np.float64)
    floors = np.ascontiguousarray(min_floor_weights, dtype=np.float64)
    caps = np.ascontiguousarray(max_cap_weights, dtype=np.float64)
    n = priors.size
    out = np.zeros(n, dtype=np.float64)

    if lib is not None and n > 0:
        status = lib.gse_c_sinkhorn_knopp_bounded_conservation(
            priors.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            floors.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            caps.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            ctypes.c_double(target_total_sum),
            ctypes.c_size_t(n),
            ctypes.c_uint32(max_iters),
            ctypes.c_double(tol),
            out.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        if status == 0:
            return out

    # Fallback if DLL unavailable
    w = np.clip(priors, floors, caps)
    s = float(np.sum(w))
    return w * (target_total_sum / s) if s > 0 else out


def c_empirical_bayes_role_shrinkage(
    raw_sim_fpts: np.ndarray,
    dk_avg_fpts: np.ndarray,
    salary_role_prior: np.ndarray,
    effective_snaps: np.ndarray,
    is_vacated_bellcow: np.ndarray,
    is_sub_floor_trap: np.ndarray,
    prior_strength_k: float = 65.0,
) -> np.ndarray:
    lib = _load_library()
    raw_arr = np.ascontiguousarray(raw_sim_fpts, dtype=np.float64)
    dk_arr = np.ascontiguousarray(dk_avg_fpts, dtype=np.float64)
    prior_arr = np.ascontiguousarray(salary_role_prior, dtype=np.float64)
    snaps_arr = np.ascontiguousarray(effective_snaps, dtype=np.float64)
    bellcow_arr = np.ascontiguousarray(is_vacated_bellcow, dtype=np.int32)
    trap_arr = np.ascontiguousarray(is_sub_floor_trap, dtype=np.int32)
    n = raw_arr.size
    out = np.zeros(n, dtype=np.float64)

    if lib is not None and n > 0:
        status = lib.gse_c_empirical_bayes_role_shrinkage(
            raw_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            dk_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            prior_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            snaps_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            bellcow_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            trap_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_double(prior_strength_k),
            ctypes.c_size_t(n),
            out.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        if status == 0:
            return out

    lam = snaps_arr / (snaps_arr + prior_strength_k)
    return lam * raw_arr + (1.0 - lam) * prior_arr


def c_dk_ppr_milestone_scoring(
    base_fpts_matrix: np.ndarray,
    pass_yds_matrix: np.ndarray,
    rush_yds_matrix: np.ndarray,
    rec_yds_matrix: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray]:
    lib = _load_library()
    base_m = np.ascontiguousarray(base_fpts_matrix, dtype=np.float64)
    pass_m = np.ascontiguousarray(pass_yds_matrix, dtype=np.float64)
    rush_m = np.ascontiguousarray(rush_yds_matrix, dtype=np.float64)
    rec_m = np.ascontiguousarray(rec_yds_matrix, dtype=np.float64)
    n_sims, n_players = base_m.shape
    out_total = np.zeros((n_sims, n_players), dtype=np.float64)
    out_bonus_rate = np.zeros(n_players, dtype=np.float64)

    if lib is not None and n_sims > 0 and n_players > 0:
        status = lib.gse_c_dk_ppr_milestone_scoring(
            base_m.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            pass_m.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            rush_m.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            rec_m.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            ctypes.c_size_t(n_sims),
            ctypes.c_size_t(n_players),
            out_total.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_bonus_rate.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        if status == 0:
            return out_total, out_bonus_rate

    bonus = ((pass_m >= 300.0) * 3.0) + ((rush_m >= 100.0) * 3.0) + ((rec_m >= 100.0) * 3.0)
    return base_m + bonus, np.mean(bonus > 0.0, axis=0)


def cpp_simulate_student_t_dfs_worlds(
    mean_fpts: np.ndarray,
    std_fpts: np.ndarray,
    team_ids: np.ndarray,
    game_ids: np.ndarray,
    pos_codes: np.ndarray,
    n_sims: int = 10000,
    seed: int = 20261107,
) -> Dict[str, np.ndarray]:
    lib = _load_library()
    means = np.ascontiguousarray(mean_fpts, dtype=np.float64)
    stds = np.ascontiguousarray(std_fpts, dtype=np.float64)
    teams = np.ascontiguousarray(team_ids, dtype=np.int32)
    games = np.ascontiguousarray(game_ids, dtype=np.int32)
    pos = np.ascontiguousarray(pos_codes, dtype=np.int32)
    n_players = means.size

    out_worlds = np.zeros((n_sims, n_players), dtype=np.float64)
    out_p90 = np.zeros(n_players, dtype=np.float64)
    out_p99 = np.zeros(n_players, dtype=np.float64)
    out_bonus = np.zeros(n_players, dtype=np.float64)

    if lib is not None and n_sims > 0 and n_players > 0:
        status = lib.gse_cpp_simulate_student_t_dfs_worlds(
            means.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            stds.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            teams.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            games.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            pos.ctypes.data_as(ctypes.POINTER(ctypes.c_int32)),
            ctypes.c_size_t(n_sims),
            ctypes.c_size_t(n_players),
            ctypes.c_uint64(seed),
            out_worlds.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_p90.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_p99.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_bonus.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        if status == 0:
            return {
                "worlds": out_worlds,
                "p90": out_p90,
                "p99": out_p99,
                "bonus_prob": out_bonus,
                "native_cpp20_executed": np.array([1], dtype=np.int32),
            }

    raise RuntimeError("Native C++20 kernel execution failed or DLL missing")


def c_evt_gpd_tweedie_and_wasserstein_dro(
    mean_fpts: np.ndarray,
    std_fpts: np.ndarray,
    p90_threshold: np.ndarray,
    gpd_xi: np.ndarray,
    wasserstein_eps: float = 0.18,
    tweedie_p: float = 1.52,
) -> Dict[str, np.ndarray]:
    lib = _load_library()
    means = np.ascontiguousarray(mean_fpts, dtype=np.float64)
    stds = np.ascontiguousarray(std_fpts, dtype=np.float64)
    p90s = np.ascontiguousarray(p90_threshold, dtype=np.float64)
    xis = np.ascontiguousarray(gpd_xi, dtype=np.float64)
    n = means.size

    out_p999 = np.zeros(n, dtype=np.float64)
    out_zero = np.zeros(n, dtype=np.float64)
    out_dro = np.zeros(n, dtype=np.float64)

    if lib is not None and n > 0:
        status = lib.gse_c_evt_gpd_tweedie_and_wasserstein_dro(
            means.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            stds.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            p90s.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            xis.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            ctypes.c_double(wasserstein_eps),
            ctypes.c_double(tweedie_p),
            ctypes.c_size_t(n),
            out_p999.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_zero.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_dro.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        if status == 0:
            return {
                "p999_evt": out_p999,
                "tweedie_zero_prob": out_zero,
                "wasserstein_dro_ev": out_dro,
            }

    raise RuntimeError("Native C11 EVT/Tweedie/Wasserstein kernel failed")


def c_level_k_qre_ownership_fixed_point(
    projections: np.ndarray,
    salaries: np.ndarray,
    naive_fppg: np.ndarray,
    poisson_tau: float = 1.5,
) -> Dict[str, np.ndarray]:
    lib = _load_library()
    proj_arr = np.ascontiguousarray(projections, dtype=np.float64)
    sal_arr = np.ascontiguousarray(salaries, dtype=np.float64)
    fppg_arr = np.ascontiguousarray(naive_fppg, dtype=np.float64)
    n = proj_arr.size

    out_own = np.zeros(n, dtype=np.float64)
    out_edge = np.zeros(n, dtype=np.float64)

    if lib is not None and n > 0:
        status = lib.gse_c_level_k_qre_ownership_fixed_point(
            proj_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            sal_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            fppg_arr.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            ctypes.c_double(poisson_tau),
            ctypes.c_size_t(n),
            out_own.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
            out_edge.ctypes.data_as(ctypes.POINTER(ctypes.c_double)),
        )
        if status == 0:
            return {
                "qre_ownership": out_own,
                "level3_edge": out_edge,
            }

    raise RuntimeError("Native C11 Level-k QRE kernel failed")

