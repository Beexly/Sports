"""
Ledger write-back policy engine.

Decision: NOT an auto-repair path.
  - Relative CRC flags self_consistent_wrong_vs_ledger
  - Write-back is a *policy action* with an explicit key
  - Default: refuse
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class WriteBackDecision:
    allowed: bool
    reason: str
    actions: list[dict[str, Any]]


def evaluate_write_back(
    crc_report: dict[str, Any],
    *,
    policy_key: str | None = None,
    allow_realign: bool = False,
    allow_drop: bool = False,
) -> WriteBackDecision:
    """Refuse by default. Require explicit policy_key and flags."""
    if not policy_key:
        return WriteBackDecision(
            allowed=False,
            reason="missing policy_key — write-back refused",
            actions=[],
        )
    if policy_key != "FOUNDER_WRITEBACK_YES":
        return WriteBackDecision(
            allowed=False,
            reason="invalid policy_key",
            actions=[],
        )
    relative = (crc_report.get("relative") or {})
    status = relative.get("status") if isinstance(relative, dict) else relative
    actions: list[dict[str, Any]] = []
    if status == "self_consistent_wrong_vs_ledger":
        if allow_realign:
            actions.append({"type": "realign_to_sot", "scope": "flagged_entities"})
        if allow_drop:
            actions.append({"type": "drop_non_sot_edges", "scope": "flagged_entities"})
        if not actions:
            return WriteBackDecision(
                allowed=False,
                reason="relative fraud detected but no allow_realign/allow_drop flags",
                actions=[],
            )
        return WriteBackDecision(
            allowed=True,
            reason="policy_key valid; relative fraud with explicit allow flags",
            actions=actions,
        )
    return WriteBackDecision(
        allowed=False,
        reason=f"no write-back path for status={status}",
        actions=[],
    )
