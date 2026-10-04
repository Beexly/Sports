"""Diagnostic: why are the 902x wave equations not making it into the index?"""
import importlib.util, json, os, glob, collections

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('cw', os.path.join(HERE, 'clean_wave_index.py'))
cw = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cw)

QUEUE = os.path.join(HERE, 'mind-queue')
reasons = collections.Counter()
examples = collections.defaultdict(list)

for wf in sorted(glob.glob(os.path.join(QUEUE, 'wave-*.jsonl'))):
    base = os.path.basename(wf)
    w = base[len('wave-'):-len('.jsonl')]
    if not w.isdigit():
        continue
    for line in open(wf, encoding='utf-8'):
        if not line.strip():
            continue
        try:
            r = json.loads(line)
        except Exception:
            reasons['unparseable_header'] += 1
            continue
        eq = r.get('equation')
        if not eq:
            reasons['no_equation_key'] += 1
            continue
        c = cw.clean(eq)
        if not c:
            reasons['empty_after_clean'] += 1
            examples['empty_after_clean'].append(eq[:70])
            continue
        if '=' not in c:
            reasons['no_equals'] += 1
            examples['no_equals'].append(c[:70])
            continue
        if not cw.is_equation(c):
            reasons['failed_is_equation'] += 1
            examples['failed_is_equation'].append(c[:70])
            continue
        if not cw.balanced(c):
            reasons['unbalanced'] += 1
            continue
        reasons['KEPT'] += 1

print(json.dumps(dict(reasons), indent=1))
for k in ('failed_is_equation', 'no_equals', 'empty_after_clean'):
    if examples[k]:
        print(f"\n-- {k} samples:")
        for e in examples[k][:8]:
            print('   ', e)