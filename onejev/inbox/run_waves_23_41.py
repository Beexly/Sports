"""Run waves 23-41 (files 550-1025) with the night-order RAM gate.

Gate: refuse to start a wave if free physical RAM < 1.2GB. Does not kill
anything; stops cleanly and reports what already completed.
"""
import ctypes, json, os, subprocess, sys, time

PY = r'C:\Users\Garrett\AppData\Local\hermes\hermes-agent\venv\Scripts\python.exe'
SCRIPT = r'C:\Users\Garrett\onejev\inbox\night_wave.py'
INBOX = r'C:\Users\Garrett\onejev\inbox'
QUEUE = os.path.join(INBOX, 'mind-queue')
GATE_BYTES = 1.2 * 1024 ** 3


class Mem(ctypes.Structure):
    _fields_ = [('dwLength', ctypes.c_ulong), ('dwMemoryLoad', ctypes.c_ulong),
                ('ullTotalPhys', ctypes.c_ulonglong), ('ullAvailPhys', ctypes.c_ulonglong),
                ('ullTotalPageFile', ctypes.c_ulonglong), ('ullAvailPageFile', ctypes.c_ulonglong),
                ('ullTotalVirtual', ctypes.c_ulonglong), ('ullAvailVirtual', ctypes.c_ulonglong),
                ('ullAvailExtendedVirtual', ctypes.c_ulonglong)]


def avail_phys():
    m = Mem()
    m.dwLength = ctypes.sizeof(Mem)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ullAvailPhys


def main():
    totals = {'docs': 0, 'equations': 0, 'no_equation': 0, 'errors': 0, 'waves_run': 0}
    stopped = None
    for wave in range(23, 42):
        start = 525 + (wave - 22) * 25
        end = start + 25
        av = avail_phys()
        if av < GATE_BYTES:
            stopped = f'RAM_GATE_BLOCKED at wave {wave}: {av/1024**3:.2f}GB free < 1.2GB'
            print(stopped, flush=True)
            break
        p = subprocess.run([PY, SCRIPT, str(start), str(end), str(wave)],
                           cwd=INBOX, capture_output=True, text=True, timeout=900)
        if p.returncode != 0:
            stopped = f'wave {wave} exit {p.returncode}: {p.stderr.strip()[:200]}'
            print(stopped, flush=True)
            break
        d = json.loads(p.stdout.strip().splitlines()[-1])
        for k in ('docs', 'equations', 'no_equation', 'errors'):
            totals[k] += d[k]
        totals['waves_run'] += 1
        print(f"wave {wave:4d} {start}-{end} docs={d['docs']} eq={d['equations']} "
              f"no_eq={d['no_equation']} err={d['errors']} | "
              f"cum waves={totals['waves_run']} ram={av/1024**3:.2f}GB", flush=True)
        time.sleep(0.5)
    # wave 22 was run separately before this driver
    r22 = json.load(open(os.path.join(QUEUE, 'wave-0022-receipt.json')))
    for k in ('docs', 'equations', 'no_equation', 'errors'):
        totals[k] += r22[k]
    totals['waves_run'] += 1
    totals['stopped'] = stopped
    print('FINAL ' + json.dumps(totals), flush=True)
    with open(os.path.join(INBOX, 'waves-22-41-summary.json'), 'w') as f:
        json.dump(totals, f, indent=2)


if __name__ == '__main__':
    main()