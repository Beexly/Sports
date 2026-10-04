"""Extract equations from the three Beexly repos' REMOTE trees.

export_git_trees.py materialized origin/main blobs for:
  agent_bus         5328 docs  (sha a136ac17 -- local checkout is 17 commits behind)
  sports            3991 docs  (sha 79f09e98 -- local is on a feature branch, not main)
  gse_comp_intel     981 docs  (sha cc4bc740)
                    ------
                    10300 documents the local working trees never exposed

Uses the same proven gate as extract_remaining_corpora.py: relation operator with
math on BOTH sides, balanced brackets, not ending on an operator, limited prose,
and an enforced verbatim-substring check against the blob it came from.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
EXPORT = os.path.join(HERE, 'git-tree-export.json')

REL = re.compile(r'(?<![<>!=])=(?![=><])|[\u2264\u2265\u2248\u2190]')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
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
    if OPERATOR_END.search(line) or not balanced(line):
        return False
    ms = list(REL.finditer(line))
    if not ms:
        return False
    last = ms[-1]
    return bool(MATHY.search(line[:last.start()]) and MATHY.search(line[last.end():])) \
        and prose_words(line) <= 12


def main():
    export = json.load(open(EXPORT, encoding='utf-8'))
    total = Counter()
    for name, info in export.items():
        root = info['extracted_to']
        if not os.path.isdir(root):
            print('%-16s MISSING %s' % (name, root))
            continue
        kept, junk, dupes, nonverb = [], 0, 0, 0
        seen = set()
        for fn in sorted(os.listdir(root)):
            p = os.path.join(root, fn)
            if not os.path.isfile(p):
                continue
            try:
                text = open(p, encoding='utf-8', errors='replace').read()
            except Exception:
                continue
            for ln in text.splitlines():
                s = ln.strip()
                if not s or s.startswith(('#', '|', '```', '|---')):
                    continue
                if not acceptable(s):
                    if '=' in s:
                        junk += 1
                    continue
                if s not in text:
                    nonverb += 1
                    continue
                key = (fn, s)
                if key in seen:
                    dupes += 1
                    continue
                seen.add(key)
                kept.append({'equation': s, 'path': p, 'status': 'EQUATION',
                             'source': 'git_%s' % name, 'verbatim': True,
                             'git_sha': info['sha']})
        out = os.path.join(Q, 'git-%s.jsonl' % name)
        with open(out, 'w', encoding='utf-8') as fh:
            for r in kept:
                fh.write(json.dumps(r, ensure_ascii=False) + '\n')
        print('%-16s blobs=%-6d eq=%-6d junk=%-6d dup=%-4d nonverbatim=%d'
              % (name, len(os.listdir(root)), len(kept), junk, dupes, nonverb))
        total[name] = len(kept)

    print('\nTOTAL new equations from remote trees: %d' % sum(total.values()))


if __name__ == '__main__':
    main()