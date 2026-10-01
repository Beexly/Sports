# GSE autonomous watch client (Windows box)

The only piece of the watch loop that lives on Garrett's hardware — it has
to, because it captures his display. Everything else (CV compute, schedule,
storage) is cloud-hosted.

## What it does

1. **Tune** — per game window, opens the viewing app on the right game via
   deep link (preferred) or scripted keystrokes (fallback). Failures are
   logged as degraded windows; the watcher keeps capturing rather than
   dying silently.
2. **Capture** — mss screen grab at **720p, JPEG q~60 (~50 KB/frame)**,
   with **adaptive frame rate**: 1 fps idle sampling always, burst to
   5 fps only during live play (see `play_gate.py`). This cuts CV compute
   3–5× vs blind 5 fps.
3. **Relay** — POST the frame to the HF Space `/process-frame`, then relay
   the Space's JSON to the Vercel ingest route. **Raw frames are never
   uploaded anywhere** except the transient Space request; the box keeps a
   rolling ~30 min local buffer for debugging only.

## Install

One-time setup (Garrett's only involvement, ever):

```powershell
# 1. Python 3.11+ from python.org (check "Add to PATH")
# 2. In this folder:
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# 3. Copy config.example.json -> config.json and fill in the five values:
#    space_url, space_token, ingest_url, ingest_secret, scheduler_url
#    - space_token must match the Space's GSE_SPACE_TOKEN secret
#      (Space Settings -> Variables and secrets). The Space's /process-frame
#      rejects unauthenticated callers, so the watcher cannot run without it.
#    - ingest_secret is the Vercel CRON_SECRET (Bearer auth on the ingest
#      and status routes).
# 4. Log into the viewing apps in the browser (YouTube TV / NFL app / NFL+)
#    so the deep links land on the right game.
```

### Run at boot (no login required)

Option A — Task Scheduler (built in, no extra software):

```powershell
schtasks /create /tn "GSE Watcher" /tr "C:\path\to\watcher\.venv\Scripts\python.exe C:\path\to\watcher\watcher.py --config C:\path\to\watcher\config.json" /sc onstart /ru SYSTEM /rl highest
```

Option B — NSSM (https://nssm.cc): `nssm install gse-watcher` and point it
at the same command line. NSSM gives cleaner restart-on-crash behavior.

### Smoke test

```powershell
.venv\Scripts\python.exe watcher.py --config config.json --once
```

Captures one frame, runs it through the Space, prints the returned JSON.

## Play gating (the efficiency core)

`play_gate.py` implements the two-tier capture:

- **1 fps idle** — always sampling. Between games nothing is relayed.
- **5 fps burst** — only when the gate says live play.

v1 live-play signal: frame-difference motion energy over the field ROI,
with hysteresis (3 consecutive live frames to enter burst, 10 quiet to
leave). Score-bug presence is a boost, not a hard gate.

v2 hook: `ClockOcr` protocol in `play_gate.py`. When someone implements
score-bug clock OCR, the gate prefers "clock running" over motion energy
with zero changes to the watcher loop.

## Coverage doctrine (read this before expecting every game live)

One box = one stream. Simultaneous Sunday windows (up to ~10 games at
12:00 PM CT) **cannot** all be watched live on one household's
subscriptions — concurrent-stream limits see to that. The doctrine:

- **Priority windows** (TNF, SNF, MNF, London, Garrett's fantasy-relevant
  games — `priority_teams` in config): full-film live watch.
- **Simultaneous windows**: RedZone/multiview whip-around — one feed learns
  every game's key plays at once (`"mode": "redzone"`).
- **Everything else**: next-day All-22/coaches-film backfill through the
  same tune+capture machinery pointed at NFL+ replay, wherever his
  subscription legitimately provides it.

Nobody downstream may claim "every game live." The ingest endpoint and
learning store are multi-game keyed, so adding capture inputs later is
additive, not a redesign.

## Hard lines

- His subscriptions, his hardware, his home. The box must already be
  logged into his apps — the watcher never handles credentials.
- No DRM stripping, no scraping of streaming servers, no restreaming or
  publishing video. One stream, real cadence — boring by design.
- Nothing in this folder phones home except the Space and the Vercel app.
