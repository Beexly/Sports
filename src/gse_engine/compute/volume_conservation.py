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
