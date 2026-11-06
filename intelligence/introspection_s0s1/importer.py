"""Importer: legacy premise records -> the SPEC-C §1.9 store.

Two sources exist today, both predating SPEC-C:

  1. The bridge model's SEA@DEN premise instance
     (intelligence/situational-graph/bridge, branch motif/bridge-model-2026-10-15):
     5 premises in the bridge's own shape (direction / magnitude band /
     confidence class / evidence) — no stated probability, no machine-readable
     resolution criterion, no adjustment-family registration.
  2. The premise-grading ledger's seeded records
     (intelligence/situational-graph/premise-grading, branch
     motif/premise-grading-2026-10-15): 8 records — the same 5 bridge
     premises (deduped, with the WO-0 Layer-2 read linked as a second source
     on two of them) plus 3 WO-0-only premises. Its records must be importable
     into this store; this importer is that path. The grading ledger's schema
     is NOT duplicated here — its fields are mapped onto the §1.1 record.

Under §1.1, a premise with no stated `p` or no machine-readable `resolution`
is UNRESOLVABLE: stored, never graded. Every record from both sources is
therefore expected to import as UNRESOLVABLE; the import report says exactly
how many imported clean vs flagged, and why, per premise.
"""

from __future__ import annotations

import json
import os

from . import premise as premise_mod
from .store import Store, sha256_hex


def _from_bridge(doc: dict) -> list:
    out = []
    for p in doc.get("premises", []):
        out.append(
            {
                "premise_id": p["premise_id"],
                "game_id": p.get("game"),
                "statement": p.get("statement"),
                "legacy": {
                    "source": "bridge_model",
                    "source_kind": p.get("kind"),
                    "rule": (p.get("trace") or {}).get("rule_id"),
                    "rule_version": (p.get("trace") or {}).get("rule_version"),
                    "registered_signals": (p.get("trace") or {}).get("registered_signals"),
                    "direction": p.get("direction"),
                    "magnitude_band": p.get("magnitude_band"),
                    "confidence_class": p.get("confidence_class"),
                    "subject": p.get("subject"),
                    "evidence_as_of": p.get("as_of"),
                    "stated_uncertainty": None,
                    "notes": None,
                },
            }
        )
    return out


def _from_grading_ledger(records: list) -> list:
    out = []
    for r in records:
        out.append(
            {
                "premise_id": r["premise_id"],
                "game_id": r.get("game_key"),
                "statement": r.get("statement"),
                "legacy": {
                    "source": "premise_grading_ledger",
                    "source_kind": r.get("premise_type"),
                    "rule": None,
                    "rule_version": r.get("record_version"),
                    "registered_signals": None,
                    "direction": r.get("direction"),
                    "magnitude_band": r.get("magnitude_band"),
                    "confidence_class": r.get("confidence_class"),
                    "subject": r.get("subject"),
                    "evidence_as_of": r.get("as_of"),
                    "stated_uncertainty": r.get("stated_uncertainty"),
                    "notes": r.get("notes"),
                    "sources": r.get("sources"),
                },
            }
        )
    return out


def import_sources(store: Store, bridge_doc: dict, grading_records: list) -> dict:
    """Merge both sources (dedupe by premise_id; the grading-ledger record is
    canonical where both exist, since it already links the bridge source) and
    validate each merged premise in import mode.

    Returns the import report. Does not write anything.
    """
    merged = {}
    order = []
    source_counts = {"bridge_model": 0, "premise_grading_ledger": 0}
    for rec in _from_bridge(bridge_doc):
        source_counts["bridge_model"] += 1
        if rec["premise_id"] not in merged:
            merged[rec["premise_id"]] = rec
            order.append(rec["premise_id"])
    duplicates = 0
    for rec in _from_grading_ledger(grading_records):
        source_counts["premise_grading_ledger"] += 1
        if rec["premise_id"] in merged:
            duplicates += 1
            merged[rec["premise_id"]] = rec  # ledger record is canonical
        else:
            merged[rec["premise_id"]] = rec
            order.append(rec["premise_id"])

    quantities = premise_mod.load_quantities()
    premise_types = premise_mod.load_premise_types()
    stored = []
    clean = 0
    flagged = 0
    for pid in order:
        rec = merged[pid]
        # Map onto the §1.1 shape for validation. Legacy records carry no
        # family/type_id/AFFECTED/p/resolution — the validator reports that.
        candidate = {
            "premise_id": rec["premise_id"],
            "game_id": rec["game_id"],
            "family": None,
            "type_id": None,
            "TRIGGER": rec["legacy"].get("source_kind"),
            "AFFECTED": None,
            "DIRECTION": None,
            "MAGNITUDE": rec["legacy"].get("magnitude_band"),
            "p": None,
            "resolution": None,
            "LOG": rec["statement"],
        }
        verdict = premise_mod.validate_premise(candidate, quantities, premise_types)
        if verdict["gradeable"]:
            clean += 1
            status = "RESOLVABLE"
        else:
            flagged += 1
            status = "UNRESOLVABLE"
        stored.append(
            {
                "premise_id": rec["premise_id"],
                "game_id": rec["game_id"],
                "family": None,
                "type_id": None,
                "TRIGGER": rec["legacy"].get("source_kind"),
                "AFFECTED": None,
                "DIRECTION": None,
                "MAGNITUDE": rec["legacy"].get("magnitude_band"),
                "p": None,
                "resolution": None,
                "LOG": rec["statement"],
                "status": status,
                "gradeable": verdict["gradeable"],
                "unresolvable_reasons": verdict["unresolvable_reasons"],
                "legacy": rec["legacy"],
            }
        )

    report = {
        "source_records_read": source_counts,
        "duplicates_linked": duplicates,
        "premises_stored": len(stored),
        "imported_clean": clean,
        "imported_flagged_unresolvable": flagged,
        "flag_reasons_summary": (
            "Every seeded premise predates SPEC-C: none carries a stated probability p, "
            "none carries a machine-readable resolution criterion, and none is registered "
            "to one of the 7 adjustment families / premise types. All store as UNRESOLVABLE "
            "(stored, never graded) per §1.1.1."
        ),
    }
    return {"premises": stored, "report": report}


def inputs_hash(*blobs: bytes) -> str:
    h = sha256_hex(b"".join(blobs))
    return h


def load_bridge_doc(path: str) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def load_grading_records(path: str) -> list:
    records = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                records.append(json.loads(line))
    return records
