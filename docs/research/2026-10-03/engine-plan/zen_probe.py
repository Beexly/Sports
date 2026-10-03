"""Probe OpenCode Zen paid models over chat/completions and responses."""
import json, urllib.request, urllib.error, yaml, os, time
H = os.path.expandvars(r'%LOCALAPPDATA%\hermes'); key = yaml.safe_load(open(H + '/config.yaml', encoding='utf-8'))['providers']['opencode-zen']['api_key']
HDR = {'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) opencode/1.0'}
T = 'Return ONLY JSON {"docs":[{"path":"x","relevance":7}]}'
def post(path, body):
    t = time.time()
    try:
        d = json.loads(urllib.request.urlopen(urllib.request.Request('https://opencode.ai/zen/v1' + path, data=json.dumps(body).encode(), headers=HDR), timeout=120).read())
        return 'OK', round(time.time() - t, 1), json.dumps(d)[:220]
    except urllib.error.HTTPError as e: return f'HTTP {e.code}', round(time.time() - t, 1), e.read().decode(errors='replace')[:220]
    except Exception as e: return 'ERR', round(time.time() - t, 1), str(e)[:220]
for m in ['deepseek-v4.1-flash', 'glm-5.3', 'gpt-6-luna', 'gpt-6.1-sol', 'qwen3.8-flash', 'deepseek-v4-flash']:
    print(m, 'chat', *post('/chat/completions', {'model': m, 'messages': [{'role': 'user', 'content': T}], 'max_tokens': 300}))
    if m.startswith('gpt'):
        print(m, 'responses', *post('/responses', {'model': m, 'input': T, 'max_output_tokens': 300}))
