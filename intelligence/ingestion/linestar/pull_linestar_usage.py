
"""LineStar usage ingestion - snap share, target share, carry share, red zone.

Keyless anonymous DNN API discovered 2026-10-13. The GetSalariesV5 capture
already in the corpus exposed the namespace; the two sibling methods that
carry the USAGE BASIS were never pulled:

    GetSnapCounts    -> per-player Tgt4wk / Car4wk / Snaps4wk / Fpps4wkReg
                        (target SHARE and snap SHARE, not raw counts)
    GetRedZoneStats  -> per-player red-zone targets/carries/TDs in 2/4/8-week
                        windows (the single best TD-prop predictor)

These are the numbers the matchup engine needs to say "WR2 carries a 21%
target share" instead of "WR2 had 63 targets last season".

Usage:
    python intelligence/ingestion/linestar/pull_linestar_usage.py --max-periods 20
"""
from __future__ import annotations
import argparse, json, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
OUT = REPO / "docs" / "data-sources" / "research" / "2026-10-13" / "linestar"
BASE = "https://www.linestarapp.com/DesktopModules/DailyFantasyApi/API/Fantasy/"
UA = {"User-Agent": "Mozilla/5.0 GSE-ingest/1.0"}


def fetch(method: str) -> dict:
    req = urllib.request.Request(BASE + method, headers=UA)
    with urllib.request.urlopen(req, timeout=45) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--max-periods", type=int, default=20)
    ap.add_argument("--period", type=int, default=0, help="single periodId; 0 = walk the Periods list")
    args = ap.parse_args()

    salaries = json.load(open(OUT / "raw_GetSalariesV5_period412.json", encoding="utf-8"))
    periods = salaries.get("Periods") or []
    if args.period:
        targets = [args.period]
    else:
        targets = [p.get("Id") for p in periods if p.get("Id")][: args.max_periods]
    print(f"periods to pull: {len(targets)}")

    snaps_by_period, rz_by_period = {}, {}
    for pid in targets:
        try:
            s = fetch(f"GetSnapCounts?periodId={pid}&site=1&sport=1").get("SnapCounts") or []
            snaps_by_period[pid] = s
        except Exception as e:
            snaps_by_period[pid] = []
            print(f"  snaps {pid}: ERR {type(e).__name__}")
        try:
            z = fetch(f"GetRedZoneStats?periodId={pid}&site=1&sport=1").get("RedZoneStats") or []
            rz_by_period[pid] = z
        except Exception as e:
            rz_by_period[pid] = []
            print(f"  redzone {pid}: ERR {type(e).__name__}")
        print(f"  period {pid}: snaps {len(snaps_by_period[pid])} redzone {len(rz_by_period[pid])}")

    # latest-window digest keyed by PlayerId
    def latest(byp):
        m = {}
        for pid in sorted(byp, reverse=True):
            for r in byp[pid]:
                k = r.get("PlayerId")
                if k not in m:
                    m[k] = dict(r, periodId=pid)
        return m

    snap_map = latest(snaps_by_period)
    rz_map = latest(rz_by_period)
    players = []
    for k, s in snap_map.items():
        z = rz_map.get(k) or {}
        players.append({
            "playerId": k, "name": s.get("Name"), "pos": s.get("Position"),
            "startPos": s.get("StartingPosition"), "depthOrder": s.get("DepthOrder"),
            "teamId": s.get("TeamId"),
            # Snaps4wk is a raw snap COUNT; the SHARE is count / team snaps.
            "snap_count_4wk": s.get("Snaps4wk"),
            "team_snaps_4wk": s.get("TeamSnapsLast4Weeks"),
            "snap_share_4wk": (
                round(s["Snaps4wk"] / s["TeamSnapsLast4Weeks"], 4)
                if isinstance(s.get("Snaps4wk"), (int, float))
                and isinstance(s.get("TeamSnapsLast4Weeks"), (int, float))
                and s["TeamSnapsLast4Weeks"]
                else None
            ),
            "target_share_4wk": s.get("Tgt4wk"), "target_share_1wk": s.get("Tgt1wk"),
            "target_share_season": s.get("TgtSeason"),
            "reception_share_4wk": s.get("Rec4wk"), "carry_share_4wk": s.get("Car4wk"),
            "fpps_4wk": s.get("Fpps4wkReg"), "fpps_1wk": s.get("Fpps1wkReg"),
            "rz_targets_4wk": z.get("Tgt4"), "rz_carries_4wk": z.get("RushATT4"),
            "rz_recTD_4wk": z.get("RecTD4"), "rz_rushTD_4wk": z.get("RushTD4"),
            "rz_recYD_4wk": z.get("RecYD4"), "rz_rushYD_4wk": z.get("RushYD4"),
            "height": z.get("Height"), "weight": z.get("Weight"),
        })
    players.sort(key=lambda p: -(p.get("target_share_4wk") or 0))
    digest = {
        "source": "LineStar app (linestarapp.com) - DraftKings NFL",
        "endpoints": [BASE + "GetSnapCounts", BASE + "GetRedZoneStats"],
        "auth": "anonymous; no login, no cookies",
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "periods_pulled": targets,
        "player_count": len(players),
        "columns": "Tgt*=target SHARE (0-1), Rec*=reception SHARE, Car*=carry SHARE, "
                   "Snaps4wk=snap COUNT (use snap_share_4wk = Snaps4wk/TeamSnapsLast4Weeks), "
                   "Fpps*=fantasy pts per snap, rz_*=red-zone window 4wk",
        "players": players,
    }
    out = OUT / "linestar_usage_2026-10-13.json"
    out.write_text(json.dumps(digest, indent=1), encoding="utf-8")
    raw_out = OUT / "raw_snapcounts_redzone_by_period.json"
    raw_out.write_text(json.dumps({"snapcounts": snaps_by_period, "redzone": rz_by_period}, indent=1), encoding="utf-8")
    print(f"wrote {out.name} ({len(players)} players) and {raw_out.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
