import re
import subprocess
from pathlib import Path

rx_name = re.compile(r'(?i)(credentials?|secrets?|passwords?|passwd|client_secret|^\.?env|hf_env|auth[_-]?token|access[_-]?token|bearer|refresh[_-]?token|api[_-]?key|id_rsa|private[_-]?key)')
rx_content = [
    re.compile(r'\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_\-]{15,}\b'),
    re.compile(r'\bsk-[a-zA-Z0-9]{32,}\b'),
    re.compile(r'\bhf_[a-zA-Z0-9]{30,}\b'),
    re.compile(r'\bnpg_[A-Za-z0-9_\-]{12,}\b'),
    re.compile(r'(?i)\b(pgpassword|api[_-]?key|access[_-]?key|secret|password|passwd|pwd|auth[_-]?token)\s*[:=]\s*[\'"][A-Za-z0-9_\-\.]{8,}'),
    re.compile(r'(?i)(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://[^\s]+:[^\s]+@'),
    re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
]

MOCK_RX = re.compile(r'(?i)(YOUR_API_KEY|ODDS_API_KEY|<API_KEY>|API_KEY|YOUR_KEY|REPLACE_ME|CHANGEME)')

output = subprocess.check_output(['git', 'diff', '--name-only', '--cached'], text=True).strip()
files = [f for f in output.split('\n') if f]

violations = []
for file_str in files:
    p = Path(file_str)
    if rx_name.search(p.name):
        violations.append((p, 'NAME MATCH', p.name))
        continue
    if not p.exists() or not p.is_file():
        continue
    text = p.read_text(encoding='utf-8', errors='ignore')
    for rx in rx_content:
        m = rx.search(text)
        if m:
            val = m.group(0)
            if not MOCK_RX.search(val):
                violations.append((p, 'CONTENT MATCH', f"{rx.pattern} -> {val[:40]}"))
                break

print(f"Staged files checked: {len(files)}")
for p, typ, detail in violations:
    print(f"[{typ}] {p}: {detail}")
print(f"Total sensitive violations in staged files: {len(violations)}")
if violations:
    exit(1)
