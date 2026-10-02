# PROVENANCE — gse-intelligence-build / coaching / base_data.py
# Implements: the data-location contract for the coaching tendency engine.
#
# WHY THIS FILE EXISTS (fresh-checkout reproducibility fix, 2026-10-02):
# tenures.py and fingerprint.py previously hard-coded
#     BASE_DATA = os.path.expanduser("~/workspace/coaching-tendencies/data")
# That path is OUTSIDE the repository and was never committed. On a fresh
# checkout the directory does not exist, so tenures._load() hit its
# `if not os.path.exists(path): continue` branch and returned an EMPTY
# registry. That empty registry then surfaced as:
#     "registry holds 0 verified rows"  -> a confident, specific, WRONG
# message pointing at "queued research" instead of the real cause
# (missing file). That is exactly the silent-degradation trap in AGENTS.md:
# an absent upstream must be LOUD, never a quiet zero.
#
# This module centralises the resolution order and makes absence explicit:
#   1. GSE_COACHING_DATA_DIR  (explicit override, wins over everything)
#   2. <repo>/intelligence/coaching/data   (in-repo, committed)
#   3. ~/workspace/coaching-tendencies/data (legacy external location)
#
# Absence raises DataGapError naming every path tried. It never degrades to
# an empty table and never invents rows.
from __future__ import annotations

import os
from typing import Optional

# Repo-internal data directory (committed). load.py already uses this one.
REPO_DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")

# Legacy external location used by the original build scripts. Kept only as a
# last-resort fallback so an existing workstation checkout keeps working.
LEGACY_DATA_DIR = os.path.expanduser("~/workspace/coaching-tendencies/data")

ENV_VAR = "GSE_COACHING_DATA_DIR"

# The seed files that MUST exist for the tenure registry + season fingerprint
# to return anything. Their absence is a hard data gap, not an empty registry.
REQUIRED_FILES = ("coach_offense.csv", "coach_defense.csv", "off_tendencies.csv")


def candidate_dirs() -> list[str]:
    """Resolution order: explicit override, then in-repo, then legacy."""
    out: list[str] = []
    env = os.environ.get(ENV_VAR)
    if env:
        out.append(env)
    out.append(REPO_DATA_DIR)
    if LEGACY_DATA_DIR != REPO_DATA_DIR:
        out.append(LEGACY_DATA_DIR)
    # De-duplicate, preserve order.
    seen: set[str] = set()
    uniq: list[str] = []
    for d in out:
        if d not in seen:
            seen.add(d)
            uniq.append(d)
    return uniq


def resolve(required: Optional[tuple[str, ...]] = REQUIRED_FILES) -> str:
    """Return the first candidate dir holding every file in `required`.

    Raises DataGapError when none qualifies, naming the paths tried and the
    file that was missing. Loud on absence is the point: a caller that gets a
    directory back is guaranteed the seed files are really there.
    """
    from integration.providers import DataGapError

    tried: list[str] = []
    for d in candidate_dirs():
        tried.append(d)
        if required and not all(os.path.exists(os.path.join(d, f)) for f in required):
            continue
        return d
    raise DataGapError(
        "coaching",
        "coaching seed data not found. Tried: "
        + ", ".join(tried)
        + f". Required file(s): {', '.join(required or ())}. "
        + f"Set {ENV_VAR} to the directory holding them, or restore them to "
        + f"{REPO_DATA_DIR}. See intelligence/REAL-DATA-VALIDATION.md "
        + "('Seed data is not in the repository').",
    )


def available(required: Optional[tuple[str, ...]] = REQUIRED_FILES) -> Optional[str]:
    """Non-raising variant for callers that want to branch, not to fail."""
    for d in candidate_dirs():
        if required and not all(os.path.exists(os.path.join(d, f)) for f in required):
            continue
        return d
    return None


def missing_files(required: tuple[str, ...] = REQUIRED_FILES) -> list[str]:
    """Which required files are absent from the directory that would win."""
    d = available(required)
    if d is not None:
        return []
    for cand in candidate_dirs():
        if os.path.isdir(cand):
            return [f for f in required if not os.path.exists(os.path.join(cand, f))]
    return list(required)