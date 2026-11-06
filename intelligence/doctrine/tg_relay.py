#!/usr/bin/env python3
"""tg_relay.py — Telegram live-feed pipe (send file/text in, pull updates out).
Env-gated: needs TGBOT_TOKEN + TG_CHAT_ID. Set once, then:
  python3 tg_relay.py send FILE              # document into the live feed
  python3 tg_relay.py say "text"             # quick note into the feed
  python3 tg_relay.py pull [N]               # pull last N updates (getUpdates)
"""
import json, os, sys, urllib.request, urllib.parse
TOK=os.environ.get("TGBOT_TOKEN"); CHAT=os.environ.get("TG_CHAT_ID")
assert TOK and CHAT, "set TGBOT_TOKEN + TG_CHAT_ID first (Settings -> Environments)"
API=f"https://api.telegram.org/bot{TOK}/"
def send_doc(path):
    b=open(path,'rb').read()
    bnd="----gse"; body=b""
    body+=f"--{bnd}\r\nContent-Disposition: form-data; name=\"chat_id\"\r\n\r\n{CHAT}\r\n".encode()
    body+=f"--{bnd}\r\nContent-Disposition: form-data; name=\"document\"; filename=\"{os.path.basename(path)}\"\r\nContent-Type: text/plain\r\n\r\n".encode()+b+b"\r\n".encode()
    body+=f"--{bnd}--\r\n".encode()
    r=urllib.request.Request(API+"sendDocument", data=body, headers={"Content-Type":f"multipart/form-data; boundary={bnd}"})
    print(json.loads(urllib.request.urlopen(r,timeout=30).read()).get("ok"))
def say(text):
    d=urllib.parse.urlencode({"chat_id":CHAT,"text":text}).encode()
    print(json.loads(urllib.request.urlopen(urllib.request.Request(API+"sendMessage",data=d),timeout=30).read()).get("ok"))
def pull(n=10):
    d=urllib.parse.urlencode({"limit":n}).encode()
    j=json.loads(urllib.request.urlopen(urllib.request.Request(API+"getUpdates",data=d),timeout=30).read())
    for u in j.get("result",[]):
        m=u.get("message",{})
        print(u["update_id"], "|", m.get("from",{}).get("username"), "|", (m.get("text") or "")[:80])
if __name__=="__main__":
    cmd=sys.argv[1] if len(sys.argv)>1 else "pull"
    if cmd=="send": send_doc(sys.argv[2])
    elif cmd=="say": say(sys.argv[2])
    else: pull(int(sys.argv[2]) if len(sys.argv)>2 else 10)
