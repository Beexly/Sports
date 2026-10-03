# Provenance: QB identity resolution.
# Extends: ~/workspace/qb-behavioral-profiles/code/compute_metrics.py
# (GSIS passer_player_id as the stable key across the 2019 name-format
# change; scramble backfill from rusher_player_id).
"""QB identity: the stable key is the GSIS id, never the name string."""
from __future__ import annotations

import re
from collections import Counter

GSIS_ID = re.compile(r"^00-\d{7}$")


def is_gsis_id(qb_id: str | None) -> bool:
    """Production qb_id is an nflverse GSIS id. A slug is not one."""
    return isinstance(qb_id, str) and GSIS_ID.fullmatch(qb_id) is not None


def backfill_scramble_passer(passer_id: str | None, rusher_id: str | None,
                             is_scramble: bool) -> str | None:
    """nflfastR leaves passer_player_id null on scrambles; the rusher is the QB.

    Pure function of one play's fields so it is unit-testable.
    """
    if passer_id:
        return passer_id
    if is_scramble and rusher_id:
        return rusher_id
    return None


def build_name_map(rosters: list[dict]) -> dict[str, str]:
    """gsis_id -> canonical full_name from nflverse rosters.

    Later rows win (handles mid-career name corrections); null ids skipped.
    """
    m: dict[str, str] = {}
    for r in rosters:
        gid = r.get("gsis_id")
        name = r.get("full_name")
        if gid and name:
            m[gid] = name
    return m


def canonical_name(passer_id: str | None, name_map: dict[str, str]) -> str:
    """Canonical display name; falls back to the raw id, never empty."""
    if not passer_id:
        return "unknown"
    return name_map.get(passer_id, passer_id)


def build_name_map_from_pbp(pbp_id_name_pairs: list[tuple[str | None, str | None]]) -> dict[str, str]:
    """Build a gsis_id -> name map from (passer_player_id, passer_player_name)
    pairs in local pbp data. No network needed.

    Most common name wins per id (handles the 2019 nflverse name-format
    change: one id can carry two name strings across eras). Names sourced
    this way are nflverse display names, not roster canonical names —
    callers that need roster-canonical names should pass an explicit map.
    """
    votes: dict[str, Counter] = {}
    for pid, pname in pbp_id_name_pairs:
        if pid and pname:
            votes.setdefault(pid, Counter())[pname] += 1
    return {pid: c.most_common(1)[0][0] for pid, c in votes.items()}


def sanitize_filename(name: str) -> str:
    """Filesystem-safe stem for per-QB artifacts."""
    return "".join(c if c.isalnum() else "_" for c in name)
