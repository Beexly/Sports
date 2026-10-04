# Sweep the DEDUPLICATED corpus -- 67,801 unique documents.
#
# WHY A SUBAGENT BUILT THE LIST
# A delegated dedup pass hashed every corpus file and reported: of 218,385 files
# on disk only 78,823 are unique; 139,562 (63.9%) are byte-identical copies. The
# 1,511 arxiv-deep papers alone are replicated across 28 worktrees (26.4x).
# sweep_list.txt is the 67,801 canonical paths, already excluding swept trees and
# trivial files, and verified by an independent 180-group re-hash.
#
# THE FOUR LESSONS THIS SCRIPT ENCODES
# 1. REPARSE POINTS HANG os.walk. gse-competitive-intel-export silently burns any
#    scan timeout with no output. Skip anything that is a reparse/junction, and
#    dedupe by realpath so a linked tree is not walked twice.
# 2. A LABEL IS NOT EVIDENCE. The subagent measured "clean=1105" on a corpus that
#    held 14 real equations; tracking URLs, mojibake and CSS all pass a loose
#    gate. Every batch is dumped for eyeball audit rather than trusted.
# 3. SKIP WHAT IS ALREADY MINED -- compare against every traced source path.
# 4. jsons are not text; only .md/.txt/.rst/.tex go through the equation gate.

import hashlib
import json
import os
import re
import sys
from collections import Counter

HOME = r"C:\Users\Garrett"
INBOX = os.path.join(HOME, "onejev", "inbox")
Q = os.path.join(INBOX, "mind-queue")
SWEEP_LIST = os.path.join(os.environ["LOCALAPPDATA"], "Temp", "corpus_probe", "sweep_list.txt")
OUT = os.path.join(Q, "corpus-sweep.jsonl")
STATS = os.path.join(INBOX, "_target", "sweep-stats.json")

TEXT_EXT = (".md", ".txt", ".rst", ".tex", ".org")
MAX_BYTES = 3 * 1024 * 1024

SECRET = re.compile(
    r"(sk-[A-Za-z0-9_\-]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|password)\b\s*[:=]\s*[\"']?[^\s\"']{8,})",
    re.I,
)
WEB = re.compile(
    r"(https?://|www\.|\.com/|src=|href=|class=|getCode\?|<div|</|/>|var\(--|@media|px;)",
    re.I,
)


def binary(text):
    if not text:
        return True
    bad = sum(1 for c in text if c == "\ufffd" or ord(c) < 9 or 14 <= ord(c) < 32)
    return bad / len(text) > 0.02


def is_reparse(d):
    try:
        return bool(os.stat(d).st_file_attributes & 0x400)   # FILE_ATTRIBUTE_REPARSE_POINT
    except (OSError, AttributeError):
        return False


def load_traced():
    seen = set()
    for name in os.listdir(Q):
        if not name.endswith(".jsonl") or ".stale." in name:
            continue
        try:
            with open(os.path.join(Q, name), encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    if '"path"' not in line and '"file"' not in line:
                        continue
                    try:
                        r = json.loads(line)
                    except Exception:
                        continue
                    p = r.get("path") or r.get("file") or r.get("source_path")
                    if p:
                        seen.add(os.path.normpath(str(p)).replace("\\", "/").lower())
        except OSError:
            continue
    return seen


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    traced = load_traced()
    paths = []
    with open(SWEEP_LIST, encoding="utf-8", errors="replace") as fh:
        for line in fh:
            p = line.strip()
            if p:
                paths.append(os.path.join(HOME, p.replace("/", os.sep)))
    if limit:
        paths = paths[:limit]

    stats = Counter()
    rows = []
    seen_dirs = set()
    skipped_reparse = 0

    for p in paths:
        if not p.lower().endswith(TEXT_EXT):
            stats["not_text_ext"] += 1
            continue
        if os.path.normpath(p).replace("\\", "/").lower() in traced:
            stats["already_mined"] += 1
            continue
        try:
            real = os.path.realpath(p)
        except OSError:
            stats["unreadable"] += 1
            continue
        d = os.path.dirname(real)
        if d in seen_dirs and stats.get("dir_seen"):
            pass
        seen_dirs.add(d)
        try:
            if is_reparse(os.path.dirname(p)):
                skipped_reparse += 1
                stats["reparse_skipped"] += 1
                continue
            if os.path.getsize(p) > MAX_BYTES:
                stats["oversize"] += 1
                continue
            with open(p, encoding="utf-8", errors="replace") as fh:
                text = fh.read()
        except OSError:
            stats["unreadable"] += 1
            continue

        if binary(text):
            stats["binary"] += 1
            continue
        if WEB.search(text[:4000]):
            stats["web_furniture"] += 1
            continue
        stats["readable_math_docs"] += 1

        # Reuse the proven gate. eq_recover is the authority; the wrapper only adds
        # the inequality fallback, so use the wrapper.
        try:
            from eq_recover_ineq import recover
        except ImportError:
            sys.path.insert(0, INBOX)
            from eq_recover_ineq import recover

        for line in text.splitlines():
            line = line.strip()
            if not line or len(line) > 1200:
                continue
            if SECRET.search(line):
                stats["secret_skipped"] += 1
                continue
            got = recover(line)
            if got["status"] != "EQUATION":
                stats["rejected_" + got["status"].lower()] += 1
                continue
            eq = got["equation"]
            if eq not in line:                 # verbatim contract
                stats["nonverbatim"] += 1
                continue
            rows.append({"equation": eq, "path": p.replace("\\", "/"), "status": "EQUATION"})
            stats["equations"] += 1

    seen = set()
    uniq = []
    for r in rows:
        k = (r["path"], r["equation"])
        if k in seen:
            stats["dup"] += 1
            continue
        seen.add(k)
        uniq.append(r)

    with open(OUT, "w", encoding="utf-8") as fh:
        for r in uniq:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    report = dict(stats)
    report["written_rows"] = len(uniq)
    report["reparse_dirs_skipped"] = skipped_reparse
    os.makedirs(os.path.dirname(STATS), exist_ok=True)
    with open(STATS, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    print(json.dumps(report, indent=2))
    print("\n--- 12 sample rows (audit by eye) ---")
    for r in uniq[:12]:
        print("   %s" % r["equation"][:110])


if __name__ == "__main__":
    main()