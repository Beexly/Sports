"""Build the dashboard HTML: reel archive grid, hook patterns, performance chart."""
import json
from pathlib import Path
from collections import Counter

HTML_HEAD = """<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Creator Intel — {creator}</title>
<style>
body{{font-family:-apple-system,Helvetica,Arial,sans-serif;background:#0f1115;color:#e8eaf0;margin:0;padding:24px}}
h1{{font-size:22px}} h2{{font-size:16px;margin-top:32px;color:#9fb0c8}}
.stats{{display:flex;gap:16px;margin:16px 0}} .stat{{background:#1a1e26;border-radius:10px;padding:12px 18px}}
.stat b{{font-size:22px;display:block}} .stat span{{font-size:12px;color:#9fb0c8}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}}
.card{{background:#1a1e26;border-radius:10px;padding:12px;cursor:pointer;border:1px solid #2a2f3a}}
.card:hover{{border-color:#4d7cff}} .card .hook{{font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;display:inline-block;margin-bottom:6px}}
.card .t{{font-size:13px;margin:4px 0}} .card .meta{{font-size:11px;color:#9fb0c8}}
table{{border-collapse:collapse;width:100%;font-size:13px}} td,th{{padding:8px;border-bottom:1px solid #2a2f3a;text-align:left}}
.bar{{height:8px;background:#2a2f3a;border-radius:4px;overflow:hidden}} .bar i{{display:block;height:100%;background:#4d7cff}}
#detail{{background:#1a1e26;border-radius:10px;padding:16px;margin-top:16px;display:none}}
.tag-hook{{color:#ffd166}} .tag-setup{{color:#9fb0c8}} .tag-payoff{{color:#06d6a0}} .tag-pitch{{color:#ef476f}}
a{{color:#4d7cff}}
</style></head><body>
"""

HOOK_COLORS = {
    "Curiosity": "#ffd166", "Recognition": "#06d6a0", "Result": "#4d7cff",
    "Direct": "#ef476f", "Controversy": "#ff5d8f", "Story": "#9b5de5",
    "Question": "#00bbf9", "Listicle": "#f15bb5", "Other": "#9fb0c8",
}


def build(reels, creator, out_path: Path):
    labeled = [r for r in reels if r.get("labels")]
    hooks = Counter(r["labels"].get("hook_type", "Other") for r in labeled)
    total_likes = sum(r.get("likes", 0) for r in reels)

    cards = []
    for i, r in enumerate(reels):
        lab = r.get("labels") or {}
        ht = lab.get("hook_type", "Other")
        col = HOOK_COLORS.get(ht, "#9fb0c8")
        cards.append(
            f'<div class="card" onclick="show({i})">'
            f'<span class="hook" style="background:{col}22;color:{col}">{ht}</span>'
            f'<div class="t">{(lab.get("hook_text") or r.get("caption","")[:80])}</div>'
            f'<div class="meta">❤ {r.get("likes",0):,} · 💬 {r.get("comments",0):,} · '
            f'{lab.get("topic","—")}</div></div>'
        )

    rows = []
    for ht, n in hooks.most_common():
        col = HOOK_COLORS.get(ht, "#9fb0c8")
        avg = sum(r["likes"] for r in labeled
                  if r["labels"].get("hook_type") == ht) / max(n, 1)
        rows.append(
            f"<tr><td><span style='color:{col}'>●</span> {ht}</td><td>{n}</td>"
            f"<td>{avg:,.0f}</td>"
            f"<td><div class='bar'><i style='width:{100*n/max(hooks.values())}%;"
            f"background:{col}'></i></div></td></tr>"
        )

    # scatter data: likes vs hook
    data_json = json.dumps(reels)

    html = HTML_HEAD.format(creator=creator)
    html += f"<h1>Creator Intel — @{creator}</h1>"
    html += (f'<div class="stats"><div class="stat"><b>{len(reels)}</b>'
             f'<span>reels analyzed</span></div>'
             f'<div class="stat"><b>{total_likes:,}</b><span>total likes</span></div>'
             f'<div class="stat"><b>{len(hooks)}</b><span>hook types</span></div></div>')
    html += "<h2>Hook patterns found</h2><table><tr><th>Hook</th><th>Reels</th>"
    html += "<th>Avg likes</th><th>Share</th></tr>" + "".join(rows) + "</table>"
    html += "<h2>Reel archive</h2><div class='grid'>" + "".join(cards) + "</div>"
    html += "<h2>Reel detail</h2><div id='detail'></div>"
    html += """<script>
const REELS = %s;
function show(i){const r=REELS[i],l=r.labels||{};
 let s=`<b>${l.hook_text||''}</b><br>Topic: ${l.topic||'—'} · Hook: ${l.hook_type||'—'} · CTA: ${l.cta||'—'}<br>
 Structure: ${l.structure||'—'}<br><a href="${r.url}" target="_blank">Open on Instagram</a><hr>`;
 (l.sentences||[]).forEach(x=>{s+=`<span class="tag-${x.tag}">[${x.tag}]</span> ${x.text}<br>`});
 document.getElementById('detail').style.display='block';
 document.getElementById('detail').innerHTML=s;
 document.getElementById('detail').scrollIntoView();}
</script></body></html>""" % data_json
    out_path.write_text(html)
