"""Wave 9010: extract PRINTED equations from the SYNTH_*.md component dossiers.

Usage: synth_eq_wave9010.py
Reads (read-only): _research/ctx-2026-10-03/corpus_extract/SYNTH_*.md
Writes: onejev/inbox/mind-queue/wave-9010.jsonl  (+ wave-9010-receipt.json)

Rules (from the night order):
- PRINTED equations only. A line/bullet must contain '=' AND a math signal
  (greek/math glyph, \\frac|\\log|\\exp|\\sum|\\prod, or a P(...)/E[...] form).
  No guessing, no synthesis -- whatever the dossier prints is what we store.
- Max 400 chars per equation (these are prose bullets, not display math).
- Secret-shaped lines (sk-, api_key, bearer, gsk_, oc_sk_, rnd_, ghp_, AKIA)
  are skipped, never stored.
- A file with no qualifying line gets exactly one NO_EQUATION row.
- A corpus file that is absent on disk gets a MISSING_ON_DISK row, not a crash.
- Never touches brain/mind.jsonl. Corpus is read-only.
"""
import glob, json, os, re, sys

CORPUS = r'C:\Users\Garrett\_research\ctx-2026-10-03\corpus_extract'
QUEUE = r'C:\Users\Garrett\onejev\inbox\mind-queue'
WAVE = 9010

# The 12 component dossiers the wave was scoped to.
EXPECTED = ['chart', 'decide', 'encode', 'grade', 'ingest', 'learn',
            'ops', 'perceive', 'price', 'product', 'reason', 'other']

MAX_LEN = 400

# Math signal. A candidate needs '=' AND one of these.
MATH_GLYPH = re.compile(u'[\u03c3\u03b8\u03bb\u03b1\u03b2\u03b3\u03b4\u03c6'
                        u'\u03a3\u2113\u27e8\u27e9\u1d40\u2190\u2202]')
MATH_TEX = re.compile(r'\\(?:frac|log|exp|sum|prod)\b')
MATH_PE = re.compile(r'\b[PE]\s*[(\[]')          # P(...) / E[...]
# Bare greek that shows up in these dossiers even outside the glyph list.
MATH_GREEK_ANY = re.compile(u'[\u03c3\u03b8\u03bb\u03b1\u03b2\u03b3\u03b4\u03c6'
                            u'\u03a3\u2113\u03c4\u03bc\u03c1\u03bd\u03be\u03be\u03b5'
                            u'\u03f5\u03c6\u03b8]')

EQNUM_MARK = re.compile(r'\(eq\.?\s*([\d.]+)\)', re.I)
EQNUM = re.compile(r'\((\d+(?:\.\d+)*)\)\s*$')
ARXIV_ID = re.compile(r'arxiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)', re.I)
SECRET = re.compile(r'(sk-[A-Za-z0-9_-]{16,}|api[_-]?key|bearer\s+\S+|'
                    r'password\s*[:=]|token\s*[:=]\s*\S+|gsk_|oc_sk_|rnd_|ghp_|AKIA)',
                    re.I)

BULLET = re.compile(r'^\s*(?:[-*\u2022]|\d{1,2}[.)])\s+(.*)$')
HTML_COMMENT = re.compile(r'^\s*<!--')


def is_mathy(cand):
    if MATH_TEX.search(cand) or MATH_PE.search(cand):
        return True
    return bool(MATH_GLYPH.search(cand))


def clean(line):
    """Strip bullet/marker noise, keep the printed text. Truncate to MAX_LEN."""
    m = BULLET.match(line)
    s = m.group(1) if m else line
    s = s.strip()
    s = re.sub(r'^#{1,6}\s*', '', s)            # heading markers
    if len(s) > MAX_LEN:
        s = s[:MAX_LEN - 1].rstrip() + '\u2026'
    return s


def extract(text):
    out, seen = [], set()
    for raw in text.splitlines():
        if not raw.strip():
            continue
        if HTML_COMMENT.match(raw):
            continue                            # metadata banner, not doctrine
        if SECRET.search(raw):
            continue                            # never store secret-shaped lines
        cand = clean(raw)
        if '=' not in cand:
            continue
        if not is_mathy(cand):
            continue
        key = re.sub(r'\s+', ' ', cand)
        if key in seen:
            continue
        seen.add(key)
        out.append(cand)
    return out


def page_or_eqnum(text, line_text):
    """Eq number printed in the line, else nearest (eq. N) in the doc."""
    m = EQNUM.search(line_text)
    if m:
        return m.group(1)
    m = EQNUM_MARK.search(line_text)
    if m:
        return m.group(1)
    pos = text.find(line_text[:40])
    if pos < 0:
        return None
    tail = text[pos:pos + 3000]
    m2 = EQNUM_MARK.search(tail)
    return m2.group(1) if m2 else None


def main():
    qpath = os.path.join(QUEUE, 'wave-%04d.jsonl' % WAVE)
    n_eq = n_no = n_err = 0
    docs = 0
    rows = []
    for comp in EXPECTED:
        path = os.path.join(CORPUS, 'SYNTH_%s.md' % comp)
        docs += 1
        if not os.path.isfile(path):
            rows.append({'file': path, 'status': 'MISSING_ON_DISK', 'wave': WAVE})
            n_err += 1
            continue
        try:
            text = open(path, encoding='utf-8', errors='replace').read()
        except Exception as ex:
            rows.append({'file': path, 'status': 'ERROR', 'error': str(ex)[:120],
                         'wave': WAVE})
            n_err += 1
            continue
        if not text.strip():
            rows.append({'file': path, 'status': 'EMPTY', 'wave': WAVE})
            n_no += 1
            continue
        aid = ARXIV_ID.search(text[:3000])
        eqs = extract(text)
        if not eqs:
            rows.append({'file': path, 'status': 'NO_EQUATION', 'wave': WAVE})
            n_no += 1
            continue
        for e in eqs:
            rows.append({
                'file': path,
                'arxiv_id': aid.group(1) if aid else None,
                'equation': e,
                'page_or_eqnum': page_or_eqnum(text, e),
                'wave': WAVE,
            })
            n_eq += 1

    with open(qpath, 'w', encoding='utf-8') as q:
        for r in rows:
            q.write(json.dumps(r, ensure_ascii=False) + '\n')

    summary = {'wave': WAVE, 'docs': docs, 'equations': n_eq,
               'no_equation': n_no, 'errors': n_err, 'waves_run': 1,
               'queue_file': qpath}
    print(json.dumps(summary))
    with open(os.path.join(QUEUE, 'wave-%04d-receipt.json' % WAVE), 'w',
              encoding='utf-8') as f:
        json.dump(summary, f)


if __name__ == '__main__':
    main()