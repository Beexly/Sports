"""Clean the wave queue: strip equation labels, drop truncated/corrupt rows.

Three defects visible in the two-model agreement rows:
  1. Label prefixes survive extraction: "Utility:u_{ij}=v_{ij}", "log-likelihood(eq.2):l=...",
     "videoembedding(eq.3):`e_v=f_v(v,g_{2d})`."
  2. Numbered-list artifacts: "1. λ(t) = μ + ..."
  3. TRUNCATED equations: unbalanced {} () [] — e.g. "1. λ(t) = μ + Σ α·e^{−"
     (the extractor cut at the char cap mid-brace). These poison agreement because
     no normalizer can reconstruct them.

Writes cleaned rows to mind-queue/wave-index.jsonl (the canonical index) and prints
what was dropped, so nothing disappears silently. The original wave files stay untouched.
"""
import os, json, re, glob

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, 'mind-queue')
OUT = os.path.join(QUEUE, 'wave-index.jsonl')

# "log-likelihood(eq. 2):", "SNR (Eqs. 8-9):", "videoembedding(eq.3):", "Utility:",
# "Power-logit:", "Eq. (9):", plus surrounding markdown/backticks. Ordered so the
# Eq/NUMBER prefix form is stripped before the generic word-label form.
LABEL = re.compile(
    r'^\s*(?:'
    r'(?:eq|eqs|eq\.)\s*\.?\s*\(?\s*[\dA-Za-z\.\-–,\s]{1,20}\)?\s*:?\s*'
    r'|(?:eq|eqs|equation|equations)\s*(?:no\.?|#)?\s*[\dA-Za-z\.\-–]{1,12}\s*:?\s*'
    r'|[A-Za-z][A-Za-z \-/]{0,40}?\s*\((?:eq|eqs|eq\.)\s*[\d,\-– ]*\)\s*:?\s*'
    r'|[A-Za-z][A-Za-z \-]{0,30}:\s+)'
    , re.I)
LISTNUM = re.compile(r'^\s*(?:\d+[.)]|[-*•])\s+')
BACKTICK = re.compile(r'`+')
# a trailing "(eq. 3)" / "(Eq. 8-9)" annotation at the END of an equation
TRAILEQ = re.compile(r'\s*\((?:eq|eqs|eq\.)\s*[\d,\-– ]*\)\s*$', re.I)


def balanced(s):
    """Unbalanced delimiters mean the extractor truncated the expression."""
    depth = {'{': 0, '(': 0, '[': 0}
    pairs = {'}': '{', ')': '(', ']': '['}
    for ch in s:
        if ch in depth:
            depth[ch] += 1
        elif ch in pairs:
            depth[pairs[ch]] -= 1
            if depth[pairs[ch]] < 0:
                return False
    return all(v == 0 for v in depth.values())


def clean(eq):
    s = eq.strip()
    s = BACKTICK.sub('', s)
    prev = None
    while prev != s:                      # labels can stack: "Utility (eq.1): x ="
        prev = s
        s = LABEL.sub('', s).strip()
        s = LISTNUM.sub('', s).strip()
        s = TRAILEQ.sub('', s).strip()
    return s


def _rhs_ok(lhs, rhs):
    """The right-hand side must be mathematical, not a prose copula."""
    r = rhs.strip().strip('.,;:')
    if not r:
        return False
    # a quoted English phrase is not a value: "= pure noise", "= unquestioned WR1"
    if re.match(r'^\s*[`"\']?', r) and re.search(r'\b(?:is|are|the|a|an|not|no|pure|unquestioned)\b', r[:40], re.I) \
            and not re.search(r'[\d_^{}\\]|[σθλαβγδφΣπωΩΔ∂∞∑∏∫√±×÷]', r):
        return False
    # prose after the value is fine ("28.25 (arithmetic)"), but the VALUE must be math
    head = re.split(r'\s[#;]\s+|\s{2,}', r)[0].strip()
    return bool(
        re.fullmatch(r'[\d\s.,%+\-−–/*x×÷()^_{}\[\]σθλαβγδφΣπΩΔ∂∞≤≥≠=<>~≈ᵀ⁻¹²³ᵢⱼ]+', head)
        or re.search(r'[_^{}\\]|[σθλαβγδφΣπΩΔ∂∞∑∏∫√±×÷≈~^̂·⋅]', head)
        or re.search(r'\b(log|ln|exp|sin|cos|tan|max|min|argmin|argmax|sum|prod|logit|sigmoid|softmax)\b', head, re.I)
        or re.search(r'[A-Za-z]\s*\([^()]*\)', head)
    )


_APOS_IN_WORD = re.compile(r"[A-Za-z]'[A-Za-z]")


def _quote_state(before):
    """Count unclosed quotes, ignoring apostrophes inside words (GSE's, paper's)."""
    b = _APOS_IN_WORD.sub('', before)      # drop ' in don't / GSE's
    b = re.sub(r"(?<=[A-Za-z])'(?=[A-Za-z])", '', b)
    dq = b.count('"') % 2
    # typographic quotes used in these docs
    dq += b.count('“') % 2 + b.count('”') % 2
    sq = b.count("'") % 2 + b.count('‘') % 2 + b.count('’') % 2
    return dq == 1 or sq == 1


def any_eq_is_math(eq):
    """True when any '=' OUTSIDE a quotation forms a real equation.

    Equations are often stated after prose ("... where dropbacks = pass_attempt +
    sacks"), so scanning only the first '=' loses them. An '=' inside a real
    quotation is prose ("= pure noise."), never a relation.
    """
    for m in re.finditer(r'(?<![<>!=])=(?!=)', eq):
        if _quote_state(eq[:m.start()]):
            continue
        if _rhs_ok(eq[:m.start()], eq[m.end():]):
            return True
    return False


def has_eq_outside_quotes(eq):
    """True when at least one '=' exists outside quotation marks."""
    for m in re.finditer(r'(?<![<>!=])=(?!=)', eq):
        if _quote_state(eq[:m.start()]):
            continue
        return True
    return False


def is_equation(s):
    """A real printed equation: has '=' and at least one math construct.

    Rejects constraints ('|β| ≤ 0.010'), pure inequalities, and prose that merely
    contains '='. Keeps '=' equations with subscripts, functions, sums, Greek, or TeX.
    """
    if '=' not in s:
        return False
    lhs, _, rhs = s.partition('=')
    if not lhs.strip() or not rhs.strip():
        return False
    if '≤' in s and s.count('=') == 0:
        return False
    # If every '=' sits inside quotation marks, this is quoted prose, not an equation.
    if not has_eq_outside_quotes(s):
        return False
    # EITHER any single '=' forms a math relation, OR the whole string is mathy
    # (covers multi-'=' lines and TeX where the first '=' is not the relation).
    if any_eq_is_math(s):
        return True
    mathy = (re.search(r'[_^{}\\]', s)
             or re.search(r'[σθλαβγδφΣℓπΩΔ∂∞∑∏∫√±×÷≈~^̂·⋅∗∘⇔→←]|[\dπθσλφA-Za-z][ᵀ⁻¹²³ᵢⱼ]', s)
             or re.search(r'\b(log|ln|exp|sin|cos|tan|max|min|argmin|argmax|sum|prod|logit|sigmoid|softmax|E\[|P\()', s, re.I)
             or re.search(r'[a-zA-Z]\s*\([^()]*\)\s*=', s)
             or re.search(r'[A-Za-z0-9)\]]\s*[·⋅∗+\-−]\s*[A-Za-z0-9(\[]', s))
    return bool(mathy)


def main():
    kept, dropped_trunc, dropped_nolabel = [], 0, 0
    seen = set()
    for wf in sorted(glob.glob(os.path.join(QUEUE, 'wave-*.jsonl'))):
        base = os.path.basename(wf)
        # Only WAVE-NNNN(.jsonl) are sources. This file's own output
        # (wave-index.jsonl) and every agreement file must be excluded, else the
        # previous index is re-read and the result can never grow past it.
        w = base[len('wave-'):-len('.jsonl')]
        if not w.isdigit():
            continue
        for line in open(wf, encoding='utf-8'):
            try:
                r = json.loads(line)
            except Exception:
                continue
            eq = r.get('equation')
            if not eq:
                continue
            c = clean(eq)
            if not c or not is_equation(c):
                dropped_nolabel += 1
                continue
            if not balanced(c):
                dropped_trunc += 1
                continue
            key = (r.get('file', ''), re.sub(r'\s+', '', c).lower()[:100])
            if key in seen:
                continue
            seen.add(key)
            kept.append({**r, 'equation': c})
    with open(OUT, 'w', encoding='utf-8') as f:
        for r in kept:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    print(json.dumps({'kept': len(kept), 'dropped_truncated': dropped_trunc,
                      'dropped_not_equation': dropped_nolabel, 'out': OUT}))


if __name__ == '__main__':
    main()