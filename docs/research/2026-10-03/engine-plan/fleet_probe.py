"""Fleet probe: which free/cheap endpoints answer a JSON extraction task right now. Keys are read from Hermes config/.env, never printed."""
import os, json, time, re, urllib.request, concurrent.futures as cf
import yaml
H = os.path.expandvars(r'%LOCALAPPDATA%\hermes')
cfg = yaml.safe_load(open(os.path.join(H, 'config.yaml'), encoding='utf-8'))
env = {}
for line in open(os.path.join(H, '.env'), encoding='utf-8', errors='ignore'):
    m = re.match(r'^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$', line)
    if m: env[m.group(1)] = m.group(2).strip().strip('"').strip("'")
def k(name): return os.environ.get(name) or env.get(name)
P = cfg['providers']
ENDPOINTS = {
    'zen': (P['opencode-zen']['base_url'], P['opencode-zen']['api_key']),
    'zen2': ('https://opencode.ai/zen/v1', P['opencode-zen']['api_key']),
    'or1': ('https://openrouter.ai/api/v1', k('OPENROUTER_API_KEY')),
    'or2': ('https://openrouter.ai/api/v1', k('OPENROUTER_API_KEY2')),
    'nvidia': ('https://integrate.api.nvidia.com/v1', k('NVIDIA_API_KEY')),
    'cerebras': ('https://api.cerebras.ai/v1', k('CEREBRAS_API_KEY')),
    'groq': ('https://api.groq.com/openai/v1', k('GROQ_API_KEY')),
}
def req(url, key, body=None, timeout=90):
    r = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
                               headers={'Authorization': 'Bearer ' + (key or ''), 'Content-Type': 'application/json', 'HTTP-Referer': 'https://github.com/Beexly', 'X-Title': 'GSE corpus reader', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) opencode/1.0'})
    with urllib.request.urlopen(r, timeout=timeout) as f: return json.loads(f.read())
def models(ep):
    base, key = ENDPOINTS[ep]
    try: return [m['id'] for m in req(base + '/models', key)['data']], [m for m in req(base + '/models', key)['data']] if ep.startswith('or') else None
    except Exception as e: return [], str(e)[:120]
TASK = 'Return ONLY JSON {"component": one of [ingest,encode,perceive,reason,price,decide,grade,learn,chart,ops], "numbers": [list of numeric facts]} for this text: "Elo plus per-QB EPA16 cut log loss from 0.6392 to 0.6302 on 1,185 games."'
def probe(ep, model):
    base, key = ENDPOINTS[ep]; t = time.time()
    try:
        d = req(base + '/chat/completions', key, {'model': model, 'messages': [{'role': 'user', 'content': TASK}], 'max_tokens': 3000, 'temperature': 0})
        txt = d['choices'][0]['message'].get('content') or ''
        ok = bool(re.search(r'\{.*"component".*\}', txt, re.S))
        return dict(ep=ep, model=model, ok=ok, secs=round(time.time() - t, 1), sample=txt[:120].replace('\n', ' '))
    except urllib.error.HTTPError as e: return dict(ep=ep, model=model, ok=False, secs=round(time.time() - t, 1), err=f'HTTP {e.code} ' + e.read().decode(errors='replace')[:150])
    except Exception as e: return dict(ep=ep, model=model, ok=False, secs=round(time.time() - t, 1), err=str(e)[:150])
if __name__ == '__main__':
    cat = {}
    for ep in ENDPOINTS:
        ids, extra = models(ep); cat[ep] = ids
        print(ep, 'models', len(ids), '' if ids else extra)
    want = []
    zen_models = ['space-bunny-free', 'muse-spark-1.3-contributor-free', 'mimo-v2.6-flash-free', 'gpt-6.1-sol', 'fledge-alpha-free']
    zep = 'zen' if any(m in cat.get('zen', []) for m in zen_models) or not cat.get('zen2') else 'zen2'
    want += [(zep, m) for m in zen_models]
    orfree = [m for m in cat.get('or1', []) if m.endswith(':free')]
    print('openrouter :free models', len(orfree), orfree[:60])
    want += [('or1', m) for m in orfree] 
    nv = [m for m in cat.get('nvidia', []) if 'ultra' in m.lower() or 'nemotron' in m.lower()]
    print('nvidia nemotron/ultra', nv[:30])
    want += [('nvidia', m) for m in nv if 'ultra' in m.lower()][:4]
    want += [('cerebras', m) for m in cat.get('cerebras', [])][:6] + [('groq', m) for m in cat.get('groq', []) if not any(x in m for x in ('whisper', 'guard', 'tts', 'orpheus'))][:8]
    with cf.ThreadPoolExecutor(16) as ex: res = list(ex.map(lambda a: probe(*a), want))
    json.dump(dict(catalog=cat, probes=res), open('fleet_probe.json', 'w'), indent=1)
    for r in sorted(res, key=lambda r: (not r['ok'], r['secs'])): print(('OK ' if r['ok'] else 'NO ') + f"{r['ep']:8} {r['model'][:60]:60} {r['secs']:6}s " + (r.get('sample') or r.get('err', ''))[:110])
