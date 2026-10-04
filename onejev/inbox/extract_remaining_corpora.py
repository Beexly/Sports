"""Extract the remaining owned corpora. Nothing gets skipped.

I had decided to skip academy-corpus (~56 projected equations) and
firecrawl-scores24 (~530) as not worth the time. That was the wrong call: the
instruction is to ingest everything under the sun, and a rank of 56 is still 56
equations nobody had. Every owned corpus gets extracted; quality is reported
per corpus rather than used as a reason to exclude one.

Each corpus writes its own output file so provenance stays clean. Rows are
VERBATIM substrings of the source file, deduplicated on (path, equation).
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')

CORPORA = [
    ('firecrawl_scores', 'C:/Users/Garrett/firecrawl-scores24'),
    ('academy_corpus', 'C:/Users/Garrett/OneDrive/academy-corpus'),
    ('gse_comp_intel', 'C:/Users/Garrett/_research/gse-competitive-intel'),
]

REL = re.compile(r'(?<![<>!=])=(?![=><])|[\u2264\u2265\u2248\u2190]')
MATHY = re.compile(
    r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
# same junk classes proven elsewhere: type aliases, status flags, JSX, CSS vars
JUNK = re.compile(
    r'^\s*(?:type\s+\w+\s*=\s*\{|canonicalHistoryStatus\s*=|Add the ternary)'
    r'|(?:className=|entityId=|style=\{\{|pick=\{|var\(--|/>|</)', re.I)
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
    if len(line) < 12 or len(line) > 400 or JUNK.search(line):
        return False
    if OPERATOR_END.search(line):
        return False
    if not balanced(line):
        return False
    ms = list(REL.finditer(line))
    if not ms:
        return False
    last = ms[-1]
    lhs, rhs = line[:last.start()], line[last.end():]
    if not (MATHY.search(lhs) and MATHY.search(rhs)):
        return False
    return prose_words(line) <= 12


def files_under(root):
    out = []
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in ('.git', 'node_modules')]
        for f in fn:
            if f.lower().endswith(('.md', '.txt')):
                out.append(os.path.join(dp, f).replace('\\', '/'))
    return sorted(out)


def main():
    report = {}
    for name, root in CORPORA:
        if not os.path.isdir(root):
            report[name] = {'status': 'MISSING', 'root': root}
            print('%-18s MISSING %s' % (name, root))
            continue
        kept, junk, dupes, nonverbatim = [], 0, 0, 0
        seen = set()
        nfiles = 0
        for p in files_under(root):
            nfiles += 1
            try:
                text = open(p, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            for ln in text.splitlines():
                s = ln.strip()
                if not s or s.startswith(('#', '|', '```')):
                    continue
                if not acceptable(s):
                    if '=' in s or '\u2264' in s or '\u2265' in s:
                        junk += 1
                    continue
                # VERBATIM contract: must be an exact substring of the source
                if s not in text:
                    nonverbatim += 1
                    continue
                key = (p, s)
                if key in seen:
                    dupes += 1
                    continue
                seen.add(key)
                kept.append({'equation': s, 'path': p, 'status': 'EQUATION',
                             'source': name, 'verbatim': True})
        out = os.path.join(Q, '%s.jsonl' % name)
        with open(out, 'w', encoding='utf-8') as fh:
            for r in kept:
                fh.write(json.dumps(r, ensure_ascii=False) + '\n')
        report[name] = {'files': nfiles, 'equations': len(kept), 'junk': junk,
                        'duplicates': dupes, 'nonverbatim': nonverbatim, 'out': out}
        print('%-18s files=%-6d eq=%-6d junk=%-6d dup=%-4d nonverbatim=%d'
              % (name, nfiles, len(kept), junk, dupes, nonverbatim))

    with open(os.path.join(Q, 'remaining-corpora-report.json'), 'w',
              encoding='utf-8') as fh:
        json.dump(report, fh, indent=1)
    tot = sum(v.get('equations', 0) for v in report.values())
    print('\nTOTAL new equations: %d' % tot)


if __name__ == '__main__':
    main()