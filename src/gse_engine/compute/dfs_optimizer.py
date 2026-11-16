"""Empirical-covariance DraftKings DFS optimizer with 2-TE and late-swap FLEX (ADR-0009)."""

from __future__ import annotations

from collections.abc import Sequence

import numpy as np

from gse_engine.models import DfsPlayerPoolItem

SALARY_CAP = 50_000
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
        raise ValueError(f"Expected 7 skill players (2 RB, 3 WR, 1 TE + 1 FLEX), got {total_skill}.")
    if len(te_list) > MAX_TES_CLASSIC:
        raise ValueError(f"At most {MAX_TES_CLASSIC} tight ends permitted (received {len(te_list)}).")

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

    # Latest kickoff_utc maximizes late-swap optionality; tie-break by lower salary/proj flexibility.
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
