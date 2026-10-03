"""Reduce step over corpus_extract/extract.jsonl -> corpus_extract/REDUCE_*.json/md
Aggregates by engine component; ranks actionable builds by relevance x evidence; catalogs data sources and key numbers."""
import json, os, collections, re
OUT = os.path.join(os.path.dirname(__file__), 'corpus_extract')
R = [json.loads(l) for l in open(os.path.join(OUT, 'extract.jsonl'), encoding='utf-8') if l.strip()]
EV = {'measured': 1.0, 'claimed': 0.6, 'speculative': 0.35, 'none': 0.2}
def rel(d):
    try: return float(d.get('relevance') or 0)
    except Exception: return 0.0
comp = collections.defaultdict(list); builds = []; sources = {}; numbers = []; warnings = []
for d in R:
    w = rel(d) * EV.get(str(d.get('evidence', 'none')).lower(), 0.3)
    for c in d.get('components') or ['other']: comp[str(c)].append(d)
    for b in d.get('actionable_builds') or []:
        if isinstance(b, dict) and b.get('build'): builds.append(dict(b, score=round(w, 2), path=d.get('path'), evidence=d.get('evidence'), repo_status=d.get('repo_status')))
    for s in d.get('data_sources') or []:
        if isinstance(s, dict) and s.get('name'):
            key = re.sub(r'\W+', ' ', s['name'].lower()).strip()
            e = sources.setdefault(key, dict(name=s['name'], urls=set(), licenses=set(), free=set(), n=0, paths=[]))
            e['n'] += 1; e['paths'].append(d.get('path'))
            if s.get('url'): e['urls'].add(s['url'])
            if s.get('license'): e['licenses'].add(str(s['license']))
            if s.get('free') is not None: e['free'].add(bool(s['free']))
    for k in d.get('key_numbers') or []:
        if isinstance(k, dict) and d.get('evidence') == 'measured': numbers.append(dict(k, path=d.get('path')))
    for x in d.get('warnings') or []: warnings.append(dict(w=x, path=d.get('path')))
builds.sort(key=lambda b: -b['score'])
src = sorted(({**v, 'urls': sorted(v['urls']), 'licenses': sorted(v['licenses']), 'free': sorted(v['free']), 'paths': v['paths'][:8]} for v in sources.values()), key=lambda v: -v['n'])
summary = dict(records=len(R), unique_paths=len({d.get('path') for d in R}),
               by_component={k: len(v) for k, v in sorted(comp.items(), key=lambda x: -len(x[1]))},
               by_evidence=collections.Counter(str(d.get('evidence')) for d in R),
               by_repo_status=collections.Counter(str(d.get('repo_status')) for d in R),
               builds=len(builds), sources=len(src), measured_numbers=len(numbers))
json.dump(dict(summary=summary, top_builds=builds[:600], sources=src, measured_numbers=numbers, warnings=warnings[:2000]),
          open(os.path.join(OUT, 'REDUCE.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=list)
for c, docs in comp.items():
    docs = sorted(docs, key=lambda d: -rel(d) * EV.get(str(d.get('evidence')), 0.3))
    with open(os.path.join(OUT, f'COMPONENT_{c}.jsonl'), 'w', encoding='utf-8') as f:
        for d in docs: f.write(json.dumps({k: d.get(k) for k in ('path', 'title', 'summary', 'key_numbers', 'methods', 'data_sources', 'signal_families', 'repo_status', 'repo_paths', 'actionable_builds', 'warnings', 'evidence', 'relevance')}, ensure_ascii=False) + '\n')
print(json.dumps(summary, indent=1, default=str))
