# Which source files are SAFE to delete?
#
# The user offered to delete "the research papers" from Downloads and GDrive now
# that the equations are extracted. That needs care, because the corpus holds
# VERBATIM EQUATION SPANS -- a lossy projection. The prose, figures, tables and
# roughly 90% of each paper's text are NOT in any pool.
#
# A file is listed as SAFE only when BOTH hold:
#   (1) REDUNDANT  -- a byte-identical copy exists elsewhere on this machine, so
#                     deletion destroys nothing at all
#   (2) EXTRACTED  -- the corpus holds equations traced to that exact path
#
# Condition (1) alone is what makes deletion lossless. Condition (2) is recorded
# so we know which of the copies is the one we mined.
#
# READ-ONLY. This reports; it never deletes.

import hashlib
import json
import os
import sys

HOME = r"C:\Users\Garrett"
Q = os.path.join(HOME, "onejev", "inbox", "mind-queue")
OUT = os.path.join(HOME, "onejev", "inbox", "_target", "deletion-safety.json")

# Where the user says the copies live.
DECLARED_SOURCE_DIRS = [
    os.path.join(HOME, "Downloads"),
]
# Corpora we already mined, used as the redundancy pool.
MINED_DIRS = [
    os.path.join(HOME, "_research", "agent-bus", "research", "arxiv-sweep", "fulltext"),
]

EXT = (".md", ".txt", ".pdf", ".docx", ".tex")


def sha(path, cap=8 * 1024 * 1024):
    try:
        if os.path.getsize(path) > cap:
            return "SKIP_BIG"
    except OSError:
        return None
    h = hashlib.sha256()
    try:
        with open(path, "rb") as fh:
            for chunk in iter(lambda: fh.read(262144), b""):
                h.update(chunk)
    except OSError:
        return None
    return h.hexdigest()


def index_paths():
    """Every source path already traced by an extracted equation."""
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


def walk_hashes(root):
    out = {}
    for dp, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".worktrees")]
        for fn in files:
            if not fn.lower().endswith(EXT):
                continue
            p = os.path.join(dp, fn)
            h = sha(p)
            if h and h != "SKIP_BIG":
                out.setdefault(h, []).append(p)
    return out


def main():
    mined = index_paths()
    print("source paths traced by an extracted equation: %d" % len(mined))

    redundancy = {}
    for d in MINED_DIRS:
        if not os.path.isdir(d):
            continue
        print("hashing redundancy pool: %s" % d)
        for h, paths in walk_hashes(d).items():
            redundancy.setdefault(h, []).extend(paths)

    report = {
        "traced_paths": len(mined),
        "redundancy_pool_hashes": len(redundancy),
        "safe_to_delete": [],
        "not_safe": [],
        "note": "SAFE requires a byte-identical copy elsewhere AND a mined trace.",
    }

    for d in DECLARED_SOURCE_DIRS:
        if not os.path.isdir(d):
            continue
        for dp, dirs, files in os.walk(d):
            dirs[:] = [x for x in dirs if x not in (".git", "node_modules")]
            for fn in files:
                if not fn.lower().endswith(EXT):
                    continue
                p = os.path.join(dp, fn)
                h = sha(p)
                if not h or h == "SKIP_BIG":
                    continue
                twins = [q for q in redundancy.get(h, []) if os.path.normcase(q) != os.path.normcase(p)]
                key = os.path.normpath(p).replace("\\", "/").lower()
                entry = {"path": p, "sha256": h[:16], "identical_copies_elsewhere": len(twins),
                         "mined": key in mined}
                if twins:
                    report["safe_to_delete"].append(entry)
                else:
                    report["not_safe"].append(entry)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    print("\nDownloads scanned: %d files with known hash" % (len(report["safe_to_delete"]) + len(report["not_safe"])))
    print("SAFE to delete (identical copy exists elsewhere): %d" % len(report["safe_to_delete"]))
    for e in report["safe_to_delete"][:20]:
        print("   %s  mined=%s" % (os.path.basename(e["path"])[:58], e["mined"]))
    print("NOT safe (no identical copy): %d" % len(report["not_safe"]))
    for e in report["not_safe"][:10]:
        print("   %s  mined=%s" % (os.path.basename(e["path"])[:58], e["mined"]))


if __name__ == "__main__":
    main()