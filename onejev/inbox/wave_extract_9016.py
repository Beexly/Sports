#!/usr/bin/env python
"""Equation extractor for waves 9016+ over the remaining Sports/docs roots.

Root:   C:/Users/Garrett/Sports/docs/{data,audit,frontier,
                                 source-providers,gates,reference}
        (.md / .txt only, 41 docs, flat -- no subdirectories)

Gate:   built on wave_extract_9015.py (which inherited it from 9004): real
        '=' plus genuine mathematics, symbol-density floor, prose/CLI/secret
        rejection. These 41 docs are code-heavy (docs/data is full of pasted
        TypeScript/SQL/env config), so the 9015 gate over-admitted: TS type
        declarations, `export const x = 1`, and comment-scarred prose all
        passed on the strength of a stray `=`. STRICT_* below rejects those
        without touching the printed-math rules.

Usage:  python wave_extract_9016.py [--dry] [--sample N]
"""
import argparse
import importlib.util
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUTDIR = "C:/Users/Garrett/onejev/inbox/mind-queue"
DOCS_ROOT = "C:/Users/Garrett/Sports/docs"
SUBDIRS = ["data", "audit", "frontier", "source-providers", "gates", "reference"]
CHUNK = 16
WAVE0 = 9016

EXPECTED = {
    "data": 25, "audit": 6, "frontier": 4,
    "source-providers": 4, "gates": 1, "reference": 1,
}
EXPECTED_TOTAL = 41

# --- strict rejections for the code-heavy docs/data cards ----------------
# A TS/SQL declaration or an env-config assignment is code, not doctrine,
# even when it contains '=' and a math-looking token.
CODE_DECL_RE = re.compile(
    r"(?:^|\s)(?:export\s+(?:type|interface|const|let|var|default|function|class)"
    r"|interface\s+\w+|declare\s+(?:module|const|function)"
    r"|readonly\s+\w+\s*:|\bimplements\b|\bnamespace\s+\w+"
    r"|=>\s*(?:\{|\(|[A-Za-z_$])|\btype\s+\w+\s*=\s*[\(\[<]"
    r"|:\s*(?:number|string|boolean|any|void|unknown|never|Promise|Array|Record)\b"
    r"|\bfunction\s+\w+\s*\(|\w+\s*\([^)]*\)\s*:\s*\w+"
    r"|\bconst\s+\w+\s*=|\blet\s+\w+\s*=|\bvar\s+\w+\s*=)",
    re.IGNORECASE,
)
# UPPER_SNAKE=value  (env config), or `KEY: value` front-matter/yaml.
ENV_ASSIGN_RE = re.compile(r"\b[A-Z][A-Z0-9_]{2,}\s*=\s*[^\s]")
# SQL / query plumbing.
SQL_RE = re.compile(r"\b(?:SELECT|FROM|WHERE|JOIN|GROUP\s+BY|COUNT\(|SUM\(|"
                    r"INSERT\s+INTO|UPDATE\s+\w+\s+SET)\b")
# A line that is mostly a code comment (`//`, `#`, `--`) keeps the prose, but
# if the only '=' sits inside a trailing comment it is not a printed equation.
TRAILING_COMMENT_EQ_RE = re.compile(r"^[^=]*=[^=]*//")

# --- second pass: config plumbing, tables, quoted verdict prose ----------
# Flag/env plumbing (`--use-system-ca`, `NODE_OPTIONS=...`, `maxDuration=300`)
# is deployment config, never doctrine.
FLAG_EQ_RE = re.compile(r"--[A-Za-z][\w-]*=|\bNODE_OPTIONS\b|\bmaxDuration\s*=|"
                        r"\bCRON_SECRET\b|\buse-system-ca\b")
# Markdown table rows: the pipes make the '=' a cell artifact.
TABLE_ROW_RE = re.compile(r"^\s*\|")
# Gate-verdict prose: `Pass = "..."` / `Fail = below 3%` is a sentence, quoted or not.
VERDICT_RE = re.compile(r"\b(?:Pass|Fail|PASS|FAIL)\s*=")
# A bare `// = foo` comment line: no LHS, so it is not an equation.
COMMENT_EQ_RE = re.compile(r"^\s*(?://|#|--|%%)\s*=")
# `LangGraph JS** = @langchain/langgraph` -- a package mapping, not math.
PKG_MAP_RE = re.compile(r"@[\w-]+/[\w-]+|\bpip\s+install\b|\bnpm\s+(?:install|i)\b|"
                        r"^\s*\*\*[^*]{1,40}=[^*]{1,40}\*\*\s*$")
# `?path=free`, `?season=2023` -- a URL query artifact, not an equation.
URL_QUERY_RE = re.compile(r"\?[A-Za-z_][\w-]*=")
# TS type annotation on the LHS: `games: readonly GameRow[]`, `x: number[]`.
TS_ANNOT_RE = re.compile(r"\breadonly\s+\w+(?:\[\])?\s*[;=]|:\s*\w+(?:\[\])*\s*[;,=]|"
                         r"\b\w+\s*:\s*(?:readonly|Array|Record|Promise)\b")
# Bare-int arithmetic inside a prose list item (`at total 50 + 4 post-era`).
INT_ARITH_RE = re.compile(r"\b\d+\s*[+\u2212]\s*\d+\b")
# Real symbolic math: a greek letter or a sub/superscripted symbol. Lets the
# int-arith rule above spare genuine formula lines that also contain `1 + 2`.
MATH_GLYPH_EVIDENCE = re.compile(
    "[\u03b1\u03b2\u03b3\u03b4\u03b5\u03b6\u03b7\u03b8\u03b9\u03ba\u03bb\u03bc\u03bd"
    "\u03be\u03c0\u03c1\u03c3\u03c4\u03c6\u03c7\u03c8\u03c9"
    "\u0391\u0392\u0393\u0394\u0398\u039b\u039e\u03a0\u03a3\u03a6\u03a8\u03a9"
    "\u2211\u220f\u222b\u221a\u221e\u2202\u2207\u2248\u2264\u2265\u2260]"
)


def load_gate():
    """Load the proven 9015 gate as a module so the rules are never retyped."""
    path = os.path.join(HERE, "wave_extract_9015.py")
    spec = importlib.util.spec_from_file_location("_gate9015", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def list_files():
    files = []
    for sub in SUBDIRS:
        d = os.path.join(DOCS_ROOT, sub)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            p = os.path.join(d, fn)
            if os.path.isfile(p) and fn.lower().endswith((".md", ".txt")):
                files.append(p.replace("\\", "/"))
    return sorted(files)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--sample", type=int, default=0)
    ap.add_argument("--audit", type=int, default=0)
    a = ap.parse_args()

    gate = load_gate()
    base_extract = gate.extract

    def extract(path, wave):
        """9015 gate, then drop the code-declaration false positives."""
        rows, err = base_extract(path, wave)
        if err:
            return rows, err
        kept = []
        for r in rows:
            eq = r["equation"]
            core = eq.split("//")[0] if TRAILING_COMMENT_EQ_RE.search(eq) else eq
            if CODE_DECL_RE.search(core):
                continue
            if ENV_ASSIGN_RE.search(core) and not gate.MATH_EVIDENCE_RE.search(core):
                continue
            if SQL_RE.search(core):
                continue
            if FLAG_EQ_RE.search(core) or TABLE_ROW_RE.match(core) \
                    or VERDICT_RE.search(core) or COMMENT_EQ_RE.match(core):
                continue
            if PKG_MAP_RE.search(core) or URL_QUERY_RE.search(core) \
                    or TS_ANNOT_RE.search(core):
                continue
            # Bare-int arithmetic in a prose bullet is a count, not an equation,
            # unless the line carries real symbolic math (greek / LaTeX / E[.]).
            if INT_ARITH_RE.search(core) and not gate.LATEX_RE.search(core) \
                    and not gate.EXPCT_RE.search(core) \
                    and not MATH_GLYPH_EVIDENCE.search(core):
                continue
            r = dict(r)
            r["equation"] = core.strip() or eq
            if not r["equation"]:
                continue
            kept.append(r)
        return kept, None

    files = list_files()

    # Scope check against the wave order (25/6/4/4/1/1 = 41). Never proceed
    # silently on a drifted count -- report and refuse.
    by_sub = {}
    for p in files:
        key = os.path.basename(os.path.dirname(p))
        by_sub[key] = by_sub.get(key, 0) + 1
    drift = {k: [EXPECTED[k], by_sub.get(k, 0)]
             for k in EXPECTED if by_sub.get(k, 0) != EXPECTED[k]}
    print("per-root:", json.dumps(by_sub))
    if len(files) != EXPECTED_TOTAL or drift:
        print("SCOPE MISMATCH expected=%d found=%d drift=%s"
              % (EXPECTED_TOTAL, len(files), json.dumps(drift)), file=sys.stderr)
        return 2

    chunks = [(WAVE0 + i // CHUNK, i, min(i + CHUNK, len(files)))
              for i in range(0, len(files), CHUNK)]
    print("docs: %d  waves: %d" % (len(files), len(chunks)))

    if a.audit:
        shown = 0
        for p in files:
            rows, _ = extract(p, 0)
            if not rows:
                continue
            base, _ = base_extract(p, 0)
            drop = len(base) - len(rows)
            print("## %-52s keep=%-3d drop=%d" % (os.path.basename(p), len(rows), drop))
            for r in rows[:a.audit]:
                print("   KEEP | %s" % r["equation"][:140])
            for r in base:
                if r not in rows and len(base) - len(rows) > 0:
                    pass
            shown += 1
            if shown >= 12:
                break
        return 0

    if a.dry:
        tot_eq = tot_no = tot_err = 0
        sample = []
        for wave, s, e in chunks:
            neq = nno = nerr = 0
            for p in files[s:e]:
                rows, err = extract(p, wave)
                if err:
                    nerr += 1
                elif rows:
                    neq += len(rows)
                    if len(sample) < a.sample:
                        sample.extend(rows[:2])
                else:
                    nno += 1
            tot_eq += neq; tot_no += nno; tot_err += nerr
            print("  dry wave-%d [%d:%d] docs=%d eq=%d no=%d err=%d"
                  % (wave, s, e, e - s, neq, nno, nerr))
        print("DRY TOTAL", json.dumps({"docs": len(files), "equations": tot_eq,
                                       "no_equation": tot_no, "errors": tot_err,
                                       "waves_run": len(chunks)}))
        for r in sample:
            print("  SAMPLE:", json.dumps(r, ensure_ascii=False)[:220])
        return 0

    summary = []
    for wave, s, e in chunks:
        out_rows, n_eq, n_no, n_err = [], 0, 0, 0
        for p in files[s:e]:
            rows, err = extract(p, wave)
            if err:
                n_err += 1
                out_rows.append({"file": p, "status": "ERROR",
                                 "error": str(err)[:120], "wave": wave})
            elif rows:
                n_eq += len(rows)
                out_rows.extend(rows)
            else:
                n_no += 1
                out_rows.append({"file": p, "status": "NO_EQUATION", "wave": wave})
        with open("%s/wave-%04d.jsonl" % (OUTDIR, wave), "w", encoding="utf-8") as fh:
            for r in out_rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        receipt = {"wave": wave, "start": s, "end": e, "docs": e - s,
                   "equations": n_eq, "no_equation": n_no, "errors": n_err}
        with open("%s/wave-%04d-receipt.json" % (OUTDIR, wave), "w",
                  encoding="utf-8") as fh:
            json.dump(receipt, fh)
        summary.append(receipt)
        print(json.dumps(receipt))

    print("TOTAL", json.dumps({
        "docs": sum(x["docs"] for x in summary),
        "equations": sum(x["equations"] for x in summary),
        "errors": sum(x["errors"] for x in summary),
        "no_equation": sum(x["no_equation"] for x in summary),
        "waves_run": len(summary),
    }))
    return 0


if __name__ == "__main__":
    sys.exit(main())
