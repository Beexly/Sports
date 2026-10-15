"""Chain-verification CLI: `python3 -m src.verify_chain <store_root>`.

Walks every hash chain in the store (JSONL chains and dossier version
chains) and reports any break or tamper. Exit code 0 = intact, 1 = problems.
"""

from __future__ import annotations

import sys

from .store import Store


def main(argv=None) -> int:
    argv = list(sys.argv[1:] if argv is None else argv)
    if len(argv) != 1:
        print("usage: python3 -m src.verify_chain <store_root>", file=sys.stderr)
        return 2
    store = Store(argv[0])
    problems = store.verify_all()
    # dossier version chains (prev_sha linkage between versions)
    import os

    dossiers = os.path.join(argv[0], "dossiers")
    for dirpath, _dirs, files in os.walk(dossiers):
        versions = sorted(f for f in files if f.startswith("v") and f.endswith(".json"))
        if not versions:
            continue
        parts = os.path.relpath(dirpath, dossiers).split(os.sep)
        season, week, game_id = parts[0], parts[1], parts[2]
        problems.extend(store.verify_dossier_chain(season, week, game_id))
    if problems:
        print(f"CHAIN VERIFICATION FAILED: {len(problems)} problem(s)")
        for p in problems:
            print(f"  - {p}")
        return 1
    print("CHAIN VERIFICATION OK: all chains intact")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
