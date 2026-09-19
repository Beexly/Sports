#!/usr/bin/env python3
"""One-command MIMO stats suite. Strength: fleet never has to remember four paths."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PY = sys.executable


def run(mod: str, inp: Path, out: Path) -> dict:
    cmd = [PY, str(HERE / mod), "--input", str(inp), "--out", str(out)]
    p = subprocess.run(cmd, capture_output=True, text=True)
    return {
        "module": mod,
        "exit": p.returncode,
        "stdout": (p.stdout or "")[-2000:],
        "stderr": (p.stderr or "")[-500:],
        "out": str(out),
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--input",
        default=str(HERE / "incoming" / "board-export.jsonl"),
        help="board-export.jsonl path",
    )
    ap.add_argument("--outdir", default=str(HERE / "out"))
    args = ap.parse_args()
    inp = Path(args.input)
    outdir = Path(args.outdir)
    outdir.mkdir(parents=True, exist_ok=True)

    results = []
    if not inp.exists():
        # Still emit DATA_BLOCKED artifacts so the fleet sees a stable path
        for mod, name in [
            ("books_mondrian.py", "mondrian-books-export.json"),
            ("ordering_duel.py", "ordering-duel-export.json"),
            ("jackknife_plus_margins.py", "jackknife-plus-margins.json"),
            ("ncaaf_zero_book_eval.py", "ncaaf-ml-0book-test.json"),
        ]:
            results.append(run(mod, inp, outdir / name))
        summary = {
            "ok": False,
            "status": "DATA_BLOCKED",
            "input": str(inp),
            "note": "Drop board-export.jsonl then re-run this suite.",
            "results": results,
        }
        (outdir / "mimo-suite-summary.json").write_text(
            __import__("json").dumps(
                {**summary, "results": [{k: v for k, v in r.items() if k != "stdout"} | {"stdout_tail": r["stdout"][:200]} for r in results]},
                indent=2,
            ),
            encoding="utf-8",
        )
        print("DATA_BLOCKED", inp)
        return 2

    results.append(run("books_mondrian.py", inp, outdir / "mondrian-books-export.json"))
    results.append(run("ordering_duel.py", inp, outdir / "ordering-duel-export.json"))
    results.append(run("jackknife_plus_margins.py", inp, outdir / "jackknife-plus-margins.json"))
    results.append(run("ncaaf_zero_book_eval.py", inp, outdir / "ncaaf-ml-0book-test.json"))
    summary = {"ok": all(r["exit"] == 0 for r in results), "input": str(inp), "results": [
        {k: v for k, v in r.items() if k != "stdout"} | {"stdout_tail": r["stdout"][:200]} for r in results
    ]}
    (outdir / "mimo-suite-summary.json").write_text(__import__("json").dumps(summary, indent=2), encoding="utf-8")
    print("suite done", summary["ok"], "out", outdir)
    return 0 if summary["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
