#!/usr/bin/env python
"""Equation extractor for wave-9004..9006.

Roots: C:/Users/Garrett/Sports/docs/math and .../docs/reasoning
Scope: .md / .txt only
Gate:  '=' plus a math symbol, OR \frac \log \exp / P(...) / E[...] forms
Secrets: lines that look like real credentials are dropped (never emitted)
Output: wave-9004.jsonl, wave-9005.jsonl, wave-9006.jsonl (+ receipts)
"""
import json
import os
import re
import sys

ROOTS = [
    "C:/Users/Garrett/Sports/docs/math",
    "C:/Users/Garrett/Sports/docs/reasoning",
]
OUTDIR = "C:/Users/Garrett/onejev/inbox/mind-queue"

WAVES = [(9004, 0, 18), (9005, 18, 36), (9006, 36, 52)]

# --- math symbols that make an '=' line a real equation -------------
MATH_SYMS = set("+-*/^=<>≤≥≈±∝∑∏∫√∞∂∇αβγδεθλμνπρσφχψωτκηξζΓΔΘΛΞΠΦΨΩϕϑ")
EXTRA = "×÷·−±≈≠≤≥≪≫⌈⌉⌊⌋√∛∞∂∇∫∑∏→↦∈∉⊂⊆∀∃¬∧∨"
# NB: em-dash (—) and en-dash (–) are deliberately excluded: they are prose
# punctuation and were letting ordinary English sentences through the gate.
# The mathematical minus sign is U+2212 (−), which is kept.

MATH_SYM_RE = re.compile("[" + re.escape("".join(sorted(MATH_SYMS | set(EXTRA)))) + "]")

# Evidence of real mathematics, EXCLUDING a bare '=' / '<' / '>' which every
# `foo=bar` config line would trivially satisfy.
MATH_EVIDENCE_RE = re.compile(
    "[" + re.escape("".join(sorted((MATH_SYMS | set(EXTRA)) - set("=<>")))) + "]"
)

# '=' that is a real equality (not part of >=, <=, !=, =>, :=, ==)
EQ_SIGNAL_RE = re.compile(r"(?<![<>!=:+\-*/%&|^~])=(?![=><])")

CODE_MARKER_RE = re.compile(
    r"(?:\.ts\b|\.py\b|\.json\b|\.md\b|\.csv\b|\.yaml\b|\.yml\b|\.txt\b"
    r"|\bsrc/|\bpackages/|\bapps/|\bdocs/|https?://"
    r"|\bastype\b|\bnp\.\b|\bpd\.\b|\bpd\(|argparse|__\w+__|\w+\(\)"
    r"|[A-Za-z_]\w*\(\)|\bfunction\b|\bconst \b|\blet \b|\bvar \b|=>\s*\{|\bfn\s)",
    re.IGNORECASE,
)

LATEX_RE = re.compile(
    r"\\(frac|dfrac|tfrac|log|ln|exp|sqrt|sum|prod|int|mathbb{E}|mathbb{P}|"
    r"beta|alpha|lambda|theta|phi|gamma|sigma|mu|pi|delta|epsilon|omega|cdot|times|leq|geq|approx|in|hat|bar|mathbb)"
)

# P(...) / E[...] / Q(...) / V[...] expectation-style forms
EXPCT_RE = re.compile(r"\b[PEQVXB](?:\[[^\]]{1,80}\]|\([^()]{1,80}\))")

# code literal payloads that look math-ish to a naive gate
LITERAL_RE = re.compile(r"^[\[\{\"'].*[\]\}\"'][,.;:]?$")

WORD_RE = re.compile(r"[A-Za-z]{2,}")

# --- secret detection -------------------------------------------------
SECRET_RE = re.compile(
    r"(?:sk-[A-Za-z0-9_\-]{16,}"
    r"|ghp_[A-Za-z0-9]{20,}"
    r"|github_pat_[A-Za-z0-9_]{20,}"
    r"|AKIA[0-9A-Z]{16}"
    r"|xox[baprs]-[A-Za-z0-9-]{10,}"
    r"|eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}"
    r"|AIza[0-9A-Za-z_\-]{30,}"
    r"|-----BEGIN [A-Z ]*PRIVATE KEY-----"
    r"|\b(?:api[_-]?key|secret[_-]?key|access[_-]?token|auth[_-]?token|password|passwd|"
    r"api[_-]?secret|client[_-]?secret|private[_-]?key|bearer)\b\s*[:=]\s*[\"']?[^\s\"']{8,}"
    r")",
    re.IGNORECASE,
)

# lines that are pure identifiers/assignments of non-math code config
NOISE_RE = re.compile(
    r"^\s*(?:[-*+]\s*)?(?:```|\||>|\||#{1,6}\s*)?\s*"
    r"(?:[A-Za-z_][\w.]*\s*[:=]\s*(?:true|false|null|none|yes|no|on|off|\d+)\s*[,.;]?\s*)$",
    re.IGNORECASE,
)

# shell / CLI command lines: `npm run x --workspace=...`, `curl -H ...=...`
CLI_RE = re.compile(
    r"(?:^|\|)\s*(?:\$\s*)?(?:npm|npx|pnpm|yarn|node|python3?|pip3?|uv|bash|sh|zsh|"
    r"curl|wget|git|gh|docker|make|cargo|go|java|claude|codex|agy|pytest|jest|vitest)\s+\S",
    re.IGNORECASE,
)
CLI_FLAG_RE = re.compile(r"--[A-Za-z][\w-]*=")
# backticked-only payloads (code identifiers / paths / JSON), no real math prose
CODEISH_RE = re.compile(r"^[`'\"|\-\s]*[A-Za-z0-9_./{}\[\]@#:$-]+(?:[=,;:()\[\]]+[A-Za-z0-9_./{}\[\]@#:$-]+)*[`'\"|\s]*$")

MAX_EQ_LEN = 900


def clean(s):
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def strip_fence(s):
    return s.replace("```", "").replace("`", "").strip()


def math_density(s):
    """Fraction of non-space chars that are mathematical/symbolic.

    Prose sentences ('the touchdown value is modeled...') score low; printed
    equations ('GSE-CPOE(passer) = 100 x mean(complete - P̂)') score high.
    """
    core = re.sub(r"[A-Za-z]+", " ", s)          # drop words, keep digits/symbols
    core = re.sub(r"\s+", "", core)
    total = re.sub(r"\s+", "", s)
    if not total:
        return 0.0
    return len(core) / len(total)


def rhs_is_literal(eq):
    """`objectives=["r2","length"]` -> config literal, not mathematics."""
    m = EQ_SIGNAL_RE.search(eq)
    if not m:
        return False
    rhs = eq[m.end():].strip()
    if not rhs:
        return True
    # strip a trailing code comment
    rhs = re.split(r"\s+[#;]\s+", rhs)[0].strip()
    return bool(LITERAL_RE.match(rhs))


def is_equation(line):
    """Core gate: a real '=' plus genuine mathematics (or a math form)."""
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
    if re.search(r"\d\s*%\s*=", line):
        return True
    return False


def eqnum_for(line, in_fence, counter):
    """Return an eq number label if the doc appears to number its equations."""
    if not in_fence:
        return None
    m = re.match(r"\s*\(?\s*(\d{1,3})\s*\)?[.:]?\s", line)
    if m:
        counter[0] += 1
        return m.group(1)
    counter[0] += 1
    return None


def extract(path, wave):
    """Return (rows, error_or_None)."""
    rows = []
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            lines = fh.read().splitlines()
    except Exception as e:  # unreadable -> error row
        return [], str(e)

    counter = [0]
    in_fence = False
    seen = set()
    for raw in lines:
        if len(raw) > 4000:
            raw = raw[:4000]
        if SECRET_RE.search(raw):
            continue  # never emit credential-bearing lines
        fence_hit = raw.strip().startswith("```")
        if fence_hit:
            if not in_fence:
                in_fence = True
            else:
                in_fence = False
        if not is_equation(raw):
            continue
        eq = clean(strip_fence(raw))
        eq = eq.lstrip("-*+ \t>#").strip()
        if not eq or NOISE_RE.match(eq):
            continue
        if CLI_RE.search(eq) or CLI_FLAG_RE.search(eq):
            continue  # shell invocation, not a printed equation
        if rhs_is_literal(eq):
            continue  # `key = ["a","b"]` config assignment
        # must retain genuine math flavour after cleanup
        if not (
            MATH_EVIDENCE_RE.search(eq) or LATEX_RE.search(eq) or EXPCT_RE.search(eq)
            or re.search(r"\d\s*%", eq)
        ):
            continue
        # a printed equation is symbol-dense; prose sentences with a stray '='
        # (e.g. "the value is = X") do not qualify. Calibrated so real
        # equations like "GSE-xYAC(receiver) = mean(yac - ŷ(yac))" (0.17)
        # still pass while pure-English sentences (~0.08) do not.
        if math_density(eq) < 0.13 and not EXPCT_RE.search(eq) and not LATEX_RE.search(eq):
            continue
        # equations are compact; a long run of words is prose with a stray '='
        words = WORD_RE.findall(eq)
        if len(words) > 24 and not LATEX_RE.search(eq) and not EXPCT_RE.search(eq):
            continue
        if len(eq) > MAX_EQ_LEN:
            eq = eq[:MAX_EQ_LEN].rstrip() + " ..."
        key = eq.lower()
        if key in seen:
            continue
        seen.add(key)
        num = eqnum_for(raw, in_fence, counter)
        rows.append(
            {
                "file": path,
                "equation": eq,
                "page_or_eqnum": num,
                "wave": wave,
            }
        )
    return rows, None


def main():
    files = []
    for root in ROOTS:
        for dirpath, _dirnames, filenames in os.walk(root):
            for fn in sorted(filenames):
                if fn.lower().endswith((".md", ".txt")):
                    files.append(os.path.join(dirpath, fn).replace("\\", "/"))
    files.sort(key=lambda p: (ROOTS.index(next(r for r in ROOTS if p.startswith(r))), p))
    print(f"total files: {len(files)}")

    summary = []
    for wave, start, end in WAVES:
        chunk = files[start:end]
        out_rows = []
        n_eq = 0
        n_noeq = 0
        n_err = 0
        for p in chunk:
            rows, err = extract(p, wave)
            if err:
                n_err += 1
                out_rows.append(
                    {"file": p, "status": "ERROR", "error": err, "wave": wave}
                )
            elif rows:
                n_eq += len(rows)
                out_rows.extend(rows)
            else:
                n_noeq += 1
                out_rows.append({"file": p, "status": "NO_EQUATION", "wave": wave})
        out = os.path.join(OUTDIR, f"wave-{wave}.jsonl").replace("\\", "/")
        with open(out, "w", encoding="utf-8") as fh:
            for r in out_rows:
                fh.write(json.dumps(r, ensure_ascii=False) + "\n")
        receipt = {
            "wave": wave,
            "start": start,
            "end": end,
            "docs": len(chunk),
            "equations": n_eq,
            "no_equation": n_noeq,
            "errors": n_err,
        }
        with open(
            os.path.join(OUTDIR, f"wave-{wave}-receipt.json").replace("\\", "/"),
            "w",
            encoding="utf-8",
        ) as fh:
            fh.write(json.dumps(receipt))
        summary.append(receipt)
        print(receipt)

    print("TOTAL", json.dumps({
        "docs": sum(s["docs"] for s in summary),
        "equations": sum(s["equations"] for s in summary),
        "no_equation": sum(s["no_equation"] for s in summary),
        "errors": sum(s["errors"] for s in summary),
        "waves_run": len(summary),
    }))


if __name__ == "__main__":
    sys.exit(main())