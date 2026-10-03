"""Synthesis step: one strong long-context model reads ALL extracted records for each engine component and writes
a component dossier (deduped builds ranked, data sources, conflicts, already-in-repo, tests). Output: corpus_extract/SYNTH_<component>.md"""
import os, sys, json, glob, time, concurrent.futures as cf, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
from fleet_probe import ENDPOINTS
OUT = os.path.join(os.path.dirname(__file__), 'corpus_extract')
MEASURED_TODAY = open(os.path.join(os.path.dirname(__file__), 'master_part2.md'), encoding='utf-8').read() + open(os.path.join(os.path.dirname(__file__), 'master_part2b.md'), encoding='utf-8').read()
SYS = """You are the chief architect of GSE, a reasoning sports prediction engine (picks, props, parlays, fantasy/DFS, analysis; NFL first, all sports).
Loop: ingest -> encode -> perceive (CV) -> reason (LLM traces) -> price (calibrated p) -> decide -> grade (engine's own log loss/Brier/ECE) -> learn (nightly refit, champion/challenger) -> chart.
Rules: wiring is immediate, weight is earned by walk-forward tests with a shuffled placebo. Existing Neon production picks are frozen history. Never invent numbers, sources or repo paths: use only what the records say, and cite record paths in [brackets].
"Evidence: measured" in a record means the SOURCE document reports a measurement (often on the source's own data), not a GSE measurement."""
ASK = """Below are ALL extracted records (one JSON per line) from the GSE research corpus whose component includes "{c}". Also below: what GSE measured on its own data today.
Write a dossier in markdown:
1. What the corpus knows about "{c}" (8-15 bullets, concrete, cited).
2. Ranked build list: the top 25 deduplicated builds for this component. For each: build, why (cited), data needed (named sources), test that decides it (walk-forward metric + placebo), effort S/M/L, repo status (implemented/partial/not, with paths if records name them).
3. Data sources named for this component that GSE is not yet using (name, url if given, license if given).
4. Conflicts: where records disagree with each other or with today's GSE measurements, and which side the evidence favors.
5. Kill list: ideas the corpus already tested and that failed or should not be reopened (cited).
6. The 5 highest-leverage moves for this component in the next 7 days.
TODAY'S GSE MEASUREMENTS:
{m}
RECORDS:
{r}"""
def call(model, text):
    base, key = ENDPOINTS['or1']
    body = {'model': model, 'temperature': 0.2, 'max_tokens': 20000, 'usage': {'include': True},
            'messages': [{'role': 'system', 'content': SYS}, {'role': 'user', 'content': text}]}
    r = urllib.request.Request(base + '/chat/completions', data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'X-Title': 'GSE corpus synth'})
    with urllib.request.urlopen(r, timeout=1200) as f: d = json.loads(f.read())
    return d['choices'][0]['message'].get('content') or '', float((d.get('usage') or {}).get('cost') or 0)
def run(c):
    path = os.path.join(OUT, f'COMPONENT_{c}.jsonl'); recs = open(path, encoding='utf-8').read()
    if len(recs) > 3_000_000: recs = recs[:3_000_000]   # ~750k tokens; records are sorted by relevance x evidence, tail is lowest-ranked
    for model in ('deepseek/deepseek-v4.1-flash', 'xiaomi/mimo-v2.6-flash', 'z-ai/glm-5.3-flash'):
        try:
            t0 = time.time(); txt, cost = call(model, ASK.format(c=c, m=MEASURED_TODAY, r=recs))
            if len(txt) > 2000:
                open(os.path.join(OUT, f'SYNTH_{c}.md'), 'w', encoding='utf-8').write(f'<!-- model {model}, records {recs.count(chr(10))}, cost ${cost:.3f}, {time.time()-t0:.0f}s -->\n' + txt)
                return c, model, cost, len(txt)
        except Exception as e:
            err = (f'HTTP {e.code} ' + e.read().decode(errors="replace")[:200]) if isinstance(e, urllib.error.HTTPError) else str(e)[:200]
            print(c, model, 'ERR', err, flush=True)
    return c, None, 0, 0
if __name__ == '__main__':
    comps = [os.path.basename(p)[10:-6] for p in glob.glob(os.path.join(OUT, 'COMPONENT_*.jsonl'))]
    comps = [c for c in comps if c in ('ingest', 'encode', 'perceive', 'reason', 'price', 'decide', 'grade', 'learn', 'chart', 'ops', 'product')]
    with cf.ThreadPoolExecutor(6) as ex:
        for res in ex.map(run, comps): print(res, flush=True)
