"""One-off wave worker: ctx-2026-10-03 ROOT docs only (maxdepth 1, .md/.txt).

Modeled on night_wave.py, but the file list is built by walking the ROOT of the
corpus dir (no descent into subdirectories) and extraction works on the printed
math SEGMENT rather than the whole line/cell:

  - a segment is a printed equation when it has '=' AND a math signal
    (greek/sigma-lambda family, \\frac/\\log/\\exp/\\sum/\\prod, P(..), E[..], L_ij)
  - segments come from inline code spans, $..$ / $$..$$ math, and the maximal
    math-like span around an '=' in a line or markdown table cell
  - the LHS of '=' must not be an English clause (prose filter)
  - max 400 chars; files >2MB skipped
  - secret-shaped text is dropped before it can be stored or printed
  - 25 docs per output file

Usage: wave9007_ctxroot.py <first_wave> [out_dir]
"""
import json, os, re, sys

CORPUS = r'C:\Users\Garrett\_research\ctx-2026-10-03'
QUEUE = r'C:\Users\Garrett\onejev\inbox\mind-queue'
PER_FILE = 25
MAX_BYTES = 2 * 1024 * 1024
MAX_EQ_CHARS = 400

# --- what counts as a printed equation -------------------------------------
MATH_SYM = '\u03c3\u03b8\u03bb\u03b1\u03b2\u03b3\u03b4\u03c6\u03a3\u2113\u27e8\u27e9\u1d40\u2190\u2202'
MATH_EXTRA = '\u0394\u03a0\u03a9\u2211\u220f\u221a\u00b1\u2248\u2264\u2265\u00d7\u00f7\u222b\u03c0'
MATHY = re.compile(
    '[' + MATH_SYM + MATH_EXTRA + ']'
    r'|\\(?:frac|log|exp|sum|prod|sqrt|int)'
    r'|\bP\s*\('
    r'|\bE\s*\['
    r'|\bL_\{?[a-z]{1,3}\}?'
    , re.I)

# an '=' that is not part of '==', '!=', '<=', '>=', '~='
EQUAL = re.compile(r'(?<![<>!=~^])=(?!=)')
CODE_SPAN = re.compile(r'`([^`\n]{3,400})`')
DOLLAR = re.compile(r'\$\$(.+?)\$\$|\$(?!\s)([^$\n]{3,400}?)(?<!\s)\$', re.S)

# chars that may sit inside a printed math span
MATH_CHARS = set(" 0123456789abcdefghijklmnopqrstuvwxyz"
                 "ABCDEFGHIJKLMNOPQRSTUVWXYZ_^()[]{}<>+-*/=|~.,:;"
                 + MATH_SYM + MATH_EXTRA + "\\")
BAD_CHARS = set('"\'`#*<>')
LEFT_MAX, RIGHT_MAX = 60, 200

PROSE_WORDS = re.compile(
    r'\b(?:the|and|or|is|are|was|were|be|been|to|of|for|with|that|this|these|'
    r'from|by|at|in|on|not|but|if|we|you|it|its|as|has|have|had|will|would|'
    r'can|could|should|must|than|then|because|so|when|while|which|who|where|'
    r'how|all|any|each|every|both|only|also|more|most|less|least|into|over|'
    r'per|via|use|used|using|make|made|never|always|first|second|next|new)\b',
    re.I)

# An LHS is a printed expression only if it is compact and math-shaped.
IDENT_LHS = re.compile(r'^[A-Za-z][A-Za-z0-9]*'
                       r'(?:\s*[_^]\{?[A-Za-z0-9,]+\}?)?'
                       r'(?:\s*\([A-Za-z0-9, _^(){}\[\]]{0,40}\))?$')
MATHY_LHS = re.compile('^[' + MATH_SYM + MATH_EXTRA + r'\\]')
SENT_BREAK = re.compile(r'[a-z0-9\)]\.\s+[A-Z]')      # "... . Capital"
LHS_TOKENS = 4
# standalone printed forms worth capturing on their own
FORM_SPAN = re.compile(r'(?<![A-Za-z])[PE]\s*(?:\([()\sA-Za-z0-9_=+\-*/^,|<>\[\].]{1,80}\)|\[[^\[\]]{1,80}\])'
                        r'|\bL_\{?[A-Za-z]{1,3}\}?\s*\([^()]{0,60}\)')

# explicit arXiv marker only: a bare \d{4}\.\d{4,5} is a placeholder or stray
# metric (e.g. '2603.17866'), not an id -> null, per the row contract.
ARXIV_ID = re.compile(r'arxiv[:\s]+(\d{4}\.\d{4,5}(?:v\d+)?)', re.I)
EQ_TAIL = re.compile(r'\((\d+(?:\.\d+)*)\)\s*$')
EQ_REF = re.compile(r'\(eq\.?\s*(\d+(?:\.\d+)*)\)', re.I)
PAGE_MARK = re.compile(r'(?:^|\s)(?:page|p\.?|pp\.)\s*(\d+)\b', re.I)

SECRET = re.compile(
    r'(sk-[A-Za-z0-9_\-]{16,}'
    r'|api[_-]?key'
    r'|bearer\s+\S+'
    r'|authorization\s*:'
    r'|password\s*[:=]'
    r'|passwd\s*[:=]'
    r'|secret\s*[:=]'
    r'|token\s*[:=]\s*\S+'
    r'|gsk_[A-Za-z0-9]+'
    r'|oc_sk_[A-Za-z0-9]+'
    r'|rnd_[A-Za-z0-9]+'
    r'|gh[pous]_[A-Za-z0-9]+'
    r'|github_pat_[A-Za-z0-9_]+'
    r'|AKIA[0-9A-Z]{8,}'
    r'|xox[baprs]-[A-Za-z0-9\-]+'
    r')', re.I)


def is_secret(s):
    return bool(SECRET.search(s))


def arxiv_id_of(text):
    m = ARXIV_ID.search(text[:4000]) or ARXIV_ID.search(text)
    return m.group(1) if m else None


def locator(text, start):
    pg = None
    for m in PAGE_MARK.finditer(text[:start]):
        pg = m.group(1)
    en = None
    m = EQ_TAIL.search(text[start:start + 80])
    if m:
        en = m.group(1)
    if en is None:
        m = EQ_REF.search(text[max(0, start - 60):start + 60])
        if m:
            en = m.group(1)
    if en is None and pg is not None:
        return 'p.' + pg
    return en


def norm(c):
    c = re.sub(r'\s+', ' ', c).strip()
    # trim a trailing sentence period but keep decimals like "0.45"
    c = re.sub(r'(?<=[^\d])\.$', '', c)
    return c.strip(' \u2014-:;,')


def is_equation(c):
    """'=' plus a math signal, with a compact non-prose LHS."""
    if len(c) < 6 or len(c) > MAX_EQ_CHARS:
        return False
    if '=' not in c or not MATHY.search(c):
        return False
    if SENT_BREAK.search(c):            # sentence, not an equation
        return False
    lhs = c.split('=', 1)[0].strip()
    if not lhs or len(lhs) > 45:
        return False
    if len(PROSE_WORDS.findall(lhs)) > 1:
        return False
    # LHS must be a compact math expression, not a phrase or a fragment
    # ("0.5)", "372 columns", "(OL, skill, front, DB, Questionable)")
    if not (IDENT_LHS.match(lhs) or MATHY_LHS.match(lhs)
            or lhs[0] in '$\\{' or lhs.endswith(']')
            or re.fullmatch(r'[A-Za-z0-9_^{}\\\[\]()\s+\-*/^,.|<>=]{1,45}', lhs)
            and len(lhs.split()) <= LHS_TOKENS):
        return False
    if sum(ch.isalpha() for ch in c) / len(c) > 0.78:
        return False
    return True


def _expand(text, eq_start):
    """Maximal math-like span around the '=' at eq_start, stopping at prose."""
    i = eq_start
    l = i
    while l > 0 and (i - l) < LEFT_MAX:
        if SENT_BREAK.search(text[max(0, l - 3):l + 2]):
            break
        ch = text[l - 1]
        if ch in BAD_CHARS or ch not in MATH_CHARS:
            break
        if text[l - 2:l] == '  ':          # markdown cell padding
            break
        l -= 1
    r = i + 1
    while r < len(text) and (r - i) < RIGHT_MAX:
        if SENT_BREAK.search(text[r:r + 3]):
            break
        ch = text[r]
        if ch in BAD_CHARS or ch not in MATH_CHARS:
            break
        if text[r + 1:r + 3] == '  ':
            break
        r += 1
    return norm(text[l:r])


def segments(line):
    """Yield candidate math segments from one line."""
    for m in CODE_SPAN.finditer(line):
        yield norm(m.group(1))
    for m in DOLLAR.finditer(line):
        yield norm(m.group(1) or m.group(2))
    for m in FORM_SPAN.finditer(line):
        yield norm(m.group(0))
    if line.strip().startswith('|'):
        units = [c for c in (x.strip() for x in line.strip().strip('|').split('|')) if c]
    else:
        units = [line]
    for u in units:
        for m in EQUAL.finditer(u):
            yield _expand(u, m.start())


def candidates(text):
    for line in text.splitlines():
        if '=' not in line:
            continue
        seen_here = set()
        for cand in segments(line):
            if not is_equation(cand):
                continue
            key = re.sub(r'\s+', ' ', cand)
            if key in seen_here:
                continue
            seen_here.add(key)
            yield cand


def main():
    first_wave = int(sys.argv[1]) if len(sys.argv) > 1 else 9007
    out_dir = sys.argv[2] if len(sys.argv) > 2 else QUEUE
    os.makedirs(out_dir, exist_ok=True)

    # ROOT only: no descent into subdirectories.
    files = []
    for name in sorted(os.listdir(CORPUS)):
        p = os.path.join(CORPUS, name)
        if os.path.isfile(p) and name.lower().endswith(('.md', '.txt')):
            files.append(p)

    chunks = [files[i:i + PER_FILE] for i in range(0, len(files), PER_FILE)] or [[]]
    totals = {'docs': 0, 'equations': 0, 'errors': 0, 'no_equation': 0,
              'waves_run': 0}
    written = []

    for ci, chunk in enumerate(chunks):
        wave = first_wave + ci
        qpath = os.path.join(out_dir, 'wave-%04d.jsonl' % wave)
        n_eq = n_no = n_err = 0
        with open(qpath, 'w', encoding='utf-8') as q:
            for path in chunk:
                try:
                    size = os.path.getsize(path)
                    if size > MAX_BYTES:
                        q.write(json.dumps({'file': path, 'status': 'SKIPPED_LARGE',
                                            'bytes': size, 'wave': wave}) + '\n')
                        n_err += 1
                        continue
                    with open(path, encoding='utf-8', errors='replace') as fh:
                        text = fh.read()
                    if not text.strip():
                        q.write(json.dumps({'file': path, 'status': 'NO_EQUATION',
                                            'wave': wave}) + '\n')
                        n_no += 1
                        continue
                    aid = arxiv_id_of(text)
                    seen = set()
                    found = 0
                    for cand in candidates(text):
                        if is_secret(cand):
                            continue
                        key = re.sub(r'\s+', ' ', cand)
                        if key in seen:
                            continue
                        seen.add(key)
                        pos = text.find(cand[:50])
                        q.write(json.dumps({
                            'file': path,
                            'arxiv_id': aid,
                            'equation': cand,
                            'page_or_eqnum': locator(text, pos) if pos >= 0 else None,
                            'wave': wave,
                        }, ensure_ascii=False) + '\n')
                        n_eq += 1
                        found += 1
                    if not found:
                        q.write(json.dumps({'file': path, 'status': 'NO_EQUATION',
                                            'wave': wave}) + '\n')
                        n_no += 1
                except Exception as ex:
                    q.write(json.dumps({'file': path, 'status': 'ERROR',
                                        'error': str(ex)[:120], 'wave': wave}) + '\n')
                    n_err += 1
        totals['docs'] += len(chunk)
        totals['equations'] += n_eq
        totals['no_equation'] += n_no
        totals['errors'] += n_err
        totals['waves_run'] += 1
        written.append({'wave': wave, 'docs': len(chunk), 'equations': n_eq,
                        'no_equation': n_no, 'errors': n_err,
                        'queue_file': qpath})
        with open(os.path.join(out_dir, 'wave-%04d-receipt.json' % wave), 'w',
                  encoding='utf-8') as f:
            json.dump({'wave': wave, 'corpus': CORPUS, 'slice': 'root-only (maxdepth 1)',
                       'docs': len(chunk), 'equations': n_eq,
                       'no_equation': n_no, 'errors': n_err}, f, indent=2)

    print(json.dumps({'totals': totals, 'waves': written}))


if __name__ == '__main__':
    main()