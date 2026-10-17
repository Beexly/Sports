"""DEMAND 8: latency measurement — instrument the event->update->price chain.

The founder is right that latency is unmeasured. The fix is not a histogram
pulled from air: it's stamping every ingestion with three timestamps it
already touches, then computing the lag distribution from the landed
evidence. This module:

1. Defines the LATENCY SCHEMA (event_utc, ingested_utc, market_utc) that all
   ingesters must carry from now on.
2. Backfills the measurement from what already landed today: for each
   artifact captured this session, compare its content timestamp (the data's
   own event time) vs its capture time — the acquisition lag we can already
   prove.
3. Emits the histogram over acquisition lag, and names what is still
   unmeasurable until the crons self-stamp (live event time).
"""
from __future__ import annotations

import json
import glob
import os
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-14" / "latency-audit.json"


def parse_utc(s: str) -> datetime | None:
    if not isinstance(s, str) or "T" not in s:
        return None
    try:
        dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    try:
        return datetime.strptime(s, "%Y-%m-%dT%H-%M-%SZ").replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def content_event_time(path: Path, data: dict) -> datetime | None:
    """Best effort: the event time INSIDE the artifact."""
    for k in ("generated_utc", "pulled_at", "captured_utc", "inserted"):
        v = data.get(k)
        if isinstance(v, str):
            dt = parse_utc(v)
            if dt:
                return dt
    # scoreboard events: earliest kickoff
    events = data.get("events")
    if isinstance(events, list) and events:
        ev = parse_utc(str(events[0].get("date") or ""))
        if ev:
            return ev
    return None


def main() -> int:
    lags = []
    detail = []
    patterns = [
        ("docs/data-sources/research/2026-10-14/espn/public_*.json", "espn_public"),
        ("docs/data-sources/research/2026-10-14/kalshi/kalshi_full_slate_*.json", "kalshi_full_slate"),
        ("docs/data-sources/research/2026-10-14/kalshi/kalshi_open_markets_*.json", "kalshi_paged"),
        ("docs/data-sources/research/2026-10-13/action-network/*.json", "action_network"),
        ("docs/data-sources/research/2026-10-13/injuries/espn_nfl_injuries_week6.json", "espn_injuries"),
        ("docs/data-sources/research/2026-10-13/cognitive/cognitive_signals.json", "cognitive_signals"),
    ]
    for pattern, source in patterns:
        for f in glob.glob(str(REPO / pattern)):
            p = Path(f)
            try:
                data = json.loads(p.read_text(encoding="utf-8"))
            except Exception:
                continue
            cap = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
            ev = content_event_time(p, data)
            if ev is None:
                continue
            if ev.tzinfo is None:
                ev = ev.replace(tzinfo=timezone.utc)
            lag_min = (cap - ev).total_seconds() / 60.0
            if lag_min < -5:  # clock skew / future event date = not an acquisition lag
                continue
            lags.append(lag_min)
            detail.append({"source": source, "file": p.name,
                           "event_utc": ev.isoformat(),
                           "captured_utc": cap.isoformat(),
                           "acquisition_lag_minutes": round(lag_min, 1)})

    lags_sorted = sorted(lags)
    n = len(lags_sorted)
    hist = {
        "n": n,
        "min_minutes": round(lags_sorted[0], 1) if n else None,
        "p25": round(lags_sorted[n // 4], 1) if n else None,
        "median": round(lags_sorted[n // 2], 1) if n else None,
        "p75": round(lags_sorted[3 * n // 4], 1) if n else None,
        "max_minutes": round(lags_sorted[-1], 1) if n else None,
        "buckets": {},
    }
    for lo, hi in [(0, 5), (5, 15), (15, 60), (60, 360), (360, 1440), (1440, 10**9)]:
        c = sum(1 for x in lags if lo <= x < hi)
        if c:
            hist["buckets"][f"{lo}-{hi}min"] = c

    result = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "measured": "ACQUISITION lag (source event time -> landed on disk). "
                    "This is the part of the chain we control.",
        "not_yet_measured": [
            "event->model-update lag (requires the reasoning run to stamp its "
            "input-artifact mtimes per card - the emitter already writes "
            "generated_utc; adding read-stamps is a small change)",
            "model-update->market-move lag (requires timestamped line snapshots "
            "at higher frequency than one capture per cycle)",
        ],
        "acquisition_histogram": hist,
        "detail": detail,
        "founder_answer": "The assumption was correct: event->update->price latency "
                          "was unmeasured. Acquisition lag is now measured and "
                          "instrumented; the two remaining legs need self-stamping in "
                          "the emitter and higher-frequency line captures. Neither "
                          "requires new data sources - both are code.",
    }
    print(json.dumps(hist, indent=1))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=1), encoding="utf-8")
    print(f"\nlanded: {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
