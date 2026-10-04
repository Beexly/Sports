#!/usr/bin/env python
"""Equation extractor for waves 9020+ over the Sports/docs prose corpus.

Roots (in task order, one wave per root so receipts stay interpretable):
    C:/Users/Garrett/Sports/docs/predictions    9 .md
    C:/Users/Garrett/Sports/docs/data-sources 24 .md
    C:/Users/Garrett/Sports/docs/research     41 .md
                                                    = 74 docs, 3 waves.

Gate: verbatim from the PROVEN wave_extract_9017 gate (proven from 9015, from
9004) -- a real '=' plus genuine mathematics (or LaTeX / expectation form),
symbol-density floor, prose / CLI / secret rejection, per-doc dedupe.
NOTE: wave-9019 already exists and belongs to a DIFFERENT corpus
(Sports-wt-engineplan/.../corpus-deep), so this run starts at 9020.

Usage:  python wave_extract_9020.py [--dry] [--sample N]
"""
import argparse
import json
import os
import re
import sys

ROOTS = [
    ("C:/Users/Garrett/Sports/docs/predictions", 9020),
    ("C:/Users/Garrett/Sports/docs/data-sources", 9021),
    ("C:/Users/Garrett/Sports/docs/research", 9022),
]
OUTDIR = "C:/Users/Garrett/onejev/inbox/mind-queue"

# --- math symbols that make an '=' line a real equation ---------------
MATH_SYMS = set("+-*/^=<>\u2264\u2265\u2248\u00b1\u221d\u2211\u220f\u222b\u221a\u221e\u2202\u2207"
                "\u03b1\u03b2\u03b3\u03b4\u03b5\u03b8\u03bb\u03bc\u03bd\u03c0\u03c1\u03c3\u03c6\u03c7\u03c8"
                "\u03c9\u03c4\u03ba\u03b7\u03be\u03b6\u0393\u0394\u0398\u039b\u039e\u03a0\u03a6\u03a8\u03a9")
EXTRA = ("\u00d7\u00f7\u00b7\u2212\u00b1\u2248\u2260\u2264\u2265\u226a\u226b\u2308\u2309\u230a\u230b"
         "\u221a\u221b\u221e\u2202\u2207\u222b\u2211\u220f\u2192\u21a6\u2208\u2209\u2282\u2286"
         "\u2200\u2203\u00ac\u2227\u2228")
MATH_SYM_RE = re.compile("[" + re.escape("".join(sorted(MATH_SYMS | set(EXTRA)))) + "]")
MATH_EVIDENCE_RE = re.compile(
    "[" + re.escape("".join(sorted((MATH_SYMS | set(EXTRA)) - set("=<>")))) + "]")
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

# --- corpus-specific rejections -------------------------------------------
# Sports/docs is PROSE (design briefs, vendor notes, data-source cards), not the
# dense verified-claims tables wave 9017 was tuned on. The 9017 core gate still
# admits four artifact families that are not printed equations. Each is rejected
# on its own evidence, never by keyword alone.
HEXCOLOR_RE = re.compile(r"#[0-9A-Fa-f]{3,8}\b")                     # #262A33
# matplotlib / FontProperties / plotting kwargs: `color=`, `zorder=`, `s=`, ...
MPL_KWARG_RE = re.compile(
    r"\b(?:color|alpha|zorder|zorder|linewidths|linewidth|lw|ls|markers|marker"
    r"|markersize|ms|rounding_size|fontsize|figsize|dpi|facecolor|edgecolor"
    r"|fontweight|fontfamily|fontname|clip_on|fig|ax|ha|va|grid|legend|loc"
    r"|rounding_capstyle|joinstyle|antialiased|path_effects|transform)\s*=",
    re.IGNORECASE)
# a bare `n=1,234` sample label (a row of a calibration table, not an equation)
NLABEL_RE = re.compile(r"^n\s*=\s*[\d,]+$")
# env-var assignment driving a command: `DATABASE_URL=... node scripts/x.cjs`
ENVASSIGN_RE = re.compile(r"^[A-Z][A-Z0-9_]{3,}\s*=")
# an HTTP request line / query string: `GET /x?week=eq.4&select=...`
APIQ_RE = re.compile(r"\b(?:GET|POST|PUT|PATCH|DELETE)\s+/[^\s]*\?[^\s]*"
                     r"|[?&][a-z_]+=")
FONT_RE = re.compile(r"FontProperties|\.ttf\b|\.otf\b|matplotlib|pyplot|axvline"
                      r"|axhline|fig\.text|plt\.")


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


def table_cell(raw):
    """For a markdown table row, return the pipe-delimited cells holding the '='.

    Verified-claims tables print the equation in one cell and the SOURCE-PATH
    CITATION in a sibling cell (e.g. `math/GSE_EXPECTED_METRICS.md`). Gating the
    whole row made CODE_MARKER_RE see the citation's '.md' and throw away genuine
    equations. Gate only the cell that actually carries the '='.
    """
    s = raw.strip()
    if s.count("|") < 2 or not EQ_SIGNAL_RE.search(s):
        return None
    cells = [c.strip() for c in s.strip("|").split("|")]
    hits = [c for c in cells if EQ_SIGNAL_RE.search(c)]
    return " | ".join(hits) if hits else None


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
        cand = table_cell(raw)
        if cand is not None:
            if not is_equation(cand):
                continue
            raw = cand
        elif not is_equation(raw):
            continue
        eq = clean(strip_fence(raw)).lstrip("-*+ \t>#").strip()
        if not eq or NOISE_RE.match(eq):
            continue
        if CLI_RE.search(eq) or CLI_FLAG_RE.search(eq):
            continue
        # --- Sports/docs prose artifacts (see regex block above) ------------
        if HEXCOLOR_RE.search(eq) and MPL_KWARG_RE.search(eq):
            continue
        if MPL_KWARG_RE.search(eq) or FONT_RE.search(eq):
            continue
        if ENVASSIGN_RE.match(eq) or APIQ_RE.search(eq):
            continue
        if NLABEL_RE.match(eq):
            continue
        if rhs_is_literal(eq):
            continue
        if not (MATH_EVIDENCE_RE.search(eq) or LATEX_RE.search(eq) or EXPCT_RE.search(eq)
                or re.search(r"\d\s*%", eq)):
            continue
        if (math_density(eq) < 0.13 and not EXPCT_RE.search(eq) and not LATEX_RE.search(eq)):
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


def list_files(root):
    files = []
    for dirpath, _d, filenames in os.walk(root):
        for fn in sorted(filenames):
            if fn.lower().endswith((".md", ".txt")):
                files.append(os.path.join(dirpath, fn).replace("\\", "/"))
    return sorted(files)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--sample", type=int, default=0)
    a = ap.parse_args()

    plans = [(root, wave, list_files(root)) for root, wave in ROOTS]
    total = sum(len(fs) for _r, _w, fs in plans)
    print(f"Sports/docs prose docs: {total}  waves: {len(plans)}")
    for root, wave, fs in plans:
        print(f"  wave-{wave} <- {root}  ({len(fs)} docs)")

    if a.dry:
        tot_eq = tot_no = tot_err = 0
        sample = []
        for root, wave, files in plans:
            neq = nno = nerr = 0
            for p in files:
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
            print(f"  dry wave-{wave} docs={len(files)} eq={neq} no={nno} err={nerr}")
        print("DRY TOTAL", json.dumps({"docs": total, "equations": tot_eq,
                                       "no_equation": tot_no, "errors": tot_err,
                                       "waves_run": len(plans)}))
        for r in sample:
            print("  SAMPLE:", json.dumps(r, ensure_ascii=False)[:220])
        return 0

    summary = []
    for root, wave, files in plans:
        out_rows, n_eq, n_no, n_err = [], 0, 0, 0
        for p in files:
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
        receipt = {"wave": wave, "root": root, "start": 0, "end": len(files),
                   "docs": len(files), "equations": n_eq,
                   "no_equation": n_no, "errors": n_err}
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
