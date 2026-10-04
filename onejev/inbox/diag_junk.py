"""Print exact repr + which gate branch admitted each junk row."""
import importlib.util, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cw', os.path.join(HERE, 'clean_wave_index.py'))
cw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cw)

NEEDLES = ('QB-quality artifact', 'unquestioned WR1', 'pure noise')
for line in open(os.path.join(HERE, 'mind-queue', 'wave-index.jsonl'), encoding='utf-8'):
    if not line.strip():
        continue
    r = json.loads(line)
    eq = r.get('equation', '')
    if any(n in eq for n in NEEDLES):
        print('---')
        print('raw   :', repr(eq))
        print('clean :', repr(cw.clean(eq)))
        print('balanced:', cw.balanced(cw.clean(eq)))
        print('is_equation:', cw.is_equation(cw.clean(eq)))
        c = cw.clean(eq)
        for m in re.finditer(r'(?<![<>!=])=(?!=)', c):
            before = c[:m.start()]
            print(f"  '=' at {m.start()} quote_parity_dq={before.count(chr(34))%2} "
                  f"sq={before.count(chr(39))%2} rhs_ok={cw._rhs_ok(before, c[m.end():])} "
                  f"rhs={c[m.end():][:40]!r}")