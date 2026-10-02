"""Two finding lists in, one reconciliation out. A contradiction is kept, not resolved."""
from __future__ import annotations

from typing import Any


def reconcile(left: list[dict[str, Any]], right: list[dict[str, Any]]) -> dict[str, Any]:
    lmap = {row["id"]: row for row in left}
    rmap = {row["id"]: row for row in right}
    contradictions = []
    for key in sorted(set(lmap) & set(rmap)):
        if lmap[key].get("status") != rmap[key].get("status"):
            contradictions.append({
                "id": key,
                "left": lmap[key].get("status"),
                "right": rmap[key].get("status"),
                "resolved": False,
            })
    return {
        "contradictions": contradictions,
        "only_left": sorted(set(lmap) - set(rmap)),
        "only_right": sorted(set(rmap) - set(lmap)),
    }
