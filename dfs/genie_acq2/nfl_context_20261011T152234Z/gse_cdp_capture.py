"""Authorized read-only CDP capture. Never logs headers/cookies/account data.
Raw public nash bodies and FreshnessGate envelopes are immutable per capture.
"""
import argparse
import base64
import hashlib
import json
import time
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime, timezone
from pathlib import Path
import websocket

LABEL = "DIAGNOSTIC — residual-versus-close not cleared"

def now():
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

def dump_new(path, obj):
    with Path(path).open("x", encoding="utf-8", newline="\n") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, allow_nan=False)
        f.write("\n")

class CDP:
    def __init__(self):
        self.tabs = json.load(urllib.request.urlopen("http://127.0.0.1:9222/json/list", timeout=8))
        pages = [t for t in self.tabs if t.get("type") == "page" and urllib.parse.urlparse(t.get("url", "")).hostname in {"sportsbook.draftkings.com", "www.draftkings.com"}]
        if len(pages) != 1:
            raise ValueError("Need one unambiguous authorized DK task tab, got " + str(len(pages)))
        self.tab = pages[0]
        self.ws = websocket.create_connection(self.tab["webSocketDebuggerUrl"], timeout=30, suppress_origin=True)
        self.i = 0
        self.events = deque()
    def call(self, method, params=None, timeout=30):
        self.i += 1
        i = self.i
        self.ws.send(json.dumps({"id": i, "method": method, "params": params or {}}))
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            self.ws.settimeout(max(.1, until-time.monotonic()))
            msg = json.loads(self.ws.recv())
            if msg.get("id") == i:
                if "error" in msg:
                    raise RuntimeError(str(msg["error"]))
                return msg.get("result", {})
            if "method" in msg:
                self.events.append(msg)
        raise TimeoutError(method)
    def event(self, timeout=1):
        if self.events:
            return self.events.popleft()
        self.ws.settimeout(timeout)
        return json.loads(self.ws.recv())
    def evaluate(self, expr, timeout=30):
        out = self.call("Runtime.evaluate", {"expression":expr,"awaitPromise":True,"returnByValue":True}, timeout)
        if "exceptionDetails" in out:
            raise RuntimeError(str(out["exceptionDetails"]))
        return out.get("result",{}).get("value")
    def state(self):
        return self.evaluate('''(() => { const b=document.body?.innerText||''; return {origin:location.origin,url:location.href,title:document.title,loginLinkVisible:/Sign Up or Log In|Log in to personalize/i.test(b),accountMenuVisible:!!document.querySelector('[data-test-id*=account], [data-testid*=account], [aria-label*=Account]'),nav:Array.from(document.querySelectorAll('a')).map(a=>({text:(a.innerText||'').trim(),href:a.href})).filter(a=>a.href.includes('nav_1=')).slice(0,45)}; })()''')
    def close(self):
        self.ws.close()

def land(run, role, text, meta):
    raw_bytes = text.encode("utf-8")
    data = json.loads(text)
    if not isinstance(data,dict) or not all(k in data for k in ("events","markets","selections")):
        raise ValueError("Not a market payload")
    if any(str(m.get("leagueId")) != "88808" for m in data["markets"]):
        raise ValueError("CollegeGuard NFL-only rejection")
    if any(str(e.get("leagueId")) != "88808" for e in data["events"]):
        raise ValueError("Non-NFL event rejected")
    digest = hashlib.sha256(raw_bytes).hexdigest()
    raw = run / (role + ".raw.json")
    with raw.open("xb") as f:
        f.write(raw_bytes)
    envelope = {
        **data,
        "observed_at":meta["observed_at"],
        "source":meta,
        "raw_file":raw.name,
        "raw_sha256":digest,
        "raw_sha16":digest[:16],
        "label":LABEL,
        "quote_class":"CURRENT_QUOTE_NOT_A_CLOSE",
        "schema":"DK nash sportscontent: events, markets, selections; milestoneValue or paired O/U points; all league 88808",
        "coverage":{"events":len(data["events"]),"markets":len(data["markets"]),"selections":len(data["selections"])},
    }
    env = run / (role + ".fresh.json")
    dump_new(env, envelope)
    record={"role":role,"raw_file":raw.name,"gated_file":env.name,"observed_at":meta["observed_at"],"raw_sha256":digest,"raw_sha16":digest[:16],"coverage":envelope["coverage"],"subcategories":sorted({str(m.get("subcategoryId")) for m in data["markets"]}),"event_ids":sorted({str(e["id"]) for e in data["events"]}),"source_url":meta["url"]}
    with (run / "capture_index.jsonl").open("a",encoding="utf-8",newline="\n") as f:
        f.write(json.dumps(record,ensure_ascii=False)+"\n")
    return record

def capture(run, role, url, expected_subcat):
    if urllib.parse.urlparse(url).hostname != "sportsbook.draftkings.com":
        raise ValueError("Navigation outside allowlist")
    run.mkdir(parents=True,exist_ok=True)
    client=CDP()
    responses={}
    finished=set()
    failure=[]
    try:
        client.call("Network.enable",{"maxResourceBufferSize":25000000,"maxTotalBufferSize":80000000})
        client.call("Page.enable")
        start=now()
        client.call("Page.navigate",{"url":url})
        deadline=time.monotonic()+35
        while time.monotonic()<deadline:
            try:
                msg=client.event(min(2,max(.2,deadline-time.monotonic())))
            except websocket.WebSocketTimeoutException:
                continue
            p=msg.get("params",{})
            rid=p.get("requestId")
            method=msg.get("method")
            if method=="Network.responseReceived":
                r=p.get("response",{})
                host=urllib.parse.urlparse(r.get("url","")).hostname
                if host=="sportsbook-nash.draftkings.com" and "/sportscontent/" in r.get("url","") and "json" in r.get("mimeType",""):
                    responses[rid]={"url":r["url"],"status":r["status"],"observed_at":now(),"request_started_at":start,"transport":"app-issued in-page nash GET via headed CDP 9222","navigation_url":url,"from_disk_cache":r.get("fromDiskCache",False),"from_service_worker":r.get("fromServiceWorker",False),"http_date":r.get("headers",{}).get("date") or r.get("headers",{}).get("Date")}
            if method=="Network.loadingFinished":
                finished.add(rid)
            for reqid in list(responses):
                if reqid not in finished:
                    continue
                meta=responses.pop(reqid)
                if meta["status"]!=200:
                    failure.append({"status":meta["status"],"url":meta["url"]})
                    continue
                body=client.call("Network.getResponseBody",{"requestId":reqid})
                text=body.get("body","")
                if body.get("base64Encoded"):
                    text=base64.b64decode(text).decode("utf-8")
                data=json.loads(text)
                subcats={str(m.get("subcategoryId")) for m in data.get("markets",[])}
                if not {"events","markets","selections"} <= set(data) or subcats != {str(expected_subcat)}:
                    failure.append({"reason":"wrong_schema_or_taxonomy","actual_subcats":sorted(subcats),"expected":expected_subcat})
                    continue
                meta["observed_at"]=now()
                record=land(run,role,text,meta)
                state=client.state()
                dump_new(run/(role+".browser.json"),{"checked_at":now(),"state":state,"prior_failures":failure})
                print(json.dumps({"capture":record,"loginLinkVisible":state.get("loginLinkVisible"),"accountMenuVisible":state.get("accountMenuVisible"),"nav":state.get("nav",[])},ensure_ascii=True),flush=True)
                return
        dump_new(run/(role+".capture_refusal.json"),{"observed_at":now(),"role":role,"failures":failure,"reason":"No matching completed HTTP200 NFL subcategory response","url":url,"label":LABEL})
        raise RuntimeError("No matching nash response for " + role)
    finally:
        client.close()

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--new-run",action="store_true")
    p.add_argument("--run")
    p.add_argument("--role")
    p.add_argument("--url")
    p.add_argument("--subcat")
    a=p.parse_args()
    if a.new_run:
        root=Path("C:/Users/Garrett/Sports-wt-rating-packet/dfs/genie_acq2")
        run=root/("nfl_context_"+datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ"))
        run.mkdir()
        dump_new(run/"RUN_START.json",{"observed_at":now(),"label":LABEL,"scope":"NFL current quote diagnostics; no selections, no account mutations","prior_bundle":"dfs/genie_acq2/nash_nfl_props_20261011T1512Z/NFL_PROP_LADDER_STAMP.json","expected_prior_sha16":"46584450b293a030"})
        print(run.as_posix())
    else:
        capture(Path(a.run),a.role,a.url,a.subcat)
