"""Write mind-queue/agree-drain.jsonl from AGREE rows via eq_recover.recover().

Reads wave-agreement-gemini.jsonl, keeps only rows already marked AGREE, then
applies eq_recover (the 4-word prose gate is GONE -- Bayes and auROC rows stay
equations). Writes a side file: no trainer is retargeted, brain/mind.jsonl is
never opened, nothing is swept.

Drops: JUNK, TRUNCATED, and duplicates on (path, equation).
Output rows carry the verbatim span and a source path, nothing else.
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover import recover, drain_row, JSX

Q = os.path.join(HERE, 'mind-queue')
SRC = os.path.join(Q, 'wave-agreement-gemini.jsonl')
DEST = os.path.join(Q, 'agree-drain.jsonl')
RECEIPT = os.path.join(HERE, 'wave-receipt.log')


def main():
    rows = []
    with open(SRC, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('status') == 'AGREE' and r.get('printed_equation'):
                rows.append(r)

    kept, junk, truncated, dups, nonverbatim = [], 0, 0, 0, 0
    jsx = 0
    seen = set()
    for r in rows:
        printed = r['printed_equation']
        got = recover(printed)
        if got['status'] == 'JUNK':
            junk += 1
            if JSX.search(printed):
                jsx += 1
            continue
        if got['status'] == 'TRUNCATED':
            truncated += 1
            continue
        item = drain_row(r)
        if not item:
            junk += 1
            continue
        if not item.get('verbatim'):
            nonverbatim += 1
            continue
        # eq_recover checks text.endswith("=") on the WHOLE row, but the span it
        # extracts can still end on a bare operator when the source row was cut
        # off mid-statement ('r =', 'h(c) =', 'IE =', '... ->'). Those are
        # truncated and must not enter the drain file.
        if re.search(r"[=<>≤≥≈←:]\s*$|->\s*$", item["equation"]):
            truncated += 1
            continue
        key = (item['path'], item['equation'])
        if key in seen:
            dups += 1
            continue
        seen.add(key)
        kept.append({'equation': item['equation'],
                     'path': item['path'],
                     'status': 'AGREE_RECOVERED',
                     'verbatim': True})

    with open(DEST, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    ps = "$o=Get-CimInstance Win32_OperatingSystem; '{0:N2}' -f ($o.FreePhysicalMemory/1MB)"
    ram = subprocess.run(['powershell', '-NoProfile', '-Command', ps],
                         capture_output=True, text=True).stdout.strip()
    p8000 = subprocess.run(
        ['powershell', '-NoProfile', '-Command',
         "$c=Get-NetTCPConnection -State Listen -LocalPort 8000 -ErrorAction SilentlyContinue; "
         "if($c){'LISTENING'}else{'DOWN'}"],
        capture_output=True, text=True).stdout.strip()

    line = ("drain kept=%d junk=%d truncated=%d jsx_dropped=%d dups=%d "
            "nonverbatim=%d agree_in=%d ram_gb=%s port_8000=%s kills=0 picks=0 ts=%s" % (
                len(kept), junk, truncated, jsx, dups, nonverbatim, len(rows),
                ram, p8000, time.strftime('%Y-%m-%dT%H:%M:%S')))
    with open(RECEIPT, 'a', encoding='utf-8') as fh:
        fh.write(line + '\n')

    print(json.dumps({
        'agree_rows_in': len(rows),
        'kept': len(kept), 'junk': junk, 'truncated': truncated,
        'jsx_dropped': jsx,
        'duplicates_dropped': dups, 'nonverbatim_dropped': nonverbatim,
        'out': DEST, 'ram_gb': ram, 'port_8000': p8000, 'kills': 0,
    }, indent=1))

    print('\n--- first 6 drain rows ---')
    for k in kept[:6]:
        print('  %s  %s' % (k['equation'][:78], os.path.basename(k['path'])[:40]))


if __name__ == '__main__':
    main()