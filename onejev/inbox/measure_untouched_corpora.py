"""Measure two UNTOUCHED corpora before extracting from either.

1. agent-bus/research/corpus-intelligence  -- 3,728 .brief.md deep reads
2. agent-bus/research/arxiv-sweep/waves    -- 88 files, never swept

Both are outside every root extracted so far. Measure equation yield and prose
contamination BEFORE running a sweep, because the markdown corpus turned out to
be 32.1% prose-leaking and I will not repeat that mistake blind.

Also report structural facts that decide the extractor: line counts per file
(markdown docs are line-structured; arXiv papers are often one line), and
whether files already contain LaTeX.
"""
import glob, os, random, re
from collections import Counter

ROOTS = {
    'corpus_intelligence': 'C:/Users/Garrett/_research/agent-bus/research/corpus-intelligence',
    'arxiv_waves': 'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/waves',
}
EXT = ('.md', '.txt', '.jsonl')
REL = re.compile(r'[=<>\u2264\u2265\u2248\u2190]|:=|\\le\b|\\ge\b|\\approx')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')


def strip_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


def main():
    for name, root in ROOTS.items():
        if not os.path.isdir(root):
            print('MISSING', root)
            continue
        files = []
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if d not in ('.git', 'node_modules', '__pycache__')]
            for f in fn:
                if f.lower().endswith(EXT):
                    files.append(os.path.join(dp, f))
        print('\n=== %s ===' % name)
        print('files:', len(files))

        random.seed(5)
        pick = random.sample(files, min(40, len(files)))
        lines, eq, greek, latex, rel, proserows, tot_rows = [], 0, 0, 0, 0, 0, 0
        sizes = []
        for f in pick:
            try:
                t = open(f, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            sizes.append(len(t))
            lines.append(t.count('\n') + 1)
            for ln in t.splitlines():
                if not ln.strip():
                    continue
                tot_rows += 1
                has_rel = bool(REL.search(ln))
                has_math = bool(MATHY.search(ln))
                if has_rel and has_math:
                    rel += 1
                    bare = strip_cmds(ln)
                    pw = sum(len(re.findall(r'[A-Za-z]{3,}', m.group(0)))
                             for m in PROSE_RUN.finditer(ln))
                    if pw >= 3:
                        proserows += 1
            eq += t.count('=')
            greek += len(MATHY.findall(t))
            latex += len(re.findall(r'\\[A-Za-z]{2,}', t))

        n = len(pick) or 1
        sizes.sort(); lines.sort()
        print('median size      : %d KB' % (sizes[n // 2] // 1024))
        print('median lines/file: %d' % lines[n // 2])
        print('sample eq-ish lines: %d of %d (%.1f%%)' % (
            rel, tot_rows, 100.0 * rel / max(1, tot_rows)))
        print('  of those, prose-leaking: %d (%.1f%%)' % (
            proserows, 100.0 * proserows / max(1, rel)))
        print('"=" in sample     : %d' % eq)
        print('latex cmds sample: %d' % latex)

        # projected yield
        med_eq = eq / n
        print('PROJECTED equations from this corpus: ~%d' % int(med_eq * len(files) * 0.35))


if __name__ == '__main__':
    main()