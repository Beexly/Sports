"""Run the user's OWN case list from eq_recover.py against the wrapper.

Parsed with ast, not regex: a heredoc mangled `[^"\\]` twice already. This reads
the literal `cases = [...]` list out of the user's file and compares base vs
wrapper verdict on every one, so the suite is never transcribed by hand.
"""
import ast
import os
import sys

HERE = r'C:/Users/Garrett/onejev/inbox'
sys.path.insert(0, HERE)
import eq_recover as base
import eq_recover_ineq as ineq

src = open(os.path.join(HERE, 'eq_recover.py'), encoding='utf-8').read()
tree = ast.parse(src)

cases = None
for node in ast.walk(tree):
    if isinstance(node, ast.Assign):
        for t in node.targets:
            if isinstance(t, ast.Name) and t.id == 'cases':
                cases = node.value
if cases is None:
    raise SystemExit('could not find `cases` in eq_recover.py')

def const(node):
    """Fold a constant expression. One case is
    "Q(s)=" + ("b_{h,L}(s)+" * 80) -- a nested BinOp, so this recurses."""
    try:
        return ast.literal_eval(node)
    except ValueError:
        pass
    if isinstance(node, ast.BinOp):
        left = const(node.left)
        right = const(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Mult):
            return left * right
    raise ValueError('cannot fold %r' % ast.dump(node))


pairs = []
for elt in cases.elts:
    if not isinstance(elt, ast.Tuple) or len(elt.elts) != 2:
        continue
    raw = const(elt.elts[0])
    want = ast.literal_eval(elt.elts[1])
    pairs.append((raw, want))

print('cases parsed from eq_recover.py: %d' % len(pairs))
mism = 0
for raw, want in pairs:
    b = base.recover(raw)['status']
    w = ineq.recover(raw)['status']
    if b != w:
        mism += 1
        print('  DIVERGES base=%-10s wrap=%-10s %r' % (b, w, raw[:52]))
    elif w != want:
        mism += 1
        print('  BOTH WRONG want=%s got=%s %r' % (want, w, raw[:52]))
print('mismatches: %d' % mism)
print('RESULT: %s' % ('IDENTICAL -- wrapper changes no case' if mism == 0 else 'MISMATCH'))