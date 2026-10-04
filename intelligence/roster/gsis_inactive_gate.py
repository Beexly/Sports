"""
gsis_inactive_gate.py
=====================
Zero-Tolerance Inactive Sieve & Sovereign GSIS ID Identification Gate.

Mathematical & Operational Invariants:
1. Primary key is strictly NFL GSIS ID (e.g. "00-0034844").
2. Unresolved IDs fail closed to INACTIVE.
3. String suffix stripping is strictly forbidden (prevents collisions such as Marvin Harrison vs Marvin Harrison Jr.).
"""

from __future__ import annotations
import re
from dataclasses import dataclass
from typing import Dict, Optional, Set


@dataclass(frozen=True)
class PlayerIdentity:
    player_id: str
    name: str
    team: str
    gsis_id: Optional[str] = None


@dataclass(frozen=True)
class InactiveGateResult:
    is_eligible: boolean
    status: str
    gsis_id: Optional[str]
    reason: str


CANONICAL_GSIS_CROSSWALK: Dict[str, str] = {
    # Saquon Barkley
    "saquon barkley": "00-0034844",
    "barkley, saquon": "00-0034844",
    "s. barkley": "00-0034844",
    "s.barkley": "00-0034844",
    "drb1": "00-0034844",

    # Marvin Harrison Jr.
    "marvin harrison jr.": "00-0039912",
    "marvin harrison jr": "00-0039912",
    "harrison jr., marvin": "00-0039912",
    "m. harrison jr.": "00-0039912",

    # Marvin Harrison (Senior)
    "marvin harrison": "00-0007137",
    "harrison, marvin": "00-0007137",

    # Derrick Henry
    "derrick henry": "00-0032764",
    "henry, derrick": "00-0032764",

    # Javonte Williams
    "javonte williams": "00-0036997",
    "williams, javonte": "00-0036997",

    # CeeDee Lamb
    "ceedee lamb": "00-0036358",
    "lamb, ceedee": "00-0036358",

    # Nico Collins
    "nico collins": "00-0036640",
    "collins, nico": "00-0036640",
}


def resolve_gsis_id(player: PlayerIdentity) -> Optional[str]:
    """Resolves player to official GSIS ID format (00-XXXXXXX)."""
    if player.gsis_id and re.match(r"^00-\d{7}$", player.gsis_id):
        return player.gsis_id

    clean_id = player.player_id.strip().lower()
    if clean_id in CANONICAL_GSIS_CROSSWALK:
        return CANONICAL_GSIS_CROSSWALK[clean_id]

    clean_name = player.name.strip().lower()
    if clean_name in CANONICAL_GSIS_CROSSWALK:
        return CANONICAL_GSIS_CROSSWALK[clean_name]

    return None


def evaluate_inactive_gate(player: PlayerIdentity, inactive_gsis_set: Set[str]) -> InactiveGateResult:
    """Evaluates player eligibility. Unresolved IDs fail closed to INACTIVE."""
    gsis = resolve_gsis_id(player)
    if not gsis:
        return InactiveGateResult(
            is_eligible=False,
            status="UNRESOLVED_ID_FAIL_CLOSED",
            gsis_id=None,
            reason=f"Player '{player.name}' (ID: {player.player_id}) failed GSIS ID resolution. Failing closed."
        )

    if gsis in inactive_gsis_set:
        return InactiveGateResult(
            is_eligible=False,
            status="INACTIVE_OFFICIAL",
            gsis_id=gsis,
            reason=f"Player '{player.name}' (GSIS: {gsis}) is confirmed INACTIVE on official feed."
        )

    return InactiveGateResult(
        is_eligible=True,
        status="ACTIVE",
        gsis_id=gsis,
        reason=f"Verified active with valid GSIS ID {gsis}."
    )
