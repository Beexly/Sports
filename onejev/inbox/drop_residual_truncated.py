"""Drop residual truncated rows from git-tree-equations.jsonl.

Seven rows survived the gate because TRUNC_LEFT is `^[A-Za-z_\\\\]+\\s*=\\s*$` --
it only matches when the LEFT-HAND SIDE is a bare identifier with nothing before
it. A span that begins mid-word (`mu}_{i}^{(g)}(t)=...\\quad\\text{`, `t}\\sum...`)
never matches, so it is classified EQUATION and then ends on an operator.

A row ending on any of these is truncated, regardless of where the span starts:
  =            empty right-hand side
  \\text{      LaTeX group opened and never closed
  \\mathrm{    same
  \\            bare backslash -- the expression was cut mid-command

Every other row is preserved byte-for-byte. No mind.jsonl, no trainer, no kill.
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
POOL = os.path.join(HERE, 'mind-queue', 'git-tree-equations.jsonl')

TRUNCATED_END = re.compile(r'(?:=\s*|\\(?:text|mathrm|mathbf|mathit|operatorname)\{\s*|\\\s*)$')


def is_truncated_tail(eq):
    return bool(TRUNCATED_END.search(eq.rstrip()))


def main():
    lines = open(POOL, encoding='utf-8', errors='replace').read().splitlines()
    kept, dropped = [], []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            dropped.append(('unparseable', line))
            continue
        eq = str(r.get('equation') or '')
        if is_truncated_tail(eq):
            dropped.append(('truncated_tail', eq))
            continue
        kept.append(line)

    with open(POOL, 'w', encoding='utf-8') as fh:
        for line in kept:
            fh.write(line + '\n')

    print('dropped   : %d' % len(dropped))
    for why, eq in dropped:
        print('   %-16s %r' % (why, eq[:96]))
    print('remaining : %d' % len(kept))


if __name__ == '__main__':
    main()