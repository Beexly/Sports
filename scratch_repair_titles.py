import io, re

FILES = [
    'app/accountability/page.tsx',
    'app/board/gate/page.tsx',
    'app/bookgrade/page.tsx',
    'app/calibration/market/page.tsx',
    'app/calibration/page.tsx',
    'app/fable/page.tsx',
    'app/fantasy/contests/page.tsx',
    'app/integrity/page.tsx',
    'app/kill-ledger/page.tsx',
    'app/ledger/page.tsx',
    'app/observatory/page.tsx',
    'app/performance/losses/[id]/page.tsx',
    'app/performance/losses/page.tsx',
    'app/pledge/page.tsx',
    'app/proof/page.tsx',
    'app/room/[gameId]/page.tsx',
]

ROOT = 'apps/web'

for rel in FILES:
    p = ROOT + '/' + rel
    s = io.open(p, encoding='utf-8', newline='').read()
    lines = s.split('\n')
    fixed = 0
    for i, ln in enumerate(lines):
        m = re.match(r'^(  )title:\s*(.+?)(\r?),$', ln)
        if not m:
            continue
        expr = m.group(2)
        if expr.startswith('`') and not expr.endswith('`'):
            lines[i] = f"{m.group(1)}title: {expr}`,{m.group(3)}"
            fixed += 1
        elif expr.startswith('"') and not expr.endswith('"'):
            lines[i] = f"{m.group(1)}title: {expr}\",{m.group(3)}"
            fixed += 1
    if fixed:
        io.open(p, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
    print(f'{rel}: {fixed} repaired')
print('DONE')
