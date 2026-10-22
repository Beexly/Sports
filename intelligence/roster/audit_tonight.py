"""Audit every player in tonight's SNF board + DFS main-slate pool against the live roster gate."""
import json
import os
import sys
from pathlib import Path

os.environ["GSE_AUDIT_READONLY"] = "1"  # reading legacy inline data to AUDIT it, never to emit

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from intelligence.roster.live_roster_gate import LiveRosterGate  # noqa: E402
from frontier.sports.run_tonight_snf_board import SNF_PROPS  # noqa: E402
from frontier.sports.dfs_main_slate_optimizer import MAIN_SLATE_POOL  # noqa: E402

players = []
for p in SNF_PROPS:
    if not p["gsis_id"].startswith("TEAM_"):
        players.append((p["player"], p["team"]))
for p in MAIN_SLATE_POOL:
    if p["pos"] != "DST":
        players.append((p["name"], p["team"]))
players = sorted(set(players))

gate = LiveRosterGate()
gate.load()
rep = gate.verify_players(players)
out = ROOT / "outbox" / "LIVE-ROSTER-AUDIT-2026-10-04.json"
out.write_text(rep.to_json(), encoding="utf-8")
print(f"Checked {len(players)} players | feed errors: {rep.feed_errors}")
for v in rep.blocked():
    print(f"  BLOCKED  {v.player:28s} claimed {v.claimed_team:4s} -> {v.reason}")
print(f"PASSED: {len(players) - len(rep.blocked())} | BLOCKED: {len(rep.blocked())}")
