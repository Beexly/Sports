"""Extract equations from the Downloads research deliverables + Drive folder.

These are hand-authored research outputs, not scraped prose, so they are the
highest-value corpus in this session:
  * "Deep Research Equation Extraction (3).docx" -- 4.4 MB, contains a
    "Formatted Extraction Payload" with equation_latex AND printed_page AND
    status per row, plus a Galaxy Sports Edge blueprint with the Frank copula,
    Kelly, ECE, CRPS, Murphy decomposition.
  * agent-result*.json -- delegated agent research results
  * firecrawl_activity_logs*.csv -- scrape ledgers (mostly metadata)
  * FIRECRAWLTOTALDOMINANCE.md, MEMORY.md

Docx is read via the already-extracted text the reader produces, so this reads
the .docx through zipfile+XML rather than trusting a lossy re-render.
"""
import glob, html, json, os, re, zipfile
from collections import Counter

DL = 'C:/Users/Garrett/Downloads'
HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')

TARGETS = []
for pat in ('agent-result*.json', '*_agent_results.json', 'firecrawl_activity_logs*.csv',
            'FIRECRAWLTOTALDOMINANCE.md', 'MEMORY.md', 'Deep Research Equation Extraction*.docx'):
    TARGETS.extend(glob.glob(os.path.join(DL, pat)))

REL = re.compile(r'(?<![<>!=])=(?![=><])|[\u2264\u2265\u2248\u2190]|:=|\\le\b|\\ge\b')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
OPERATOR_END = re.compile(r'[=<>\u2264\u2265\u2248\u2190:,]\s*$')
LETTERS = re.compile(r'[A-Za-z]{4,}')


def balanced(s):
    return (s.count('{') == s.count('}') and s.count('(') == s.count(')')
            and s.count('[') == s.count(']'))


def prose_words(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    s = re.sub(r'\\[A-Za-z]+', ' ', s)
    return len(LETTERS.findall(s))


def acceptable(line):
    if len(line) < 8 or len(line) > 500:
        return False
    if OPERATOR_END.search(line):
        return False
    ms = list(REL.finditer(line))
    if not ms:
        return False
    last = ms[-1]
    lhs, rhs = line[:last.start()], line[last.end():]
    if not (MATHY.search(lhs) and MATHY.search(rhs)):
        return False
    if prose_words(line) > 14:
        return False
    # the docx renders math on separate short lines; keep those whole
    return True


def docx_text(path):
    """Extract paragraph text straight from the OOXML, preserving math runs."""
    try:
        with zipfile.ZipFile(path) as z:
            xml = z.read('word/document.xml').decode('utf-8', 'replace')
    except Exception:
        return ''
    xml = re.sub(r'</w:p>', '\n', xml)
    xml = re.sub(r'<w:tab[^>]*/>', ' ', xml)
    xml = re.sub(r'<w:br[^>]*/>', ' ', xml)
    txt = re.sub(r'<[^>]+>', '', xml)
    return html.unescape(txt)


def payload_rows(text):
    """Pull equation_latex + printed_page + status out of embedded JSON payloads."""
    out = []
    for m in re.finditer(r'"equation_latex"\s*:\s*"((?:[^"\\]|\\.)*)"', text):
        eq = m
        blob = text[max(0, m.start() - 400): m.end() + 400]
        latex = eq.group(1)
        if not latex or latex == 'NOT_IN_PDF':
            continue
        page = re.search(r'"printed_page"\s*:\s*"([^"]*)"', blob)
        st = re.search(r'"status"\s*:\s*"([^"]*)"', blob)
        rid = re.search(r'"id"\s*:\s*"([^"]*)"', blob)
        out.append({
            'equation': latex.replace('\\"', '"').replace('\\\\', '\\'),
            'payload_id': rid.group(1) if rid else None,
            'printed_page': page.group(1) if page else None,
            'payload_status': st.group(1) if st else None,
        })
    return out


def walk_json(obj, acc):
    if isinstance(obj, dict):
        eq = None
        for k in ('equation', 'equation_latex', 'formula', 'expression', 'latex'):
            v = obj.get(k)
            if isinstance(v, str) and len(v) > 7 and REL.search(v):
                eq = v
                break
        if eq:
            acc.append({
                'equation': eq,
                'payload_id': obj.get('id') or obj.get('name'),
                'printed_page': obj.get('printed_page') or obj.get('page'),
                'payload_status': obj.get('status'),
            })
        for v in obj.values():
            walk_json(v, acc)
    elif isinstance(obj, list):
        for v in obj:
            walk_json(v, acc)


def main():
    kept, seen = [], set()
    by_source = Counter()
    payload_total = 0

    for path in sorted(set(TARGETS)):
        name = os.path.basename(path)
        low = name.lower()
        text = ''
        if low.endswith('.docx'):
            text = docx_text(path)
        elif low.endswith('.json'):
            try:
                obj = json.load(open(path, encoding='utf-8', errors='replace'))
            except Exception:
                continue
            acc = []
            walk_json(obj, acc)
            payload_total += len(acc)
            for r in acc:
                eq = r['equation'].strip()
                k = (name, eq)
                if k in seen or len(eq) < 8:
                    continue
                seen.add(k)
                kept.append({'equation': eq, 'path': path, 'status': 'EQUATION',
                             'source': 'downloads', 'verbatim': True,
                             'printed_page': r['printed_page'],
                             'payload_status': r['payload_status'],
                             'payload_id': r['payload_id']})
                by_source[name] += 1
            continue
        else:
            try:
                text = open(path, encoding='utf-8', errors='replace').read()
            except Exception:
                continue

        # every text-ish file: line scan PLUS embedded JSON payload
        for r in payload_rows(text):
            payload_total += 1
            eq = r['equation'].strip()
            k = (name, eq)
            if k in seen or len(eq) < 8:
                continue
            seen.add(k)
            kept.append({'equation': eq, 'path': path, 'status': 'EQUATION',
                         'source': 'downloads', 'verbatim': True,
                         'printed_page': r['printed_page'],
                         'payload_status': r['payload_status'],
                         'payload_id': r['payload_id']})
            by_source[name] += 1

        lines = text.splitlines()
        if low.endswith('.csv'):
            import csv as _csv
            try:
                rows = list(_csv.reader(lines))
            except Exception:
                rows = [ln.split(',') for ln in lines]
            cells = []
            for row in rows:
                cells.extend(row)
            lines = cells
        for ln in lines:
            s = ln.strip().strip('"')
            if not s or s.startswith(('#', '|', '```', '|---')):
                continue
            if not acceptable(s):
                continue
            k = (name, s)
            if k in seen:
                continue
            seen.add(k)
            kept.append({'equation': s, 'path': path, 'status': 'EQUATION',
                         'source': 'downloads', 'verbatim': True,
                         'printed_page': None, 'payload_status': 'LINE_SCAN',
                         'payload_id': None})
            by_source[name] += 1

    out = os.path.join(Q, 'downloads-research.jsonl')
    with open(out, 'w', encoding='utf-8') as fh:
        for r in kept:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')

    print(json.dumps({
        'files_scanned': len(set(TARGETS)),
        'payload_equations_seen': payload_total,
        'equations_kept': len(kept),
        'out': out,
        'by_source': dict(by_source.most_common()),
    }, indent=1))


if __name__ == '__main__':
    main()