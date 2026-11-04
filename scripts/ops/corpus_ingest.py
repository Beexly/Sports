"""Validated batch ingestion for research-corpus manifests, with a dead letter queue.

WHY THIS EXISTS

The corpus pipeline had no stage between "a harvester wrote a line" and "the
indexer reads it". Measured 2026-11-04:

  * corpus_index.build_index skips lines that are not valid JSON, silently.
  * A row that parses but is malformed crashes the whole build (an int title
    did exactly that) because there is no per-row isolation.
  * A row missing its title is accepted and indexed as an empty document: it
    counts toward n and is unretrievable.
  * fulltext_backfill has a failures file, but it records FETCH failures
    (network, empty payload). Nothing records SCHEMA rejects.

So a rejected row either vanished or took the run with it. Neither is acceptable
in a pipeline whose only job is to produce a trustworthy corpus.

This is the missing stage: validate every row against corpus_contract, route it
to an accept sink or a dead letter queue, and report counts. Nothing is ever
dropped without a trace.

DESIGN

  * Per-row isolation. One bad row can never abort the batch; it is quarantined
    with the reason and the run continues. That is the whole point.
  * DLQ records match the existing fulltext_backfill_failures shape
    (source_id / title / error / attempted_at) plus `issues` and `stage`, so the
    two logs can be read by the same tooling.
  * Monotonic metadata on accepted rows (_validated_at, _ingest_source) per the
    pipeline convention of tracking provenance. Underscore-prefixed so it cannot
    collide with a producer field; the contract preserves unknown keys, so this
    is additive and the indexer ignores it.
  * Append-only output. Both sinks are opened "a" so an interrupted run does not
    discard completed work. De-duplication is the consolidator's job, not this
    stage's — this stage answers "is this row well-formed", not "have I seen it".
  * Exit codes separate "ran fine with some rejects" from "failed".
      0  every row accepted
      1  rows rejected, but the run completed
      2  cannot run (missing input, unreadable)
    Rejects are normal in a corpus assembled from 11 sources. Failing the whole
    pipeline because one harvester emitted a bad row would train people to ignore
    the exit code.

USAGE
    python scripts/ops/corpus_ingest.py --in data/research/a.jsonl \\
        --out data/research/clean/a.jsonl --dlq data/research/dlq/a.jsonl

    python scripts/ops/corpus_ingest.py --in data/research/*.jsonl \\
        --out data/research/clean/merged.jsonl --dlq data/research/dlq/rejects.jsonl

    # dry run: validate and report, write nothing
    python scripts/ops/corpus_ingest.py --in data/research/a.jsonl --dry-run
"""

from __future__ import annotations

import argparse
import glob
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO))

from intelligence.research.corpus_contract import (  # noqa: E402
    ERROR,
    validate_record,
)


def expand_inputs(patterns: list[str]) -> list[Path]:
    """Expand shell globs ourselves: on Windows the shell does not."""
    out: list[Path] = []
    for p in patterns:
        hits = sorted(glob.glob(p))
        if hits:
            out.extend(Path(h) for h in hits)
        else:
            out.append(Path(p))
    # De-duplicate while preserving order; a pattern may overlap an explicit path.
    seen: dict[Path, None] = {}
    for p in out:
        seen.setdefault(p.resolve(), None)
    return list(seen)


def dlq_record(row: object, issues: list, source: Path, lineno: int) -> dict:
    """A quarantine record, shaped like fulltext_backfill_failures plus context."""
    rec = row if isinstance(row, dict) else {}
    return {
        "source_file": str(source),
        "line": lineno,
        "source_id": rec.get("source_id") or rec.get("id"),
        "title": rec.get("title") if isinstance(rec.get("title"), str) else None,
        "error": "; ".join(f"{i.field}: {i.message}" for i in issues),
        "issues": [
            {"field": i.field, "severity": i.severity, "message": i.message}
            for i in issues
        ],
        "stage": "schema_validation",
        "attempted_at": datetime.now(timezone.utc).isoformat(),
        # Keep the raw row so a quarantine can be repaired rather than re-harvested.
        "raw": rec if rec else row,
    }


def ingest(paths: list[Path], out: Path | None, dlq: Path | None,
           now: str | None = None) -> dict:
    """Validate and route every row. Returns run metrics."""
    stamp = now or datetime.now(timezone.utc).isoformat()
    metrics = {
        "files": 0,
        "rows_read": 0,
        "accepted": 0,
        "rejected": 0,
        "unparseable": 0,
        "by_field": {},
        "by_file": {},
        "started_at": stamp,
    }

    out_fh = out.open("a", encoding="utf-8") if out else None
    dlq_fh = dlq.open("a", encoding="utf-8") if dlq else None
    try:
        for path in paths:
            if not path.exists():
                print(f"missing input, skipped: {path}", file=sys.stderr)
                continue
            metrics["files"] += 1
            f_acc = f_rej = 0
            with path.open("r", encoding="utf-8") as fh:
                for lineno, line in enumerate(fh, 1):
                    if not line.strip():
                        continue
                    metrics["rows_read"] += 1
                    try:
                        row = json.loads(line)
                    except json.JSONDecodeError as exc:
                        metrics["unparseable"] += 1
                        metrics["rejected"] += 1
                        f_rej += 1
                        metrics["by_field"]["<unparseable>"] = (
                            metrics["by_field"].get("<unparseable>", 0) + 1
                        )
                        if dlq_fh:
                            dlq_fh.write(json.dumps(dlq_record(
                                None,
                                [type("I", (), {"field": "<json>",
                                                "severity": ERROR,
                                                "message": exc.msg})()],
                                path, lineno,
                            )) + "\n")
                        continue

                    report = validate_record(row, index=lineno)
                    if report.ok:
                        if out_fh:
                            clean = dict(row) if isinstance(row, dict) else row
                            if isinstance(clean, dict):
                                clean["_validated_at"] = stamp
                                clean["_ingest_source"] = path.name
                            out_fh.write(json.dumps(clean, ensure_ascii=False) + "\n")
                        metrics["accepted"] += 1
                        f_acc += 1
                    else:
                        metrics["rejected"] += 1
                        f_rej += 1
                        for issue in report.issues:
                            if issue.severity == ERROR:
                                metrics["by_field"][issue.field] = (
                                    metrics["by_field"].get(issue.field, 0) + 1
                                )
                        if dlq_fh:
                            dlq_fh.write(json.dumps(
                                dlq_record(row, report.issues, path, lineno),
                                ensure_ascii=False,
                            ) + "\n")
            metrics["by_file"][path.name] = {"accepted": f_acc, "rejected": f_rej}
            if out_fh:
                out_fh.flush()
            if dlq_fh:
                dlq_fh.flush()
    finally:
        if out_fh:
            out_fh.close()
        if dlq_fh:
            dlq_fh.close()

    metrics["finished_at"] = datetime.now(timezone.utc).isoformat()
    metrics["accept_rate"] = (
        round(100.0 * metrics["accepted"] / metrics["rows_read"], 1)
        if metrics["rows_read"] else 0.0
    )
    return metrics


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--in", dest="inputs", nargs="+", required=True,
                    help="manifest path(s) or glob(s)")
    ap.add_argument("--out", help="accepted rows sink (append-only)")
    ap.add_argument("--dlq", help="dead letter queue for rejected rows (append-only)")
    ap.add_argument("--dry-run", action="store_true", help="validate only, write nothing")
    ap.add_argument("--json", action="store_true", help="emit run metrics as JSON")
    args = ap.parse_args()

    if not args.dry_run and not (args.out or args.dlq):
        print("refusing to run: pass --out and/or --dlq, or --dry-run", file=sys.stderr)
        return 2

    paths = expand_inputs(args.inputs)
    if not paths:
        print("no inputs matched", file=sys.stderr)
        return 2
    if not any(p.exists() for p in paths):
        print(f"none of the inputs exist: {[str(p) for p in paths]}", file=sys.stderr)
        return 2

    out = None if args.dry_run else (Path(args.out) if args.out else None)
    dlq = None if args.dry_run else (Path(args.dlq) if args.dlq else None)
    for p in (out, dlq):
        if p:
            p.parent.mkdir(parents=True, exist_ok=True)

    m = ingest(paths, out, dlq)

    if args.json:
        print(json.dumps(m, indent=2))
    else:
        print(f"files={m['files']} rows={m['rows_read']} "
              f"accepted={m['accepted']} rejected={m['rejected']} "
              f"accept_rate={m['accept_rate']}%")
        if m["by_field"]:
            print("rejects by field: " +
                  ", ".join(f"{k}={v}" for k, v in
                            sorted(m["by_field"].items(), key=lambda kv: -kv[1])))
        for name, c in m["by_file"].items():
            if c["rejected"]:
                print(f"  {name}: {c['accepted']} ok, {c['rejected']} rejected")
        if args.dry_run:
            print("(dry run: nothing written)")

    return 1 if m["rejected"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
