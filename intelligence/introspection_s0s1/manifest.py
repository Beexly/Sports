"""Daily manifest (SPEC-C §1.9): a SHA-256 over each day's new records.

The manifest itself is a derived artifact (written under trackrecords/ with
the hash of the generating script). Its ledger append is formatted in the
SPEC-A hypothesis-ledger format used by FREEZE-1 (ID / Date / Type /
Subject / Freeze hash / Scoring set / delta / SE / p / Status-note) and
chained into `spec_a_ledger_appends.jsonl` in this store, ready to be
appended to the SPEC-A ledger itself at its next append window (the frozen
ledger file lives with FREEZE-1's branch; this store does not edit it).
"""

from __future__ import annotations

import hashlib
import os

from .store import Store, canonical_bytes, now_utc, sha256_hex

LEDGER_APPENDS_REL = "spec_a_ledger_appends.jsonl"


def manifest_sha(record_shas: list) -> str:
    return sha256_hex("".join(sorted(record_shas)).encode("utf-8"))


def build_daily_manifest(store: Store, date_utc: str, record_shas: list, script_path: str) -> dict:
    with open(script_path, "rb") as fh:
        script_sha = sha256_hex(fh.read())
    return {
        "kind": "INTROSPECTION_DAILY_MANIFEST",
        "date_utc": date_utc,
        "records_stamped_that_day": len(record_shas),
        "record_shas": sorted(record_shas),
        "sha256": manifest_sha(record_shas),
        "generating_script": os.path.basename(script_path),
        "generating_script_sha256": script_sha,
    }


def append_ledger_entry(store: Store, manifest: dict) -> dict:
    """Append the manifest to the SPEC-A-ledger-format append chain."""
    existing = store.read_chain(LEDGER_APPENDS_REL)
    seq = len(existing) + 1
    payload = {
        "ledger_id": f"INTR-{seq:04d}",
        "date": manifest["date_utc"],
        "type": "INTEGRITY",
        "subject": "INTROSPECTION-DAILY-MANIFEST",
        "freeze_hash": manifest["sha256"],
        "scoring_set": "—",
        "delta_hat": "—",
        "se": "—",
        "p": "—",
        "status_note": (
            f"Daily manifest for {manifest['date_utc']}: SHA-256 over the day's "
            f"{manifest['records_stamped_that_day']} new introspection record(s) "
            "(SPEC-C §1.9). PLANNING/integrity append; not a look."
        ),
    }
    return store.append_jsonl(LEDGER_APPENDS_REL, payload)
