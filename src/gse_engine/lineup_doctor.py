"""Fast DFS Lineup Doctor for 6-man Showdown and 9-man Classic rosters (ADR-0009)."""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass

from gse_engine.compute.dfs_optimizer import SALARY_CAP
from gse_engine.models import DfsPlayerPoolItem


@dataclass(frozen=True, slots=True)
class LineupAuditReport:
    """Instant validation & 1-swap repair verdict returned in sub-second latency."""

    ok: bool
    total_salary: int
    projected_points: float
    issues: tuple[str, ...]
    suggested_swap: str | None


def audit_and_repair_lineup(
    roster: Sequence[DfsPlayerPoolItem],
    pool: Sequence[DfsPlayerPoolItem],
    inactive_ids: set[str] | None = None,
    salary_cap: int = SALARY_CAP,
) -> LineupAuditReport:
    """Audits a user DraftKings roster cleanly without KeyError and suggests 1-swap upgrades.

    Args:
        roster: Selected DraftKings lineup players.
        pool: Active slate player pool.
        inactive_ids: Player IDs ruled OUT / suspended on latest Stage-0 feed.
        salary_cap: Salary ceiling (default $50,000).

    Returns:
        LineupAuditReport with constraint checks and best 1-swap improvement if needed.
    """
    outs = inactive_ids or set()
    issues: list[str] = []

    if len(roster) not in (6, 9):
        issues.append(f"INVALID_ROSTER_SIZE:{len(roster)}")

    seen: set[str] = set()
    for p in roster:
        if p.player_id in seen:
            issues.append(f"DUPLICATE_PLAYER:{p.player_id}")
        seen.add(p.player_id)
        if p.player_id in outs:
            issues.append(f"INACTIVE_PLAYER:{p.name}")

    total_salary = sum(max(0, p.salary) for p in roster)
    total_proj = round(sum(p.projected_points for p in roster), 2)
    if total_salary > salary_cap:
        issues.append(f"OVER_SALARY_CAP:{total_salary}")

    suggested_swap: str | None = None
    inactive_slots = [p for p in roster if p.player_id in outs]
    target = inactive_slots[0] if inactive_slots else (
        min(roster, key=lambda p: p.projected_points) if issues else None
    )
    if target is not None:
        headroom = salary_cap - (total_salary - target.salary)
        replacements = [
            cand
            for cand in pool
            if cand.player_id not in seen
            and cand.player_id not in outs
            and cand.position == target.position
            and cand.salary <= headroom
            and cand.projected_points > 0
        ]
        if replacements:
            best = max(replacements, key=lambda c: c.projected_points)
            suggested_swap = (
                f"Swap OUT {target.name} (${target.salary}) -> "
                f"IN {best.name} (${best.salary}, {best.projected_points:.1f} pts)"
            )

    return LineupAuditReport(
        ok=len(issues) == 0,
        total_salary=total_salary,
        projected_points=total_proj,
        issues=tuple(issues),
        suggested_swap=suggested_swap,
    )
