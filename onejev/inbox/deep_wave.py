"""Deep-read wave worker (corpus-deep slice): walk a directory of .md deep-reads,
extract PRINTED equations with the same rules as night_wave.py, write queue rows.

Usage: deep_wave.py <root_dir> <start_index> <end_index> <wave_number>

Rules (identical to night_wave.py):
- Only equations the document PRINTS (regex over visible math). No guessing, no synthesis.
- Each row: file, arxiv_id or null, equation, page/equation number if printed nearby, wave.
- No equation -> one NO_EQUATION row with the file.
- Lines that look like keys/tokens/passwords are skipped, never stored.
- No writes to brain/mind.jsonl. Queue file only.
"""
import json, os, re, sys

QUEUE = r'C:\Users\Garrett\onejev\inbox\mind-queue'

EQ_PATTERNS = [
    re.compile(r'\$\$(.+?)\$\$', re.S),
    re.compile(r'(?<!\\)\$([^$\n]{4,})'),
    re.compile(r'\\begin\{equation\}(.+?)\\end\{equation\}', re.S),
    re.compile(r'\\begin\{align\*?\}(.+?)\\end\{align\*?\}', re.S),
]
MATHY = re.compile(r'[σθλαβγδφΣℓ⟨⟩ᵀ←∂~⁰²⁻ᵢⱼ]|\\frac|\\log|\\exp|\\sigma|\\sum|\\prod')
EQNUM_MARK = re.compile(r'\(eq\.?\s*([\d.]+)\)')
PROSE_EQ = re.compile(r'^\s*[-•*]\s*(.+)$')
EQNUM = re.compile(r'\((\d+(?:\.\d+)*)\)\s*$')
ARXIV_ID = re.compile(r'arxiv[:\s]*(\d{4}\.\d{4,5}(?:v\d+)?)', re.I)
SECRET = re.compile(r'(sk-[A-Za-z0-9_-]{16,}|api[_-]?key|bearer\s+\S+|password\s*[:=]|token\s*[:=]\s*\S+|gsk_|oc_sk_|rnd_|ghp_|AKIA)', re.I)


def looks_secret(line):
    return bool(SECRET.search(line))


# The printed-equation rule, applied to every candidate from every branch:
# the candidate must show '=' together with a math symbol, or one of the strong
# math forms (\\frac/\\log/\\exp/\\sum/\\prod, P(...)/E[...]).
STRONG = re.compile(r'\\frac|\\log|\\exp|\\sum|\\prod|\\int|\\sqrt|\\partial|\\mathbb')


def is_equation(cand):
    if not cand or len(cand) > 400 or '=' not in cand:
        return False
    if looks_secret(cand):
        return False
    if MATHY.search(cand) or STRONG.search(cand):
        return True
    if re.search(r'\b[PpYyLlFfSs]\s*[(_]', cand):
        return True
    if re.search(r'\w_\{?[a-z0-9]\}?\s*[=±]', cand):
        return True
    # Needs real math content: a relation plus at least a couple of math letters/symbols,
    # else it is prose or a table cell.
    return len(re.findall(r'[A-Za-z\u03b1-\u03c9\u0391-\u03a9]', cand)) >= 6


def extract(text):
    out = []
    for pat in EQ_PATTERNS:
        for m in pat.finditer(text):
            eq = m.group(1).strip()
            if not eq or len(eq) > 2000:
                continue
            if looks_secret(eq):
                continue
            out.append(eq)
    for line in text.splitlines():
        m = PROSE_EQ.match(line) or (re.match(r'^\s*(.{6,})$', line) if '=' in line else None)
        if not m:
            continue
        cand = m.group(1).strip()
        if '=' not in cand or len(cand) > 400:
            continue
        if MATHY.search(cand) or re.search(r'\b[PpYyLl]\s*[(_]', cand) or re.search(r'\w_\{?[a-z0-9]\}?\s*[=±]', cand):
            if looks_secret(cand):
                continue
            out.append(cand)
    seen = set()
    uniq = []
    for e in out:
        # Enforce the printed-equation rule uniformly across both branches: the line must
        # carry '=' plus a math symbol, or one of the strong math forms. Without this the
        # inline-$ branch swallows table cells and prose fragments ('500/season at flat').
        if not is_equation(e):
            continue
        k = re.sub(r'\s+', ' ', e)
        if k not in seen:
            seen.add(k)
            uniq.append(e)
    return uniq


def page_of(text, pos):
    best = None
    for m in re.finditer(r'(?:page|p\.)\s*(\d+)', text[:pos], re.I):
        best = m.group(1)
    return best


def main():
    root, start, end, wave = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    files = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames.sort()
        for fn in sorted(filenames):
            if fn.lower().endswith('.md'):
                files.append(os.path.join(dirpath, fn))
    files.sort()
    slice_files = files[start:end]
    qpath = os.path.join(QUEUE, f'wave-{wave:04d}.jsonl')
    n_eq = n_no = n_err = 0
    with open(qpath, 'a', encoding='utf-8') as q:
        for path in slice_files:
            try:
                if not os.path.isfile(path):
                    q.write(json.dumps({'file': path, 'status': 'MISSING_ON_DISK', 'wave': wave}) + '\n')
                    n_err += 1
                    continue
                text = open(path, encoding='utf-8', errors='replace').read()
                if not text.strip():
                    q.write(json.dumps({'file': path, 'status': 'EMPTY', 'wave': wave}) + '\n')
                    n_no += 1
                    continue
                aid = ARXIV_ID.search(text[:3000])
                eqs = extract(text)
                if not eqs:
                    q.write(json.dumps({'file': path, 'status': 'NO_EQUATION', 'wave': wave}) + '\n')
                    n_no += 1
                    continue
                for e in eqs:
                    row = {
                        'file': path,
                        'arxiv_id': aid.group(1) if aid else None,
                        'equation': e,
                        'page_or_eqnum': None,
                        'wave': wave,
                    }
                    pos = text.find(e[:40])
                    if pos >= 0:
                        pg = page_of(text, pos)
                        en = EQNUM.search(e) or EQNUM.search(text[pos:pos + 3000])
                        row['page_or_eqnum'] = (pg or (en.group(1) if en else None))
                    q.write(json.dumps(row, ensure_ascii=False) + '\n')
                    n_eq += 1
            except Exception as ex:
                q.write(json.dumps({'file': path, 'status': 'ERROR', 'error': str(ex)[:120], 'wave': wave}) + '\n')
                n_err += 1
    print(json.dumps({'wave': wave, 'start': start, 'end': end, 'docs': len(slice_files),
                      'equations': n_eq, 'no_equation': n_no, 'errors': n_err,
                      'queue_file': qpath}))
    with open(os.path.join(QUEUE, f'wave-{wave:04d}-receipt.json'), 'w') as f:
        json.dump({'wave': wave, 'start': start, 'end': end, 'docs': len(slice_files),
                   'equations': n_eq, 'no_equation': n_no, 'errors': n_err}, f)


if __name__ == '__main__':
    main()
