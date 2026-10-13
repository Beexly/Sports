"""Append a day's research-bucket files to the dated trainer feed.

The mind's trainer feed (brain/feeds/<date>/trainer_feed.jsonl) is the
trainer-ready corpus: one JSON record per document with its source, category,
path, and full text. prepare_feed.py built the 2026-10-11/13 feeds from fixed
dir lists; the mind guardian appends what IT routes from the watch roots. Files
that land directly under docs/<bucket>/research/<date>/ (live-ingest pilots,
for example) had no path into the feed until this script.

Dedupe is by `path`: a file already present in the feed is skipped, so running
this repeatedly is safe.

Usage
-----
    python brain/feeds/append_day_feed.py --date 2026-10-13 \
        --dirs docs/data-sources/research/2026-10-13/weather-pilot \
               docs/data-sources/research/2026-10-13/news-rss \
               docs/data-sources/research/2026-10-13/kalshi \
               docs/data-sources/research/2026-10-13/injuries
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
FEED_EXTS = ["*.md", "*.json", "*.txt", "*.csv", "*.xml"]


def load_existing_paths(feed_path: Path) -> set:
    paths = set()
    if not feed_path.exists():
        return paths
    with open(feed_path, "r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
                p = rec.get("path")
                if isinstance(p, str):
                    paths.add(p)
            except json.JSONDecodeError:
                continue
    return paths


def main() -> int:
    ap = argparse.ArgumentParser(description="Append day files to the dated trainer feed (dedupe by path).")
    ap.add_argument("--date", required=True, help="Feed date bucket, e.g. 2026-10-13")
    ap.add_argument("--dirs", nargs="+", required=True, help="Directories (repo-relative or absolute) to append")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    feed_path = REPO_ROOT / "brain" / "feeds" / args.date / "trainer_feed.jsonl"
    feed_path.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing_paths(feed_path)
    now = datetime.now(timezone.utc).isoformat()

    added, skipped_dupe, failed = 0, 0, []
    with open(feed_path, "a", encoding="utf-8") as out:
        for d in args.dirs:
            dpath = Path(d) if Path(d).is_absolute() else REPO_ROOT / d
            if not dpath.is_dir():
                failed.append(f"{d}: not a directory")
                continue
            for ext in FEED_EXTS:
                for fp in sorted(dpath.glob(ext)):
                    key = str(fp)
                    if key in existing:
                        skipped_dupe += 1
                        continue
                    try:
                        text = fp.read_text(encoding="utf-8", errors="ignore")
                    except Exception as exc:  # honesty: report, never invent
                        failed.append(f"{fp}: {exc}")
                        continue
                    rec = {
                        "source": fp.name,
                        "category": dpath.parts[-2] if len(dpath.parts) >= 2 else dpath.name,
                        "path": key,
                        "text": text,
                        "appended_utc": now,
                        "appended_by": "append_day_feed.py",
                    }
                    if not args.dry_run:
                        out.write(json.dumps(rec) + "\n")
                    existing.add(key)
                    added += 1
                    print(f"  + {fp.relative_to(REPO_ROOT)}")
    print(f"[append_day_feed] added={added} dupes_skipped={skipped_dupe} failed={len(failed)} -> {feed_path}")
    for f in failed:
        print(f"  ! {f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
