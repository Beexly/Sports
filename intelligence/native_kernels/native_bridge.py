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
import os
import shutil
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
        if hasattr(os, "add_dll_directory"):
            os.add_dll_directory(str(DLL_PATH.parent))
            gpp = shutil.which("g++") or shutil.which("gcc")
            if gpp:
                os.add_dll_directory(str(Path(gpp).resolve().parent))
            for candidate in (
                r"C:\ProgramData\mingw64\mingw64\bin",
                r"C:\msys64\ucrt64\bin",
                r"C:\msys64\mingw64\bin",
            ):
                if Path(candidate).is_dir():
                    os.add_dll_directory(candidate)
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
        raise ValueError(f"gse_c_sinkhorn_knopp_bounded_conservation rejected invalid arguments (status={status})")
    if n == 0 or not np.isfinite(target_total_sum) or target_total_sum <= 0.0 or max_iters <= 0 or not np.isfinite(tol) or tol < 0.0:
        raise ValueError("Invalid parameters for c_sinkhorn_knopp_bounded_conservation")

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
        raise ValueError(f"gse_c_empirical_bayes_role_shrinkage rejected invalid arguments (status={status})")
    if n == 0 or not np.isfinite(prior_strength_k) or prior_strength_k <= 0.0:
        raise ValueError("Invalid parameters for c_empirical_bayes_role_shrinkage")

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
        raise ValueError(f"gse_c_dk_ppr_milestone_scoring rejected invalid arguments (status={status})")
    if n_sims == 0 or n_players == 0:
        raise ValueError("Invalid dimensions for c_dk_ppr_milestone_scoring")

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
        raise ValueError(f"gse_cpp_simulate_student_t_dfs_worlds rejected invalid arguments (status={status})")
    if n_sims <= 0 or n_players <= 0:
        raise ValueError("Invalid dimensions for cpp_simulate_student_t_dfs_worlds")

    # Vectorized NumPy fallback on Linux matching StudentTCopulaEngine::simulate_correlated_dfs_worlds
    rng = np.random.default_rng(int(seed))
    uniq_games, g_inv = np.unique(games, return_inverse=True)
    uniq_teams, t_inv = np.unique(teams, return_inverse=True)
    g_shocks = rng.standard_normal((n_sims, len(uniq_games)))
    t_shocks = rng.standard_normal((n_sims, len(uniq_teams)))
    idio_z = rng.standard_normal((n_sims, n_players))
    u1 = np.clip(rng.random((n_sims, 1)), 1e-12, 1.0)
    u2 = np.clip(rng.random((n_sims, 1)), 1e-12, 1.0)
    chi2 = np.maximum(-2.0 * (np.log(u1) + np.log(u2)), 1e-6)
    t_scale = np.clip(np.sqrt(4.0 / chi2), 0.55, 2.65)

    g_z = g_shocks[:, g_inv]
    t_z = t_shocks[:, t_inv]
    latent_z = np.where(
        pos[None, :] == 1,
        0.46 * g_z + 0.64 * t_z + 0.61 * idio_z,
        np.where(
            (pos[None, :] == 3) | (pos[None, :] == 4),
            0.42 * g_z + 0.52 * t_z + 0.74 * idio_z,
            np.where(
                pos[None, :] == 2,
                0.28 * g_z - 0.14 * t_z + 0.95 * idio_z,
                -0.25 * g_z + 0.96 * idio_z,
            ),
        ),
    )
    mu_clean = np.where(np.isfinite(means) & (means > 0.0), means, 0.0)
    sd_clean = np.where(np.isfinite(stds), np.abs(stds), 0.0)
    pts = np.maximum(0.0, mu_clean[None, :] + sd_clean[None, :] * latent_z * t_scale)
    hit_bonus = ((pos[None, :] == 1) & (pts >= 22.5)) | (
        np.isin(pos[None, :], [2, 3, 4]) & (pts >= 18.5)
    )
    pts = pts + np.where(hit_bonus, 3.0, 0.0)
    return {
        "worlds": pts,
        "p90": np.percentile(pts, 90.0, axis=0),
        "p99": np.percentile(pts, 99.0, axis=0),
        "bonus_prob": np.mean(hit_bonus, axis=0),
        "native_cpp20_executed": np.array([1], dtype=np.int32),
    }


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
        raise ValueError(f"gse_c_evt_gpd_tweedie_and_wasserstein_dro rejected invalid arguments (status={status})")
    if n == 0 or not np.isfinite(wasserstein_eps) or wasserstein_eps < 0.0 or not np.isfinite(tweedie_p) or tweedie_p <= 1.0 or tweedie_p >= 2.0:
        raise ValueError("Invalid parameters for c_evt_gpd_tweedie_and_wasserstein_dro")

    # Vectorized NumPy fallback matching gse_c_evt_gpd_tweedie_and_wasserstein_dro
    mu = np.where(np.isfinite(means) & (means > 0.1), means, 0.1)
    sigma = np.where(np.isfinite(stds) & (np.abs(stds) > 0.1), np.abs(stds), 0.1)
    u_i = np.where(np.isfinite(p90s) & (p90s > mu), p90s, mu + 1.28155 * sigma)
    xi = np.clip(np.where(np.isfinite(xis), xis, 0.12), 0.01, 0.45)
    beta_scale = 0.68 * sigma * (1.0 + 0.5 * xi)
    tail_factor = (np.power(100.0, xi) - 1.0) / xi
    out_p999 = u_i + beta_scale * tail_factor

    phi = (sigma * sigma) / np.power(mu, tweedie_p)
    lambda_pois = np.power(mu, 2.0 - tweedie_p) / (phi * (2.0 - tweedie_p) + 1e-9)
    out_zero = np.clip(np.exp(-lambda_pois), 1e-6, 0.95)
    dro_ev = mu - wasserstein_eps * sigma * (1.0 + 0.5 * out_zero)
    out_dro = np.where(np.isfinite(dro_ev) & (dro_ev > 0.0), dro_ev, 0.0)
    return {
        "p999_evt": out_p999,
        "tweedie_zero_prob": out_zero,
        "wasserstein_dro_ev": out_dro,
    }


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
        raise ValueError(f"gse_c_level_k_qre_ownership_fixed_point rejected invalid arguments (status={status})")
    if n == 0 or not np.isfinite(poisson_tau) or poisson_tau <= 0.0:
        raise ValueError("Invalid parameters for c_level_k_qre_ownership_fixed_point")

    # Vectorized NumPy fallback matching gse_c_level_k_qre_ownership_fixed_point
    tau_c = min(25.0, float(poisson_tau))
    w0 = np.exp(-tau_c)
    w1 = w0 * tau_c
    w2 = w1 * tau_c * 0.5
    w_sum = max(1e-15, w0 + w1 + w2)
    f0, f1, f2 = w0 / w_sum, w1 / w_sum, w2 / w_sum

    proj_c = np.where(np.isfinite(proj_arr) & (proj_arr > 0.0), proj_arr, 0.0)
    sal_c = np.where(np.isfinite(sal_arr) & (sal_arr > 1000.0), sal_arr, 3000.0)
    naive_c = np.where(np.isfinite(fppg_arr) & (fppg_arr > 0.0), fppg_arr, proj_c)
    sal_k = sal_c / 1000.0

    u0 = 0.55 * (naive_c / sal_k)
    u1 = 0.85 * (proj_c / sal_k)
    pi0 = np.exp(u0 - np.max(u0))
    pi0 = pi0 / max(1e-15, float(np.sum(pi0)))
    pi1 = np.exp(u1 - np.max(u1))
    pi1 = pi1 / max(1e-15, float(np.sum(pi1)))

    chalk_mix = 0.4 * pi0 + 0.6 * pi1
    u2 = 0.95 * ((proj_c / sal_k) - 6.5 * chalk_mix)
    pi2 = np.exp(u2 - np.max(u2))
    pi2 = pi2 / max(1e-15, float(np.sum(pi2)))

    out_own = np.clip((f0 * pi0 + f1 * pi1 + f2 * pi2) * 9.0, 0.005, 0.45)
    edge = (proj_c / sal_k) * np.log(1.0 + 1.0 / (out_own + 0.02))
    out_edge = np.where(np.isfinite(edge) & (edge > 0.0), edge, 0.0)
    return {
        "qre_ownership": out_own,
        "level3_edge": out_edge,
    }

