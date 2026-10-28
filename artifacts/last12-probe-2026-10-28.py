"""Last 12 gaps: probe for a public preview, docs sample or free-tier path.

These are login-walled. Some still publish documentation with example payloads, or a
free tier that needs only a key from a public signup. This records which is which
rather than leaving them all as a flat "needs credentials".
"""
import json, re, subprocess, sys
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36")
OUT = Path("C:/Users/Garrett/Sports/docs/data-sources/last12")

PATHS = ["/docs", "/api", "/api/docs", "/developers", "/api-docs", "/documentation",
         "/free", "/pricing", "/api/v1", "/openapi.json", "/swagger.json", "/api/reference"]


def get(url):
    r = subprocess.run(["curl", "-s", "-A", UA, "--max-time", "20", "-L",
                        "-w", "\n__S__%{http_code}", url],
                       capture_output=True, text=True, errors="replace")
    body, _, code = r.stdout.rpartition("\n__S__")
    return code.strip(), body


def probe(host):
    hits = []
    for p in PATHS:
        code, body = get(f"https://{host}{p}")
        if code != "200" or len(body) < 300:
            continue
        kind = "json" if body.lstrip()[:1] in "{[" else "html"
        signals = []
        if re.search(r"api[_ -]?key|apikey|x-api-key|subscription", body, re.I):
            signals.append("key-auth")
        if re.search(r"free tier|free plan|trial|sandbox", body, re.I):
            signals.append("free-tier")
        if re.search(r"example response|sample response|response example", body, re.I):
            signals.append("example-payload")
        if re.search(r"openapi|swagger", body, re.I):
            signals.append("openapi")
        hits.append({"path": p, "bytes": len(body), "kind": kind, "signals": signals})
    return hits


if __name__ == "__main__":
    hosts = json.load(open(sys.argv[1]))
    OUT.mkdir(parents=True, exist_ok=True)
    for host in hosts:
        hits = probe(host)
        L = [f"# {host} — last-12 probe", ""]
        if not hits:
            L += ["No public docs, preview or free-tier page found at any conventional path.", ""]
        else:
            L += ["| Path | Bytes | Kind | Signals |", "|---|---|---|---|"]
            for h in hits:
                L.append(f"| `{h['path']}` | {h['bytes']:,} | {h['kind']} | {', '.join(h['signals']) or '—'} |")
            L.append("")
        (OUT / f"{host}.md").write_text("\n".join(L), encoding="utf-8")
        print(f"{host:28s} hits={len(hits)} signals={sorted({s for h in hits for s in h['signals']})}", flush=True)
