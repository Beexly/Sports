#!/usr/bin/env python
"""Equation extractor for waves 9026+ over Sports/docs/{dfs,props,fantasy}.

Roots (canonical main worktree):
  C:/Users/Garrett/Sports/docs/dfs      72 docs
  C:/Users/Garrett/Sports/docs/props    32 docs
  C:/Users/Garrett/Sports/docs/fantasy  12 docs
  -> 116 docs, sorted by (root order, path) so dfs lands first.

Gate: the PROVEN wave_extract_9023 gate (itself proven from 9015 / 9004):
  a real '=' plus genuine mathematics (or a LaTeX / expectation form),
  symbol-density floor, prose / CLI / secret rejection.

Chunks: 30 docs per wave -> waves 9026, 9027, 9028, 9029 (116 docs).
Wave band 9018-9025 was already taken by the engine/corpus extractors, so this
starts at 9026. The --preflight guard refuses to write a wave file that already
holds rows from a different corpus root (the concurrent-clobber bug in 9023).

Output: mind-queue/wave-902{6,7,8,9}.jsonl + receipts. Mode 'w' (idempotent).

Usage:  python wave_extract_9026.py [--dry] [--sample N]
"""
import argparse
import json
import os
import re
import sys

ROOTS = [
    "C:/Users/Garrett/Sports/docs/dfs",
    "C:/Users/Garrett/Sports/docs/props",
    "C:/Users/Garrett/Sports/docs/fantasy",
]
OUTDIR = "C:/Users/Garrett/onejev/inbox/mind-queue"
CHUNK = 30
WAVE0 = 9026

# --- math symbols that make an '=' line a real equation ---------------
MATH_SYMS = set("+-*/^=<>\u2264\u2265\u2248\u00b1\u221d\u2211\u220f\u222b\u221a\u221e\u2202\u2207"
                "\u03b1\u03b2\u03b3\u03b4\u03b5\u03b8\u03bb\u03bc\u03bd\u03c0\u03c1\u03c3\u03c6\u03c7\u03c8"
                "\u03c9\u03c4\u03ba\u03b7\u03be\u03b6\u0393\u0394\u0398\u039b\u039e\u03a0\u03a6\u03a8\u03a9"
                "\u0391\u0392\u03a3\u03a7\u03a5\u03a8")
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


# A printed equation needs a MATHEMATICAL side. The proven gate's symbol-density
# floor still admits prose copulas whose line carries a stat elsewhere
# ("1,048 yds, 2 TD) = QB-quality artifact"). Single principled rule:
#   * a single whitespace-free LHS token ("pi", "X_t", "out[team]",
#     "no_huddle_rate") IS an equation by itself -- it is a symbol, not a
#     sentence, so "T_i = targets to receiver i" stays;
#   * otherwise the FIRST clause of the RHS must carry value evidence: a number
#     not glued to letters ("67.7%" yes, "WR1" no), a Greek letter, or a real
#     math operator (bare +/- excluded: hyphens are ordinary prose);
#   * a prose LHS with a prose RHS is prose; a code-literal RHS
#     ("= None", "= false") is code. Neither is a printed equation.
RHS_MATH_RE = re.compile(
    "[" + re.escape("".join(sorted(((MATH_SYMS | set(EXTRA)) - set("=<>+-"))))) + "]"
)
VALUE_NUM_RE = re.compile(r"(?<![A-Za-z])\d[\d.,]*(?:\s?%)?")
# end of the first clause: ; # sentence break, em/en dash, comma-space
# end of the first clause: ; # sentence break, em/en dash, comma-space.
# The sentence break must not fire on abbreviations ("Eq. 4.11", "Fig. 2").
RHS_CLAUSE_RE = re.compile(
    r"[;#]|\s[—–]\s|,\s|"
    r"(?<!\bEq)(?<!\bFig)(?<!\bNo)(?<!\bvs)(?<!\bcf)(?<!\bSec)\.\s"
)
CODE_RHS_RE = re.compile(r"\A(?:none|true|false|null|nan|undefined)\b", re.IGNORECASE)
# a formula can be word-only: "pass_attempt + sacks", "PassAttempts + Sacks".
# An underscore or an internal capital marks a formula token; ordinary prose
# ("neutral dropback rate", "medians of optimal sets") has neither.
FORMULA_TOKEN_RE = re.compile(r"\w*_\w*|[a-z][A-Z]")
# one whitespace-free LHS token, <=24 chars, no sentence: "pi", "X_t", "out[team]"
SYMBOLIC_LHS_RE = re.compile(
    r"^\**\s*[^\s*][^\s*]{0,23}\s*$"
)
PROSE_WORD_RE = re.compile(r"[A-Za-z]{2,}")
CODE_SIGNATURE_RE = re.compile(
    r"->\s*[A-Za-z_][\w.\[\]]*\s*:\s*|"
    r":\s*(?:int|float|str|bool|list|dict|tuple|set|optional|np\.\w+)\b\s*[=\]]",
    re.IGNORECASE,
)


def _clean(side):
    return side.strip().strip("*_ \t")


def _rhs_ok(lhs, rhs):
    if not rhs:
        return True
    # a code literal on the RHS of a compact LHS is code, not an equation
    if CODE_RHS_RE.match(rhs):
        return False
    # a lone symbol on the left makes this an equation (a definition, or an
    # equation stated in words: "T_i = targets to receiver i")
    if lhs and SYMBOLIC_LHS_RE.match(lhs):
        return True
    clause = _clean(RHS_CLAUSE_RE.split(rhs)[0])
    if not clause:
        return True
    if (RHS_MATH_RE.search(clause) or VALUE_NUM_RE.search(clause)
            or FORMULA_TOKEN_RE.search(clause)):
        return True
    # whitespace-free RHS is a bare symbol ("= HHI_qb"), not a prose phrase
    return not re.search(r"\s", clause)


def rhs_has_math(eq):
    """True when any '=' in the line forms a mathematical equation.

    Scans every '=' rather than just the first: real equations are often stated
    after prose ("... where dropbacks = pass_attempt + sacks").
    """
    for m in EQ_SIGNAL_RE.finditer(eq):
        if _rhs_ok(_clean(eq[:m.start()]), _clean(eq[m.end():])):
            return True
    return False


def rhs_is_literal(eq):
    m = EQ_SIGNAL_RE.search(eq)
    if not m:
        return False
    rhs = eq[m.end():].strip()
    if not rhs:
        return True
    rhs = re.split(r"\s+[#;]\s+", rhs)[0].strip()
    return bool(LITERAL_RE.match(rhs))


# A provenance pointer at the end of a deep-read bullet. Citations appear both
# backticked (`0176-.../x.md:40-58`) and bare (-- 0176-...-the.md:39 -- VERIFIED.).
PATH_TOKEN = re.compile(
    r"`[^`\n]*?(?:\.[A-Za-z]{1,5}(?::\d+(?:-\d+)?)?|[/\\][^`\n]*)[^`\n]*?`"
    r"|(?:\d{4}[-A-Za-z0-9_./]*)?[A-Za-z0-9_.\-/]*\.[A-Za-z]{1,5}:\d+(?:-\d+)?"
)


def strip_citation_paths(s):
    """Remove SOURCE-PATH CITATIONS before the gate.

    Deep-read bullets end in a provenance pointer like
    `` - `0176-../docs/x.md:40-58` `` or `` -- 0176-...-the.md:39 -- ``.
    CODE_MARKER_RE then sees the '.md' and discards an otherwise genuine
    equation. The citation is metadata, not equation content, so remove it
    before gating.
    """
    return PATH_TOKEN.sub(" ", s)


def is_equation(line):
    if not EQ_SIGNAL_RE.search(line):
        return False
    body = strip_citation_paths(strip_fence(line))
    if LITERAL_RE.match(body):
        return False
    if CODE_MARKER_RE.search(body):
        return False
    if CODE_SIGNATURE_RE.search(body):
        return False
    if rhs_has_math(body):
        return True
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
        eq = clean(strip_citation_paths(strip_fence(raw))).lstrip("-*+ \t>#").strip()
        if not eq or NOISE_RE.match(eq):
            continue
        if CLI_RE.search(eq) or CLI_FLAG_RE.search(eq):
            continue
        if rhs_is_literal(eq):
            continue
        latex_or_expct = bool(LATEX_RE.search(eq) or EXPCT_RE.search(eq))
        if not (rhs_has_math(eq) or latex_or_expct):
            continue
        # A word-only formula ("Dropbacks = PassAttempts + Sacks") is legitimately
        # sparse in symbols, so formula/underscore evidence waives the density floor.
        if (math_density(eq) < 0.13 and not latex_or_expct
                and not FORMULA_TOKEN_RE.search(eq)):
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
    for root in ROOTS:
        for dirpath, _d, filenames in os.walk(root):
            for fn in sorted(filenames):
                if fn.lower().endswith((".md", ".txt")):
                    files.append(os.path.join(dirpath, fn).replace("\\", "/"))
        files.sort()
    return files


MARKER = "corpus-roots:"


def preflight(waves):
    """Refuse to write a wave file already owned by a DIFFERENT corpus root.

    Concurrent extractors picked 9017-9019 for docs/engine while another was
    mid-run and silently overwrote them. Tag every file this script writes with
    MARKER, and bail out if an existing file is tagged for another root.
    """
    bad = []
    for w in waves:
        p = f"{OUTDIR}/wave-{w}.jsonl"
        if not os.path.exists(p):
            continue
        tag = None
        with open(p, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                if line.startswith(MARKER):
                    tag = line.strip()
                    break
                if not line.strip():
                    continue
                try:
                    f = json.loads(line).get("file", "").replace("\\", "/")
                except Exception:
                    continue
                tag = f
                break
        if not tag:
            continue
        if tag.startswith(MARKER):
            if not any(r in tag for r in ROOTS):
                bad.append((w, tag))
        elif not any(tag.startswith(r) for r in ROOTS):
            bad.append((w, tag))
    return bad


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--sample", type=int, default=0)
    a = ap.parse_args()

    files = list_files()
    chunks = [(WAVE0 + i // CHUNK, i, min(i + CHUNK, len(files)))
              for i in range(0, len(files), CHUNK)]
    print(f"dfs/props/fantasy docs: {len(files)}  waves: {len(chunks)}")

    bad = preflight([w for w, _s, _e in chunks])
    if bad:
        for w, tag in bad:
            print(f"ABORT: wave-{w}.jsonl already holds foreign rows ({tag[:110]})",
                  file=sys.stderr)
        print("Pick a free wave band (WAVE0) and re-run.", file=sys.stderr)
        return 2

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
            fh.write(f"{MARKER} {','.join(ROOTS)}\n")
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