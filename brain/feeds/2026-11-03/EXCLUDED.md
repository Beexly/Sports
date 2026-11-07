# Excluded from git — trainer_feed.jsonl is local corpus

trainer_feed.jsonl here holds full extracted text of the 2026-11-03 Downloads corpus.
It is gitignored by `brain/feeds/*/trainer_feed.jsonl` (see .gitignore, line 248).

Not ingested as text:
- .zip archives (8, ~2.9 GB): recorded as ZIP_LISTING (entry names only), no recursion yet.
- Tool caches .pytest_cache and __pycache__ under Downloads: directories, not corpus.
- Duplicate content (same sha256) is recorded once under its canonical path; aliases are in the manifest.
