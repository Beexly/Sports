"""Measure yield for three NEW candidate corpora before extracting any of them.

Lesson applied: never sweep blind. gse-competitive-intel and its -export twin
look like 2,110 docs each but are the same content, so sweeping both would
double the pool. firecrawl-scores24 and academy-corpus are unexamined.

For each, sample 40 files and report CLEAN equation lines (relation operator
with math on BOTH sides, balanced, not ending on an operator) separately from
prose-dominant lines, plus whether the files are line-structured markdown.
"""
import glob, os, random, re
from collections import Counter

CANDS = {
    'gse_comp_intel': 'C:/Users/Garrett/_research/gse-competitive-intel',
    'firecrawl_scores': 'C:/Users/Garrett/firecrawl-scores24',
    'academy_corpus': 'C:/Users/Garrett/OneDrive/academy-corpus',
}

REL = re.compile(r'(?<![<>!=])=(?![=><])|[≤≥≈←]')
MATHY = re.compile(r'[0-9α-ωΑ-Ω∑∏∫∂√]|\\[A-Za-z]{2,}')


def balanced(s):
    return s.count('{') == s.count('}') and s.count('(') == s.count(')') and s.count('[') == s.count(']')


def prose_words(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    s = re.sub(r'\\[A-Za-z]+', ' ', s)
    return len(re.findall(r'[A-Za-z]{4,}', s))


def main():
    for name, root in CANDS.items():
        if not os.path.isdir(root):
            print('MISSING', root)
            continue
        files = []
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if d not in ('.git', 'node_modules')]
            for f in fn:
                if f.lower().endswith(('.md', '.txt')):
                    files.append(os.path.join(dp, f))
        print('\n=== %s ===' % name)
        print('md/txt files:', len(files))
        if not files:
            continue

        random.seed(17)
        pick = random.sample(files, min(40, len(files)))
        clean = prosey = norel = 0
        lines_total = 0
        med_lines = []
        for f in pick:
            try:
                t = open(f, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            med_lines.append(t.count('\n') + 1)
            for ln in t.splitlines():
                s = ln.strip()
                if not s or s.startswith(('#', '|', '```')):
                    continue
                lines_total += 1
                ms = list(REL.finditer(s))
                if not ms:
                    if '=' in s:
                        norel += 1
                    continue
                last = ms[-1]
                lhs, rhs = s[:last.start()], s[last.end():]
                if not (MATHY.search(lhs) and MATHY.search(rhs)):
                    prosey += 1
                    continue
                if not balanced(s) or re.search(r'[=<>≤≥≈←:,]\s*$', s):
                    prosey += 1
                    continue
                if prose_words(s) > 12:
                    prosey += 1
                    continue
                clean += 1

        med_lines.sort()
        n = len(pick) or 1
        print('median lines/file :', med_lines[n // 2])
        print('sampled lines     :', lines_total)
        print('CLEAN eq lines    : %d (%.1f%%)' % (clean, 100.0 * clean / max(1, lines_total)))
        print('prose/rejected    : %d' % prosey)
        print('PROJECTED clean   : ~%d' % int(clean / n * len(files)))


if __name__ == '__main__':
    main()