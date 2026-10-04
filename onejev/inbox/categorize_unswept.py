# Categorise the un-swept corpus before extracting, so the sweep lands on math.
#
# WHY: my own gse-competitive-intel extraction wrote 1,099 "equations" of which a
# random sample showed binary mojibake, tracking URLs and "[Start a trial]".
# That corpus is scraped web pages with a .md extension. Sweeping 55,701 docs
# blindly would repeat that mistake at scale.
#
# This walks the home tree, skips vendor/tooling/cache dirs, hashes each file to
# collapse byte-identical worktree copies, and reports each category with a
# measured math-density sample. Output: _target/unswept-categorised.jsonl
#
# Run:  python categorize_unswept.py --apply

import hashlib
import json
import os
import re
import sys
from collections import defaultdict

HOME = "C:/Users/Garrett"
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_target")
OUT = os.path.join(OUT_DIR, "unswept-categorised.jsonl")
SAMPLE_BYTES = 8192

# Already ingested into gated pools -> never re-extract.
DONE_ROOTS = (
    "Sports/docs", "Sports-wt-engineplan/docs",
    "agent-bus/research/arxiv-sweep/fulltext",
    "agent-bus/research/corpus-intelligence",
)

# Vendor, tooling, caches, and directories measured as junk this session.
EXCLUDE_DIRS = {
    "node_modules", ".git", "AppData", "site-packages", ".venv", "venv",
    "__pycache__", ".next", "dist", "build", ".cache", ".bun", ".pnpm-store",
    ".npm", ".cargo", ".rustup", "target", ".gradle", "vendor",
    ".claude/plugins", ".codex", ".gemini", ".antigravity-ide",
    "OneDriveTemp", "$Recycle.Bin", "System Volume Information",
    "Windows", "Program Files", "Program Files (x86)", "ProgramData",
}
EXCLUDE_PATH_FRAGMENTS = (
    "/.agents/skills/", "/.claude/skills/", "/.codebuddy/", "/.gemini/",
    "/.cursor/", "/.windsurf/", "/.vscode/", "/node_modules/",
    "/.sports-scrub-", "/gse-competitive-intel", "/gse-competitive-intel-export",
    "/Turner_Case_AI/", "/Downloads/", "/.mcp-auth", "/.codegraph",
)
DOC_EXT = (".md", ".txt", ".markdown", ".rst")

MATHY = re.compile(r"[=∑∏∫∂√≈≤≥]|\\[A-Za-z]{2,}")
GREEK = re.compile(r"[α-ωΑ-Ω]")
URL = re.compile(r"https?://|\.com/|www\.")


def category(path):
    low = "/" + path.replace("\\", "/").lower()
    for frag in EXCLUDE_PATH_FRAGMENTS:
        if frag in low:
            return "excluded_junk_or_tooling"
    parts = set(path.replace("\\", "/").split("/"))
    if parts & EXCLUDE_DIRS:
        return "excluded_vendor"
    if any(r in low for r in DONE_ROOTS):
        return "already_ingested"
    if low.startswith("/onedrive/academy-corpus"):
        return "course_material"
    if low.startswith("/desktop/") or low.startswith("/documents/"):
        return "personal_docs"
    if low.startswith("/_research/") or low.startswith("/repos/"):
        return "research_or_vendor_repo"
    return "other"


def sniff(text):
    lines = text.splitlines()
    n = len(lines) or 1
    return {
        "lines": n,
        "math_lines": sum(1 for l in lines if MATHY.search(l)),
        "greek_lines": sum(1 for l in lines if GREEK.search(l)),
        "url_lines": sum(1 for l in lines if URL.search(l)),
        "eq_count": text.count("="),
    }


def walk_docs():
    for dirpath, dirnames, filenames in os.walk(HOME):
        dirnames[:] = [d for d in dirnames
                        if d not in EXCLUDE_DIRS and not d.startswith(".git")]
        for fn in filenames:
            if not fn.lower().endswith(DOC_EXT):
                continue
            yield os.path.join(dirpath, fn).replace("\\", "/")


def main(apply_changes):
    os.makedirs(OUT_DIR, exist_ok=True)
    by_hash = {}
    cats = defaultdict(int)
    out_rows = []
    seen = 0
    for path in walk_docs():
        seen += 1
        cat = category(path)
        if cat == "already_ingested":
            cats[cat] += 1
            continue
        try:
            with open(path, "rb") as fh:
                head = fh.read(SAMPLE_BYTES)
                fh.seek(0, os.SEEK_END)
                size = fh.tell()
        except Exception:
            cats["unreadable"] += 1
            continue
        if not head.strip():
            cats["empty"] += 1
            continue
        h = hashlib.sha1(head + str(size).encode()).hexdigest()
        rep = by_hash.get(h)
        if rep is not None:
            rep["copies"] += 1
            continue
        try:
            text = head.decode("utf-8", "replace")
        except Exception:
            text = ""
        st = sniff(text)
        rec = {"path": path, "category": cat, "bytes": size, "hash": h,
               "copies": 1, **st}
        rec["math_pct"] = round(100.0 * st["math_lines"] / max(1, st["lines"]), 2)
        rec["url_pct"] = round(100.0 * st["url_lines"] / max(1, st["lines"]), 2)
        by_hash[h] = rec
        cats[cat] += 1
        out_rows.append(rec)
        if apply_changes and len(out_rows) % 2000 == 0:
            print("   ...%d unique so far" % len(out_rows), flush=True)

    out_rows.sort(key=lambda r: (-r["math_pct"], -r["greek_lines"]))
    with open(OUT, "w", encoding="utf-8") as fh:
        for r in out_rows:
            fh.write(json.dumps(r, ensure_ascii=False) + "\n")

    print("docs walked          : %d" % seen)
    print("unique (hash-collapsed): %d" % len(out_rows))
    print("duplicate copies     : %d" % sum(r["copies"] - 1 for r in out_rows))
    print("\nby category:")
    for k, v in sorted(cats.items(), key=lambda kv: -kv[1]):
        print("   %-28s %7d" % (k, v))

    print("\nTOP 20 BY MATH DENSITY (unique docs):")
    for r in out_rows[:20]:
        print("   %6.2f%%  greek=%-4d url=%5.1f%%  %s"
              % (r["math_pct"], r["greek_lines"], r["url_pct"],
                 r["path"].replace(HOME + "/", "")[:78]))
    print("\nwrote %s" % OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main("--apply" in sys.argv))