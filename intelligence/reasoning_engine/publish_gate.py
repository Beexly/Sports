"""Founder gate in front of a reasoning trace.

A trace is not a pick. The gate stays shut unless PUBLISH_REASONING_TRACE is
the string "true" AND the trace is not INVALID and no track is DATA-GAP or
UNCHECKED. Shut is the default. Opening it does not mint a probability.
"""
from __future__ import annotations

import os
from typing import Mapping


def reasoning_publish_allowed(label: str | None, checklist: Mapping[str, str] | None) -> bool:
    if os.environ.get("PUBLISH_REASONING_TRACE") != "true":
        return False
    lab = (label or "").strip()
    if lab == "INVALID" or lab.startswith("INVALID") or not lab:
        return False
    for value in (checklist or {}).values():
        if value in ("DATA-GAP", "DATA_GAP", "UNCHECKED"):
            return False
    return True
