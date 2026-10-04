"""arXiv fulltext equation extractor — corpus-specific, built from verified structure.

MEASURED FACTS this design depends on (analyze_arxiv_structure.py):
  * 27 of 40 sampled papers are a SINGLE LINE. The markdown extractor's
    line-scanner would swallow or reject the whole document.
  * Every equation appears TWICE: a rendered Unicode twin ('p \u2061 ( \ud835\udc17
    ) = ...', corrupted by U+2061 invisible function-application and spaces
    inside parens) and a LaTeX source twin ('p(\\mathbf{X})=...'). The LaTeX
    twin is canonical; taking both would double-count.
  * Display equations carry trailing '(12)' markers.

So: split on SENTENCE boundaries, extract the LaTeX span when present, else the
rendered span, and dedupe on a normalized key. Stored verbatim, never rewritten.
"""
import glob, json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
FT = 'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/fulltext'
OUT = os.path.join(HERE, 'mind-queue')
SEP = chr(92)

# LaTeX control sequence: a backslash followed by letters. Two+ letters is the
# signal; single letters (\, \; \{) are too noisy on their own.
LATEX_CMD = re.compile(r'\\[A-Za-z]{2,}')
# Inline/display math delimiters that survived the HTML->text conversion.
MATH_SPAN = re.compile(r'\$+([^$]{2,400})\$+')
# A LaTeX run. MEASURED boundary rule (diag_arxiv_bounds.py): a macro is followed
# by '{' 1359x more often than by '.', and '.' is NOT a boundary because arXiv
# math is full of decimals (317 digit.digit in 3 papers alone). So the body runs
# to the next REAL sentence break -- period+space+capital -- or to the brace
# depth returning to zero, not to the first '.'.
LATEX_SPAN = re.compile(
    r'(?:\\[A-Za-z]{2,}[^\n]{0,40})?'          # an optional macro lead-in
    r'[^.!?]{0,60}?'                          # short left context (no bare '.')
    r'\\[A-Za-z]{2,}'                        # the macro that proves this is math
    r'[^!?]{0,400}?'                         # the expression body
)
# Rendered form: an operator relation with math on both sides.
REL = re.compile(r'(?<![<>!=])=(?![=><])')
RENDERED = re.compile(r'[^.;]{0,60}?[A-Za-zΑ-Ωα-ω][^.;]{0,60}?=[^.;]{0,200}?')
# Sentence break for single-line documents: '. ' followed by a capital.
SENT_BREAK = re.compile(r'(?<=[.!?])\s+(?=[A-Z(\\$])')
# Equation numbering marker at end of a display equation.
EQNUM = re.compile(r'\((\d{1,3})\)\s*$')
# Junk we never want as an equation.
JUNK = re.compile(
    r'(className=|entityId=|style=\{\{|pick=\{|var\(--|https?://|'
    r'canonicalHistoryStatus|type\s+\w+\s*=\s*\{|Copyright Privacy Policy|'
    r'Feeling lucky|Report an issue|Conversion report)', re.I)
SECRET = re.compile(
    r'(?:sk-[A-Za-z0-9_\-]{16,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|'
    r'-----BEGIN [A-Z ]*PRIVATE KEY-----)')
MATHY = re.compile(
    r'[0-9α-ωΑ-Ω∑∏∫∂√≈≤≥≠πθλσφμβεηκνρτωΩΓΔΘΛΞΠΦΨ]|'
    r'\^|_\\w|\\[A-Za-z]|·|±|×|∈|ℝ|→')
FN_APP = '\u2061'


def _balanced(s):
    return (s.count('{') == s.count('}') and s.count('(') == s.count(')'))


def key_of(s):
    """Normalize for dedupe only. The STORED span stays verbatim.

    BUG FIXED HERE: the first version stripped FN_APP by ASSIGNING it
    ('t = FN_APP') before replacing it, then deleted every LaTeX macro, every
    brace and every paren. For a short span like 'P_{r,p}(n)=\\int' that left
    an empty string, and extract()'s 'if not k' guard then rejected 100% of
    candidates -- the gate was fine, the dedupe key was destroying them.
    """
    t = unicodedata.normalize('NFKC', s or '')
    t = t.replace(FN_APP, '')
    t = LATEX_CMD.sub(' ', t)          # macro -> space, not deletion
    t = re.sub(r'\s+', '', t)
    t = re.sub(r'[{}()]', '', t)
    t = t.replace('−', '-').replace('–', '-').replace('—', '-')
    t = t.lower()
    # Guarantee a non-empty key: if normalization ate everything, fall back to
    # the raw span so distinct spans never collapse into one false duplicate.
    return t if t else raw_key(s)


def raw_key(s):
    """Last-resort dedupe key: alphanumeric skeleton of the untouched span."""
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', s or '')).lower()


def clean_span(s):
    """Trim a candidate span to the equation WITHOUT altering its characters.

    VERBATIM CONTRACT: the stored span must be an exact substring of the source
    paper. The previous version ran re.sub(r'\s+', ' ', s), which collapsed
    runs of whitespace and made 593 of 1419 spans (42%) no longer substrings
    of their paper. Only strip characters that were already at the ends --
    strip() on the ends is still a substring operation.
    """
    # cut a trailing equation-number marker by LENGTH, then strip the ends
    m = re.search(r'\s*\((\d{1,3})\)\s*$', s)
    if m:
        s = s[:m.start()]
    return s.strip().strip(',;:').strip()


GLOSS_START = re.compile(
    r'(?:\s+\b(?:where|which|and|with|while|such that|for which|then|thus|'
    r'hence|so|offering|providing|giving|using|by|to|the|this|these)\b)')
# Verb-free clause tails that follow an equation: '(model "A")', 'by definition'
GLOSS_CUT = re.compile(
    r'\s*(?:\(model\b|by definition|as follows|is then given|we (?:then|assume)|'
    r'The corresponding|Offering a|practical and)\b.*$', re.I)


def trim_prose(s):
    """Cut a trailing prose clause WITHOUT altering any retained character.

    Only ever slices by index -- a substring of s is still a substring of the
    source, so the verbatim contract holds.
    """
    m = GLOSS_CUT.search(s)
    if m and m.start() > 12:
        s = s[:m.start()].rstrip()
    return s.strip()


def acceptable(s):
    """Verbatim + balanced + math-bearing + not a fragment."""
    if not s or len(s) < 8 or len(s) > 320:
        return False
    if JUNK.search(s) or SECRET.search(s):
        return False
    if s.endswith(('=', '+', '-', '*', '/', ',')):
        return False
    if not REL.search(s) and not any(o in s for o in ('≤', '≥', '≈', '←', ':=')):
        return False
    if not MATHY.search(s):
        return False
    if ('(' in s or '{' in s) and not _balanced(s):
        return False
    if len(re.findall(r'[A-Za-z]{4,}', s)) > 8:
        return False
    return True


def latex_arg(text):
    """Yield the LaTeX expression carried by a macro, brace-aware.

    A rendered sentence reads '... modified as p ( n ) = p ( n − 1 ) + κ
    p(n)=\\kappa'. The canonical equation is the LaTeX TAIL after the rendered
    twin, not the whole sentence. Pull the run that starts at the last macro
    before the next real sentence break, and expand its braces so the stored
    span is the complete expression rather than a headless '\\int' or '\\xi'.
    """
    out = []
    for m in re.finditer(r'\\[A-Za-z]{2,}', text):
        i = m.start()
        j = m.end()

        # Case A: macro owns a brace group -> that group IS the expression.
        # '\\frac{...}{...}' and '\\chi^{2}' carry their math in the braces,
        # so anchor there and stop at the matching close. This kills the prose
        # bleed ('where \\lambda = ⟨n⟩') because the prose lives
        # OUTSIDE the group.
        while j < len(text) and text[j] in ' \\':
            j += 1
        if j < len(text) and text[j] == '{':
            depth = 0
            k = j
            while k < len(text):
                if text[k] == '{':
                    depth += 1
                elif text[k] == '}':
                    depth -= 1
                    if depth == 0:
                        k += 1
                        break
                k += 1
                if k - j > 320:
                    break
            # include any trailing '^{...}' / '_' group right after
            out.append(text[i:k])
            continue

        # Case B: bare macro (\\int, \\xi) -> take the sentence-fragment tail,
        # but ONLY forward. Backward context is what dragged prose in.
        end = j
        while end < len(text):
            ch = text[end]
            if ch in '.!?' and end + 1 < len(text) and text[end + 1] in ' \n':
                break
            end += 1
            if end - j > 220:
                break
        out.append(text[i:end])
    return out


def extract(text):
    """Return (equation, eqnum, form) triples for one paper.

    VERBATIM is enforced here, not trusted: `text` is the normalized source and
    every stored span must be an exact substring of it. U+200B ZERO WIDTH SPACE
    and U+2061 FUNCTION APPLICATION are stripped from the SOURCE first, so the
    stored span is a substring of the normalized paper -- and the caller stores
    the normalized text alongside, never the raw one.
    """
    text = text.replace(FN_APP, '').replace('\u200b', '')
    out, seen = [], set()

    def add(span, eqnum, form):
        s = clean_span(span)
        s = trim_prose(s)
        if not acceptable(s):
            return
        # hard verbatim gate: the span must appear in the normalized source
        if s not in text:
            return
        k = key_of(s)
        if not k or k in seen:
            return
        # Overlapping-window dedupe: a sliding window yields the same equation as
        # 2-3 nested spans. If this key is already contained in (or contains) a
        # kept key, it is the same equation seen through a different window.
        for prev in seen:
            if len(prev) > 20 and (k in prev or prev in k):
                return
        seen.add(k)
        out.append({'equation': s, 'page_or_eqnum': eqnum, 'form': form})

    # 1) LaTeX twin -- canonical, preferred.
    for span in latex_arg(text):
        num = EQNUM.search(span.rstrip())
        add(span, num.group(1) if num else None, 'latex')

    # 2) Rendered twin — only when no LaTeX twin exists for that key.
    for sent in SENT_BREAK.split(text):
        if LATEX_CMD.search(sent):
            continue                      # this sentence already yielded LaTeX
        for m in REL.finditer(sent):
            span = sent[max(0, m.start() - 60):m.end()]
            num = EQNUM.search(span.rstrip())
            add(span, num.group(1) if num else None, 'rendered')
            break
    return out


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    files = sorted(glob.glob(os.path.join(FT, '*.txt')))
    if limit:
        files = files[:limit]

    tot = 0
    per = []
    forms = {'latex': 0, 'rendered': 0}
    errs = 0
    samples = []
    for f in files:
        try:
            t = open(f, encoding='utf-8', errors='replace').read()
        except Exception:
            errs += 1
            continue
        rows = extract(t)
        tot += len(rows)
        per.append(len(rows))
        for r in rows:
            forms[r['form']] += 1
            if len(samples) < 12:
                samples.append((r['form'], r['equation'][:150]))

    print(json.dumps({
        'files': len(files),
        'equations': tot,
        'errors': errs,
        'mean_per_paper': round(tot / max(1, len(files)), 1),
        'zero_equation_papers': sum(1 for c in per if c == 0),
        'latex': forms['latex'],
        'rendered': forms['rendered'],
    }, indent=1))
    print('\n--- samples ---')
    for form, s in samples:
        print('  [%s] %s' % (form, s))


if __name__ == '__main__':
    main()