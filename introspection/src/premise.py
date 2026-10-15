"""SPEC-C §1.1 premise schema: validator + registries.

A premise record (the unit everything is graded on) reuses the adjustment
layer's grammar (TRIGGER -> AFFECTED -> DIRECTION -> MAGNITUDE -> LOG) and
adds two things: a mandatory stated probability `p` and a machine-readable
`resolution` criterion.

Write-time rules (SPEC-C §1.1.1 / §1.1.2):
  * `p` is mandatory and must lie in [0.01, 0.99]. In strict (live-authoring)
    mode a premise without a valid `p` is REJECTED at write time.
  * `resolution` must be machine-readable: {quantity, comparator, threshold,
    source, resolve_by_utc}. Its quantity must equal AFFECTED, and AFFECTED
    must exist in the resolvable-quantity registry (§1.4).
  * `family` must be one of the 7 adjustment families and `type_id` a
    registered premise type of that family (§1.6).
  * A premise failing any of these is UNRESOLVABLE: it may still be STORED
    (import mode — e.g. legacy records that predate SPEC-C) but it is never
    graded. UNRESOLVABLE is a stored status, not a deletion.
"""

from __future__ import annotations

import json
import os

_REGISTRY_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "registry")

COMPARATORS = frozenset({"lt", "lte", "gt", "gte", "eq", "between"})
DIRECTIONS = frozenset({-1, 0, 1})


def load_quantities(path: str = None) -> dict:
    with open(path or os.path.join(_REGISTRY_DIR, "resolvable_quantities.json"), encoding="utf-8") as fh:
        doc = json.load(fh)
    return {q["id"]: q for q in doc["quantities"]}


def load_premise_types(path: str = None) -> dict:
    with open(path or os.path.join(_REGISTRY_DIR, "premise_types.json"), encoding="utf-8") as fh:
        doc = json.load(fh)
    return {
        "families": list(doc["families"]),
        "types": {t["type_id"]: t for t in doc["types"]},
        "version": doc["version"],
    }


def _has_tz(value) -> bool:
    return isinstance(value, str) and (value.endswith("Z") or "+" in value[10:] or "-" in value[10:])


def validate_premise(premise: dict, quantities: dict = None, premise_types: dict = None) -> dict:
    """Validate one premise record against §1.

    Returns a verdict:
      {
        "gradeable": bool,            # may enter grading (all rules pass)
        "strict_ok": bool,            # may be written in strict (live) mode
        "errors": [...],              # hard structural problems
        "unresolvable_reasons": [...],# why it stores as UNRESOLVABLE
      }
    """
    quantities = quantities if quantities is not None else load_quantities()
    premise_types = premise_types if premise_types is not None else load_premise_types()
    errors = []
    reasons = []

    for field in ("premise_id", "game_id", "TRIGGER", "DIRECTION", "LOG"):
        if premise.get(field) in (None, ""):
            errors.append(f"missing required field: {field}")

    direction = premise.get("DIRECTION")
    if direction is not None and direction not in (-1, 0, 1, "-1", "0", "1"):
        errors.append(f"DIRECTION must be a sign (-1, 0, 1), got {direction!r}")

    # family / type registration (§1.1, §1.6)
    family = premise.get("family")
    type_id = premise.get("type_id")
    if family not in premise_types["families"]:
        reasons.append(f"family {family!r} is not one of the 7 registered adjustment families")
    if type_id not in premise_types["types"]:
        reasons.append(f"type_id {type_id!r} is not a registered premise type")
    elif family in premise_types["families"] and premise_types["types"][type_id]["family"] != family:
        reasons.append(
            f"type_id {type_id!r} belongs to family {premise_types['types'][type_id]['family']!r}, not {family!r}"
        )

    # AFFECTED must be a resolvable quantity (§1.4)
    affected = premise.get("AFFECTED")
    if affected not in quantities:
        reasons.append(f"AFFECTED {affected!r} is not in the resolvable-quantity registry (§1.4)")

    # stated probability (§1.1.2)
    p = premise.get("p")
    if p is None:
        reasons.append("no stated probability p (§1.1.2: p is mandatory)")
    elif not isinstance(p, (int, float)) or isinstance(p, bool) or not (0.01 <= float(p) <= 0.99):
        reasons.append(f"stated probability p={p!r} is outside [0.01, 0.99]")

    # machine-readable resolution (§1.1)
    resolution = premise.get("resolution")
    if not isinstance(resolution, dict):
        reasons.append("no machine-readable resolution criterion (§1.1)")
    else:
        for field in ("quantity", "comparator", "threshold", "source", "resolve_by_utc"):
            if resolution.get(field) in (None, ""):
                reasons.append(f"resolution.{field} is missing")
        if resolution.get("quantity") not in quantities:
            reasons.append(f"resolution.quantity {resolution.get('quantity')!r} is not in the registry (§1.4)")
        if affected in quantities and resolution.get("quantity") != affected:
            reasons.append("resolution.quantity does not equal AFFECTED")
        if resolution.get("comparator") not in COMPARATORS:
            reasons.append(f"resolution.comparator {resolution.get('comparator')!r} is not a known comparator")
        if not _has_tz(resolution.get("resolve_by_utc")):
            reasons.append("resolution.resolve_by_utc lacks an explicit timezone designator")

    gradeable = not errors and not reasons
    return {
        "gradeable": gradeable,
        "strict_ok": gradeable,
        "errors": errors,
        "unresolvable_reasons": reasons,
    }


class PremiseRejected(ValueError):
    """Raised when a strict (live-authoring) write fails §1 validation."""


def assert_strict(premise: dict, quantities: dict = None, premise_types: dict = None) -> dict:
    verdict = validate_premise(premise, quantities, premise_types)
    if not verdict["strict_ok"]:
        raise PremiseRejected(
            "premise rejected at write time (SPEC-C §1.1): "
            + "; ".join(verdict["errors"] + verdict["unresolvable_reasons"])
        )
    return verdict
