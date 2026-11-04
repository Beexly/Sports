"""Re-extract corpus records that were truncated by the ingest character cap.

WHY THIS EXISTS

The Downloads ingest capped every document at MAX_CHARS = 200,000. That is fine
for a note and destructive for a book. Measured on the live manifest:

    27 of 359 local records sit exactly at 200,000 chars -- the cap, not the end
    of the document. vmls.pdf is 7 MB and keeps 200K chars of it.
    X-ALL-SWEEPS-CONSOLIDATED.md is 2 MB and keeps roughly a tenth of itself.

A record that hits the cap is indistinguishable from a complete one by every
measure the previous audit used: the file is present, a record exists, the
source path matches. Only chars_extracted == CAP reveals it, which is why the
coverage audit reported 71.5% while 27 documents were silently cut in half.

This script re-extracts those records at a much higher cap and rewrites the
manifest in place. It does not invent text: if extraction still yields nothing
(a scanned PDF with no text layer), the record is left empty and REPORTED as
needing OCR rather than quietly accepted as complete.

USAGE
    python scripts/ops/ingest_deep_repair.py --dry-run
    python scripts/ops/ingest_deep_repair.py

Exit: 0 repaired or nothing to do, 2 cannot run.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import shutil
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
MANIFEST = Path(os.path.expanduser("~")) / "AppData" / "Local" / "hermes" / "cache" / "scratch" / "research_corpus" / "merged_manifest_2026-11-04.clean.jsonl"
INGEST_MOD = REPO / "scripts" / "research" / "ingest_downloads_audit_2026_11_04.py"

OLD_CAP = 200_000
NEW_CAP = 8_000_000


def load_ingest_module():
    """Import the ingest module by path: it holds the per-format extractors."""
    spec = importlib.util.spec_from_file_location("ingest_dl", INGEST_MOD)
    mod = importlib.util.module_from_spec(spec)
    sys.modules["ingest_dl"] = mod
    spec.loader.exec_module(mod)
    return mod


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="Re-extract cap-truncated corpus records")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--manifest", type=Path, default=MANIFEST)
    args = ap.parse_args(argv)

    if not args.manifest.is_file():
        print(f"ERROR: no manifest at {args.manifest}", file=sys.stderr)
        return 2
    if not INGEST_MOD.is_file():
        print(f"ERROR: no ingest module at {INGEST_MOD}", file=sys.stderr)
        return 2

    mod = load_ingest_module()
    mod.MAX_CHARS = NEW_CAP

    tmp = args.manifest.with_suffix(".repairing")
    repaired = failed = still_empty = kept = 0
    grown = []

    with args.manifest.open(encoding="utf-8", errors="replace") as fin, \
            tmp.open("w", encoding="utf-8") as fout:
        for line in fin:
            raw = line.rstrip("\n")
            if not raw.strip():
                continue
            try:
                d = json.loads(raw)
            except json.JSONDecodeError:
                fout.write(raw + "\n")
                kept += 1
                continue

            ce = d.get("chars_extracted") or len(d.get("full_text") or "")
            is_local = str(d.get("source", "")).startswith("local")
            at_cap = ce >= OLD_CAP - 10
            no_text = ce == 0

            if not (is_local and (at_cap or no_text)):
                fout.write(raw + "\n")
                kept += 1
                continue

            src = d.get("pdf_path")
            if not src or not Path(src).exists():
                fout.write(raw + "\n")
                kept += 1
                continue

            if args.dry_run:
                grown.append((Path(str(src)).name, ce, "dry-run"))
                fout.write(raw + "\n")
                continue

            try:
                text, method = mod.extract(Path(src))
            except Exception as exc:  # noqa: BLE001
                print(f"  FAILED {Path(str(src)).name}: {exc}", file=sys.stderr)
                failed += 1
                fout.write(raw + "\n")
                continue

            new_len = len(text or "")
            if new_len <= ce:
                # Nothing gained. A scanned PDF lands here: no text layer exists,
                # so it needs OCR, not a bigger cap.
                still_empty += 1
                grown.append((Path(str(src)).name, ce, f"no gain (method={method})"))
                fout.write(raw + "\n")
                continue

            d["full_text"] = text
            d["chars_extracted"] = new_len
            d["_deep_repaired_at"] = "2026-11-04"
            d["_extract_method"] = method
            fout.write(json.dumps(d, ensure_ascii=False) + "\n")
            repaired += 1
            grown.append((Path(str(src)).name, ce, new_len))

    if args.dry_run:
        tmp.unlink(missing_ok=True)
        print(f"dry run: {len(grown)} record(s) would be re-extracted")
        for name, before, after in grown[:30]:
            print(f"  {before:>8} -> {after:<9} {name}")
        return 0

    backup = args.manifest.with_suffix(".pre-deep-repair")
    shutil.copy2(args.manifest, backup)
    tmp.replace(args.manifest)

    print(f"repaired : {repaired}")
    print(f"no gain  : {still_empty}  (scanned PDF / no text layer - needs OCR)")
    print(f"failed   : {failed}")
    print(f"untouched: {kept}")
    print(f"backup   : {backup}")
    print()
    for name, before, after in sorted(grown, key=lambda x: -len(str(x[2])))[:30]:
        print(f"  {before:>8} -> {str(after):<10} {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
