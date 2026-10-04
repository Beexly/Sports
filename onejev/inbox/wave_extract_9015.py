#!/usr/bin/env python
"""Equation extractor for waves 9015+ over Sports/docs/engine.

Root:   C:/Users/Garrett/Sports/docs/engine   (.md / .txt only, 77 docs)
Gate:   proven from wave_extract_9004.py -- real '=' plus genuine mathematics
        (or a LaTeX / expectation form), symbol-density floor, prose/CLI/secret
        rejection. Emits wave-9015.jsonl .. wave-9019.jsonl + receipts.
Usage:  python wave_extract_9015.py [--dry] [--sample N]
"""
import argparse
import json
import os
import re
import sys

ROOT = "C:/Users/Garrett/Sports/docs/engine"
OUTDIR = "C:/Users/Garrett/onejev/inbox/mind-queue"
CHUNK = 16
WAVE0 = 9015

# --- math symbols that make an '=' line a real equation ---------------
MATH_SYMS = set("+-*/^=<>\u2264\u2265\u2248\u00b1\u221d\u2211\u220f\u222b\u221a\u221e\u2202\u2207"
                "\u03b1\u03b2\u03b3\u03b4\u03b5\u03b8\u03bb\u03bc\u03bd\u03c0\u03c1\u03c3\u03c6\u03c7\u03c8"
                "\u03c9\u03c4\u03ba\u03b7\u03be\u03b6\u0393\u0394\u0398\u039b\u039e\u03a0\u03a6\u03a8\u03a9")
EXTRA = ("\u00d7\u00f7\u00b7\u2212\u00b1\u2248\u2260\u2264\u2265\u226a\u226b\u2308\u2309\u230a\u230b"
         "\u221a\u221b\u221e\u2202\u2207\u222b\u2211\u220f\u2192\u21a6\u2208\u2209\u2282\u2286"
         "\u2200\u2203\u00ac\u2227\u2228")
MATH_SYM_RE = re.compile("[" + re.escape("".join(sorted(MATH_SYMS | set(EXTRA)))) + "]")
MATH_EVIDENCE_RE = re.compile(
    "[" + re.escape("".join(sorted((MATH_SYMS | set(EXTRA)) - set("=<>")))) + "]"
)
EQ_SIGNAL_RE = re.compile(r"(?<![<>!=:+\-*/%&|^~])=(?![=><])")

# `foo.py`, `docs/x.md`, `np.`, `fn `, `=> {` ... a printed equation has none
CODE_MARKER_RE = re.compile(
    r"(?:\.ts\b|\.py\b|\.json\b|\.md\b|\.csv\b|\.yaml\b|\.yml\b|\.txt\b"
    r"|\bsrc/|\bpackages/|\bapps/|\bdocs/|https?://"
    r"|\bastype\b|\bnp\.|\bpd\.|\bpd\(|argparse|__\w+__|\w+\(\)"
    r"|[A-Za-z_]\w*\(\)|\bfunction\b|\bconst \b|\blet \b|\bvar \b|=>\s*\{|\bfn\s)",
    re.IGNORECASE,
)
LATEX_RE = re.compile(
    r"\\(frac|dfrac|tfrac|log|ln|exp|sqrt|sum|prod|int|mathbb\{E\}|mathbb\{P\}"
    r"|mathbb|beta|alpha|lambda|theta|phi|gamma|sigma|mu|pi|delta|epsilon|omega"
    r"|cdot|times|leq|geq|approx|hat|bar|overline|partial|nabla|cdot)"
)
EXPCT_RE = re.compile(r"\b[PEQVXB](?:\[[^\]]{1,80}\]|\([^()]{1,80}\))")
LITERAL_RE = re.compile(r"^[\[\{\"'].*[\]\}\"'][,.;:]?$")
WORD_RE = re.compile(r"[A-Za-z]{2,}")

# --- engine-corpus noise (calibrated on Sports/docs/engine) -------------
# 'Train n=165,330 plays' / 'train 2021+2022 (n=70,912)': a bare row/sample
# count is a data report, not a printed equation.
COUNT_RE = re.compile(r"(?<![A-Za-z_])[nNkmM]\s*=\s*\d[\d,]*(?![.\d])\b")
# 'attractor_suspect=True', 'y_target=1': snake_case assignment is code.
SNAKE_ASSIGN_RE = re.compile(
    r"\b\w+_\w+\s*=\s*(?:True|False|None|true|false|null|NaN|nan|\d|\[|\{)"
)
# LHS is an ordinary capitalized English word and RHS starts with a word:
# 'Primary: train ...', 'Protocol (reused ...)'. Prose, not mathematics.
PROSE_LHS_RE = re.compile(r"^[A-Z][a-z]{2,}\b")
# leading markdown emphasis / heading junk: '**Bucket = ...', '### Edge = ...'
MD_PREFIX_RE = re.compile(r"^[#*_~\s]+")
# bare metric dump: 'test_R2=-0.1541', 'R2=-0.1036', 'prog=-0.318'.
# One identifier, one signed number, nothing else -- a logged metric, not a
# relation. A real printed equation carries an operator or a second term.
BARE_METRIC_RE = re.compile(
    r"^[A-Za-z_][\w.()\[\]{}]*\s*=\s*-?\d+(?:\.\d+)?\s*$"
)
# year-labeled comparison, not an equation: '2025 = **1.867%**'
YEAR_LHS_RE = re.compile(r"^(?:19|20)\d{2}\b")

# --- secrets: never emit a credential-bearing line --------------------
SECRET_RE = re.compile(
    r"(?:sk-[A-Za-z0-9_\-]{16,}"
    r"|ghp_[A-Za-z0-9]{20,}"
    r"|github_pat_[A-Za-z0-9_]{20,}"
    r"|AKIA[0-9A-Z]{16}"
    r"|xox[baprs]-[A-Za-z0-9-]{10,}"
    r"|eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"
    r"|AIza[0-9A-Za-z_\-]{30,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|password|passwd"
    r"|api[_-]?secret|client[_-]?secret|private[_-]?key|bearer)\b\s*[:=]\s*[\"']?[^\s\"']{8,}"
    r")",
    re.IGNORECASE,
)
NOISE_RE = re.compile(
    r"^\s*(?:[-*+]\s*)?(?:```|\||>|\||#{1,6}\s*)?\s*"
    r"(?:[A-Za-z_][\w.]*\s*[:=]\s*(?:true|false|null|none|yes|no|on|off|\d+)\s*[,.;]?\s*)$",
    re.IGNORECASE,
)
CLI_RE = re.compile(
    r"(?:^|\|)\s*(?:\$\s*)?(?:npm|npx|pnpm|yarn|node|python3?|pip3?|uv|bash|sh|zsh"
    r"|curl|wget|git|gh|docker|make|cargo|go|java|claude|codex|agy|pytest|jest|vitest)\s+\S",
    re.IGNORECASE,
)
CLI_FLAG_RE = re.compile(r"--[A-Za-z][\w-]*=")
MAX_EQ_LEN = 900


def clean(s):
    s = s.replace("\u00a0", " ")
    return re.sub(r"\s+", " ", s).strip()


def strip_fence(s):
    return s.replace("```", "").replace("`", "").strip()


def math_density(s):
    core = re.sub(r"\s+", "", re.sub(r"[A-Za-z]+", " ", s))
    total = re.sub(r"\s+", "", s)
    return len(core) / len(total) if total else 0.0


def rhs_is_literal(eq):
    m = EQ_SIGNAL_RE.search(eq)
    if not m:
        return False
    rhs = eq[m.end():].strip()
    if not rhs:
        return True
    rhs = re.split(r"\s+[#;]\s+", rhs)[0].strip()
    return bool(LITERAL_RE.match(rhs))


def is_equation(line):
    if not EQ_SIGNAL_RE.search(line):
        return False
    body = strip_fence(line)
    if LITERAL_RE.match(body):
        return False
    if CODE_MARKER_RE.search(body):
        return False
    if MATH_EVIDENCE_RE.search(body):
        return True
    if LATEX_RE.search(line):
        return True
    if EXPCT_RE.search(line):
        return True
    return bool(re.search(r"\d\s*%\s*=", line))


def eqnum_for(line, in_fence, counter):
    if not in_fence:
        return None
    m = re.match(r"\s*\(?\s*(\d{1,3})\s*\)?[.:]?\s", line)
    if m:
        counter[0] += 1
        return m.group(1)
    counter[0] += 1
    return None


def extract(path, wave):
    rows = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            lines = fh.read().splitlines()
    except Exception as e:
        return [], str(e)
    counter = [0]
    in_fence = False
    seen = set()
    for raw in lines:
        if len(raw) > 4000:
            raw = raw[:4000]
        if SECRET_RE.search(raw):
            continue
        if raw.strip().startswith("```"):
            in_fence = not in_fence
        if not is_equation(raw):
            continue
        eq = clean(strip_fence(raw)).lstrip("-*+ \t>#").strip()
        eq = clean(MD_PREFIX_RE.sub("", eq))
        if not eq or NOISE_RE.match(eq):
            continue
        if BARE_METRIC_RE.match(eq):
            continue          # `test_R2=-0.1541`: logged metric, not a relation
        if YEAR_LHS_RE.match(eq):
            continue          # `2025 = 1.867%`: season comparison, not a formula
        if CLI_RE.search(eq) or CLI_FLAG_RE.search(eq):
            continue
        if rhs_is_literal(eq):
            continue
        if not (MATH_EVIDENCE_RE.search(eq) or LATEX_RE.search(eq) or EXPCT_RE.search(eq)
                or re.search(r"\d\s*%", eq)):
            continue
        if (math_density(eq) < 0.13 and not EXPCT_RE.search(eq) and not LATEX_RE.search(eq)):
            continue
        if COUNT_RE.search(eq):
            continue          # sample/row counts, not mathematics
        if SNAKE_ASSIGN_RE.search(eq):
            continue          # code assignment (snake_case = literal)
        # a capitalized English LHS followed by word-RHS is a prose sentence
        if PROSE_LHS_RE.match(eq):
            m = EQ_SIGNAL_RE.search(eq)
            rhs = eq[m.end():].strip() if m else ""
            if rhs[:1].isalpha() and not EXPCT_RE.search(eq):
                continue
        if len(WORD_RE.findall(eq)) > 24 and not LATEX_RE.search(eq) and not EXPCT_RE.search(eq):
            continue
        if len(eq) > MAX_EQ_LEN:
            eq = eq[:MAX_EQ_LEN].rstrip() + " ..."
        key = eq.lower()
        if key in seen:
            continue
        seen.add(key)
        rows.append({"file": path, "equation": eq,
                     "page_or_eqnum": eqnum_for(raw, in_fence, counter), "wave": wave})
    return rows, None


def list_files():
    files = []
    for dirpath, _d, filenames in os.walk(ROOT):
        for fn in sorted(filenames):
            if fn.lower().endswith((".md", ".txt")):
                files.append(os.path.join(dirpath, fn).replace("\\", "/"))
    return sorted(files)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--sample", type=int, default=0)
    a = ap.parse_args()

    files = list_files()
    chunks = [(WAVE0 + i // CHUNK, i, min(i + CHUNK, len(files)))
              for i in range(0, len(files), CHUNK)]
    print(f"engine docs: {len(files)}  waves: {len(chunks)}")

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
            print(f"  dry wave-{wave} [{s}:{e}] docs={e-s} eq={neq} no={nno} err={nerr}")
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
                out_rows.append({"file": p, "status": "ERROR", "error": err, "wave": wave})
            elif rows:
                n_eq += len(rows)
                out_rows.extend(rows)
            else:
                n_no += 1
                out_rows.append({"file": p, "status": "NO_EQUATION", "wave": wave})
        with open(f"{OUTDIR}/wave-{wave}.jsonl", "w", encoding="utf-8") as fh:
            for r in out_rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        receipt = {"wave": wave, "start": s, "end": e, "docs": e - s,
                   "equations": n_eq, "no_equation": n_no, "errors": n_err}
        with open(f"{OUTDIR}/wave-{wave}-receipt.json", "w", encoding="utf-8") as fh:
            fh.write(json.dumps(receipt))
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