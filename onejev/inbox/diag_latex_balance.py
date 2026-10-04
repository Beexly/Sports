"""Confirm the \\big( bracket-counting bug before touching eq_recover.py.

drain_reasons.py shows 4,301 rows dropped as truncated_unbalanced_or_cut.
Sampling shows two populations:
  REAL truncation   '\\sin(2\\pi n(y+k/n))-b\\sin(2\\pi ny)=\\alpha\\'   ends on a backslash
                    '\\ell(...)=1-|Y\\cap C|/'                        missing RHS
  GATE BUG          '\\tau^{*}_{\\delta}=\\tau(\\delta^{-\\alpha})'   complete and balanced

_balanced() counts '(' and ')' naively. LaTeX SIZING/DELIMITER commands open a
group without a plain closer: \\big( \\Big( \\left( \\bigl[ \\big\\{ ...
The matching \\big) / \\right) is a DIFFERENT token, so the count never balances
and a perfectly good equation is dropped.

This script quantifies the bug: how many dropped rows are actually balanced once
LaTeX sizing delimiters are accounted for.
"""
import json
import re
import sys
from collections import Counter

sys.path.insert(0, '.')
from eq_recover import recover, JSX, TRUNC_LEFT, DANGLING  # noqa: E402

# \big \Big \bigg \Bigg optionally followed by a delimiter char
SIZING = re.compile(r'\\(?:bigg?|Bigg?)\s*([([{\u007b|])')
SIZING_CLOSE = re.compile(r'\\(?:bigg?|Bigg?)\s*([)\]}])')

SRC = 'mind-queue/wave-agreement-gemini.jsonl'


def balanced_latex(s):
    """Bracket balance that understands \\big( ... \\big) and \\left( ... \\right)."""
    t = s
    # normalise paired LaTeX delimiters to plain ones so counting works
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\\?\{', '{', t)
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\\?\}', '}', t)
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\|', '|', t)
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\(', '(', t)
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\)', ')', t)
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\[', '[', t)
    t = re.sub(r'\\(?:bigg?|Bigg?)\s*\]', ']', t)
    t = re.sub(r'\\left\s*', '', t)
    t = re.sub(r'\\right\s*', '', t)
    return (t.count('{') == t.count('}')
            and t.count('(') == t.count(')')
            and t.count('[') == t.count(']'))


def main():
    rows = []
    for line in open(SRC, encoding='utf-8', errors='replace'):
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if str(r.get('status') or '').upper() in {'AGREE', 'AGREED', 'AGREE_RECOVERED'}:
            rows.append(r)

    dropped = []
    for r in rows:
        t = str(r.get('printed_equation') or r.get('equation') or '').strip()
        if not t or JSX.search(t):
            continue
        if recover(t)['status'] != 'TRUNCATED':
            continue
        if TRUNC_LEFT.match(t) or t.startswith(('...', '\u2026')) or DANGLING.search(t):
            continue
        dropped.append(t)

    print('truncated_unbalanced_or_cut : %d' % len(dropped))
    rescued = [t for t in dropped if balanced_latex(t)]
    still = [t for t in dropped if not balanced_latex(t)]
    print('  RESCUED by LaTeX-aware balancing : %d (%.1f%%)'
          % (len(rescued), 100.0 * len(rescued) / max(1, len(dropped))))
    print('  genuinely truncated             : %d' % len(still))

    # how many of the "rescued" are really just tables / no relation operator
    tables = sum(1 for t in rescued if t.count('\\pm') >= 2 or t.count('\u00b1') >= 2)
    norel = sum(1 for t in rescued if '=' not in t)
    good = len(rescued) - tables - norel
    print('    of the rescued: results-table-like %d, no-relation %d, plausibly equations %d'
          % (tables, norel, good))

    print('\n=== 12 rescued examples (would be dropped today, are balanced) ===')
    for t in rescued[:12]:
        print('   %r' % t[:100])
    print('\n=== 8 genuinely truncated (must stay dropped) ===')
    for t in still[:8]:
        print('   %r' % t[:100])


if __name__ == '__main__':
    main()