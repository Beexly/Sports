"""Repair quarantined corpus rows and replay them into the clean sink.

WHY THIS EXISTS

corpus_ingest routes rows that fail the data contract into a dead letter queue
and preserves the raw row. Quarantine alone is only half a pipeline: the point of
keeping `raw` is that the rejections can be REPAIRED and replayed rather than
re-harvested from a network source that may no longer return them.

Measured 2026-11-04 on the real consolidated manifest: 6,928 rows, 203 rejected
(97.1% accept), every one of them a `local_doc` row with the same defect — list
fields stored as their string repr:

    topics:  "['local_doc','text']"     <- a str, not a list
    authors: "[]"                       <- a str, not a list

The contract is right to reject them; a string where a list is expected is a real
producer bug. But the values are unambiguously recoverable, and leaving them out
costs 203 documents.

WHY THIS MATTERS BEYOND REJECTION. The index tokenizes topics. A string is
iterable, so `" ".join(str(t) for t in topics)` over a STRING walks its
characters:

    "['local_doc','text']"  ->  "[ ' l o c a l _ d o c ' , ' t e x t ' ]"

Every character becomes a token. The topic signal is destroyed, and it fails
silently — a row classified from its abstract alone looks exactly like a row
classified from its abstract and topics.

DESIGN

  * Only repairs fields whose current value is a STRING that parses to a LIST.
    Nothing else is touched. A field that is already a list is left byte-identical.
  * Uses ast.literal_eval, never eval: this parses literals only and cannot
    execute code, and it accepts the single-quoted form json.loads rejects.
  * A repaired row is re-validated against the contract before it is written.
    A repair that does not actually fix the row is reported, not silently emitted.
  * Unrepairable rows stay in the DLQ. They are reported with their reason so
    the next person does not rediscover them.
  * Writes to a separate replay sink by default, so the run is auditable and
    the original clean sink can be regenerated rather than appended to blindly.

USAGE
    # report what would be repaired, write nothing
    python scripts/ops/repair_dlq.py --dlq <dlq.jsonl> --dry-run

    # repair and write a replay sink
    python scripts/ops/repair_dlq.py --dlq <dlq.jsonl> --out <repaired.jsonl>
"""

from __future__ import annotations

import argparse
import ast
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from intelligence.research.corpus_contract import validate_record  # noqa: E402

# Fields that must be lists. A str-encoded list in one of these is the defect
# this tool repairs; any other type is left for a human.
LIST_FIELDS = ("topics", "authors")


def coerce_list(value: object) -> tuple[list | None, str | None]:
    """Return (list, None) if `value` is a str encoding a list, else (None, why)."""
    if isinstance(value, list):
        return value, None  # already correct; nothing to do
    if not isinstance(value, str):
        return None, f"not a string ({type(value).__name__})"
    text = value.strip()
    if not text:
        return [], None
    try:
        parsed = ast.literal_eval(text)
    except (ValueError, SyntaxError) as exc:
        return None, f"unparseable ({exc.__class__.__name__})"
    if not isinstance(parsed, (list, tuple)):
        return None, f"parses to {type(parsed).__name__}, not a list"
    return [str(x) for x in parsed], None


def repair(row: dict) -> tuple[dict, list[str]]:
    """Return (repaired_row_copy, notes). Never mutates the input."""
    out = dict(row)
    notes: list[str] = []
    for field in LIST_FIELDS:
        if field not in out:
            continue
        if isinstance(out[field], list):
            continue
        fixed, why = coerce_list(out[field])
        if fixed is None:
            notes.append(f"{field}: cannot repair ({why})")
        else:
            notes.append(f"{field}: {type(out[field]).__name__} -> list[{len(fixed)}]")
            out[field] = fixed
    return out, notes


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Repair and replay DLQ rows")
    ap.add_argument("--dlq", type=Path, required=True)
    ap.add_argument("--out", type=Path, help="replay sink (omit with --dry-run)")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--json", action="store_true")
    args = ap.parse_args(argv)

    if not args.dlq.exists():
        print(f"missing DLQ: {args.dlq}", file=sys.stderr)
        return 2

    stamp = datetime.now(timezone.utc).isoformat()
    metrics = {
        "rows_read": 0, "repaired": 0, "still_invalid": 0,
        "skipped_non_schema": 0, "by_note": {}, "failures": [],
        "started_at": stamp,
    }

    out_lines: list[str] = []
    for line in args.dlq.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        metrics["rows_read"] += 1
        rec = json.loads(line)

        # Only schema-stage rejects are repairable here; fetch failures are not.
        if rec.get("stage") != "schema_validation":
            metrics["skipped_non_schema"] += 1
            continue

        raw = rec.get("raw")
        if not isinstance(raw, dict):
            metrics["still_invalid"] += 1
            metrics["failures"].append("raw is not an object")
            continue

        fixed, notes = repair(raw)
        for n in notes:
            key = n.split(":")[0] + ":" + n.split(":")[1].strip().split(" ")[0]
            metrics["by_note"][key] = metrics["by_note"].get(key, 0) + 1

        report = validate_record(fixed)
        if not report.ok:
            metrics["still_invalid"] += 1
            metrics["failures"].append(
                "; ".join(f"{i.field}: {i.message}" for i in report.errors))
            continue

        fixed["_repaired_at"] = stamp
        fixed["_repair_source"] = args.dlq.name
        out_lines.append(json.dumps(fixed, ensure_ascii=False))
        metrics["repaired"] += 1

    if not args.dry_run and args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text("\n".join(out_lines) + ("\n" if out_lines else ""),
                            encoding="utf-8")

    metrics["finished_at"] = datetime.now(timezone.utc).isoformat()

    if args.json:
        print(json.dumps(metrics, indent=2))
    else:
        print(f"read={metrics['rows_read']} repaired={metrics['repaired']} "
              f"still_invalid={metrics['still_invalid']} "
              f"skipped_non_schema={metrics['skipped_non_schema']}")
        if metrics["by_note"]:
            print("repairs: " + ", ".join(f"{k}={v}" for k, v in
                                          sorted(metrics["by_note"].items())))
        for f in metrics["failures"][:5]:
            print(f"  unrepairable: {f}")
        if args.dry_run:
            print("(dry run: nothing written)")
        elif args.out:
            print(f"wrote {len(out_lines)} repaired row(s) -> {args.out}")

    return 0 if metrics["still_invalid"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
