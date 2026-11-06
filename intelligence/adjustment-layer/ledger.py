"""
ledger.py — the shadow adjustment ledger (append-only JSONL, hash-chained).

Adjustment records are reasoning-layer artifacts at weight 0. The ledger
is their receipt — the spec's standing rule is "every adjustment logged
with its trigger; the lineage table is the receipt". This ledger makes
that receipt tamper-evident and replay-safe:

- Each line is {seq, prev_hash, record, line_hash} where
  line_hash = sha256(prev_hash + canonical_json(record)).
- append_records() first verifies the whole existing chain and REFUSES
  to append to a ledger whose chain does not verify (fail-closed: a
  tampered ledger is evidence, and new records are never piled onto
  broken evidence).
- Appending is idempotent by record_id: replaying the same run appends
  nothing. Records are never edited or removed by this module — there is
  no update or delete path at all.
"""

import hashlib
import json
import os

GENESIS = "GENESIS"


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _line_hash(prev_hash, record):
    return hashlib.sha256((prev_hash + canonical(record)).encode("utf-8")).hexdigest()


def read_lines(path):
    if not os.path.exists(path):
        return []
    out = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def verify(path):
    """Return a list of integrity problems (empty == intact)."""
    problems = []
    prev = GENESIS
    seen_ids = set()
    for i, entry in enumerate(read_lines(path)):
        expected_seq = i + 1
        if entry.get("seq") != expected_seq:
            problems.append("line %d: seq is %r, expected %d" % (i + 1, entry.get("seq"), expected_seq))
        if entry.get("prev_hash") != prev:
            problems.append("line %d: prev_hash does not match the previous line's hash (chain broken)" % (i + 1))
        record = entry.get("record") or {}
        if _line_hash(prev, record) != entry.get("line_hash"):
            problems.append("line %d: line_hash mismatch (record content was altered after append)" % (i + 1))
        rid = record.get("record_id")
        if rid in seen_ids:
            problems.append("line %d: duplicate record_id %r" % (i + 1, rid))
        seen_ids.add(rid)
        prev = entry.get("line_hash")
    return problems


def append_records(path, records):
    """Append new records to the ledger. Returns (appended, skipped).

    Refuses (raises) if the existing ledger fails verification.
    Idempotent: records whose record_id is already present are skipped."""
    problems = verify(path)
    if problems:
        raise ValueError("ledger %s fails integrity verification; refusing to append: %s" % (path, problems))
    existing = read_lines(path)
    seen_ids = {(e.get("record") or {}).get("record_id") for e in existing}
    prev = existing[-1]["line_hash"] if existing else GENESIS
    seq = len(existing)
    appended, skipped = 0, 0
    with open(path, "a") as f:
        for record in records:
            if record["record_id"] in seen_ids:
                skipped += 1
                continue
            seq += 1
            line_hash = _line_hash(prev, record)
            f.write(canonical({"seq": seq, "prev_hash": prev, "record": record, "line_hash": line_hash}) + "\n")
            prev = line_hash
            seen_ids.add(record["record_id"])
            appended += 1
    return appended, skipped
