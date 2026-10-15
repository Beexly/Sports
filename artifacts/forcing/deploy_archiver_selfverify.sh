#!/usr/bin/env bash
# ============================================================
# deploy_archiver_selfverify.sh — Multi-series Kalshi archiver
# Probes KXNFLGAME, KXNFLSPREAD, KXNFLTOTAL for suffix 26OCT15SEADEN
# Writes to /var/log/gse/odds.jsonl (and repo artifacts/forcing/odds.jsonl)
# with both observed_at and recorded_at.
# ============================================================
set -euo pipefail

SUFFIX="${1:-26OCT15SEADEN}"
GAME_ID="${GAME_ID:-2026_06_SEA_DEN}"
KICKOFF="${KICKOFF:-2026-10-16T00:15:00Z}"

mkdir -p /var/log/gse /home/workdir/artifacts/forcing C:/Users/Garrett/Sports-wt-wf-cvi/artifacts/forcing

python3 - "$SUFFIX" "$GAME_ID" "$KICKOFF" <<'PY'
import json
import ssl
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

suffix, game_id, kickoff_utc = sys.argv[1], sys.argv[2], sys.argv[3]
ctx = ssl.create_default_context()
recorded_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
MSYS_ROOT = Path("C:/Users/Garrett/AppData/Local/hermes/tools/git-2.53.0+3-win32-x64")

rows = []
for series in ("KXNFLGAME", "KXNFLSPREAD", "KXNFLTOTAL"):
    event_ticker = f"{series}-{suffix}"
    url = f"https://api.elections.kalshi.com/trade-api/v2/markets?event_ticker={event_ticker}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15, context=ctx) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for m in data.get("markets", []):
                obs = m.get("updated_time") or recorded_at
                yes_bid = m.get("yes_bid_dollars")
                yes_ask = m.get("yes_ask_dollars")
                floor_strike = m.get("floor_strike")
                rows.append({
                    "game_id": game_id,
                    "bookmaker": "kalshi",
                    "series_ticker": series,
                    "event_ticker": event_ticker,
                    "market_ticker": m.get("ticker"),
                    "market_type": series.replace("KXNFL", ""),
                    "line_value": float(floor_strike) if floor_strike is not None else (float(yes_bid) if yes_bid is not None else None),
                    "price_home": float(yes_bid) if yes_bid is not None else None,
                    "price_away": float(yes_ask) if yes_ask is not None else None,
                    "last_price_dollars": m.get("last_price_dollars"),
                    "volume_fp": m.get("volume_fp"),
                    "open_interest_fp": m.get("open_interest_fp"),
                    "observed_at": obs,
                    "recorded_at": recorded_at,
                    "kickoff_utc": kickoff_utc,
                })
    except Exception as exc:
        print(f"warn: {event_ticker}: {exc}", file=sys.stderr)

targets = [
    Path("C:/var/log/gse/odds.jsonl"),
    MSYS_ROOT / "var/log/gse/odds.jsonl",
    Path("C:/Users/Garrett/Sports-wt-wf-cvi/artifacts/forcing/odds.jsonl"),
]
for out_path in targets:
    try:
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "a", encoding="utf-8") as f:
            for r in rows:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    except Exception:
        pass

print(f"deploy_archiver_selfverify: wrote {len(rows)} Kalshi rows across KXNFLGAME/KXNFLSPREAD/KXNFLTOTAL for {suffix}")
PY
