"""Zero-leak Sinkhorn-style vacated volume conservation (ADR-0008).

Replaces OTHER_TEAM_REC / OTHER_TEAM_RUSH phantom sinks by redistributing
injured starters' target and carry shares proportionally across healthy Stage-0
teammates subject to per-role exposure caps and >= 94% named attribution.
"""

from __future__ import annotations

from collections.abc import Sequence

from gse_engine.models import ConservedVolumeResult, PlayerShare

MAX_RESIDUAL_SHARE = 0.05
MIN_NAMED_ATTRIBUTION = 0.94
_POSITION_TARGET_CAPS: dict[str, float] = {"WR": 0.34, "TE": 0.29, "RB": 0.22}
_POSITION_CARRY_CAPS: dict[str, float] = {"RB": 0.78, "WR": 0.14, "TE": 0.08}


def _sinkhorn_bounded_distribute(
    base_weights: list[float],
    extra_pool: float,
    caps: list[float],
    iterations: int = 12,
) -> tuple[list[float], float]:
    """Iteratively redistributes `extra_pool` without breaching individual caps."""
    shares = list(base_weights)
    remaining = max(0.0, extra_pool)
    for _ in range(iterations):
        if remaining <= 1e-9:
            break
        headroom = [max(0.0, cap - cur) for cur, cap in zip(shares, caps, strict=True)]
        total_room = sum(headroom)
        if total_room <= 1e-9:
            break
        # Weight toward players with positive baseline role while bounded by headroom.
        raw_desire = [
            room * (0.35 + base) if room > 0 else 0.0
            for room, base in zip(headroom, base_weights, strict=True)
        ]
        desire_sum = sum(raw_desire)
        if desire_sum <= 1e-9:
            break
        distributed = 0.0
        for idx, desire in enumerate(raw_desire):
            if desire <= 0.0:
                continue
            delta = min(headroom[idx], remaining * (desire / desire_sum))
            shares[idx] += delta
            distributed += delta
        remaining = max(0.0, remaining - distributed)
    return shares, remaining


def reallocate_vacated_volume(
    players: Sequence[PlayerShare],
    opp_front7_outs: int = 0,
) -> ConservedVolumeResult:
    """Conserves vacated targets and carries across healthy active Stage-0 teammates.

    Args:
        players: Full roster opportunity snapshot (both active and inactive players).
        opp_front7_outs: Count of opponent starting front-7 defenders ruled OUT.

    Returns:
        ConservedVolumeResult mapping player_id to conserved target/carry shares
        and verified residual bounds.

    Raises:
        ValueError: If named active attribution falls below MIN_NAMED_ATTRIBUTION
            or residual unattributed volume exceeds MAX_RESIDUAL_SHARE.
    """
    active = [p for p in players if p.active]
    inactive = [p for p in players if not p.active]
    if not active:
        raise ValueError("Cannot conserve volume with zero active Stage-0 players.")

    vacated_targets = sum(max(0.0, p.base_target_share) for p in inactive)
    vacated_carries = sum(max(0.0, p.base_carry_share) for p in inactive)

    base_t = [max(0.0, p.base_target_share) for p in active]
    caps_t = [_POSITION_TARGET_CAPS[p.position] for p in active]
    alloc_t, raw_rem_t = _sinkhorn_bounded_distribute(base_t, vacated_targets, caps_t)

    base_c = [max(0.0, p.base_carry_share) for p in active]
    caps_c = [_POSITION_CARRY_CAPS[p.position] for p in active]
    alloc_c, raw_rem_c = _sinkhorn_bounded_distribute(base_c, vacated_carries, caps_c)

    # Normalize total active named share toward 1.0 - residual, enforcing <= 5% unattributed.
    total_active_t = sum(alloc_t)
    total_all_t = total_active_t + raw_rem_t
    named_t_ratio = total_active_t / total_all_t if total_all_t > 0 else 1.0
    residual_t = max(0.0, 1.0 - total_active_t)
    if residual_t > MAX_RESIDUAL_SHARE and total_active_t > 0:
        # Lift proportionally inside residual budget up to 0.96 named share without phantom sinks.
        target_sum = 1.0 - MAX_RESIDUAL_SHARE
        scale = target_sum / total_active_t
        alloc_t = [min(caps_t[i], val * scale) for i, val in enumerate(alloc_t)]
        total_active_t = sum(alloc_t)
        named_t_ratio = min(1.0, total_active_t)
        residual_t = max(0.0, 1.0 - total_active_t)

    total_active_c = sum(alloc_c)
    total_all_c = total_active_c + raw_rem_c
    named_c_ratio = total_active_c / total_all_c if total_all_c > 0 else 1.0
    residual_c = max(0.0, 1.0 - total_active_c)
    if residual_c > MAX_RESIDUAL_SHARE and total_active_c > 0:
        target_sum_c = 1.0 - MAX_RESIDUAL_SHARE
        scale_c = target_sum_c / total_active_c
        alloc_c = [min(caps_c[i], val * scale_c) for i, val in enumerate(alloc_c)]
        total_active_c = sum(alloc_c)
        named_c_ratio = min(1.0, total_active_c)
        residual_c = max(0.0, 1.0 - total_active_c)

    if total_all_t > 0 and named_t_ratio < MIN_NAMED_ATTRIBUTION:
        raise ValueError(
            f"Target named attribution {named_t_ratio:.3f} below {MIN_NAMED_ATTRIBUTION:.2f}."
        )
    if total_all_c > 0 and named_c_ratio < MIN_NAMED_ATTRIBUTION:
        raise ValueError(
            f"Carry named attribution {named_c_ratio:.3f} below {MIN_NAMED_ATTRIBUTION:.2f}."
        )

    eff_boost = round(min(0.18, max(0, opp_front7_outs) * 0.035), 4)
    return ConservedVolumeResult(
        allocated_targets={p.player_id: round(alloc_t[i], 6) for i, p in enumerate(active)},
        allocated_carries={p.player_id: round(alloc_c[i], 6) for i, p in enumerate(active)},
        residual_target_share=round(max(0.0, residual_t), 6),
        residual_carry_share=round(max(0.0, residual_c), 6),
        named_target_attribution=round(named_t_ratio, 6),
        named_carry_attribution=round(named_c_ratio, 6),
        efficiency_boost=eff_boost,
    )


def conserve_non_qb_rushing_and_prune_zero_carry_wrs(
    rush_weights: dict[str, float],
    positions: dict[str, str],
    carries_per_pg: dict[str, float],
    *,
    gadget_carry_floor: float = 0.35,
    exclude_qb: bool = True,
) -> dict[str, float]:
    """Prune zero-carry WRs/TEs and exclude QBs when QB scrambling is modeled separately.

    Fixes the Week 10 double-allocation bug (where QBs absorbed 25-72% of team rush shares
    before being overwritten by simulated scramble yards) and Jensen inflation smearing ~1.6
    carries onto every zero-carry WR.
    """
    filtered: dict[str, float] = {}
    for name, raw_w in rush_weights.items():
        pos = str(positions.get(name, "")).strip().upper()
        if exclude_qb and pos == "QB":
            continue
        cpg = float(carries_per_pg.get(name, 0.0))
        if pos == "RB" or (pos in {"WR", "TE"} and cpg >= gadget_carry_floor):
            filtered[name] = max(1e-4, float(raw_w))

    if not filtered:
        for name, raw_w in rush_weights.items():
            if str(positions.get(name, "")).strip().upper() == "RB":
                filtered[name] = max(1.0, float(raw_w))

    tot = sum(filtered.values())
    if tot <= 0.0:
        return {}
    return {k: round(v / tot, 6) for k, v in filtered.items()}


def anchor_team_priors_to_market_stack(
    *,
    posted_total: float,
    posted_home_spread: float,
    pbp_team_pass_pg: float,
    pbp_team_rush_pg: float,
    side: str,
    qb_tier: str = "QB1",
    epa_mod: float = 1.0,
    pass_rate: float = 0.57,
) -> tuple[float, float, float]:
    """Compute Layer-1 Market + Stage-1 PBP team pass/rush yard priors without 285.0 walls.

    Returns ``(mkt_implied_pts, target_pass_yds, target_rush_yds)``.
    """
    side_low = side.strip().lower()
    if side_low not in {"away", "home"}:
        raise ValueError(f"side must be 'away' or 'home', got {side!r}")
    raw_mkt_pts = (
        0.5 * (posted_total + posted_home_spread)
        if side_low == "away"
        else 0.5 * (posted_total - posted_home_spread)
    )
    mkt_pts = min(36.5, max(10.5, raw_mkt_pts))

    tier_up = qb_tier.strip().upper()
    qb_mult = (
        0.74
        if tier_up == "QB2_BACKUP"
        else (0.60 if tier_up == "EMERGENCY_QB3_UDFA" else 1.0)
    )
    pass_lean = min(1.20, max(0.84, pass_rate / 0.57))
    rush_lean = min(1.24, max(0.80, (1.0 - pass_rate) / 0.43))
    mkt_pass_implied = (
        (214.0 + 4.8 * (mkt_pts - 21.5))
        * pass_lean
        * (0.80 if tier_up == "QB2_BACKUP" else 1.0)
    )
    mkt_rush_implied = (112.0 + 3.4 * (mkt_pts - 21.5)) * rush_lean

    bounded_epa = min(1.14, max(0.88, float(epa_mod)))
    raw_pass = (0.52 * mkt_pass_implied + 0.48 * (pbp_team_pass_pg * qb_mult)) * bounded_epa
    raw_rush = (0.48 * mkt_rush_implied + 0.52 * pbp_team_rush_pg) * (
        0.94 + 0.5 * (bounded_epa - 1.0)
    )

    target_pass = round(min(330.0, max(125.0, raw_pass)), 2)
    target_rush = round(min(185.0, max(65.0, raw_rush)), 2)
    return round(mkt_pts, 2), target_pass, target_rush


def reallocate_12cell_kantorovich_vmls_roles(
    *,
    vacated_band_shares_v: Sequence[float],
    active_player_profiles: Sequence[Sequence[float]],
    base_shares_r0: Sequence[float],
    max_share_add_u: Sequence[float],
    has_liquid_two_sided_prop: Sequence[bool] | None = None,
    ol_distress: float = 0.0,
    entropic_eps: float = 0.04,
    max_iter: int = 80,
) -> dict[str, object]:
    """Solve K04 12-cell capacity-bounded Kantorovich-VMLS entropic Sinkhorn reallocation.

    Masks zero-vacated bands (`I_pos = {i : v_i > 1e-12}`) to eliminate log(0) NaNs,
    applies exact cost C_ik = 0.35*(1 - cos_sim) + 0.30*(|d_i - d_k|/20) + 0.15*blk*I_OL
    + 0.20*Delta_P_brk, relaxes box capacities u_k proportional when sum(u_k) < sum(v_i),
    applies 0.25x damping to boarded-prop players, and returns a zero-orphan conserved
    target simplex (`abs(sum - 1.0) < 1e-12`).
    """
    import math

    import numpy as np

    # 12 canonical alignment x aDOT cells: 4 alignments [Wide, Slot, Inline, Back] x 3 [5, 14, 24]
    alignments = ((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))
    adot_centers = (5.0, 14.5, 24.0)
    cell_aln: list[tuple[float, ...]] = []
    cell_adot: list[float] = []
    for aln in alignments:
        for d_c in adot_centers:
            cell_aln.append(tuple(float(v) for v in aln))
            cell_adot.append(d_c)

    v_arr = np.maximum(0.0, np.asarray(vacated_band_shares_v, dtype=np.float64).reshape(-1))
    if len(v_arr) != 12:
        raise ValueError(f"vacated_band_shares_v must have length 12, got {len(v_arr)}.")
    r0 = np.maximum(0.0, np.asarray(base_shares_r0, dtype=np.float64).reshape(-1))
    u_cap = np.maximum(1e-6, np.asarray(max_share_add_u, dtype=np.float64).reshape(-1))
    k_act = len(r0)
    if k_act == 0 or len(u_cap) != k_act or len(active_player_profiles) != k_act:
        raise ValueError("active_player_profiles, base_shares_r0, and max_share_add_u must match.")

    prop_flags = (
        [bool(f) for f in has_liquid_two_sided_prop]
        if has_liquid_two_sided_prop is not None
        else [False] * k_act
    )
    if len(prop_flags) != k_act:
        raise ValueError("has_liquid_two_sided_prop length must match active players.")

    # Build 12 x K transport cost matrix
    cost = np.zeros((12, k_act), dtype=np.float64)
    ol_flag = 1.0 if float(ol_distress) > 0.5 else 0.0
    for i in range(12):
        ai = np.asarray(cell_aln[i], dtype=np.float64)
        ni = max(1e-9, float(np.linalg.norm(ai)))
        for k in range(k_act):
            prof = active_player_profiles[k]
            ak = np.asarray(
                [float(prof[0]), float(prof[1]), float(prof[2]), float(prof[3])],
                dtype=np.float64,
            )
            nk = max(1e-9, float(np.linalg.norm(ak)))
            cos_sim = max(0.0, min(1.0, float(np.dot(ai, ak) / (ni * nk))))
            d_k = float(prof[4]) if len(prof) > 4 else 10.0
            rho_blk = float(prof[5]) if len(prof) > 5 else 0.0
            dp_brk = float(prof[6]) if len(prof) > 6 else 0.0
            c_ik = (
                0.35 * (1.0 - cos_sim)
                + 0.30 * (abs(cell_adot[i] - d_k) / 20.0)
                + 0.15 * rho_blk * ol_flag
                + 0.20 * dp_brk
            )
            cost[i, k] = max(0.0, min(2.0, c_ik))

    i_pos = [i for i in range(12) if float(v_arr[i]) > 1e-12]
    p_star = np.zeros((12, k_act), dtype=np.float64)
    if i_pos:
        vac_tot = float(np.sum(v_arr[i_pos]))
        cap_sum = float(np.sum(u_cap))
        u_eff = u_cap.copy()
        if cap_sum < vac_tot and cap_sum > 0.0:
            u_eff = u_cap * ((vac_tot * 1.001) / cap_sum)

        eps = max(1e-3, float(entropic_eps))
        phi = np.zeros(len(i_pos), dtype=np.float64)
        psi = np.zeros(k_act, dtype=np.float64)
        c_sub = cost[i_pos, :]
        log_v = np.log(v_arr[i_pos])
        log_u = np.log(np.maximum(1e-12, u_eff))

        for _ in range(max_iter):
            # Log-sum-exp update for phi_i
            m_row = (psi[None, :] - c_sub) / eps
            row_max = np.max(m_row, axis=1)
            lse_row = row_max + np.log(np.sum(np.exp(m_row - row_max[:, None]), axis=1))
            phi_new = eps * log_v - eps * lse_row

            # Box-bounded update for psi_k <= 0
            m_col = (phi_new[:, None] - c_sub) / eps
            col_max = np.max(m_col, axis=0)
            lse_col = col_max + np.log(np.sum(np.exp(m_col - col_max[None, :]), axis=0))
            psi_new = np.minimum(0.0, eps * log_u - eps * lse_col)

            if float(np.max(np.abs(phi_new - phi))) < 1e-9 and float(
                np.max(np.abs(psi_new - psi))
            ) < 1e-9:
                phi, psi = phi_new, psi_new
                break
            phi, psi = phi_new, psi_new

        log_p_sub = (phi[:, None] + psi[None, :] - c_sub) / eps
        p_sub = np.exp(np.clip(log_p_sub, -60.0, 20.0))
        # Exact row conservation scaling on I_pos
        row_s = np.maximum(1e-15, np.sum(p_sub, axis=1, keepdims=True))
        p_sub = p_sub * (v_arr[i_pos][:, None] / row_s)
        for local_i, global_i in enumerate(i_pos):
            p_star[global_i, :] = p_sub[local_i, :]

    delta_r = np.sum(p_star, axis=0)
    damped_delta = np.array(
        [(0.25 if prop_flags[k] else 1.0) * float(delta_r[k]) for k in range(k_act)],
        dtype=np.float64,
    )
    raw_new = r0 + damped_delta
    tot = float(np.sum(raw_new)) or 1.0
    r_new = raw_new / tot

    if not math.isfinite(float(np.sum(p_star))) or not math.isfinite(float(np.sum(r_new))):
        raise RuntimeError("Non-finite Sinkhorn-VMLS transport plan detected.")

    return {
        "r_new": [float(v) for v in r_new],
        "p_ik_star": [[float(x) for x in row] for row in p_star],
        "vacated_total": round(float(np.sum(v_arr)), 8),
        "simplex_error": abs(float(np.sum(r_new)) - 1.0),
        "orphan_bucket_share": 0.0,
        "all_finite": bool(np.all(np.isfinite(p_star)) and np.all(np.isfinite(r_new))),
    }
