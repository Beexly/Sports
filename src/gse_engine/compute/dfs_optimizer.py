"""Empirical-covariance DraftKings DFS optimizer with 2-TE and late-swap FLEX (ADR-0009)."""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

import numpy as np

from gse_engine.models import DfsPlayerPoolItem

SALARY_CAP = 50_000
SHOWDOWN_SLOTS = 6
MAX_TES_CLASSIC = 2
MIN_CASH_P20_MULT = 2.2
MIN_CASH_MEDIAN_SNAPS = 12.0


def shrunk_empirical_covariance(fpts_matrix: np.ndarray, shrinkage: float = 0.25) -> np.ndarray:
    """Computes a Ledoit-Wolf-style shrunk sample covariance over simulated FPTS."""
    arr = np.asarray(fpts_matrix, dtype=float)
    if arr.ndim != 2 or arr.shape[0] < 2:
        raise ValueError("fpts_matrix must be 2D with at least 2 simulation rows.")
    cov = np.cov(arr, rowvar=False)
    if cov.ndim == 0:
        cov = np.array([[float(cov)]])
    diag = np.diag(np.diag(cov))
    alpha = max(0.0, min(1.0, shrinkage))
    return (1.0 - alpha) * cov + alpha * diag


def filter_cash_eligible_players(
    pool: Sequence[DfsPlayerPoolItem],
    min_p20_mult: float = MIN_CASH_P20_MULT,
    min_median_snaps: float = MIN_CASH_MEDIAN_SNAPS,
) -> list[DfsPlayerPoolItem]:
    """Filters DFS pool to empirical cash-viable starters (no synthetic 2.4x floor)."""
    return [
        p
        for p in pool
        if p.salary > 0
        and p.projected_points > 0
        and p.p20_value_mult >= min_p20_mult
        and p.median_snaps >= min_median_snaps
    ]


def assign_latest_kickoff_flex(
    rb_list: Sequence[DfsPlayerPoolItem],
    wr_list: Sequence[DfsPlayerPoolItem],
    te_list: Sequence[DfsPlayerPoolItem],
) -> dict[str, list[DfsPlayerPoolItem]]:
    """Assigns Classic RB/WR/TE slots with latest-kickoff eligible skill player in FLEX."""
    total_skill = len(rb_list) + len(wr_list) + len(te_list)
    if total_skill != 7:
        raise ValueError(
            f"Expected 7 skill players (2 RB, 3 WR, 1 TE + 1 FLEX), got {total_skill}."
        )
    if len(te_list) > MAX_TES_CLASSIC:
        raise ValueError(
            f"At most {MAX_TES_CLASSIC} tight ends permitted (received {len(te_list)})."
        )

    rbs = list(rb_list)
    wrs = list(wr_list)
    tes = list(te_list)
    flex_candidates: list[tuple[str, DfsPlayerPoolItem]] = []
    if len(rbs) > 2:
        flex_candidates.extend(("RB", p) for p in rbs)
    if len(wrs) > 3:
        flex_candidates.extend(("WR", p) for p in wrs)
    if len(tes) > 1:
        flex_candidates.extend(("TE", p) for p in tes)
    if len(flex_candidates) == 0:
        raise ValueError("Invalid positional counts for Classic FLEX placement.")

    # Latest kickoff_utc maximizes late-swap optionality; tie-break by lower proj flexibility.
    flex_pos, flex_player = max(
        flex_candidates,
        key=lambda item: (item[1].kickoff_utc, item[1].projected_points),
    )
    if flex_pos == "RB":
        rbs.remove(flex_player)
    elif flex_pos == "WR":
        wrs.remove(flex_player)
    else:
        tes.remove(flex_player)

    return {"RB": rbs, "WR": wrs, "TE": tes, "FLEX": [flex_player]}


def build_dfs_lineup(
    pool: Sequence[DfsPlayerPoolItem],
    mode: str = "gpp",
    max_tes: int = MAX_TES_CLASSIC,
) -> dict[str, list[DfsPlayerPoolItem]]:
    """Constructs a valid 9-man DraftKings Classic lineup supporting 2-TE and late FLEX."""
    if max_tes < 1 or max_tes > MAX_TES_CLASSIC:
        raise ValueError(f"max_tes must be 1 or 2, got {max_tes}.")

    working = (
        filter_cash_eligible_players(pool)
        if mode == "cash"
        else [p for p in pool if p.salary > 0 and p.projected_points > 0]
    )

    by_pos: dict[str, list[DfsPlayerPoolItem]] = {
        pos: sorted(
            [p for p in working if p.position == pos],
            key=lambda x: (x.projected_points / max(1, x.salary), x.projected_points),
            reverse=True,
        )
        for pos in ("QB", "RB", "WR", "TE", "DST")
    }

    if (
        len(by_pos["QB"]) < 1
        or len(by_pos["RB"]) < 2
        or len(by_pos["WR"]) < 3
        or len(by_pos["TE"]) < 1
        or len(by_pos["DST"]) < 1
    ):
        raise ValueError("Insufficient eligible players to construct a full 9-man Classic lineup.")

    # Try candidate greedy cores plus best valid FLEX under $50,000 cap.
    qbs = by_pos["QB"][:3]
    dsts = by_pos["DST"][:3]
    base_rb = by_pos["RB"][:4]
    base_wr = by_pos["WR"][:5]
    base_te = by_pos["TE"][:3]

    best_score = -1.0
    best_selection: dict[str, list[DfsPlayerPoolItem]] | None = None

    for qb in qbs:
        for dst in dsts:
            rbs = base_rb[:2]
            wrs = base_wr[:3]
            tes = base_te[:1]
            used_ids = {qb.player_id, dst.player_id, *(p.player_id for p in rbs + wrs + tes)}
            flex_pool = [
                p
                for p in (by_pos["RB"] + by_pos["WR"] + (by_pos["TE"] if max_tes >= 2 else []))
                if p.player_id not in used_ids
            ]
            for flex in flex_pool:
                total_sal = qb.salary + dst.salary + sum(
                    p.salary for p in (*rbs, *wrs, *tes, flex)
                )
                if total_sal > SALARY_CAP:
                    continue
                total_pts = qb.projected_points + dst.projected_points + sum(
                    p.projected_points for p in (*rbs, *wrs, *tes, flex)
                )
                if total_pts > best_score:
                    best_score = total_pts
                    all_rb = rbs + ([flex] if flex.position == "RB" else [])
                    all_wr = wrs + ([flex] if flex.position == "WR" else [])
                    all_te = tes + ([flex] if flex.position == "TE" else [])
                    flex_assigned = assign_latest_kickoff_flex(all_rb, all_wr, all_te)
                    best_selection = {"QB": [qb], "DST": [dst], **flex_assigned}

    if best_selection is None:
        raise ValueError("No valid 9-man Classic lineup fits within $50,000 cap.")
    return best_selection


def compute_late_swap_real_option_value(
    *,
    player_position: str,
    is_late_kickoff: bool,
    late_pool_evs_by_pos: Mapping[str, Sequence[float]],
) -> float:
    """Compute K22 DP Real-Option Value ROV_FLEX (0 for early games, >=0 for late games)."""
    if not is_late_kickoff or player_position not in {"RB", "WR", "TE"}:
        return 0.0
    all_late = [
        float(v) for pos in ("RB", "WR", "TE") for v in (late_pool_evs_by_pos.get(pos) or ())
    ]
    pos_late = [float(v) for v in (late_pool_evs_by_pos.get(player_position) or ())]
    if not all_late or not pos_late:
        return 0.0
    return max(0.0, round(max(all_late) - max(pos_late), 6))


def solve_k22_dro_cash_or_dpp_gpp_milp(
    *,
    mode: str,
    names: Sequence[str],
    positions: Sequence[str],
    teams: Sequence[str],
    salaries: Sequence[int],
    mean_projections: Sequence[float],
    scenario_pts_matrix: Sequence[Sequence[float]],
    dirichlet_field_own: Sequence[float] | None = None,
    zero_floor_probs: Sequence[float] | None = None,
    is_late_kickoff: Sequence[bool] | None = None,
    scenario_weights: Sequence[float] | None = None,
    prior_lineup_matrix: Sequence[Sequence[int]] | None = None,
    max_tes: int = MAX_TES_CLASSIC,
    dro_gamma: float = 2.5,
    cvar_beta: float = 0.20,
    tau_dpp: float = 0.15,
) -> dict[str, object]:
    """Solve K22 linearized HiGHS Cash (Bertsimas-Sim + P20 CVaR) or GPP (DPP + ROV_FLEX) MILP."""
    from scipy.optimize import Bounds, LinearConstraint, milp  # type: ignore[import-untyped]
    from scipy.sparse import csc_matrix  # type: ignore[import-untyped]

    k = len(names)
    sal = np.asarray(salaries, dtype=np.float64)
    mu = np.asarray(mean_projections, dtype=np.float64)
    f_mat = np.asarray(scenario_pts_matrix, dtype=np.float64)
    if f_mat.ndim != 2 or f_mat.shape[1] != k or k < 9:
        raise ValueError("Invalid K22 scenario_pts_matrix dimensions.")
    n_s = f_mat.shape[0]
    w_s = (
        np.full(n_s, 1.0 / float(n_s), dtype=np.float64)
        if scenario_weights is None
        else np.asarray(scenario_weights, dtype=np.float64)
    )
    w_s = w_s / float(np.sum(w_s))

    zf = (
        [0.0] * k
        if zero_floor_probs is None
        else [max(0.0, float(v)) for v in zero_floor_probs]
    )
    eligible = (
        [zf[j] <= 0.12 for j in range(k)]
        if mode == "cash"
        else [True] * k
    )

    own = (
        np.full(k, 0.08, dtype=np.float64)
        if dirichlet_field_own is None
        else np.asarray(dirichlet_field_own, dtype=np.float64)
    )
    late_flags = [False] * k if is_late_kickoff is None else [bool(v) for v in is_late_kickoff]

    # Linearized Schur-complement DPP repulsion gradient vector c_dpp_prev
    sigma_f = shrunk_empirical_covariance(f_mat, shrinkage=0.25)
    c_dpp_prev = np.zeros(k, dtype=np.float64)
    if prior_lineup_matrix is not None and len(prior_lineup_matrix) > 0:
        prev_mat = np.asarray(prior_lineup_matrix, dtype=np.float64)
        c_dpp_prev = np.mean(prev_mat @ sigma_f, axis=0)

    # Compute Cash DRO / P20 CVaR linear surrogate or GPP linearized utility
    if mode == "cash":
        q20_downside = np.quantile(f_mat, 0.20, axis=0)
        delta_cp = np.maximum(0.0, mu - q20_downside)
        sorted_deltas = np.sort(delta_cp)[::-1]
        dro_pen = float(np.mean(sorted_deltas[: max(1, int(math.ceil(dro_gamma)))]))
        # Approximate Rockafellar-Uryasev scenario risk tilt smoothly in HiGHS linear objective
        scen_p20_player = np.quantile(f_mat, cvar_beta, axis=0)
        eff_score = 0.65 * (mu - 0.12 * dro_pen * (delta_cp / max(1e-6, float(np.max(delta_cp)))))
        eff_score = eff_score + 0.35 * scen_p20_player
    else:
        c_dup = 1.4 * np.log1p(12.0 * own)
        # Expected value + upper-quantile burst weighted by w_s
        w_mu = w_s @ f_mat
        w_tail = np.quantile(f_mat, 0.85, axis=0)
        late_evs_pos = {
            pos: [float(mu[j]) for j in range(k) if positions[j] == pos and late_flags[j]]
            for pos in ("RB", "WR", "TE")
        }
        rov_bonus = np.array(
            [
                compute_late_swap_real_option_value(
                    player_position=positions[j],
                    is_late_kickoff=late_flags[j],
                    late_pool_evs_by_pos=late_evs_pos,
                )
                if positions[j] in ("RB", "WR", "TE")
                else 0.0
                for j in range(k)
            ],
            dtype=np.float64,
        )
        eff_score = (
            0.65 * w_mu
            + 0.35 * w_tail
            - c_dup
            - float(tau_dpp) * c_dpp_prev
            + 0.25 * rov_bonus
        )

    # Build linear DK Classic 9-man MILP (0..k-1 binary x)
    rows: list[list[float]] = []
    lbs: list[float] = []
    ubs: list[float] = []

    def _add_con(vec: list[float], lb: float, ub: float) -> None:
        rows.append(vec)
        lbs.append(lb)
        ubs.append(ub)

    _add_con([1.0] * k, 9.0, 9.0)
    _add_con([float(sal[j]) for j in range(k)], 0.0, float(SALARY_CAP))
    _add_con([1.0 if positions[j] == "QB" else 0.0 for j in range(k)], 1.0, 1.0)
    _add_con([1.0 if positions[j] == "DST" else 0.0 for j in range(k)], 1.0, 1.0)
    _add_con([1.0 if positions[j] == "RB" else 0.0 for j in range(k)], 2.0, 3.0)
    _add_con([1.0 if positions[j] == "WR" else 0.0 for j in range(k)], 3.0, 4.0)
    _add_con([1.0 if positions[j] == "TE" else 0.0 for j in range(k)], 1.0, float(max_tes))

    # Enforce >= 2 distinct teams (games >= 2) cleanly with <= 8 players from any single team
    unique_teams = sorted(set(teams))
    if len(unique_teams) >= 2:
        for tm_name in unique_teams:
            _add_con([1.0 if teams[j] == tm_name else 0.0 for j in range(k)], 0.0, 8.0)

    # Zero-floor eligibility enforcement
    for j in range(k):
        if not eligible[j]:
            v = [0.0] * k
            v[j] = 1.0
            _add_con(v, 0.0, 0.0)

    a_mat = csc_matrix(np.asarray(rows, dtype=np.float64))
    res = milp(
        c=-eff_score,
        integrality=np.ones(k, dtype=np.int32),
        bounds=Bounds(lb=np.zeros(k), ub=np.ones(k)),
        constraints=LinearConstraint(a_mat, lbs, ubs),
    )
    if not res.success:
        raise ValueError(f"K22 MILP infeasible in mode={mode}: {res.message}")

    selected_idx = [j for j in range(k) if res.x[j] > 0.5]
    return {
        "mode": mode,
        "selected_indices": selected_idx,
        "selected_names": [names[j] for j in selected_idx],
        "total_salary": int(sum(sal[j] for j in selected_idx)),
        "expected_points": round(float(sum(mu[j] for j in selected_idx)), 4),
        "te_count": sum(1 for j in selected_idx if positions[j] == "TE"),
        "distinct_teams": len({teams[j] for j in selected_idx}),
        "x_binary": [1 if res.x[j] > 0.5 else 0 for j in range(k)],
    }


def _classify_showdown_duplication_band(salary_left: int) -> str:
    """Map Showdown salary left to empirical Top-1% field duplication tier (cmain7)."""
    if salary_left >= 1600:
        return "low_duplication_10_1_avg_dupes"
    if salary_left >= 1100:
        return "reduced_duplication_14_9_avg_dupes"
    if salary_left >= 600:
        return "moderate_duplication_19_5_avg_dupes"
    return "crowded_trap_37_8_avg_dupes"


def solve_showdown_cpt_duplication_aware_milp(
    *,
    mode: str = "gpp_unique",
    names: Sequence[str],
    positions: Sequence[str],
    teams: Sequence[str],
    salaries: Sequence[int],
    mean_projections: Sequence[float],
    scenario_pts_matrix: Sequence[Sequence[float]] | None = None,
    dirichlet_field_own: Sequence[float] | None = None,
    cpt_field_own: Sequence[float] | None = None,
    prior_lineup_vectors: Sequence[Sequence[int]] | None = None,
    max_player_overlap: int = 4,
    min_salary_used: int = 47_600,
    max_salary_used: int = 49_400,
    enforce_qb_cpt_stack: bool = True,
    tau_dpp: float = 0.15,
) -> dict[str, object]:
    """Solve DK Showdown (1.5x CPT + 5 FLEX <= $50k) MILP with anti-duplication laws."""
    from scipy.optimize import Bounds, LinearConstraint, milp
    from scipy.sparse import csc_matrix

    k = len(names)
    dims_ok = (
        len(positions) == k
        and len(teams) == k
        and len(salaries) == k
        and len(mean_projections) == k
    )
    if k < SHOWDOWN_SLOTS or not dims_ok:
        raise ValueError("Invalid Showdown candidate pool dimensions.")
    if mode not in {"cash", "gpp_unique"}:
        raise ValueError(f"Unsupported Showdown MILP mode={mode}.")

    sal_flex = np.asarray(salaries, dtype=np.float64)
    sal_cpt = np.rint(1.5 * sal_flex)
    mu = np.asarray(mean_projections, dtype=np.float64)
    if scenario_pts_matrix is not None:
        f_mat = np.asarray(scenario_pts_matrix, dtype=np.float64)
        if f_mat.ndim != 2 or f_mat.shape[1] != k or f_mat.shape[0] < 2:
            raise ValueError("Invalid Showdown scenario_pts_matrix dimensions.")
        sigma_f = shrunk_empirical_covariance(f_mat, shrinkage=0.25)
        q20 = np.quantile(f_mat, 0.20, axis=0)
        q85 = np.quantile(f_mat, 0.85, axis=0)
        w_mu = np.mean(f_mat, axis=0)
    else:
        sigma_f = np.diag(np.maximum(1.0, (0.28 * mu) ** 2))
        q20 = 0.72 * mu
        q85 = 1.32 * mu
        w_mu = mu

    own_flex = (
        np.full(k, 0.24, dtype=np.float64)
        if dirichlet_field_own is None
        else np.clip(np.asarray(dirichlet_field_own, dtype=np.float64), 0.01, 0.95)
    )
    own_cpt = (
        np.clip(1.35 * own_flex, 0.01, 0.95)
        if cpt_field_own is None
        else np.clip(np.asarray(cpt_field_own, dtype=np.float64), 0.01, 0.95)
    )

    c_dpp_prev = np.zeros(k, dtype=np.float64)
    prior_pres: list[list[float]] = []
    if prior_lineup_vectors:
        for vec in prior_lineup_vectors:
            if len(vec) == 2 * k:
                pres = [1.0 if (vec[j] > 0.5 or vec[k + j] > 0.5) else 0.0 for j in range(k)]
            elif len(vec) == k:
                pres = [1.0 if vec[j] > 0.5 else 0.0 for j in range(k)]
            else:
                raise ValueError("prior_lineup_vectors entries must have length k or 2*k.")
            prior_pres.append(pres)
        prev_mat = np.asarray(prior_pres, dtype=np.float64)
        c_dpp_prev = np.mean(prev_mat @ sigma_f, axis=0)

    if mode == "cash":
        base_player = 0.65 * w_mu + 0.35 * q20
        score_cpt = 1.5 * base_player
        score_flex = 1.0 * base_player
        sal_bands: list[tuple[float, float]] = [(0.0, float(SALARY_CAP))]
    else:
        base_player = 0.62 * w_mu + 0.38 * q85
        # Empirical cmain7 CPT leverage: WR +0.55 vs over-owned DST/TE/QB CPT crowding
        pos_cpt_adj = np.array(
            [
                0.55
                if positions[j] == "WR"
                else (-0.65 if positions[j] == "DST" else (-0.25 if positions[j] == "TE" else 0.0))
                for j in range(k)
            ],
            dtype=np.float64,
        )
        score_cpt = (
            1.5 * base_player
            + pos_cpt_adj
            - 1.15 * np.log1p(10.0 * own_cpt)
            - 1.5 * float(tau_dpp) * c_dpp_prev
        )
        score_flex = (
            1.0 * base_player
            - 0.85 * np.log1p(10.0 * own_flex)
            - float(tau_dpp) * c_dpp_prev
        )
        lo_band = float(max(0, min(min_salary_used, SALARY_CAP)))
        hi_band = float(min(SALARY_CAP, max(max_salary_used, lo_band)))
        sal_bands = [
            (lo_band, hi_band),
            (0.0, hi_band),
            (0.0, float(SALARY_CAP)),
        ]

    n_vars = 2 * k
    obj_vec = np.concatenate((score_cpt, score_flex))
    unique_teams = sorted(set(teams))

    def _run_milp(sal_lo: float, sal_hi: float, use_qb_stack: bool) -> Any:
        rows: list[list[float]] = []
        lbs: list[float] = []
        ubs: list[float] = []

        def _add(vec: list[float], lb: float, ub: float) -> None:
            rows.append(vec)
            lbs.append(lb)
            ubs.append(ub)

        _add([1.0] * k + [0.0] * k, 1.0, 1.0)
        _add([0.0] * k + [1.0] * k, 5.0, 5.0)
        for j in range(k):
            v = [0.0] * n_vars
            v[j] = 1.0
            v[k + j] = 1.0
            _add(v, 0.0, 1.0)

        _add(
            [float(sal_cpt[j]) for j in range(k)] + [float(sal_flex[j]) for j in range(k)],
            sal_lo,
            sal_hi,
        )

        if len(unique_teams) >= 2:
            for tm_name in unique_teams:
                tm_v = [1.0 if teams[j] == tm_name else 0.0 for j in range(k)]
                _add(tm_v + tm_v, 1.0, 5.0)

        if use_qb_stack and mode == "gpp_unique" and len(unique_teams) >= 2:
            for q_idx in range(k):
                if positions[q_idx] != "QB":
                    continue
                q_tm = teams[q_idx]
                same_catch = [
                    j
                    for j in range(k)
                    if j != q_idx and teams[j] == q_tm and positions[j] in {"WR", "TE"}
                ]
                if not same_catch:
                    same_catch = [
                        j
                        for j in range(k)
                        if j != q_idx and teams[j] == q_tm and positions[j] in {"WR", "TE", "RB"}
                    ]
                opp_bring = [
                    j
                    for j in range(k)
                    if teams[j] != q_tm and positions[j] in {"WR", "TE", "RB", "K"}
                ]
                if same_catch:
                    c_min = [0.0] * n_vars
                    c_min[q_idx] = -1.0
                    for j in same_catch:
                        c_min[k + j] = 1.0
                    _add(c_min, 0.0, float(SHOWDOWN_SLOTS))

                    c_max = [0.0] * n_vars
                    c_max[q_idx] = 3.0
                    for j in same_catch:
                        c_max[k + j] = 1.0
                    _add(c_max, 0.0, 5.0)
                if opp_bring:
                    c_opp = [0.0] * n_vars
                    c_opp[q_idx] = -1.0
                    for j in opp_bring:
                        c_opp[k + j] = 1.0
                    _add(c_opp, 0.0, float(SHOWDOWN_SLOTS))

        for pres in prior_pres:
            _add(pres + pres, 0.0, float(max_player_overlap))

        a_mat = csc_matrix(np.asarray(rows, dtype=np.float64))
        return milp(
            c=-obj_vec,
            integrality=np.ones(n_vars, dtype=np.int32),
            bounds=Bounds(lb=np.zeros(n_vars), ub=np.ones(n_vars)),
            constraints=LinearConstraint(a_mat, lbs, ubs),
        )

    sol: Any = None
    attempts = [(s_lo, s_hi, enforce_qb_cpt_stack) for s_lo, s_hi in sal_bands]
    if enforce_qb_cpt_stack and mode == "gpp_unique":
        attempts.append((0.0, float(SALARY_CAP), False))
    for s_lo, s_hi, use_stk in attempts:
        cand = _run_milp(s_lo, s_hi, use_stk)
        if cand.success and cand.x is not None:
            sol = cand
            break
    if sol is None or not sol.success:
        raise ValueError(f"Showdown MILP infeasible in mode={mode}.")

    cpt_idx = next(j for j in range(k) if sol.x[j] > 0.5)
    flex_idxs = [j for j in range(k) if sol.x[k + j] > 0.5]
    tot_sal = int(round(sal_cpt[cpt_idx] + sum(sal_flex[j] for j in flex_idxs)))
    sal_left = SALARY_CAP - tot_sal
    exp_pts = float(1.5 * mu[cpt_idx] + sum(mu[j] for j in flex_idxs))
    pres_bin = [1 if (j == cpt_idx or j in flex_idxs) else 0 for j in range(k)]

    split_map: dict[str, int] = {}
    for idx_all in (cpt_idx, *flex_idxs):
        split_map[teams[idx_all]] = split_map.get(teams[idx_all], 0) + 1
    same_team_wr_te_flex = sum(
        1 for j in flex_idxs if teams[j] == teams[cpt_idx] and positions[j] in {"WR", "TE"}
    )
    opp_bringback_flex = sum(1 for j in flex_idxs if teams[j] != teams[cpt_idx])

    return {
        "mode": mode,
        "captain_index": cpt_idx,
        "captain_name": names[cpt_idx],
        "captain_position": positions[cpt_idx],
        "captain_team": teams[cpt_idx],
        "captain_salary_15x": int(sal_cpt[cpt_idx]),
        "flex_indices": flex_idxs,
        "flex_names": [names[j] for j in flex_idxs],
        "total_salary": tot_sal,
        "salary_left": sal_left,
        "expected_points_15x": round(exp_pts, 4),
        "team_split": split_map,
        "qb_cpt_same_team_pass_catchers": (
            same_team_wr_te_flex if positions[cpt_idx] == "QB" else None
        ),
        "opp_bringback_count": opp_bringback_flex,
        "expected_dupe_band": _classify_showdown_duplication_band(sal_left),
        "zero_cap_violations": bool(tot_sal <= SALARY_CAP),
        "presence_binary": pres_bin,
        "x_binary": [1 if sol.x[v] > 0.5 else 0 for v in range(n_vars)],
    }
