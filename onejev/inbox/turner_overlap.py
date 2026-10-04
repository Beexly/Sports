# Are the two Turner trees duplicates of each other?
#
# The user said "if there are clear dupes, which I know there are, then remove
# turner -- just be smart." That is conditional, so the condition gets tested
# rather than assumed.
#
# A 45,241-file tree cannot be a duplicate of a 636-file tree, so the likely
# shapes are:
#   (a) quarantine is a strict SUBSET of the big tree -> deleting quarantine loses
#       nothing, but it is also the only copy marked privileged
#   (b) they overlap partially -> neither can go
#   (c) they are disjoint -> deleting either loses unique material
# Content hashing settles it. Read-only: nothing is deleted by this script.

import hashlib
import json
import os
from collections import Counter

HOME = r"C:\Users\Garrett"
A = os.path.join(HOME, "Turner_Case_AI", "03_quarantine_DO_NOT_INGEST")
B = os.path.join(
    HOME, "Documents", "Codex", "2026-06-05", "files-mentioned-by-the-user-codex",
    "outputs", "Turner_Attorney_REBUILD_MAX_CONTEXT_2026-06-05",
)
OUT = os.path.join(HOME, "onejev", "inbox", "_target", "turner-overlap.json")


def hashes(root, cap_bytes=4 * 1024 * 1024):
    """content-hash every file. cap guards against a pathological giant."""
    seen = {}
    skipped = 0
    for dirpath, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        for fn in files:
            p = os.path.join(dirpath, fn)
            try:
                st = os.stat(p)
                if st.st_size > cap_bytes:
                    skipped += 1
                    continue
                h = hashlib.sha256()
                with open(p, "rb") as fh:
                    for chunk in iter(lambda: fh.read(262144), b""):
                        h.update(chunk)
            except OSError:
                continue
            seen.setdefault(h.hexdigest(), []).append(p)
    return seen, skipped


def main():
    ha, sa = hashes(A)
    hb, sb = hashes(B)
    inter = set(ha) & set(hb)
    only_a = set(ha) - set(hb)
    only_b = set(hb) - set(ha)

    def files(m):
        # m may be the hash->[paths] map or a plain set of hashes
        if isinstance(m, dict):
            return sum(len(v) for v in m.values())
        return len(m)

    report = {
        "quarantine_A": {
            "files": files(ha), "unique_contents": len(ha),
            "skipped_oversize": sa, "path": A,
        },
        "bigtree_B": {
            "files": files(hb), "unique_contents": len(hb),
            "skipped_oversize": sb, "path": B,
        },
        "shared_content_hashes": len(inter),
        "only_in_quarantine_A": {"contents": len(only_a), "files": files(only_a)},
        "only_in_B": {"contents": len(only_b), "files": files(only_b)},
    }
    a_is_subset = not only_a
    report["A_is_subset_of_B"] = a_is_subset
    report["VERDICT"] = (
        "A is a strict subset of B by content -- every quarantined file also "
        "exists in the big tree"
        if a_is_subset else
        "A holds %d content-hashes absent from B -- deleting A would lose material"
        % len(only_a)
    )
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    print(json.dumps(report, indent=2))
    print("\nsample of quarantine-only files:")
    for h in list(only_a)[:8]:
        print("   ", ha[h][0])


if __name__ == "__main__":
    main()