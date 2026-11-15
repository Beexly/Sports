# Lane-1 coordination artifact for Antigravity (ethos01 deconfliction message):
# Week-10 line-move + inactive drift from the overnight SBR/ESPN poller archive.
# Output: docs/data-sources/research/2026-11-15/hermes-overnight-line-and-inactive-drift-week10.json
import json, os, datetime, collections

WT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(WT)
S = r"C:\Users\Garrett\AppData\Local\hermes\cache\scratch"

moves = [json.loads(l) for l in open(os.path.join(S, "wave3", "moves.jsonl"), encoding="utf-8")]
latest = json.load(open(os.path.join(S, "wave3", "latest.json"), encoding="utf-8"))
delta = json.load(open(os.path.join(S, "wave3_delta.json"), encoding="utf-8"))

# group moves: matchup -> market -> book -> field
grp = collections.defaultdict(list)
for m in moves:
    grp[(m["matchup"], m["market"], m["book"], m["field"])].append(m)

drift = []
for (mu, mkt, book, field), ms in sorted(grp.items()):
    ms.sort(key=lambda x: x["ts_utc"])
    drift.append({
        "matchup": mu, "market": mkt, "book": book, "field": field,
        "first_observed_utc": ms[0]["ts_utc"], "first_value": ms[0]["prev"],
        "last_observed_utc": ms[-1]["ts_utc"], "last_value": ms[-1]["new"],
        "net_delta": ms[-1]["new"] - ms[0]["prev"],
        "move_count": len(ms),
        "timeline": [{"ts": x["ts_utc"], "from": x["prev"], "to": x["new"]} for x in ms],
    })

by_game = collections.Counter(m["matchup"] for m in moves)
by_market = collections.Counter(m["market"] for m in moves)

out = {
    "schema": "gse.data_sources.line_inactive_drift.v1",
    "generated_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "author": "hermes overnight watch (Wave 3 poller archive)",
    "coordination_ref": "antigravity/20261115T042800000Z-ethos01 lane 1",
    "window_utc": {"start": moves[0]["ts_utc"] if moves else None,
                   "end": moves[-1]["ts_utc"] if moves else None},
    "sources": {
        "lines": "SportsbookReview public pages (spread, totals/full-game, money-line/full-game), 8 books, 15-min poll cycles",
        "status_inactives": "ESPN site.api summary event 401873053 (Munich) + scoreboard; official inactives captured 13:05Z and 13:19Z with fresh fetch",
        "draftkings_prop_api": "BLOCKED 403 IP reputation from this host; recorded, not retried; no paid quota used",
    },
    "caveats": [
        "first_observed is the poller's first sighting (~02:10-07:25 UTC window), NOT the true book opener",
        "poller cutoff 14:05 UTC (08:05 CST); in-game movement after cutoff is not covered",
        "moneyline field values are American odds; spread fields are half-point lines; total fields are points",
    ],
    "summary": {"total_moves": len(moves), "distinct_series": len(drift),
                "moves_by_game": dict(by_game.most_common()),
                "moves_by_market": dict(by_market)},
    "drift_series": drift,
    "final_snapshot_utc": latest.get("ts_utc"),
    "munich_official_inactives": delta.get("inactives", {}),
    "munich_final_gate_lines": [
        {"selection": e["selection"], "live_line": e["live_line"], "live_odds": e["live_odds"], "decision": e["decision"]}
        for g in delta.get("games", []) if g.get("matchup") == "NE @ DET" for e in g.get("evaluations", [])
    ],
    "board_outcome": "FULL_BOARD_PASS: 18/18 overnight template-approved plays invalidated on live prices, 0 live clears, publishAllowed FALSE",
}

outp = "docs/data-sources/research/2026-11-15/hermes-overnight-line-and-inactive-drift-week10.json"
os.makedirs(os.path.dirname(outp), exist_ok=True)
txt = json.dumps(out, indent=1)
assert all(ord(c) <= 127 for c in txt), "non-ascii"
open(outp, "w", encoding="ascii", newline="\n").write(txt + "\n")
print("drift artifact:", outp, os.path.getsize(outp), "bytes")
print("moves:", len(moves), "series:", len(drift), "games:", len(by_game))