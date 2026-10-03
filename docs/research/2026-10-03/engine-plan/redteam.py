"""Second-brain red team via NVIDIA API Nemotron 3 Ultra (and OpenCode Zen gpt-6.1-sol)."""
import json, sys, os, urllib.request, time
sys.path.insert(0, os.path.dirname(__file__))
from fleet_probe import ENDPOINTS
q = open(os.path.join(os.path.dirname(__file__), 'redteam_query.md'), encoding='utf-8').read()
which = sys.argv[1]
t = time.time()
if which == 'nvidia':
    base, key = ENDPOINTS['nvidia']
    body = {'model': 'nvidia/nemotron-3-ultra-550b-a55b', 'messages': [{'role': 'user', 'content': q}], 'max_tokens': 16000, 'temperature': 0.4}
    r = urllib.request.Request(base + '/chat/completions', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json'})
    d = json.loads(urllib.request.urlopen(r, timeout=1500).read()); txt = d['choices'][0]['message'].get('content') or ''
else:
    base, key = ENDPOINTS['zen2']
    body = {'model': 'gpt-6.1-sol', 'input': q, 'max_output_tokens': 16000}
    r = urllib.request.Request(base + '/responses', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 opencode/1.0'})
    d = json.loads(urllib.request.urlopen(r, timeout=1500).read())
    txt = d.get('output_text') or ''.join(c.get('text', '') for o in (d.get('output') or []) for c in (o.get('content') or []) if isinstance(c, dict))
open(os.path.join(os.path.dirname(__file__), f'redteam_{which}.md'), 'w', encoding='utf-8').write(txt)
print(which, len(txt), round(time.time() - t), 's')
